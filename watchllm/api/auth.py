from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from dataclasses import dataclass
from functools import lru_cache
from typing import Any
from urllib import error, parse, request as urllib_request

import jwt
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class AuthError(Exception):
    """Raised when an auth token is missing or invalid."""


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    issuer: str


@dataclass(frozen=True)
class ApiKeyContext:
    user_id: str
    tier: str
    project_id: str | None
    key_id: str


WATCHLLM_API_KEY_PREFIX = "wlk_"
WATCHLLM_API_KEY_HEADER = "X-WatchLLM-Api-Key"


def _pad_b64(value: str) -> str:
    return value + "=" * ((4 - len(value) % 4) % 4)


def _safe_parse_iso(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=timezone.utc)
        return parsed
    except ValueError:
        return None


def _normalize_tier(value: Any) -> str:
    if not isinstance(value, str):
        return "free"
    lowered = value.strip().lower()
    if lowered in {"free", "pro", "team"}:
        return lowered
    return "free"


def _get_supabase_admin_config() -> tuple[str, str]:
    supabase_url = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    if not supabase_url or not service_role_key:
        raise AuthError("API key auth is unavailable because server config is incomplete")

    return supabase_url.rstrip("/"), service_role_key


def _supabase_fetch_json(endpoint: str, service_role_key: str) -> Any:
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
        with urllib_request.urlopen(req, timeout=12) as response:
            if response.status >= 400:
                raise AuthError("API key verification failed")
            payload = response.read().decode("utf-8")
            return json.loads(payload or "null")
    except (error.HTTPError, error.URLError, json.JSONDecodeError) as exc:
        raise AuthError("API key verification failed") from exc


def _supabase_patch_json(endpoint: str, body: dict[str, Any], service_role_key: str) -> None:
    req = urllib_request.Request(
        endpoint,
        method="PATCH",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Prefer": "return=minimal",
        },
    )
    try:
        with urllib_request.urlopen(req, timeout=12) as response:
            if response.status >= 400:
                raise AuthError("API key verification failed")
    except (error.HTTPError, error.URLError) as exc:
        raise AuthError("API key verification failed") from exc


def hash_watchllm_api_key_secret(secret: str) -> str:
    pepper = os.getenv("WATCHLLM_API_KEY_PEPPER", "")
    payload = f"{pepper}:{secret}".encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _extract_watchllm_api_key_parts(api_key: str) -> tuple[str, str]:
    raw = api_key.strip()
    if not raw.startswith(WATCHLLM_API_KEY_PREFIX):
        raise AuthError("Invalid WatchLLM API key")

    pieces = raw.split("_")
    if len(pieces) != 4:
        raise AuthError("Invalid WatchLLM API key")

    marker, environment, key_suffix, secret = pieces
    if marker != "wlk" or environment not in {"live", "test"}:
        raise AuthError("Invalid WatchLLM API key")
    if len(key_suffix) != 10 or not key_suffix.isalnum():
        raise AuthError("Invalid WatchLLM API key")
    if len(secret) < 32 or len(secret) > 128 or not secret.isalnum():
        raise AuthError("Invalid WatchLLM API key")

    return f"wlk_{environment}_{key_suffix}", secret


def verify_watchllm_api_key(api_key: str) -> ApiKeyContext:
    key_prefix, secret = _extract_watchllm_api_key_parts(api_key)
    supabase_url, service_role_key = _get_supabase_admin_config()

    key_prefix_filter = parse.quote(key_prefix, safe="")
    keys_endpoint = (
        f"{supabase_url}/rest/v1/api_keys"
        f"?key_prefix=eq.{key_prefix_filter}&revoked_at=is.null"
        f"&select=id,user_id,project_id,key_hash,expires_at&limit=5"
    )
    key_rows = _supabase_fetch_json(keys_endpoint, service_role_key)
    if not isinstance(key_rows, list) or len(key_rows) == 0:
        raise AuthError("Invalid WatchLLM API key")

    expected_hash = hash_watchllm_api_key_secret(secret)
    selected_row: dict[str, Any] | None = None
    now = datetime.now(timezone.utc)

    for row in key_rows:
        if not isinstance(row, dict):
            continue
        stored_hash = row.get("key_hash")
        if not isinstance(stored_hash, str) or not stored_hash:
            continue
        if not hmac.compare_digest(stored_hash, expected_hash):
            continue

        expires_at = _safe_parse_iso(row.get("expires_at"))
        if expires_at is not None and expires_at <= now:
            raise AuthError("WatchLLM API key has expired")

        selected_row = row
        break

    if selected_row is None:
        raise AuthError("Invalid WatchLLM API key")

    key_id = selected_row.get("id")
    user_id = selected_row.get("user_id")
    project_id = selected_row.get("project_id")
    if not isinstance(key_id, str) or not key_id or not isinstance(user_id, str) or not user_id:
        raise AuthError("Invalid WatchLLM API key")

    user_id_filter = parse.quote(user_id, safe="")
    users_endpoint = (
        f"{supabase_url}/rest/v1/users"
        f"?id=eq.{user_id_filter}&select=id,tier&limit=1"
    )
    users = _supabase_fetch_json(users_endpoint, service_role_key)
    if not isinstance(users, list) or len(users) == 0:
        raise AuthError("Invalid WatchLLM API key")

    user_row = users[0]
    if not isinstance(user_row, dict) or not isinstance(user_row.get("id"), str):
        raise AuthError("Invalid WatchLLM API key")

    key_id_filter = parse.quote(key_id, safe="")
    touch_endpoint = f"{supabase_url}/rest/v1/api_keys?id=eq.{key_id_filter}"
    try:
        _supabase_patch_json(
            touch_endpoint,
            {"last_used_at": now.strftime("%Y-%m-%dT%H:%M:%SZ")},
            service_role_key,
        )
    except AuthError:
        # Do not fail auth if usage telemetry update fails.
        pass

    return ApiKeyContext(
        user_id=user_id,
        tier=_normalize_tier(user_row.get("tier")),
        project_id=project_id if isinstance(project_id, str) else None,
        key_id=key_id,
    )


