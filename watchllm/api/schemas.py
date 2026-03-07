from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


FailureCategory = Literal[
    "prompt_injection",
    "goal_hijacking",
    "memory_poisoning",
    "tool_abuse",
    "boundary_testing",
    "jailbreak_variants",
]

ALL_FAILURE_CATEGORIES: tuple[FailureCategory, ...] = (
    "prompt_injection",
    "goal_hijacking",
    "memory_poisoning",
    "tool_abuse",
    "boundary_testing",
    "jailbreak_variants",
)


class RegisterAgentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sdk_key: str = Field(min_length=8, max_length=128, pattern=r"^sk_proj_[A-Za-z0-9_-]+$")
    system_prompt: str = Field(min_length=1, max_length=100_000)
    model: str = Field(min_length=1, max_length=256)
    tools: list[dict[str, Any]] = Field(default_factory=list, max_length=512)
    agent_fingerprint: str = Field(min_length=8, max_length=256)


class SimulationConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    categories: list[FailureCategory] = Field(
        default_factory=lambda: list(ALL_FAILURE_CATEGORIES),
        min_length=1,
        max_length=6,
    )
    num_runs: int = Field(default=1000, ge=1, le=10_000)
    max_turns: int = Field(default=5, ge=1, le=10)

    @field_validator("categories")
    @classmethod
    def ensure_unique_categories(cls, value: list[FailureCategory]) -> list[FailureCategory]:
        if len(set(value)) != len(value):
            raise ValueError("categories must not contain duplicates")
        return value


class SimulateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sdk_key: str = Field(min_length=8, max_length=128, pattern=r"^sk_proj_[A-Za-z0-9_-]+$")
    config: SimulationConfig = Field(default_factory=SimulationConfig)


class SimulationResponseRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    run_id: UUID
    response: str = Field(min_length=1, max_length=250_000)
    latency_ms: int = Field(ge=0, le=300_000)
