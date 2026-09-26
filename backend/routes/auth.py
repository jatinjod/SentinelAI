import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.github_connection import GitHubConnection
from models.user import User
from utils.passwords import hash_password, verify_password
from utils.session import (
    clear_session_cookie,
    create_session_token,
    get_current_user,
    set_session_cookie,
)


router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Auth"],
)


_EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    confirm_password: str


class LoginRequest(BaseModel):
    email: str
    password: str


def _normalize_email(value: str) -> str:
    return value.strip().lower()


def _validate_email(email: str) -> str:
    normalized = _normalize_email(email)
    if not _EMAIL_RE.match(normalized):
        raise HTTPException(
            status_code=422,
            detail="Please enter a valid email address.",
        )
    return normalized


def _validate_password(password: str) -> None:
    if len(password) < 8:
        raise HTTPException(
            status_code=422,
            detail="Password must be at least 8 characters long.",
        )


def _user_payload(user: User, connection: GitHubConnection | None):
    return {
        "id": user.id,
        "github_id": user.github_id,
        "username": user.username,
        "email": user.email,
        "github_connected": connection is not None,
    }


@router.get("/me")
def get_current_session_user(
    request: Request,
    db: Session = Depends(get_db),
):
    try:
        user = get_current_user(request, db)
    except Exception:
        return {
            "authenticated": False,
            "user": None,
            "github_connected": False,
        }

    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
        .first()
    )

    return {
        "authenticated": True,
        "user": _user_payload(user, connection),
        "github_connected": connection is not None,
    }


@router.post("/register")
def register(
    payload: RegisterRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    name = payload.name.strip()
    email = _validate_email(payload.email)

    if len(name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Please enter your name.",
        )

    if payload.password != payload.confirm_password:
        raise HTTPException(
            status_code=422,
            detail="Passwords do not match.",
        )

    _validate_password(payload.password)

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user is not None:
        if existing_user.password_hash:
            raise HTTPException(
                status_code=409,
                detail="An account with this email already exists. Please sign in.",
            )

        raise HTTPException(
            status_code=409,
            detail="This email is already linked to a GitHub account. Use Continue with GitHub.",
        )

    username_base = re.sub(r"[^a-zA-Z0-9_-]+", "-", name).strip("-")
    username = username_base or email.split("@", 1)[0]

    user = User(
        github_id=None,
        username=username[:100],
        email=email,
        password_hash=hash_password(payload.password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    session_token = create_session_token(user.id)
    set_session_cookie(response, user.id, session_token)

    return {
        "message": "Account created successfully.",
        "session_token": session_token,
        "user": _user_payload(user, None),
    }


@router.post("/login")
def login(
    payload: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    email = _validate_email(payload.email)

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if user is None or not user.password_hash:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    if not verify_password(payload.password, user.password_hash):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password.",
        )

    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
        .first()
    )

    session_token = create_session_token(user.id)
    set_session_cookie(response, user.id, session_token)

    return {
        "message": "Signed in successfully.",
        "session_token": session_token,
        "user": _user_payload(user, connection),
    }


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {
        "message": "Logged out successfully."
    }
