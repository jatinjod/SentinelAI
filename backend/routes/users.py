from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from database.connection import get_db
from models.user import User


router = APIRouter(
    prefix="/api/v1/users",
    tags=["Users"],
)


class UserCreate(BaseModel):
    github_id: str
    username: str
    email: str | None = None


@router.post("/")
def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
):
    user = User(
        github_id=user_data.github_id,
        username=user_data.username,
        email=user_data.email,
    )

    db.add(user)

    try:
        db.commit()
        db.refresh(user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=409,
            detail="User with this GitHub ID already exists.",
        )

    return {
        "id": user.id,
        "github_id": user.github_id,
        "username": user.username,
        "email": user.email,
    }