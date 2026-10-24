import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "RAG Data Collector"
    VERSION: str = "1.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    
    # Base paths (relative to workspace root or backend)
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    DATA_DIR: Path = BASE_DIR / "data"
    CRAWLS_DIR: Path = BASE_DIR / "data" / "crawls"
    DATABASE_PATH: Path = BASE_DIR / "data" / "crawls.db"
    
    # Crawler defaults
    DEFAULT_USER_AGENT: str = "RAGDataCollector/1.0 (Mozilla/5.0 compatible; +https://github.com/rag-data-collector)"
    DEFAULT_REQUEST_TIMEOUT: float = 15.0
    MAX_REDIRECTS: int = 5
    DEFAULT_CONCURRENCY: int = 3
    MAX_CONCURRENCY: int = 10
    DEFAULT_MAX_DEPTH: int = 3
    DEFAULT_MAX_PAGES: int = 50
    DEFAULT_POLITENESS_DELAY_MS: int = 300
    MAX_FILE_SIZE_BYTES: int = 10 * 1024 * 1024  # 10 MB limit for response
    
    # Security
    ALLOW_PRIVATE_IPS: bool = False
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()

# Ensure directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.CRAWLS_DIR.mkdir(parents=True, exist_ok=True)
