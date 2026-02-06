"""Type definitions for the 20 Questions game."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Literal


class GamePhase(Enum):
    """Current phase of the game."""
    CONTESTANT_TURN = "contestant_turn"
    AWAITING_ANSWER = "awaiting_answer"
    AWAITING_EVALUATION = "awaiting_evaluation"
    GAME_OVER = "game_over"


class Winner(Enum):
    """Who won the game."""
    CONTESTANT = "contestant"
    MODERATOR = "moderator"
    ERROR = "error"


@dataclass
class GameEvent:
    """A single event in the game history."""
    turn: int
    event_type: Literal["question", "answer", "guess", "evaluation", "error", "cannot_answer", "final"]
    agent: Literal["contestant", "moderator", "system"]
    content: str
    metadata: dict = field(default_factory=dict)

    def __str__(self) -> str:
        return f"[Turn {self.turn}] {self.agent}: {self.event_type} - {self.content}"


@dataclass
class GameState:
    """Current state of the game."""
    secret: str
    category: str
    questions_left: int = 20
    guesses_left: int = 3
    turn: int = 0
    phase: GamePhase = GamePhase.CONTESTANT_TURN
    history: list[GameEvent] = field(default_factory=list)
    winner: Winner | None = None
    pending_question: str | None = None
    pending_guess: str | None = None
    error_message: str | None = None

    def add_event(self, event_type: str, agent: str, content: str, **metadata) -> None:
        """Add an event to the history."""
        self.history.append(GameEvent(
            turn=self.turn,
            event_type=event_type,
            agent=agent,
            content=content,
            metadata=metadata,
        ))


@dataclass
class GameResult:
    """Final result of the game."""
    winner: Winner
    secret: str
    total_turns: int
    questions_used: int
    guesses_used: int
    history: list[GameEvent]
    contestant_final: str | None = None
    moderator_final: str | None = None


# Tool response types
@dataclass
class QuestionResult:
    """Result of asking a question."""
    type: Literal["answer", "unexpected_error", "question_error"]
    value: str | None = None  # "yes", "no", "true", "false" for answers
    message: str | None = None  # Error message
    questions_left: int = 0
    guesses_left: int = 0


@dataclass
class GuessResult:
    """Result of making a guess."""
    type: Literal["correct", "incorrect", "game_over"]
    guess: str = ""
    secret: str | None = None  # Only revealed on correct or game_over
    message: str = ""
    guesses_left: int = 0
