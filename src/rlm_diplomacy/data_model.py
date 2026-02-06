"""Shared data model for the Diplomacy RLM harness."""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Literal

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

SUPPORTED_BACKENDS: tuple[str, ...] = (
    "openai",
    "portkey",
    "openrouter",
    "vercel",
    "vllm",
    "litellm",
    "anthropic",
    "azure_openai",
    "gemini",
)

SUPPORTED_ENVIRONMENTS: tuple[str, ...] = (
    "local",
    "modal",
)


def normalize_power_name(power: str) -> str:
    return str(power).strip().upper()


def normalize_powers(powers: list[str]) -> list[str]:
    seen: set[str] = set()
    normalized: list[str] = []
    for raw in powers:
        power = normalize_power_name(raw)
        if not power:
            continue
        if power not in ALL_POWERS:
            raise ValueError(f"Unknown power: {power}")
        if power in seen:
            continue
        seen.add(power)
        normalized.append(power)
    return normalized


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
        default_factory=lambda: {
            "model_name": "claude-opus-4-6",
            "api_key": os.environ.get("ANTHROPIC_API_KEY", ""),
        }
    )
    sub_backend: str | None = None
    sub_backend_kwargs: dict | None = None
    power_model_overrides: dict[str, str] = field(default_factory=dict)
    power_backend_overrides: dict[str, str] = field(default_factory=dict)
    backend_kwargs_by_backend: dict[str, dict[str, Any]] = field(default_factory=dict)
    power_backend_kwargs_overrides: dict[str, dict[str, Any]] = field(default_factory=dict)

    # Timeouts
    strategize_timeout: float = 300.0
    converse_timeout: float = 360.0
    decide_timeout: float = 300.0
    converse_max_rounds: int = 5
    target_response_timeout: float = 60.0

    # Game settings
    max_year: int = 1910
    game_dir: str = "./game_output"
    powers: list[str] = field(default_factory=lambda: list(ALL_POWERS))

    # RLM settings
    max_iterations: int = 15
    max_retries: int = 10
    environment: str = "local"
    environment_kwargs: dict[str, Any] = field(default_factory=dict)

    # Output
    verbose: bool = False
    observe_prompts: bool = False
    observe_repl: bool = False
    observe_messages: bool = False
    observe_memory_diffs: bool = False

    # Security
    blocked_modules: tuple[str, ...] | None = None

    def __post_init__(self) -> None:
        self.backend = str(self.backend).strip().lower()
        if self.backend not in SUPPORTED_BACKENDS:
            raise ValueError(
                f"Unknown backend: {self.backend}. Supported backends: {', '.join(SUPPORTED_BACKENDS)}"
            )
        if self.sub_backend is not None:
            self.sub_backend = str(self.sub_backend).strip().lower()
            if not self.sub_backend:
                self.sub_backend = None
            elif self.sub_backend not in SUPPORTED_BACKENDS:
                raise ValueError(
                    "Unknown sub-backend: "
                    f"{self.sub_backend}. Supported backends: {', '.join(SUPPORTED_BACKENDS)}"
                )
        self.backend_kwargs = dict(self.backend_kwargs)
        if self.sub_backend_kwargs is not None:
            self.sub_backend_kwargs = dict(self.sub_backend_kwargs)

        self.environment = str(self.environment).strip().lower()
        if self.environment not in SUPPORTED_ENVIRONMENTS:
            raise ValueError(
                "Unknown environment: "
                f"{self.environment}. Supported environments: {', '.join(SUPPORTED_ENVIRONMENTS)}"
            )
        self.environment_kwargs = dict(self.environment_kwargs)

        self.powers = normalize_powers(self.powers)
        if len(self.powers) < 2:
            raise ValueError("At least two powers are required.")

        selected = set(self.powers)
        normalized_model_overrides: dict[str, str] = {}
        normalized_backend_overrides: dict[str, str] = {}
        normalized_backend_kwargs_by_backend: dict[str, dict[str, Any]] = {}
        normalized_power_backend_kwargs: dict[str, dict[str, Any]] = {}

        for raw_backend, raw_kwargs in self.backend_kwargs_by_backend.items():
            backend = str(raw_backend).strip().lower()
            if backend not in SUPPORTED_BACKENDS:
                raise ValueError(
                    "Unknown backend kwargs override for backend "
                    f"{backend}. Supported backends: {', '.join(SUPPORTED_BACKENDS)}"
                )
            if not isinstance(raw_kwargs, dict):
                raise ValueError(
                    f"Backend kwargs override for {backend} must be a dict."
                )
            normalized_backend_kwargs_by_backend[backend] = dict(raw_kwargs)

        for raw_power, raw_backend in self.power_backend_overrides.items():
            power = normalize_power_name(raw_power)
            if power not in selected:
                raise ValueError(
                    f"Power backend override specified for {power}, which is not in configured powers."
                )
            backend = str(raw_backend).strip().lower()
            if backend not in SUPPORTED_BACKENDS:
                raise ValueError(
                    "Unknown power backend override for "
                    f"{power}: {backend}. Supported backends: {', '.join(SUPPORTED_BACKENDS)}"
                )
            normalized_backend_overrides[power] = backend

        for raw_power, raw_kwargs in self.power_backend_kwargs_overrides.items():
            power = normalize_power_name(raw_power)
            if power not in selected:
                raise ValueError(
                    "Power backend kwargs override specified for "
                    f"{power}, which is not in configured powers."
                )
            if not isinstance(raw_kwargs, dict):
                raise ValueError(
                    f"Power backend kwargs override for {power} must be a dict."
                )
            normalized_power_backend_kwargs[power] = dict(raw_kwargs)

        for raw_power, raw_model in self.power_model_overrides.items():
            power = normalize_power_name(raw_power)
            if power not in selected:
                raise ValueError(
                    f"Power model override specified for {power}, which is not in configured powers."
                )
            model = str(raw_model).strip()
            if not model:
                raise ValueError(f"Model override for {power} must be non-empty.")
            normalized_model_overrides[power] = model
        self.power_model_overrides = normalized_model_overrides
        self.power_backend_overrides = normalized_backend_overrides
        self.backend_kwargs_by_backend = normalized_backend_kwargs_by_backend
        self.power_backend_kwargs_overrides = normalized_power_backend_kwargs

    def backend_for(self, power: str) -> str:
        normalized = normalize_power_name(power)
        return self.power_backend_overrides.get(normalized, self.backend)

    def backend_kwargs_for(self, power: str) -> dict:
        normalized = normalize_power_name(power)
        backend = self.backend_for(normalized)
        kwargs: dict[str, Any] = {}
        if backend == self.backend:
            kwargs.update(self.backend_kwargs)
        kwargs.update(self.backend_kwargs_by_backend.get(backend, {}))
        kwargs.update(self.power_backend_kwargs_overrides.get(normalized, {}))
        model_override = self.power_model_overrides.get(normalized)
        if model_override:
            kwargs["model_name"] = model_override
        return kwargs
