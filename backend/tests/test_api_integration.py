import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_api_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data

def test_api_stats():
    response = client.get("/api/crawls/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_jobs" in data
    assert "total_pages_scraped" in data

def test_api_url_crawl_validation():
    # Invalid scheme
    bad_req = {"url": "ftp://example.com/file"}
    resp = client.post("/api/crawls/url", json=bad_req)
    assert resp.status_code == 400

    # Valid request structure
    from unittest.mock import patch
    with patch("app.api.routes.crawls.validate_safe_url", return_value=(True, "")):
        valid_req = {
            "url": "https://example.com/docs/",
            "max_depth": 2,
            "max_pages": 10,
            "max_concurrency": 2
        }
        resp = client.post("/api/crawls/url", json=valid_req)
        assert resp.status_code == 201
        job = resp.json()
        assert job["mode"] == "url"
        assert job["target"] == "https://example.com/docs/"
        assert "id" in job

def test_api_wikipedia_crawl_validation():
    # Empty keyword
    bad_req = {"keyword": "", "max_articles": 5}
    resp = client.post("/api/crawls/wikipedia", json=bad_req)
    assert resp.status_code == 422  # Pydantic validation failure

    valid_req = {
        "keyword": "Retrieval-Augmented Generation",
        "language": "en",
        "max_articles": 3,
        "max_depth": 1
    }
    resp = client.post("/api/crawls/wikipedia", json=valid_req)
    assert resp.status_code == 201
    job = resp.json()
    assert job["mode"] == "wikipedia"
    assert "id" in job

def test_api_cancel_job():
    # Test cancelling non-existent job returns 404
    resp = client.post("/api/crawls/non_existent_123/cancel")
    assert resp.status_code == 404
