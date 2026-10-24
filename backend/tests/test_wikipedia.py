import pytest
import asyncio
from unittest.mock import AsyncMock, patch, MagicMock
from app.models.schemas import WikipediaCrawlRequest, WikiFollowStrategy
from app.crawler.wikipedia_crawler import WikipediaCrawler

@pytest.mark.asyncio
async def test_wikipedia_crawler_search_and_extract(tmp_path):
    req = WikipediaCrawlRequest(
        keyword="Artificial Intelligence",
        language="en",
        max_articles=2,
        max_depth=1,
        follow_links_strategy=WikiFollowStrategy.SEED_ONLY,
        relevance_filter=True
    )

    cancel_event = asyncio.Event()
    crawler = WikipediaCrawler(job_id="test_wiki_job", request=req, cancel_event=cancel_event)

    # Mock responses
    mock_search_json = {
        "query": {
            "search": [
                {"title": "Artificial Intelligence", "pageid": 1164},
                {"title": "Machine Learning", "pageid": 233488}
            ]
        }
    }

    mock_parse_json = {
        "parse": {
            "title": "Artificial Intelligence",
            "pageid": 1164,
            "revid": 999999,
            "text": {"*": "<h2>Overview</h2><p>Artificial intelligence is intelligent behavior by machines.</p>"},
            "links": [{"ns": 0, "exists": "", "*": "Machine Learning"}]
        }
    }

    mock_client = AsyncMock()
    mock_search_resp = MagicMock()
    mock_search_resp.json.return_value = mock_search_json
    
    mock_parse_resp = MagicMock()
    mock_parse_resp.json.return_value = mock_parse_json

    async def mock_get(*args, **kwargs):
        params = kwargs.get("params", {})
        if params.get("action") == "query":
            return mock_search_resp
        return mock_parse_resp

    mock_client.get.side_effect = mock_get

    results = await crawler.search_wikipedia(mock_client, "Artificial Intelligence", 2)
    assert len(results) == 2
    assert results[0]["title"] == "Artificial Intelligence"

    related = await crawler.process_article(mock_client, "Artificial Intelligence", None, 0)
    assert "Machine Learning" in related
    assert "Artificial Intelligence" in crawler.scraped_titles
