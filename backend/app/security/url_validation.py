import socket
import ipaddress
import urllib.parse
from typing import Tuple

BLOCKED_HOSTNAMES = {
    "localhost",
    "localhost.localdomain",
    "local",
    "broadcasthost",
    "0.0.0.0",
    "127.0.0.1",
    "::1",
    "metadata.google.internal",
    "instance-data",
}

BLOCKED_METADATA_IPS = {
    "169.254.169.254",  # AWS/GCP/Azure link-local metadata
    "100.100.100.200",  # Alibaba Cloud metadata
    "169.254.170.2",    # AWS ECS task metadata
}

class SSRFProtectionError(ValueError):
    """Raised when a URL violates SSRF safety rules."""
    pass

def is_ip_address_safe(ip_str: str) -> bool:
    """
    Checks if an IP address string is safe from SSRF.
    Rejects private, loopback, link-local, multicast, and reserved addresses.
    """
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return False

    # Check for IPv6 mapped IPv4 (e.g. ::ffff:127.0.0.1)
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped

    if str(ip) in BLOCKED_METADATA_IPS:
        return False

    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_multicast
        or ip.is_reserved
        or ip.is_unspecified
    ):
        return False

    return True

def validate_safe_url(url: str, allow_private: bool = False) -> Tuple[bool, str]:
    """
    Validates a URL for HTTP/HTTPS scheme and ensures its destination hostname/IP
    does not resolve to a private or internal network address (SSRF protection).
    
    Returns (is_valid, error_reason).
    """
    if not url or not isinstance(url, str):
        return False, "URL cannot be empty."

    parsed = urllib.parse.urlsplit(url.strip())

    # Only HTTP and HTTPS
    if parsed.scheme.lower() not in ("http", "https"):
        return False, f"Invalid scheme '{parsed.scheme}'. Only 'http' and 'https' are permitted."

    hostname = parsed.hostname
    if not hostname:
        return False, "URL must contain a valid hostname."

    hostname_lower = hostname.lower()

    if hostname_lower in BLOCKED_HOSTNAMES or hostname_lower.endswith(".localhost"):
        return False, f"Access to '{hostname}' is blocked for security reasons (SSRF protection)."

    # If it's already an IP string
    try:
        ip_obj = ipaddress.ip_address(hostname_lower)
        if not allow_private and not is_ip_address_safe(str(ip_obj)):
            return False, f"Access to IP address '{hostname}' is blocked (private/reserved network)."
        return True, ""
    except ValueError:
        pass  # Not an IP literal, it is a DNS hostname

    if allow_private:
        return True, ""

    # Resolve hostname via DNS
    try:
        # getaddrinfo resolves IPv4 and IPv6
        addr_info = socket.getaddrinfo(hostname, parsed.port or (443 if parsed.scheme == "https" else 80), proto=socket.IPPROTO_TCP)
        if not addr_info:
            return False, f"Could not resolve hostname '{hostname}'."

        for family, socktype, proto, canonname, sockaddr in addr_info:
            ip_str = sockaddr[0]
            if not is_ip_address_safe(ip_str):
                return False, f"Hostname '{hostname}' resolved to blocked IP '{ip_str}' (SSRF protection)."
    except socket.gaierror as e:
        return False, f"DNS resolution failed for '{hostname}': {str(e)}"
    except Exception as e:
        return False, f"Error validating hostname '{hostname}': {str(e)}"

    return True, ""
