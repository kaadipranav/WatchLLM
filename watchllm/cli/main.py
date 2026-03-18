from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Optional

import httpx


RESET = "\033[0m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"

DEFAULT_CATEGORIES = [
    "prompt_injection",
    "goal_hijacking",
    "memory_poisoning",
    "tool_abuse",
    "boundary_testing",
    "jailbreak_variants",
]


def color_status(status: str) -> str:
    mapping = {
        "SAFE": GREEN,
        "WARNING": YELLOW,
        "FAILED": RED,
    }
    color = mapping.get(status.upper(), RESET)
    return f"{color}{status}{RESET}"


def _load_watchllm_config() -> dict[str, str]:
    config_path = Path.home() / ".watchllm" / "config"
    if not config_path.is_file():
        return {}

    values: dict[str, str] = {}
    for raw_line in config_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip()
        if key and value:
            values[key] = value
    return values


def _resolve_setting(name: str, config: dict[str, str]) -> str | None:
    env_value = os.getenv(name)
    if env_value:
        return env_value
    return config.get(name)


def _require_non_empty(value: str | None, help_message: str) -> str:
    if value and value.strip():
        return value.strip()
    print(help_message, file=sys.stderr)
    sys.exit(2)


def _resolve_cli_auth_values() -> tuple[str, str, str]:
    config = _load_watchllm_config()

    api_key = _resolve_setting("WATCHLLM_API_KEY", config)
    api_base = _resolve_setting("NEXT_PUBLIC_APP_URL", config)
    sdk_key = _resolve_setting("WATCHLLM_SDK_KEY", config)

    api_key = _require_non_empty(
        api_key,
        "Missing WATCHLLM_API_KEY. Set it in env or ~/.watchllm/config. "
        "Use a WatchLLM API key from the dashboard settings page.",
    )
    api_base = _require_non_empty(
        api_base,
        "Missing NEXT_PUBLIC_APP_URL. Set it in env or ~/.watchllm/config, "
        "for example: NEXT_PUBLIC_APP_URL=http://localhost:8000",
    )
    sdk_key = _require_non_empty(
        sdk_key,
        "Missing WATCHLLM_SDK_KEY. Set it in env or ~/.watchllm/config. "
        "This is your project SDK key (sk_proj_...).",
    )

    return api_key, api_base.rstrip("/"), sdk_key


def _build_auth_headers(api_key: str) -> dict[str, str]:
    if api_key.startswith("wlk_"):
        return {
            "X-WatchLLM-Api-Key": api_key,
            "Content-Type": "application/json",
        }
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }


def _extract_severity_from_report(report_payload: Any) -> int:
    if not isinstance(report_payload, dict):
        return 0

    severity_score = report_payload.get("severity_score")
    if isinstance(severity_score, (int, float)):
        value = int(round(float(severity_score)))
        return max(0, min(5, value))

    categories = report_payload.get("categories")
    if isinstance(categories, dict):
        max_avg = 0.0
        for value in categories.values():
            if isinstance(value, dict):
                avg = value.get("avg_severity")
                if isinstance(avg, (int, float)):
                    max_avg = max(max_avg, float(avg))
        if max_avg > 0:
            return max(0, min(5, int(round(max_avg))))

    return 0


def _request_json(
    client: httpx.Client,
    method: str,
    url: str,
    *,
    headers: dict[str, str] | None = None,
    json_body: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any], httpx.Headers]:
    response = client.request(method=method, url=url, headers=headers, json=json_body)
    payload: dict[str, Any] = {}
    if response.text:
        try:
            parsed = response.json()
            if isinstance(parsed, dict):
                payload = parsed
        except json.JSONDecodeError:
            payload = {}
    return response.status_code, payload, response.headers


