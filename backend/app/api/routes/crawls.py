import json
from pathlib import Path
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse, FileResponse
from app.models.schemas import (
    URLCrawlRequest,
    WikipediaCrawlRequest,
    CrawlJobResponse,
    CrawlStatsResponse,
    CrawlPageItem,
    JobStatus
)
from app.services.job_store import job_store
from app.services.crawl_manager import crawl_manager
from app.services.sse_broadcaster import sse_broadcaster
from app.storage.file_storage import file_storage
from app.security.path_security import safe_resolve_path, PathTraversalError
from app.security.url_validation import validate_safe_url
from app.config import settings

router = APIRouter(prefix="/crawls", tags=["Crawls"])

@router.post("/url", status_code=status.HTTP_201_CREATED)
async def start_url_crawl(request: URLCrawlRequest):
    """Starts a new URL-based crawl job."""
    is_safe, error_reason = validate_safe_url(request.url, allow_private=settings.ALLOW_PRIVATE_IPS)
    if not is_safe:
        raise HTTPException(status_code=400, detail=f"Invalid or unsafe URL: {error_reason}")
    try:
        job = await crawl_manager.start_url_crawl(request)
        return job
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/wikipedia", status_code=status.HTTP_201_CREATED)
async def start_wikipedia_crawl(request: WikipediaCrawlRequest):
    """Starts a new Wikipedia keyword search crawl."""
    try:
        job = await crawl_manager.start_wikipedia_crawl(request)
        return job
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/stats")
async def get_crawl_stats():
    """Returns overview dashboard statistics."""
    stats = await job_store.get_stats()
    return stats

@router.get("", response_model=list[dict])
async def list_crawls(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    status: Optional[str] = Query(None),
    mode: Optional[str] = Query(None)
):
    """Lists crawl jobs with pagination and optional filtering."""
    jobs = await job_store.list_jobs(limit=limit, offset=offset, status=status, mode=mode)
    return jobs

@router.get("/{job_id}")
async def get_crawl_details(job_id: str):
    """Retrieves full metadata and status for a specific crawl job."""
    job = await job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")
    return job

@router.get("/{job_id}/events")
async def stream_crawl_events(job_id: str):
    """Streams live Server-Sent Events (SSE) for crawl progress."""
    job = await job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    return StreamingResponse(
        sse_broadcaster.subscribe(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.post("/{job_id}/cancel")
async def cancel_crawl(job_id: str):
    """Cancels a running crawl job."""
    job = await job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    success = await crawl_manager.cancel_job(job_id)
    if success:
        return {"message": f"Cancellation requested for job '{job_id}'."}
    else:
        # If not active in memory but marked running in DB
        if job.get("status") == JobStatus.RUNNING.value:
            await job_store.update_job_status(job_id, JobStatus.CANCELLED.value)
            return {"message": f"Job '{job_id}' marked as cancelled."}
        return {"message": f"Job '{job_id}' is not currently running."}

@router.post("/{job_id}/retry")
async def retry_crawl(job_id: str):
    """Retries a failed, cancelled, or interrupted crawl job."""
    new_job = await crawl_manager.retry_job(job_id)
    if not new_job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' could not be retried.")
    return new_job

@router.get("/{job_id}/pages")
async def get_crawl_pages(job_id: str):
    """Lists all discovered and scraped pages for a crawl job."""
    pages = await job_store.get_pages_for_job(job_id)
    return pages

@router.get("/{job_id}/logs")
async def get_crawl_logs(job_id: str, limit: int = Query(200, ge=1, le=1000)):
    """Retrieves activity logs for a crawl job."""
    logs = await job_store.get_logs_for_job(job_id, limit=limit)
    return logs

@router.get("/{job_id}/manifest")
async def get_crawl_manifest(job_id: str):
    """Returns the manifest.json for a crawl job."""
    job_dir = file_storage.get_job_dir(job_id)
    manifest_path = job_dir / "manifest.json"
    if not manifest_path.exists():
        raise HTTPException(status_code=404, detail=f"Manifest for job '{job_id}' does not exist yet.")

    with open(manifest_path, "r", encoding="utf-8") as f:
        return json.load(f)

@router.get("/{job_id}/download")
async def download_crawl_zip(job_id: str):
    """Downloads all scraped Markdown files and manifest as a safe ZIP archive."""
    job = await job_store.get_job(job_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found.")

    try:
        zip_path = file_storage.create_job_zip(job_id)
        return FileResponse(
            path=str(zip_path),
            filename=f"rag_crawl_{job_id}.zip",
            media_type="application/zip"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create ZIP: {str(e)}")

@router.get("/{job_id}/pages/{page_id}/content")
async def get_page_content(job_id: str, page_id: str):
    """
    Returns the raw Markdown content of a specific scraped page.
    Prevents path traversal and validates file existence.
    """
    pages = await job_store.get_pages_for_job(job_id)
    target_page = next((p for p in pages if p["id"] == page_id), None)
    if not target_page:
        raise HTTPException(status_code=404, detail="Page record not found.")

    file_rel_path = target_page.get("file_path")
    if not file_rel_path:
        raise HTTPException(status_code=404, detail="No markdown file associated with this page.")

    try:
        content = file_storage.read_page_content(job_id, file_rel_path)
        return {
            "page_id": page_id,
            "title": target_page.get("title"),
            "url": target_page.get("url"),
            "file_path": file_rel_path,
            "content": content
        }
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Markdown file not found on disk.")
    except PathTraversalError as e:
        raise HTTPException(status_code=403, detail=str(e))
