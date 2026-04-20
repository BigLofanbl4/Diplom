from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.config import settings


def encode_jwt(payload: dict[str, Any], expire_timedelta: timedelta | None = None) -> str:
    expire_delta = expire_timedelta or timedelta(minutes=settings.auth_jwt.access_token_expire_minutes)
    now = datetime.now(timezone.utc)
    to_encode = {
        **payload,
        "iat": int(now.timestamp()),
        "exp": int((now + expire_delta).timestamp()),
    }
    return jwt.encode(to_encode, settings.auth_jwt.secret_key, algorithm=settings.auth_jwt.algorithm)


def decode_jwt(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.auth_jwt.secret_key,
        algorithms=[settings.auth_jwt.algorithm],
    )
