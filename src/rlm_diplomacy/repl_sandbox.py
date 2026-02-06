"""REPL sandbox guards applied to injected persistent environments.

This module provides best-effort in-process hardening for agent REPL environments.
It is not equivalent to OS-level process/container isolation.
"""

from __future__ import annotations

import builtins as py_builtins
import json
from dataclasses import dataclass
from pathlib import Path
from types import ModuleType
from typing import Any


DEFAULT_BLOCKED_MODULES: frozenset[str] = frozenset(
    {
        "os",
        "sys",
        "subprocess",
        "socket",
        "threading",
        "multiprocessing",
        "ctypes",
        "inspect",
        "importlib",
        "builtins",
        "types",
        "gc",
        "pickle",
        "dill",
        "marshal",
        "resource",
        "signal",
    }
)


# Minimal fallback builtins for environments that do not pre-populate __builtins__.
_FALLBACK_BUILTINS = {
    "print": print,
    "len": len,
    "str": str,
    "int": int,
    "float": float,
    "list": list,
    "dict": dict,
    "set": set,
    "tuple": tuple,
    "bool": bool,
    "isinstance": isinstance,
    "enumerate": enumerate,
    "zip": zip,
    "sorted": sorted,
    "range": range,
    "min": min,
    "max": max,
    "sum": sum,
    "abs": abs,
    "round": round,
    "any": any,
    "all": all,
    "map": map,
    "filter": filter,
    "Exception": Exception,
    "ValueError": ValueError,
    "TypeError": TypeError,
    "KeyError": KeyError,
    "IndexError": IndexError,
    "AttributeError": AttributeError,
    "NameError": NameError,
    "ImportError": ImportError,
    "FileNotFoundError": FileNotFoundError,
    "PermissionError": PermissionError,
}


_REMOVE_BUILTINS = {
    "eval",
    "exec",
    "compile",
    "globals",
    "locals",
    "input",
    "help",
    "breakpoint",
}


@dataclass(frozen=True)
class SandboxPolicy:
    """Filesystem and import restrictions for a REPL environment."""

    allowed_files: frozenset[Path]
    allowed_roots: frozenset[Path]
    blocked_modules: frozenset[str] = DEFAULT_BLOCKED_MODULES
    deny_all_open: bool = False


def strategist_policy(memory_path: str, blocked_modules: set[str] | None = None) -> SandboxPolicy:
    blocked = frozenset(blocked_modules) if blocked_modules is not None else DEFAULT_BLOCKED_MODULES
    allowed = frozenset({_norm_path(memory_path)})
    return SandboxPolicy(
        allowed_files=allowed,
        allowed_roots=frozenset(),
        blocked_modules=blocked,
        deny_all_open=False,
    )


def conversation_policy(blocked_modules: set[str] | None = None) -> SandboxPolicy:
    blocked = frozenset(blocked_modules) if blocked_modules is not None else DEFAULT_BLOCKED_MODULES
    return SandboxPolicy(
        allowed_files=frozenset(),
        allowed_roots=frozenset(),
        blocked_modules=blocked,
        deny_all_open=True,
    )


def build_sandbox_setup_code(policy: SandboxPolicy) -> str:
    """Trusted setup_code that installs sandbox guards before first REPL turn."""
    allowed_files = sorted(str(path) for path in policy.allowed_files)
    allowed_roots = sorted(str(path) for path in policy.allowed_roots)
    blocked_modules = sorted(policy.blocked_modules)
    removed_builtins = sorted(_REMOVE_BUILTINS)

    return f"""
def __install_repl_sandbox():
    import builtins as _sb_builtins
    from pathlib import Path as _sb_Path

    _allowed_files = set({json.dumps(allowed_files)})
    _allowed_roots = set({json.dumps(allowed_roots)})
    _blocked_modules = set({json.dumps(blocked_modules)})
    _remove_builtins = set({json.dumps(removed_builtins)})
    _deny_all_open = {str(policy.deny_all_open)}

    def _is_module_blocked(name):
        if name in _blocked_modules:
            return True
        return name.split(".", 1)[0] in _blocked_modules

    _host_import = _sb_builtins.__import__

    def _safe_import(name, globals=None, locals=None, fromlist=(), level=0):
        if _is_module_blocked(str(name)):
            raise ImportError(f"Import of module '{{name}}' is blocked in this REPL.")
        return _host_import(name, globals, locals, fromlist, level)

    _host_open = _sb_builtins.open

    def _norm_path(path_like):
        raw = _sb_Path(path_like).expanduser()
        if not raw.is_absolute():
            raw = (_sb_Path.cwd() / raw)
        return raw.resolve(strict=False)

    def _is_path_allowed(path):
        if str(path) in _allowed_files:
            return True
        for root in _allowed_roots:
            if path.is_relative_to(_sb_Path(root)):
                return True
        return False

    def _safe_open(
        file,
        mode="r",
        buffering=-1,
        encoding=None,
        errors=None,
        newline=None,
        closefd=True,
        opener=None,
    ):
        if _deny_all_open:
            raise PermissionError("File access is disabled in this REPL.")
        if isinstance(file, int):
            raise PermissionError("File descriptor access is blocked in this REPL.")
        if opener is not None or closefd is False:
            raise PermissionError("Custom file open options are blocked in this REPL.")
        target = _norm_path(file)
        if not _is_path_allowed(target):
            raise PermissionError(f"File access to '{{target}}' is blocked in this REPL.")
        return _host_open(
            target,
            mode,
            buffering,
            encoding,
            errors,
            newline,
            closefd,
            opener,
        )

    _globals = globals()
    _current = _globals.get("__builtins__", {{}})
    if isinstance(_current, dict):
        _safe_builtins = dict(_current)
    else:
        _safe_builtins = dict(getattr(_current, "__dict__", {{}}))

    for _name in _remove_builtins:
        _safe_builtins.pop(_name, None)

    _safe_builtins["__import__"] = _safe_import
    _safe_builtins["open"] = _safe_open

    _globals["__builtins__"] = _safe_builtins
    _globals["__import__"] = _safe_import
    _globals["open"] = _safe_open


__install_repl_sandbox()
del __install_repl_sandbox
""".strip()


