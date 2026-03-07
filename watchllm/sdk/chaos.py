from __future__ import annotations

from functools import wraps
from typing import Any, Callable, ParamSpec, TypeVar

P = ParamSpec("P")
R = TypeVar("R")


def chaos(key: str) -> Callable[[Callable[P, R]], Callable[P, R]]:
    """
    Skeleton chaos decorator for local development.

    - Accepts an API key parameter.
    - Wraps the target function.
    - Mocks registration by printing a static agent URL on first invocation.
    """

    def decorator(func: Callable[P, R]) -> Callable[P, R]:
        registered = False
        mock_agent_id = "mock-agent-123"

        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
            nonlocal registered
            if not registered:
                print(
                    f"Agent registered. Run chaos at: "
                    f"watchllm.io/simulate/{mock_agent_id}"
                )
                registered = True
            return func(*args, **kwargs)

        return wrapper

    return decorator

