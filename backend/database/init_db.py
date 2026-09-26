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


def migrate_user_profile():
    with engine.begin() as connection:
        try:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS display_name VARCHAR(100)"
                )
            )
        except Exception:
            pass

        try:
            connection.execute(
                text(
                    "UPDATE users "
                    "SET display_name = username "
                    "WHERE display_name IS NULL OR TRIM(display_name) = ''"
                )
            )
        except Exception:
            pass


def migrate_user_admin():
    with engine.begin() as connection:
        try:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE"
                )
            )
        except Exception:
            pass

        try:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"
                )
            )
        except Exception:
            pass

        try:
            connection.execute(text("UPDATE users SET is_admin = FALSE WHERE is_admin IS NULL"))
        except Exception:
            pass

        try:
            connection.execute(text("UPDATE users SET is_active = TRUE WHERE is_active IS NULL"))
        except Exception:
            pass


def create_tables():
    Base.metadata.create_all(bind=engine)
    migrate_repository_uniqueness()
    migrate_user_auth()
    migrate_user_profile()
    migrate_user_admin()
    print("Database tables created successfully!")


if __name__ == "__main__":
    create_tables()
