"""Utilities for parsing request params."""
from typing import Optional
import uuid


def parse_optional_uuid(value: Optional[str]) -> Optional[uuid.UUID]:
    """Parse a value into UUID or return None.

    Treats None, empty string, 'undefined', and 'null' (case-insensitive) as None.
    Any invalid UUID string returns None instead of raising.
    """
    if value is None:
        return None

    # If already a UUID, return as-is
    if isinstance(value, uuid.UUID):
        return value

    s = str(value).strip()
    if s == "" or s.lower() in ("undefined", "null"):
        return None

    try:
        return uuid.UUID(s)
    except Exception:
        return None
