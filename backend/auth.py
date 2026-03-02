from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, Request, status
from jose import JWTError, jwt

from backend.config import settings

logger = logging.getLogger(__name__)

_jwks_cache: dict | None = None


@dataclass(frozen=True)
class CurrentUser:
    id: str
    email: Optional[str] = None


def _extract_bearer_token(request: Request) -> str | None:
    auth = request.headers.get("Authorization") or ""
    if not auth.lower().startswith("bearer "):
        return None
    return auth.split(" ", 1)[1].strip() or None


async def _fetch_jwks() -> dict:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache

    if not settings.supabase_project_ref:
        return {}

    url = f"https://{settings.supabase_project_ref}.supabase.co/auth/v1/.well-known/jwks.json"
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            _jwks_cache = resp.json()
            return _jwks_cache
    except Exception as e:
        logger.warning("Failed to fetch JWKS: %s", e)
        return {}


async def get_current_user(request: Request) -> CurrentUser:
    token = _extract_bearer_token(request)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing bearer token")

    try:
        header = jwt.get_unverified_header(token)
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=f"Malformed token: {e}")

    alg = header.get("alg", "")
    payload: dict | None = None

    if alg == "HS256" and settings.supabase_jwt_secret:
        try:
            payload = jwt.decode(
                token, settings.supabase_jwt_secret,
                algorithms=["HS256"], options={"verify_aud": False},
            )
        except JWTError:
            pass

    if payload is None and alg in ("RS256", "ES256"):
        jwks = await _fetch_jwks()
        if jwks:
            try:
                payload = jwt.decode(
                    token, jwks,
                    algorithms=[alg], options={"verify_aud": False},
                )
            except JWTError as e:
                logger.debug("JWKS %s decode failed: %s", alg, e)

    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token (no sub)")

    email = payload.get("email")
    return CurrentUser(id=str(user_id), email=str(email) if email else None)


CurrentUserDep = Depends(get_current_user)
