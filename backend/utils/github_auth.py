from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from models.github_connection import GitHubConnection
from services.github_service import refresh_github_token
from utils.security import decrypt_token, encrypt_token


def get_valid_github_token(
    connection: GitHubConnection,
    db: Session,
) -> str:
    now = datetime.utcnow()

    # Refresh when token is expired or about to expire.
    if (
        connection.token_expires_at is None
        or connection.token_expires_at <= now + timedelta(minutes=5)
    ):
        if not connection.encrypted_refresh_token:
            raise ValueError(
                "GitHub access token expired and no refresh token is available."
            )

        refresh_token = decrypt_token(
            connection.encrypted_refresh_token
        )

        token_data = refresh_github_token(
            refresh_token
        )

        access_token = token_data["access_token"]

        connection.encrypted_access_token = encrypt_token(
            access_token
        )

        new_refresh_token = token_data.get(
            "refresh_token"
        )

        if new_refresh_token:
            connection.encrypted_refresh_token = encrypt_token(
                new_refresh_token
            )

        expires_in = token_data.get("expires_in")

        if expires_in:
            connection.token_expires_at = (
                datetime.utcnow()
                + timedelta(seconds=int(expires_in))
            )

        db.commit()
        db.refresh(connection)

        return access_token

    return decrypt_token(
        connection.encrypted_access_token
    )