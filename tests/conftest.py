from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Any

import pytest

from rlm_diplomacy._vendor.diplomacy import Game


@dataclass
class _UsageSummary:
    def to_dict(self) -> dict[str, Any]:
        return {"model_usage_summaries": {}}


@dataclass
class _Completion:
    root_model: str
    prompt: str | dict[str, Any]
    response: str
    usage_summary: _UsageSummary
    execution_time: float


class ScriptedRLM:
    """Deterministic in-memory test double for RLM."""

    instances: list["ScriptedRLM"] = []

    def __init__(self, *_, persistent: bool = False, backend_kwargs: dict | None = None, **__):
        self.persistent = persistent
        self.backend_kwargs = backend_kwargs or {}
        self._persistent_env: SimpleNamespace | None = None
        self.calls: list[tuple[str | dict[str, Any], str | None]] = []
        self._responses: deque[str] = deque()
        self._exceptions: deque[Exception] = deque()
        ScriptedRLM.instances.append(self)

    def queue_response(self, response: str) -> None:
        self._responses.append(response)

    def queue_exception(self, exc: Exception) -> None:
        self._exceptions.append(exc)

    def completion(self, prompt: str | dict[str, Any], root_prompt: str | None = None):
        self.calls.append((prompt, root_prompt))
        if self.persistent and self._persistent_env is None:
            self._persistent_env = SimpleNamespace(globals={}, locals={})

        if self._exceptions:
            raise self._exceptions.popleft()

        response = self._responses.popleft() if self._responses else "done"
        return _Completion(
            root_model=self.backend_kwargs.get("model_name", "scripted"),
            prompt=prompt,
            response=response,
            usage_summary=_UsageSummary(),
            execution_time=0.0,
        )

    def close(self) -> None:
        self._persistent_env = None


@pytest.fixture(autouse=True)
def clear_scripted_instances():
    ScriptedRLM.instances.clear()
    yield
    ScriptedRLM.instances.clear()


@pytest.fixture
def patched_agent_rlm(monkeypatch):
    import rlm_diplomacy.agents.conversation as conversation_module
    import rlm_diplomacy.agents.strategist as strategist_module

    monkeypatch.setattr(strategist_module, "RLM", ScriptedRLM)
    monkeypatch.setattr(conversation_module, "RLM", ScriptedRLM)


@pytest.fixture
def fresh_game() -> Game:
    return Game()


@pytest.fixture
def tmp_game_dir(tmp_path: Path) -> Path:
    d = tmp_path / "game_output"
    d.mkdir(parents=True, exist_ok=True)
    return d
