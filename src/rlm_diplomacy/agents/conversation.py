"""Ephemeral conversation agent."""

from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL

from ..data_model import ConversationSummary, GameConfig, PendingMessage, normalize_powers
from ..game_view import FilteredGameView
from ..message_router import MessageRouter
from ..modal_bridge import (
    apply_state,
    build_conversation_setup_code,
    build_game_snapshot,
    export_state,
)
from ..observability import EventEmitter, NoopEmitter
from ..observability.events import PRIORITY_HIGH
from ..prompts import build_conversation_system_prompt
from ..repl_sandbox import (
    apply_sandbox_to_env,
    build_sandbox_setup_code,
    conversation_policy,
)
from ..rlm_runtime import RLM, install_env_hook

logger = logging.getLogger(__name__)


class ConversationAgent:
    """Diplomat agent for one power during a single movement phase."""

    def __init__(
        self,
        power_name: str,
        targets: list[str],
        objectives: dict[str, str],
        game: Game,
        memory_snapshot: str,
        router: MessageRouter,
        config: GameConfig,
        event_emitter: EventEmitter | None = None,
    ):
        self.power_name = power_name.upper()
        self._events = event_emitter or NoopEmitter()
        self._valid_powers = set(normalize_powers(list(config.powers)))
        self._new_targets_notice: list[tuple[str, str]] = []
        self._target_timeout_notice: list[str] = []

        self.targets: list[str] = []
        self.objectives: dict[str, str] = {}
        for target in targets:
            self.add_target(target.upper(), objectives.get(target.upper(), objectives.get(target, "")))

        self.config = config
        self.router = router
        self._game = game
        self._configured_powers = [str(power).upper() for power in config.powers]
        self.memory_snapshot = str(memory_snapshot)
        self.game_view = FilteredGameView(
            game=game,
            power_name=self.power_name,
            targets=self.targets,
            visible_powers=self._configured_powers,
        )

        self._is_modal = config.environment == "modal"
        self._time_remaining_fn: Callable[[], float] | None = None
        self._modal_outbox: list[dict[str, str]] = []

        blocked = set(config.blocked_modules) if config.blocked_modules is not None else None
        self._sandbox_policy = conversation_policy(blocked_modules=blocked)
        sandbox_setup_code = build_sandbox_setup_code(self._sandbox_policy)
        if self._is_modal:
            sandbox_setup_code = f"{sandbox_setup_code}\n\n{build_conversation_setup_code()}"

        self._finished = False
        self._summary = ""
        self._rounds_used = 0

        self._last_sent_at: dict[str, float] = {}
        self._last_received_at: dict[str, float] = {}
        self._timeout_notified: set[str] = set()

        other_backends = [config.sub_backend] if config.sub_backend else None
        other_backend_kwargs = [config.sub_backend_kwargs or {}] if config.sub_backend else None

        environment_kwargs = dict(config.environment_kwargs)
        environment_kwargs["setup_code"] = sandbox_setup_code
        if config.environment == "local":
            environment_kwargs["persistent"] = True

        backend = config.backend_for(self.power_name)
        backend_kwargs = config.backend_kwargs_for(self.power_name)

        self.rlm = RLM(
            backend=backend,
            backend_kwargs=backend_kwargs,
            environment=config.environment,
            environment_kwargs=environment_kwargs,
            other_backends=other_backends,
            other_backend_kwargs=other_backend_kwargs,
            max_iterations=config.max_iterations,
            custom_system_prompt=build_conversation_system_prompt(
                self.power_name,
                self.targets,
                self.objectives,
                active_powers=self._configured_powers,
            ),
            verbose=config.verbose,
            persistent=not self._is_modal,
        )
        if self._is_modal:
            install_env_hook(self.rlm, self._prepare_modal_env, self._capture_modal_env_outputs)
        else:
            install_env_hook(self.rlm, self._ensure_base_injection)

        self._events.emit(
            "power.model",
            power=self.power_name,
            payload={
                "backend": backend,
                "model": str(backend_kwargs.get("model_name", "unknown")),
                "summary": f"{self.power_name} model configured",
            },
        )

    def bootstrap(self) -> None:
        self._events.emit(
            "agent.status",
            power=self.power_name,
            payload={"status": "BOOTSTRAP", "role": "CONVERSATION", "step": "CONVERSE"},
        )
        root_prompt = (
            f"You are {self.power_name}'s diplomat. Targets: {self.targets}. "
            "Initialize with objectives and memory_snapshot, then FINAL(initialized) when ready."
        )
        self._run_completion_with_retries("", root_prompt)
        self._ensure_base_injection()
        self._events.emit(
            "agent.status",
            power=self.power_name,
            payload={"status": "READY", "role": "CONVERSATION", "step": "CONVERSE"},
        )

    def inject_timer(self, time_remaining_fn) -> None:
        self._time_remaining_fn = time_remaining_fn
        if self._is_modal:
            return

        self._ensure_base_injection()
        env = self.rlm._persistent_env
        if env is None:
            return
        env.globals["time_remaining"] = time_remaining_fn

    def run_round(self, round_num: int) -> None:
        if self._finished:
            return

        self._events.emit(
            "conversation.round.start",
            power=self.power_name,
            step="CONVERSE",
            payload={"round": round_num, "summary": f"round {round_num}"},
        )
        self._rounds_used = max(self._rounds_used, round_num)
        self._ensure_base_injection()

        root_prompt = self._build_round_prompt(round_num)
        result = self._run_completion_with_retries("", root_prompt)
        if result is None:
            return

        if self._is_modal and self._modal_outbox:
            for payload in self._modal_outbox:
                recipient = str(payload.get("recipient", "")).strip().upper()
                content = str(payload.get("content", ""))
                if recipient:
                    self._send_message(recipient, content)
            self._modal_outbox.clear()

        response = str(result.response).strip()
        summary = self._extract_summary(response)
        if self.config.observe_repl:
            self._events.emit(
                "agent.repl",
                power=self.power_name,
                step="CONVERSE",
                payload={"text": response, "summary": response},
            )
        if summary is not None:
            self._summary = summary
            self._finished = True
            self._events.emit(
                "conversation.round.finish",
                power=self.power_name,
                step="CONVERSE",
                payload={"round": round_num, "summary": summary},
            )

    def add_target(self, power: str, objective: str) -> None:
        power = power.upper()
        if power not in self._valid_powers:
            logger.warning(
                "%s ignored invalid conversation target %s (not configured).",
                self.power_name,
                power,
            )
            return
        if power == self.power_name:
            return

        if power not in self.targets:
            self.targets.append(power)
            self.targets.sort()
            self._new_targets_notice.append((power, objective))
            self._events.emit(
                "conversation.target.added",
                power=self.power_name,
                step="CONVERSE",
                payload={
                    "target": power,
                    "objective": objective,
                    "summary": f"target+ {power}",
                },
            )
        self.objectives[power] = objective

        if hasattr(self, "game_view"):
            self.game_view.add_target(power)

    def note_target_timeout(self, power: str) -> None:
        power = power.upper()
        self._target_timeout_notice.append(power)

    def mark_target_responded(self, power: str) -> None:
        power = power.upper()
        self._last_received_at[power] = time.monotonic()
        self._timeout_notified.discard(power)

    def timed_out_targets(self, timeout_seconds: float) -> list[str]:
        now = time.monotonic()
        timed_out: list[str] = []
        for target, sent_at in self._last_sent_at.items():
            last_recv = self._last_received_at.get(target)
            if last_recv is not None and last_recv >= sent_at:
                continue
            if target in self._timeout_notified:
                continue
            if now - sent_at >= timeout_seconds:
                timed_out.append(target)
                self._timeout_notified.add(target)
        return timed_out

    def force_finish(self) -> None:
        if self._finished:
            return
        self._finished = True
        self._summary = "Conversation ended by timeout -- no summary provided."
        self._events.emit(
            "agent.status",
            power=self.power_name,
            step="CONVERSE",
            payload={"status": "TIMEOUT", "role": "CONVERSATION", "step": "CONVERSE"},
        )

    def get_summary(self) -> ConversationSummary:
        return ConversationSummary(
            power=self.power_name,
            targets=list(self.targets),
            summary=self._summary,
            rounds_used=self._rounds_used,
        )

    @property
    def is_finished(self) -> bool:
        return self._finished

    def close(self) -> None:
        close_fn = getattr(self.rlm, "close", None)
        if callable(close_fn):
            close_fn()
        elif hasattr(self.rlm, "_persistent_env"):
            self.rlm._persistent_env = None

    def _send_message(self, recipient: str, content: str) -> str:
        recipient = recipient.upper()
        if recipient != GLOBAL and recipient not in self._valid_powers:
            return f"Error: invalid recipient {recipient}."
        if len(content) > 4096:
            return "Error: message too long (max 4096 chars)."

        pending = PendingMessage(
            sender=self.power_name,
            recipient=recipient,
            content=content,
            phase=self.game_view.get_current_phase(),
        )
        self.router.queue_message(pending)

        if recipient != GLOBAL:
            self._last_sent_at[recipient] = time.monotonic()

        self._events.emit(
            "message.send_request",
            power=self.power_name,
            step="CONVERSE",
            payload={
                "sender": self.power_name,
                "recipient": recipient,
                "summary": f"{self.power_name}->{recipient}",
                **({"content": content} if self.config.observe_messages else {}),
            },
        )
        return f"Queued message to {recipient}."

    def _run_completion_with_retries(self, prompt: str, root_prompt: str):
        max_retries = self.config.max_retries
        for attempt in range(max_retries):
            try:
                if self.config.observe_prompts:
                    self._events.emit(
                        "agent.prompt",
                        power=self.power_name,
                        step="CONVERSE",
                        payload={"text": str(root_prompt), "summary": str(root_prompt)},
                    )
                self._ensure_base_injection()
                return self.rlm.completion(prompt, root_prompt=root_prompt)
            except Exception as exc:  # pragma: no cover - driven by mocked backends
                if attempt >= max_retries - 1:
                    self._finished = True
                    self._summary = (
                        f"Conversation agent crashed after {max_retries} retries: {exc}"
                    )
                    logger.exception(
                        "%s conversation completion failed permanently", self.power_name
                    )
                    self._events.emit(
                        "agent.error",
                        power=self.power_name,
                        step="CONVERSE",
                        priority=PRIORITY_HIGH,
                        payload={"summary": f"conversation failed: {exc}"},
                    )
                    return None
                logger.warning(
                    "%s conversation retry %s/%s failed: %s",
                    self.power_name,
                    attempt + 1,
                    max_retries,
                    exc,
                )
                self._events.emit(
                    "agent.retry",
                    power=self.power_name,
                    step="CONVERSE",
                    payload={
                        "attempt": attempt + 1,
                        "summary": f"retry {attempt + 1}/{max_retries}",
                    },
                )
        return None

    def _ensure_base_injection(self, env: Any | None = None) -> None:
        if self._is_modal:
            return

        active_env = env if env is not None else self.rlm._persistent_env
        if active_env is None:
            return

        env_globals = getattr(active_env, "globals", None)
        if not isinstance(env_globals, dict):
            return

        env_globals["game_view"] = self.game_view
        env_globals["memory_snapshot"] = self.memory_snapshot
        env_globals["send_message"] = self._send_message
        env_globals["objectives"] = self.objectives
        apply_sandbox_to_env(active_env, self._sandbox_policy)

    def _prepare_modal_env(self, env: Any | None = None) -> None:
        if not self._is_modal or env is None:
            return
        if not hasattr(env, "execute_code"):
            return

        try:
            remaining = 0.0
            if self._time_remaining_fn is not None:
                remaining = max(0.0, float(self._time_remaining_fn()))
        except Exception:
            remaining = 0.0

        state = {
            "game_view": build_game_snapshot(self._game, self.game_view, self.power_name),
            "memory_snapshot": self.memory_snapshot,
            "objectives": dict(self.objectives),
            "time_remaining_seconds": remaining,
        }
        try:
            apply_state(env, state)
        except Exception as exc:  # pragma: no cover - depends on external modal runtime
            logger.warning("%s modal state injection failed: %s", self.power_name, exc)

    def _capture_modal_env_outputs(self, env: Any | None = None) -> None:
        if not self._is_modal or env is None:
            return
        if not hasattr(env, "execute_code"):
            return
        try:
            state = export_state(env)
        except Exception as exc:  # pragma: no cover - depends on external modal runtime
            logger.warning("%s modal state export failed: %s", self.power_name, exc)
            return

        outbox = state.get("outbox")
        if isinstance(outbox, list):
            self._modal_outbox = [
                {
                    "recipient": str(item.get("recipient", "")).upper(),
                    "content": str(item.get("content", "")),
                }
                for item in outbox
                if isinstance(item, dict)
            ]
        else:
            self._modal_outbox = []

    def _build_round_prompt(self, round_num: int) -> str:
        notices: list[str] = []
        for power, objective in self._new_targets_notice:
            notices.append(f"New target added: {power}. Objective: {objective}")
        for power in self._target_timeout_notice:
            notices.append(f"{power} timed out (60s, no response).")

        self._new_targets_notice.clear()
        self._target_timeout_notice.clear()

        notice_text = "\n".join(notices)
        if notice_text:
            notice_text = "\nNotifications:\n" + notice_text

        return (
            f"Round {round_num}. You have {self._time_left_for_prompt()}s remaining. "
            "Read messages, negotiate, send_message(...) as needed. "
            "Call FINAL(summary) when done."
            f"{notice_text}"
        )

    def _extract_summary(self, response: str) -> str | None:
        if not response:
            return None

        upper = response.upper()
        if upper in {"CONTINUE", "__CONTINUE__"}:
            return None

        # Mocked backends may return raw sentinel text.
        if "FINAL(" in response:
            start = response.find("FINAL(") + len("FINAL(")
            end = response.rfind(")")
            if end > start:
                return response[start:end].strip()

        # Real RLM completion returns extracted final answer directly.
        return response

    def _time_left_for_prompt(self) -> int:
        if self._time_remaining_fn is not None:
            try:
                return int(max(0.0, float(self._time_remaining_fn())))
            except Exception:
                return 0

        env = self.rlm._persistent_env
        if env is None:
            return 0
        fn = env.globals.get("time_remaining")
        if callable(fn):
            try:
                return int(max(0.0, float(fn())))
            except Exception:
                return 0
        return 0
