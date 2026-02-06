from __future__ import annotations

from contextlib import contextmanager
from types import SimpleNamespace

from rlm_diplomacy.rlm_runtime import install_env_hook


class _SpawnContextRLM:
    def __init__(self):
        self._persistent_env = SimpleNamespace(globals={})

    @contextmanager
    def _spawn_completion_context(self, prompt):
        _ = prompt
        yield ("ctx", self._persistent_env)

    def completion(self, prompt, root_prompt=None):
        _ = root_prompt
        with self._spawn_completion_context(prompt):
            return "ok"


class _CompletionOnlyRLM:
    def __init__(self):
        self._persistent_env = SimpleNamespace(globals={})

    def completion(self, prompt, root_prompt=None):
        _ = (prompt, root_prompt)
        return "ok"


class _NoHookRLM:
    pass


def test_install_env_hook_uses_spawn_context_when_available() -> None:
    ready: list[object | None] = []
    finished: list[object | None] = []
    rlm = _SpawnContextRLM()

    report = install_env_hook(
        rlm,
        lambda env: ready.append(env),
        lambda env: finished.append(env),
    )
    assert report.installed is True
    assert report.mode == "spawn_context"

    assert rlm.completion("prompt") == "ok"
    assert ready == [rlm._persistent_env]
    assert finished == [rlm._persistent_env]


def test_install_env_hook_falls_back_to_completion_wrap() -> None:
    ready: list[object | None] = []
    finished: list[object | None] = []
    rlm = _CompletionOnlyRLM()

    report = install_env_hook(
        rlm,
        lambda env: ready.append(env),
        lambda env: finished.append(env),
    )
    assert report.installed is True
    assert report.mode == "completion_wrap"

    assert rlm.completion("prompt") == "ok"
    assert ready == [rlm._persistent_env]
    assert finished == [rlm._persistent_env]


def test_install_env_hook_reports_unhooked_instance() -> None:
    report = install_env_hook(_NoHookRLM(), lambda _env: None)
    assert report.installed is False
    assert report.mode == "unhooked"
    assert report.error


def test_install_env_hook_is_idempotent() -> None:
    ready: list[object | None] = []
    finished: list[object | None] = []
    rlm = _CompletionOnlyRLM()

    first = install_env_hook(
        rlm,
        lambda env: ready.append(env),
        lambda env: finished.append(env),
    )
    second = install_env_hook(
        rlm,
        lambda env: ready.append(env),
        lambda env: finished.append(env),
    )
    assert first.installed is True
    assert second.installed is True
    assert second.mode == "completion_wrap"

    assert rlm.completion("prompt") == "ok"
    assert len(ready) == 1
    assert len(finished) == 1
