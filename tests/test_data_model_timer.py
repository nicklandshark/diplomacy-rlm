from __future__ import annotations

import time

from rlm_diplomacy.data_model import (
    ALL_POWERS,
    ConversationRequest,
    ConversationSummary,
    GameConfig,
    GameHaltError,
    PendingMessage,
)
from rlm_diplomacy.timer import PhaseTimer


def test_all_powers_order_and_shape() -> None:
    assert ALL_POWERS == [
        "AUSTRIA",
        "ENGLAND",
        "FRANCE",
        "GERMANY",
        "ITALY",
        "RUSSIA",
        "TURKEY",
    ]


def test_dataclasses_construct() -> None:
    req = ConversationRequest(power="FRANCE", objectives={"ENGLAND": "Ally"})
    assert req.objectives["ENGLAND"] == "Ally"

    summary = ConversationSummary(
        power="FRANCE", targets=["ENGLAND"], summary="ok", rounds_used=2
    )
    assert summary.targets == ["ENGLAND"]

    msg = PendingMessage(
        sender="FRANCE", recipient="GLOBAL", content="hello", phase="S1901M"
    )
    assert msg.recipient == "GLOBAL"


def test_game_halt_error_is_exception() -> None:
    try:
        raise GameHaltError("halt")
    except Exception as exc:
        assert isinstance(exc, GameHaltError)
        assert str(exc) == "halt"


def test_game_config_defaults_and_factories() -> None:
    config = GameConfig()
    assert config.backend == "anthropic"
    assert config.backend_for("FRANCE") == "anthropic"
    assert config.backend_kwargs["model_name"] == "claude-opus-4-6"
    assert config.strategize_timeout == 300.0
    assert config.converse_timeout == 360.0
    assert config.decide_timeout == 300.0
    assert config.converse_max_rounds == 5
    assert config.target_response_timeout == 60.0
    assert config.max_year == 1910
    assert config.game_dir == "./game_output"
    assert config.max_iterations == 15
    assert config.max_retries == 10
    assert config.environment == "local"
    assert config.environment_kwargs == {}
    assert config.sub_backend is None
    assert config.verbose is False
    assert config.observe_prompts is False
    assert config.observe_repl is False
    assert config.observe_messages is False
    assert config.observe_memory_diffs is False
    assert config.powers == ALL_POWERS
    assert config.power_model_overrides == {}
    assert config.power_backend_overrides == {}
    assert config.backend_kwargs_by_backend == {}
    assert config.power_backend_kwargs_overrides == {}

    override = GameConfig(
        max_year=1920,
        powers=["france", "germany"],
        power_backend_overrides={"germany": "openai"},
        power_model_overrides={"france": "custom-model"},
    )
    assert override.max_year == 1920
    assert override.strategize_timeout == 300.0
    assert override.powers == ["FRANCE", "GERMANY"]
    assert override.backend_kwargs_for("FRANCE")["model_name"] == "custom-model"
    assert "model_name" not in override.backend_kwargs_for("GERMANY")
    assert override.backend_for("FRANCE") == "anthropic"
    assert override.backend_for("GERMANY") == "openai"

    cfg_a = GameConfig()
    cfg_b = GameConfig()
    cfg_a.backend_kwargs["x"] = 1
    assert "x" not in cfg_b.backend_kwargs


def test_game_config_backend_kwargs_resolution_precedence() -> None:
    config = GameConfig(
        powers=["FRANCE", "GERMANY"],
        backend="anthropic",
        backend_kwargs={"model_name": "claude-sonnet-4-5", "api_key": "anthropic-key"},
        power_backend_overrides={"FRANCE": "openai"},
        backend_kwargs_by_backend={
            "openai": {"model_name": "gpt-4.1-mini", "api_key": "openai-global"},
        },
        power_backend_kwargs_overrides={
            "FRANCE": {"api_key": "openai-france"},
        },
    )

    france_kwargs = config.backend_kwargs_for("FRANCE")
    germany_kwargs = config.backend_kwargs_for("GERMANY")
    assert france_kwargs["model_name"] == "gpt-4.1-mini"
    assert france_kwargs["api_key"] == "openai-france"
    assert germany_kwargs["model_name"] == "claude-sonnet-4-5"
    assert germany_kwargs["api_key"] == "anthropic-key"


def test_game_config_power_validation() -> None:
    try:
        GameConfig(powers=["FRANCE"])
        raise AssertionError("Expected ValueError for fewer than two powers")
    except ValueError as exc:
        assert "At least two powers" in str(exc)

    try:
        GameConfig(powers=["FRANCE", "NARNIA"])
        raise AssertionError("Expected ValueError for unknown power")
    except ValueError as exc:
        assert "Unknown power" in str(exc)

    try:
        GameConfig(
            powers=["FRANCE", "GERMANY"],
            power_model_overrides={"ITALY": "model-x"},
        )
        raise AssertionError("Expected ValueError for out-of-subset model override")
    except ValueError as exc:
        assert "not in configured powers" in str(exc)

    try:
        GameConfig(
            powers=["FRANCE", "GERMANY"],
            power_backend_overrides={"ITALY": "openai"},
        )
        raise AssertionError("Expected ValueError for out-of-subset backend override")
    except ValueError as exc:
        assert "not in configured powers" in str(exc)

    try:
        GameConfig(
            powers=["FRANCE", "GERMANY"],
            power_backend_overrides={"FRANCE": "narnia"},
        )
        raise AssertionError("Expected ValueError for unknown backend override")
    except ValueError as exc:
        assert "Unknown power backend override" in str(exc)

    try:
        GameConfig(
            powers=["FRANCE", "GERMANY"],
            backend_kwargs_by_backend={"narnia": {"api_key": "x"}},
        )
        raise AssertionError("Expected ValueError for unknown backend kwargs override")
    except ValueError as exc:
        assert "Unknown backend kwargs override" in str(exc)

    try:
        GameConfig(
            powers=["FRANCE", "GERMANY"],
            power_backend_kwargs_overrides={"ITALY": {"api_key": "x"}},
        )
        raise AssertionError("Expected ValueError for out-of-subset backend kwargs override")
    except ValueError as exc:
        assert "not in configured powers" in str(exc)

    try:
        GameConfig(environment="underworld")
        raise AssertionError("Expected ValueError for unknown environment")
    except ValueError as exc:
        assert "Unknown environment" in str(exc)


def test_phase_timer_lifecycle() -> None:
    timer = PhaseTimer(0.05)
    assert timer.expired is False
    before = timer.remaining()
    assert before > 0.0

    time.sleep(0.02)
    mid = timer.remaining()
    assert mid < before

    time.sleep(0.05)
    assert timer.expired is True
    assert timer.remaining() == 0.0

    fn = timer.remaining_fn()
    assert callable(fn)
    assert fn() == 0.0
