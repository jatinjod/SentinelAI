from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.repository import Repository
from models.user import User


router = APIRouter(
    prefix="/api/v1/repositories",
    tags=["Repositories"],
)


class RepositoryCreate(BaseModel):
    user_id: int
    github_repo_id: str
    name: str
    full_name: str
    clone_url: str


@router.post("/")
def create_repository(
    repo_data: RepositoryCreate,
    db: Session = Depends(get_db),
):
    user = db.get(User, repo_data.user_id)

    if user is None:
        raise HTTPException(
            status_code=404,
            detail="User not found.",
        )

    repository = Repository(
        user_id=repo_data.user_id,
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
    user_id: int,
    db: Session = Depends(get_db),
):
    repositories = (
        db.query(Repository)
        .filter(Repository.user_id == user_id)
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