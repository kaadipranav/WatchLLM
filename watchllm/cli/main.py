from __future__ import annotations

import argparse
from typing import Iterable, Optional


RESET = "\033[0m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"


def color_status(status: str) -> str:
    mapping = {
        "SAFE": GREEN,
        "WARNING": YELLOW,
        "FAILED": RED,
    }
    color = mapping.get(status.upper(), RESET)
    return f"{color}{status}{RESET}"


def run_attack(target: str) -> None:
    # For now this is a fully mocked simulation, matching the strategy example.
    print("Running 50 adversarial attacks...")
    print(f"Prompt Injection: {color_status('FAILED')}")
    print(f"Goal Hijacking: {color_status('SAFE')}")
    print(f"Tool Abuse: {color_status('FAILED')}")
    print("Agent Safety Score: 58 / 100")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="watchllm", description="WatchLLM CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    attack_parser = subparsers.add_parser(
        "attack", help="Run a mocked chaos attack against an agent"
    )
    attack_parser.add_argument(
        "target",
        metavar="AGENT_PATH",
        help="Path to the agent Python file (e.g. my_agent.py)",
    )

    return parser


def main(argv: Optional[Iterable[str]] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.command == "attack":
        run_attack(args.target)
    else:
        parser.error("Unknown command")


if __name__ == "__main__":
    main()

