from fastapi import FastAPI

from config import APP_NAME, APP_VERSION
from routes.health import router as health_router
from routes.users import router as users_router
from routes.repositories import router as repositories_router
from routes.scans import router as scans_router
from routes.fixes import router as fixes_router
from routes.github import router as github_router
from routes.pull_requests import router as pull_requests_router
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(users_router)
app.include_router(repositories_router)
app.include_router(scans_router)
app.include_router(fixes_router)
app.include_router(github_router)
app.include_router(pull_requests_router)


@app.get("/")
def home():
    return {
        "message": "SentinelAI Backend is running!",
        "version": APP_VERSION
    }