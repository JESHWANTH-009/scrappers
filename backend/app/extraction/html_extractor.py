import re
from typing import Optional, List, Tuple
from bs4 import BeautifulSoup, Comment
from app.crawler.url_normalizer import normalize_url

# Elements to remove entirely
BOILERPLATE_TAGS = [
    "script", "style", "noscript", "svg", "canvas", "iframe",
    "nav", "footer", "header", "aside"
]

# Class/ID patterns typical of cookie banners, modals, ads
BOILERPLATE_PATTERNS = re.compile(
    r"(cookie[-_]?(notice|banner|popup|consent|bar)|"
    r"ad[-_]?(container|banner|wrapper|box|unit|slot)|"
    r"advertisement|gdpr[-_]?(banner|consent)|"
    r"newsletter[-_]?(popup|signup)|social[-_]?(share|icons)|"
    r"modal[-_]?(overlay|backdrop)|toast[-_]?container)",
    re.IGNORECASE
)

class ExtractedHTML:
    def __init__(
        self,
        title: str,
        clean_html: str,
        discovered_links: List[str],
        canonical_url: Optional[str] = None,
        language: Optional[str] = None,
        last_modified: Optional[str] = None
    ):
        self.title = title
        self.clean_html = clean_html
        self.discovered_links = discovered_links
        self.canonical_url = canonical_url
        self.language = language
        self.last_modified = last_modified

def extract_html_content(raw_html: str, current_url: str) -> ExtractedHTML:
    """
    Parses and cleans HTML document:
    1. Extracts page metadata (title, canonical link, language, last modified)
    2. Discovers internal/navigation links
    3. Strips boilerplate and ads
    4. Isolates main article/document content
    """
    if not raw_html:
        return ExtractedHTML(title="Untitled", clean_html="", discovered_links=[])

    soup = BeautifulSoup(raw_html, "lxml")

    # 1. Extract metadata
    # Title
    title = ""
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    if not title:
        og_title = soup.find("meta", property="og:title")
        if og_title and og_title.get("content"):
            title = og_title["content"].strip()
    if not title:
        h1 = soup.find("h1")
        if h1:
            title = h1.get_text(strip=True)
    if not title:
        title = "Untitled Document"

    # Canonical URL
    canonical_url = None
    canonical_tag = soup.find("link", rel=lambda r: r and "canonical" in r.lower().split())
    if canonical_tag and canonical_tag.get("href"):
        canonical_url = normalize_url(canonical_tag["href"], current_url)

    # Language
    language = None
    html_tag = soup.find("html")
    if html_tag and html_tag.get("lang"):
        language = html_tag["lang"].strip()[:10]

    # Last Modified
    last_modified = None
    date_meta = soup.find("meta", attrs={"name": re.compile(r"(last-modified|date|pubdate)", re.I)})
    if date_meta and date_meta.get("content"):
        last_modified = date_meta["content"].strip()

    # 2. Discover links before stripping navs
    discovered_links = []
    seen_links = set()
    for a in soup.find_all("a", href=True):
        raw_href = a["href"].strip()
        if not raw_href or raw_href.startswith(("#", "javascript:", "mailto:", "tel:", "data:")):
            continue
        try:
            norm_link = normalize_url(raw_href, current_url)
            if norm_link and norm_link not in seen_links:
                seen_links.add(norm_link)
                discovered_links.append(norm_link)
        except Exception:
            continue

    # 3. Remove comments
    for comment in soup.find_all(string=lambda text: isinstance(text, Comment)):
        comment.extract()

    # Remove boilerplate tags
    for tag_name in BOILERPLATE_TAGS:
        for el in soup.find_all(tag_name):
            el.decompose()

    # Remove boilerplate elements matching ads / cookie banners
    for el in soup.find_all(attrs={"class": BOILERPLATE_PATTERNS}):
        el.decompose()
    for el in soup.find_all(attrs={"id": BOILERPLATE_PATTERNS}):
        el.decompose()

    # 4. Isolate main content
    main_el = None
    for selector in ["main", "article", '[role="main"]', "#content", ".content", ".main-content", ".markdown-body"]:
        candidate = soup.select_one(selector)
        if candidate and len(candidate.get_text(strip=True)) > 50:
            main_el = candidate
            break

    target_soup = main_el if main_el is not None else (soup.body if soup.body else soup)

    return ExtractedHTML(
        title=title,
        clean_html=str(target_soup),
        discovered_links=discovered_links,
        canonical_url=canonical_url,
        language=language,
        last_modified=last_modified
    )
