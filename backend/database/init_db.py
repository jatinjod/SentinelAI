from database.connection import Base, engine
from models.user import User
from models.repository import Repository
from models.scan import Scan
from models.vulnerability import Vulnerability
from models.fix import Fix
from models.pull_request import PullRequest
from models.github_connection import GitHubConnection


def create_tables():
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    create_tables()