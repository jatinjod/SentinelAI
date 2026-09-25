from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session

from database.connection import get_db
from models.github_connection import GitHubConnection
from utils.session import (
    clear_session_cookie,
    get_current_user,
)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Auth"],
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

    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
        .first()
    )

    return {
        "authenticated": True,
        "github_connected": connection is not None,
        "user": {
            "id": user.id,
            "github_id": user.github_id,
            "username": user.username,
            "email": user.email,
        },
    }


@router.post("/logout")
def logout(response: Response):
    clear_session_cookie(response)
    return {"message": "Logged out successfully."}
