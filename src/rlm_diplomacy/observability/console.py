"""Rich-based live console dashboard for observability events."""

from __future__ import annotations

import os
import re
import threading
import time
from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import datetime

from rich import box
from rich.console import Console, Group
from rich.layout import Layout
from rich.live import Live
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

from .bus import BufferedEventBus
from .events import ObservableEvent

_SECRET_PATTERN = re.compile(
    r"(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*([\"']?)([^\"'\s,;]+)\2"
)
_LONG_TOKEN_PATTERN = re.compile(r"\b[A-Za-z0-9_\-]{24,}\b")


@dataclass(slots=True)
class LiveConsoleOptions:
    """Runtime options for live console rendering."""

    detail: str = "minimal"  # minimal|standard|trace
    force: bool = False
    max_events: int = 300
    fps: float = 8.0


@dataclass(slots=True)
class PowerState:
    status: str = "IDLE"
    role: str = "STRATEGIST"
    model: str = "-"
    step: str = "-"
    last_order: str = "-"
    last_memory_diff: str = "-"
    last_repl: str = "-"
    sent: int = 0
    received: int = 0


@dataclass(slots=True)
class DashboardState:
    phase: str = "-"
    phase_type: str = "-"
    step: str = "-"
    deadline_monotonic: float | None = None
    game_status: str = "RUNNING"
    event_lines: deque[str] = field(default_factory=lambda: deque(maxlen=300))
    powers: dict[str, PowerState] = field(default_factory=dict)
    conversations: Counter[tuple[str, str]] = field(default_factory=Counter)
    board_summary: dict[str, str] = field(default_factory=dict)
    inspector_power: str | None = None


def redact_text(value: str) -> str:
    """Redact likely secret-like patterns from user-visible strings."""
    text = str(value)
    text = _SECRET_PATTERN.sub(lambda m: f"{m.group(1)}={m.group(2)}***{m.group(2)}", text)
    text = _LONG_TOKEN_PATTERN.sub("***", text)
    return text


def shorten(value: str, limit: int = 140) -> str:
    text = str(value).strip().replace("\n", " ")
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


