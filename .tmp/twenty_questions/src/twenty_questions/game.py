"""Game orchestrator for the 20 Questions game."""

import json
import random
from pathlib import Path
from typing import Any

from twenty_questions import display
from twenty_questions.types import (
    GameState,
    GameResult,
    GamePhase,
    Winner,
    QuestionResult,
    GuessResult,
)
from twenty_questions.agent import GameAgent, ToolCall
from twenty_questions import prompts


def load_secrets(secrets_path: Path | None = None) -> list[dict]:
    """Load secrets from JSONL file."""
    if secrets_path is None:
        secrets_path = Path(__file__).parent / "secrets.jsonl"

    secrets = []
    with open(secrets_path) as f:
        for line in f:
            if line.strip():
                secrets.append(json.loads(line))
    return secrets


def pick_random_secret(secrets: list[dict]) -> dict:
    """Pick a random secret from the list."""
    return random.choice(secrets)


class GameOrchestrator:
    """
    Manages the 20 Questions game between two RLM agents.

    Handles:
    - Turn management
    - Tool routing between agents
    - Game state updates
    - Win/loss conditions
    """

    def __init__(
        self,
        secret: str,
        category: str,
        contestant: GameAgent,
        moderator: GameAgent,
        max_retries: int = 10,
    ):
        self.state = GameState(secret=secret, category=category)
        self.contestant = contestant
        self.moderator = moderator
        self.max_retries = max_retries

        # Set up agent system prompts
        self.contestant.set_system_prompt(prompts.CONTESTANT_SYSTEM_PROMPT)
        self.moderator.set_system_prompt(
            prompts.MODERATOR_SYSTEM_PROMPT.format(
                secret=secret,
                category=category,
            )
        )

    def run(self) -> GameResult:
        """Run the game until completion."""
        display.print_game_start(self.state.secret, self.state.category)

        while self.state.phase != GamePhase.GAME_OVER:
            display.print_game_state(self.state)

            if self.state.phase == GamePhase.CONTESTANT_TURN:
                self._run_contestant_turn()
            elif self.state.phase == GamePhase.AWAITING_ANSWER:
                self._run_moderator_answer()
            elif self.state.phase == GamePhase.AWAITING_EVALUATION:
                self._run_moderator_evaluation()

        # Get final statements
        contestant_final = self._get_final_statement(self.contestant, is_contestant=True)
        moderator_final = self._get_final_statement(self.moderator, is_contestant=False)

        result = GameResult(
            winner=self.state.winner or Winner.ERROR,
            secret=self.state.secret,
            total_turns=self.state.turn,
            questions_used=self.state.questions_left,
            guesses_used=self.state.guesses_left,
            history=self.state.history,
            contestant_final=contestant_final,
            moderator_final=moderator_final,
        )

        display.print_game_over(result)
        return result

    def _run_contestant_turn(self) -> None:
        """Execute the contestant's turn."""
        self.state.turn += 1

        # Build history summary for contestant
        history_summary = prompts.build_history_summary(self.state.history)

        # Set allowed tools for contestant
        self.contestant.set_allowed_tools({"ask_question", "guess"})

        # Get contestant action
        prompt = prompts.build_contestant_turn_prompt(
            questions_left=self.state.questions_left,
            guesses_left=self.state.guesses_left,
            history_summary=history_summary,
        )

        response = self.contestant.take_turn(prompt, depth=0)

        if not response.tool_call:
            # No valid tool call - retry or error
            self._handle_no_tool_call("contestant")
            return

        tool = response.tool_call

        if tool.name == "ask_question":
            self._handle_question(tool.args.get("question", ""))
        elif tool.name == "guess":
            self._handle_guess(tool.args.get("answer", ""))
        else:
            display.print_error(f"Unexpected tool: {tool.name}")

    def _handle_question(self, question: str) -> None:
        """Handle a question from the contestant."""
        display.print_question(question, self.state.questions_left)

        # Record the question
        self.state.add_event("question", "contestant", question)
        self.state.pending_question = question

        # Transition to awaiting answer
        self.state.phase = GamePhase.AWAITING_ANSWER

    def _handle_guess(self, guess: str) -> None:
        """Handle a guess from the contestant."""
        display.print_guess(guess, self.state.guesses_left)

        # Record the guess
        self.state.add_event("guess", "contestant", guess)
        self.state.pending_guess = guess

        # Transition to awaiting evaluation
        self.state.phase = GamePhase.AWAITING_EVALUATION

    def _run_moderator_answer(self) -> None:
        """Execute the moderator's answer turn."""
        question = self.state.pending_question
        if not question:
            display.print_error("No pending question!")
            self.state.phase = GamePhase.CONTESTANT_TURN
            return

        # Set allowed tools for moderator
        self.moderator.set_allowed_tools({"answer", "cannot_answer"})

        # Build prompt for moderator
        prompt = prompts.build_moderator_answer_prompt(
            secret=self.state.secret,
            category=self.state.category,
            question=question,
            questions_left=self.state.questions_left - 1,  # After this question
            guesses_left=self.state.guesses_left,
        )

        response = self.moderator.take_turn(prompt, depth=1)

        if not response.tool_call:
            self._handle_no_tool_call("moderator")
            return

        tool = response.tool_call

        # Decrement questions regardless of answer or cannot_answer
        self.state.questions_left -= 1

        if tool.name == "answer":
            answer_value = tool.args.get("response", "").lower()
            if answer_value not in ("yes", "no", "true", "false"):
                display.print_error(f"Invalid answer: {answer_value}")
                answer_value = "error"

            display.print_answer(answer_value)
            self.state.add_event("answer", "moderator", answer_value)

            # Send result back to contestant
            result = QuestionResult(
                type="answer",
                value=answer_value,
                questions_left=self.state.questions_left,
                guesses_left=self.state.guesses_left,
            )
            self.contestant.add_tool_result(self._format_question_result(result))

        elif tool.name == "cannot_answer":
            reason = tool.args.get("reason", "Unknown reason")
            display.print_cannot_answer(reason)
            self.state.add_event("cannot_answer", "moderator", reason)

            # Send error back to contestant (question still counts)
            result = QuestionResult(
                type="question_error",
                message=reason,
                questions_left=self.state.questions_left,
                guesses_left=self.state.guesses_left,
            )
            self.contestant.add_tool_result(self._format_question_result(result))

        # Clear pending and transition back
        self.state.pending_question = None
        self.state.phase = GamePhase.CONTESTANT_TURN

        # Check if out of questions
        if self.state.questions_left <= 0 and self.state.guesses_left <= 0:
            self._end_game(Winner.MODERATOR)

    def _run_moderator_evaluation(self) -> None:
        """Execute the moderator's evaluation of a guess."""
        guess = self.state.pending_guess
        if not guess:
            display.print_error("No pending guess!")
            self.state.phase = GamePhase.CONTESTANT_TURN
            return

        # Set allowed tools for moderator
        self.moderator.set_allowed_tools({"evaluate"})

        # Build evaluation prompt
        prompt = prompts.MODERATOR_EVALUATION_PROMPT.format(
            secret=self.state.secret,
            category=self.state.category,
            guess=guess,
        )

        response = self.moderator.take_turn(prompt, depth=1)

        if not response.tool_call:
            self._handle_no_tool_call("moderator")
            return

        tool = response.tool_call

        if tool.name != "evaluate":
            display.print_error(f"Expected 'evaluate' but got '{tool.name}'")
            return

        correct = tool.args.get("correct", False)
        display.print_evaluation(correct, guess, self.state.secret)

        if correct:
            # Contestant wins!
            self.state.add_event("evaluation", "moderator", f"CORRECT - {guess} matches {self.state.secret}")

            result = GuessResult(
                type="correct",
                guess=guess,
                secret=self.state.secret,
                message="Correct! You've identified the secret!",
            )
            self.contestant.add_tool_result(self._format_guess_result(result))
            self._end_game(Winner.CONTESTANT)

        else:
            # Incorrect guess
            self.state.guesses_left -= 1
            self.state.add_event("evaluation", "moderator", f"INCORRECT - {guess} does not match {self.state.secret}")

            if self.state.guesses_left <= 0:
                # Out of guesses - moderator wins
                result = GuessResult(
                    type="game_over",
                    guess=guess,
                    secret=self.state.secret,
                    message=f"Incorrect. You've used all your guesses. The secret was: {self.state.secret}",
                    guesses_left=0,
                )
                self.contestant.add_tool_result(self._format_guess_result(result))
                self._end_game(Winner.MODERATOR)
            else:
                result = GuessResult(
                    type="incorrect",
                    guess=guess,
                    message=f"Incorrect. You have {self.state.guesses_left} guess(es) remaining.",
                    guesses_left=self.state.guesses_left,
                )
                self.contestant.add_tool_result(self._format_guess_result(result))
                self.state.phase = GamePhase.CONTESTANT_TURN

        self.state.pending_guess = None

    def _handle_no_tool_call(self, agent: str) -> None:
        """Handle case where agent didn't produce a valid tool call."""
        display.print_error(f"{agent} did not produce a valid tool call")
        self.state.add_event("error", "system", f"{agent} failed to produce valid tool call")

        # If we've had too many errors, end the game
        error_count = sum(1 for e in self.state.history if e.event_type == "error")
        if error_count >= self.max_retries:
            self.state.error_message = f"Too many errors ({error_count})"
            self._end_game(Winner.ERROR)

    def _end_game(self, winner: Winner) -> None:
        """End the game with the specified winner."""
        self.state.winner = winner
        self.state.phase = GamePhase.GAME_OVER

    def _get_final_statement(self, agent: GameAgent, is_contestant: bool) -> str | None:
        """Get final statement from an agent."""
        agent.set_allowed_tools({"final"})

        if is_contestant:
            if self.state.winner == Winner.CONTESTANT:
                outcome = f"You WON! You correctly identified the secret: {self.state.secret}"
            elif self.state.winner == Winner.MODERATOR:
                outcome = f"You lost. The secret was: {self.state.secret}"
            else:
                outcome = f"The game ended due to an error. The secret was: {self.state.secret}"

            prompt = prompts.CONTESTANT_FINAL_PROMPT.format(outcome=outcome)
        else:
            if self.state.winner == Winner.CONTESTANT:
                outcome = "The contestant correctly guessed the secret!"
            elif self.state.winner == Winner.MODERATOR:
                outcome = "The contestant failed to guess the secret. You win!"
            else:
                outcome = "The game ended due to an error."

            prompt = prompts.MODERATOR_FINAL_PROMPT.format(
                secret=self.state.secret,
                outcome=outcome,
                questions_used=20 - self.state.questions_left,
                guesses_used=3 - self.state.guesses_left,
            )

        response = agent.take_turn(prompt, depth=0)

        if response.tool_call and response.tool_call.name == "final":
            return response.tool_call.args.get("result", "")
        return None

    def _format_question_result(self, result: QuestionResult) -> str:
        """Format a QuestionResult for the contestant."""
        data = {
            "type": result.type,
            "questions_left": result.questions_left,
            "guesses_left": result.guesses_left,
        }
        if result.value:
            data["value"] = result.value
        if result.message:
            data["message"] = result.message
        return json.dumps(data, indent=2)

    def _format_guess_result(self, result: GuessResult) -> str:
        """Format a GuessResult for the contestant."""
        data = {
            "type": result.type,
            "guess": result.guess,
            "message": result.message,
            "guesses_left": result.guesses_left,
        }
        if result.secret:
            data["secret"] = result.secret
        return json.dumps(data, indent=2)
