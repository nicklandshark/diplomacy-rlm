"""Compatibility layer around the external ``rlm`` package.

The harness uses the real package when available. For local/offline tests where the
package is missing, a lightweight scripted fallback is provided.
"""

from __future__ import annotations

import time
from dataclasses import dataclass
from types import SimpleNamespace
from typing import Any


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
except Exception:  # pragma: no cover - exercised when external dependency is unavailable
    RLM = FallbackRLM
    RLMChatCompletion = FallbackRLMChatCompletion
