import base64
import tempfile
import zipfile
from pathlib import Path

import requests


def download_repository(
    access_token: str,
    full_name: str,
) -> str:
    url = f"https://api.github.com/repos/{full_name}/zipball"

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=30,
    )

    response.raise_for_status()

    temp_dir = Path(
        tempfile.mkdtemp(prefix="sentinelai_")
    )

    zip_path = temp_dir / "repository.zip"
    zip_path.write_bytes(response.content)

    extract_dir = temp_dir / "repo"
    extract_dir.mkdir()

    with zipfile.ZipFile(zip_path) as archive:
        for member in archive.infolist():
            target = (extract_dir / member.filename).resolve()

            if not str(target).startswith(
                str(extract_dir.resolve())
            ):
                raise ValueError(
                    "Unsafe archive path detected."
                )

        archive.extractall(extract_dir)

    repository_root = next(extract_dir.iterdir())

    return str(repository_root)


def get_repository_file(
    access_token: str,
    full_name: str,
    file_path: str,
) -> dict:
    url = (
        f"https://api.github.com/repos/{full_name}"
        f"/contents/{file_path}"
    )

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    if data.get("type") != "file":
        raise ValueError(
            "The requested path is not a file."
        )

    content = base64.b64decode(
        data["content"]
    ).decode(
        "utf-8",
        errors="replace",
    )

    return {
        "path": data["path"],
        "sha": data["sha"],
        "content": content,
    }


def get_repository_info(
    access_token: str,
    full_name: str,
) -> dict:
    url = f"https://api.github.com/repos/{full_name}"

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    return {
        "full_name": data["full_name"],
        "default_branch": data["default_branch"],
    }


def create_branch(
    access_token: str,
    full_name: str,
    default_branch: str,
    branch_name: str,
) -> dict:
    owner, repo = full_name.split("/", 1)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    ref_url = (
        f"https://api.github.com/repos/{owner}/{repo}"
        f"/git/ref/heads/{default_branch}"
    )

    ref_response = requests.get(
        ref_url,
        headers=headers,
        timeout=15,
    )

    ref_response.raise_for_status()

    base_sha = ref_response.json()["object"]["sha"]

    create_url = (
        f"https://api.github.com/repos/{owner}/{repo}"
        f"/git/refs"
    )

    create_response = requests.post(
        create_url,
        headers=headers,
        json={
            "ref": f"refs/heads/{branch_name}",
            "sha": base_sha,
        },
        timeout=15,
    )

    create_response.raise_for_status()

    data = create_response.json()

    return {
        "branch": branch_name,
        "sha": data["object"]["sha"],
    }


def update_repository_file(
    access_token: str,
    full_name: str,
    file_path: str,
    branch_name: str,
    old_code: str,
    new_code: str,
    commit_message: str,
) -> dict:
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }

    file_data = get_repository_file(
        access_token=access_token,
        full_name=full_name,
        file_path=file_path,
    )

    current_content = file_data["content"]

    if old_code not in current_content:
        raise ValueError(
            "The approved old code was not found in the current file."
        )

    if current_content.count(old_code) != 1:
        raise ValueError(
            "The approved old code must occur exactly once."
        )

    updated_content = current_content.replace(
        old_code,
        new_code,
        1,
    )

    encoded_content = base64.b64encode(
        updated_content.encode("utf-8")
    ).decode("utf-8")

    owner, repo = full_name.split("/", 1)

    url = (
        f"https://api.github.com/repos/{owner}/{repo}"
        f"/contents/{file_path}"
    )

    response = requests.put(
        url,
        headers=headers,
        json={
            "message": commit_message,
            "content": encoded_content,
            "sha": file_data["sha"],
            "branch": branch_name,
        },
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()

    return {
        "path": data["content"]["path"],
        "commit_sha": data["commit"]["sha"],
        "branch": branch_name,
    }


def create_pull_request(
    access_token: str,
    full_name: str,
    title: str,
    body: str,
    head: str,
    base: str,
) -> dict:
    owner, repo = full_name.split("/", 1)

    url = (
        f"https://api.github.com/repos/{owner}/{repo}/pulls"
    )

    response = requests.post(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        json={
            "title": title,
            "body": body,
            "head": head,
            "base": base,
        },
        timeout=30,
    )

    response.raise_for_status()

    data = response.json()

    return {
        "number": data["number"],
        "url": data["html_url"],
        "state": data["state"],
    }


def get_pull_request(
    access_token: str,
    full_name: str,
    pull_number: int,
) -> dict:
    owner, repo = full_name.split("/", 1)

    url = (
        f"https://api.github.com/repos/{owner}/{repo}"
        f"/pulls/{pull_number}"
    )

    response = requests.get(
        url,
        headers={
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/vnd.github+json",
        },
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    return {
        "number": data["number"],
        "url": data["html_url"],
        "title": data["title"],
        "state": data["state"],
        "merged": data["merged"],
        "mergeable": data["mergeable"],
    }

def refresh_github_token(
    refresh_token: str,
) -> dict:
    from config import (
        GITHUB_CLIENT_ID,
        GITHUB_CLIENT_SECRET,
    )

    response = requests.post(
        "https://github.com/login/oauth/access_token",
        headers={
            "Accept": "application/json",
        },
        data={
            "client_id": GITHUB_CLIENT_ID,
            "client_secret": GITHUB_CLIENT_SECRET,
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
        },
        timeout=15,
    )

    response.raise_for_status()

    data = response.json()

    if "access_token" not in data:
        raise ValueError(
            data.get(
                "error_description",
                "GitHub token refresh failed.",
            )
        )

    return data