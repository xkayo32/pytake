"""
Organization repository
"""

from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.repositories.base import BaseRepository


class OrganizationRepository(BaseRepository[Organization]):
    """Repository for Organization model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Organization, db)

    async def get_by_id(self, id) -> Optional[Organization]:
        """Get organization by ID"""
        result = await self.db.execute(
            select(Organization).where(Organization.id == id, Organization.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> Optional[Organization]:
        """
        Get organization by slug
        Args:
            slug: Organization slug
        Returns:
            Organization instance or None
        """
        result = await self.db.execute(
            select(Organization).where(Organization.slug == slug)
        )
        return result.scalar_one_or_none()

    async def slug_exists(self, slug: str) -> bool:
        """
        Check if slug already exists
        Args:
            slug: Slug to check
        Returns:
            True if exists, False otherwise
        """
        org = await self.get_by_slug(slug)
        return org is not None

    async def get_active(self):
        """
        Get all active organizations
        Returns:
            List of active organizations
        """
        result = await self.db.execute(
            select(Organization)
            .where(Organization.is_active == True)
            .where(Organization.deleted_at.is_(None))
        )
        return list(result.scalars().all())
