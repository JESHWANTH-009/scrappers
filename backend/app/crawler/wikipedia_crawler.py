import asyncio
import uuid
import re
from datetime import datetime, timezone
from typing import Optional, Set, List, Dict, Any
import httpx

from app.config import settings
from app.models.schemas import WikipediaCrawlRequest, JobStatus, PageStatus, WikiFollowStrategy
from app.services.job_store import job_store
from app.services.sse_broadcaster import sse_broadcaster
from app.extraction.html_extractor import extract_html_content
from app.extraction.markdown_converter import html_to_markdown, generate_markdown_document
from app.storage.file_storage import file_storage
from app.storage.manifest import generate_and_save_manifest

class WikipediaCrawler:
    def __init__(self, job_id: str, request: WikipediaCrawlRequest, cancel_event: asyncio.Event):
        self.job_id = job_id
        self.request = request
        self.cancel_event = cancel_event

        self.lang = request.language.strip().lower() or "en"
        self.api_endpoint = f"https://{self.lang}.wikipedia.org/w/api.php"
        self.base_wiki_url = f"https://{self.lang}.wikipedia.org/wiki/"

        self.discovered_titles: Set[str] = set()
        self.scraped_titles: Set[str] = set()
        self.failed_titles: Set[str] = set()

        self.user_agent = f"RAGDataCollector/1.0 (https://github.com/rag-data-collector; contact: research@ragcollector.local) Python/{settings.VERSION}"

    async def log(self, level: str, message: str):
        """Logs an event and broadcasts it."""
        await job_store.add_log(self.job_id, level, message)
        await sse_broadcaster.broadcast(
            self.job_id,
            "log_message",
            {"timestamp": datetime.now(timezone.utc).isoformat(), "level": level, "message": message}
        )

    async def broadcast_progress(self, current_title: Optional[str] = None, current_depth: int = 0):
        """Broadcasts current job progress to listeners."""
        await job_store.update_job_progress(
            job_id=self.job_id,
            current_url=f"Wikipedia: {current_title}" if current_title else None,
            current_depth=current_depth,
            pages_discovered=len(self.discovered_titles),
            pages_scraped=len(self.scraped_titles),
            pages_failed=len(self.failed_titles),
            markdown_files_count=len(self.scraped_titles)
        )
        await sse_broadcaster.broadcast(
            self.job_id,
            "job_update",
            {
                "job_id": self.job_id,
                "pages_discovered": len(self.discovered_titles),
                "pages_scraped": len(self.scraped_titles),
                "pages_failed": len(self.failed_titles),
                "markdown_files_count": len(self.scraped_titles),
                "current_url": f"Wikipedia: {current_title}" if current_title else None,
                "current_depth": current_depth
            }
        )

    async def run(self):
        """Executes Wikipedia search and article harvesting."""
        started_at = datetime.now(timezone.utc).isoformat()
        await job_store.update_job_status(self.job_id, JobStatus.RUNNING.value, started_at=started_at)
        await self.log("INFO", f"Starting Wikipedia keyword crawl for '{self.request.keyword}' (lang={self.lang}, max_articles={self.request.max_articles})")

        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/json"
        }

        async with httpx.AsyncClient(headers=headers, timeout=20.0, follow_redirects=True) as client:
            # Step 1: Search Wikipedia for keyword
            search_results = await self.search_wikipedia(client, self.request.keyword, self.request.max_articles)
            if not search_results:
                await self.log("WARN", f"No Wikipedia articles found for keyword '{self.request.keyword}'.")
                completed_at = datetime.now(timezone.utc).isoformat()
                await job_store.update_job_status(
                    self.job_id,
                    JobStatus.COMPLETED.value,
                    completed_at=completed_at,
                    error_message="No matching articles found"
                )
                await sse_broadcaster.broadcast(self.job_id, "job_finished", {"status": JobStatus.COMPLETED.value})
                return

            await self.log("INFO", f"Found {len(search_results)} seed articles for '{self.request.keyword}'.")

            # Queue: list of (title, parent_url, depth)
            queue: list[tuple[str, Optional[str], int]] = []
            for item in search_results:
                title = item["title"]
                self.discovered_titles.add(title)
                canonical_url = f"{self.base_wiki_url}{title.replace(' ', '_')}"
                page_id = str(uuid.uuid4())
                await job_store.upsert_page(
                    page_id=page_id,
                    job_id=self.job_id,
                    url=canonical_url,
                    parent_url=None,
                    depth=0,
                    status=PageStatus.QUEUED.value,
                    title=title
                )
                queue.append((title, None, 0))

            # Step 2: Process articles
            while queue and len(self.scraped_titles) < self.request.max_articles:
                if self.cancel_event.is_set():
                    await self.log("WARN", "Wikipedia crawl cancelled by user.")
                    break

                title, parent_url, depth = queue.pop(0)

                await self.broadcast_progress(current_title=title, current_depth=depth)
                related_links = await self.process_article(client, title, parent_url, depth)

                # Check if related articles should be followed
                should_follow = False
                if self.request.follow_links_strategy == WikiFollowStrategy.SEED_AND_DIRECT and depth < 1:
                    should_follow = True
                elif self.request.follow_links_strategy == WikiFollowStrategy.RECURSIVE and depth < self.request.max_depth:
                    should_follow = True

                if should_follow and len(self.scraped_titles) < self.request.max_articles:
                    current_page_url = f"{self.base_wiki_url}{title.replace(' ', '_')}"
                    for related_title in related_links:
                        if related_title not in self.discovered_titles and len(self.discovered_titles) < self.request.max_articles * 2:
                            # Apply relevance filter if enabled
                            if self.request.relevance_filter:
                                kw_lower = self.request.keyword.lower()
                                if not any(word in related_title.lower() for word in kw_lower.split()):
                                    continue

                            self.discovered_titles.add(related_title)
                            rel_url = f"{self.base_wiki_url}{related_title.replace(' ', '_')}"
                            pid = str(uuid.uuid4())
                            await job_store.upsert_page(
                                page_id=pid,
                                job_id=self.job_id,
                                url=rel_url,
                                parent_url=current_page_url,
                                depth=depth + 1,
                                status=PageStatus.QUEUED.value,
                                title=related_title
                            )
                            queue.append((related_title, current_page_url, depth + 1))

                # Politeness delay for Wikipedia API
                await asyncio.sleep(0.3)

        # Complete crawl
        completed_at = datetime.now(timezone.utc).isoformat()
        if self.cancel_event.is_set():
            final_status = JobStatus.CANCELLED.value
        elif len(self.scraped_titles) > 0 and len(self.failed_titles) > 0:
            final_status = JobStatus.PARTIALLY_COMPLETED.value
        elif len(self.scraped_titles) > 0:
            final_status = JobStatus.COMPLETED.value
        else:
            final_status = JobStatus.FAILED.value

        all_pages = await job_store.get_pages_for_job(self.job_id)
        all_logs = await job_store.get_logs_for_job(self.job_id)
        manifest_path = generate_and_save_manifest(
            job_id=self.job_id,
            mode="wikipedia",
            target=self.request.keyword,
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
        await self.log("SUCCESS", f"Wikipedia crawl finished. Scraped: {len(self.scraped_titles)} articles.")
        await sse_broadcaster.broadcast(self.job_id, "job_finished", {"status": final_status, "manifest_path": str(manifest_path)})

    async def search_wikipedia(self, client: httpx.AsyncClient, keyword: str, limit: int) -> list[dict[str, Any]]:
        """Searches Wikipedia using action=query&list=search."""
        params = {
            "action": "query",
            "list": "search",
            "srsearch": keyword,
            "srnamespace": 0,  # Main namespace only
            "srlimit": min(limit, 50),
            "format": "json"
        }
        try:
            resp = await client.get(self.api_endpoint, params=params)
            data = resp.json()
            return data.get("query", {}).get("search", [])
        except Exception as e:
            await self.log("ERROR", f"Failed to search Wikipedia: {str(e)}")
            return []

    async def process_article(
        self,
        client: httpx.AsyncClient,
        title: str,
        parent_url: Optional[str],
        depth: int
    ) -> list[str]:
        """Fetches article content via action=parse and saves it as Markdown."""
        canonical_url = f"{self.base_wiki_url}{title.replace(' ', '_')}"
        page_id = str(uuid.uuid4())
        await self.log("INFO", f"Fetching Wikipedia article [{depth}]: '{title}'")
        await job_store.upsert_page(
            page_id=page_id,
            job_id=self.job_id,
            url=canonical_url,
            parent_url=parent_url,
            depth=depth,
            status=PageStatus.PROCESSING.value,
            title=title
        )
        await sse_broadcaster.broadcast(self.job_id, "page_started", {"url": canonical_url, "title": title, "depth": depth})

        params = {
            "action": "parse",
            "page": title,
            "prop": "text|sections|displaytitle|revid|links",
            "disabletoc": 1,
            "disableeditsection": 1,
            "format": "json"
        }

        try:
            resp = await client.get(self.api_endpoint, params=params)
            data = resp.json()

            if "error" in data:
                error_msg = data["error"].get("info", "Unknown MediaWiki error")
                self.failed_titles.add(title)
                await self.log("WARN", f"Wikipedia API error for '{title}': {error_msg}")
                await job_store.upsert_page(
                    page_id=page_id,
                    job_id=self.job_id,
                    url=canonical_url,
                    parent_url=parent_url,
                    depth=depth,
                    status=PageStatus.FAILED.value,
                    error_message=error_msg
                )
                return []

            parse_data = data.get("parse", {})
            page_id_num = parse_data.get("pageid", 0)
            revid = parse_data.get("revid", 0)
            html_text = parse_data.get("text", {}).get("*", "")

            # Convert to Markdown
            clean_md = html_to_markdown(html_text)

            # Metadata for Wikipedia front matter
            now_str = datetime.now(timezone.utc).isoformat()
            meta = {
                "source_url": canonical_url,
                "canonical_url": canonical_url,
                "job_id": self.job_id,
                "scraped_at": now_str,
                "crawl_depth": depth,
                "parent_url": parent_url,
                "source_type": "wikipedia",
                "language": self.lang,
                "page_id": page_id_num,
                "revision_id": revid,
                "search_keyword": self.request.keyword,
                "namespace": 0
            }

            full_md, content_hash = generate_markdown_document(
                title=title,
                body_markdown=clean_md,
                metadata=meta
            )

            # Save to disk
            abs_path, rel_path = file_storage.save_wikipedia_page(
                job_id=self.job_id,
                title=title,
                page_id=page_id_num,
                language=self.lang,
                markdown_content=full_md
            )

            # Extract internal links for related articles (ns=0)
            related_titles = []
            for link in parse_data.get("links", []):
                if link.get("ns") == 0 and "exists" in link:
                    rel_title = link.get("*")
                    if rel_title and rel_title not in self.discovered_titles:
                        related_titles.append(rel_title)

            self.scraped_titles.add(title)
            await job_store.upsert_page(
                page_id=page_id,
                job_id=self.job_id,
                url=canonical_url,
                canonical_url=canonical_url,
                parent_url=parent_url,
                depth=depth,
                status=PageStatus.COMPLETED.value,
                http_status=200,
                file_path=rel_path,
                title=title,
                content_hash=content_hash,
                scraped_at=now_str,
                discovered_links_count=len(related_titles)
            )

            await self.log("SUCCESS", f"Saved: {rel_path} ({len(related_titles)} linked articles)")
            await sse_broadcaster.broadcast(
                self.job_id,
                "page_completed",
                {"url": canonical_url, "file_path": rel_path, "title": title}
            )
            return related_titles

        except Exception as e:
            self.failed_titles.add(title)
            await self.log("ERROR", f"Error processing article '{title}': {str(e)}")
            await job_store.upsert_page(
                page_id=page_id,
                job_id=self.job_id,
                url=canonical_url,
                parent_url=parent_url,
                depth=depth,
                status=PageStatus.FAILED.value,
                error_message=str(e)
            )
            return []
