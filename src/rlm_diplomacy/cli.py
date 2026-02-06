"""CLI entry point for running Diplomacy-RLM games."""

from __future__ import annotations

import argparse
import logging

from .data_model import GameConfig
from .orchestrator import Orchestrator


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Diplomacy-RLM orchestrator")
    parser.add_argument("--game-dir", default="./game_output")
    parser.add_argument("--max-year", type=int, default=1910)
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    logging.basicConfig(level=logging.WARNING)
    if args.verbose:
        logging.getLogger("rlm_diplomacy").setLevel(logging.INFO)

    config = GameConfig(game_dir=args.game_dir, max_year=args.max_year, verbose=args.verbose)
    orchestrator = Orchestrator(config)
    orchestrator.run()


if __name__ == "__main__":
    main()
