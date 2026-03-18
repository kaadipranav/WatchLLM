from __future__ import annotations

import asyncio
import gzip
import hashlib
import hmac
import json
import os
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Any
from urllib import error, parse, request as urllib_request
from uuid import UUID
from uuid import uuid5, NAMESPACE_URL, uuid4

from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, ValidationError
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from svix.webhooks import Webhook, WebhookVerificationError

from .auth import ClerkAuthMiddleware, hash_watchllm_api_key_secret
from .schemas import CreateApiKeyRequest, CreateProjectRequest, RegisterAgentRequest, SimulateRequest, SimulationResponseRequest


def _safe_float(value: str | None, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def _init_sentry() -> None:
    dsn = os.getenv("SENTRY_DSN") or os.getenv("NEXT_PUBLIC_SENTRY_DSN")
    if not dsn:
        return

    sentry_sdk.init(
        dsn=dsn,
        integrations=[FastApiIntegration()],
        traces_sample_rate=_safe_float(os.getenv("SENTRY_TRACES_SAMPLE_RATE"), 0.1),
        profiles_sample_rate=_safe_float(os.getenv("SENTRY_PROFILES_SAMPLE_RATE"), 0.0),
        environment=os.getenv("SENTRY_ENVIRONMENT") or os.getenv("ENVIRONMENT") or "development",
    )


_init_sentry()

ENVIRONMENT = os.getenv("ENVIRONMENT") or os.getenv("SENTRY_ENVIRONMENT", "production")

app = FastAPI(
    title="WatchLLM API",
    docs_url="/docs" if ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if ENVIRONMENT != "production" else None,
    openapi_url="/openapi.json" if ENVIRONMENT != "production" else None,
)

# CORS Security
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://watchllm.dev",
        "https://www.watchllm.dev",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.add_middleware(ClerkAuthMiddleware)


@app.get("/health")
async def healthcheck():
    return {"status": "ok"}


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


def _supabase_request_json(
    method: str,
    endpoint: str,
    body: dict[str, Any] | None,
    service_role_key: str,
    prefer: str = "return=representation",
) -> Any:
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
            payload = response.read().decode("utf-8")
            if not payload:
                return None
            return json.loads(payload)
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


def _verify_stripe_signature(raw_body: bytes, stripe_signature: str, secret: str) -> bool:
    if not stripe_signature:
        return False

    components: dict[str, list[str]] = {}
    for part in stripe_signature.split(","):
        key, sep, value = part.partition("=")
        if not sep:
            continue
        components.setdefault(key.strip(), []).append(value.strip())

    timestamps = components.get("t", [])
    signatures = components.get("v1", [])
    if not timestamps or not signatures:
        return False

    timestamp = timestamps[0]
    try:
        timestamp_int = int(timestamp)
    except ValueError:
        return False

    # Mirror Stripe's default timestamp tolerance to reduce replay risk.
    tolerance_seconds = 300
    now_ts = int(datetime.now(timezone.utc).timestamp())
    if abs(now_ts - timestamp_int) > tolerance_seconds:
        return False

    signed_payload = f"{timestamp}.".encode("utf-8") + raw_body
    expected = hmac.new(secret.encode("utf-8"), signed_payload, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, candidate) for candidate in signatures)


def _verify_razorpay_signature(raw_body: bytes, razorpay_signature: str, secret: str) -> bool:
    if not razorpay_signature:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, razorpay_signature)


