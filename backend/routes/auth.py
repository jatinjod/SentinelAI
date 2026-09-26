import re

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.fix import Fix
from models.github_connection import GitHubConnection
from models.pull_request import PullRequest
from models.repository import Repository
from models.scan import Scan
from models.user import User
from models.vulnerability import Vulnerability
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


class ProfileUpdateRequest(BaseModel):
    name: str
    email: str


class PasswordChangeRequest(BaseModel):
    current_password: str | None = None
    new_password: str
    confirm_password: str


class AccountDeleteRequest(BaseModel):
    confirmation: str
    password: str | None = None


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
        "name": user.display_name or user.username,
        "email": user.email,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "has_password": bool(user.password_hash),
        "github_connected": connection is not None,
        "github_username": connection.username if connection else None,
    }


def _current_connection(user: User, db: Session) -> GitHubConnection | None:
    return (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
        .first()
    )


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

    connection = _current_connection(user, db)

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
        display_name=name[:100],
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

    connection = _current_connection(user, db)

    session_token = create_session_token(user.id)
    set_session_cookie(response, user.id, session_token)

    return {
        "message": "Signed in successfully.",
        "session_token": session_token,
        "user": _user_payload(user, connection),
    }


@router.patch("/profile")
def update_profile(
    payload: ProfileUpdateRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    name = payload.name.strip()
    email = _validate_email(payload.email)

    if len(name) < 2:
        raise HTTPException(
            status_code=422,
            detail="Please enter your name.",
        )

    existing = (
        db.query(User)
        .filter(
            User.email == email,
            User.id != user.id,
        )
        .first()
    )

    if existing is not None:
        raise HTTPException(
            status_code=409,
            detail="That email address is already in use.",
        )

    user.display_name = name[:100]
    user.email = email
    db.commit()
    db.refresh(user)

    connection = _current_connection(user, db)

    return {
        "message": "Profile updated successfully.",
        "user": _user_payload(user, connection),
    }


@router.patch("/password")
def change_password(
    payload: PasswordChangeRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    if payload.new_password != payload.confirm_password:
        raise HTTPException(
            status_code=422,
            detail="Passwords do not match.",
        )

    _validate_password(payload.new_password)

    if user.password_hash:
        if not payload.current_password:
            raise HTTPException(
                status_code=422,
                detail="Enter your current password.",
            )

        if not verify_password(
            payload.current_password,
            user.password_hash,
        ):
            raise HTTPException(
                status_code=401,
                detail="Current password is incorrect.",
            )

    user.password_hash = hash_password(payload.new_password)
    db.commit()
    db.refresh(user)

    session_token = create_session_token(user.id)
    set_session_cookie(response, user.id, session_token)

    connection = _current_connection(user, db)

    return {
        "message": "Password updated successfully.",
        "session_token": session_token,
        "user": _user_payload(user, connection),
    }


@router.delete("/github")
def disconnect_github(
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    if not user.password_hash:
        raise HTTPException(
            status_code=409,
            detail="Set an email password before disconnecting GitHub so you do not lose access to your account.",
        )

    connection = _current_connection(user, db)
    if connection is None:
        return {"message": "GitHub is already disconnected."}

    db.delete(connection)
    db.commit()

    return {
        "message": "GitHub disconnected successfully."
    }


@router.delete("/account")
def delete_account(
    payload: AccountDeleteRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
):
    if payload.confirmation.strip().upper() != "DELETE":
        raise HTTPException(
            status_code=422,
            detail='Type "DELETE" to confirm account deletion.',
        )

    user = get_current_user(request, db)

    if user.password_hash:
        if not payload.password:
            raise HTTPException(
                status_code=422,
                detail="Enter your current password to delete the account.",
            )

        if not verify_password(payload.password, user.password_hash):
            raise HTTPException(
                status_code=401,
                detail="Current password is incorrect.",
            )

    repository_ids = [
        row.id
        for row in db.query(Repository.id)
        .filter(Repository.user_id == user.id)
        .all()
    ]

    scan_ids = []
    if repository_ids:
        scan_ids = [
            row.id
            for row in db.query(Scan.id)
            .filter(Scan.repository_id.in_(repository_ids))
            .all()
        ]

    vulnerability_ids = []
    if scan_ids:
        vulnerability_ids = [
            row.id
            for row in db.query(Vulnerability.id)
            .filter(Vulnerability.scan_id.in_(scan_ids))
            .all()
        ]

    fix_ids = []
    if vulnerability_ids:
        fix_ids = [
            row.id
            for row in db.query(Fix.id)
            .filter(Fix.vulnerability_id.in_(vulnerability_ids))
            .all()
        ]

    if repository_ids:
        db.query(PullRequest).filter(
            PullRequest.repository_id.in_(repository_ids)
        ).delete(synchronize_session=False)

    if fix_ids:
        db.query(PullRequest).filter(
            PullRequest.fix_id.in_(fix_ids)
        ).delete(synchronize_session=False)
        db.query(Fix).filter(
            Fix.id.in_(fix_ids)
        ).delete(synchronize_session=False)

    if vulnerability_ids:
        db.query(Vulnerability).filter(
            Vulnerability.id.in_(vulnerability_ids)
        ).delete(synchronize_session=False)

    if scan_ids:
        db.query(Scan).filter(
            Scan.id.in_(scan_ids)
        ).delete(synchronize_session=False)

    if repository_ids:
        db.query(Repository).filter(
            Repository.id.in_(repository_ids)
        ).delete(synchronize_session=False)

    db.query(GitHubConnection).filter(
        GitHubConnection.user_id == user.id
    ).delete(synchronize_session=False)

    db.delete(user)
    db.commit()

    clear_session_cookie(response)

    return {
        "message": "Your SentinelAI account and stored application data were deleted successfully."
    }


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {
        "message": "Logged out successfully."
    }
