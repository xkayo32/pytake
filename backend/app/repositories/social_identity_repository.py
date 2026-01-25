"""
Social Identity Repository
Data access layer for linked social accounts.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.social_identity import SocialIdentity
from app.repositories.base import BaseRepository


class SocialIdentityRepository(BaseRepository[SocialIdentity]):
    """Repository for social identity management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db, SocialIdentity)
    
    async def get_by_id(self, id: UUID, organization_id: UUID) -> Optional[SocialIdentity]:
        """Get social identity by ID with multi-tenancy filtering."""
        stmt = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_by_user(self, user_id: UUID, organization_id: UUID) -> List[SocialIdentity]:
        """Get all social identities for user."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        ).order_by(self.model.linked_at)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_by_provider(
        self,
        organization_id: UUID,
        provider: str,
        social_user_id: str,
    ) -> Optional[SocialIdentity]:
        """Get social identity by provider and social_user_id."""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.provider == provider,
                self.model.social_user_id == social_user_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_by_user_and_provider(
        self,
        user_id: UUID,
        organization_id: UUID,
        provider: str,
    ) -> Optional[SocialIdentity]:
        """Get social identity for user by provider."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
                self.model.provider == provider,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def create(self, obj_in: dict) -> SocialIdentity:
        """Create new social identity."""
        obj = self.model(**obj_in)
        self.db.add(obj)
        await self.db.commit()
        return obj
    
    async def update(self, id: UUID, organization_id: UUID, obj_in: dict) -> Optional[SocialIdentity]:
        """Update social identity with multi-tenancy filtering."""
        stmt = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        obj = result.scalars().first()
        
        if not obj:
            return None
        
        for field, value in obj_in.items():
            setattr(obj, field, value)
        
        self.db.add(obj)
        await self.db.commit()
        return obj
    
    async def update_last_login(self, id: UUID, organization_id: UUID) -> bool:
        """Update last_login_at timestamp."""
        identity = await self.get_by_id(id, organization_id)
        if not identity:
            return False
        
        identity.last_login_at = datetime.utcnow()
        self.db.add(identity)
        await self.db.commit()
        return True
    
    async def delete(self, id: UUID, organization_id: UUID) -> bool:
        """Soft delete social identity."""
        stmt = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        obj = result.scalars().first()
        
        if not obj:
            return False
        
        obj.deleted_at = datetime.utcnow()
        self.db.add(obj)
        await self.db.commit()
        return True
