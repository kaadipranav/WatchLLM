from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import FastAPI, Request
from pydantic import BaseModel, ConfigDict

from .auth import ClerkAuthMiddleware
from .schemas import RegisterAgentRequest, SimulateRequest, SimulationResponseRequest

app = FastAPI()
app.add_middleware(ClerkAuthMiddleware)


class ClerkWebhookPayload(BaseModel):
    """Loose webhook envelope; D1/D2 will tighten verification and event handling."""

    model_config = ConfigDict(extra="allow")

    type: str | None = None
    data: dict[str, Any] | None = None


def not_implemented_response() -> dict[str, str]:
    return {"status": "not_implemented"}


@app.post("/api/webhooks/clerk")
async def clerk_webhook(_payload: ClerkWebhookPayload, request: Request):
    """
    Basic Clerk webhook endpoint stub.

    This will eventually:
    - Verify the Clerk webhook signature
    - Parse the event payload
    - Upsert users into the Supabase `users` table
    """
    _raw_body = await request.body()
    # TODO: verify signature and sync to Supabase
    return {"status": "ok"}


@app.post("/api/register-agent")
async def register_agent(_payload: RegisterAgentRequest):
    return not_implemented_response()


@app.post("/api/simulate")
async def simulate(_payload: SimulateRequest):
    return not_implemented_response()


@app.get("/api/simulation/{simulation_id}/status")
async def simulation_status(simulation_id: UUID):
    _ = simulation_id
    return not_implemented_response()


@app.post("/api/simulation/{simulation_id}/response")
async def simulation_response(simulation_id: UUID, _payload: SimulationResponseRequest):
    _ = simulation_id
    return not_implemented_response()


@app.get("/api/simulation/{simulation_id}/report")
async def simulation_report(simulation_id: UUID):
    _ = simulation_id
    return not_implemented_response()


@app.get("/api/simulation/{simulation_id}/replay/{run_id}")
async def simulation_replay(simulation_id: UUID, run_id: UUID):
    _ = (simulation_id, run_id)
    return not_implemented_response()


@app.post("/api/simulation/{simulation_id}/cancel")
async def simulation_cancel(simulation_id: UUID):
    _ = simulation_id
    return not_implemented_response()


@app.get("/api/me")
async def current_user(request: Request):
    """Sanity endpoint for protected route auth wiring."""
    return {"user_id": request.state.user_id}

