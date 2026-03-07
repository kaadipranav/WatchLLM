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


def run_attack(target: str) -> int:
    """
    Run a mocked chaos attack against the target agent.

    Returns an integer severity score (1-5) that can be used to gate CI builds.
    """
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

    # For now, we mock a single severity score that corresponds to a
    # moderately severe failure scenario (4/5).
    severity = 4
    print(f"Agent Safety Score: 58 / 100 (severity: {severity})")

    return severity


def parse_fail_on(expr: str) -> int:
    """
    Parse a --fail-on expression of the form 'severity>=4' and
    return the numeric threshold (e.g., 4).
    """
    text = expr.strip().replace(" ", "")
    prefix = "severity>="
    if not text.startswith(prefix):
        raise ValueError(
            "Invalid --fail-on expression. Expected format: severity>=NUMBER"
        )
    value_str = text[len(prefix) :]
    if not value_str.isdigit():
        raise ValueError(
            "Invalid --fail-on expression. Expected integer after '>='."
        )
    return int(value_str)


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

    test_parser = subparsers.add_parser(
        "test",
        help="Run a chaos test suitable for CI/CD (exits non-zero on high severity)",
    )
    test_parser.add_argument(
        "target",
        metavar="AGENT_PATH",
        help="Path to the agent Python file (e.g. my_agent.py)",
    )
    test_parser.add_argument(
        "--fail-on",
        dest="fail_on",
        default="severity>=4",
        help="Failure threshold expression, e.g. 'severity>=4'. "
        "If the observed severity meets or exceeds this value, the command exits with status 1.",
    )

    return parser


def main(argv: Optional[Iterable[str]] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.command == "attack":
        run_attack(args.target)
        return

    if args.command == "test":
        severity = run_attack(args.target)
        try:
            threshold = parse_fail_on(args.fail_on)
        except ValueError as exc:
            print(str(exc), file=sys.stderr)
            sys.exit(2)

        if severity >= threshold:
            print(
                f"WatchLLM test: severity {severity} >= threshold {threshold}. "
                "Failing the build."
            )
            sys.exit(1)

        print(
            f"WatchLLM test: severity {severity} < threshold {threshold}. "
            "Build may proceed."
        )
        return

    parser.error("Unknown command")


if __name__ == "__main__":
    main()


