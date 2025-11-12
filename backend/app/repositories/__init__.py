"""
Repository pattern for data access
"""

from app.repositories.base import BaseRepository
from app.repositories.user import UserRepository
from app.repositories.organization import OrganizationRepository

__all__ = [
    "BaseRepository",
    "UserRepository",
    "OrganizationRepository",
]
