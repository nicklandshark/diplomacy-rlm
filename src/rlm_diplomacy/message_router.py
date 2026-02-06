"""Thread-safe message outbox routing between conversation agents."""

from __future__ import annotations

import threading
from collections import defaultdict
from typing import Any

from rlm_diplomacy._vendor.diplomacy import Game, Message
from rlm_diplomacy._vendor.diplomacy.engine.message import GLOBAL

from .data_model import ALL_POWERS, PendingMessage


class MessageRouter:
    """Queue/flush message router implementing round-based synchronization."""

    def __init__(self, game: Game):
        self._game = game
        self._lock = threading.Lock()
        self._outboxes: dict[str, list[PendingMessage]] = {power: [] for power in ALL_POWERS}

    def queue_message(self, message: PendingMessage) -> None:
        if message.sender not in ALL_POWERS:
            raise ValueError(f"Unknown sender: {message.sender}")
        with self._lock:
            self._outboxes[message.sender].append(message)

    def flush(self) -> list[PendingMessage]:
        with self._lock:
            flushed: list[PendingMessage] = []
            for power in ALL_POWERS:
                for pending in self._outboxes[power]:
                    msg = Message(
                        sender=pending.sender,
                        recipient=pending.recipient,
                        phase=pending.phase,
                        message=pending.content,
                    )
                    self._game.add_message(msg)
                    flushed.append(pending)
                self._outboxes[power] = []
            return flushed

    def get_unread(self, involved_powers: set[str]) -> list[dict[str, Any]]:
        """Get current-phase messages relevant to powers not in active conversations."""
        unread: list[dict[str, Any]] = []
        for msg in self._game.messages.values():
            if msg.recipient == GLOBAL:
                # GLOBAL messages are relevant to powers not currently in conversations.
                if len(set(ALL_POWERS) - involved_powers) > 0:
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
        for power in ALL_POWERS:
            flattened.extend(ordered.get(power, []))
        return flattened
