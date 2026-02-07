"""Tests for the reactive conversation path.

Covers:
- Reactive agent creation via _process_incoming_chats
- add_target on existing agents when new senders appear
- Decline path (no agent creation)
- notify_incoming_chat accept/decline/auto-accept paths
- Mutual SPAWN_CONVERSATION (both powers target each other)
"""

from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace

from rlm_diplomacy._vendor.diplomacy import Message
from rlm_diplomacy.agents.conversation import ConversationAgent
from rlm_diplomacy.agents.strategist import StrategistAgent
from rlm_diplomacy.data_model import ConversationRequest, GameConfig
from rlm_diplomacy.memory import MemoryManager
from rlm_diplomacy.orchestrator import Orchestrator
from rlm_diplomacy.observability import RecorderEmitter
from rlm_diplomacy.timer import PhaseTimer


# ---------------------------------------------------------------------------
# Orchestrator-level: _process_incoming_chats
# ---------------------------------------------------------------------------


def test_process_incoming_chats_creates_reactive_agent(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    """When a message arrives for a power with no ConversationAgent,
    and the strategist accepts, a reactive ConversationAgent is created."""
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )
    orchestrator = Orchestrator(config)

    # Monkeypatch GERMANY's strategist to accept incoming chats
    monkeypatch.setattr(
        orchestrator.strategists["GERMANY"],
        "notify_incoming_chat",
        lambda sender, message, phase: (True, f"Respond to {sender}"),
    )

    # Inject a message from FRANCE to GERMANY into the game
    phase = orchestrator.game.get_current_phase()
    orchestrator.game.add_message(
        Message(sender="FRANCE", recipient="GERMANY", phase=phase, message="Let's ally")
    )

    # Only FRANCE has a conversation agent (the initiator)
    agents: dict[str, ConversationAgent] = {}
    france_agent = ConversationAgent(
        power_name="FRANCE",
        targets=["GERMANY"],
        objectives={"GERMANY": "propose alliance"},
        game=orchestrator.game,
        memory_snapshot="",
        router=orchestrator.router,
        config=config,
    )
    agents["FRANCE"] = france_agent

    # Call _process_incoming_chats — should create reactive agent for GERMANY
    orchestrator._process_incoming_chats(agents, phase)

    assert "GERMANY" in agents
    germany_agent = agents["GERMANY"]
    assert "FRANCE" in germany_agent.targets
    assert germany_agent.objectives["FRANCE"] == "Respond to FRANCE"


def test_process_incoming_chats_adds_target_to_existing_agent(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    """When a message arrives for a power that already has a ConversationAgent,
    the sender is added as a new target via add_target()."""
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY", "ITALY"],
        max_retries=1,
    )
    orchestrator = Orchestrator(config)

    # FRANCE already has an agent targeting GERMANY
    france_agent = ConversationAgent(
        power_name="FRANCE",
        targets=["GERMANY"],
        objectives={"GERMANY": "alliance"},
        game=orchestrator.game,
        memory_snapshot="",
        router=orchestrator.router,
        config=config,
    )
    agents: dict[str, ConversationAgent] = {"FRANCE": france_agent}

    # Monkeypatch FRANCE's strategist to accept incoming chats
    monkeypatch.setattr(
        orchestrator.strategists["FRANCE"],
        "notify_incoming_chat",
        lambda sender, message, phase: (True, f"Respond to {sender}"),
    )

    # ITALY sends a message to FRANCE
    phase = orchestrator.game.get_current_phase()
    orchestrator.game.add_message(
        Message(sender="ITALY", recipient="FRANCE", phase=phase, message="Discuss border")
    )

    orchestrator._process_incoming_chats(agents, phase)

    # FRANCE's agent should now have ITALY as an additional target
    assert "ITALY" in france_agent.targets
    assert "GERMANY" in france_agent.targets
    assert france_agent.objectives["ITALY"] == "Respond to ITALY"
    # No separate agent was created for FRANCE (still the same object)
    assert agents["FRANCE"] is france_agent


def test_process_incoming_chats_decline_does_not_create_agent(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    """When the strategist declines an incoming chat, no agent is created."""
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )
    orchestrator = Orchestrator(config)

    # Monkeypatch GERMANY's strategist to DECLINE
    monkeypatch.setattr(
        orchestrator.strategists["GERMANY"],
        "notify_incoming_chat",
        lambda sender, message, phase: (False, None),
    )

    phase = orchestrator.game.get_current_phase()
    orchestrator.game.add_message(
        Message(sender="FRANCE", recipient="GERMANY", phase=phase, message="Let's talk")
    )

    agents: dict[str, ConversationAgent] = {}
    orchestrator._process_incoming_chats(agents, phase)

    assert "GERMANY" not in agents


