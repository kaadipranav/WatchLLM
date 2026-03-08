from __future__ import annotations

import hashlib
import json
import os
import time
from functools import wraps
from typing import Any, Callable, ParamSpec, TypeVar

import httpx

P = ParamSpec("P")
R = TypeVar("R")


def _normalize_tools(tools: Any) -> list[dict[str, Any]]:
    if not isinstance(tools, list):
        return []

    normalized: list[dict[str, Any]] = []
    for item in tools:
        if isinstance(item, dict):
            normalized.append(item)
    return normalized


def _extract_metadata(
    func: Callable[..., Any],
    kwargs: dict[str, Any],
    explicit_system_prompt: str | None,
    explicit_model: str | None,
    explicit_tools: list[dict[str, Any]] | None,
    explicit_purpose: str | None,
) -> tuple[str, str, list[dict[str, Any]]]:
    # Prefer explicit decorator config, then per-call kwargs, then function attributes/docstring.
    system_prompt = (
        explicit_system_prompt
        or explicit_purpose
        or (kwargs.get("system_prompt") if isinstance(kwargs.get("system_prompt"), str) else None)
        or (getattr(func, "__watchllm_system_prompt__", None) if isinstance(getattr(func, "__watchllm_system_prompt__", None), str) else None)
        or (func.__doc__.strip() if func.__doc__ else None)
        or "General assistant"
    )

    model = (
        explicit_model
        or (kwargs.get("model") if isinstance(kwargs.get("model"), str) else None)
        or (getattr(func, "__watchllm_model__", None) if isinstance(getattr(func, "__watchllm_model__", None), str) else None)
        or "unknown-model"
    )

    if explicit_tools is not None:
        tools = _normalize_tools(explicit_tools)
    elif "tools" in kwargs:
        tools = _normalize_tools(kwargs.get("tools"))
    else:
        tools = _normalize_tools(getattr(func, "__watchllm_tools__", []))

    return system_prompt, model, tools


def _compute_agent_fingerprint(system_prompt: str, tools: list[dict[str, Any]]) -> str:
    canonical_tools = json.dumps(tools, sort_keys=True, separators=(",", ":"))
    payload = f"{system_prompt}\n{canonical_tools}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _register_agent(
    *,
    api_url: str,
    sdk_key: str,
    system_prompt: str,
    model: str,
    tools: list[dict[str, Any]],
    agent_fingerprint: str,
) -> str:
    endpoint = f"{api_url.rstrip('/')}/api/register-agent"
    response = httpx.post(
        endpoint,
        json={
            "sdk_key": sdk_key,
            "system_prompt": system_prompt,
            "model": model,
            "tools": tools,
            "agent_fingerprint": agent_fingerprint,
        },
        timeout=15.0,
    )
    response.raise_for_status()
    payload = response.json()
    agent_id = payload.get("agent_id") if isinstance(payload, dict) else None
    if not isinstance(agent_id, str) or not agent_id:
        raise ValueError("register-agent response missing agent_id")
    return agent_id


def _extract_simulation_id(kwargs: dict[str, Any], result: Any) -> str | None:
    candidate = kwargs.get("simulation_id")
    if isinstance(candidate, str) and candidate:
        return candidate

    if isinstance(result, dict):
        result_candidate = result.get("simulation_id")
        if isinstance(result_candidate, str) and result_candidate:
            return result_candidate

    return None


def _build_auth_headers() -> dict[str, str]:
    token = os.getenv("WATCHLLM_AUTH_TOKEN") or os.getenv("WATCHLLM_API_KEY")
    if isinstance(token, str) and token:
        return {"Authorization": f"Bearer {token}"}
    return {}


def _poll_simulation_until_terminal(api_url: str, simulation_id: str) -> None:
    endpoint = f"{api_url.rstrip('/')}/api/simulation/{simulation_id}/status"
    report_url = f"{api_url.rstrip('/')}/simulate/{simulation_id}"
    headers = _build_auth_headers()

    last_progress: int | None = None
    for _ in range(7200):
        response = httpx.get(endpoint, headers=headers, timeout=10.0)
        response.raise_for_status()

        payload = response.json()
        if not isinstance(payload, dict):
            raise ValueError("status response is not a JSON object")

        status_value = payload.get("status")
        progress_value = payload.get("progress")

        progress = progress_value if isinstance(progress_value, int) else 0
        status_text = status_value if isinstance(status_value, str) else "unknown"

        if last_progress is None or progress != last_progress:
            print(f"[watchllm] simulation {simulation_id} status={status_text} progress={progress}%")
            last_progress = progress

        if status_text in {"completed", "failed", "cancelled"}:
            if status_text == "completed":
                print(f"[watchllm] simulation completed: {report_url}")
            else:
                print(f"[watchllm] simulation ended with status={status_text}")
            return

        time.sleep(0.5)

    raise TimeoutError("status polling timed out after 1 hour")


def chaos(
    key: str,
    *,
    system_prompt: str | None = None,
    model: str | None = None,
    tools: list[dict[str, Any]] | None = None,
    purpose: str | None = None,
) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Decorator for WatchLLM SDK registration.

    On first invocation, it captures metadata and attempts agent registration:
    - system_prompt
    - model
    - tools[]

    Preferred usage:
      @chaos(key="sk_proj_xxx", system_prompt="...", model="...", tools=[...])

    `purpose` is accepted as an alias for `system_prompt`.
    """

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        registered = False
        agent_id: str | None = None

        api_url = os.getenv("WATCHLLM_API_URL", "https://watchllm.io")

        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            nonlocal registered, agent_id
            if not registered:
                captured_prompt, captured_model, captured_tools = _extract_metadata(
                    func,
                    dict(kwargs),
                    system_prompt,
                    model,
                    tools,
                    purpose,
                )
                fingerprint = _compute_agent_fingerprint(captured_prompt, captured_tools)

                try:
                    agent_id = _register_agent(
                        api_url=api_url,
                        sdk_key=key,
                        system_prompt=captured_prompt,
                        model=captured_model,
                        tools=captured_tools,
                        agent_fingerprint=fingerprint,
                    )
                    print(
                        f"Agent registered. Run chaos at: "
                        f"{api_url.rstrip('/')}/simulate/{agent_id}"
                    )
                    setattr(func, "__watchllm_agent_id__", agent_id)
                except Exception as exc:
                    print(f"[watchllm] agent registration failed: {exc}")
                finally:
                    registered = True

            result = func(*args, **kwargs)

            simulation_id = _extract_simulation_id(dict(kwargs), result)
            if simulation_id:
                try:
                    _poll_simulation_until_terminal(api_url, simulation_id)
                except Exception as exc:
                    print(f"[watchllm] status polling failed: {exc}")

            return result

        return wrapper

    return decorator

