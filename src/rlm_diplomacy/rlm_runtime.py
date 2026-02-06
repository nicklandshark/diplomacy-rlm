"""Compatibility layer around the external ``rlm`` package.

The harness uses the real package when available. For local/offline tests where the
package is missing, a lightweight scripted fallback is provided.
"""

from __future__ import annotations

import functools
import os
from contextlib import contextmanager
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any, Callable


@dataclass(slots=True)
class _FallbackUsageSummary:
    model_usage_summaries: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        return {"model_usage_summaries": self.model_usage_summaries}


@dataclass(slots=True)
class FallbackRLMChatCompletion:
    root_model: str
    prompt: str | dict[str, Any]
    response: str
    usage_summary: _FallbackUsageSummary
    execution_time: float


@dataclass(slots=True)
class HookInstallReport:
    installed: bool
    mode: str
    error: str | None = None


class FallbackRLM:
    """Minimal offline-compatible RLM stub with persistent globals/locals."""

    def __init__(
        self,
        backend: str = "anthropic",
        backend_kwargs: dict[str, Any] | None = None,
        max_iterations: int = 15,
        custom_system_prompt: str | None = None,
        other_backends: list[str] | None = None,
        other_backend_kwargs: list[dict[str, Any]] | None = None,
        verbose: bool = False,
        persistent: bool = False,
        **_: Any,
    ):
        self.backend = backend
        self.backend_kwargs = backend_kwargs or {}
        self.max_iterations = max_iterations
        self.system_prompt = custom_system_prompt
        self.other_backends = other_backends
        self.other_backend_kwargs = other_backend_kwargs
        self.verbose = verbose
        self.persistent = persistent
        self._persistent_env: SimpleNamespace | None = None
        self._queued_responses: list[str] = []

    def queue_response(self, response: str) -> None:
        self._queued_responses.append(response)

    def _ensure_env(self) -> SimpleNamespace:
        if self._persistent_env is None:
            self._persistent_env = SimpleNamespace(globals={}, locals={}, context_count=0)
        return self._persistent_env

    def completion(self, prompt: str | dict[str, Any], root_prompt: str | None = None) -> FallbackRLMChatCompletion:
        _ = root_prompt
        if self.persistent:
            env = self._ensure_env()
            idx = env.context_count
            env.locals[f"context_{idx}"] = prompt
            env.locals["context"] = prompt
            env.context_count += 1

        response = self._queued_responses.pop(0) if self._queued_responses else "done"
        usage = _FallbackUsageSummary(model_usage_summaries={})
        return FallbackRLMChatCompletion(
            root_model=self.backend_kwargs.get("model_name", "fallback-model"),
            prompt=prompt,
            response=response,
            usage_summary=usage,
            execution_time=0.0,
        )

    def close(self) -> None:
        self._persistent_env = None


try:
    from rlm.core.rlm import RLM as ExternalRLM
    from rlm.core.types import RLMChatCompletion as ExternalRLMChatCompletion

    RLM = ExternalRLM
    RLMChatCompletion = ExternalRLMChatCompletion

    # The RLM AnthropicClient doesn't pass stream or timeout to messages.create(),
    # so the Anthropic SDK can reject non-streaming requests for some models.
    # Patch completion to pass an explicit timeout (default 120s, configurable via
    # backend kwargs or RLM_ANTHROPIC_TIMEOUT_SECONDS).
    try:
        import httpx
        from rlm.clients.anthropic import AnthropicClient as _AC

        _orig_completion = _AC.completion

        def _patched_completion(self, prompt, model=None):
            _orig_create = self.client.messages.create

            timeout_seconds = None
            raw_kwargs = getattr(self, "kwargs", None)
            if isinstance(raw_kwargs, dict):
                timeout_seconds = raw_kwargs.get("request_timeout_seconds")
                if timeout_seconds is None:
                    timeout_seconds = raw_kwargs.get("timeout_seconds")

            if timeout_seconds is None:
                timeout_seconds = os.environ.get("RLM_ANTHROPIC_TIMEOUT_SECONDS")

            try:
                timeout_value = float(timeout_seconds) if timeout_seconds is not None else 120.0
            except (TypeError, ValueError):
                timeout_value = 120.0
            timeout_value = max(1.0, timeout_value)

            def _create_with_timeout(**kwargs):
                kwargs.setdefault(
                    "timeout",
                    httpx.Timeout(timeout=timeout_value, connect=min(5.0, timeout_value)),
                )
                return _orig_create(**kwargs)

            self.client.messages.create = _create_with_timeout
            try:
                return _orig_completion(self, prompt, model)
            finally:
                self.client.messages.create = _orig_create

        _AC.completion = _patched_completion

        # Opus models reject assistant-message prefill.  The RLM core can
        # produce message lists ending with an assistant turn (e.g. in
        # _default_answer or when format_iteration appends the model's own
        # response).  Patch _prepare_messages to convert any trailing
        # assistant message into a user message so the API never sees prefill.
        _orig_prepare = _AC._prepare_messages

        def _patched_prepare(self, prompt):
            messages, system = _orig_prepare(self, prompt)
            if messages and messages[-1].get("role") == "assistant":
                messages[-1] = {
                    "role": "user",
                    "content": messages[-1]["content"],
                }
            return messages, system

        _AC._prepare_messages = _patched_prepare
    except Exception:
        pass