def test_process_incoming_chats_skips_already_targeted_sender(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    """Messages from a sender already in the recipient's target list are skipped."""
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )
    orchestrator = Orchestrator(config)

    # GERMANY already has an agent targeting FRANCE
    germany_agent = ConversationAgent(
        power_name="GERMANY",
        targets=["FRANCE"],
        objectives={"FRANCE": "ally"},
        game=orchestrator.game,
        memory_snapshot="",
        router=orchestrator.router,
        config=config,
    )
    agents: dict[str, ConversationAgent] = {"GERMANY": germany_agent}

    # Track if notify_incoming_chat is called (it shouldn't be)
    called = {"count": 0}
    original = orchestrator.strategists["GERMANY"].notify_incoming_chat

    def tracking_notify(*args, **kwargs):
        called["count"] += 1
        return original(*args, **kwargs)

    monkeypatch.setattr(
        orchestrator.strategists["GERMANY"],
        "notify_incoming_chat",
        tracking_notify,
    )

    phase = orchestrator.game.get_current_phase()
    orchestrator.game.add_message(
        Message(sender="FRANCE", recipient="GERMANY", phase=phase, message="Follow-up")
    )

    orchestrator._process_incoming_chats(agents, phase)

    # notify_incoming_chat should NOT have been called since FRANCE is already a target
    assert called["count"] == 0


# ---------------------------------------------------------------------------
# Strategist-level: notify_incoming_chat
# ---------------------------------------------------------------------------


def test_notify_incoming_chat_accept_via_callback(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    """When the strategist calls accept_chat(), notify_incoming_chat returns (True, objective)."""
    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all(["FRANCE", "GERMANY"])
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )

    strategist = StrategistAgent("GERMANY", fresh_game, memory, config)
    strategist.rlm.queue_response("done")  # bootstrap
    strategist.bootstrap()
    strategist.inject(PhaseTimer(5.0))

    # Monkeypatch completion to simulate the model calling accept_chat
    def fake_completion(prompt, root_prompt=None):
        env = strategist.rlm._persistent_env
        result = env.globals["accept_chat"]("FRANCE", "negotiate border")
        return SimpleNamespace(response="done")

    strategist.rlm.completion = fake_completion

    accepted, objective = strategist.notify_incoming_chat(
        sender="FRANCE",
        message="Hello Germany, let's discuss Burgundy.",
        phase="S1901M",
    )

    assert accepted is True
    assert objective == "negotiate border"


def test_notify_incoming_chat_decline_via_callback(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    """When the strategist calls decline_chat(), notify_incoming_chat returns (False, None)."""
    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all(["FRANCE", "GERMANY"])
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )

    strategist = StrategistAgent("GERMANY", fresh_game, memory, config)
    strategist.rlm.queue_response("done")  # bootstrap
    strategist.bootstrap()
    strategist.inject(PhaseTimer(5.0))

    # Monkeypatch completion to simulate the model calling decline_chat
    def fake_completion(prompt, root_prompt=None):
        env = strategist.rlm._persistent_env
        env.globals["decline_chat"]("FRANCE")
        return SimpleNamespace(response="done")

    strategist.rlm.completion = fake_completion

    accepted, objective = strategist.notify_incoming_chat(
        sender="FRANCE",
        message="Hello Germany, let's discuss Burgundy.",
        phase="S1901M",
    )

    assert accepted is False
    assert objective is None


def test_notify_incoming_chat_default_is_decline(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    """When the model neither calls accept_chat nor decline_chat, the default is decline."""
    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all(["FRANCE", "GERMANY"])
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )

    strategist = StrategistAgent("GERMANY", fresh_game, memory, config)
    strategist.rlm.queue_response("done")  # bootstrap
    strategist.bootstrap()
    strategist.inject(PhaseTimer(5.0))

    # ScriptedRLM returns "done" without calling accept/decline
    strategist.rlm.queue_response("done")

    accepted, objective = strategist.notify_incoming_chat(
        sender="FRANCE",
        message="Hello Germany, let's discuss Burgundy.",
        phase="S1901M",
    )

    assert accepted is False
    assert objective is None


