from multiprocessing.dummy import connection
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database.connection import get_db
from models.github_connection import GitHubConnection
from models.repository import Repository
from models.scan import Scan
from models.vulnerability import Vulnerability
from services.github_service import download_repository
from services.scanner import scan_directory
from utils.github_auth import get_valid_github_token


router = APIRouter(
    prefix="/api/v1/scans",
    tags=["Scans"],
)


class ScanCreate(BaseModel):
    repository_id: int


@router.post("/")
def create_scan(
    scan_data: ScanCreate,
    db: Session = Depends(get_db),
):
    repository = db.get(Repository, scan_data.repository_id)

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

        scan = Scan(
            repository_id=repository.id,
            status="running",
            started_at=datetime.utcnow(),
        )

        db.add(scan)
        db.commit()
        db.refresh(scan)

        repository_path = download_repository(
            access_token=access_token,
            full_name=repository.full_name,
        )

        findings = scan_directory(repository_path)

        for finding in findings:
            vulnerability = Vulnerability(
                scan_id=scan.id,
                vulnerability_type=finding["type"],
                severity=finding["severity"],
                file_path=finding["file"],
                line_number=finding["line"],
                title="Possible hardcoded secret",
                description=finding["message"],
            )

            db.add(vulnerability)

        scan.status = "completed"
        scan.completed_at = datetime.utcnow()

        db.commit()
        db.refresh(scan)

        return {
            "scan_id": scan.id,
            "repository_id": scan.repository_id,
            "repository": repository.full_name,
            "status": scan.status,
            "finding_count": len(findings),
            "findings": findings,
        }

    except Exception as error:
        db.rollback()

        raise HTTPException(
            status_code=502,
            detail=f"Repository scan failed: {error}",
        )

    finally:
        if "repository_path" in locals():
            shutil.rmtree(
                Path(repository_path).parent,
                ignore_errors=True,
            )


@router.get("/{scan_id}/vulnerabilities")
def get_scan_vulnerabilities(
    scan_id: int,
    db: Session = Depends(get_db),
):
    scan = db.get(Scan, scan_id)

    if scan is None:
        raise HTTPException(
            status_code=404,
            detail="Scan not found.",
        )

    vulnerabilities = (
        db.query(Vulnerability)
        .filter(Vulnerability.scan_id == scan_id)
        .all()
    )

    return {
        "scan_id": scan_id,
        "count": len(vulnerabilities),
        "vulnerabilities": [
            {
                "id": vulnerability.id,
                "type": vulnerability.vulnerability_type,
                "severity": vulnerability.severity,
                "file": vulnerability.file_path,
                "line": vulnerability.line_number,
                "title": vulnerability.title,
                "description": vulnerability.description,
            }
            for vulnerability in vulnerabilities
        ],
    }