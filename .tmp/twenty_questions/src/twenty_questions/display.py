"""Rich display and logging for the 20 Questions game."""

from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text
from rich.live import Live
from rich.layout import Layout
from rich.style import Style

from twenty_questions.types import GameState, GameEvent, GameResult, Winner, GamePhase

console = Console()

# Color scheme
COLORS = {
    "contestant": "cyan",
    "moderator": "magenta",
    "system": "yellow",
    "success": "green",
    "error": "red",
    "warning": "orange1",
    "info": "blue",
    "secret": "red bold",
    "question": "cyan",
    "answer": "magenta",
    "guess": "green bold",
}


def print_game_start(secret: str, category: str) -> None:
    """Print game start banner."""
    console.print()
    console.print(Panel(
        Text.assemble(
            ("20 QUESTIONS\n", "bold white"),
            ("Two RLM Agents Battle It Out!", "italic"),
        ),
        title="[bold yellow]GAME START[/]",
        border_style="yellow",
    ))
    console.print()
    console.print(f"[dim]Category:[/] [bold]{category}[/]")
    console.print(f"[dim]The secret is:[/] [bold red]{secret}[/]")
    console.print()


def print_game_state(state: GameState) -> None:
    """Print current game state as a status bar."""
    table = Table(show_header=False, box=None, padding=(0, 2))
    table.add_column(style="bold")
    table.add_column()

    questions_color = "green" if state.questions_left > 5 else "yellow" if state.questions_left > 0 else "red"
    guesses_color = "green" if state.guesses_left > 1 else "yellow" if state.guesses_left > 0 else "red"

    table.add_row(
        "Turn",
        f"[bold]{state.turn}[/]",
    )
    table.add_row(
        "Questions Left",
        f"[{questions_color}]{state.questions_left}/20[/]",
    )
    table.add_row(
        "Guesses Left",
        f"[{guesses_color}]{state.guesses_left}/3[/]",
    )
    table.add_row(
        "Phase",
        f"[dim]{state.phase.value}[/]",
    )

    console.print(Panel(table, title="[bold]Game State[/]", border_style="blue"))


def _get_depth_prefix(depth: int) -> str:
    """Get ASCII prefix for a given depth level."""
    if depth == 0:
        return ""
    else:
        return "│   " * (depth - 1) + "├── "


def _get_depth_line(depth: int) -> str:
    """Get ASCII line continuation for a given depth level."""
    if depth == 0:
        return ""
    else:
        return "│   " * depth


def print_agent_turn(agent: str, depth: int = 0) -> None:
    """Print agent turn header with ASCII depth visualization."""
    color = COLORS.get(agent, "white")

    console.print()

    if depth == 0:
        # Root level - use box drawing
        console.print(f"[bold {color}]╔{'═'*50}╗[/]")
        console.print(f"[bold {color}]║  {agent.upper()}'s TURN {' '*(36-len(agent))}║[/]")
        console.print(f"[bold {color}]║  {'depth=0':<44} ║[/]")
        console.print(f"[bold {color}]╚{'═'*50}╝[/]")
    else:
        # Nested level - use tree drawing
        prefix = _get_depth_prefix(depth)
        line = _get_depth_line(depth)
        console.print(f"[dim]{line}[/]")
        console.print(f"[dim]{prefix}[/][bold {color}]┬{'─'*40}┐[/]")
        console.print(f"[dim]{line}[/][bold {color}]│ {agent.upper()}'s TURN {' '*(28-len(agent))}│[/]")
        console.print(f"[dim]{line}[/][bold {color}]│ depth={depth:<33}│[/]")
        console.print(f"[dim]{line}[/][bold {color}]┴{'─'*40}┘[/]")


def print_thinking(agent: str, message: str, depth: int = 0) -> None:
    """Print agent thinking/reasoning."""
    color = COLORS.get(agent, "white")
    line = _get_depth_line(depth)
    prefix = f"[dim]{line}[/]" if depth > 0 else ""
    console.print(f"{prefix}[dim {color}]Thinking: {message[:100]}{'...' if len(message) > 100 else ''}[/]")


def print_tool_call(agent: str, tool: str, args: str, depth: int = 0) -> None:
    """Print a tool call."""
    color = COLORS.get(agent, "white")
    line = _get_depth_line(depth)
    prefix = f"[dim]{line}[/]" if depth > 0 else ""
    console.print(f"{prefix}[{color}]{agent}[/] ─► [bold yellow]{tool}[/]([cyan]{args}[/])")