def test_notify_incoming_chat_auto_accepts_when_env_unavailable(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    """When the strategist's persistent env is None (e.g. after timeout),
    notify_incoming_chat auto-accepts."""
    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all(["FRANCE", "GERMANY"])
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        max_retries=1,
    )

    strategist = StrategistAgent("GERMANY", fresh_game, memory, config)
    # Don't bootstrap — persistent_env stays None
    strategist.rlm._persistent_env = None

    accepted, objective = strategist.notify_incoming_chat(
        sender="FRANCE",
        message="Hello Germany, let's discuss Burgundy.",
        phase="S1901M",
    )

    assert accepted is True
    assert objective is not None
    assert "FRANCE" in objective


# ---------------------------------------------------------------------------
# Orchestrator-level: mutual SPAWN_CONVERSATION
# ---------------------------------------------------------------------------


def test_mutual_spawn_creates_separate_agents(
    patched_agent_rlm,
    tmp_game_dir: Path,
) -> None:
    """When both FRANCE and GERMANY SPAWN_CONVERSATION targeting each other,
    each power gets its own ConversationAgent with the other as target."""
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        converse_timeout=2.0,
        converse_max_rounds=1,
        max_retries=1,
    )
    emitter = RecorderEmitter()
    orchestrator = Orchestrator(config, event_emitter=emitter)

    requests = {
        "FRANCE": ConversationRequest(
            power="FRANCE",
            objectives={"GERMANY": "propose alliance"},
        ),
        "GERMANY": ConversationRequest(
            power="GERMANY",
            objectives={"FRANCE": "negotiate border"},
        ),
    }

    summaries = orchestrator._run_converse_step("S1901M", requests)

    # Both powers should have summaries
    assert "FRANCE" in summaries
    assert "GERMANY" in summaries

    # Each should report the other as a target
    assert "GERMANY" in summaries["FRANCE"][0].targets
    assert "FRANCE" in summaries["GERMANY"][0].targets

    # Both agent.start events should have been emitted
    agent_starts = [
        e for e in emitter.events() if e.event_type == "conversation.agent.start"
    ]
    agent_powers = {e.power for e in agent_starts}
    assert agent_powers == {"FRANCE", "GERMANY"}


# ---------------------------------------------------------------------------
# Integration: full reactive flow through _run_converse_step
# ---------------------------------------------------------------------------


def test_converse_step_reactive_agent_participates(
    patched_agent_rlm,
    tmp_game_dir: Path,
    monkeypatch,
) -> None:
    """A reactive agent created mid-converse participates in subsequent rounds."""
    config = GameConfig(
        game_dir=str(tmp_game_dir),
        powers=["FRANCE", "GERMANY"],
        converse_timeout=5.0,
        converse_max_rounds=3,
        max_retries=1,
    )
    emitter = RecorderEmitter()
    orchestrator = Orchestrator(config, event_emitter=emitter)

    # Monkeypatch GERMANY's strategist to accept incoming chats
    monkeypatch.setattr(
        orchestrator.strategists["GERMANY"],
        "notify_incoming_chat",
        lambda sender, message, phase: (True, f"Respond to {sender}"),
    )

    # Track round execution per power
    round_log: list[tuple[str, int]] = []
    original_run_round = ConversationAgent.run_round

    def tracking_run_round(self, round_num):
        round_log.append((self.power_name, round_num))

        # On FRANCE's round 1: send a message to trigger reactive agent creation
        if self.power_name == "FRANCE" and round_num == 1:
            self._send_message("GERMANY", "Let's ally against England")
            # Don't finish yet — continue to next round
            return

        # On later rounds, finish
        self._finished = True
        self._summary = "Done"

    monkeypatch.setattr(ConversationAgent, "run_round", tracking_run_round)

    requests = {
        "FRANCE": ConversationRequest(
            power="FRANCE",
            objectives={"GERMANY": "propose alliance"},
        ),
    }

    summaries = orchestrator._run_converse_step("S1901M", requests)

    # GERMANY should have been created as a reactive agent
    assert "GERMANY" in summaries

    # GERMANY should have participated in at least one round
    germany_rounds = [r for power, r in round_log if power == "GERMANY"]
    assert len(germany_rounds) >= 1

    # FRANCE should have run round 1 (send message) and at least one more
    france_rounds = [r for power, r in round_log if power == "FRANCE"]
    assert len(france_rounds) >= 2

    # Reactive agent event should have been emitted
    reactive_starts = [
        e
        for e in emitter.events()
        if e.event_type == "conversation.agent.start"
        and e.power == "GERMANY"
        and e.payload.get("reactive") is True
    ]
    assert len(reactive_starts) == 1