def _extract_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _first_non_empty_str(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _resolve_webhook_user_selectors(payload: dict[str, Any]) -> tuple[str | None, str | None]:
    data = _extract_dict(payload.get("data"))
    event_obj = _extract_dict(data.get("object"))
    metadata = _extract_dict(event_obj.get("metadata"))
    customer_details = _extract_dict(event_obj.get("customer_details"))
    notes = _extract_dict(event_obj.get("notes"))

    clerk_id = _first_non_empty_str(
        metadata.get("clerk_id"),
        notes.get("clerk_id"),
        event_obj.get("clerk_id"),
    )
    email = _first_non_empty_str(
        customer_details.get("email"),
        event_obj.get("customer_email"),
        event_obj.get("email"),
        metadata.get("email"),
        notes.get("email"),
    )
    return clerk_id, email


def _update_user_tier_by_selector(
    supabase_url: str,
    service_role_key: str,
    tier_value: str,
    clerk_id: str | None,
    email: str | None,
) -> bool:
    if clerk_id:
        clerk_id_filter = parse.quote(clerk_id, safe="")
        lookup_endpoint = (
            f"{supabase_url}/rest/v1/users"
            f"?clerk_id=eq.{clerk_id_filter}&select=id&limit=1"
        )
        user_rows = _supabase_fetch_json(lookup_endpoint, service_role_key)
        if isinstance(user_rows, list) and len(user_rows) > 0:
            update_endpoint = f"{supabase_url}/rest/v1/users?clerk_id=eq.{clerk_id_filter}"
            _supabase_request("PATCH", update_endpoint, {"tier": tier_value}, service_role_key)
            return True

    if email:
        email_filter = parse.quote(email, safe="")
        lookup_endpoint = (
            f"{supabase_url}/rest/v1/users"
            f"?email=eq.{email_filter}&select=id&limit=1"
        )
        user_rows = _supabase_fetch_json(lookup_endpoint, service_role_key)
        if isinstance(user_rows, list) and len(user_rows) > 0:
            update_endpoint = f"{supabase_url}/rest/v1/users?email=eq.{email_filter}"
            _supabase_request("PATCH", update_endpoint, {"tier": tier_value}, service_role_key)
            return True

    return False


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


def _normalize_user_tier(raw_tier: Any) -> str:
    if not isinstance(raw_tier, str):
        return "free"
    normalized = raw_tier.strip().lower()
    if normalized in {"free", "pro", "team"}:
        return normalized
    return "free"


def _tier_hourly_limit(tier: str) -> int | None:
    if tier == "free":
        return 3
    if tier == "pro":
        return 20
    if tier == "team":
        return None
    return 3


def _parse_iso_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    normalized = value
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"

    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _resolve_authenticated_user(
    request: Request,
    supabase_url: str,
    service_role_key: str,
) -> tuple[str, str]:
    auth_kind = getattr(request.state, "auth_kind", None)

    if auth_kind == "api_key":
        api_user_id = getattr(request.state, "api_user_id", None)
        api_tier = getattr(request.state, "api_user_tier", None)
        if isinstance(api_user_id, str) and api_user_id:
            return api_user_id, _normalize_user_tier(api_tier)

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API key user context",
        )

    clerk_id = getattr(request.state, "user_id", None)
    if not isinstance(clerk_id, str) or not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authenticated user context",
        )

    clerk_id_filter = parse.quote(clerk_id, safe="")
    users_endpoint = (
        f"{supabase_url}/rest/v1/users"
        f"?clerk_id=eq.{clerk_id_filter}&select=id,tier&limit=1"
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

    return user_id, _normalize_user_tier(users[0].get("tier"))


def _require_clerk_session(request: Request) -> str:
    auth_kind = getattr(request.state, "auth_kind", None)
    if auth_kind != "clerk":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This endpoint requires a Clerk user session",
        )

    clerk_id = getattr(request.state, "user_id", None)
    if not isinstance(clerk_id, str) or not clerk_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authenticated user context",
        )

    return clerk_id


def _ensure_api_key_project_scope(request: Request, project_id: str) -> None:
    auth_kind = getattr(request.state, "auth_kind", None)
    if auth_kind != "api_key":
        return

    bound_project_id = getattr(request.state, "api_project_id", None)
    if isinstance(bound_project_id, str) and bound_project_id and bound_project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="API key is scoped to a different project",
        )


def _generate_watchllm_api_key() -> tuple[str, str, str]:
    environment = (os.getenv("WATCHLLM_API_KEY_ENV") or "live").strip().lower()
    if environment not in {"live", "test"}:
        environment = "live"

    alphabet = string.ascii_letters + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(10))
    secret = "".join(secrets.choice(alphabet) for _ in range(48))
    key_prefix = f"wlk_{environment}_{suffix}"
    api_key = f"{key_prefix}_{secret}"
    return api_key, key_prefix, secret