def apply_sandbox_to_env(env: Any, policy: SandboxPolicy) -> None:
    """Re-apply sandbox wrappers to a persistent env.

    Should be called before every completion/retry so agent monkey-patches do not persist.
    """
    env_globals = getattr(env, "globals", None)
    if not isinstance(env_globals, dict):
        return

    env_locals = getattr(env, "locals", None)
    if isinstance(env_locals, dict):
        env_locals.pop("__builtins__", None)

    safe_import = _make_safe_import(policy.blocked_modules)
    safe_open = _make_safe_open(policy)

    safe_builtins = _build_safe_builtins(env_globals)
    for name in _REMOVE_BUILTINS:
        safe_builtins.pop(name, None)

    safe_builtins["__import__"] = safe_import
    safe_builtins["open"] = safe_open

    env_globals["__builtins__"] = safe_builtins
    env_globals["__import__"] = safe_import
    env_globals["open"] = safe_open

    _scrub_blocked_module_refs(env_globals, policy.blocked_modules)
    if isinstance(env_locals, dict):
        _scrub_blocked_module_refs(env_locals, policy.blocked_modules)


def _build_safe_builtins(env_globals: dict[str, Any]) -> dict[str, Any]:
    current = env_globals.get("__builtins__")
    if isinstance(current, dict):
        return dict(current)
    if hasattr(current, "__dict__"):
        return dict(current.__dict__)
    return dict(_FALLBACK_BUILTINS)


def _is_module_blocked(name: str, blocked_modules: frozenset[str]) -> bool:
    if name in blocked_modules:
        return True
    top = name.split(".", 1)[0]
    return top in blocked_modules


def _make_safe_import(blocked_modules: frozenset[str]):
    host_import = py_builtins.__import__

    def safe_import(
        name: str,
        globals: dict[str, Any] | None = None,
        locals: dict[str, Any] | None = None,
        fromlist: tuple[str, ...] | list[str] = (),
        level: int = 0,
    ):
        if _is_module_blocked(str(name), blocked_modules):
            raise ImportError(f"Import of module '{name}' is blocked in this REPL.")
        return host_import(name, globals, locals, fromlist, level)

    return safe_import


def _make_safe_open(policy: SandboxPolicy):
    host_open = py_builtins.open

    def safe_open(
        file: Any,
        mode: str = "r",
        buffering: int = -1,
        encoding: str | None = None,
        errors: str | None = None,
        newline: str | None = None,
        closefd: bool = True,
        opener: Any | None = None,
    ):
        if policy.deny_all_open:
            raise PermissionError("File access is disabled in this REPL.")

        if isinstance(file, int):
            raise PermissionError("File descriptor access is blocked in this REPL.")

        if opener is not None or closefd is False:
            raise PermissionError("Custom file open options are blocked in this REPL.")

        target = _norm_path(file)
        if not _is_path_allowed(target, policy):
            raise PermissionError(f"File access to '{target}' is blocked in this REPL.")

        return host_open(
            target,
            mode,
            buffering,
            encoding,
            errors,
            newline,
            closefd,
            opener,
        )

    return safe_open


def _is_path_allowed(path: Path, policy: SandboxPolicy) -> bool:
    if path in policy.allowed_files:
        return True
    for root in policy.allowed_roots:
        if path.is_relative_to(root):
            return True
    return False


def _norm_path(path_like: Any) -> Path:
    raw = Path(path_like).expanduser()
    if not raw.is_absolute():
        raw = (Path.cwd() / raw)
    return raw.resolve(strict=False)


def _scrub_blocked_module_refs(namespace: dict[str, Any], blocked_modules: frozenset[str]) -> None:
    for key, value in list(namespace.items()):
        if key == "__builtins__":
            continue
        if isinstance(value, ModuleType) and _is_module_blocked(value.__name__, blocked_modules):
            namespace.pop(key, None)
            continue
        if key in blocked_modules:
            namespace.pop(key, None)