except Exception:  # pragma: no cover - exercised when external dependency is unavailable
    RLM = FallbackRLM
    RLMChatCompletion = FallbackRLMChatCompletion


def install_env_hook(
    rlm_instance: Any,
    on_env_ready: Callable[[Any | None], None] | Callable[[], None],
    on_env_finished: Callable[[Any | None], None] | Callable[[], None] | None = None,
) -> HookInstallReport:
    """Ensure *on_env_ready* fires after the persistent environment is created
    but before any agent code executes.

    ``_persistent_env`` is ``None`` until the first ``completion()`` call
    internally creates it, so callers cannot inject globals beforehand.
    This wraps the RLM internals so the callback fires at the right moment.
    """
    def _call(callback, env: Any | None) -> None:
        if callback is None:
            return
        try:
            callback(env)
        except TypeError:
            callback()

    def _resolve_env_candidate(instance: Any) -> Any | None:
        ensure_fn = getattr(instance, "_ensure_env", None)
        if callable(ensure_fn):
            try:
                env = ensure_fn()
                if env is not None:
                    return env
            except Exception:
                pass
        for attr in ("_persistent_env", "persistent_env", "env"):
            env = getattr(instance, attr, None)
            if env is not None:
                return env
        return None

    def _resolve_env_from_ctx(ctx: Any) -> Any | None:
        if isinstance(ctx, (tuple, list)):
            if len(ctx) >= 2 and ctx[1] is not None:
                return ctx[1]
        for attr in ("env", "_env"):
            env = getattr(ctx, attr, None)
            if env is not None:
                return env
        return None

    if getattr(rlm_instance, "_rlm_diplomacy_hooked", False):
        mode = str(getattr(rlm_instance, "_rlm_diplomacy_hook_mode", "already_hooked"))
        return HookInstallReport(installed=True, mode=mode)

    if isinstance(rlm_instance, FallbackRLM):
        orig_completion = rlm_instance.completion

        @functools.wraps(orig_completion)
        def _hooked_completion(*args, **kwargs):
            env = None
            if rlm_instance.persistent:
                env = rlm_instance._ensure_env()
            _call(on_env_ready, env)
            try:
                return orig_completion(*args, **kwargs)
            finally:
                _call(on_env_finished, env)

        rlm_instance.completion = _hooked_completion
        setattr(rlm_instance, "_rlm_diplomacy_hooked", True)
        setattr(rlm_instance, "_rlm_diplomacy_hook_mode", "completion_wrap")
        return HookInstallReport(installed=True, mode="completion_wrap")

    spawn_attr = None
    if hasattr(rlm_instance, "_spawn_completion_context"):
        spawn_attr = "_spawn_completion_context"
    elif hasattr(rlm_instance, "spawn_completion_context"):
        spawn_attr = "spawn_completion_context"
    if spawn_attr is not None:
        orig_spawn = getattr(rlm_instance, spawn_attr)

        @contextmanager
        def _hooked_spawn(*args, **kwargs):
            with orig_spawn(*args, **kwargs) as ctx:
                env = _resolve_env_from_ctx(ctx)
                if env is None:
                    env = _resolve_env_candidate(rlm_instance)
                _call(on_env_ready, env)
                try:
                    yield ctx
                finally:
                    _call(on_env_finished, env)

        setattr(rlm_instance, spawn_attr, _hooked_spawn)
        setattr(rlm_instance, "_rlm_diplomacy_hooked", True)
        setattr(rlm_instance, "_rlm_diplomacy_hook_mode", "spawn_context")
        return HookInstallReport(installed=True, mode="spawn_context")

    completion = getattr(rlm_instance, "completion", None)
    if callable(completion):
        orig_completion = completion

        @functools.wraps(orig_completion)
        def _hooked_completion(*args, **kwargs):
            env = _resolve_env_candidate(rlm_instance)
            _call(on_env_ready, env)
            try:
                return orig_completion(*args, **kwargs)
            finally:
                post_env = _resolve_env_candidate(rlm_instance) or env
                _call(on_env_finished, post_env)

        setattr(rlm_instance, "completion", _hooked_completion)
        setattr(rlm_instance, "_rlm_diplomacy_hooked", True)
        setattr(rlm_instance, "_rlm_diplomacy_hook_mode", "completion_wrap")
        return HookInstallReport(installed=True, mode="completion_wrap")

    return HookInstallReport(
        installed=False,
        mode="unhooked",
        error="RLM instance has no hookable completion context or completion() method.",
    )
