from datetime import datetime, timedelta, timezone

import requests
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse, RedirectResponse
from sqlalchemy.orm import Session

from config import (
    APP_ENV,
    FRONTEND_URL,
    GITHUB_CALLBACK_URL,
    GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET,
)
from database.connection import get_db
from models.github_connection import GitHubConnection
from models.repository import Repository
from models.user import User
from utils.github_auth import get_valid_github_token
from utils.security import encrypt_token
from utils.session import (
    create_oauth_state,
    create_session_token,
    get_current_user,
    set_session_cookie,
    verify_oauth_state,
)


router = APIRouter(
    prefix="/api/v1/github",
    tags=["GitHub"],
)

OAUTH_STATE_COOKIE = "sentinel_oauth_state"


def _build_github_authorization_url(link_user_id: int | None) -> tuple[str, str]:
    if not GITHUB_CLIENT_ID or not GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=500,
            detail="GitHub OAuth is not configured.",
        )

    state = create_oauth_state(link_user_id)
    github_url = (
        "https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={GITHUB_CALLBACK_URL}"
        "&scope=read:user%20user:email%20repo"
        f"&state={state}"
    )
    return github_url, state


def _set_oauth_state_cookie(response, state: str):
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        httponly=True,
        secure=APP_ENV == "production",
        samesite="lax",
        max_age=600,
        path="/",
    )
    return response


@router.get("/login-url")
def github_login_url(
    request: Request,
    db: Session = Depends(get_db),
):
    """Return an OAuth URL while preserving the currently signed-in SentinelAI user.

    The frontend calls this with its bearer session token, allowing GitHub OAuth to
    link to the current SentinelAI account instead of silently switching accounts.
    """
    link_user_id = None
    try:
        link_user_id = get_current_user(request, db).id
    except HTTPException:
        pass

    github_url, state = _build_github_authorization_url(link_user_id)
    response = JSONResponse({"authorization_url": github_url})
    return _set_oauth_state_cookie(response, state)


@router.get("/login")
def github_login(
    request: Request,
    db: Session = Depends(get_db),
):
    """Browser fallback for direct OAuth navigation."""
    link_user_id = None
    try:
        link_user_id = get_current_user(request, db).id
    except HTTPException:
        pass

    github_url, state = _build_github_authorization_url(link_user_id)
    redirect = RedirectResponse(url=github_url)
    return _set_oauth_state_cookie(redirect, state)


@router.get("/callback")
def github_callback(
    request: Request,
    code: str,
    state: str,
    db: Session = Depends(get_db),
):
    stored_state = request.cookies.get(OAUTH_STATE_COOKIE)
    verified_state = verify_oauth_state(state)

    if not stored_state or stored_state != state or not verified_state:
        raise HTTPException(
            status_code=400,
            detail="Invalid or expired OAuth state.",
        )

    _nonce, linked_user_id = verified_state

    token_response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={"Accept": "application/json"},
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
    access_token = token_data.get("access_token")

    if not access_token:
        raise HTTPException(
            status_code=502,
            detail="GitHub did not return an access token.",
        )

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
    github_email = (github_user.get("email") or "").strip().lower() or None

    # GitHub often hides the public email. Use the authorized user:email
    # scope to obtain the primary verified email for account linking.
    if not github_email:
        emails_response = requests.get(
            "https://api.github.com/user/emails",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2026-03-10",
            },
            timeout=15,
        )

        if emails_response.status_code == 200:
            github_emails = emails_response.json()
            verified_primary = next(
                (
                    item.get("email")
                    for item in github_emails
                    if item.get("verified") and item.get("primary")
                ),
                None,
            )
            if verified_primary:
                github_email = verified_primary.strip().lower()

    # If a signed-in SentinelAI user starts GitHub OAuth, that user owns the
    # linking operation. Never silently switch the user to another SentinelAI
    # account just because the GitHub account is already linked elsewhere.
    if linked_user_id is not None:
        user = db.get(User, linked_user_id)
        if user is None:
            raise HTTPException(
                status_code=401,
                detail="Your SentinelAI session is no longer valid. Please sign in again.",
            )

        existing_link = (
            db.query(User)
            .filter(
                User.github_id == github_user_id,
                User.id != user.id,
            )
            .first()
        )
        if existing_link is not None:
            raise HTTPException(
                status_code=409,
                detail="This GitHub account is already connected to another SentinelAI account. Sign in to that account or use a different GitHub account.",
            )

        user.github_id = github_user_id

    else:
        # A public GitHub login may reuse an existing GitHub-linked account.
        user = (
            db.query(User)
            .filter(User.github_id == github_user_id)
            .first()
        )

        # If this GitHub account has no SentinelAI account yet, match a
        # verified GitHub email to an existing email/password account.
        if user is None and github_email:
            user = (
                db.query(User)
                .filter(User.email == github_email)
                .first()
            )
            if user is not None:
                if user.github_id and user.github_id != github_user_id:
                    raise HTTPException(
                        status_code=409,
                        detail="This email is already linked to a different GitHub account.",
                    )
                user.github_id = github_user_id

        if user is None:
            user = User(
                github_id=github_user_id,
                username=github_username,
                email=github_email,
                password_hash=None,
            )
            db.add(user)
            db.flush()

    user.username = github_username
    if github_email:
        user.email = github_email
    user.github_id = github_user_id

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

    session_token = create_session_token(user.id)
    redirect = RedirectResponse(
        url=f"{FRONTEND_URL}#auth={session_token}"
    )
    set_session_cookie(
        redirect,
        user.id,
        session_token,
    )
    redirect.delete_cookie(
        key=OAUTH_STATE_COOKIE,
        path="/",
    )
    return redirect


@router.get("/repositories")
def get_github_repositories(
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
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
            "X-GitHub-Api-Version": "2026-03-10",
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
    request: Request,
    db: Session = Depends(get_db),
):
    user = get_current_user(request, db)

    connection = (
        db.query(GitHubConnection)
        .filter(GitHubConnection.user_id == user.id)
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
            "X-GitHub-Api-Version": "2026-03-10",
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
        github_repo_id = str(repo["id"])

        existing_repo = (
            db.query(Repository)
            .filter(
                Repository.user_id == user.id,
                Repository.github_repo_id == github_repo_id,
            )
            .first()
        )

        if existing_repo is None:
            repository = Repository(
                user_id=user.id,
                github_repo_id=github_repo_id,
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