class LiveConsoleDashboard:
    """Consumes observability events and renders a live terminal dashboard."""

    def __init__(
        self,
        bus: BufferedEventBus,
        *,
        powers: list[str],
        options: LiveConsoleOptions | None = None,
        console: Console | None = None,
    ):
        self.bus = bus
        self.options = options or LiveConsoleOptions()
        self.console = console or Console()
        self.state = DashboardState()
        self.state.powers = {power: PowerState() for power in powers}
        self.state.inspector_power = powers[0] if powers else None

        self._stop = threading.Event()
        self._thread: threading.Thread | None = None

    def should_enable(self) -> bool:
        if self.options.force:
            return True
        if not self.console.is_terminal:
            return False
        if os.environ.get("CI", "").lower() in {"1", "true", "yes"}:
            return False
        return True

    def start(self) -> bool:
        if not self.should_enable():
            return False
        if self._thread is not None:
            return True
        self._thread = threading.Thread(target=self._run, name="live-console-dashboard", daemon=True)
        self._thread.start()
        return True

    def stop(self) -> None:
        self._stop.set()
        if self._thread is not None:
            self._thread.join(timeout=2.0)
            self._thread = None

    def _run(self) -> None:
        refresh_per_second = max(2.0, float(self.options.fps))
        try:
            with Live(self._render_layout(), console=self.console, refresh_per_second=refresh_per_second) as live:
                while not self._stop.is_set():
                    self.bus.wait_for_event(timeout=0.12)
                    events = self.bus.poll(300)
                    for event in events:
                        try:
                            self._apply_event(event)
                        except Exception as exc:  # pragma: no cover - defensive for live runtime hardening
                            self._record_dashboard_error("apply_event", exc, event)

                    # Adaptive refresh under pressure.
                    queue_depth = self.bus.size()
                    if queue_depth > 1000:
                        time.sleep(0.3)
                    elif queue_depth > 300:
                        time.sleep(0.15)
                    else:
                        time.sleep(0.05)

                    try:
                        live.update(self._render_layout(), refresh=True)
                    except Exception as exc:  # pragma: no cover - defensive for terminal/render edge cases
                        self._record_dashboard_error("render", exc)
        except Exception as exc:  # pragma: no cover - defensive for rich/live setup failures
            self._record_dashboard_error("run", exc)

    def _apply_event(self, event: ObservableEvent) -> None:
        et = event.event_type
        payload = event.payload if isinstance(event.payload, dict) else {}
        power = event.power

        if et == "game.start":
            self.state.game_status = "RUNNING"
        elif et == "game.end":
            self.state.game_status = "COMPLETED"
        elif et == "game.halt":
            self.state.game_status = "HALTED"
        elif et == "phase.start":
            self.state.phase = payload.get("phase", self.state.phase)
            self.state.phase_type = payload.get("phase_type", self.state.phase_type)
        elif et == "step.start":
            self.state.step = payload.get("step", self.state.step)
            timeout = payload.get("timeout_seconds")
            if isinstance(timeout, (int, float)):
                self.state.deadline_monotonic = time.monotonic() + float(timeout)
        elif et == "step.end":
            self.state.step = payload.get("step", self.state.step)
            self.state.deadline_monotonic = None
        elif et == "power.model" and power and power in self.state.powers:
            self.state.powers[power].model = str(payload.get("model", "-"))
        elif et == "agent.status" and power and power in self.state.powers:
            if "status" in payload and payload["status"] is not None:
                self.state.powers[power].status = str(payload["status"])
            if "role" in payload and payload["role"] is not None:
                self.state.powers[power].role = str(payload["role"])
            if "step" in payload and payload["step"] is not None:
                self.state.powers[power].step = str(payload["step"])
        elif et == "orders.submitted" and power and power in self.state.powers:
            accepted = payload.get("accepted_count", 0)
            rejected = payload.get("rejected_count", 0)
            self.state.powers[power].last_order = f"accepted={accepted} rejected={rejected}"
        elif et == "orders.defaulted" and power and power in self.state.powers:
            count = payload.get("count", 0)
            self.state.powers[power].last_order = f"default({count})"
        elif et == "memory.changed" and power and power in self.state.powers:
            summary = payload.get("summary", "changed")
            self.state.powers[power].last_memory_diff = redact_text(str(summary))
        elif et == "agent.repl" and power and power in self.state.powers:
            self.state.powers[power].last_repl = redact_text(str(payload.get("text", "-")))
        elif et == "message.queued":
            sender_raw = payload.get("sender")
            recipient_raw = payload.get("recipient")
            sender = str(sender_raw) if sender_raw is not None else None
            recipient = str(recipient_raw) if recipient_raw is not None else None
            if sender in self.state.powers:
                self.state.powers[sender].sent += 1
            if recipient in self.state.powers:
                self.state.powers[recipient].received += 1
            if isinstance(sender, str) and isinstance(recipient, str):
                self.state.conversations[(sender, recipient)] += 1
        elif et == "board.snapshot":
            for key in ["phase", "active_powers", "total_messages", "total_units"]:
                if key in payload:
                    self.state.board_summary[key] = str(payload[key])

        line = self._format_event_line(event)
        if line:
            self.state.event_lines.append(line)

    def _format_event_line(self, event: ObservableEvent) -> str:
        stamp = datetime.fromtimestamp(event.ts_wall).strftime("%H:%M:%S")
        payload = event.payload if isinstance(event.payload, dict) else {}
        actor = str(event.power) if event.power is not None else "-"
        event_name = str(event.event_type)
        summary = payload.get("summary")
        if summary is None:
            if "status" in payload:
                summary = str(payload["status"])
            elif "step" in payload:
                summary = str(payload["step"])
            elif "model" in payload:
                summary = str(payload["model"])
            else:
                summary = ""
        return f"{stamp} | {actor:8s} | {event_name:20s} | {shorten(redact_text(summary), 90)}"

    def _record_dashboard_error(
        self,
        stage: str,
        exc: Exception,
        event: ObservableEvent | None = None,
    ) -> None:
        stamp = datetime.now().strftime("%H:%M:%S")
        event_name = str(event.event_type) if event is not None else "-"
        details = f"{type(exc).__name__}: {exc}"
        summary = f"{stage} failed for {event_name}: {details}"
        self.state.event_lines.append(
            f"{stamp} | SYSTEM   | dashboard.error      | {shorten(redact_text(summary), 90)}"
        )

    def _render_layout(self) -> Layout:
        layout = Layout()
        layout.split_column(
            Layout(name="top", size=3),
            Layout(name="middle", ratio=2),
            Layout(name="bottom", ratio=2),
        )
        layout["middle"].split_row(
            Layout(name="left"),
            Layout(name="center"),
            Layout(name="right"),
        )
        layout["bottom"].split_row(Layout(name="events", ratio=2), Layout(name="inspector"))

        layout["top"].update(self._render_header())
        layout["left"].update(self._render_powers())
        layout["center"].update(self._render_board())
        layout["right"].update(self._render_conversations())
        layout["events"].update(self._render_events())
        layout["inspector"].update(self._render_inspector())
        return layout

    def _render_header(self) -> Panel:
        remaining = "-"
        if self.state.deadline_monotonic is not None:
            delta = max(0.0, self.state.deadline_monotonic - time.monotonic())
            remaining = f"{delta:05.1f}s"

        drops = self.bus.drop_stats().total
        blink = "ON" if int(time.time() * 2) % 2 else "  "
        text = Text()
        text.append("DIPLOMACY-RLM  ", style="bold white")
        text.append(f"PHASE {self.state.phase} ({self.state.phase_type})  ", style="cyan")
        text.append(f"STEP {self.state.step}  ", style="magenta")
        text.append(f"T-{remaining}  ", style="yellow")
        text.append(f"LIVE[{blink}]  ", style="green")
        text.append(f"STATUS {self.state.game_status}  ", style="bold")
        text.append(f"DROPPED {drops}", style="red" if drops else "green")
        return Panel(text, box=box.ASCII, border_style="white")

    def _render_powers(self) -> Panel:
        table = Table(box=box.ASCII, expand=True)
        table.add_column("Power", style="bold")
        table.add_column("Model")
        table.add_column("Role")
        table.add_column("Status")
        table.add_column("Step")
        table.add_column("S/R", justify="right")

        for power, state in self.state.powers.items():
            status = str(state.status)
            role = str(state.role)
            step = str(state.step)
            status_style = "green"
            if status in {"WAITING", "PENDING"}:
                status_style = "yellow"
            elif status in {"ERROR", "HALTED"}:
                status_style = "red"
            elif status in {"BLOCKED", "TIMEOUT"}:
                status_style = "bright_red"

            table.add_row(
                power,
                shorten(state.model, 18),
                role,
                f"[{status_style}]{status}[/{status_style}]",
                step,
                f"{state.sent}/{state.received}",
            )

        return Panel(table, title="Powers", box=box.ASCII)

    def _render_board(self) -> Panel:
        lines = [
            f"phase: {self.state.board_summary.get('phase', self.state.phase)}",
            f"active powers: {self.state.board_summary.get('active_powers', '-')}",
            f"total units: {self.state.board_summary.get('total_units', '-')}",
            f"total messages: {self.state.board_summary.get('total_messages', '-')}",
        ]
        return Panel(Text("\n".join(lines)), title="Board", box=box.ASCII)

    def _render_conversations(self) -> Panel:
        table = Table(box=box.ASCII, expand=True)
        table.add_column("Edge")
        table.add_column("Count", justify="right")

        for (sender, recipient), count in self.state.conversations.most_common(12):
            table.add_row(f"{sender}->{recipient}", str(count))

        if not self.state.conversations:
            table.add_row("-", "0")
        return Panel(table, title="Conversations", box=box.ASCII)

    def _render_events(self) -> Panel:
        lines = list(self.state.event_lines)[-self.options.max_events :]
        if self.options.detail == "minimal":
            lines = lines[-20:]
        elif self.options.detail == "standard":
            lines = lines[-50:]
        else:
            lines = lines[-120:]
        text = Text("\n".join(lines) if lines else "No events yet.")
        return Panel(text, title="Event Feed", box=box.ASCII)

    def _render_inspector(self) -> Panel:
        power = self.state.inspector_power
        if power is None or power not in self.state.powers:
            return Panel(Text("No power selected"), title="Inspector", box=box.ASCII)

        state = self.state.powers[power]
        lines = [
            f"Power: {power}",
            f"Status: {state.status}",
            f"Last order: {state.last_order}",
            f"Memory: {shorten(redact_text(state.last_memory_diff), 180)}",
            f"REPL: {shorten(redact_text(state.last_repl), 180)}",
        ]
        return Panel(Text("\n".join(lines)), title="Inspector", box=box.ASCII)
