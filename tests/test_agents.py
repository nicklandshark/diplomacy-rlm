from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

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


def test_strategist_discards_late_completion_side_effects(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    from rlm_diplomacy.agents.strategist import StrategistAgent

    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all(["FRANCE", "GERMANY"])
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )

    strategist = StrategistAgent("FRANCE", fresh_game, memory, config)
    strategist.rlm.queue_response("done")
    strategist.bootstrap()

    memory_path = Path(strategist.memory_path)
    before_text = memory_path.read_text(encoding="utf-8")
    strategist._submitted_orders = ["A PAR H"]

    ticks = {"count": 0}

    def remaining() -> float:
        ticks["count"] += 1
        if ticks["count"] < 3:
            return 1.0
        return -1.0

    strategist._time_remaining_fn = remaining

    def fake_completion(prompt: str, root_prompt: str | None = None):
        _ = (prompt, root_prompt)
        memory_path.write_text(before_text + "\nLATE_WRITE", encoding="utf-8")
        return SimpleNamespace(response="done")

    strategist.rlm.completion = fake_completion

    result = strategist._run_completion_with_retries("", "prompt")
    assert result is None
    assert strategist._submitted_orders is None
    assert memory_path.read_text(encoding="utf-8") == before_text


def test_power_model_overrides_are_applied_per_power(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    from rlm_diplomacy.agents.conversation import ConversationAgent
    from rlm_diplomacy.agents.strategist import StrategistAgent

    memory = MemoryManager(str(tmp_game_dir))
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        power_model_overrides={
            "FRANCE": "model-fr",
            "GERMANY": "model-ge",
        },
        max_retries=1,
    )
    memory.initialize_all(config.powers)

    france = StrategistAgent("FRANCE", fresh_game, memory, config)
    germany = StrategistAgent("GERMANY", fresh_game, memory, config)

    assert france.rlm.backend_kwargs["model_name"] == "model-fr"
    assert germany.rlm.backend_kwargs["model_name"] == "model-ge"

    router = MessageRouter(fresh_game, powers=config.powers)
    convo = ConversationAgent(
        power_name="FRANCE",
        targets=["GERMANY"],
        objectives={"GERMANY": "ally"},
        game=fresh_game,
        memory_snapshot="snapshot",
        router=router,
        config=config,
    )
    assert convo.rlm.backend_kwargs["model_name"] == "model-fr"


def test_power_backend_overrides_are_applied_per_power(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    from rlm_diplomacy.agents.conversation import ConversationAgent
    from rlm_diplomacy.agents.strategist import StrategistAgent

    memory = MemoryManager(str(tmp_game_dir))
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        backend="anthropic",
        power_backend_overrides={
            "FRANCE": "openai",
            "GERMANY": "anthropic",
        },
        power_model_overrides={
            "FRANCE": "gpt-4.1-mini",
            "GERMANY": "claude-sonnet-4-5",
        },
        max_retries=1,
    )
    memory.initialize_all(config.powers)

    france = StrategistAgent("FRANCE", fresh_game, memory, config)
    germany = StrategistAgent("GERMANY", fresh_game, memory, config)
    assert france.rlm.backend == "openai"
    assert germany.rlm.backend == "anthropic"

    router = MessageRouter(fresh_game, powers=config.powers)
    convo = ConversationAgent(
        power_name="FRANCE",
        targets=["GERMANY"],
        objectives={"GERMANY": "ally"},
        game=fresh_game,
        memory_snapshot="snapshot",
        router=router,
        config=config,
    )
    assert convo.rlm.backend == "openai"


def test_agents_pass_environment_configuration_to_rlm(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    from rlm_diplomacy.agents.conversation import ConversationAgent
    from rlm_diplomacy.agents.strategist import StrategistAgent

    memory = MemoryManager(str(tmp_game_dir))
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        environment="modal",
        environment_kwargs={"app_name": "diplomacy-tests", "timeout": 900},
        backend="openai",
        backend_kwargs={"model_name": "gpt-4.1-mini"},
        max_retries=1,
    )
    memory.initialize_all(config.powers)

    strategist = StrategistAgent("FRANCE", fresh_game, memory, config)
    assert strategist.rlm.environment == "modal"
    assert strategist.rlm.persistent is False
    assert strategist.rlm.environment_kwargs["app_name"] == "diplomacy-tests"
    assert strategist.rlm.environment_kwargs["timeout"] == 900
    assert "setup_code" in strategist.rlm.environment_kwargs

    router = MessageRouter(fresh_game, powers=config.powers)
    convo = ConversationAgent(
        power_name="GERMANY",
        targets=["FRANCE"],
        objectives={"FRANCE": "ally"},
        game=fresh_game,
        memory_snapshot="snapshot",
        router=router,
        config=config,
    )
    assert convo.rlm.environment == "modal"
    assert convo.rlm.persistent is False
    assert convo.rlm.environment_kwargs["app_name"] == "diplomacy-tests"


def test_strategist_modal_export_failure_does_not_wipe_memory(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    from rlm_diplomacy.agents import strategist as strategist_module
    from rlm_diplomacy.agents.strategist import StrategistAgent

    class _DummyEnv:
        def execute_code(self, _code: str) -> None:
            return None

    memory = MemoryManager(str(tmp_game_dir))
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        environment="modal",
        backend="openai",
        backend_kwargs={"model_name": "gpt-4.1-mini"},
        max_retries=1,
    )
    memory.initialize_all(config.powers)

    strategist = StrategistAgent("FRANCE", fresh_game, memory, config)
    memory_path = Path(strategist.memory_path)
    memory_path.write_text("KEEP_ME", encoding="utf-8")

    monkeypatch.setattr(
        strategist_module,
        "export_state",
        lambda _env: {"memory_text": "", "memory_ok": False},
    )
    strategist._capture_modal_env_outputs(_DummyEnv())
    assert memory_path.read_text(encoding="utf-8") == "KEEP_ME"

    # Backward-compat legacy payload with empty memory_text should also avoid wipe.
    monkeypatch.setattr(
        strategist_module,
        "export_state",
        lambda _env: {"memory_text": ""},
    )
    strategist._capture_modal_env_outputs(_DummyEnv())
    assert memory_path.read_text(encoding="utf-8") == "KEEP_ME"


def test_strategist_modal_export_success_updates_memory(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    from rlm_diplomacy.agents import strategist as strategist_module
    from rlm_diplomacy.agents.strategist import StrategistAgent

    class _DummyEnv:
        def execute_code(self, _code: str) -> None:
            return None

    memory = MemoryManager(str(tmp_game_dir))
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        environment="modal",
        backend="openai",
        backend_kwargs={"model_name": "gpt-4.1-mini"},
        max_retries=1,
    )
    memory.initialize_all(config.powers)

    strategist = StrategistAgent("FRANCE", fresh_game, memory, config)
    memory_path = Path(strategist.memory_path)
    memory_path.write_text("OLD", encoding="utf-8")

    monkeypatch.setattr(
        strategist_module,
        "export_state",
        lambda _env: {"memory_text": "NEW", "memory_ok": True},
    )
    strategist._capture_modal_env_outputs(_DummyEnv())
    assert memory_path.read_text(encoding="utf-8") == "NEW"
