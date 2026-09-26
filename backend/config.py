import os
from pathlib import Path

from dotenv import load_dotenv


# Project root: SentinelAI/
BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env
load_dotenv(BASE_DIR / ".env")


# Application settings
APP_NAME = os.getenv("APP_NAME", "SentinelAI")
APP_ENV = os.getenv("APP_ENV", "development")
APP_VERSION = os.getenv("APP_VERSION", "1.0.0")

FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    (
        "https://sentinelai-frontend-t31x.onrender.com"
        if APP_ENV == "production"
        else "http://127.0.0.1:3000"
    ),
)

SECRET_KEY = os.getenv("SECRET_KEY", "")
SESSION_COOKIE_NAME = os.getenv(
    "SESSION_COOKIE_NAME",
    "sentinel_session",
)


# Database settings
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "sentinelai")

# GitHub OAuth settings
GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET", "")
GITHUB_CALLBACK_URL = os.getenv(
    "GITHUB_CALLBACK_URL",
    "http://127.0.0.1:8000/api/v1/github/callback",
)
GITHUB_ENCRYPTION_KEY = os.getenv("GITHUB_ENCRYPTION_KEY", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "").strip().lower()
ADMIN_GITHUB_ID = os.getenv("ADMIN_GITHUB_ID", "").strip()
