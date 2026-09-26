from sqlalchemy import text

from database.connection import Base, engine
from models.user import User
from models.repository import Repository
from models.scan import Scan
from models.vulnerability import Vulnerability
from models.fix import Fix
from models.pull_request import PullRequest
from models.github_connection import GitHubConnection


def migrate_repository_uniqueness():
    with engine.begin() as connection:
        try:
            connection.execute(
                text(
                    "ALTER TABLE repositories "
                    "DROP CONSTRAINT IF EXISTS repositories_github_repo_id_key"
                )
            )
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS "
                    "uq_repositories_user_github_repo "
                    "ON repositories (user_id, github_repo_id)"
                )
            )
        except Exception:
            pass


def migrate_user_auth():
    with engine.begin() as connection:
        try:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ALTER COLUMN github_id DROP NOT NULL"
                )
            )
        except Exception:
            pass

        try:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)"
                )
            )
        except Exception:
            pass

        try:
            connection.execute(
                text(
                    "CREATE UNIQUE INDEX IF NOT EXISTS "
                    "uq_users_email "
                    "ON users (email) "
                    "WHERE email IS NOT NULL"
                )
            )
        except Exception:
            pass


def create_tables():
    Base.metadata.create_all(bind=engine)
    migrate_repository_uniqueness()
    migrate_user_auth()
    print("Database tables created successfully!")


if __name__ == "__main__":
    create_tables()
