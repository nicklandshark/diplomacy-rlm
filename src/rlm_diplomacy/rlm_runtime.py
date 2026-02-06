"""Compatibility layer around the external ``rlm`` package.

The harness uses the real package when available. For local/offline tests where the
package is missing, a lightweight scripted fallback is provided.
"""

from __future__ import annotations

import functools
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
    # so the Anthropic SDK rejects non-streaming requests for models with low
    # non-streaming token limits (e.g. Opus). Patch completion to pass an explicit
    # timeout, which bypasses the SDK's client-side validation.
    try:
        import httpx
        from rlm.clients.anthropic import AnthropicClient as _AC

        _orig_completion = _AC.completion

        def _patched_completion(self, prompt, model=None):
            _orig_create = self.client.messages.create

            def _create_with_timeout(**kwargs):
                kwargs.setdefault("timeout", httpx.Timeout(timeout=600.0, connect=5.0))
                return _orig_create(**kwargs)

            self.client.messages.create = _create_with_timeout
            try:
                return _orig_completion(self, prompt, model)
            finally:
                self.client.messages.create = _orig_create

        _AC.completion = _patched_completion
    except Exception:
        pass

except Exception:  # pragma: no cover - exercised when external dependency is unavailable
    RLM = FallbackRLM
    RLMChatCompletion = FallbackRLMChatCompletion


def install_env_hook(
    rlm_instance: Any,
    on_env_ready: Callable[[Any | None], None] | Callable[[], None],
    on_env_finished: Callable[[Any | None], None] | Callable[[], None] | None = None,
) -> None:
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

    if isinstance(rlm_instance, FallbackRLM):
        orig_completion = rlm_instance.completion

        @functools.wraps(orig_completion)
        def _hooked_completion(prompt, root_prompt=None):
            env = None
            if rlm_instance.persistent:
                env = rlm_instance._ensure_env()
            _call(on_env_ready, env)
            try:
                return orig_completion(prompt, root_prompt=root_prompt)
            finally:
                _call(on_env_finished, env)

        rlm_instance.completion = _hooked_completion
        return

    if hasattr(rlm_instance, "_spawn_completion_context"):
        orig_spawn = rlm_instance._spawn_completion_context

        @contextmanager
        def _hooked_spawn(prompt):
            with orig_spawn(prompt) as ctx:
                env = ctx[1] if isinstance(ctx, tuple) and len(ctx) >= 2 else None
                _call(on_env_ready, env)
                try:
                    yield ctx
                finally:
                    _call(on_env_finished, env)

        rlm_instance._spawn_completion_context = _hooked_spawn
