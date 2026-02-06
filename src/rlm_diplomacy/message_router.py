"""Thread-safe message outbox routing between conversation agents."""

from __future__ import annotations

import threading
from collections import defaultdict
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game, Message
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL

from .data_model import ALL_POWERS, PendingMessage, normalize_powers
from .observability import EventEmitter, NoopEmitter


class MessageRouter:
    """Queue/flush message router implementing round-based synchronization."""

    def __init__(
        self,
        game: Game,
        powers: list[str] | None = None,
        event_emitter: EventEmitter | None = None,
        capture_message_content: bool = False,
    ):
        self._game = game
        self._lock = threading.Lock()
        configured = powers or ALL_POWERS
        self._powers = normalize_powers(list(configured))
        self._power_set = set(self._powers)
        self._outboxes: dict[str, list[PendingMessage]] = {power: [] for power in self._powers}
        self._events = event_emitter or NoopEmitter()
        self._capture_message_content = capture_message_content

    def queue_message(self, message: PendingMessage) -> None:
        if message.sender not in self._power_set:
            raise ValueError(f"Unknown sender: {message.sender}")
        with self._lock:
            self._outboxes[message.sender].append(message)
        payload: dict[str, Any] = {
            "sender": message.sender,
            "recipient": message.recipient,
            "phase": message.phase,
            "summary": f"{message.sender}->{message.recipient}",
        }
        if self._capture_message_content:
            payload["content"] = message.content
        self._events.emit(
            "message.queued",
            power=message.sender,
            phase=message.phase,
            payload=payload,
        )

    def flush(self) -> list[PendingMessage]:
        with self._lock:
            flushed: list[PendingMessage] = []
            for power in self._powers:
                for pending in self._outboxes[power]:
                    msg = Message(
                        sender=pending.sender,
                        recipient=pending.recipient,
                        phase=pending.phase,
                        message=pending.content,
                    )
                    self._game.add_message(msg)
                    flushed.append(pending)
                    payload: dict[str, Any] = {
                        "sender": pending.sender,
                        "recipient": pending.recipient,
                        "phase": pending.phase,
                        "summary": f"{pending.sender}->{pending.recipient}",
                    }
                    if self._capture_message_content:
                        payload["content"] = pending.content
                    self._events.emit(
                        "message.flushed",
                        power=pending.sender,
                        phase=pending.phase,
                        payload=payload,
                    )
                self._outboxes[power] = []
            return flushed

    def get_unread(self, involved_powers: set[str]) -> list[dict[str, Any]]:
        """Get current-phase messages relevant to powers not in active conversations."""
        unread: list[dict[str, Any]] = []
        for msg in self._game.messages.values():
            if msg.recipient == GLOBAL:
                # GLOBAL messages are relevant to powers not currently in conversations.
                if len(set(self._powers) - involved_powers) > 0:
                    unread.append(
                        {
                            "sender": msg.sender,
                            "recipient": GLOBAL,
                            "content": msg.message,
                            "phase": msg.phase,
                        }
                    )
                continue

            if msg.recipient not in involved_powers:
                unread.append(
                    {
                        "sender": msg.sender,
                        "recipient": msg.recipient,
                        "content": msg.message,
                        "phase": msg.phase,
                    }
                )

        # Stable ordering: sender order then message insertion order.
        ordered: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for row in unread:
            ordered[row["sender"]].append(row)
        flattened: list[dict[str, Any]] = []
        for power in self._powers:
            flattened.extend(ordered.get(power, []))
            ordered.pop(power, None)
        for sender in sorted(ordered):
            flattened.extend(ordered[sender])
        return flattened
