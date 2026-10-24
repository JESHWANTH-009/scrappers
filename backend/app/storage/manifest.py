import json
from pathlib import Path
from typing import Any, Optional
from app.storage.file_storage import file_storage, FileStorageManager

def build_crawl_hierarchy(pages: list[dict[str, Any]]) -> dict[str, Any]:
    """
    Builds a hierarchical tree from a flat list of page records linked by parent_url.
    """
    tree: dict[str, Any] = {}
    url_to_node = {}

    # Initialize nodes
    for p in pages:
        url = p.get("url")
        if not url:
            continue
        node = {
            "url": url,
            "title": p.get("title") or url,
            "path": p.get("file_path"),
            "depth": p.get("depth", 0),
            "status": p.get("status"),
            "children": []
        }
        url_to_node[url] = node

    # Assemble hierarchy
    roots = []
    for p in pages:
        url = p.get("url")
        parent = p.get("parent_url")
        node = url_to_node.get(url)
        if not node:
            continue

        if parent and parent in url_to_node and parent != url:
            url_to_node[parent]["children"].append(node)
        else:
            roots.append(node)

    return {"roots": roots}

def generate_and_save_manifest(
    job_id: str,
    mode: str,
    target: str,
    config: dict[str, Any],
    status: str,
    created_at: str,
    completed_at: Optional[str],
    pages: list[dict[str, Any]],
    logs: Optional[list[dict[str, Any]]] = None,
    storage: Optional[FileStorageManager] = None
) -> Path:
    """
    Generates and writes manifest.json in the crawl job directory.
    """
    target_storage = storage or file_storage
    job_dir = target_storage.get_job_dir(job_id)
    manifest_path = job_dir / "manifest.json"

    successful_pages = [p for p in pages if p.get("status") == "completed"]
    failed_pages = [p for p in pages if p.get("status") == "failed"]

    manifest_data = {
        "job_id": job_id,
        "mode": mode,
        "target": target,
        "status": status,
        "created_at": created_at,
        "completed_at": completed_at,
        "config": config,
        "summary": {
            "total_pages_discovered": len(pages),
            "total_pages_scraped": len(successful_pages),
            "total_pages_failed": len(failed_pages),
            "total_markdown_files": len(successful_pages)
        },
        "hierarchy": build_crawl_hierarchy(pages),
        "pages": pages,
        "logs": logs or []
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2, ensure_ascii=False)

    return manifest_path