def _decode_jwt_payload_noverify(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise AuthError("Malformed bearer token")
    try:
        payload_json = base64.urlsafe_b64decode(_pad_b64(parts[1])).decode("utf-8")
        payload = json.loads(payload_json)
    except Exception as exc:  # pragma: no cover - defensive parse handling
        raise AuthError("Malformed bearer token payload") from exc

    if not isinstance(payload, dict):
        raise AuthError("Malformed bearer token payload")
    return payload


@lru_cache(maxsize=8)
def _jwks_client(jwks_url: str) -> jwt.PyJWKClient:
    return jwt.PyJWKClient(jwks_url)


def verify_clerk_session_token(token: str) -> AuthContext:
    payload_hint = _decode_jwt_payload_noverify(token)
    configured_issuer = os.getenv("CLERK_ISSUER")
    token_issuer = payload_hint.get("iss")
    issuer = configured_issuer or token_issuer

    if not isinstance(issuer, str) or not issuer.startswith("https://"):
        raise AuthError(
            "Unable to verify Clerk token issuer. Set CLERK_ISSUER or provide a valid Clerk session token."
        )

    jwks_url = f"{issuer.rstrip('/')}/.well-known/jwks.json"
    try:
        signing_key = _jwks_client(jwks_url).get_signing_key_from_jwt(token)
        verified_payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"require": ["exp", "iat", "sub", "iss"], "verify_aud": False},
            issuer=issuer,
        )
    except jwt.PyJWTError as exc:
        raise AuthError("Invalid or expired Clerk session token") from exc

    user_id = verified_payload.get("sub")
    if not isinstance(user_id, str) or not user_id:
        raise AuthError("Clerk token missing subject claim")

    return AuthContext(user_id=user_id, issuer=issuer)


class ClerkAuthMiddleware(BaseHTTPMiddleware):
    """Require Clerk Bearer auth or WatchLLM API key auth for non-webhook API routes."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Enforce auth for all API routes except webhooks.
        if path.startswith("/api/") and not path.startswith("/api/webhooks/"):
            auth_header = request.headers.get("Authorization", "")
            bearer_token = ""
            if auth_header.startswith("Bearer "):
                bearer_token = auth_header[len("Bearer ") :].strip()

            api_key_header = request.headers.get(WATCHLLM_API_KEY_HEADER, "").strip()
            api_key_candidate = api_key_header
            if not api_key_candidate and bearer_token.startswith(WATCHLLM_API_KEY_PREFIX):
                api_key_candidate = bearer_token

            if api_key_candidate:
                try:
                    api_key_ctx = verify_watchllm_api_key(api_key_candidate)
                except AuthError as exc:
                    return JSONResponse({"detail": str(exc)}, status_code=401)

                request.state.auth_kind = "api_key"
                request.state.api_user_id = api_key_ctx.user_id
                request.state.api_user_tier = api_key_ctx.tier
                request.state.api_project_id = api_key_ctx.project_id
                request.state.api_key_id = api_key_ctx.key_id
            else:
                if not bearer_token:
                    return JSONResponse(
                        {
                            "detail": (
                                "Missing credentials. Provide Authorization: Bearer <Clerk JWT> "
                                "or X-WatchLLM-Api-Key."
                            )
                        },
                        status_code=401,
                    )

                try:
                    auth_ctx = verify_clerk_session_token(bearer_token)
                except AuthError as exc:
                    return JSONResponse({"detail": str(exc)}, status_code=401)

                request.state.auth_kind = "clerk"
                request.state.user_id = auth_ctx.user_id
                request.state.auth_issuer = auth_ctx.issuer

        return await call_next(request)
