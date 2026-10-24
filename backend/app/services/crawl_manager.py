import asyncio
import uuid
from datetime import datetime, timezone
from typing import Dict, Optional
from app.models.schemas import URLCrawlRequest, WikipediaCrawlRequest, CrawlJobResponse, JobStatus, CrawlMode
from app.services.job_store import job_store
from app.crawler.url_crawler import URLCrawler
from app.crawler.wikipedia_crawler import WikipediaCrawler

class CrawlManager:
    def __init__(self):
        self._active_tasks: Dict[str, asyncio.Task] = {}
        self._cancel_events: Dict[str, asyncio.Event] = {}

    def _generate_job_id(self, prefix: str) -> str:
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        short_id = uuid.uuid4().hex[:6]
        return f"{prefix}_{timestamp}_{short_id}"

    async def start_url_crawl(self, request: URLCrawlRequest) -> dict:
        """Initializes and launches a URL crawl job in the background."""
        job_id = self._generate_job_id("url")
        job = await job_store.create_job(
            job_id=job_id,
            mode=CrawlMode.URL.value,
            target=request.url,
            config=request.model_dump()
        )

        cancel_event = asyncio.Event()
        self._cancel_events[job_id] = cancel_event

        crawler = URLCrawler(job_id=job_id, request=request, cancel_event=cancel_event)
        task = asyncio.create_task(crawler.run())
        self._active_tasks[job_id] = task

        # Clean up references on task completion
        def _cleanup(t):
            self._active_tasks.pop(job_id, None)
            self._cancel_events.pop(job_id, None)

        task.add_done_callback(_cleanup)
        return job

    async def start_wikipedia_crawl(self, request: WikipediaCrawlRequest) -> dict:
        """Initializes and launches a Wikipedia crawl job in the background."""
        job_id = self._generate_job_id("wiki")
        job = await job_store.create_job(
            job_id=job_id,
            mode=CrawlMode.WIKIPEDIA.value,
            target=request.keyword,
            config=request.model_dump()
        )

        cancel_event = asyncio.Event()
        self._cancel_events[job_id] = cancel_event

        crawler = WikipediaCrawler(job_id=job_id, request=request, cancel_event=cancel_event)
        task = asyncio.create_task(crawler.run())
        self._active_tasks[job_id] = task

        def _cleanup(t):
            self._active_tasks.pop(job_id, None)
            self._cancel_events.pop(job_id, None)

        task.add_done_callback(_cleanup)
        return job

    async def cancel_job(self, job_id: str) -> bool:
        """Cancels a running crawl job."""
        if job_id in self._cancel_events:
            self._cancel_events[job_id].set()
            return True
        return False

    async def retry_job(self, job_id: str) -> Optional[dict]:
        """
        Retries eligible failed pages or restarts an interrupted/failed job.
        """
        job = await job_store.get_job(job_id)
        if not job:
            return None

        # Re-trigger based on mode
        mode = job.get("mode")
        config = job.get("config", {})
        if mode == CrawlMode.URL.value:
            req = URLCrawlRequest(**config)
            return await self.start_url_crawl(req)
        elif mode == CrawlMode.WIKIPEDIA.value:
            req = WikipediaCrawlRequest(**config)
            return await self.start_wikipedia_crawl(req)

        return None

crawl_manager = CrawlManager()
