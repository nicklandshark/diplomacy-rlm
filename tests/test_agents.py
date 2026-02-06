from __future__ import annotations

from pathlib import Path

from rlm_diplomacy.data_model import GameConfig
from rlm_diplomacy.game_view import GameView
from rlm_diplomacy.memory import MemoryManager
from rlm_diplomacy.message_router import MessageRouter
from rlm_diplomacy.timer import PhaseTimer


def test_strategist_spawn_and_submit_orders(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    from rlm_diplomacy.agents.strategist import StrategistAgent

    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all()
    config = GameConfig(game_dir=str(tmp_game_dir), max_retries=1)

    strategist = StrategistAgent("FRANCE", fresh_game, memory, config)
    strategist.rlm.queue_response("done")
    strategist.bootstrap()

    env = strategist.rlm._persistent_env
    assert env is not None
    assert env.globals["game_view"].power_name == "FRANCE"
    assert env.globals["memory_path"].endswith("FRANCE_memory.md")

    strategist.inject(PhaseTimer(5.0), include_submit_orders=False)
    strategist.rlm.queue_response('__SPAWN__:{"ENGLAND": "ally"}')
    strategist.strategize("S1901M")
    req = strategist.get_conversation_requests()
    assert req is not None
    assert req.objectives == {"ENGLAND": "ally"}

    strategist.inject(PhaseTimer(5.0), include_submit_orders=True)
    result = strategist._submit_orders(["A PAR H", "A MAR H", "F BRE H", "A PAR - LON"])
    assert "Accepted 3" in result
    assert "Rejected 1" in result

    second = strategist._submit_orders(["A PAR - BUR"])
    assert second.startswith("Error: orders already submitted")


def test_conversation_agent_rounds_and_messaging(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    from rlm_diplomacy.agents.conversation import ConversationAgent

    router = MessageRouter(fresh_game)
    config = GameConfig(game_dir=str(tmp_game_dir), max_retries=1)

    agent = ConversationAgent(
        power_name="FRANCE",
        targets=["ENGLAND"],
        objectives={"ENGLAND": "ally"},
        game=fresh_game,
        memory_snapshot="# FRANCE -- Strategic Memory\n",
        router=router,
        config=config,
    )

    agent.rlm.queue_response("initialized")
    agent.bootstrap()
    agent.inject_timer(PhaseTimer(5.0).remaining_fn())

    agent.rlm.queue_response("CONTINUE")
    agent.run_round(1)
    assert agent.is_finished is False

    queued = agent._send_message("ENGLAND", "hello")
    assert "Queued message" in queued
    assert len(fresh_game.messages) == 0

    router.flush()
    england_view = GameView(fresh_game, "ENGLAND")
    assert any(msg.message == "hello" for msg in england_view.get_messages().values())

    agent.rlm.queue_response("FINAL(Agreement reached)")
    agent.run_round(2)
    assert agent.is_finished is True
    summary = agent.get_summary()
    assert "Agreement reached" in summary.summary
    assert summary.rounds_used == 2


def test_conversation_add_target_idempotent(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    from rlm_diplomacy.agents.conversation import ConversationAgent

    router = MessageRouter(fresh_game)
    config = GameConfig(game_dir=str(tmp_game_dir), max_retries=1)

    agent = ConversationAgent(
        power_name="FRANCE",
        targets=["ENGLAND"],
        objectives={"ENGLAND": "ally"},
        game=fresh_game,
        memory_snapshot="snapshot",
        router=router,
        config=config,
    )

    agent.add_target("GERMANY", "probe")
    agent.add_target("GERMANY", "probe")
    assert agent.targets.count("GERMANY") == 1
    assert agent.objectives["GERMANY"] == "probe"
