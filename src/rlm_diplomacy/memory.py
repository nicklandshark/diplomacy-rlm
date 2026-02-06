"""Memory file management for strategist agents."""

from __future__ import annotations

import os
import stat
from pathlib import Path

from .data_model import ALL_POWERS
from .observability import EventEmitter, NoopEmitter


class MemoryManager:
    """Manage per-power markdown memory files."""

    def __init__(self, game_dir: str, event_emitter: EventEmitter | None = None):
        self.game_dir = Path(game_dir).expanduser().resolve()
        self.game_dir.mkdir(parents=True, exist_ok=True)
        self._events = event_emitter or NoopEmitter()

    def memory_path(self, power: str) -> str:
        return str(self.game_dir / f"{power.upper()}_memory.md")

    def initialize(self, power: str) -> None:
        path = Path(self.memory_path(power))
        if path.exists():
            if path.is_symlink():
                raise RuntimeError(f"Refusing symlinked memory path: {path}")
            return
        header = f"# {power.upper()} -- Strategic Memory\n\n"
        flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL
        if hasattr(os, "O_NOFOLLOW"):
            flags |= os.O_NOFOLLOW
        fd = os.open(path, flags, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(header)
        self._events.emit(
            "memory.init",
            power=power.upper(),
            payload={"path": str(path)},
        )

    def read_snapshot(self, power: str) -> str:
        path = Path(self.memory_path(power))
        if not path.exists():
            self.initialize(power)
        if path.is_symlink():
            raise RuntimeError(f"Refusing symlinked memory path: {path}")
        mode = path.stat().st_mode
        if not stat.S_ISREG(mode):
            raise RuntimeError(f"Refusing non-regular memory path: {path}")
        text = path.read_text(encoding="utf-8")
        self._events.emit(
            "memory.read",
            power=power.upper(),
            payload={"path": str(path), "bytes": len(text.encode("utf-8"))},
        )
        return text

    def initialize_all(self, powers: list[str] | None = None) -> None:
        for power in powers or ALL_POWERS:
            self.initialize(power)
