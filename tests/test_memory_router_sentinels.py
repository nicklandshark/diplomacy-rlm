from __future__ import annotations

import json
import threading

from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL
from rlm_diplomacy.data_model import PendingMessage
from rlm_diplomacy.memory import MemoryManager
from rlm_diplomacy.message_router import MessageRouter
from rlm_diplomacy.sentinels import (
    SPAWN_PREFIX,
    find_spawn_conversation,
    parse_spawn_completion,
)


def test_memory_manager_init_and_read(tmp_game_dir) -> None:
    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize("FRANCE")

    path = memory.memory_path("FRANCE")
    assert path.endswith("FRANCE_memory.md")
    content = memory.read_snapshot("FRANCE")
    assert content.startswith("# FRANCE -- Strategic Memory")

    # Idempotent initialize
    memory.initialize("FRANCE")
    assert memory.read_snapshot("FRANCE") == content


def test_memory_manager_initialize_all(tmp_game_dir) -> None:
    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all()
    for power in [
        "AUSTRIA",
        "ENGLAND",
        "FRANCE",
        "GERMANY",
        "ITALY",
        "RUSSIA",
        "TURKEY",
    ]:
        text = memory.read_snapshot(power)
        assert text.startswith(f"# {power} -- Strategic Memory")


def test_message_router_queue_and_flush(fresh_game) -> None:
    router = MessageRouter(fresh_game)
    phase = fresh_game.get_current_phase()

    router.queue_message(
        PendingMessage(
            sender="FRANCE", recipient="ENGLAND", content="hi", phase=phase
        )
    )
    router.queue_message(
        PendingMessage(
            sender="FRANCE", recipient=GLOBAL, content="global", phase=phase
        )
    )

    flushed = router.flush()
    assert len(flushed) == 2
    assert len(fresh_game.messages) == 2


def test_message_router_thread_safety(fresh_game) -> None:
    router = MessageRouter(fresh_game)
    phase = fresh_game.get_current_phase()

    def worker(idx: int) -> None:
        router.queue_message(
            PendingMessage(
                sender="FRANCE",
                recipient="ENGLAND",
                content=f"m-{idx}",
                phase=phase,
            )
        )

    threads = [threading.Thread(target=worker, args=(i,)) for i in range(50)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    flushed = router.flush()
    assert len(flushed) == 50
    assert len(fresh_game.messages) == 50


def test_message_router_get_unread(fresh_game) -> None:
    router = MessageRouter(fresh_game)
    phase = fresh_game.get_current_phase()

    router.queue_message(
        PendingMessage(
            sender="FRANCE", recipient="GERMANY", content="private", phase=phase
        )
    )
    router.queue_message(
        PendingMessage(
            sender="FRANCE", recipient=GLOBAL, content="global", phase=phase
        )
    )
    router.flush()

    unread = router.get_unread({"FRANCE", "ENGLAND"})
    assert any(item["recipient"] == "GERMANY" for item in unread)
    assert any(item["recipient"] == "GLOBAL" for item in unread)


def test_spawn_sentinel_parsing() -> None:
    payload = {"ENGLAND": "ally", "ITALY": "dmz"}
    text = f"SPAWN_CONVERSATION({json.dumps(payload)})"
    assert find_spawn_conversation(text) == payload

    malformed = 'SPAWN_CONVERSATION({"ENGLAND": )'
    assert find_spawn_conversation(malformed) is None

    wrapped = SPAWN_PREFIX + json.dumps(payload)
    assert parse_spawn_completion(wrapped) == payload
    assert parse_spawn_completion("FINAL(done)") is None
