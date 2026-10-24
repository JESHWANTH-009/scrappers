import re
import yaml
from datetime import datetime, timezone
from typing import Optional, Any
from markdownify import markdownify as md_convert
from app.crawler.url_normalizer import compute_content_hash

def clean_markdown_text(text: str) -> str:
    """Cleans up markdown formatting artifacts and excessive blank lines."""
    # Replace multiple blank lines with max 2
    text = re.sub(r'\n{3,}', '\n\n', text)
    # Strip trailing whitespace on each line
    lines = [line.rstrip() for line in text.split('\n')]
    return '\n'.join(lines).strip()

def html_to_markdown(html_content: str) -> str:
    """
    Converts HTML string to clean, readable Markdown preserving headings,
    lists, code blocks, tables, and links.
    """
    if not html_content or not html_content.strip():
        return ""

    converted = md_convert(
        html_content,
        heading_style="ATX",  # #, ##, ###
        bullets="-",
        code_language="",
        strip=["script", "style", "nav", "footer", "aside"]
    )
    return clean_markdown_text(converted)

def generate_markdown_document(
    title: str,
    body_markdown: str,
    metadata: dict[str, Any]
) -> tuple[str, str]:
    """
    Combines YAML front matter with title and body markdown.
    Returns (full_document, content_hash).
    """
    # Clean up body
    cleaned_body = clean_markdown_text(body_markdown)
    
    # If the markdown does not already start with a level 1 heading and title is present, add it
    if title and not re.match(r"^#\s+", cleaned_body):
        content_with_title = f"# {title}\n\n{cleaned_body}"
    else:
        content_with_title = cleaned_body

    content_hash = compute_content_hash(content_with_title)

    # Enrich metadata with content_hash and scraped_at if missing
    enriched_meta = {
        "title": title,
        "source_url": metadata.get("source_url", ""),
        "canonical_url": metadata.get("canonical_url", metadata.get("source_url", "")),
        "job_id": metadata.get("job_id", ""),
        "scraped_at": metadata.get("scraped_at", datetime.now(timezone.utc).isoformat()),
        "content_hash": content_hash,
        "crawl_depth": metadata.get("crawl_depth", 0),
        "parent_url": metadata.get("parent_url"),
        "source_type": metadata.get("source_type", "website"),
        "language": metadata.get("language")
    }

    # Add source specific metadata
    if enriched_meta["source_type"] == "wikipedia":
        enriched_meta["page_id"] = metadata.get("page_id")
        enriched_meta["revision_id"] = metadata.get("revision_id")
        enriched_meta["search_keyword"] = metadata.get("search_keyword")
        enriched_meta["namespace"] = metadata.get("namespace", 0)
    else:
        enriched_meta["http_status"] = metadata.get("http_status", 200)
        enriched_meta["content_type"] = metadata.get("content_type", "text/html")
        enriched_meta["last_modified"] = metadata.get("last_modified")

    # Filter out None values in frontmatter
    filtered_meta = {k: v for k, v in enriched_meta.items() if v is not None}

    # Format YAML
    yaml_header = yaml.dump(
        filtered_meta,
        sort_keys=False,
        allow_unicode=True,
        default_flow_style=False
    ).strip()

    full_document = f"---\n{yaml_header}\n---\n\n{content_with_title}\n"
    return full_document, content_hash
