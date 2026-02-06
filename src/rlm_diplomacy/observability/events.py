"""Structured observability event schema."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from typing import Any

PRIORITY_CRITICAL = 0
PRIORITY_HIGH = 1
PRIORITY_NORMAL = 2
PRIORITY_DEBUG = 3


@dataclass(slots=True)
class ObservableEvent:
    """Single structured event emitted by core runtime components."""

    event_id: int
    event_type: str
    priority: int = PRIORITY_NORMAL
    ts_monotonic_ns: int = field(default_factory=time.monotonic_ns)
    ts_wall: float = field(default_factory=time.time)
    phase: str | None = None
    step: str | None = None
    power: str | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    schema_version: int = 1
