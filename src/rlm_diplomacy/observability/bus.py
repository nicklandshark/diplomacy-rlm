"""Thread-safe observability event emitters."""

from __future__ import annotations

import threading
from collections import deque
from dataclasses import dataclass
from typing import Any

from .events import (
    PRIORITY_CRITICAL,
    PRIORITY_DEBUG,
    PRIORITY_HIGH,
    PRIORITY_NORMAL,
    ObservableEvent,
)


class EventEmitter:
    """Minimal event-emission interface."""

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
        raise NotImplementedError

    def close(self) -> None:
        """Close emitter resources."""


class NoopEmitter(EventEmitter):
    """Emitter that discards all events."""

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
        _ = (event_type, priority, phase, step, power, payload)

    def close(self) -> None:
        return


@dataclass(slots=True)
class DropStats:
    """Drop counters for overloaded event queues."""

    total: int = 0
    debug: int = 0
    normal: int = 0
    high: int = 0


class RecorderEmitter(EventEmitter):
    """In-memory emitter used for tests."""

    def __init__(self):
        self._events: list[ObservableEvent] = []
        self._lock = threading.Lock()
        self._next_id = 1

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
        with self._lock:
            event = ObservableEvent(
                event_id=self._next_id,
                event_type=event_type,
                priority=priority,
                phase=phase,
                step=step,
                power=power,
                payload=payload or {},
            )
            self._next_id += 1
            self._events.append(event)

    def events(self) -> list[ObservableEvent]:
        with self._lock:
            return list(self._events)

    def close(self) -> None:
        return


class BufferedEventBus(EventEmitter):
    """Non-blocking bounded event bus with priority-aware dropping."""

    def __init__(self, max_events: int = 4000):
        self._max_events = max(1, int(max_events))
        self._events: deque[ObservableEvent] = deque()
        self._lock = threading.Lock()
        self._new_event = threading.Event()
        self._closed = False
        self._next_id = 1
        self._drops = DropStats()

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
        event = ObservableEvent(
            event_id=0,
            event_type=event_type,
            priority=priority,
            phase=phase,
            step=step,
            power=power,
            payload=payload or {},
        )
        with self._lock:
            if self._closed:
                return
            event.event_id = self._next_id
            self._next_id += 1

            if len(self._events) >= self._max_events and not self._make_room(priority):
                self._record_drop(priority)
                return

            self._events.append(event)
            self._new_event.set()

    def _make_room(self, incoming_priority: int) -> bool:
        if incoming_priority <= PRIORITY_HIGH:
            victim_idx = self._find_lowest_priority_victim(min_priority=incoming_priority + 1)
            if victim_idx is None:
                return False
            victim = self._events[victim_idx]
            del self._events[victim_idx]
            self._record_drop(victim.priority)
            return True

        if incoming_priority == PRIORITY_NORMAL:
            victim_idx = self._find_lowest_priority_victim(min_priority=PRIORITY_DEBUG)
            if victim_idx is None:
                return False
            victim = self._events[victim_idx]
            del self._events[victim_idx]
            self._record_drop(victim.priority)
            return True

        return False

    def _find_lowest_priority_victim(self, min_priority: int) -> int | None:
        best_idx: int | None = None
        best_priority = -1
        for idx, event in enumerate(self._events):
            if event.priority >= min_priority:
                if best_idx is None or event.priority > best_priority:
                    best_idx = idx
                    best_priority = event.priority
        return best_idx

    def _record_drop(self, priority: int) -> None:
        self._drops.total += 1
        if priority >= PRIORITY_DEBUG:
            self._drops.debug += 1
        elif priority >= PRIORITY_NORMAL:
            self._drops.normal += 1
        else:
            self._drops.high += 1

    def poll(self, max_items: int = 200) -> list[ObservableEvent]:
        items = max(1, int(max_items))
        with self._lock:
            out: list[ObservableEvent] = []
            for _ in range(min(items, len(self._events))):
                out.append(self._events.popleft())
            if not self._events:
                self._new_event.clear()
            return out

    def wait_for_event(self, timeout: float = 0.1) -> bool:
        return self._new_event.wait(timeout=max(0.0, timeout))

    def size(self) -> int:
        with self._lock:
            return len(self._events)

    def drop_stats(self) -> DropStats:
        with self._lock:
            return DropStats(
                total=self._drops.total,
                debug=self._drops.debug,
                normal=self._drops.normal,
                high=self._drops.high,
            )

    def close(self) -> None:
        with self._lock:
            self._closed = True
            self._new_event.set()
