"""Ephemeral conversation agent."""

from __future__ import annotations

import logging
import time
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL

from ..data_model import ALL_POWERS, ConversationSummary, GameConfig, PendingMessage
from ..game_view import FilteredGameView
from ..message_router import MessageRouter
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
    ):
        self.power_name = power_name.upper()
        self._new_targets_notice: list[tuple[str, str]] = []
        self._target_timeout_notice: list[str] = []

        self.targets: list[str] = []
        self.objectives: dict[str, str] = {}
        for target in targets:
            self.add_target(target.upper(), objectives.get(target.upper(), objectives.get(target, "")))

        self.config = config
        self.router = router
        self.memory_snapshot = str(memory_snapshot)
        self.game_view = FilteredGameView(game=game, power_name=self.power_name, targets=self.targets)
        blocked = set(config.blocked_modules) if config.blocked_modules is not None else None
        self._sandbox_policy = conversation_policy(blocked_modules=blocked)
        sandbox_setup_code = build_sandbox_setup_code(self._sandbox_policy)

        self._finished = False
        self._summary = ""
        self._rounds_used = 0

        self._last_sent_at: dict[str, float] = {}
        self._last_received_at: dict[str, float] = {}
        self._timeout_notified: set[str] = set()

        other_backends = [config.sub_backend] if config.sub_backend else None
        other_backend_kwargs = [config.sub_backend_kwargs or {}] if config.sub_backend else None

        self.rlm = RLM(
            backend=config.backend,
            backend_kwargs=config.backend_kwargs,
            environment_kwargs={"persistent": True, "setup_code": sandbox_setup_code},
            other_backends=other_backends,
            other_backend_kwargs=other_backend_kwargs,
            max_iterations=config.max_iterations,
            custom_system_prompt=build_conversation_system_prompt(
                self.power_name, self.targets, self.objectives
            ),
            verbose=config.verbose,
            persistent=True,
        )
        install_env_hook(self.rlm, self._ensure_base_injection)

    def bootstrap(self) -> None:
        root_prompt = (
            f"You are {self.power_name}'s diplomat. Targets: {self.targets}. "
            "Initialize with objectives and memory_snapshot, then FINAL(initialized) when ready."
        )
        self._run_completion_with_retries("", root_prompt)
        self._ensure_base_injection()

    def inject_timer(self, time_remaining_fn) -> None:
        self._ensure_base_injection()
        env = self.rlm._persistent_env
        if env is None:
            return
        env.globals["time_remaining"] = time_remaining_fn

    def run_round(self, round_num: int) -> None:
        if self._finished:
            return

        self._rounds_used = max(self._rounds_used, round_num)
        self._ensure_base_injection()

        root_prompt = self._build_round_prompt(round_num)
        result = self._run_completion_with_retries("", root_prompt)
        if result is None:
            return

        response = str(result.response).strip()
        summary = self._extract_summary(response)
        if summary is not None:
            self._summary = summary
            self._finished = True

    def add_target(self, power: str, objective: str) -> None:
        power = power.upper()
        if power == self.power_name:
            return

        if power not in self.targets:
            self.targets.append(power)
            self.targets.sort()
            self._new_targets_notice.append((power, objective))
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
        if recipient != GLOBAL and recipient not in ALL_POWERS:
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

        return f"Queued message to {recipient}."

    def _run_completion_with_retries(self, prompt: str, root_prompt: str):
        max_retries = self.config.max_retries
        for attempt in range(max_retries):
            try:
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
                    return None
                logger.warning(
                    "%s conversation retry %s/%s failed: %s",
                    self.power_name,
                    attempt + 1,
                    max_retries,
                    exc,
                )
        return None

    def _ensure_base_injection(self) -> None:
        env = self.rlm._persistent_env
        if env is None:
            return

        env.globals["game_view"] = self.game_view
        env.globals["memory_snapshot"] = self.memory_snapshot
        env.globals["send_message"] = self._send_message
        env.globals["objectives"] = self.objectives
        apply_sandbox_to_env(env, self._sandbox_policy)

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
