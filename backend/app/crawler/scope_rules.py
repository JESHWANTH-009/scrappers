import re
import urllib.parse
from app.models.schemas import ScopeMode

IGNORED_EXTENSIONS = {
    # Images
    ".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp", ".ico", ".bmp", ".tiff",
    # Documents / Binaries
    ".pdf", ".zip", ".tar", ".gz", ".7z", ".rar", ".exe", ".dmg", ".pkg", ".deb", ".rpm", ".iso", ".bin",
    ".docx", ".xlsx", ".pptx", ".odt", ".ods", ".odp",
    # Audio / Video
    ".mp4", ".mp3", ".wav", ".avi", ".mov", ".flv", ".webm", ".mkv", ".m4a", ".ogg",
    # Web assets / feeds
    ".css", ".js", ".json", ".xml", ".rss", ".atom", ".woff", ".woff2", ".ttf", ".eot"
}

IGNORED_SCHEMES = {"mailto", "tel", "javascript", "data", "ftp", "file", "irc", "magnet"}

class ScopeRules:
    def __init__(
        self,
        start_url: str,
        scope_mode: ScopeMode = ScopeMode.PATH_STRICT,
        include_subdomains: bool = False,
        include_patterns: list[str] = None,
        exclude_patterns: list[str] = None,
    ):
        self.start_url = start_url
        self.scope_mode = scope_mode
        self.include_subdomains = include_subdomains

        parsed = urllib.parse.urlsplit(start_url)
        self.start_scheme = parsed.scheme.lower()
        self.start_netloc = parsed.netloc.lower()
        self.start_hostname = parsed.hostname.lower() if parsed.hostname else ""
        
        # Start base path directory
        path = parsed.path
        if not path or not path.endswith("/"):
            # If path points to a file, take its directory
            if "/" in path:
                self.start_base_path = path.rsplit("/", 1)[0] + "/"
            else:
                self.start_base_path = "/"
        else:
            self.start_base_path = path

        # Compile regex patterns
        self.include_regexes = []
        if include_patterns:
            for p in include_patterns:
                if p.strip():
                    try:
                        self.include_regexes.append(re.compile(p.strip()))
                    except re.error:
                        pass

        self.exclude_regexes = []
        if exclude_patterns:
            for p in exclude_patterns:
                if p.strip():
                    try:
                        self.exclude_regexes.append(re.compile(p.strip()))
                    except re.error:
                        pass

    def is_in_scope(self, candidate_url: str) -> tuple[bool, str]:
        """
        Determines if candidate_url is eligible to be crawled based on the scope rules.
        Returns (is_allowed, reason).
        """
        if not candidate_url:
            return False, "URL is empty"

        parsed = urllib.parse.urlsplit(candidate_url)
        
        # Check scheme
        scheme = parsed.scheme.lower()
        if scheme in IGNORED_SCHEMES:
            return False, f"Ignored scheme '{scheme}'"
        if scheme not in ("http", "https"):
            return False, f"Unsupported scheme '{scheme}'"

        # Check ignored file extension
        path = parsed.path.lower()
        for ext in IGNORED_EXTENSIONS:
            if path.endswith(ext):
                return False, f"Ignored file extension '{ext}'"

        candidate_hostname = (parsed.hostname or "").lower()
        if not candidate_hostname:
            return False, "Candidate URL has no hostname"

        # Check domain boundaries
        if self.include_subdomains or self.scope_mode == ScopeMode.SUBDOMAINS:
            # Check if same domain or subdomain
            # e.g., docs.example.com and example.com
            root_domain = ".".join(self.start_hostname.split(".")[-2:]) if "." in self.start_hostname else self.start_hostname
            cand_root = ".".join(candidate_hostname.split(".")[-2:]) if "." in candidate_hostname else candidate_hostname
            if cand_root != root_domain and candidate_hostname != self.start_hostname and not candidate_hostname.endswith("." + self.start_hostname):
                return False, f"Hostname '{candidate_hostname}' is outside domain boundary '{self.start_hostname}'"
        else:
            # Hostname must match exactly
            if candidate_hostname != self.start_hostname:
                return False, f"Hostname '{candidate_hostname}' does not match starting hostname '{self.start_hostname}'"

        # Check path strict scope
        if self.scope_mode == ScopeMode.PATH_STRICT:
            cand_path = parsed.path or "/"
            if not cand_path.startswith(self.start_base_path):
                return False, f"Path '{cand_path}' is outside starting directory '{self.start_base_path}'"

        # Check exclude patterns
        for pattern in self.exclude_regexes:
            if pattern.search(candidate_url):
                return False, f"Matched exclude pattern '{pattern.pattern}'"

        # Check include patterns (if any specified, candidate must match at least one)
        if self.include_regexes:
            matched = any(pattern.search(candidate_url) for pattern in self.include_regexes)
            if not matched:
                return False, "Did not match any include patterns"

        return True, "OK"
