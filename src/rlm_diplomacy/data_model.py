"""Shared data model for the Diplomacy RLM harness."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

PowerName = Literal[
    "AUSTRIA",
    "ENGLAND",
    "FRANCE",
    "GERMANY",
    "ITALY",
    "RUSSIA",
    "TURKEY",
]

ALL_POWERS: list[PowerName] = [
    "AUSTRIA",
    "ENGLAND",
    "FRANCE",
    "GERMANY",
    "ITALY",
    "RUSSIA",
    "TURKEY",
]


@dataclass(slots=True)
class ConversationRequest:
    """Parsed from a SPAWN_CONVERSATION sentinel. One per power per phase."""

    power: PowerName
    objectives: dict[str, str]


@dataclass(slots=True)
class ConversationSummary:
    """Return value from a completed conversation agent."""

    power: PowerName
    targets: list[PowerName]
    summary: str
    rounds_used: int


@dataclass(slots=True)
class PendingMessage:
    """A message queued in an outbox, not yet flushed to the game."""

    sender: PowerName
    recipient: PowerName | Literal["GLOBAL"]
    content: str
    phase: str


class GameHaltError(Exception):
    """Raised when completion fails after exhausting retries."""


@dataclass(slots=True)
class GameConfig:
    """Full game configuration."""

    # Model settings
    backend: str = "anthropic"
    backend_kwargs: dict = field(
        default_factory=lambda: {"model_name": "claude-sonnet-4-5-20250929"}
    )
    sub_backend: str | None = None
    sub_backend_kwargs: dict | None = None

    # Timeouts
    strategize_timeout: float = 120.0
    converse_timeout: float = 180.0
    decide_timeout: float = 120.0
    converse_max_rounds: int = 5
    target_response_timeout: float = 60.0

    # Game settings
    max_year: int = 1910
    game_dir: str = "./game_output"

    # RLM settings
    max_iterations: int = 15
    max_retries: int = 10

    # Output
    verbose: bool = False

    # Security
    blocked_modules: tuple[str, ...] | None = None
