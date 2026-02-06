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
    assert config.backend_kwargs["model_name"] == "claude-sonnet-4-5-20250929"
    assert config.strategize_timeout == 120.0
    assert config.converse_timeout == 180.0
    assert config.decide_timeout == 120.0
    assert config.converse_max_rounds == 5
    assert config.target_response_timeout == 60.0
    assert config.max_year == 1910
    assert config.game_dir == "./game_output"
    assert config.max_iterations == 15
    assert config.max_retries == 10
    assert config.sub_backend is None
    assert config.verbose is False

    override = GameConfig(max_year=1920)
    assert override.max_year == 1920
    assert override.strategize_timeout == 120.0

    cfg_a = GameConfig()
    cfg_b = GameConfig()
    cfg_a.backend_kwargs["x"] = 1
    assert "x" not in cfg_b.backend_kwargs


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
