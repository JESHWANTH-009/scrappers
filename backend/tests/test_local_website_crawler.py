import pytest
import asyncio
from unittest.mock import patch
import httpx
from app.models.schemas import URLCrawlRequest, ScopeMode
from app.crawler.url_crawler import URLCrawler
from app.storage.file_storage import file_storage

@pytest.mark.asyncio
async def test_crawler_on_local_mock_website(tmp_path):
    job_id = "test_local_crawl_001"
    req = URLCrawlRequest(
        url="http://testsite.local/docs/",
        scope_mode=ScopeMode.PATH_STRICT,
        max_depth=3,
        max_pages=10,
        max_concurrency=1,
        request_delay_ms=0
    )

    cancel_event = asyncio.Event()
    crawler = URLCrawler(job_id=job_id, request=req, cancel_event=cancel_event)

    # Mock website pages:
    # 1. /docs/ (root) with links to /docs/install, /docs/redirect, /blog/news (out of scope), and duplicate /docs/install
    # 2. /docs/install with links to /docs/install/linux
    # 3. /docs/redirect returning 302 -> /docs/install/linux
    # 4. /docs/install/linux (leaf)
    
    pages = {
        "http://testsite.local/docs/": """
            <html>
                <head><title>Documentation Root</title></head>
                <body>
                    <main>
                        <h1>Docs Home</h1>
                        <a href="/docs/install">Installation</a>
                        <a href="/docs/redirect">Quickstart Redirect</a>
                        <a href="/blog/news">Blog News (Out of scope)</a>
                        <a href="/docs/install">Installation Duplicate</a>
                    </main>
                </body>
            </html>
        """,
        "http://testsite.local/docs/install": """
            <html>
                <head><title>Install Guide</title></head>
                <body>
                    <main>
                        <h1>Install</h1>
                        <p>How to install.</p>
                        <a href="/docs/install/linux">Linux instructions</a>
                    </main>
                </body>
            </html>
        """,
        "http://testsite.local/docs/install/linux": """
            <html>
                <head><title>Linux Guide</title></head>
                <body>
                    <main>
                        <h1>Linux Setup</h1>
                        <p>Detailed apt commands.</p>
                    </main>
                </body>
            </html>
        """
    }

    def mock_transport_handler(request: httpx.Request) -> httpx.Response:
        url_str = str(request.url)
        if url_str == "http://testsite.local/docs/redirect":
            # Redirect to /docs/install/linux
            return httpx.Response(
                302,
                headers={"Location": "http://testsite.local/docs/install/linux"},
                request=request
            )
        
        if url_str in pages:
            return httpx.Response(
                200,
                headers={"Content-Type": "text/html; charset=utf-8"},
                text=pages[url_str],
                request=request
            )
        
        return httpx.Response(404, text="Not Found", request=request)

    mock_transport = httpx.MockTransport(mock_transport_handler)

    # Patch AsyncClient to use our mock transport and mock SSRF validation
    with patch("httpx.AsyncClient", return_value=httpx.AsyncClient(transport=mock_transport, follow_redirects=True)), \
         patch("app.crawler.url_crawler.validate_safe_url", return_value=(True, "")):
        await crawler.run()

    # Validate that in-scope pages were crawled
    assert "http://testsite.local/docs/" in crawler.scraped_urls
    assert "http://testsite.local/docs/install" in crawler.scraped_urls
    assert "http://testsite.local/docs/install/linux" in crawler.scraped_urls

    # Validate out-of-scope page was NOT scraped
    assert "http://testsite.local/blog/news" not in crawler.scraped_urls

    # Check that markdown files were written
    job_dir = file_storage.get_job_dir(job_id)
    assert (job_dir / "manifest.json").exists()
    assert (job_dir / "pages" / "docs" / "index.md").exists()
    assert (job_dir / "pages" / "docs" / "install" / "index.md").exists() or (job_dir / "pages" / "docs" / "install.md").exists()
