from __future__ import annotations

import builtins
from pathlib import Path
from types import SimpleNamespace

import pytest

from rlm_diplomacy.agents.conversation import ConversationAgent
from rlm_diplomacy.agents.strategist import StrategistAgent
from rlm_diplomacy.data_model import GameConfig
from rlm_diplomacy.memory import MemoryManager
from rlm_diplomacy.message_router import MessageRouter
from rlm_diplomacy.repl_sandbox import (
    apply_sandbox_to_env,
    build_sandbox_setup_code,
    conversation_policy,
    strategist_policy,
)


def _sandbox_env() -> SimpleNamespace:
    return SimpleNamespace(globals={"__builtins__": builtins.__dict__.copy()}, locals={})


def test_strategist_open_restricted_to_memory_path(tmp_path: Path) -> None:
    france_memory = tmp_path / "FRANCE_memory.md"
    england_memory = tmp_path / "ENGLAND_memory.md"
    france_memory.write_text("france\n", encoding="utf-8")
    england_memory.write_text("england\n", encoding="utf-8")

    env = _sandbox_env()
    apply_sandbox_to_env(env, strategist_policy(str(france_memory)))

    with env.globals["open"](france_memory, "a", encoding="utf-8") as f:
        f.write("updated\n")
    assert "updated\n" in france_memory.read_text(encoding="utf-8")

    with pytest.raises(PermissionError):
        env.globals["open"](england_memory, "r", encoding="utf-8")
    with pytest.raises(PermissionError):
        env.globals["open"]("/etc/passwd", "r", encoding="utf-8")


def test_conversation_open_always_blocked(tmp_path: Path) -> None:
    memory_path = tmp_path / "FRANCE_memory.md"
    memory_path.write_text("snapshot\n", encoding="utf-8")

    env = _sandbox_env()
    apply_sandbox_to_env(env, conversation_policy())

    with pytest.raises(PermissionError):
        env.globals["open"](memory_path, "r", encoding="utf-8")


def test_blocked_imports_enforced() -> None:
    env = _sandbox_env()
    apply_sandbox_to_env(env, conversation_policy())
    safe_import = env.globals["__import__"]

    for module_name in [
        "os",
        "subprocess",
        "socket",
        "ctypes",
        "threading",
        "multiprocessing",
        "builtins",
    ]:
        with pytest.raises(ImportError):
            safe_import(module_name)

    json_mod = safe_import("json")
    assert hasattr(json_mod, "loads")


def test_reinjection_restores_wrappers_and_scrubs_blocked_modules(tmp_path: Path) -> None:
    france_memory = tmp_path / "FRANCE_memory.md"
    england_memory = tmp_path / "ENGLAND_memory.md"
    france_memory.write_text("france\n", encoding="utf-8")
    england_memory.write_text("england\n", encoding="utf-8")

    env = _sandbox_env()
    policy = strategist_policy(str(france_memory))
    apply_sandbox_to_env(env, policy)

    env.globals["open"] = builtins.open
    env.globals["__import__"] = builtins.__import__
    env.globals["os"] = __import__("os")
    env.locals["socket"] = __import__("socket")

    apply_sandbox_to_env(env, policy)

    assert env.globals["open"] is not builtins.open
    assert env.globals["__import__"] is not builtins.__import__
    assert "os" not in env.globals
    assert "socket" not in env.locals
    with pytest.raises(PermissionError):
        env.globals["open"](england_memory, "r", encoding="utf-8")


def test_setup_code_installs_guards_before_first_repl_turn(tmp_path: Path) -> None:
    france_memory = tmp_path / "FRANCE_memory.md"
    england_memory = tmp_path / "ENGLAND_memory.md"
    france_memory.write_text("france\n", encoding="utf-8")
    england_memory.write_text("england\n", encoding="utf-8")

    setup_code = build_sandbox_setup_code(strategist_policy(str(france_memory)))
    namespace: dict[str, object] = {"__builtins__": builtins.__dict__.copy()}
    exec(setup_code, namespace, namespace)

    with namespace["open"](france_memory, "r", encoding="utf-8") as f:
        assert f.read().startswith("france")
    with pytest.raises(PermissionError):
        namespace["open"](england_memory, "r", encoding="utf-8")
    with pytest.raises(ImportError):
        namespace["__import__"]("os")


def test_custom_blocked_module_list_is_applied(tmp_path: Path) -> None:
    france_memory = tmp_path / "FRANCE_memory.md"
    france_memory.write_text("france\n", encoding="utf-8")

    env = _sandbox_env()
    apply_sandbox_to_env(
        env,
        strategist_policy(str(france_memory), blocked_modules={"json"}),
    )

    with pytest.raises(ImportError):
        env.globals["__import__"]("json")


def test_strategist_reinjects_sandbox_between_calls(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    memory = MemoryManager(str(tmp_game_dir))
    memory.initialize_all()
    strategist = StrategistAgent(
        power_name="FRANCE",
        game=fresh_game,
        memory=memory,
        config=GameConfig(game_dir=str(tmp_game_dir), max_retries=1),
    )

    strategist.rlm.queue_response("bootstrap")
    strategist.bootstrap()
    env = strategist.rlm._persistent_env
    assert env is not None

    env.globals["open"] = builtins.open
    env.globals["__import__"] = builtins.__import__
    strategist.rlm.queue_response("FINAL(done)")
    strategist.strategize("S1901M")

    assert env.globals["open"] is not builtins.open
    assert env.globals["__import__"] is not builtins.__import__


def test_conversation_reinjects_sandbox_between_rounds(
    patched_agent_rlm,
    fresh_game,
    tmp_game_dir: Path,
) -> None:
    router = MessageRouter(fresh_game)
    agent = ConversationAgent(
        power_name="FRANCE",
        targets=["ENGLAND"],
        objectives={"ENGLAND": "ally"},
        game=fresh_game,
        memory_snapshot="snapshot",
        router=router,
        config=GameConfig(game_dir=str(tmp_game_dir), max_retries=1),
    )
    agent.rlm.queue_response("bootstrap")
    agent.bootstrap()
    env = agent.rlm._persistent_env
    assert env is not None

    env.globals["open"] = builtins.open
    env.globals["__import__"] = builtins.__import__
    agent.rlm.queue_response("CONTINUE")
    agent.run_round(1)

    assert env.globals["open"] is not builtins.open
    assert env.globals["__import__"] is not builtins.__import__
