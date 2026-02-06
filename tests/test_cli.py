from __future__ import annotations

from pathlib import Path

import pytest

import rlm_diplomacy.cli as cli_module


class _DummyOrchestrator:
    instances: list["_DummyOrchestrator"] = []

    def __init__(self, config, **kwargs):
        self.config = config
        self.kwargs = kwargs
        self.ran = False
        _DummyOrchestrator.instances.append(self)

    def run(self) -> None:
        self.ran = True


@pytest.fixture(autouse=True)
def _clear_dummy_orchestrator() -> None:
    _DummyOrchestrator.instances.clear()
    yield
    _DummyOrchestrator.instances.clear()


def test_cli_main_builds_subset_powers_and_models(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    cli_module.main(
        [
            "--game-dir",
            str(tmp_path / "game"),
            "--powers",
            "FRANCE,GERMANY,ITALY",
            "--power-model",
            "FRANCE=model-a",
            "--power-model",
            "ITALY=model-b",
        ]
    )

    assert len(_DummyOrchestrator.instances) == 1
    orchestrator = _DummyOrchestrator.instances[0]
    assert orchestrator.ran is True
    assert orchestrator.config.powers == ["FRANCE", "GERMANY", "ITALY"]
    assert orchestrator.config.power_model_overrides == {
        "FRANCE": "model-a",
        "ITALY": "model-b",
    }


def test_cli_main_builds_backend_and_sandbox_config(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)
    monkeypatch.setattr(cli_module, "_ensure_modal_installed", lambda: None)

    cli_module.main(
        [
            "--game-dir",
            str(tmp_path / "game"),
            "--powers",
            "FRANCE,GERMANY",
            "--backend",
            "openai",
            "--model",
            "gpt-4.1-mini",
            "--backend-arg",
            "api_key=test-openai-key",
            "--power-backend",
            "FRANCE=openai",
            "--power-backend",
            "GERMANY=anthropic",
            "--power-model",
            "GERMANY=claude-sonnet-4-5",
            "--sandbox",
            "modal",
            "--modal-app-name",
            "diplomacy-rlm-tests",
            "--modal-timeout",
            "900",
        ]
    )

    assert len(_DummyOrchestrator.instances) == 1
    orchestrator = _DummyOrchestrator.instances[0]
    assert orchestrator.ran is True
    assert orchestrator.config.backend == "openai"
    assert orchestrator.config.backend_kwargs["model_name"] == "gpt-4.1-mini"
    assert orchestrator.config.backend_kwargs["api_key"] == "test-openai-key"
    assert orchestrator.config.power_backend_overrides == {
        "FRANCE": "openai",
        "GERMANY": "anthropic",
    }
    assert orchestrator.config.power_model_overrides == {"GERMANY": "claude-sonnet-4-5"}
    assert orchestrator.config.environment == "modal"
    assert orchestrator.config.environment_kwargs["app_name"] == "diplomacy-rlm-tests"
    assert orchestrator.config.environment_kwargs["timeout"] == 900


def test_cli_rejects_power_model_outside_selected_powers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    with pytest.raises(SystemExit) as exc:
        cli_module.main(
            [
                "--powers",
                "FRANCE,GERMANY",
                "--power-model",
                "ITALY=model-c",
            ]
        )

    assert exc.value.code == 2
    assert not _DummyOrchestrator.instances


def test_cli_rejects_power_backend_outside_selected_powers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    with pytest.raises(SystemExit) as exc:
        cli_module.main(
            [
                "--powers",
                "FRANCE,GERMANY",
                "--power-backend",
                "ITALY=openai",
            ]
        )

    assert exc.value.code == 2
    assert not _DummyOrchestrator.instances


def test_cli_rejects_modelless_backend_when_missing_per_power_models(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    with pytest.raises(SystemExit) as exc:
        cli_module.main(
            [
                "--backend",
                "openai",
                "--powers",
                "FRANCE,GERMANY",
            ]
        )

    assert exc.value.code == 2
    assert not _DummyOrchestrator.instances


def test_cli_rejects_fewer_than_two_powers(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    with pytest.raises(SystemExit) as exc:
        cli_module.main(["--powers", "FRANCE"])

    assert exc.value.code == 2
    assert not _DummyOrchestrator.instances


def test_cli_defaults_to_noop_emitter_without_event_logging(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    cli_module.main(
        [
            "--game-dir",
            str(tmp_path / "game"),
            "--powers",
            "FRANCE,GERMANY",
        ]
    )

    assert len(_DummyOrchestrator.instances) == 1
    orchestrator = _DummyOrchestrator.instances[0]
    assert orchestrator.ran is True
    assert "event_emitter" in orchestrator.kwargs
    assert isinstance(orchestrator.kwargs["event_emitter"], cli_module.NoopEmitter)


def test_cli_log_events_uses_console_event_logger(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    cli_module.main(
        [
            "--game-dir",
            str(tmp_path / "game"),
            "--powers",
            "FRANCE,GERMANY",
            "--log-events",
        ]
    )

    assert len(_DummyOrchestrator.instances) == 1
    orchestrator = _DummyOrchestrator.instances[0]
    assert orchestrator.ran is True
    assert "event_emitter" in orchestrator.kwargs
    assert isinstance(orchestrator.kwargs["event_emitter"], cli_module.ConsoleEventLogger)


def test_cli_log_detail_flags_enable_observability_fields(
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    cli_module.main(
        [
            "--game-dir",
            str(tmp_path / "game"),
            "--powers",
            "FRANCE,GERMANY",
            "--log-events",
            "--log-prompts",
            "--log-repl",
            "--log-messages",
            "--log-memory-diff",
        ]
    )

    assert len(_DummyOrchestrator.instances) == 1
    orchestrator = _DummyOrchestrator.instances[0]
    assert orchestrator.ran is True
    assert orchestrator.config.observe_prompts is True
    assert orchestrator.config.observe_repl is True
    assert orchestrator.config.observe_messages is True
    assert orchestrator.config.observe_memory_diffs is True


def test_cli_rejects_log_detail_flags_without_log_events(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(cli_module, "Orchestrator", _DummyOrchestrator)

    with pytest.raises(SystemExit) as exc:
        cli_module.main(
            [
                "--powers",
                "FRANCE,GERMANY",
                "--log-repl",
            ]
        )

    assert exc.value.code == 2
    assert not _DummyOrchestrator.instances