def print_tool_result(result: str, depth: int = 0) -> None:
    """Print tool result."""
    line = _get_depth_line(depth)
    prefix = f"[dim]{line}[/]" if depth > 0 else ""
    # Truncate long results
    display_result = result if len(result) <= 200 else result[:200] + "..."
    console.print(f"{prefix}[dim]Result:[/] {display_result}")


def print_question(question: str, question_num: int) -> None:
    """Print a question from the contestant."""
    console.print()
    console.print(Panel(
        f"[cyan]{question}[/]",
        title=f"[bold cyan]Question #{21 - question_num}[/]",
        border_style="cyan",
    ))


def print_answer(answer: str, from_moderator: bool = True) -> None:
    """Print an answer from the moderator."""
    color = "magenta" if from_moderator else "yellow"
    answer_upper = answer.upper()
    console.print(f"[bold {color}]Answer: {answer_upper}[/]")


def print_cannot_answer(reason: str) -> None:
    """Print when moderator cannot answer."""
    console.print(Panel(
        f"[yellow]{reason}[/]",
        title="[bold yellow]Cannot Answer[/]",
        border_style="yellow",
    ))


def print_guess(guess: str, guess_num: int) -> None:
    """Print a guess from the contestant."""
    console.print()
    console.print(Panel(
        f"[green bold]{guess}[/]",
        title=f"[bold green]GUESS #{4 - guess_num}[/]",
        border_style="green",
    ))


def print_evaluation(correct: bool, guess: str, secret: str) -> None:
    """Print guess evaluation result."""
    if correct:
        console.print(Panel(
            Text.assemble(
                ("CORRECT!\n", "bold green"),
                (f'The secret was indeed "{secret}"', "green"),
            ),
            border_style="green",
        ))
    else:
        console.print(Panel(
            Text.assemble(
                ("INCORRECT\n", "bold red"),
                (f'"{guess}" is not the secret', "red"),
            ),
            border_style="red",
        ))


def print_error(message: str, depth: int = 0) -> None:
    """Print an error message."""
    line = _get_depth_line(depth)
    prefix = f"[dim]{line}[/]" if depth > 0 else ""
    console.print(f"{prefix}[bold red]ERROR:[/] [red]{message}[/]")


def print_retry(attempt: int, max_attempts: int) -> None:
    """Print retry message."""
    console.print(f"[yellow]Retrying... (attempt {attempt}/{max_attempts})[/]")


def print_game_over(result: GameResult) -> None:
    """Print game over summary."""
    console.print()

    if result.winner == Winner.CONTESTANT:
        title = "[bold green]CONTESTANT WINS![/]"
        border = "green"
        emoji = ""
    elif result.winner == Winner.MODERATOR:
        title = "[bold magenta]MODERATOR WINS![/]"
        border = "magenta"
        emoji = ""
    else:
        title = "[bold red]GAME ENDED IN ERROR[/]"
        border = "red"
        emoji = ""

    # Build summary
    lines = [
        f"{emoji}",
        "",
        f"[bold]Secret:[/] {result.secret}",
        f"[bold]Total Turns:[/] {result.total_turns}",
        f"[bold]Questions Used:[/] {20 - result.questions_used}/20",
        f"[bold]Guesses Used:[/] {3 - result.guesses_used}/3",
    ]

    if result.contestant_final:
        lines.append("")
        lines.append(f"[cyan]Contestant's Final:[/] {result.contestant_final}")

    if result.moderator_final:
        lines.append(f"[magenta]Moderator's Final:[/] {result.moderator_final}")

    console.print(Panel(
        "\n".join(lines),
        title=title,
        border_style=border,
    ))


def print_history_event(event: GameEvent) -> None:
    """Print a single history event."""
    color = COLORS.get(event.agent, "white")
    type_color = {
        "question": "cyan",
        "answer": "magenta",
        "guess": "green",
        "evaluation": "yellow",
        "error": "red",
        "cannot_answer": "orange1",
        "final": "bold white",
    }.get(event.event_type, "white")

    console.print(f"[dim]Turn {event.turn}[/] [{color}]{event.agent}[/] [{type_color}]{event.event_type}[/]: {event.content}")


def print_llm_call(model: str, depth: int, tokens_in: int = 0, tokens_out: int = 0) -> None:
    """Print LLM API call info."""
    line = _get_depth_line(depth)
    prefix = f"[dim]{line}[/]" if depth > 0 else ""
    console.print(f"{prefix}[dim]LLM Call: model={model} depth={depth} tokens_in={tokens_in} tokens_out={tokens_out}[/]")


def print_separator() -> None:
    """Print a visual separator."""
    console.print("[dim]" + "-" * 60 + "[/]")
