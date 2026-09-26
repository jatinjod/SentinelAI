import base64
import hashlib
import hmac
import secrets
import time
from typing import Optional

from fastapi import HTTPException, Request
from sqlalchemy.orm import Session

from config import APP_ENV, GITHUB_ENCRYPTION_KEY, SECRET_KEY, SESSION_COOKIE_NAME
from models.user import User


def _secret() -> bytes:
    secret = SECRET_KEY or GITHUB_ENCRYPTION_KEY
    if not secret:
        raise RuntimeError("A session secret is required.")
    return secret.encode("utf-8")


def _encode(value: str) -> str:
    return base64.urlsafe_b64encode(value.encode("utf-8")).decode("ascii").rstrip("=")


def _decode(value: str) -> str:
    padded = value + "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii")).decode("utf-8")


def _sign(payload: str) -> str:
    encoded = _encode(payload)
    signature = hmac.new(
        _secret(),
        encoded.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    return f"{encoded}.{signature}"


def _verify(token: str) -> Optional[str]:
    try:
        encoded, signature = token.split(".", 1)
        expected = hmac.new(
            _secret(),
            encoded.encode("ascii"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected):
            return None

        return _decode(encoded)
    except (ValueError, UnicodeDecodeError, base64.binascii.Error):
        return None


def create_oauth_state(user_id: int | None = None) -> str:
    nonce = secrets.token_urlsafe(32)
    expires_at = int(time.time()) + 600
    link_id = str(user_id or 0)
    return _sign(f"oauth|{expires_at}|{nonce}|{link_id}")


def verify_oauth_state(state: str) -> tuple[str, int | None] | None:
    payload = _verify(state)
    if not payload:
        return None

    try:
        purpose, expires_at, nonce, link_id = payload.split("|", 3)
        if purpose != "oauth":
            return None
        if int(expires_at) < int(time.time()):
            return None

        linked_user_id = int(link_id) if link_id != "0" else None
        return nonce, linked_user_id
    except (ValueError, TypeError):
        return None


def create_session_token(user_id: int) -> str:
    expires_at = int(time.time()) + (60 * 60 * 24 * 7)
    nonce = secrets.token_urlsafe(16)
    return _sign(f"session|{user_id}|{expires_at}|{nonce}")


def get_user_id_from_session(request: Request) -> Optional[int]:
    # Prefer the bearer token. This avoids stale cross-origin cookies
    # overriding the current frontend session.
    authorization = request.headers.get("Authorization", "")
    token = None

    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if not token:
        token = request.cookies.get(SESSION_COOKIE_NAME)

    if not token:
        return None

    payload = _verify(token)
    if not payload:
        return None

    try:
        purpose, user_id, expires_at, _nonce = payload.split("|", 3)
        if purpose != "session":
            return None
        if int(expires_at) < int(time.time()):
            return None
        return int(user_id)
    except (ValueError, TypeError):
        return None


def get_current_user(
    request: Request,
    db: Session,
) -> User:
    user_id = get_user_id_from_session(request)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Please sign in.",
        )

    user = db.get(User, user_id)

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="Session is no longer valid. Please sign in again.",
        )

    if hasattr(user, "is_active") and not user.is_active:
        raise HTTPException(
            status_code=403,
            detail="Your SentinelAI account has been disabled. Contact an administrator.",
        )

    return user


def set_session_cookie(
    response,
    user_id: int,
    token: Optional[str] = None,
) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token or create_session_token(user_id),
        httponly=True,
        secure=APP_ENV == "production",
        samesite="lax",
        max_age=60 * 60 * 24 * 7,
        path="/",
    )


def clear_session_cookie(response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
    )
