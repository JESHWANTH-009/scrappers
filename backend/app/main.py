from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.services.job_store import job_store
from app.api.routes.crawls import router as crawls_router
from app.api.routes.health import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database and handle crash/restart recovery
    await job_store.init_db()
    yield
    # Shutdown logic if any

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Production-Ready Website & Wikipedia Scraper for RAG pipelines",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(crawls_router, prefix="/api")
app.include_router(health_router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
