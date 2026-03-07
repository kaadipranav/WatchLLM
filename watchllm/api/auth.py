from __future__ import annotations

import base64
import json
import os
from dataclasses import dataclass
from functools import lru_cache
from typing import Any

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


def _pad_b64(value: str) -> str:
    return value + "=" * ((4 - len(value) % 4) % 4)


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
    """Require Clerk Bearer auth for all non-webhook API routes."""

    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        # Enforce auth for all API routes except webhooks.
        if path.startswith("/api/") and not path.startswith("/api/webhooks/"):
            auth_header = request.headers.get("Authorization", "")
            if not auth_header.startswith("Bearer "):
                return JSONResponse(
                    {"detail": "Missing Authorization Bearer token"},
                    status_code=401,
                )

            token = auth_header[len("Bearer ") :].strip()
            if not token:
                return JSONResponse(
                    {"detail": "Missing Authorization Bearer token"},
                    status_code=401,
                )

            try:
                auth_ctx = verify_clerk_session_token(token)
            except AuthError as exc:
                return JSONResponse({"detail": str(exc)}, status_code=401)

            request.state.user_id = auth_ctx.user_id
            request.state.auth_issuer = auth_ctx.issuer

        return await call_next(request)
