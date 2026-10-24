import asyncio
import uuid
from datetime import datetime, timezone
from typing import Optional, Set
import httpx

from app.config import settings
from app.models.schemas import URLCrawlRequest, JobStatus, PageStatus
from app.services.job_store import job_store
from app.services.sse_broadcaster import sse_broadcaster
from app.security.url_validation import validate_safe_url
from app.crawler.url_normalizer import normalize_url
from app.crawler.scope_rules import ScopeRules
from app.extraction.html_extractor import extract_html_content
from app.extraction.markdown_converter import html_to_markdown, generate_markdown_document
from app.storage.file_storage import file_storage
from app.storage.manifest import generate_and_save_manifest

class URLCrawler:
    def __init__(self, job_id: str, request: URLCrawlRequest, cancel_event: asyncio.Event):
        self.job_id = job_id
        self.request = request
        self.cancel_event = cancel_event

        self.start_url = normalize_url(request.url)
        self.scope_rules = ScopeRules(
            start_url=self.start_url,
            scope_mode=request.scope_mode,
            include_subdomains=request.include_subdomains,
            include_patterns=request.include_patterns,
            exclude_patterns=request.exclude_patterns
        )

        self.discovered_urls: Set[str] = set()
        self.scraped_urls: Set[str] = set()
        self.failed_urls: Set[str] = set()

        self.semaphore = asyncio.Semaphore(request.max_concurrency)
        self.delay_seconds = request.request_delay_ms / 1000.0

    async def log(self, level: str, message: str):
        """Logs an event and broadcasts it."""
        await job_store.add_log(self.job_id, level, message)
        await sse_broadcaster.broadcast(
            self.job_id,
            "log_message",
            {"timestamp": datetime.now(timezone.utc).isoformat(), "level": level, "message": message}
        )

    async def broadcast_progress(self, current_url: Optional[str] = None, current_depth: int = 0):
        """Broadcasts current job progress to listeners."""
        await job_store.update_job_progress(
            job_id=self.job_id,
            current_url=current_url,
            current_depth=current_depth,
            pages_discovered=len(self.discovered_urls),
            pages_scraped=len(self.scraped_urls),
            pages_failed=len(self.failed_urls),
            markdown_files_count=len(self.scraped_urls)
        )
        await sse_broadcaster.broadcast(
            self.job_id,
            "job_update",
            {
                "job_id": self.job_id,
                "pages_discovered": len(self.discovered_urls),
                "pages_scraped": len(self.scraped_urls),
                "pages_failed": len(self.failed_urls),
                "markdown_files_count": len(self.scraped_urls),
                "current_url": current_url,
                "current_depth": current_depth
            }
        )

    async def run(self):
        """Main crawl execution loop using BFS traversal."""
        started_at = datetime.now(timezone.utc).isoformat()
        await job_store.update_job_status(self.job_id, JobStatus.RUNNING.value, started_at=started_at)
        await self.log("INFO", f"Starting URL crawl for '{self.start_url}' (max_depth={self.request.max_depth}, max_pages={self.request.max_pages})")

        # Initial SSRF validation
        is_safe, error_reason = validate_safe_url(self.start_url, allow_private=settings.ALLOW_PRIVATE_IPS)
        if not is_safe:
            await self.log("ERROR", f"Crawl blocked by SSRF protection: {error_reason}")
            await job_store.update_job_status(self.job_id, JobStatus.FAILED.value, error_message=error_reason, completed_at=datetime.now(timezone.utc).isoformat())
            await sse_broadcaster.broadcast(self.job_id, "job_finished", {"status": JobStatus.FAILED.value, "error": error_reason})
            return

        # Queue contains tuples of (url, parent_url, depth)
        queue: list[tuple[str, Optional[str], int]] = [(self.start_url, None, 0)]
        self.discovered_urls.add(self.start_url)

        # Seed page in database
        initial_page_id = str(uuid.uuid4())
        await job_store.upsert_page(
            page_id=initial_page_id,
            job_id=self.job_id,
            url=self.start_url,
            parent_url=None,
            depth=0,
            status=PageStatus.QUEUED.value
        )

        headers = {
            "User-Agent": settings.DEFAULT_USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
        }

        # Client with redirect following and safety checks
        async with httpx.AsyncClient(
            headers=headers,
            timeout=httpx.Timeout(self.request.timeout_seconds),
            follow_redirects=True,
            max_redirects=settings.MAX_REDIRECTS,
            verify=False  # Allow local / self-signed HTTPS in dev environments
        ) as client:
            while queue and len(self.scraped_urls) < self.request.max_pages:
                if self.cancel_event.is_set():
                    await self.log("WARN", "Crawl cancelled by user.")
                    break

                # Pop next URL
                current_url, parent_url, depth = queue.pop(0)

                # Skip if already reached page limit
                if len(self.scraped_urls) >= self.request.max_pages:
                    break

                # Process page with concurrency semaphore
                async with self.semaphore:
                    await self.broadcast_progress(current_url=current_url, current_depth=depth)
                    new_links = await self.process_page(client, current_url, parent_url, depth)

                    # Add new eligible links if below max_depth
                    if depth < self.request.max_depth:
                        for link in new_links:
                            if link not in self.discovered_urls:
                                self.discovered_urls.add(link)
                                page_id = str(uuid.uuid4())
                                await job_store.upsert_page(
                                    page_id=page_id,
                                    job_id=self.job_id,
                                    url=link,
                                    parent_url=current_url,
                                    depth=depth + 1,
                                    status=PageStatus.QUEUED.value
                                )
                                queue.append((link, current_url, depth + 1))

                    if self.delay_seconds > 0:
                        await asyncio.sleep(self.delay_seconds)

        # Determine completion status
        completed_at = datetime.now(timezone.utc).isoformat()
        if self.cancel_event.is_set():
            final_status = JobStatus.CANCELLED.value
        elif len(self.scraped_urls) > 0 and len(self.failed_urls) > 0:
            final_status = JobStatus.PARTIALLY_COMPLETED.value
        elif len(self.scraped_urls) > 0:
            final_status = JobStatus.COMPLETED.value
        else:
            final_status = JobStatus.FAILED.value

        # Generate and save manifest
        all_pages = await job_store.get_pages_for_job(self.job_id)
        all_logs = await job_store.get_logs_for_job(self.job_id)
        manifest_path = generate_and_save_manifest(
            job_id=self.job_id,
            mode="url",
            target=self.start_url,
            config=self.request.model_dump(),
            status=final_status,
            created_at=started_at,
            completed_at=completed_at,
            pages=all_pages,
            logs=all_logs
        )

        await job_store.update_job_status(
            self.job_id,
            final_status,
            completed_at=completed_at,
            manifest_path=str(manifest_path)
        )
        await self.broadcast_progress()
        await self.log("SUCCESS", f"Crawl finished with status '{final_status}'. Total scraped: {len(self.scraped_urls)}, failed: {len(self.failed_urls)}.")
        await sse_broadcaster.broadcast(self.job_id, "job_finished", {"status": final_status, "manifest_path": str(manifest_path)})

    async def process_page(
        self,
        client: httpx.AsyncClient,
        url: str,
        parent_url: Optional[str],
        depth: int
    ) -> list[str]:
        """Fetches, parses, extracts, converts to Markdown, and saves one page."""
        page_id = str(uuid.uuid4())
        await self.log("INFO", f"Scraping [{depth}]: {url}")
        await job_store.upsert_page(
            page_id=page_id,
            job_id=self.job_id,
            url=url,
            parent_url=parent_url,
            depth=depth,
            status=PageStatus.PROCESSING.value
        )
        await sse_broadcaster.broadcast(self.job_id, "page_started", {"url": url, "depth": depth})

        # Validate URL for SSRF before making the request
        is_safe, error_reason = validate_safe_url(url, allow_private=settings.ALLOW_PRIVATE_IPS)
        if not is_safe:
            self.failed_urls.add(url)
            await self.log("WARN", f"Blocked SSRF target: {url} ({error_reason})")
            await job_store.upsert_page(
                page_id=page_id,
                job_id=self.job_id,
                url=url,
                parent_url=parent_url,
                depth=depth,
                status=PageStatus.FAILED.value,
                error_message=f"SSRF Protection: {error_reason}"
            )
            return []

        try:
            response = await client.get(url)
            
            # Recheck final URL after redirects for SSRF
            final_url = str(response.url)
            if final_url != url:
                is_redirect_safe, redirect_error = validate_safe_url(final_url, allow_private=settings.ALLOW_PRIVATE_IPS)
                if not is_redirect_safe:
                    raise ValueError(f"Redirected to unsafe URL '{final_url}': {redirect_error}")

            if response.status_code >= 400:
                self.failed_urls.add(url)
                await self.log("WARN", f"HTTP {response.status_code} for {url}")
                await job_store.upsert_page(
                    page_id=page_id,
                    job_id=self.job_id,
                    url=url,
                    parent_url=parent_url,
                    depth=depth,
                    status=PageStatus.FAILED.value,
                    http_status=response.status_code,
                    error_message=f"HTTP {response.status_code}"
                )
                return []

            # Check content-type
            content_type = response.headers.get("content-type", "").lower()
            if "text/html" not in content_type and "text/plain" not in content_type and "application/xhtml+xml" not in content_type:
                await self.log("INFO", f"Skipping non-HTML content-type '{content_type}' for {url}")
                await job_store.upsert_page(
                    page_id=page_id,
                    job_id=self.job_id,
                    url=url,
                    parent_url=parent_url,
                    depth=depth,
                    status=PageStatus.SKIPPED.value,
                    http_status=response.status_code,
                    error_message=f"Skipped non-HTML type: {content_type}"
                )
                return []

            # Extract content
            extracted = extract_html_content(response.text, current_url=final_url)
            body_markdown = html_to_markdown(extracted.clean_html)

            # Metadata for front matter
            now_str = datetime.now(timezone.utc).isoformat()
            meta = {
                "source_url": url,
                "canonical_url": extracted.canonical_url or final_url,
                "job_id": self.job_id,
                "scraped_at": now_str,
                "crawl_depth": depth,
                "parent_url": parent_url,
                "source_type": "website",
                "language": extracted.language,
                "http_status": response.status_code,
                "content_type": content_type,
                "last_modified": extracted.last_modified or response.headers.get("last-modified")
            }

            full_md, content_hash = generate_markdown_document(
                title=extracted.title,
                body_markdown=body_markdown,
                metadata=meta
            )

            # Save to disk preserving hierarchy
            abs_path, rel_path = file_storage.save_website_page(
                job_id=self.job_id,
                url=final_url,
                markdown_content=full_md
            )

            # Filter discovered links by scope
            eligible_links = []
            for link in extracted.discovered_links:
                in_scope, _ = self.scope_rules.is_in_scope(link)
                if in_scope and link not in self.discovered_urls:
                    eligible_links.append(link)

            self.scraped_urls.add(url)
            await job_store.upsert_page(
                page_id=page_id,
                job_id=self.job_id,
                url=url,
                canonical_url=extracted.canonical_url or final_url,
                parent_url=parent_url,
                depth=depth,
                status=PageStatus.COMPLETED.value,
                http_status=response.status_code,
                file_path=rel_path,
                title=extracted.title,
                content_hash=content_hash,
                scraped_at=now_str,
                discovered_links_count=len(eligible_links)
            )

            await self.log("SUCCESS", f"Saved: {rel_path} ({len(eligible_links)} links discovered)")
            await sse_broadcaster.broadcast(
                self.job_id,
                "page_completed",
                {"url": url, "file_path": rel_path, "title": extracted.title}
            )
            return eligible_links

        except Exception as e:
            self.failed_urls.add(url)
            await self.log("ERROR", f"Failed scraping {url}: {str(e)}")
            await job_store.upsert_page(
                page_id=page_id,
                job_id=self.job_id,
                url=url,
                parent_url=parent_url,
                depth=depth,
                status=PageStatus.FAILED.value,
                error_message=str(e)
            )
            return []
