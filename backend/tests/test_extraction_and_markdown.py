import pytest
import yaml
from app.extraction.html_extractor import extract_html_content
from app.extraction.markdown_converter import html_to_markdown, generate_markdown_document

def test_html_extraction_removes_boilerplate_and_finds_links():
    html = """
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <title>Quickstart Guide</title>
        <link rel="canonical" href="https://example.com/guide/quickstart" />
        <script>console.log("tracking");</script>
        <style>.hide { display:none; }</style>
    </head>
    <body>
        <div class="cookie-banner">Please accept cookies!</div>
        <nav><a href="/home">Home</a></nav>
        <main>
            <h1>Getting Started with RAG</h1>
            <p>Retrieval-Augmented Generation enhances LLMs.</p>
            <p>Check out the <a href="/guide/installation">Installation</a> page.</p>
            <pre><code class="language-python">import rag\nrag.init()</code></pre>
        </main>
        <footer>Copyright 2026</footer>
    </body>
    </html>
    """
    extracted = extract_html_content(html, current_url="https://example.com/guide/quickstart")
    assert extracted.title == "Quickstart Guide"
    assert extracted.language == "en"
    assert extracted.canonical_url == "https://example.com/guide/quickstart"
    assert "https://example.com/guide/installation" in extracted.discovered_links
    assert "cookie" not in extracted.clean_html.lower()
    assert "console.log" not in extracted.clean_html

def test_html_to_markdown_formatting():
    html_snippet = """
    <h2>Features</h2>
    <ul>
        <li>Fast async crawling</li>
        <li>Clean Markdown</li>
    </ul>
    <table>
        <tr><th>Name</th><th>Role</th></tr>
        <tr><td>Alice</td><td>Admin</td></tr>
    </table>
    """
    md = html_to_markdown(html_snippet)
    assert "## Features" in md
    assert "- Fast async crawling" in md
    assert "Alice" in md

def test_markdown_document_with_front_matter():
    title = "Advanced Setup"
    body = "Here is the detailed instruction manual."
    meta = {
        "source_url": "https://example.com/setup",
        "job_id": "test_job_123",
        "crawl_depth": 2,
        "source_type": "website",
        "language": "en",
        "http_status": 200
    }
    doc, content_hash = generate_markdown_document(title, body, meta)
    assert doc.startswith("---\n")
    assert content_hash is not None
    assert len(content_hash) == 64  # SHA256 length

    # Validate YAML parseable
    parts = doc.split("---\n")
    parsed_yaml = yaml.safe_load(parts[1])
    assert parsed_yaml["title"] == title
    assert parsed_yaml["source_url"] == "https://example.com/setup"
    assert parsed_yaml["crawl_depth"] == 2
    assert parsed_yaml["source_type"] == "website"
