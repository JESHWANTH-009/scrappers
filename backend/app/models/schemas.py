from enum import Enum
from typing import Optional, Any
from pydantic import BaseModel, Field

class CrawlMode(str, Enum):
    URL = "url"
    WIKIPEDIA = "wikipedia"

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIALLY_COMPLETED = "partially_completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    INTERRUPTED = "interrupted"

class PageStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

class ScopeMode(str, Enum):
    PATH_STRICT = "path_strict"
    SAME_HOSTNAME = "same_hostname"
    SUBDOMAINS = "subdomains"

class WikiFollowStrategy(str, Enum):
    SEED_ONLY = "seed_only"
    SEED_AND_DIRECT = "seed_and_direct"
    RECURSIVE = "recursive"

class URLCrawlRequest(BaseModel):
    url: str = Field(..., description="Starting root URL for crawling")
    include_subdomains: bool = Field(False, description="Whether to include subdomains")
    scope_mode: ScopeMode = Field(ScopeMode.PATH_STRICT, description="Crawl boundary scope")
    max_depth: int = Field(3, ge=0, le=10, description="Maximum crawl depth")
    max_pages: int = Field(50, ge=1, le=500, description="Maximum number of pages to crawl")
    max_concurrency: int = Field(3, ge=1, le=10, description="Concurrent crawler workers")
    include_patterns: list[str] = Field(default_factory=list, description="Regex or glob URL include patterns")
    exclude_patterns: list[str] = Field(default_factory=list, description="Regex or glob URL exclude patterns")
    request_delay_ms: int = Field(300, ge=0, le=10000, description="Politeness delay between requests (ms)")
    timeout_seconds: float = Field(15.0, ge=2.0, le=60.0, description="Request timeout in seconds")

class WikipediaCrawlRequest(BaseModel):
    keyword: str = Field(..., min_length=1, description="Search keyword or phrase")
    language: str = Field("en", min_length=2, max_length=10, description="Wikipedia language edition (e.g. en, fr, de, es)")
    max_articles: int = Field(10, ge=1, le=100, description="Maximum number of Wikipedia articles")
    max_depth: int = Field(1, ge=0, le=5, description="Maximum depth for related articles")
    include_sections: bool = Field(True, description="Preserve article sections and hierarchy")
    include_references: bool = Field(False, description="Preserve references and footnotes")
    follow_links_strategy: WikiFollowStrategy = Field(WikiFollowStrategy.SEED_AND_DIRECT, description="Link following strategy")
    relevance_filter: bool = Field(True, description="Filter related articles by keyword relevance")

class LogEntry(BaseModel):
    timestamp: str
    level: str  # INFO, WARN, ERROR, SUCCESS
    message: str

class CrawlPageItem(BaseModel):
    id: str
    job_id: str
    url: str
    canonical_url: Optional[str] = None
    parent_url: Optional[str] = None
    depth: int = 0
    status: PageStatus
    http_status: Optional[int] = None
    file_path: Optional[str] = None
    title: Optional[str] = None
    content_hash: Optional[str] = None
    error_message: Optional[str] = None
    scraped_at: Optional[str] = None
    discovered_links_count: int = 0

class CrawlJobResponse(BaseModel):
    id: str
    mode: CrawlMode
    target: str  # URL or Keyword
    config: dict[str, Any]
    status: JobStatus
    pages_discovered: int = 0
    pages_scraped: int = 0
    pages_failed: int = 0
    markdown_files_count: int = 0
    current_url: Optional[str] = None
    current_depth: int = 0
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    elapsed_seconds: Optional[float] = None
    error_message: Optional[str] = None
    manifest_path: Optional[str] = None

class CrawlStatsResponse(BaseModel):
    total_jobs: int = 0
    total_pages_discovered: int = 0
    total_pages_scraped: int = 0
    total_markdown_files: int = 0
    active_jobs: int = 0
    recent_jobs: list[CrawlJobResponse] = Field(default_factory=list)

class CrawlEvent(BaseModel):
    event_type: str  # job_update, page_started, page_completed, page_failed, log_message, job_finished
    job_id: str
    data: dict[str, Any]
