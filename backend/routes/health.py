from fastapi import APIRouter

router = APIRouter(prefix="/api/v1")


@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "SentinelAI"
    }