def _compute_agent_fingerprint(system_prompt: str, tools: list[dict[str, Any]]) -> str:
    canonical_tools = json.dumps(tools, sort_keys=True, separators=(",", ":"))
    payload = f"{system_prompt}\n{canonical_tools}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _get_r2_config() -> tuple[str, str, str, str]:
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID")
    access_key_id = os.getenv("R2_ACCESS_KEY_ID")
    secret_access_key = os.getenv("R2_SECRET_ACCESS_KEY")
    bucket_name = os.getenv("R2_BUCKET_NAME", "watchllm-traces")

    if not account_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="CLOUDFLARE_ACCOUNT_ID is not configured",
        )
    if not access_key_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="R2_ACCESS_KEY_ID is not configured",
        )
    if not secret_access_key:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="R2_SECRET_ACCESS_KEY is not configured",
        )
    if not bucket_name:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="R2_BUCKET_NAME is not configured",
        )

    return account_id, access_key_id, secret_access_key, bucket_name


def _aws_sigv4_sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode("utf-8"), hashlib.sha256).digest()


def _aws_sigv4_signing_key(secret_access_key: str, datestamp: str) -> bytes:
    k_date = _aws_sigv4_sign(("AWS4" + secret_access_key).encode("utf-8"), datestamp)
    k_region = _aws_sigv4_sign(k_date, "auto")
    k_service = _aws_sigv4_sign(k_region, "s3")
    return _aws_sigv4_sign(k_service, "aws4_request")


def _r2_get_object_bytes(object_key: str, not_found_detail: str) -> bytes:
    account_id, access_key_id, secret_access_key, bucket_name = _get_r2_config()

    host = f"{account_id}.r2.cloudflarestorage.com"
    encoded_key = parse.quote(object_key, safe="/-_.~")
    canonical_uri = f"/{bucket_name}/{encoded_key}"
    endpoint = f"https://{host}{canonical_uri}"

    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    credential_scope = f"{date_stamp}/auto/s3/aws4_request"

    payload_hash = hashlib.sha256(b"").hexdigest()
    canonical_headers = (
        f"host:{host}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = (
        "GET\n"
        f"{canonical_uri}\n"
        "\n"
        f"{canonical_headers}\n"
        f"{signed_headers}\n"
        f"{payload_hash}"
    )

    canonical_request_hash = hashlib.sha256(canonical_request.encode("utf-8")).hexdigest()
    string_to_sign = (
        "AWS4-HMAC-SHA256\n"
        f"{amz_date}\n"
        f"{credential_scope}\n"
        f"{canonical_request_hash}"
    )

    signing_key = _aws_sigv4_signing_key(secret_access_key, date_stamp)
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization_header = (
        "AWS4-HMAC-SHA256 "
        f"Credential={access_key_id}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )

    req = urllib_request.Request(
        endpoint,
        method="GET",
        headers={
            "Host": host,
            "x-amz-content-sha256": payload_hash,
            "x-amz-date": amz_date,
            "Authorization": authorization_header,
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=20) as response:
            if response.status >= 400:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"R2 read failed with status {response.status}",
                )
            return response.read()
    except error.HTTPError as exc:
        if exc.code == status.HTTP_404_NOT_FOUND:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=not_found_detail,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"R2 read failed with status {exc.code}",
        ) from exc
    except error.URLError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="R2 read failed due to network error",
        ) from exc



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


@app.post("/api/webhooks/stripe")
async def stripe_webhook(request: Request):
    raw_body = await request.body()
    stripe_signature = request.headers.get("Stripe-Signature")
    stripe_webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    if not stripe_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="STRIPE_WEBHOOK_SECRET is not configured",
        )
    if not stripe_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Stripe-Signature header",
        )

    if not _verify_stripe_signature(raw_body, stripe_signature, stripe_webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Stripe webhook signature",
        )

    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid Stripe webhook payload",
        ) from exc

    event_type = payload.get("type")
    if event_type not in {"checkout.session.completed", "customer.subscription.deleted"}:
        return {"status": "ignored", "event_type": event_type}

    tier_target = "pro" if event_type == "checkout.session.completed" else "free"
    supabase_url, service_role_key = _get_supabase_admin_config()
    clerk_id, email = _resolve_webhook_user_selectors(payload)
    updated = _update_user_tier_by_selector(
        supabase_url,
        service_role_key,
        tier_target,
        clerk_id,
        email,
    )

    return {
        "status": "ok",
        "event_type": event_type,
        "updated": updated,
    }


