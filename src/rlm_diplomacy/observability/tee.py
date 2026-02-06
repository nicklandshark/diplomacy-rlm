"""Tee emitter that broadcasts events to multiple emitters."""

from __future__ import annotations

from typing import Any

from .bus import EventEmitter
from .events import PRIORITY_NORMAL


class TeeEmitter(EventEmitter):
    """Broadcasts events to all wrapped emitters."""

    def __init__(self, *emitters: EventEmitter):
        self._emitters = list(emitters)

    def emit(
        self,
        event_type: str,
        *,
        priority: int = PRIORITY_NORMAL,
        phase: str | None = None,
        step: str | None = None,
        power: str | None = None,
        payload: dict[str, Any] | None = None,
    ) -> None:
        for emitter in self._emitters:
            emitter.emit(
                event_type,
                priority=priority,
                phase=phase,
                step=step,
                power=power,
                payload=payload,
            )

    def close(self) -> None:
        for emitter in self._emitters:
            emitter.close()
