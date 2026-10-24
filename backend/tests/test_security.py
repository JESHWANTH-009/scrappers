import pytest
from pathlib import Path
from app.security.url_validation import validate_safe_url, is_ip_address_safe
from app.security.path_security import sanitize_filename, safe_resolve_path, PathTraversalError

def test_ssrf_rejects_localhost_and_loopback():
    is_safe, reason = validate_safe_url("http://localhost/admin")
    assert not is_safe
    assert "blocked" in reason.lower()

    is_safe, reason = validate_safe_url("http://127.0.0.1:8080/secret")
    assert not is_safe
    assert "blocked" in reason.lower()

    is_safe, reason = validate_safe_url("http://[::1]/")
    assert not is_safe

def test_ssrf_rejects_private_ips():
    assert not is_ip_address_safe("10.0.0.1")
    assert not is_ip_address_safe("172.16.0.5")
    assert not is_ip_address_safe("192.168.1.1")
    assert not is_ip_address_safe("169.254.169.254")  # AWS/cloud metadata
    assert not is_ip_address_safe("0.0.0.0")

def test_ssrf_rejects_cloud_metadata():
    is_safe, reason = validate_safe_url("http://169.254.169.254/latest/meta-data/")
    assert not is_safe
    is_safe, reason = validate_safe_url("http://metadata.google.internal/computeMetadata/v1/")
    assert not is_safe

def test_ssrf_rejects_non_http_schemes():
    is_safe, reason = validate_safe_url("ftp://example.com/file")
    assert not is_safe
    assert "scheme" in reason.lower()

    is_safe, reason = validate_safe_url("file:///etc/passwd")
    assert not is_safe

    is_safe, reason = validate_safe_url("javascript:alert(1)")
    assert not is_safe

def test_filename_sanitization():
    unsafe = 'my:cool*doc?"<awesome>|file.txt'
    sanitized = sanitize_filename(unsafe)
    for bad_char in [':', '*', '?', '"', '<', '>', '|']:
        assert bad_char not in sanitized

def test_path_traversal_prevention(tmp_path):
    base_dir = tmp_path / "safe_dir"
    base_dir.mkdir()

    # Allowed child
    child = safe_resolve_path(base_dir, "sub/file.md")
    assert child.is_relative_to(base_dir)

    # Denied traversal
    with pytest.raises(PathTraversalError):
        safe_resolve_path(base_dir, "../../../secret.txt")

    with pytest.raises(PathTraversalError):
        safe_resolve_path(base_dir, "sub/../../../../windows/system32")
