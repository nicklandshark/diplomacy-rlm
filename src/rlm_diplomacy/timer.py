"""Phase timer utilities."""

from __future__ import annotations

import time
from typing import Callable


class PhaseTimer:
    """Monotonic wall-clock timer for a game step."""

    def __init__(self, timeout_seconds: float):
        self._start = time.monotonic()
        self._deadline = self._start + max(0.0, timeout_seconds)

    @property
    def expired(self) -> bool:
        return time.monotonic() >= self._deadline

    def remaining(self) -> float:
        return max(0.0, self._deadline - time.monotonic())

    def remaining_fn(self) -> Callable[[], float]:
        return self.remaining
