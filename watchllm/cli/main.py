from __future__ import annotations

import argparse
import importlib.util
import sys
from pathlib import Path
from types import ModuleType
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


def load_agent_module(path_str: str) -> ModuleType:
    path = Path(path_str).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Agent file not found: {path}")

    # Ensure the monorepo root (containing the local `watchllm` package) is
    # at the front of sys.path so `from watchllm import chaos` resolves to
    # this project instead of any globally-installed package.
    monorepo_root = path.parent.parent
    if monorepo_root.is_dir():
        root_str = str(monorepo_root)
        if root_str not in sys.path:
            sys.path.insert(0, root_str)

    spec = importlib.util.spec_from_file_location("watchllm_target_agent", path)
    if spec is None or spec.loader is None:
        raise ImportError(f"Could not load module from {path}")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def run_attack(target: str) -> None:
    # Load the target agent module and call its `my_agent` function with a mock attacker prompt.
    module = load_agent_module(target)
    agent = getattr(module, "my_agent", None)
    if not callable(agent):
        raise AttributeError("Target module does not define a callable 'my_agent'")

    attacker_prompt = "This is a mock attacker prompt."

    print("Running 50 adversarial attacks...")
    print(f"Attacker prompt: {attacker_prompt}")
    response = agent(attacker_prompt)
    print(f"Agent response: {response}")

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