def run_simulation(
    *,
    api_base: str,
    api_key: str,
    sdk_key: str,
    categories: list[str],
    num_runs: int,
    max_turns: int,
) -> tuple[str, str, int]:
    headers = _build_auth_headers(api_key)
    with httpx.Client(timeout=30.0) as client:
        simulate_url = f"{api_base}/api/simulate"
        status_code, payload, response_headers = _request_json(
            client,
            "POST",
            simulate_url,
            headers=headers,
            json_body={
                "sdk_key": sdk_key,
                "config": {
                    "categories": categories,
                    "num_runs": num_runs,
                    "max_turns": max_turns,
                },
            },
        )

        if status_code == 429:
            retry_after = response_headers.get("Retry-After", "unknown")
            print(
                f"Rate limited by API (429). Retry-After: {retry_after} seconds.",
                file=sys.stderr,
            )
            return "rate_limited", "", 0

        if status_code >= 400:
            detail = payload.get("detail", f"HTTP {status_code}")
            print(f"Failed to start simulation: {detail}", file=sys.stderr)
            return "failed", "", 0

        simulation_id = payload.get("simulation_id")
        if not isinstance(simulation_id, str) or not simulation_id:
            print("API did not return simulation_id", file=sys.stderr)
            return "failed", "", 0

        print(f"Simulation queued: {simulation_id}")
        status_url = f"{api_base}/api/simulation/{simulation_id}/status"

        last_progress = -1
        terminal_status = "queued"

        while True:
            status_code, status_payload, _ = _request_json(
                client,
                "GET",
                status_url,
                headers=headers,
            )
            if status_code >= 400:
                detail = status_payload.get("detail", f"HTTP {status_code}")
                print(f"Status polling failed: {detail}", file=sys.stderr)
                return "failed", simulation_id, 0

            terminal_status = str(status_payload.get("status", "queued"))
            progress = status_payload.get("progress")
            progress_value = progress if isinstance(progress, int) else 0

            if progress_value != last_progress:
                print(f"Progress: {progress_value:3d}% | status={terminal_status}")
                last_progress = progress_value

            if terminal_status in {"completed", "failed", "cancelled"}:
                report_url = f"{api_base}/api/simulation/{simulation_id}/report"
                print(f"Final status: {terminal_status}")
                print(f"Report URL: {report_url}")
                return terminal_status, simulation_id, progress_value

            time.sleep(0.5)


def run_attack(target: str, api_base: str, api_key: str, sdk_key: str) -> int:
    """
    Run a real chaos simulation against the API and return severity (0-5).

    Returns an integer severity score (1-5) that can be used to gate CI builds.
    """
    path = Path(target).resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Agent file not found: {path}")

    print(f"Using target agent file: {path}")
    status, simulation_id, _progress = run_simulation(
        api_base=api_base,
        api_key=api_key,
        sdk_key=sdk_key,
        categories=DEFAULT_CATEGORIES,
        num_runs=50,
        max_turns=5,
    )
    if not simulation_id:
        return 5 if status in {"failed", "rate_limited"} else 0

    if status != "completed":
        return 5

    headers = _build_auth_headers(api_key)
    report_url = f"{api_base}/api/simulation/{simulation_id}/report"
    with httpx.Client(timeout=30.0) as client:
        status_code, payload, _ = _request_json(
            client,
            "GET",
            report_url,
            headers=headers,
        )
        if status_code >= 400:
            print("Unable to fetch report payload to compute severity.", file=sys.stderr)
            return 5

    severity = _extract_severity_from_report(payload)
    print(f"Agent Safety Severity: {severity}/5")
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
        "attack", help="Run a real chaos simulation against an agent"
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

    simulate_parser = subparsers.add_parser(
        "simulate",
        help="Run an interactive simulation and stream live progress",
    )
    simulate_parser.add_argument(
        "target",
        metavar="AGENT_PATH",
        help="Path to the agent Python file (used for local context and validation)",
    )
    simulate_parser.add_argument(
        "--num-runs",
        type=int,
        default=50,
        help="Number of runs to request from the API (default: 50)",
    )
    simulate_parser.add_argument(
        "--max-turns",
        type=int,
        default=5,
        help="Maximum turns per run (default: 5)",
    )

    subparsers.add_parser(
        "doctor",
        help="Run local configuration and connectivity checks",
    )

    return parser


