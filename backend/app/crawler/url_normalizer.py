import urllib.parse
import hashlib
import posixpath
import re
from pathlib import Path
from typing import Optional
from app.security.path_security import sanitize_filename

TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "gclid", "fbclid", "ref", "_ga", "mc_cid", "mc_eid", "dclid", "msclkid",
    "zanpid", "igshid", "yclid", "soc_src", "soc_trk", "trk"
}

def normalize_url(url: str, base_url: Optional[str] = None) -> str:
    """
    Normalizes a URL:
    - Resolves relative URLs against base_url if provided
    - Lowercases scheme and hostname
    - Strips default ports (:80 for http, :443 for https)
    - Strips fragments (#...)
    - Strips analytics/tracking query parameters
    - Alphabetically sorts remaining query parameters
    - Normalizes redundant slashes in path
    """
    if not url:
        return ""

    url = url.strip()

    # Join relative link if base_url is provided
    if base_url:
        url = urllib.parse.urljoin(base_url, url)

    parsed = urllib.parse.urlsplit(url)

    scheme = parsed.scheme.lower()
    netloc = parsed.netloc.lower()

    # Strip default ports
    if scheme == "http" and netloc.endswith(":80"):
        netloc = netloc[:-3]
    elif scheme == "https" and netloc.endswith(":443"):
        netloc = netloc[:-4]

    # Normalize path
    path = parsed.path
    if not path:
        path = "/"
    else:
        # Normalize double slashes but preserve trailing slash
        has_trailing = path.endswith("/")
        segments = [s for s in path.split("/") if s and s != "."]
        # Resolve '..' segments
        resolved = []
        for s in segments:
            if s == "..":
                if resolved:
                    resolved.pop()
            else:
                resolved.append(s)
        path = "/" + "/".join(resolved)
        if has_trailing and path != "/":
            path += "/"

    # Filter tracking params and sort remaining
    if parsed.query:
        query_pairs = urllib.parse.parse_qsl(parsed.query, keep_blank_values=True)
        filtered_pairs = [
            (k, v) for k, v in query_pairs
            if k.lower() not in TRACKING_PARAMS
        ]
        filtered_pairs.sort(key=lambda x: x[0])
        query_str = urllib.parse.urlencode(filtered_pairs)
    else:
        query_str = ""

    # Reassemble without fragment
    normalized = urllib.parse.urlunsplit((scheme, netloc, path, query_str, ""))
    return normalized

def compute_content_hash(content: str) -> str:
    """Computes a SHA-256 hash of the content."""
    return hashlib.sha256(content.encode("utf-8")).hexdigest()

def url_to_relative_filepath(url: str) -> str:
    """
    Deterministically maps a website URL into a safe relative Markdown (.md) path.
    Preserves source directory hierarchy.
    
    Examples:
    - https://docs.example.com/guide/ -> guide/index.md
    - https://docs.example.com/guide/install/ -> guide/install/index.md
    - https://docs.example.com/guide/install/linux/ -> guide/install/linux/index.md
    - https://docs.example.com/guide/config.html -> guide/config.md
    - https://docs.example.com/ -> index.md
    - https://docs.example.com/api?endpoint=users -> api/users--<hash>.md
    """
    parsed = urllib.parse.urlsplit(url)
    raw_path = parsed.path.strip("/")
    
    # Path parts
    if not raw_path:
        parts = []
    else:
        parts = raw_path.split("/")

    # Check query params
    query_suffix = ""
    if parsed.query:
        # Create a short 6-char hash of the query string to prevent collisions
        q_hash = hashlib.sha256(parsed.query.encode("utf-8")).hexdigest()[:6]
        query_suffix = f"--q_{q_hash}"

    if not parts:
        # Root URL
        return f"index{query_suffix}.md"

    # Process intermediate directories
    sanitized_parts = [sanitize_filename(p) for p in parts[:-1]]
    last_part = parts[-1]

    # Check if last part is an html/htm/php/asp/md document
    m = re.match(r"^(.*?)\.(html?|php|aspx?|md|txt)$", last_part, re.IGNORECASE)
    if m:
        base_name = sanitize_filename(m.group(1))
        file_name = f"{base_name}{query_suffix}.md"
        all_parts = sanitized_parts + [file_name]
    else:
        # Directory-like URL: e.g. /guide/install/ or /guide/install
        # If url ended with a slash, it's a directory containing index.md
        if parsed.path.endswith("/"):
            dir_name = sanitize_filename(last_part)
            file_name = f"index{query_suffix}.md"
            all_parts = sanitized_parts + [dir_name, file_name]
        else:
            # e.g. /guide/install without trailing slash
            # Check if query exists
            if query_suffix:
                file_name = f"{sanitize_filename(last_part)}{query_suffix}.md"
                all_parts = sanitized_parts + [file_name]
            else:
                # Treat as directory index or page
                file_name = f"{sanitize_filename(last_part)}.md"
                all_parts = sanitized_parts + [file_name]

    return "/".join(all_parts)
