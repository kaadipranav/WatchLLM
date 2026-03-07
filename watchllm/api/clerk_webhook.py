from __future__ import annotations

import asyncio
import json
import os
from typing import Any
from urllib import error, parse, request as urllib_request
from uuid import UUID
from uuid import uuid5, NAMESPACE_URL

from fastapi import FastAPI, HTTPException, Request, status
from pydantic import BaseModel, ConfigDict, ValidationError
from svix.webhooks import Webhook, WebhookVerificationError

from .auth import ClerkAuthMiddleware
from .schemas import RegisterAgentRequest, SimulateRequest, SimulationResponseRequest

app = FastAPI()
app.add_middleware(ClerkAuthMiddleware)


class ClerkWebhookPayload(BaseModel):
    """Loose webhook envelope; D1/D2 will tighten verification and event handling."""

    model_config = ConfigDict(extra="allow")

    type: str | None = None
    data: dict[str, Any] | None = None


def _get_supabase_admin_config() -> tuple[str, str]:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="NEXT_PUBLIC_SUPABASE_URL is not configured",
        )
    if not service_role_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="SUPABASE_SERVICE_ROLE_KEY is not configured",
        )

    return supabase_url.rstrip("/"), service_role_key


def _extract_primary_email(user_data: dict[str, Any]) -> str | None:
    email_addresses = user_data.get("email_addresses")
    if not isinstance(email_addresses, list):
        return None

    primary_email_address_id = user_data.get("primary_email_address_id")
    for item in email_addresses:
        if not isinstance(item, dict):
            continue
        email_value = item.get("email_address")
        if not isinstance(email_value, str) or not email_value:
            continue
        if primary_email_address_id and item.get("id") == primary_email_address_id:
            return email_value

    for item in email_addresses:
        if isinstance(item, dict):
            email_value = item.get("email_address")
            if isinstance(email_value, str) and email_value:
                return email_value
    return None


def _supabase_request(
    method: str,
    endpoint: str,
    body: dict[str, Any] | None,
    service_role_key: str,
    prefer: str = "return=minimal",
) -> None:
    data = None if body is None else json.dumps(body).encode("utf-8")
    req = urllib_request.Request(
        endpoint,
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Prefer": prefer,
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=15) as response:
            if response.status >= 400:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Supabase write failed with status {response.status}",
                )
    except error.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase write failed with status {exc.code}",
        ) from exc
    except error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase write failed due to network error",
        ) from exc


def _insert_user(supabase_url: str, service_role_key: str, clerk_id: str, email: str | None) -> None:
    users_endpoint = f"{supabase_url}/rest/v1/users?on_conflict=clerk_id"
    user_row = {
        "id": str(uuid5(NAMESPACE_URL, f"clerk:{clerk_id}")),
        "clerk_id": clerk_id,
        "email": email,
        "tier": "free",
    }
    _supabase_request(
        "POST",
        users_endpoint,
        user_row,
        service_role_key,
        prefer="resolution=merge-duplicates,return=minimal",
    )


def _update_user_email(
    supabase_url: str,
    service_role_key: str,
    clerk_id: str,
    email: str | None,
) -> None:
    clerk_id_filter = parse.quote(clerk_id, safe="")
    users_endpoint = f"{supabase_url}/rest/v1/users?clerk_id=eq.{clerk_id_filter}"
    update_body = {"email": email}
    _supabase_request("PATCH", users_endpoint, update_body, service_role_key)


def not_implemented_response() -> dict[str, str]:
    return {"status": "not_implemented"}


@app.post("/api/webhooks/clerk")
async def clerk_webhook(request: Request):
    """
    Basic Clerk webhook endpoint stub.

    This will eventually:
    - Verify the Clerk webhook signature
    - Parse the event payload
    - Upsert users into the Supabase `users` table
    """
    raw_body = await request.body()
    clerk_webhook_secret = os.getenv("CLERK_WEBHOOK_SECRET")
    if not clerk_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLERK_WEBHOOK_SECRET is not configured",
        )

    svix_id = request.headers.get("svix-id")
    svix_timestamp = request.headers.get("svix-timestamp")
    svix_signature = request.headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Svix signature headers",
        )

    headers = {
        "svix-id": svix_id,
        "svix-timestamp": svix_timestamp,
        "svix-signature": svix_signature,
    }

    try:
        Webhook(clerk_webhook_secret).verify(raw_body, headers)
    except WebhookVerificationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Clerk webhook signature",
        ) from exc

    try:
        payload = ClerkWebhookPayload.model_validate_json(raw_body)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc

    event_type = payload.type
    payload_data = payload.data
    if not isinstance(payload_data, dict):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Webhook payload is missing data object",
        )

    if event_type not in {"user.created", "user.updated"}:
        return {"status": "ignored", "event_type": event_type}

    clerk_id = payload_data.get("id")
    if not isinstance(clerk_id, str) or not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Webhook payload missing user id",
        )

    email = _extract_primary_email(payload_data)
    supabase_url, service_role_key = _get_supabase_admin_config()

    if event_type == "user.created":
        await asyncio.to_thread(
            _insert_user,
            supabase_url,
            service_role_key,
            clerk_id,
            email,
        )
        return {"status": "ok", "event_type": event_type}

    await asyncio.to_thread(
        _update_user_email,
        supabase_url,
        service_role_key,
        clerk_id,
        email,
    )
    return {"status": "ok", "event_type": event_type}


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

