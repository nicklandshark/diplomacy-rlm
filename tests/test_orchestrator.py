from __future__ import annotations

import json
from pathlib import Path

from rlm_diplomacy.data_model import GameConfig
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