@app.post("/api/webhooks/razorpay")
async def razorpay_webhook(request: Request):
    raw_body = await request.body()
    razorpay_signature = request.headers.get("X-Razorpay-Signature")
    razorpay_webhook_secret = os.getenv("RAZORPAY_WEBHOOK_SECRET")

    if not razorpay_webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RAZORPAY_WEBHOOK_SECRET is not configured",
        )
    if not razorpay_signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing X-Razorpay-Signature header",
        )

    if not _verify_razorpay_signature(raw_body, razorpay_signature, razorpay_webhook_secret):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Razorpay webhook signature",
        )

    try:
        payload = json.loads(raw_body.decode("utf-8") or "{}")
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Invalid Razorpay webhook payload",
        ) from exc

    event_type = payload.get("event")
    upgrade_events = {
        "payment.captured",
        "order.paid",
        "subscription.activated",
        "subscription.charged",
    }
    downgrade_events = {
        "subscription.cancelled",
        "subscription.halted",
        "subscription.completed",
    }

    if event_type in upgrade_events:
        tier_target = "pro"
    elif event_type in downgrade_events:
        tier_target = "free"
    else:
        return {"status": "ignored", "event_type": event_type}

    supabase_url, service_role_key = _get_supabase_admin_config()
    clerk_id, email = _resolve_webhook_user_selectors(payload)
    updated = _update_user_tier_by_selector(
        supabase_url,
        service_role_key,
        tier_target,
        clerk_id,
        email,
    )

    return {
        "status": "ok",
        "event_type": event_type,
        "updated": updated,
    }


@app.post("/api/register-agent")
async def register_agent(_payload: RegisterAgentRequest, request: Request):
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

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

    _ensure_api_key_project_scope(request, project_id)

    computed_fingerprint = _compute_agent_fingerprint(_payload.system_prompt, _payload.tools)

    project_id_filter = parse.quote(project_id, safe="")
    fingerprint_filter = parse.quote(computed_fingerprint, safe="")
    existing_agent_endpoint = (
        f"{supabase_url}/rest/v1/agents"
        f"?project_id=eq.{project_id_filter}&fingerprint=eq.{fingerprint_filter}"
        f"&select=id&order=registered_at.desc&limit=1"
    )
    existing_agents = _supabase_fetch_json(existing_agent_endpoint, service_role_key)
    if isinstance(existing_agents, list) and len(existing_agents) > 0:
        existing_agent_id = existing_agents[0].get("id")
        if isinstance(existing_agent_id, str) and existing_agent_id:
            return {"agent_id": existing_agent_id}

    agent_id = str(uuid4())
    insert_agent_endpoint = f"{supabase_url}/rest/v1/agents"
    inserted_rows = _supabase_request_json(
        "POST",
        insert_agent_endpoint,
        {
            "id": agent_id,
            "project_id": project_id,
            "system_prompt": _payload.system_prompt,
            "model": _payload.model,
            "tools": _payload.tools,
            "fingerprint": computed_fingerprint,
        },
        service_role_key,
        prefer="return=representation",
    )

    if isinstance(inserted_rows, list) and len(inserted_rows) > 0:
        inserted_agent_id = inserted_rows[0].get("id")
        if isinstance(inserted_agent_id, str) and inserted_agent_id:
            return {"agent_id": inserted_agent_id}

    return {"agent_id": agent_id}


