from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database.connection import get_db

from models.github_connection import GitHubConnection
from models.pull_request import PullRequest
from models.repository import Repository

from services.github_service import get_pull_request
from utils.github_auth import get_valid_github_token


router = APIRouter(
    prefix="/api/v1/pull-requests",
    tags=["Pull Requests"],
)


@router.get("/{pull_request_id}")
def get_pull_request_status(
    pull_request_id: int,
    db: Session = Depends(get_db),
):
    pull_request = db.get(
        PullRequest,
        pull_request_id,
    )

    if pull_request is None:
        raise HTTPException(
            status_code=404,
            detail="Pull request not found.",
        )

    repository = db.get(
        Repository,
        pull_request.repository_id,
    )

    if repository is None:
        raise HTTPException(
            status_code=404,
            detail="Repository not found.",
        )

    connection = (
        db.query(GitHubConnection)
        .filter(
            GitHubConnection.user_id == repository.user_id
        )
        .first()
    )

    if connection is None:
        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected.",
        )

    try:
        access_token = get_valid_github_token(
            connection=connection,
            db=db,
        )

        github_pr = get_pull_request(
            access_token=access_token,
            full_name=repository.full_name,
            pull_number=pull_request.github_pr_id,
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch pull request status: {error}",
        )

    if github_pr["merged"]:
        status = "merged"
    elif github_pr["state"] == "closed":
        status = "closed"
    else:
        status = "open"

    pull_request.status = status

    db.commit()
    db.refresh(pull_request)

    return {
        "id": pull_request.id,
        "github_pr_id": pull_request.github_pr_id,
        "repository": repository.full_name,
        "title": github_pr["title"],
        "status": status,
        "merged": github_pr["merged"],
        "mergeable": github_pr["mergeable"],
        "url": github_pr["url"],
    }