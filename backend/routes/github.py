import secrets
from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from config import (
    GITHUB_CALLBACK_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
)
from database.connection import get_db
from models.github_connection import GitHubConnection
from models.user import User
from utils.security import encrypt_token
from utils.github_auth import get_valid_github_token
from models.repository import Repository


router = APIRouter(
    prefix="/api/v1/github",
    tags=["GitHub"],
)


oauth_states: set[str] = set()


@router.get("/login")
def github_login():
    if not GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=500,
            detail="GitHub Client ID is not configured.",
        )

    state = secrets.token_urlsafe(32)
    oauth_states.add(state)

    github_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_CALLBACK_URL}"
        "&scope=read:user%20user:email%20repo"
        f"&state={state}"
    )

    return RedirectResponse(url=github_url)


@router.get("/callback")
def github_callback(
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    if state not in oauth_states:
        raise HTTPException(
            status_code=400,
            detail="Invalid OAuth state.",
        )

    oauth_states.discard(state)

    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={
            "Accept": "application/json",
        },
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "code": code,
            "redirect_uri": GITHUB_CALLBACK_URL,
        },
        timeout=15,
    )

    if token_response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="GitHub token exchange failed.",
        )

    token_data = token_response.json()

    if "access_token" not in token_data:
        raise HTTPException(
            status_code=502,
            detail="GitHub did not return an access token.",
        )

    access_token = token_data["access_token"]
    refresh_token = token_data.get("refresh_token")

    user_response = requests.get(
        "https://api.github.com/user",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2026-03-10",
        },
        timeout=15,
    )

    if user_response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Could not retrieve GitHub user.",
        )

    github_user = user_response.json()

    github_user_id = str(github_user["id"])
    github_username = github_user["login"]
    github_email = github_user.get("email")

    # Find existing SentinelAI user by GitHub ID.
    user = (
        db.query(User)
        .filter(User.github_id == github_user_id)
        .first()
    )

    # Create user if this is the first GitHub login.
    if user is None:
        user = User(
            github_id=github_user_id,
            username=github_username,
            email=github_email,
        )
        db.add(user)
        db.flush()
    else:
        user.username = github_username

        if github_email:
            user.email = github_email

    expires_in = token_data.get("expires_in")

    token_expires_at = None

    if expires_in is not None:
        token_expires_at = datetime.now(timezone.utc) + timedelta(
            seconds=int(expires_in)
        )

    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
        .first()
    )

    if connection is None:
        connection = GitHubConnection(
            user_id=user.id,
            github_user_id=github_user_id,
            username=github_username,
            encrypted_access_token=encrypt_token(access_token),
            encrypted_refresh_token=(
                encrypt_token(refresh_token)
                if refresh_token
                else None
            ),
            token_expires_at=token_expires_at,
        )

        db.add(connection)

    else:
        connection.github_user_id = github_user_id
        connection.username = github_username
        connection.encrypted_access_token = encrypt_token(access_token)
        connection.encrypted_refresh_token = (
            encrypt_token(refresh_token)
            if refresh_token
            else connection.encrypted_refresh_token
        )
        connection.token_expires_at = token_expires_at

    db.commit()

    return {
        "message": "GitHub connected successfully.",
        "user_id": user.id,
        "github_id": github_user_id,
        "username": github_username,
    }

@router.get("/repositories")
def get_github_repositories(
    user_id: int,
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user_id)
        .first()
    )

    if connection is None:
        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected for this user.",
        )

    access_token = get_valid_github_token(
            connection=connection,
            db=db,
        )

    response = requests.get(
        "https://api.github.com/user/repos",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        params={
            "per_page": 100,
            "sort": "updated",
        },
        timeout=15,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Could not fetch GitHub repositories.",
        )

    repositories = response.json()

    return {
        "count": len(repositories),
        "repositories": [
            {
                "github_repo_id": str(repo["id"]),
                "name": repo["name"],
                "full_name": repo["full_name"],
                "private": repo["private"],
                "clone_url": repo["clone_url"],
                "html_url": repo["html_url"],
            }
            for repo in repositories
        ],
    }

@router.post("/repositories/sync")
def sync_github_repositories(
    user_id: int,
    db: Session = Depends(get_db),
):
    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user_id)
        .first()
    )

    if connection is None:
        raise HTTPException(
            status_code=404,
            detail="GitHub account is not connected for this user.",
        )

    access_token = get_valid_github_token(
            connection=connection,
            db=db,
        )

    response = requests.get(
        "https://api.github.com/user/repos",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        params={
            "per_page": 100,
            "sort": "updated",
        },
        timeout=15,
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=502,
            detail="Could not fetch GitHub repositories.",
        )

    github_repositories = response.json()
    synced = 0

    for repo in github_repositories:
        existing_repo = (
            db.query(Repository)
            .filter(
                Repository.github_repo_id == str(repo["id"])
            )
            .first()
        )

        if existing_repo is None:
            repository = Repository(
                user_id=user_id,
                github_repo_id=str(repo["id"]),
                name=repo["name"],
                full_name=repo["full_name"],
                clone_url=repo["clone_url"],
            )
            db.add(repository)
            synced += 1

        else:
            existing_repo.name = repo["name"]
            existing_repo.full_name = repo["full_name"]
            existing_repo.clone_url = repo["clone_url"]

    db.commit()

    return {
        "message": "GitHub repositories synced successfully.",
        "github_repository_count": len(github_repositories),
        "newly_added": synced,
    }