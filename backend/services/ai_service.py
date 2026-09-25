import os
from typing import Any


def generate_fix(vulnerability: dict[str, Any]) -> dict[str, str]:
    vulnerability_type = vulnerability.get("type", "")
    file_path = vulnerability.get("file", "")
    line_number = vulnerability.get("line")
    source_line = vulnerability.get("source_line", "")

    if vulnerability_type == "hardcoded_secret":
        old_code = source_line.strip()

        if "JWT_SECRET_KEY" in old_code:
            new_code = 'JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")'

            suggested_code = (
                "import os\n\n"
                f"{new_code}"
            )

            explanation = (
                f"Replace the hardcoded JWT secret in {file_path}"
                f" at line {line_number} with an environment variable. "
                "This keeps the secret out of source control and allows "
                "the value to be provided securely at runtime."
            )

            return {
                "old_code": old_code,
                "new_code": new_code,
                "suggested_code": suggested_code,
                "explanation": explanation,
            }

        new_code = 'SECRET_VALUE = os.getenv("SECRET_VALUE")'

        return {
            "old_code": old_code,
            "new_code": new_code,
            "suggested_code": (
                "import os\n\n"
                f"{new_code}"
            ),
            "explanation": (
                f"Replace the hardcoded secret in {file_path} "
                f"at line {line_number} with an environment variable."
            ),
        }

    return {
        "old_code": source_line.strip(),
        "new_code": "",
        "suggested_code": "",
        "explanation": (
            "No automated fix is available for this "
            "vulnerability type yet."
        ),
    }