@app.post("/api/simulate")
async def simulate(_payload: SimulateRequest, request: Request, background_tasks: BackgroundTasks):
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, user_tier = _resolve_authenticated_user(request, supabase_url, service_role_key)
    hourly_limit = _tier_hourly_limit(user_tier)
    if hourly_limit is not None:
        current_time = datetime.now(timezone.utc)
        hour_ago_iso = datetime.fromtimestamp(
            current_time.timestamp() - 3600,
            timezone.utc,
        ).strftime("%Y-%m-%dT%H:%M:%SZ")
        launches_endpoint = (
            f"{supabase_url}/rest/v1/simulations"
            f"?user_id=eq.{parse.quote(user_id, safe='')}"
            f"&created_at=gte.{parse.quote(hour_ago_iso, safe=':-TZ')}"
            f"&select=id,created_at&order=created_at.asc"
        )
        launches = _supabase_fetch_json(launches_endpoint, service_role_key)
        launch_rows = launches if isinstance(launches, list) else []

        if len(launch_rows) >= hourly_limit:
            retry_after_seconds = 3600
            oldest = _parse_iso_datetime(launch_rows[0].get("created_at") if launch_rows else None)
            if oldest is not None:
                elapsed_seconds = int((current_time - oldest).total_seconds())
                retry_after_seconds = max(1, 3600 - max(0, elapsed_seconds))

            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": (
                        f"Rate limit exceeded for tier '{user_tier}'. "
                        f"Limit is {hourly_limit} simulation launches per hour."
                    )
                },
                headers={"Retry-After": str(retry_after_seconds)},
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

    _ensure_api_key_project_scope(request, project_id)

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
                **({
                    "agent_source": _payload.agent_source
                } if _payload.agent_source else {}),
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
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

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
async def simulation_response(
    simulation_id: UUID,
    _payload: SimulationResponseRequest,
    request: Request,
):
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    simulation_id_filter = parse.quote(str(simulation_id), safe="")
    user_id_filter = parse.quote(user_id, safe="")
    simulation_endpoint = (
        f"{supabase_url}/rest/v1/simulations"
        f"?id=eq.{simulation_id_filter}&user_id=eq.{user_id_filter}"
        f"&select=id,config&limit=1"
    )
    simulations = _supabase_fetch_json(simulation_endpoint, service_role_key)
    if not isinstance(simulations, list) or len(simulations) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found",
        )

    simulation = simulations[0]
    config = simulation.get("config")
    max_turns = 5
    if isinstance(config, dict):
        raw_max_turns = config.get("max_turns")
        if isinstance(raw_max_turns, int) and raw_max_turns > 0:
            max_turns = raw_max_turns

    run_id_filter = parse.quote(str(_payload.run_id), safe="")
    sim_run_endpoint = (
        f"{supabase_url}/rest/v1/sim_runs"
        f"?id=eq.{run_id_filter}&simulation_id=eq.{simulation_id_filter}"
        f"&select=id,turn_count&limit=1"
    )
    sim_runs = _supabase_fetch_json(sim_run_endpoint, service_role_key)
    if not isinstance(sim_runs, list) or len(sim_runs) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="run_id not found for simulation",
        )

    sim_run = sim_runs[0]
    current_turn = sim_run.get("turn_count")
    if not isinstance(current_turn, int) or current_turn < 0:
        current_turn = 0

    expected_turn = current_turn + 1
    incoming_turn = _payload.turn if _payload.turn is not None else expected_turn
    if incoming_turn != expected_turn:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Out-of-order run response for run_id={_payload.run_id}. "
                f"Expected turn {expected_turn}, got {incoming_turn}."
            ),
        )

    optimistic_patch_endpoint = (
        f"{supabase_url}/rest/v1/sim_runs"
        f"?id=eq.{run_id_filter}&simulation_id=eq.{simulation_id_filter}"
        f"&turn_count=eq.{current_turn}"
    )
    updated_rows = _supabase_request_json(
        "PATCH",
        optimistic_patch_endpoint,
        {"turn_count": incoming_turn},
        service_role_key,
        prefer="return=representation",
    )
    if not isinstance(updated_rows, list) or len(updated_rows) == 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Run turn was updated concurrently; retry with latest state",
        )

    if incoming_turn >= max_turns:
        return {"done": True}

    return {
        "next_prompt": (
            f"Continue run {_payload.run_id} at turn {incoming_turn + 1} "
            f"for simulation {simulation_id}."
        )
    }


@app.get("/api/simulation/{simulation_id}/report")
async def simulation_report(simulation_id: UUID, request: Request):
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    simulation_id_filter = parse.quote(str(simulation_id), safe="")
    user_id_filter = parse.quote(user_id, safe="")
    simulation_endpoint = (
        f"{supabase_url}/rest/v1/simulations"
        f"?id=eq.{simulation_id_filter}&user_id=eq.{user_id_filter}"
        f"&select=id&limit=1"
    )
    simulations = _supabase_fetch_json(simulation_endpoint, service_role_key)
    if not isinstance(simulations, list) or len(simulations) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found",
        )

    report_key = f"reports/{simulation_id}/summary.json"
    report_bytes = _r2_get_object_bytes(report_key, "Simulation report not found")
    try:
        return json.loads(report_bytes.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Simulation report is not valid JSON",
        ) from exc


