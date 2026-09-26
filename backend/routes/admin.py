from __future__ import annotations

from collections import Counter

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from config import ADMIN_EMAIL, ADMIN_GITHUB_ID
from database.connection import get_db
from models.fix import Fix
from models.github_connection import GitHubConnection
from models.pull_request import PullRequest
from models.repository import Repository
from models.scan import Scan
from models.user import User
from models.vulnerability import Vulnerability
from utils.session import get_current_user

router = APIRouter(prefix="/api/v1/admin", tags=["Admin"])


class UserStatusRequest(BaseModel):
    is_active: bool


class UserRoleRequest(BaseModel):
    is_admin: bool


def _is_bootstrap_admin(user: User) -> bool:
    email_match = bool(ADMIN_EMAIL) and bool(user.email) and user.email.strip().lower() == ADMIN_EMAIL
    github_match = bool(ADMIN_GITHUB_ID) and bool(user.github_id) and str(user.github_id) == ADMIN_GITHUB_ID
    return email_match or github_match


def _require_admin(request: Request, db: Session) -> User:
    user = get_current_user(request, db)
    if not getattr(user, "is_active", True):
        raise HTTPException(status_code=403, detail="Your account is disabled.")
    if not (getattr(user, "is_admin", False) or _is_bootstrap_admin(user)):
        raise HTTPException(status_code=403, detail="Administrator access required.")
    return user


def _serialize_user(user: User, db: Session) -> dict:
    repo_count = db.query(func.count(Repository.id)).filter(Repository.user_id == user.id).scalar() or 0
    scan_count = (
        db.query(func.count(Scan.id))
        .join(Repository, Repository.id == Scan.repository_id)
        .filter(Repository.user_id == user.id)
        .scalar()
        or 0
    )
    connected = (
        db.query(GitHubConnection.id)
        .filter(GitHubConnection.user_id == user.id)
        .first()
        is not None
    )
    return {
        "id": user.id,
        "name": getattr(user, "display_name", None) or user.username,
        "username": user.username,
        "email": user.email,
        "github_id": user.github_id,
        "github_connected": connected,
        "is_admin": bool(getattr(user, "is_admin", False) or _is_bootstrap_admin(user)),
        "is_active": bool(getattr(user, "is_active", True)),
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "repository_count": repo_count,
        "scan_count": scan_count,
    }


@router.get("/me")
def admin_me(request: Request, db: Session = Depends(get_db)):
    user = _require_admin(request, db)
    return {"is_admin": True, "user": _serialize_user(user, db)}


@router.get("/overview")
def overview(request: Request, db: Session = Depends(get_db)):
    _require_admin(request, db)

    def count(query):
        try:
            return int(query.scalar() or 0)
        except Exception:
            db.rollback()
            return 0

    total_users = count(db.query(func.count(User.id)))
    active_users = count(db.query(func.count(User.id)).filter(User.is_active.is_(True)))
    admins = count(db.query(func.count(User.id)).filter(User.is_admin.is_(True)))
    github_users = count(db.query(func.count(GitHubConnection.id)))
    total_repositories = count(db.query(func.count(Repository.id)))
    total_scans = count(db.query(func.count(Scan.id)))
    completed_scans = count(db.query(func.count(Scan.id)).filter(Scan.status == "completed"))
    total_vulnerabilities = count(db.query(func.count(Vulnerability.id)))
    total_fixes = count(db.query(func.count(Fix.id)))
    applied_fixes = count(db.query(func.count(Fix.id)).filter(Fix.status == "applied"))
    total_prs = count(db.query(func.count(PullRequest.id)))
    merged_prs = count(db.query(func.count(PullRequest.id)).filter(PullRequest.status == "merged"))

    try:
        severity_rows = (
            db.query(Vulnerability.severity, func.count(Vulnerability.id))
            .group_by(Vulnerability.severity)
            .all()
        )
        severity = {str(level).lower(): int(count_value) for level, count_value in severity_rows}
    except Exception:
        db.rollback()
        severity = {}

    try:
        recent_scans = (
            db.query(Scan, Repository, User)
            .join(Repository, Repository.id == Scan.repository_id)
            .join(User, User.id == Repository.user_id)
            .order_by(Scan.created_at.desc())
            .limit(8)
            .all()
        )
    except Exception:
        db.rollback()
        recent_scans = []

    try:
        recent_prs = (
            db.query(PullRequest, Repository, User)
            .join(Repository, Repository.id == PullRequest.repository_id)
            .join(User, User.id == Repository.user_id)
            .order_by(PullRequest.created_at.desc())
            .limit(8)
            .all()
        )
    except Exception:
        db.rollback()
        recent_prs = []

    try:
        recent_users = db.query(User).order_by(User.created_at.desc()).limit(8).all()
        serialized_users = [_serialize_user(user, db) for user in recent_users]
    except Exception:
        db.rollback()
        serialized_users = []

    return {
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "admins": admins,
            "github_users": github_users,
            "repositories": total_repositories,
            "scans": total_scans,
            "completed_scans": completed_scans,
            "vulnerabilities": total_vulnerabilities,
            "fixes": total_fixes,
            "applied_fixes": applied_fixes,
            "pull_requests": total_prs,
            "merged_prs": merged_prs,
        },
        "severity": severity,
        "recent_users": serialized_users,
        "recent_scans": [
            {
                "id": scan.id,
                "repository": repository.full_name,
                "user": getattr(user, "display_name", None) or user.username,
                "status": scan.status,
                "created_at": scan.created_at.isoformat() if scan.created_at else None,
            }
            for scan, repository, user in recent_scans
        ],
        "recent_pull_requests": [
            {
                "id": pr.id,
                "repository": repository.full_name,
                "user": getattr(user, "display_name", None) or user.username,
                "status": pr.status,
                "title": pr.title,
                "url": pr.url,
                "created_at": pr.created_at.isoformat() if pr.created_at else None,
            }
            for pr, repository, user in recent_prs
        ],
        "recent_fixes": [],
    }


@router.get("/users")
def list_users(request: Request, search: str = "", db: Session = Depends(get_db)):
    _require_admin(request, db)
    query = db.query(User).order_by(User.created_at.desc())
    term = search.strip().lower()
    if term:
        like = f"%{term}%"
        query = query.filter(
            func.lower(User.username).like(like)
            | func.lower(func.coalesce(User.email, "")).like(like)
            | func.lower(func.coalesce(User.display_name, "")).like(like)
        )
    users = query.limit(100).all()
    return {"count": len(users), "users": [_serialize_user(user, db) for user in users]}


@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: int,
    payload: UserStatusRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    admin = _require_admin(request, db)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot disable your own admin account.")
    user.is_active = payload.is_active
    db.commit()
    db.refresh(user)
    return {"message": "User status updated.", "user": _serialize_user(user, db)}


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    payload: UserRoleRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    admin = _require_admin(request, db)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    if user.id == admin.id and not payload.is_admin:
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role.")
    user.is_admin = payload.is_admin
    db.commit()
    db.refresh(user)
    return {"message": "User role updated.", "user": _serialize_user(user, db)}


@router.delete("/users/{user_id}/github")
def revoke_user_github(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    _require_admin(request, db)
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found.")
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
        .first()
    )
    if connection is None:
        return {"message": "GitHub is already disconnected.", "user": _serialize_user(user, db)}
    db.delete(connection)
    user.github_id = None
    db.commit()
    db.refresh(user)
    return {"message": "GitHub connection revoked.", "user": _serialize_user(user, db)}
