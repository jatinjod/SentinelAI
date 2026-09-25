import re
from pathlib import Path


SECRET_PATTERNS = [
    re.compile(r'password\s*=\s*["\'].*["\']', re.IGNORECASE),
    re.compile(r'api[_-]?key\s*=\s*["\'].*["\']', re.IGNORECASE),
    re.compile(r'secret[_-]?key\s*=\s*["\'].*["\']', re.IGNORECASE),
]


def scan_file(file_path: str) -> list[dict]:
    path = Path(file_path)

    if not path.is_file():
        return []

    findings = []

    try:
        content = path.read_text(
            encoding="utf-8",
            errors="ignore",
        )
    except OSError:
        return []

    for line_number, line in enumerate(content.splitlines(), start=1):
        for pattern in SECRET_PATTERNS:
            if pattern.search(line):
                findings.append(
                    {
                        "type": "hardcoded_secret",
                        "severity": "high",
                        "file": str(path),
                        "line": line_number,
                        "message": "Possible hardcoded secret detected.",
                    }
                )
                break

    return findings


def scan_directory(directory_path: str) -> list[dict]:
    directory = Path(directory_path).resolve()

    if not directory.is_dir():
        return []

    findings = []

    excluded_directories = {
        ".git",
        "venv",
        "__pycache__",
        "node_modules",
    }

    for file_path in directory.rglob("*.py"):
        if any(part in excluded_directories for part in file_path.parts):
            continue

        file_findings = scan_file(str(file_path))

        for finding in file_findings:
            relative_path = file_path.relative_to(directory)

            finding["file"] = str(relative_path).replace("\\", "/")

        findings.extend(file_findings)

    return findings