@app.get("/api/simulation/{simulation_id}/replay/{run_id}")
async def simulation_replay(simulation_id: UUID, run_id: UUID, request: Request):
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    simulation_id_filter = parse.quote(str(simulation_id), safe="")
    user_id_filter = parse.quote(user_id, safe="")
    simulation_endpoint = (
        f"{supabase_url}/rest/v1/simulations"
        f"?id=eq.{simulation_id_filter}&user_id=eq.{user_id_filter}"
        f"&select=id&limit=1"
    )
    simulations = _supabase_fetch_json(simulation_endpoint, service_role_key)
    if not isinstance(simulations, list) or len(simulations) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found",
        )

    run_id_filter = parse.quote(str(run_id), safe="")
    sim_run_endpoint = (
        f"{supabase_url}/rest/v1/sim_runs"
        f"?id=eq.{run_id_filter}&simulation_id=eq.{simulation_id_filter}"
        f"&select=id&limit=1"
    )
    sim_runs = _supabase_fetch_json(sim_run_endpoint, service_role_key)
    if not isinstance(sim_runs, list) or len(sim_runs) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Replay run not found for simulation",
        )

    trace_key = f"traces/{simulation_id}/{run_id}/full_trace.json.gz"
    trace_bytes = _r2_get_object_bytes(trace_key, "Replay trace not found")

    try:
        decompressed = gzip.decompress(trace_bytes)
    except OSError:
        decompressed = trace_bytes

    try:
        return json.loads(decompressed.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Replay trace is not valid JSON",
        ) from exc


@app.post("/api/simulation/{simulation_id}/cancel")
async def simulation_cancel(simulation_id: UUID, request: Request):
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    simulation_id_filter = parse.quote(str(simulation_id), safe="")
    user_id_filter = parse.quote(user_id, safe="")
    simulation_endpoint = (
        f"{supabase_url}/rest/v1/simulations"
        f"?id=eq.{simulation_id_filter}&user_id=eq.{user_id_filter}"
        f"&select=id,status&limit=1"
    )
    simulations = _supabase_fetch_json(simulation_endpoint, service_role_key)
    if not isinstance(simulations, list) or len(simulations) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Simulation not found",
        )

    current_status = simulations[0].get("status")
    if current_status in {"completed", "failed"}:
        return {"ok": True}

    cancel_endpoint = (
        f"{supabase_url}/rest/v1/simulations"
        f"?id=eq.{simulation_id_filter}&user_id=eq.{user_id_filter}"
    )
    _supabase_request(
        "PATCH",
        cancel_endpoint,
        {"status": "cancelled"},
        service_role_key,
    )

    return {"ok": True}


@app.get("/api/keys")
async def list_api_keys(request: Request):
    _require_clerk_session(request)
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    user_id_filter = parse.quote(user_id, safe="")
    keys_endpoint = (
        f"{supabase_url}/rest/v1/api_keys"
        f"?user_id=eq.{user_id_filter}"
        f"&select=id,name,key_prefix,project_id,created_at,last_used_at,expires_at,revoked_at"
        f"&order=created_at.desc"
    )
    key_rows = _supabase_fetch_json(keys_endpoint, service_role_key)
    keys = key_rows if isinstance(key_rows, list) else []

    projects_endpoint = (
        f"{supabase_url}/rest/v1/projects"
        f"?user_id=eq.{user_id_filter}&select=id,sdk_key"
    )
    projects_rows = _supabase_fetch_json(projects_endpoint, service_role_key)
    project_map: dict[str, str] = {}
    if isinstance(projects_rows, list):
        for row in projects_rows:
            if not isinstance(row, dict):
                continue
            project_id = row.get("id")
            sdk_key = row.get("sdk_key")
            if isinstance(project_id, str) and project_id and isinstance(sdk_key, str) and sdk_key:
                project_map[project_id] = sdk_key

    response_keys: list[dict[str, Any]] = []
    for row in keys:
        if not isinstance(row, dict):
            continue
        key_id = row.get("id")
        name = row.get("name")
        prefix = row.get("key_prefix")
        project_id = row.get("project_id")
        if not isinstance(key_id, str) or not key_id:
            continue
        response_keys.append(
            {
                "id": key_id,
                "name": name if isinstance(name, str) else "default",
                "key_prefix": prefix if isinstance(prefix, str) else "",
                "project_id": project_id if isinstance(project_id, str) else None,
                "project_sdk_key": project_map.get(project_id) if isinstance(project_id, str) else None,
                "created_at": row.get("created_at"),
                "last_used_at": row.get("last_used_at"),
                "expires_at": row.get("expires_at"),
                "revoked_at": row.get("revoked_at"),
                "active": row.get("revoked_at") is None,
            }
        )

    return {"keys": response_keys}


