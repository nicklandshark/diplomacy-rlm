"""Persistent strategist agent."""

from __future__ import annotations

import difflib
import logging
import threading
from collections.abc import Callable
from pathlib import Path
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game

from ..data_model import (
    ConversationRequest,
    ConversationSummary,
    GameConfig,
    GameHaltError,
)
from ..game_view import GameView
from ..memory import MemoryManager
from ..modal_bridge import (
    apply_state,
    build_game_snapshot,
    build_strategist_setup_code,
    export_state,
)
from ..observability import EventEmitter, NoopEmitter
from ..observability.events import PRIORITY_HIGH, PRIORITY_NORMAL
from ..prompts import build_strategist_system_prompt
from ..repl_sandbox import apply_sandbox_to_env, build_sandbox_setup_code, strategist_policy
from ..rlm_runtime import RLM, install_env_hook
from ..sentinels import (
    find_spawn_conversation,
    parse_spawn_completion,
    patched_rlm_parser,
)
from ..timer import PhaseTimer

logger = logging.getLogger(__name__)


class StrategistAgent:
    """Decision-maker agent for a single power across all phases."""

    def __init__(
        self,
        power_name: str,
        game: Game,
        memory: MemoryManager,
        config: GameConfig,
        event_emitter: EventEmitter | None = None,
    ):
        self.power_name = power_name.upper()
        self.config = config
        self._events = event_emitter or NoopEmitter()
        self._game = game
        self._configured_powers = [str(power).upper() for power in config.powers]
        self.game_view = GameView(
            game=game,
            power_name=self.power_name,
            visible_powers=self._configured_powers,
        )
        self.memory = memory
        self.memory_path = memory.memory_path(self.power_name)

        self._is_modal = config.environment == "modal"
        self._time_remaining_fn: Callable[[], float] | None = None
        self._modal_include_submit_orders = False
        self._modal_conversation_results: list[dict[str, Any]] = []
        self._modal_unread_messages: list[dict[str, Any]] = []
        self._modal_incoming_sender: str | None = None
        self._modal_incoming_decision: dict[str, Any] | None = None
        self._modal_memory_path = f"/tmp/{self.power_name}_memory.md"
        self._completion_lock = threading.Lock()
        self._active_step_token: str | None = None
        self._step_token_guard_enabled = False

        blocked = set(config.blocked_modules) if config.blocked_modules is not None else None
        policy_memory_path = self._modal_memory_path if self._is_modal else self.memory_path
        self._sandbox_policy = strategist_policy(policy_memory_path, blocked_modules=blocked)
        sandbox_setup_code = build_sandbox_setup_code(self._sandbox_policy)
        if self._is_modal:
            sandbox_setup_code = f"{sandbox_setup_code}\n\n{build_strategist_setup_code(self._modal_memory_path)}"

        self._conversation_request: ConversationRequest | None = None
        self._submitted_orders: list[str] | None = None

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
            custom_system_prompt=build_strategist_system_prompt(
                self.power_name,
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
            payload={"status": "BOOTSTRAP", "role": "STRATEGIST", "step": "BOOTSTRAP"},
        )
        phase = self.game_view.get_current_phase()
        root_prompt = (
            f"You are {self.power_name}. Game starting. Phase: {phase}. "
            "Initialize by reading memory_path and surveying game_view. "
            "Define helper utilities and then FINAL(done)."
        )
        self._run_completion_with_retries("", root_prompt)
        # Inject durable globals once persistent env exists.
        self._ensure_base_injection()
        self._events.emit(
            "agent.status",
            power=self.power_name,
            payload={"status": "READY", "role": "STRATEGIST", "step": "IDLE"},
        )

    def inject(self, timer: PhaseTimer, include_submit_orders: bool = False) -> None:
        self._time_remaining_fn = timer.remaining_fn()
        if self._is_modal:
            self._modal_include_submit_orders = include_submit_orders
            return

        self._ensure_base_injection()
        env = self.rlm._persistent_env
        if env is None:
            return

        env.globals["time_remaining"] = timer.remaining_fn()
        if include_submit_orders:
            env.globals["submit_orders"] = self._submit_orders
        else:
            env.globals.pop("submit_orders", None)

    def activate_step_token(self, token: str) -> None:
        self._step_token_guard_enabled = True
        self._active_step_token = str(token)

    def invalidate_step_token(self, token: str) -> None:
        if self._active_step_token == str(token):
            self._active_step_token = None

    def strategize(self, phase: str) -> None:
        self._events.emit(
            "agent.status",
            power=self.power_name,
            phase=phase,
            step="STRATEGIZE",
            payload={"status": "RUNNING", "role": "STRATEGIST", "step": "STRATEGIZE"},
        )
        self._conversation_request = None
        if not self._is_modal:
            env = self.rlm._persistent_env
            if env is not None:
                env.globals.pop("submit_orders", None)

        root_prompt = (
            f"Phase: {phase}. STRATEGIZE step. You have {self._time_left_for_prompt()}s remaining. "
            "Analyze board and memory. Write SPAWN_CONVERSATION({\"POWER\": \"objective\", ...}) "
            "or FINAL(done) if skipping negotiation."
        )

        step_token = self._active_step_token
        deadline_fn = self._time_remaining_fn
        with patched_rlm_parser():
            result = self._run_completion_with_retries(
                "",
                root_prompt,
                deadline_fn=deadline_fn,
                step_token=step_token,
            )
        if result is None:
            self._events.emit(
                "agent.status",
                power=self.power_name,
                phase=phase,
                step="STRATEGIZE",
                payload={"status": "TIMEOUT", "role": "STRATEGIST", "step": "STRATEGIZE"},
            )
            return
        if not self._is_step_token_active(step_token):
            return

        response = result.response if result is not None else ""
        objectives = parse_spawn_completion(response)
        if objectives is None:
            objectives = find_spawn_conversation(response)

        if objectives is not None:
            self._conversation_request = ConversationRequest(
                power=self.power_name, objectives=objectives
            )
            self._events.emit(
                "conversation.spawn",
                power=self.power_name,
                phase=phase,
                step="STRATEGIZE",
                payload={
                    "targets": sorted(objectives.keys()),
                    "summary": f"targets={','.join(sorted(objectives.keys()))}",
                },
            )
        self._events.emit(
            "agent.status",
            power=self.power_name,
            phase=phase,
            step="STRATEGIZE",
            payload={"status": "WAITING", "role": "STRATEGIST", "step": "STRATEGIZE"},
        )

    def deliver_results(self, summaries: list[ConversationSummary], unread: list[dict[str, Any]]) -> None:
        prepared = [
            {
                "targets": summary.targets,
                "summary": summary.summary,
                "rounds_used": summary.rounds_used,
            }
            for summary in summaries
        ]

        if self._is_modal:
            self._modal_conversation_results = prepared
            self._modal_unread_messages = list(unread)
            return

        env = self.rlm._persistent_env
        if env is None:
            return

        env.locals["conversation_results"] = prepared
        env.locals["unread_messages"] = list(unread)

    def decide(self, phase: str) -> None:
        self._events.emit(
            "agent.status",
            power=self.power_name,
            phase=phase,
            step="DECIDE",
            payload={"status": "RUNNING", "role": "STRATEGIST", "step": "DECIDE"},
        )
        self._submitted_orders = None

        step_token = self._active_step_token
        deadline_fn = self._time_remaining_fn
        root_prompt = (
            f"Phase: {phase}. DECIDE step. You have {self._time_left_for_prompt()}s remaining. "
            "Use conversation_results and unread_messages. Choose final legal orders, "
            "call submit_orders([...]) once, update memory, then FINAL(done)."
        )
        result = self._run_completion_with_retries(
            "",
            root_prompt,
            deadline_fn=deadline_fn,
            step_token=step_token,
        )
        if result is None:
            self._events.emit(
                "agent.status",
                power=self.power_name,
                phase=phase,
                step="DECIDE",
                payload={"status": "TIMEOUT", "role": "STRATEGIST", "step": "DECIDE"},
            )
            return
        if not self._is_step_token_active(step_token):
            return
        self._events.emit(
            "agent.status",
            power=self.power_name,
            phase=phase,
            step="DECIDE",
            payload={"status": "WAITING", "role": "STRATEGIST", "step": "DECIDE"},
        )

    def notify_incoming_chat(self, sender: str, message: str, phase: str) -> tuple[bool, str | None]:
        """Mini completion callback for accept/decline incoming chat requests."""
        if self._is_modal:
            self._modal_incoming_sender = sender.upper()
            self._modal_incoming_decision = None
            root_prompt = (
                f"Incoming message in {phase}: {sender.upper()} says: {message!r}. "
                "Call accept_chat(sender, objective) or decline_chat(sender), then FINAL(done)."
            )
            try:
                self._run_completion_with_retries(
                    "",
                    root_prompt,
                    deadline_fn=self._time_remaining_fn,
                )
            finally:
                self._modal_incoming_sender = None
            decision = self._modal_incoming_decision or {"accepted": False, "objective": ""}
            accepted = bool(decision.get("accepted", False))
            objective = str(decision.get("objective", "")).strip() if accepted else None
        else:
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
                self._run_completion_with_retries(
                    "",
                    root_prompt,
                    deadline_fn=self._time_remaining_fn,
                )
            finally:
                env.globals.pop("accept_chat", None)
                env.globals.pop("decline_chat", None)

            objective = decision["objective"]
            accepted = objective is not None

        self._events.emit(
            "conversation.incoming_decision",
            power=self.power_name,
            phase=phase,
            step="CONVERSE",
            payload={
                "sender": sender.upper(),
                "accepted": accepted,
                "objective": objective or "",
                "summary": f"{sender.upper()} {'accepted' if accepted else 'declined'}",
            },
        )
        return (accepted, objective)

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

    def _run_completion_with_retries(
        self,
        prompt: str,
        root_prompt: str,
        deadline_fn: Callable[[], float] | None = None,
        step_token: str | None = None,
    ):
        if not self._acquire_completion_slot(deadline_fn):
            return None

        max_retries = self.config.max_retries
        try:
            for attempt in range(max_retries):
                if not self._is_step_token_active(step_token):
                    return None
                if self._step_deadline_exceeded(deadline_fn):
                    return None
                try:
                    self._events.emit(
                        "agent.completion.start",
                        power=self.power_name,
                        payload={
                            "attempt": attempt + 1,
                            "summary": f"attempt={attempt + 1}",
                        },
                    )
                    if self.config.observe_prompts:
                        self._events.emit(
                            "agent.prompt",
                            power=self.power_name,
                            priority=PRIORITY_NORMAL,
                            payload={
                                "text": str(root_prompt),
                                "summary": str(root_prompt),
                            },
                        )

                    before_text = self._memory_text_or_empty()
                    self._ensure_base_injection()
                    result = self.rlm.completion(prompt, root_prompt=root_prompt)
                    after_text = self._memory_text_or_empty()

                    if self._step_deadline_exceeded(deadline_fn) or not self._is_step_token_active(step_token):
                        if after_text != before_text:
                            try:
                                Path(self.memory_path).write_text(before_text, encoding="utf-8")
                            except Exception:
                                pass
                        self._submitted_orders = None
                        return None

                    response_text = str(getattr(result, "response", ""))
                    if self.config.observe_repl:
                        self._events.emit(
                            "agent.repl",
                            power=self.power_name,
                            payload={"text": response_text, "summary": response_text},
                        )
                    else:
                        self._events.emit(
                            "agent.completion.finish",
                            power=self.power_name,
                            payload={"summary": "completion finished"},
                        )

                    self._emit_memory_diff(before_text, after_text)
                    return result
                except Exception as exc:  # pragma: no cover - exercised with mocked failures
                    if self._step_deadline_exceeded(deadline_fn):
                        return None
                    if attempt >= max_retries - 1:
                        self._events.emit(
                            "agent.error",
                            power=self.power_name,
                            priority=PRIORITY_HIGH,
                            payload={"summary": f"completion failed after {max_retries} retries: {exc}"},
                        )
                        raise GameHaltError(
                            f"{self.power_name} completion() failed {max_retries} times"
                        ) from exc
                    self._events.emit(
                        "agent.retry",
                        power=self.power_name,
                        payload={
                            "attempt": attempt + 1,
                            "summary": f"retry {attempt + 1}/{max_retries}",
                        },
                    )
                    logger.warning(
                        "%s completion retry %s/%s failed: %s",
                        self.power_name,
                        attempt + 1,
                        max_retries,
                        exc,
                    )
            raise GameHaltError(f"{self.power_name} completion() retries exhausted")
        finally:
            self._completion_lock.release()

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
        env_globals["memory_path"] = self.memory_path
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
            "memory_text": self._memory_text_or_empty(),
            "conversation_results": list(self._modal_conversation_results),
            "unread_messages": list(self._modal_unread_messages),
            "allow_submit_orders": bool(self._modal_include_submit_orders),
            "time_remaining_seconds": remaining,
            "incoming_sender": self._modal_incoming_sender,
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

        memory_text = state.get("memory_text")
        if isinstance(memory_text, str):
            try:
                Path(self.memory_path).write_text(memory_text, encoding="utf-8")
            except Exception:
                pass

        if self._modal_include_submit_orders:
            submitted_orders = state.get("submitted_orders")
            if isinstance(submitted_orders, list):
                normalized_orders = [str(order) for order in submitted_orders]
                self._submit_orders(normalized_orders)

        decision = state.get("chat_decision")
        if isinstance(decision, dict):
            self._modal_incoming_decision = {
                "accepted": bool(decision.get("accepted", False)),
                "objective": str(decision.get("objective", "")),
            }

    def _submit_orders(self, orders: list[str]) -> str:
        if self._step_token_guard_enabled:
            if self._active_step_token is None or self._step_deadline_exceeded():
                return "Error: submit_orders unavailable after timeout."
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
        self._events.emit(
            "orders.submitted",
            power=self.power_name,
            priority=PRIORITY_NORMAL,
            payload={
                "accepted_count": len(accepted),
                "rejected_count": len(rejected),
                "accepted": list(accepted) if self.config.observe_repl else [],
                "rejected": list(rejected) if self.config.observe_repl else [],
                "summary": f"accepted={len(accepted)} rejected={len(rejected)}",
            },
        )

        if rejected:
            return f"Accepted {len(accepted)} orders. Rejected {len(rejected)}: {rejected}"
        return f"Accepted {len(accepted)} orders."

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

    def _step_deadline_exceeded(self, deadline_fn: Callable[[], float] | None = None) -> bool:
        active_deadline = deadline_fn or self._time_remaining_fn
        if active_deadline is None:
            return False
        try:
            return float(active_deadline()) <= 0.0
        except Exception:
            return False

    def _is_step_token_active(self, token: str | None) -> bool:
        if token is None:
            return True
        return self._active_step_token == token

    def _acquire_completion_slot(self, deadline_fn: Callable[[], float] | None = None) -> bool:
        active_deadline = deadline_fn or self._time_remaining_fn
        if active_deadline is None:
            self._completion_lock.acquire()
            return True

        try:
            remaining = max(0.0, float(active_deadline()))
        except Exception:
            return False
        if remaining <= 0.0:
            return False
        return self._completion_lock.acquire(timeout=remaining)

    def _memory_text_or_empty(self) -> str:
        try:
            return Path(self.memory_path).read_text(encoding="utf-8")
        except Exception:
            return ""

    def _emit_memory_diff(self, before: str, after: str) -> None:
        if before == after:
            return

        summary = "memory updated"
        payload: dict[str, Any] = {"summary": summary}
        if self.config.observe_memory_diffs:
            before_lines = before.splitlines()
            after_lines = after.splitlines()
            diff_lines = list(
                difflib.unified_diff(
                    before_lines,
                    after_lines,
                    fromfile="before_memory",
                    tofile="after_memory",
                    lineterm="",
                    n=2,
                )
            )
            if len(diff_lines) > 80:
                diff_lines = diff_lines[:80] + ["... (diff truncated)"]
            payload["diff"] = "\n".join(diff_lines)
            if diff_lines:
                payload["summary"] = diff_lines[0]
        self._events.emit(
            "memory.changed",
            power=self.power_name,
            payload=payload,
        )
