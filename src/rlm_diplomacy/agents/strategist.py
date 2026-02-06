"""Persistent strategist agent."""

from __future__ import annotations

import logging
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game

from ..data_model import (
    ALL_POWERS,
    ConversationRequest,
    ConversationSummary,
    GameConfig,
    GameHaltError,
)
from ..game_view import GameView
from ..memory import MemoryManager
from ..prompts import build_strategist_system_prompt
from ..repl_sandbox import apply_sandbox_to_env, build_sandbox_setup_code, strategist_policy
from ..rlm_runtime import RLM
from ..sentinels import (
    parse_spawn_completion,
    patched_rlm_parser,
    find_spawn_conversation,
)
from ..timer import PhaseTimer

logger = logging.getLogger(__name__)


class StrategistAgent:
    """Decision-maker agent for a single power across all phases."""

    def __init__(self, power_name: str, game: Game, memory: MemoryManager, config: GameConfig):
        self.power_name = power_name.upper()
        self.config = config
        self.game_view = GameView(game=game, power_name=self.power_name)
        self.memory = memory
        self.memory_path = memory.memory_path(self.power_name)
        blocked = set(config.blocked_modules) if config.blocked_modules is not None else None
        self._sandbox_policy = strategist_policy(self.memory_path, blocked_modules=blocked)
        sandbox_setup_code = build_sandbox_setup_code(self._sandbox_policy)

        self._conversation_request: ConversationRequest | None = None
        self._submitted_orders: list[str] | None = None

        other_backends = [config.sub_backend] if config.sub_backend else None
        other_backend_kwargs = [config.sub_backend_kwargs or {}] if config.sub_backend else None
        self.rlm = RLM(
            backend=config.backend,
            backend_kwargs=config.backend_kwargs,
            environment_kwargs={"persistent": True, "setup_code": sandbox_setup_code},
            other_backends=other_backends,
            other_backend_kwargs=other_backend_kwargs,
            max_iterations=config.max_iterations,
            custom_system_prompt=build_strategist_system_prompt(self.power_name),
            verbose=config.verbose,
            persistent=True,
        )

    def bootstrap(self) -> None:
        phase = self.game_view.get_current_phase()
        root_prompt = (
            f"You are {self.power_name}. Game starting. Phase: {phase}. "
            "Initialize by reading memory_path and surveying game_view. "
            "Define helper utilities and then FINAL(done)."
        )
        self._run_completion_with_retries("", root_prompt)
        # Inject durable globals once persistent env exists.
        self._ensure_base_injection()

    def inject(self, timer: PhaseTimer, include_submit_orders: bool = False) -> None:
        self._ensure_base_injection()
        env = self.rlm._persistent_env
        if env is None:
            return

        env.globals["time_remaining"] = timer.remaining_fn()
        if include_submit_orders:
            env.globals["submit_orders"] = self._submit_orders
        else:
            env.globals.pop("submit_orders", None)

    def strategize(self, phase: str) -> None:
        self._conversation_request = None
        env = self.rlm._persistent_env
        if env is not None:
            env.globals.pop("submit_orders", None)

        root_prompt = (
            f"Phase: {phase}. STRATEGIZE step. You have {self._time_left_for_prompt()}s remaining. "
            "Analyze board and memory. Write SPAWN_CONVERSATION({\"POWER\": \"objective\", ...}) "
            "or FINAL(done) if skipping negotiation."
        )

        with patched_rlm_parser():
            result = self._run_completion_with_retries("", root_prompt)

        response = result.response if result is not None else ""
        objectives = parse_spawn_completion(response)
        if objectives is None:
            objectives = find_spawn_conversation(response)

        if objectives is not None:
            self._conversation_request = ConversationRequest(
                power=self.power_name, objectives=objectives
            )

    def deliver_results(self, summaries: list[ConversationSummary], unread: list[dict[str, Any]]) -> None:
        env = self.rlm._persistent_env
        if env is None:
            return

        env.locals["conversation_results"] = [
            {
                "targets": summary.targets,
                "summary": summary.summary,
                "rounds_used": summary.rounds_used,
            }
            for summary in summaries
        ]
        env.locals["unread_messages"] = list(unread)

    def decide(self, phase: str) -> None:
        self._submitted_orders = None

        root_prompt = (
            f"Phase: {phase}. DECIDE step. You have {self._time_left_for_prompt()}s remaining. "
            "Use conversation_results and unread_messages. Choose final legal orders, "
            "call submit_orders([...]) once, update memory, then FINAL(done)."
        )
        self._run_completion_with_retries("", root_prompt)

    def notify_incoming_chat(self, sender: str, message: str, phase: str) -> tuple[bool, str | None]:
        """Mini completion callback for accept/decline incoming chat requests."""
        env = self.rlm._persistent_env
        if env is None:
            return False, None

        decision: dict[str, str | None] = {"objective": None}

        def accept_chat(power: str, objective: str) -> str:
            power = power.upper()
            if power != sender.upper():
                return f"Error: expected sender {sender.upper()}, got {power}."
            decision["objective"] = objective
            return f"Accepted chat with {power}."

        def decline_chat(power: str) -> str:
            power = power.upper()
            if power != sender.upper():
                return f"Error: expected sender {sender.upper()}, got {power}."
            decision["objective"] = None
            return f"Declined chat with {power}."

        env.globals["accept_chat"] = accept_chat
        env.globals["decline_chat"] = decline_chat

        root_prompt = (
            f"Incoming message in {phase}: {sender.upper()} says: {message!r}. "
            "Call accept_chat(sender, objective) or decline_chat(sender), then FINAL(done)."
        )

        try:
            self._run_completion_with_retries("", root_prompt)
        finally:
            env.globals.pop("accept_chat", None)
            env.globals.pop("decline_chat", None)

        objective = decision["objective"]
        return (objective is not None, objective)

    def get_conversation_requests(self) -> ConversationRequest | None:
        return self._conversation_request

    def get_submitted_orders(self) -> list[str] | None:
        if self._submitted_orders is None:
            return None
        return list(self._submitted_orders)

    def close(self) -> None:
        close_fn = getattr(self.rlm, "close", None)
        if callable(close_fn):
            close_fn()
        elif hasattr(self.rlm, "_persistent_env"):
            self.rlm._persistent_env = None

    def _run_completion_with_retries(self, prompt: str, root_prompt: str):
        max_retries = self.config.max_retries
        for attempt in range(max_retries):
            try:
                self._ensure_base_injection()
                return self.rlm.completion(prompt, root_prompt=root_prompt)
            except Exception as exc:  # pragma: no cover - exercised with mocked failures
                if attempt >= max_retries - 1:
                    raise GameHaltError(
                        f"{self.power_name} completion() failed {max_retries} times"
                    ) from exc
                logger.warning(
                    "%s completion retry %s/%s failed: %s",
                    self.power_name,
                    attempt + 1,
                    max_retries,
                    exc,
                )
        raise GameHaltError(f"{self.power_name} completion() retries exhausted")

    def _ensure_base_injection(self) -> None:
        env = self.rlm._persistent_env
        if env is None:
            return
        env.globals["game_view"] = self.game_view
        env.globals["memory_path"] = self.memory_path
        apply_sandbox_to_env(env, self._sandbox_policy)

    def _submit_orders(self, orders: list[str]) -> str:
        if self._submitted_orders is not None:
            return "Error: orders already submitted. First submission is final."

        if orders is None:
            orders = []
        if not isinstance(orders, list):
            return "Error: submit_orders expects a list of order strings."

        possible = self.game_view.get_all_possible_orders()
        orderable_locations = set(self.game_view.get_orderable_locations())

        accepted: list[str] = []
        rejected: list[str] = []

        def possible_for_loc(loc: str) -> set[str]:
            loc = loc.upper()
            options: set[str] = set(possible.get(loc, []))
            if "/" in loc:
                options.update(possible.get(loc[:3], []))
            else:
                for key, vals in possible.items():
                    if key.startswith(loc + "/"):
                        options.update(vals)
            return options

        for order in orders:
            if not isinstance(order, str):
                rejected.append(str(order))
                continue

            order = order.strip()
            if not order:
                rejected.append(order)
                continue

            if order == "WAIVE":
                is_valid = any("WAIVE" in opts for opts in possible.values())
                if is_valid:
                    accepted.append(order)
                else:
                    rejected.append(order)
                continue

            tokens = order.split()
            if len(tokens) < 2:
                rejected.append(order)
                continue

            loc = tokens[1].upper()
            orderable_ok = loc in orderable_locations or loc[:3] in orderable_locations
            option_ok = order in possible_for_loc(loc)

            if orderable_ok and option_ok:
                accepted.append(order)
            else:
                rejected.append(order)

        self._submitted_orders = accepted

        if rejected:
            return f"Accepted {len(accepted)} orders. Rejected {len(rejected)}: {rejected}"
        return f"Accepted {len(accepted)} orders."

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
