from fastapi import APIRouter
from app.config import settings

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """Health check endpoint returning system status and versions."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "crawls_dir": str(settings.CRAWLS_DIR)
    }
