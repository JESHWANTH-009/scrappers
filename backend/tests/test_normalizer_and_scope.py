import pytest
from app.crawler.url_normalizer import normalize_url, url_to_relative_filepath, compute_content_hash
from app.crawler.scope_rules import ScopeRules
from app.models.schemas import ScopeMode

def test_url_normalization_cleans_tracking_and_fragments():
    url = "https://DOCS.Example.com:443/guide/intro.html?utm_source=twitter&topic=rag&utm_campaign=launch#header-1"
    normalized = normalize_url(url)
    assert normalized == "https://docs.example.com/guide/intro.html?topic=rag"

def test_url_normalization_resolves_relative():
    base = "https://example.com/docs/guide/"
    rel1 = "../api/users"
    rel2 = "install.html"
    assert normalize_url(rel1, base) == "https://example.com/docs/api/users"
    assert normalize_url(rel2, base) == "https://example.com/docs/guide/install.html"

def test_deterministic_filepath_mapping():
    assert url_to_relative_filepath("https://docs.example.com/") == "index.md"
    assert url_to_relative_filepath("https://docs.example.com/guide/") == "guide/index.md"
    assert url_to_relative_filepath("https://docs.example.com/guide/install.html") == "guide/install.md"
    assert url_to_relative_filepath("https://docs.example.com/guide/install/linux/") == "guide/install/linux/index.md"

def test_scope_rules_path_strict():
    start = "https://docs.example.com/guide/"
    rules = ScopeRules(start_url=start, scope_mode=ScopeMode.PATH_STRICT)

    # In scope
    ok, _ = rules.is_in_scope("https://docs.example.com/guide/install/")
    assert ok
    ok, _ = rules.is_in_scope("https://docs.example.com/guide/overview.html")
    assert ok

    # Out of scope - different path
    ok, reason = rules.is_in_scope("https://docs.example.com/blog/news")
    assert not ok
    assert "outside" in reason.lower()

    # Out of scope - different domain
    ok, reason = rules.is_in_scope("https://other.com/guide/install")
    assert not ok

def test_scope_rules_ignores_binaries_and_schemes():
    rules = ScopeRules(start_url="https://example.com/docs/", scope_mode=ScopeMode.SAME_HOSTNAME)

    ok, reason = rules.is_in_scope("https://example.com/docs/manual.pdf")
    assert not ok
    assert ".pdf" in reason

    ok, reason = rules.is_in_scope("https://example.com/docs/logo.png")
    assert not ok

    ok, reason = rules.is_in_scope("mailto:support@example.com")
    assert not ok

    ok, reason = rules.is_in_scope("javascript:void(0)")
    assert not ok

def test_scope_rules_regex_patterns():
    rules = ScopeRules(
        start_url="https://example.com/docs/",
        scope_mode=ScopeMode.SAME_HOSTNAME,
        exclude_patterns=[r"/private/.*", r".*\?print=true"]
    )

    ok, _ = rules.is_in_scope("https://example.com/docs/getting-started")
    assert ok

    ok, reason = rules.is_in_scope("https://example.com/docs/private/admin")
    assert not ok
    assert "exclude pattern" in reason