def run_doctor() -> int:
    config = _load_watchllm_config()
    api_key = _resolve_setting("WATCHLLM_API_KEY", config)
    sdk_key = _resolve_setting("WATCHLLM_SDK_KEY", config)
    api_base = _resolve_setting("NEXT_PUBLIC_APP_URL", config)
    supabase_url = _resolve_setting("NEXT_PUBLIC_SUPABASE_URL", config)

    checks: list[tuple[str, bool, str]] = []

    checks.append(
        (
            "WATCHLLM_API_KEY present",
            bool(api_key),
            "Set WATCHLLM_API_KEY in env or ~/.watchllm/config",
        )
    )
    checks.append(
        (
            "WATCHLLM_SDK_KEY present",
            bool(sdk_key),
            "Set WATCHLLM_SDK_KEY (sk_proj_...) in env or ~/.watchllm/config",
        )
    )
    checks.append(
        (
            "NEXT_PUBLIC_APP_URL present",
            bool(api_base),
            "Set NEXT_PUBLIC_APP_URL (for example http://localhost:8000)",
        )
    )
    checks.append(
        (
            "NEXT_PUBLIC_SUPABASE_URL present",
            bool(supabase_url),
            "Set NEXT_PUBLIC_SUPABASE_URL in env or ~/.watchllm/config",
        )
    )

    if supabase_url:
        try:
            response = httpx.get(supabase_url, timeout=10.0)
            checks.append(
                (
                    "Supabase URL reachable",
                    response.status_code < 500,
                    f"HTTP {response.status_code} from Supabase URL",
                )
            )
        except Exception as exc:
            checks.append(("Supabase URL reachable", False, str(exc)))
    else:
        checks.append(("Supabase URL reachable", False, "Supabase URL not configured"))

    if api_base:
        try:
            response = httpx.get(f"{api_base.rstrip('/')}/health", timeout=10.0)
            checks.append(
                (
                    "API /health reachable",
                    response.status_code == 200,
                    f"HTTP {response.status_code} from /health",
                )
            )
        except Exception as exc:
            checks.append(("API /health reachable", False, str(exc)))
    else:
        checks.append(("API /health reachable", False, "API base URL not configured"))

    failed = False
    for name, ok, detail in checks:
        mark = "PASS" if ok else "FAIL"
        color = GREEN if ok else RED
        print(f"{color}{mark}{RESET} {name} - {detail}")
        if not ok:
            failed = True

    return 1 if failed else 0


def main(argv: Optional[Iterable[str]] = None) -> None:
    parser = build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)

    if args.command == "attack":
        api_key, api_base, sdk_key = _resolve_cli_auth_values()
        run_attack(args.target, api_base, api_key, sdk_key)
        return

    if args.command == "test":
        api_key, api_base, sdk_key = _resolve_cli_auth_values()
        severity = run_attack(args.target, api_base, api_key, sdk_key)
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

    if args.command == "simulate":
        api_key, api_base, sdk_key = _resolve_cli_auth_values()
        path = Path(args.target).resolve()
        if not path.is_file():
            print(f"Agent file not found: {path}", file=sys.stderr)
            sys.exit(2)

        status, _simulation_id, _progress = run_simulation(
            api_base=api_base,
            api_key=api_key,
            sdk_key=sdk_key,
            categories=DEFAULT_CATEGORIES,
            num_runs=max(1, int(args.num_runs)),
            max_turns=max(1, int(args.max_turns)),
        )
        if status == "completed":
            return
        if status == "rate_limited":
            sys.exit(2)
        sys.exit(1)

    if args.command == "doctor":
        exit_code = run_doctor()
        if exit_code:
            sys.exit(exit_code)
        return

    parser.error("Unknown command")


if __name__ == "__main__":
    main()


