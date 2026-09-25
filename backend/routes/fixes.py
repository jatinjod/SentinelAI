from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db

from models.fix import Fix
from models.github_connection import GitHubConnection
from models.repository import Repository
from models.scan import Scan
from models.vulnerability import Vulnerability

from services.ai_service import generate_fix
import secrets

from models.pull_request import PullRequest

from services.github_service import (
    create_branch,
    create_pull_request,
    get_repository_file,
    get_repository_info,
    update_repository_file,
)

from utils.github_auth import get_valid_github_token

router = APIRouter(
    prefix="/api/v1/fixes",
    tags=["Fixes"],
)


class FixCreate(BaseModel):
    vulnerability_id: int


@router.post("/")
def create_fix(
    fix_data: FixCreate,
    db: Session = Depends(get_db),
):
    vulnerability = db.get(
        Vulnerability,
        fix_data.vulnerability_id,
    )

    if vulnerability is None:
        raise HTTPException(
            status_code=404,
            detail="Vulnerability not found.",
        )

    scan = db.get(
        Scan,
        vulnerability.scan_id,
    )

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Scan not found.",
        )

    repository = db.get(
        Repository,
        scan.repository_id,
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

        file_data = get_repository_file(
            access_token=access_token,
            full_name=repository.full_name,
            file_path=vulnerability.file_path,
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch source file: {error}",
        )

    lines = file_data["content"].splitlines()

    target_line = vulnerability.line_number

    if target_line is None or target_line < 1:
        raise HTTPException(
            status_code=400,
            detail="Invalid vulnerability line number.",
        )

    if target_line > len(lines):
        raise HTTPException(
            status_code=400,
            detail="Vulnerability line is outside the source file.",
        )

    source_line = lines[target_line - 1]

    vulnerability_data = {
        "type": vulnerability.vulnerability_type,
        "severity": vulnerability.severity,
        "file": vulnerability.file_path,
        "line": target_line,
        "title": vulnerability.title,
        "description": vulnerability.description,
        "source_line": source_line,
    }

    ai_result = generate_fix(vulnerability_data)

    fix = Fix(
        vulnerability_id=vulnerability.id,
        old_code=ai_result["old_code"],
        new_code=ai_result["new_code"],
        suggested_code=ai_result["suggested_code"],
        explanation=ai_result["explanation"],
        status="pending",
    )

    db.add(fix)
    db.commit()
    db.refresh(fix)

    return {
        "id": fix.id,
        "vulnerability_id": fix.vulnerability_id,
        "old_code": fix.old_code,
        "new_code": fix.new_code,
        "suggested_code": fix.suggested_code,
        "explanation": fix.explanation,
        "status": fix.status,
    }


@router.patch("/{fix_id}/approve")
def approve_fix(
    fix_id: int,
    db: Session = Depends(get_db),
):
    fix = db.get(Fix, fix_id)

    if fix is None:
        raise HTTPException(
            status_code=404,
            detail="Fix not found.",
        )

    if fix.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Fix is already {fix.status}.",
        )

    fix.status = "approved"

    db.commit()
    db.refresh(fix)

    return {
        "id": fix.id,
        "vulnerability_id": fix.vulnerability_id,
        "status": fix.status,
        "message": "Fix approved successfully.",
    }


@router.patch("/{fix_id}/reject")
def reject_fix(
    fix_id: int,
    db: Session = Depends(get_db),
):
    fix = db.get(Fix, fix_id)

    if fix is None:
        raise HTTPException(
            status_code=404,
            detail="Fix not found.",
        )

    if fix.status != "pending":
        raise HTTPException(
            status_code=400,
            detail=f"Fix is already {fix.status}.",
        )

    fix.status = "rejected"

    db.commit()
    db.refresh(fix)

    return {
        "id": fix.id,
        "vulnerability_id": fix.vulnerability_id,
        "status": fix.status,
        "message": "Fix rejected successfully.",
    }


