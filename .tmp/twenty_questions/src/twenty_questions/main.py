"""Main entry point for the 20 Questions game."""

import os
import sys
import argparse

from twenty_questions.game import GameOrchestrator, load_secrets, pick_random_secret
from twenty_questions.agent import GameAgent
from twenty_questions import display


def main() -> int:
    """Run the 20 Questions game."""
    parser = argparse.ArgumentParser(
        description="20 Questions game between two Claude RLM agents"
    )
    parser.add_argument(
        "--secret",
        type=str,
        help="Specific secret to use (otherwise random)",
    )
    parser.add_argument(
        "--model",
        type=str,
        default="claude-sonnet-4-5-20250929",
        help="Claude model to use (default: claude-sonnet-4-5-20250929)",
    )
    parser.add_argument(
        "--api-key",
        type=str,
        default=os.environ.get("ANTHROPIC_API_KEY"),
        help="Anthropic API key (default: ANTHROPIC_API_KEY env var)",
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=10,
        help="Max retries for malformed agent output (default: 10)",
    )
    parser.add_argument(
        "--list-secrets",
        action="store_true",
        help="List available secrets and exit",
    )

    args = parser.parse_args()

    # Load secrets
    secrets = load_secrets()

    if args.list_secrets:
        display.console.print("[bold]Available Secrets:[/]")
        for i, s in enumerate(secrets, 1):
            display.console.print(f"  {i}. [cyan]{s['secret']}[/] ({s['category']})")
        return 0

    # Validate API key
    if not args.api_key:
        display.console.print("[bold red]Error:[/] No API key provided.")
        display.console.print("Set ANTHROPIC_API_KEY environment variable or use --api-key")
        return 1

    # Pick secret
    if args.secret:
        # Find matching secret
        matching = [s for s in secrets if s["secret"].lower() == args.secret.lower()]
        if matching:
            secret_data = matching[0]
        else:
            display.console.print(f"[yellow]Warning:[/] Secret '{args.secret}' not in list, using as-is")
            secret_data = {"secret": args.secret, "category": "custom"}
    else:
        secret_data = pick_random_secret(secrets)

    secret = secret_data["secret"]
    category = secret_data["category"]

    display.console.print(f"[dim]Using model:[/] {args.model}")
    display.console.print(f"[dim]Max retries:[/] {args.max_retries}")

    # Create agents
    contestant = GameAgent(
        role="contestant",
        model=args.model,
        api_key=args.api_key,
        max_retries=args.max_retries,
    )

    moderator = GameAgent(
        role="moderator",
        model=args.model,
        api_key=args.api_key,
        max_retries=args.max_retries,
    )

    # Create and run game
    game = GameOrchestrator(
        secret=secret,
        category=category,
        contestant=contestant,
        moderator=moderator,
        max_retries=args.max_retries,
    )

    try:
        result = game.run()
        return 0 if result.winner.value != "error" else 1
    except KeyboardInterrupt:
        display.console.print("\n[yellow]Game interrupted by user[/]")
        return 130
    except Exception as e:
        display.console.print(f"[bold red]Error:[/] {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
