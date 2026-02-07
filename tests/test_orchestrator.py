from __future__ import annotations

import json
import time
from pathlib import Path

from rlm_diplomacy.agents.strategist import StrategistAgent
from rlm_diplomacy.data_model import ConversationRequest, GameConfig
from rlm_diplomacy.orchestrator import Orchestrator


def test_orchestrator_run_creates_logs_and_snapshots(
    patched_agent_rlm,
    tmp_game_dir: Path,
) -> None:
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        max_year=1901,
        strategize_timeout=0.5,
        converse_timeout=0.5,
        decide_timeout=0.5,
        max_retries=1,
    )
    orchestrator = Orchestrator(config)
    orchestrator.run()

    log_path = tmp_game_dir / "game_log.jsonl"
    assert log_path.exists()
    lines = [line for line in log_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert lines
    for line in lines:
        json.loads(line)

    snapshots_dir = tmp_game_dir / "snapshots"
    assert snapshots_dir.exists()
    snapshot_phases = sorted(p.name for p in snapshots_dir.iterdir() if p.is_dir())
    assert "S1901M" in snapshot_phases


def test_orchestrator_from_snapshot_roundtrip(
    patched_agent_rlm,
    tmp_game_dir: Path,
) -> None:
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        max_year=1901,
        strategize_timeout=0.5,
        converse_timeout=0.5,
        decide_timeout=0.5,
        max_retries=1,
    )
    orchestrator = Orchestrator(config)
    orchestrator.run()

    snapshot_dir = tmp_game_dir / "snapshots" / "S1901M"
    assert snapshot_dir.exists()

    restored = Orchestrator.from_snapshot(str(snapshot_dir), config)
    with (snapshot_dir / "game_state.json").open("r", encoding="utf-8") as f:
        snapshot_state = json.load(f)
    assert restored.game.get_current_phase() == snapshot_state["name"]
    assert len(restored.strategists) == len(config.powers)


def test_orchestrator_subset_powers(
    patched_agent_rlm,
    tmp_game_dir: Path,
) -> None:
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_year=1901,
        strategize_timeout=0.5,
        converse_timeout=0.5,
        decide_timeout=0.5,
        max_retries=1,
    )
    orchestrator = Orchestrator(config)
    assert set(orchestrator.strategists.keys()) == {"FRANCE", "GERMANY"}
    assert orchestrator.game.get_units("FRANCE")
    assert orchestrator.game.get_units("GERMANY")
    assert orchestrator.game.get_units("ITALY") == []
    assert orchestrator.game.get_centers("ITALY") == []
    orchestrator.run()

    assert (tmp_game_dir / "FRANCE_memory.md").exists()
    assert (tmp_game_dir / "GERMANY_memory.md").exists()
    assert not (tmp_game_dir / "ITALY_memory.md").exists()


def test_strategize_timeout_does_not_block_phase_progression(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        strategize_timeout=0.01,
        max_retries=1,
    )
    orchestrator = Orchestrator(config)

    def _slow_strategize(self, phase: str) -> None:
        _ = phase
        time.sleep(0.25)

    monkeypatch.setattr(StrategistAgent, "strategize", _slow_strategize)

    start = time.monotonic()
    requests, timed_out = orchestrator._run_strategize_step("S1901M")
    elapsed = time.monotonic() - start

    assert requests == {}
    assert timed_out == {"FRANCE", "GERMANY"}
    assert elapsed < 0.2


def test_decide_timeout_drops_late_submit_orders_side_effects(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        decide_timeout=0.01,
        max_retries=1,
    )
    orchestrator = Orchestrator(config)

    def _slow_decide(self, phase: str) -> None:
        _ = phase
        time.sleep(0.05)
        self._submit_orders(["A PAR - XYZ"])

    monkeypatch.setattr(StrategistAgent, "decide", _slow_decide)

    orchestrator._run_decide_step("S1901M", summaries_by_power={})
    time.sleep(0.1)
    assert orchestrator.strategists["FRANCE"].get_submitted_orders() is None
    assert orchestrator.strategists["GERMANY"].get_submitted_orders() is None


def test_converse_timeout_drops_late_send_message_side_effects(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    from rlm_diplomacy.agents.conversation import ConversationAgent

    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        converse_timeout=0.01,
        converse_max_rounds=1,
        max_retries=1,
    )
    orchestrator = Orchestrator(config)

    def _slow_round(self, round_num: int) -> None:
        _ = round_num
        time.sleep(0.05)
        self._send_message("GERMANY", "late message")

    monkeypatch.setattr(ConversationAgent, "run_round", _slow_round)

    orchestrator._run_converse_step(
        "S1901M",
        requests={
            "FRANCE": ConversationRequest(
                power="FRANCE",
                objectives={"GERMANY": "ally"},
            )
        },
    )
    time.sleep(0.1)
    assert orchestrator.router.flush() == []