@router.get("/vulnerabilities/{vulnerability_id}/source")
def get_vulnerability_source(
    vulnerability_id: int,
    db: Session = Depends(get_db),
):
    vulnerability = db.get(
        Vulnerability,
        vulnerability_id,
    )

    if vulnerability is None:
        raise HTTPException(
            status_code=404,
            detail="Vulnerability not found.",
        )

    scan = db.get(
        Scan,
        vulnerability.scan_id,
    )

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Scan not found.",
        )

    repository = db.get(
        Repository,
        scan.repository_id,
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

        file_data = get_repository_file(
            access_token=access_token,
            full_name=repository.full_name,
            file_path=vulnerability.file_path,
        )

    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch source file: {error}",
        )

    lines = file_data["content"].splitlines()

    target_line = vulnerability.line_number or 1

    start = max(1, target_line - 3)
    end = min(len(lines), target_line + 3)

    source_lines = []

    for number in range(start, end + 1):
        source_lines.append(
            {
                "line": number,
                "code": lines[number - 1],
                "target": number == target_line,
            }
        )

    return {
        "repository": repository.full_name,
        "file": file_data["path"],
        "sha": file_data["sha"],
        "target_line": target_line,
        "source": source_lines,
    }

@router.post("/{fix_id}/apply")
def apply_fix(
    fix_id: int,
    db: Session = Depends(get_db),
):
    fix = db.get(Fix, fix_id)

    if fix is None:
        raise HTTPException(
            status_code=404,
            detail="Fix not found.",
        )

    existing_pull_request = (
    db.query(PullRequest)
    .filter(
        PullRequest.fix_id == fix.id,
        PullRequest.status.in_(["open", "pr_created"]),
    )
    .first()
)

    if existing_pull_request is not None:
        return {
        "message": "Pull request already exists for this fix.",
        "fix_id": fix.id,
        "fix_status": fix.status,
        "pull_request": {
            "id": existing_pull_request.id,
            "github_pr_id": existing_pull_request.github_pr_id,
            "url": existing_pull_request.url,
            "status": existing_pull_request.status,
        },
    }

    if fix.status != "approved":
        raise HTTPException(
            status_code=400,
            detail="Only approved fixes can be applied.",
        )

    vulnerability = db.get(
        Vulnerability,
        fix.vulnerability_id,
    )

    if vulnerability is None:
        raise HTTPException(
            status_code=404,
            detail="Vulnerability not found.",
        )

    scan = db.get(
        Scan,
        vulnerability.scan_id,
    )

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Scan not found.",
        )

    repository = db.get(
        Repository,
        scan.repository_id,
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
            db=db
        )

        repository_info = get_repository_info(
            access_token=access_token,
            full_name=repository.full_name,
        )

        default_branch = repository_info["default_branch"]

        branch_name = (
            f"sentinelai/fix-{fix.id}-"
            f"{secrets.token_hex(4)}"
        )

        create_branch(
            access_token=access_token,
            full_name=repository.full_name,
            default_branch=default_branch,
            branch_name=branch_name,
        )

        commit_result = update_repository_file(
            access_token=access_token,
            full_name=repository.full_name,
            file_path=vulnerability.file_path,
            branch_name=branch_name,
            old_code=fix.old_code,
            new_code=fix.new_code,
            commit_message=(
                f"fix: resolve {vulnerability.vulnerability_type}"
            ),
        )

        pr_result = create_pull_request(
            access_token=access_token,
            full_name=repository.full_name,
            title=(
                f"fix: {vulnerability.title}"
            ),
            body=(
                "SentinelAI generated this fix after "
                "human approval.\n\n"
                f"File: {vulnerability.file_path}\n"
                f"Line: {vulnerability.line_number}\n"
                f"Severity: {vulnerability.severity}\n\n"
                f"Explanation: {fix.explanation}"
            ),
            head=branch_name,
            base=default_branch,
        )

        pull_request = PullRequest(
            repository_id=repository.id,
            fix_id=fix.id,
            github_pr_id=pr_result["number"],
            title=f"fix: {vulnerability.title}",
            url=pr_result["url"],
            status=pr_result["state"],
            description=fix.explanation,
        )

        db.add(pull_request)

        fix.status = "pr_created"

        db.commit()
        db.refresh(pull_request)
        db.refresh(fix)

        return {
            "message": "Fix applied and pull request created.",
            "fix_id": fix.id,
            "fix_status": fix.status,
            "repository": repository.full_name,
            "branch": branch_name,
            "commit_sha": commit_result["commit_sha"],
            "pull_request": {
                "id": pull_request.id,
                "github_pr_id": pull_request.github_pr_id,
                "url": pull_request.url,
                "status": pull_request.status,
            },
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=f"Could not apply fix: {error}",
        )