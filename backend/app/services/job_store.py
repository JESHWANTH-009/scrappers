import json
import sqlite3
import aiosqlite
from datetime import datetime, timezone
from typing import Optional, Any
from pathlib import Path
from app.config import settings

class JobStore:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = str(db_path or settings.DATABASE_PATH)

    async def init_db(self):
        """Initializes database schema and handles startup recovery."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                CREATE TABLE IF NOT EXISTS crawl_jobs (
                    id TEXT PRIMARY KEY,
                    mode TEXT NOT NULL,
                    target TEXT NOT NULL,
                    config_json TEXT NOT NULL,
                    status TEXT NOT NULL,
                    pages_discovered INTEGER DEFAULT 0,
                    pages_scraped INTEGER DEFAULT 0,
                    pages_failed INTEGER DEFAULT 0,
                    markdown_files_count INTEGER DEFAULT 0,
                    current_url TEXT,
                    current_depth INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    started_at TEXT,
                    completed_at TEXT,
                    error_message TEXT,
                    manifest_path TEXT
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS crawl_pages (
                    id TEXT PRIMARY KEY,
                    job_id TEXT NOT NULL,
                    url TEXT NOT NULL,
                    canonical_url TEXT,
                    parent_url TEXT,
                    depth INTEGER DEFAULT 0,
                    status TEXT NOT NULL,
                    http_status INTEGER,
                    file_path TEXT,
                    title TEXT,
                    content_hash TEXT,
                    error_message TEXT,
                    scraped_at TEXT,
                    discovered_links_count INTEGER DEFAULT 0,
                    FOREIGN KEY(job_id) REFERENCES crawl_jobs(id),
                    UNIQUE(job_id, url)
                )
            """)

            await db.execute("""
                CREATE TABLE IF NOT EXISTS crawl_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_id TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    level TEXT NOT NULL,
                    message TEXT NOT NULL,
                    FOREIGN KEY(job_id) REFERENCES crawl_jobs(id)
                )
            """)

            # Startup recovery: mark interrupted jobs
            await db.execute("""
                UPDATE crawl_jobs
                SET status = 'interrupted',
                    error_message = 'Job interrupted due to server shutdown or restart'
                WHERE status IN ('running', 'pending')
            """)

            await db.commit()

    async def create_job(
        self,
        job_id: str,
        mode: str,
        target: str,
        config: dict[str, Any]
    ) -> dict[str, Any]:
        """Creates a new crawl job record."""
        now = datetime.now(timezone.utc).isoformat()
        config_json = json.dumps(config)
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO crawl_jobs (
                    id, mode, target, config_json, status,
                    pages_discovered, pages_scraped, pages_failed, markdown_files_count,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?)
            """, (job_id, mode, target, config_json, "pending", now))
            await db.commit()

        return await self.get_job(job_id)

    async def get_job(self, job_id: str) -> Optional[dict[str, Any]]:
        """Retrieves a single crawl job by ID."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute("SELECT * FROM crawl_jobs WHERE id = ?", (job_id,)) as cursor:
                row = await cursor.fetchone()
                if not row:
                    return None
                data = dict(row)
                data["config"] = json.loads(data["config_json"]) if data.get("config_json") else {}
                return data

    async def update_job_status(
        self,
        job_id: str,
        status: str,
        error_message: Optional[str] = None,
        started_at: Optional[str] = None,
        completed_at: Optional[str] = None,
        manifest_path: Optional[str] = None
    ):
        """Updates job status and timestamps."""
        updates = ["status = ?"]
        params = [status]

        if error_message is not None:
            updates.append("error_message = ?")
            params.append(error_message)
        if started_at is not None:
            updates.append("started_at = ?")
            params.append(started_at)
        if completed_at is not None:
            updates.append("completed_at = ?")
            params.append(completed_at)
        if manifest_path is not None:
            updates.append("manifest_path = ?")
            params.append(manifest_path)

        params.append(job_id)
        query = f"UPDATE crawl_jobs SET {', '.join(updates)} WHERE id = ?"

        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(query, tuple(params))
            await db.commit()

    async def update_job_progress(
        self,
        job_id: str,
        current_url: Optional[str] = None,
        current_depth: Optional[int] = None,
        pages_discovered: Optional[int] = None,
        pages_scraped: Optional[int] = None,
        pages_failed: Optional[int] = None,
        markdown_files_count: Optional[int] = None
    ):
        """Updates running counters and active page state."""
        updates = []
        params = []
        if current_url is not None:
            updates.append("current_url = ?")
            params.append(current_url)
        if current_depth is not None:
            updates.append("current_depth = ?")
            params.append(current_depth)
        if pages_discovered is not None:
            updates.append("pages_discovered = ?")
            params.append(pages_discovered)
        if pages_scraped is not None:
            updates.append("pages_scraped = ?")
            params.append(pages_scraped)
        if pages_failed is not None:
            updates.append("pages_failed = ?")
            params.append(pages_failed)
        if markdown_files_count is not None:
            updates.append("markdown_files_count = ?")
            params.append(markdown_files_count)

        if not updates:
            return

        params.append(job_id)
        query = f"UPDATE crawl_jobs SET {', '.join(updates)} WHERE id = ?"
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(query, tuple(params))
            await db.commit()

    async def list_jobs(
        self,
        limit: int = 50,
        offset: int = 0,
        status: Optional[str] = None,
        mode: Optional[str] = None
    ) -> list[dict[str, Any]]:
        """Lists crawl jobs with pagination and filters."""
        query = "SELECT * FROM crawl_jobs"
        conditions = []
        params = []

        if status:
            conditions.append("status = ?")
            params.append(status)
        if mode:
            conditions.append("mode = ?")
            params.append(mode)

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
        params.extend([limit, offset])

        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(query, tuple(params)) as cursor:
                rows = await cursor.fetchall()
                results = []
                for row in rows:
                    d = dict(row)
                    d["config"] = json.loads(d["config_json"]) if d.get("config_json") else {}
                    results.append(d)
                return results

    async def upsert_page(
        self,
        page_id: str,
        job_id: str,
        url: str,
        canonical_url: Optional[str] = None,
        parent_url: Optional[str] = None,
        depth: int = 0,
        status: str = "queued",
        http_status: Optional[int] = None,
        file_path: Optional[str] = None,
        title: Optional[str] = None,
        content_hash: Optional[str] = None,
        error_message: Optional[str] = None,
        scraped_at: Optional[str] = None,
        discovered_links_count: int = 0
    ):
        """Inserts or updates a page record."""
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute("""
                INSERT INTO crawl_pages (
                    id, job_id, url, canonical_url, parent_url, depth,
                    status, http_status, file_path, title, content_hash,
                    error_message, scraped_at, discovered_links_count
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(job_id, url) DO UPDATE SET
                    canonical_url = COALESCE(excluded.canonical_url, crawl_pages.canonical_url),
                    status = excluded.status,
                    http_status = COALESCE(excluded.http_status, crawl_pages.http_status),
                    file_path = COALESCE(excluded.file_path, crawl_pages.file_path),
                    title = COALESCE(excluded.title, crawl_pages.title),
                    content_hash = COALESCE(excluded.content_hash, crawl_pages.content_hash),
                    error_message = excluded.error_message,
                    scraped_at = COALESCE(excluded.scraped_at, crawl_pages.scraped_at),
                    discovered_links_count = COALESCE(excluded.discovered_links_count, crawl_pages.discovered_links_count)
            """, (
                page_id, job_id, url, canonical_url, parent_url, depth,
                status, http_status, file_path, title, content_hash,
                error_message, scraped_at, discovered_links_count
            ))
            await db.commit()

    async def get_pages_for_job(self, job_id: str) -> list[dict[str, Any]]:
        """Retrieves all pages for a given crawl job."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT * FROM crawl_pages WHERE job_id = ? ORDER BY depth ASC, url ASC",
                (job_id,)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    async def add_log(self, job_id: str, level: str, message: str):
        """Adds an event log entry for a crawl job."""
        now = datetime.now(timezone.utc).isoformat()
        async with aiosqlite.connect(self.db_path) as db:
            await db.execute(
                "INSERT INTO crawl_logs (job_id, timestamp, level, message) VALUES (?, ?, ?, ?)",
                (job_id, now, level.upper(), message)
            )
            await db.commit()

    async def get_logs_for_job(self, job_id: str, limit: int = 100) -> list[dict[str, Any]]:
        """Gets recent logs for a job."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT timestamp, level, message FROM crawl_logs WHERE job_id = ? ORDER BY id ASC LIMIT ?",
                (job_id, limit)
            ) as cursor:
                rows = await cursor.fetchall()
                return [dict(r) for r in rows]

    async def get_stats(self) -> dict[str, Any]:
        """Calculates global dashboard statistics."""
        async with aiosqlite.connect(self.db_path) as db:
            db.row_factory = aiosqlite.Row
            
            # Counts
            async with db.execute("SELECT COUNT(*) as count FROM crawl_jobs") as c:
                row = await c.fetchone()
                total_jobs = row["count"] if row else 0

            async with db.execute("SELECT COUNT(*) as count FROM crawl_jobs WHERE status = 'running'") as c:
                row = await c.fetchone()
                active_jobs = row["count"] if row else 0

            async with db.execute("SELECT COUNT(*) as count FROM crawl_pages") as c:
                row = await c.fetchone()
                total_discovered = row["count"] if row else 0

            async with db.execute("SELECT COUNT(*) as count FROM crawl_pages WHERE status = 'completed'") as c:
                row = await c.fetchone()
                total_scraped = row["count"] if row else 0

        recent_jobs = await self.list_jobs(limit=5)
        return {
            "total_jobs": total_jobs,
            "total_pages_discovered": total_discovered,
            "total_pages_scraped": total_scraped,
            "total_markdown_files": total_scraped,
            "active_jobs": active_jobs,
            "recent_jobs": recent_jobs
        }

job_store = JobStore()
