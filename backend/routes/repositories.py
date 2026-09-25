from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.repository import Repository
from utils.session import get_current_user


router = APIRouter(
    prefix="/api/v1/repositories",
    tags=["Repositories"],
)


class RepositoryCreate(BaseModel):
    github_repo_id: str
    name: str
    full_name: str
    clone_url: str


@router.post("/")
def create_repository(
    repo_data: RepositoryCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    existing = (
        db.query(Repository)
        .filter(
            Repository.user_id == user.id,
            Repository.github_repo_id == repo_data.github_repo_id,
        )
        .first()
    )

    if existing is not None:
        return {
            "id": existing.id,
            "user_id": existing.user_id,
            "github_repo_id": existing.github_repo_id,
            "name": existing.name,
            "full_name": existing.full_name,
            "clone_url": existing.clone_url,
        }

    repository = Repository(
        user_id=user.id,
        github_repo_id=repo_data.github_repo_id,
        name=repo_data.name,
        full_name=repo_data.full_name,
        clone_url=repo_data.clone_url,
    )

    db.add(repository)
    db.commit()
    db.refresh(repository)

    return {
        "id": repository.id,
        "user_id": repository.user_id,
        "github_repo_id": repository.github_repo_id,
        "name": repository.name,
        "full_name": repository.full_name,
        "clone_url": repository.clone_url,
    }


@router.get("/")
def get_repositories(
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    repositories = (
        db.query(Repository)
        .filter(Repository.user_id == user.id)
        .all()
    )

    return {
        "count": len(repositories),
        "repositories": [
            {
                "id": repository.id,
                "github_repo_id": repository.github_repo_id,
                "name": repository.name,
                "full_name": repository.full_name,
                "clone_url": repository.clone_url,
            }
            for repository in repositories
        ],
    }