@app.post("/api/keys")
async def create_api_key(_payload: CreateApiKeyRequest, request: Request):
    _require_clerk_session(request)
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    user_id_filter = parse.quote(user_id, safe="")
    sdk_key_filter = parse.quote(_payload.sdk_key, safe="")
    projects_endpoint = (
        f"{supabase_url}/rest/v1/projects"
        f"?user_id=eq.{user_id_filter}&sdk_key=eq.{sdk_key_filter}&select=id,sdk_key&limit=1"
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

    raw_key, key_prefix, secret = _generate_watchllm_api_key()
    key_hash = hash_watchllm_api_key_secret(secret)
    key_id = str(uuid4())

    expires_at: str | None = None
    if _payload.expires_in_days is not None:
        expires_at = (
            datetime.now(timezone.utc) + timedelta(days=_payload.expires_in_days)
        ).strftime("%Y-%m-%dT%H:%M:%SZ")

    api_keys_endpoint = f"{supabase_url}/rest/v1/api_keys"
    _supabase_request(
        "POST",
        api_keys_endpoint,
        {
            "id": key_id,
            "user_id": user_id,
            "project_id": project_id,
            "name": _payload.name,
            "key_prefix": key_prefix,
            "key_hash": key_hash,
            "expires_at": expires_at,
        },
        service_role_key,
    )

    return {
        "id": key_id,
        "name": _payload.name,
        "sdk_key": _payload.sdk_key,
        "api_key": raw_key,
        "key_prefix": key_prefix,
        "expires_at": expires_at,
    }


@app.delete("/api/keys/{key_id}")
async def revoke_api_key(key_id: UUID, request: Request):
    _require_clerk_session(request)
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    key_id_filter = parse.quote(str(key_id), safe="")
    user_id_filter = parse.quote(user_id, safe="")
    revoke_endpoint = (
        f"{supabase_url}/rest/v1/api_keys"
        f"?id=eq.{key_id_filter}&user_id=eq.{user_id_filter}&revoked_at=is.null"
    )
    rows = _supabase_request_json(
        "PATCH",
        revoke_endpoint,
        {"revoked_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")},
        service_role_key,
        prefer="return=representation",
    )

    if not isinstance(rows, list) or len(rows) == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found",
        )

    return {"ok": True}


@app.get("/api/me")
async def current_user(request: Request):
    """Sanity endpoint for protected route auth wiring."""
    auth_kind = getattr(request.state, "auth_kind", None)
    if auth_kind == "api_key":
        return {
            "auth_kind": "api_key",
            "user_id": getattr(request.state, "api_user_id", None),
            "project_id": getattr(request.state, "api_project_id", None),
        }

    return {
        "auth_kind": "clerk",
        "user_id": getattr(request.state, "user_id", None),
    }


@app.get("/api/simulations")
async def list_simulations(request: Request):
    """Return all simulations for the authenticated user, newest first."""
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    user_id_filter = parse.quote(user_id, safe="")
    endpoint = (
        f"{supabase_url}/rest/v1/simulations"
        f"?user_id=eq.{user_id_filter}"
        f"&select=id,status,severity_score,total_runs,failed_runs,created_at,config"
        f"&order=created_at.desc"
    )
    rows = _supabase_fetch_json(endpoint, service_role_key)
    return rows if isinstance(rows, list) else []


@app.post("/api/projects")
async def create_project(_payload: CreateProjectRequest, request: Request):
    """Create a new project for the authenticated user and return a one-time sdk_key."""
    supabase_url, service_role_key = _get_supabase_admin_config()
    user_id, _ = _resolve_authenticated_user(request, supabase_url, service_role_key)

    # Generate a unique sk_proj_ key
    alphabet = string.ascii_letters + string.digits
    suffix = "".join(secrets.choice(alphabet) for _ in range(26))
    sdk_key = f"sk_proj_{suffix}"
    project_id = str(uuid4())

    projects_endpoint = f"{supabase_url}/rest/v1/projects"
    _supabase_request(
        "POST",
        projects_endpoint,
        {
            "id": project_id,
            "user_id": user_id,
            "name": _payload.name,
            "sdk_key": sdk_key,
        },
        service_role_key,
    )

    return {
        "project_id": project_id,
        "name": _payload.name,
        "sdk_key": sdk_key,
    }
