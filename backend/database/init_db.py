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
    # Older deployments used a global UNIQUE constraint on github_repo_id.
    # Multi-user support requires the same GitHub repository to be represented
    # separately for different SentinelAI users.
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
            # Non-PostgreSQL development databases can skip this migration.
            pass


def create_tables():
    Base.metadata.create_all(bind=engine)
    migrate_repository_uniqueness()
    print("Database tables created successfully!")


if __name__ == "__main__":
    create_tables()
