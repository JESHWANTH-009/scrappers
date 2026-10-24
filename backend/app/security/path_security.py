from pathlib import Path
import os
import re

class PathTraversalError(ValueError):
    """Raised when a file path violates containment rules."""
    pass

def sanitize_filename(name: str) -> str:
    r"""
    Sanitizes a string to be safely used as a filename on Windows, Linux, and macOS.
    Replaces characters like : * ? " < > | / \ with underscores or hyphens.
    """
    # Replace dangerous filesystem characters
    cleaned = re.sub(r'[<>:"/\\|?*\x00-\x1f]', '_', name)
    # Strip leading/trailing dots and spaces
    cleaned = cleaned.strip('. ')
    if not cleaned:
        cleaned = "unnamed"
    # Cap length to 150 characters to prevent OS path limit issues
    if len(cleaned) > 150:
        cleaned = cleaned[:150]
    return cleaned

def safe_resolve_path(base_dir: Path, requested_relative_path: str) -> Path:
    """
    Safely resolves a relative path within a base directory.
    Guarantees the resolved path is strictly inside base_dir, preventing path traversal attacks.
    """
    base = base_dir.resolve()
    
    # Clean leading slashes
    clean_relative = requested_relative_path.lstrip("/\\")
    
    candidate = (base / clean_relative).resolve()
    
    # Check containment
    try:
        candidate.relative_to(base)
    except ValueError:
        raise PathTraversalError(f"Access denied: path '{requested_relative_path}' traverses outside base directory.")

    return candidate
