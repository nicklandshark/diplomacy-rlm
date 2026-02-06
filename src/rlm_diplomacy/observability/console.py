"""Simple console logging for observability events."""

from __future__ import annotations

import errno
import json
import re
import sys
import threading
from dataclasses import dataclass
from datetime import datetime
from typing import Any, TextIO

from .bus import EventEmitter
from .events import PRIORITY_NORMAL, ObservableEvent

_SECRET_PATTERN = re.compile(
    r"(?i)(api[_-]?key|token|secret|password)\s*[:=]\s*([\"']?)([^\"'\s,;]+)\2"
)
_LONG_TOKEN_PATTERN = re.compile(r"\b[A-Za-z0-9_\-]{24,}\b")


def redact_text(value: str) -> str:
    """Redact likely secret-like patterns from user-visible strings."""
    text = str(value)
    text = _SECRET_PATTERN.sub(lambda m: f"{m.group(1)}={m.group(2)}***{m.group(2)}", text)
    text = _LONG_TOKEN_PATTERN.sub("***", text)
    return text


@dataclass(slots=True)
class ConsoleLogOptions:
    """Options for event line formatting."""

    include_payload: bool = True
    redact_payload: bool = True
    include_timestamp: bool = True


def _sanitize_payload(value: Any, *, redact: bool) -> Any:
    if isinstance(value, str):
        return redact_text(value) if redact else value
    if isinstance(value, list):
        return [_sanitize_payload(item, redact=redact) for item in value]
    if isinstance(value, tuple):
        return [_sanitize_payload(item, redact=redact) for item in value]
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for key in sorted(value):
            out[str(key)] = _sanitize_payload(value[key], redact=redact)
        return out
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return redact_text(str(value)) if redact else str(value)


def format_event_line(event: ObservableEvent, *, options: ConsoleLogOptions | None = None) -> str:
    opts = options or ConsoleLogOptions()
    parts: list[str] = []
    if opts.include_timestamp:
        stamp = datetime.fromtimestamp(event.ts_wall).strftime("%H:%M:%S")
        parts.append(f"[{stamp}]")
    parts.append(event.event_type)
    parts.append(f"id={event.event_id}")
    parts.append(f"priority={event.priority}")
    if event.phase is not None:
        parts.append(f"phase={event.phase}")
    if event.step is not None:
        parts.append(f"step={event.step}")
    if event.power is not None:
        parts.append(f"power={event.power}")

    payload = event.payload if isinstance(event.payload, dict) else {}
    summary = payload.get("summary")
    if summary is not None:
        summary_text = _sanitize_payload(summary, redact=opts.redact_payload)
        parts.append(f"summary={summary_text}")
    if opts.include_payload and payload:
        safe_payload = _sanitize_payload(payload, redact=opts.redact_payload)
        payload_text = json.dumps(safe_payload, sort_keys=True, ensure_ascii=True)
        parts.append(f"payload={payload_text}")
    return " ".join(parts)


class ConsoleEventLogger(EventEmitter):
    """Thread-safe event emitter that prints one line per event to the console."""

    def __init__(
        self,
        *,
        options: ConsoleLogOptions | None = None,
        stream: TextIO | None = None,
    ):
        self.options = options or ConsoleLogOptions()
        self._stream = stream or sys.stdout
        self._lock = threading.Lock()
        self._closed = False
        self._next_id = 1

    def emit(
        self,
        event_type: str,
        *,
        priority: int = PRIORITY_NORMAL,
        phase: str | None = None,
        step: str | None = None,
        power: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        event = ObservableEvent(
            event_id=0,
            event_type=event_type,
            priority=priority,
            phase=phase,
            step=step,
            power=power,
            payload=payload or {},
        )
        with self._lock:
            if self._closed:
                return
            event.event_id = self._next_id
            self._next_id += 1
            line = format_event_line(event, options=self.options)
            try:
                self._stream.write(line + "\n")
                self._stream.flush()
            except BrokenPipeError:
                self._closed = True
            except OSError as exc:
                if exc.errno == errno.EPIPE:
                    self._closed = True
                    return
                raise

    def close(self) -> None:
        with self._lock:
            self._closed = True
