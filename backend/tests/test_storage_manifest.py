import json
import zipfile
import pytest
from pathlib import Path
from app.storage.file_storage import FileStorageManager
from app.storage.manifest import build_crawl_hierarchy, generate_and_save_manifest

def test_file_storage_website_hierarchy(tmp_path):
    storage = FileStorageManager(base_crawls_dir=tmp_path)
    job_id = "test_job_001"
    
    url = "https://example.com/guide/installation/"
    content = "---\ntitle: Installation\n---\n# Installation content"
    
    abs_path, rel_path = storage.save_website_page(job_id, url, content)
    assert abs_path.exists()
    assert "guide/installation/index.md" in rel_path.replace("\\", "/")

def test_file_storage_collision_avoidance(tmp_path):
    storage = FileStorageManager(base_crawls_dir=tmp_path)
    job_id = "test_job_002"
    
    # Two different URLs mapping to similar relative path
    url1 = "https://example.com/item?id=1"
    url2 = "https://example.com/item?id=2"
    
    _, rel1 = storage.save_website_page(job_id, url1, "---\nsource_url: https://example.com/item?id=1\n---\nItem 1")
    _, rel2 = storage.save_website_page(job_id, url2, "---\nsource_url: https://example.com/item?id=2\n---\nItem 2")
    
    assert rel1 != rel2

def test_file_storage_wikipedia_path(tmp_path):
    storage = FileStorageManager(base_crawls_dir=tmp_path)
    job_id = "test_job_003"
    
    abs_path, rel_path = storage.save_wikipedia_page(
        job_id=job_id,
        title="Artificial Intelligence",
        page_id=1164,
        language="en",
        markdown_content="# AI"
    )
    assert abs_path.exists()
    assert "wikipedia/en/artificial_intelligence--1164.md" in rel_path.replace("\\", "/")

def test_manifest_generation_and_zip(tmp_path):
    storage = FileStorageManager(base_crawls_dir=tmp_path)
    job_id = "test_job_004"
    
    pages = [
        {"url": "https://example.com/", "title": "Home", "file_path": "pages/index.md", "status": "completed", "depth": 0, "parent_url": None},
        {"url": "https://example.com/about", "title": "About", "file_path": "pages/about.md", "status": "completed", "depth": 1, "parent_url": "https://example.com/"}
    ]
    
    manifest_file = generate_and_save_manifest(
        job_id=job_id,
        mode="url",
        target="https://example.com/",
        config={},
        status="completed",
        created_at="2026-10-23T12:00:00Z",
        completed_at="2026-10-23T12:01:00Z",
        pages=pages,
        storage=storage
    )
    assert manifest_file.exists()
    
    with open(manifest_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    assert data["summary"]["total_pages_scraped"] == 2
    assert len(data["hierarchy"]["roots"]) == 1
    assert len(data["hierarchy"]["roots"][0]["children"]) == 1

    # Test ZIP
    zip_path = storage.create_job_zip(job_id)
    assert zip_path.exists()
    with zipfile.ZipFile(zip_path, "r") as zf:
        namelist = zf.namelist()
        assert "manifest.json" in namelist
