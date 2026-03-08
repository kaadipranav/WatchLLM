from __future__ import annotations

import asyncio
import json
import os
from typing import Any
from urllib import error, parse, request as urllib_request
from uuid import UUID
from uuid import uuid5, NAMESPACE_URL, uuid4

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, status
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


def _supabase_fetch_json(
    endpoint: str,
    service_role_key: str,
) -> Any:
    req = urllib_request.Request(
        endpoint,
        method="GET",
        headers={
            "Content-Type": "application/json",
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=15) as response:
            if response.status >= 400:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Supabase read failed with status {response.status}",
                )
            return json.loads(response.read().decode("utf-8") or "null")
    except error.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Supabase read failed with status {exc.code}",
        ) from exc
    except error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase read failed due to network error",
        ) from exc


def _patch_simulation_status(
    supabase_url: str,
    service_role_key: str,
    simulation_id: str,
    status_value: str,
) -> None:
    simulation_filter = parse.quote(simulation_id, safe="")
    endpoint = f"{supabase_url}/rest/v1/simulations?id=eq.{simulation_filter}"
    try:
        _supabase_request(
            "PATCH",
            endpoint,
            {"status": status_value},
            service_role_key,
        )
    except Exception:
        # Best-effort status patch for background worker trigger failures.
        pass


def _trigger_orchestrator_worker(
    simulation_id: str,
    supabase_url: str,
    service_role_key: str,
) -> None:
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    api_token = os.getenv("CLOUDFLARE_API_TOKEN")
    worker_script_name = "watchllm-chaos-worker"

    if not account_id or not api_token:
        _patch_simulation_status(
            supabase_url,
            service_role_key,
            simulation_id,
            "failed",
        )
        return

    endpoint = (
        f"https://api.cloudflare.com/client/v4/accounts/{account_id}"
        f"/workers/scripts/{worker_script_name}/dispatch"
    )
    payload = json.dumps({"simulation_id": simulation_id}).encode("utf-8")
    req = urllib_request.Request(
        endpoint,
        data=payload,
        method="POST",
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_token}",
        },
    )

    try:
        with urllib_request.urlopen(req, timeout=20) as response:
            if response.status >= 400:
                _patch_simulation_status(
                    supabase_url,
                    service_role_key,
                    simulation_id,
                    "failed",
                )
    except Exception:
        _patch_simulation_status(
            supabase_url,
            service_role_key,
            simulation_id,
            "failed",
        )


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


def _compute_progress_percent(status_value: str, total_runs: Any, config: Any) -> int:
    if status_value == "completed":
        return 100
    if status_value in {"queued", "pending"}:
        return 0

    completed_runs = total_runs if isinstance(total_runs, int) and total_runs >= 0 else 0

    target_runs = 0
    if isinstance(config, dict):
        raw_target = config.get("num_runs")
        if isinstance(raw_target, int) and raw_target > 0:
            target_runs = raw_target

    if target_runs <= 0:
        return 0

    progress = int((completed_runs * 100) / target_runs)
    if progress < 0:
        return 0
    if progress > 100:
        return 100
    return progress


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
async def simulate(_payload: SimulateRequest, request: Request, background_tasks: BackgroundTasks):
    clerk_id = getattr(request.state, "user_id", None)
    if not isinstance(clerk_id, str) or not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authenticated user context",
        )

    supabase_url, service_role_key = _get_supabase_admin_config()

    clerk_id_filter = parse.quote(clerk_id, safe="")
    users_endpoint = (
        f"{supabase_url}/rest/v1/users"
        f"?clerk_id=eq.{clerk_id_filter}&select=id&limit=1"
    )
    users = _supabase_fetch_json(users_endpoint, service_role_key)
    if not isinstance(users, list) or len(users) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user is not provisioned",
        )

    user_id = users[0].get("id")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user is not provisioned",
        )

    sdk_key_filter = parse.quote(_payload.sdk_key, safe="")
    user_id_filter = parse.quote(user_id, safe="")
    projects_endpoint = (
        f"{supabase_url}/rest/v1/projects"
        f"?sdk_key=eq.{sdk_key_filter}&user_id=eq.{user_id_filter}&select=id&limit=1"
    )
    projects = _supabase_fetch_json(projects_endpoint, service_role_key)
    if not isinstance(projects, list) or len(projects) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found for sdk_key",
        )

    project_id = projects[0].get("id")
    if not isinstance(project_id, str) or not project_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found for sdk_key",
        )

    project_id_filter = parse.quote(project_id, safe="")
    agents_endpoint = (
        f"{supabase_url}/rest/v1/agents"
        f"?project_id=eq.{project_id_filter}&select=id&order=registered_at.desc&limit=1"
    )
    agents = _supabase_fetch_json(agents_endpoint, service_role_key)
    if not isinstance(agents, list) or len(agents) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered agent found for project",
        )

    agent_id = agents[0].get("id")
    if not isinstance(agent_id, str) or not agent_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No registered agent found for project",
        )

    simulation_id = str(uuid4())
    simulations_endpoint = f"{supabase_url}/rest/v1/simulations"
    _supabase_request(
        "POST",
        simulations_endpoint,
        {
            "id": simulation_id,
            "agent_id": agent_id,
            "user_id": user_id,
            "status": "queued",
            "config": {
                "categories": _payload.config.categories,
                "num_runs": _payload.config.num_runs,
                "max_turns": _payload.config.max_turns,
            },
        },
        service_role_key,
    )

    background_tasks.add_task(
        _trigger_orchestrator_worker,
        simulation_id,
        supabase_url,
        service_role_key,
    )

    return {"simulation_id": simulation_id}


@app.get("/api/simulation/{simulation_id}/status")
async def simulation_status(simulation_id: UUID, request: Request):
    clerk_id = getattr(request.state, "user_id", None)
    if not isinstance(clerk_id, str) or not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authenticated user context",
        )

    supabase_url, service_role_key = _get_supabase_admin_config()

    clerk_id_filter = parse.quote(clerk_id, safe="")
    users_endpoint = (
        f"{supabase_url}/rest/v1/users"
        f"?clerk_id=eq.{clerk_id_filter}&select=id&limit=1"
    )
    users = _supabase_fetch_json(users_endpoint, service_role_key)
    if not isinstance(users, list) or len(users) == 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user is not provisioned",
        )

    user_id = users[0].get("id")
    if not isinstance(user_id, str) or not user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user is not provisioned",
        )

    simulation_id_filter = parse.quote(str(simulation_id), safe="")
    user_id_filter = parse.quote(user_id, safe="")
    simulation_endpoint = (
        f"{supabase_url}/rest/v1/simulations"
        f"?id=eq.{simulation_id_filter}&user_id=eq.{user_id_filter}"
        f"&select=id,status,total_runs,config&limit=1"
    )
    simulations = _supabase_fetch_json(simulation_endpoint, service_role_key)
    if not isinstance(simulations, list) or len(simulations) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found",
        )

    simulation = simulations[0]
    status_value = simulation.get("status")
    if not isinstance(status_value, str) or not status_value:
        status_value = "queued"

    progress = _compute_progress_percent(
        status_value,
        simulation.get("total_runs"),
        simulation.get("config"),
    )
    return {"status": status_value, "progress": progress}


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

