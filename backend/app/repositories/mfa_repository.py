"""
MFA Repositories
Data access layer for MFA methods, challenges, and backup codes.
"""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_, or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.mfa import MFAMethod, MFAChallenge, MFABackupCode
from app.repositories.base import BaseRepository


class MFAMethodRepository(BaseRepository[MFAMethod]):
    """Repository for MFA method management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db, MFAMethod)
    
    async def get_by_id(self, id: UUID, organization_id: UUID) -> Optional[MFAMethod]:
        """Get MFA method by ID with multi-tenancy filtering."""
        stmt = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_by_user(self, user_id: UUID, organization_id: UUID) -> List[MFAMethod]:
        """Get all MFA methods for user."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        ).order_by(self.model.created_at)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_verified_methods(self, user_id: UUID, organization_id: UUID) -> List[MFAMethod]:
        """Get all verified MFA methods for user."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
                self.model.is_verified.is_(True),
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_primary_method(self, user_id: UUID, organization_id: UUID) -> Optional[MFAMethod]:
        """Get primary MFA method for user."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
                self.model.is_primary.is_(True),
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def create(self, obj_in: dict) -> MFAMethod:
        """Create new MFA method."""
        obj = self.model(**obj_in)
        self.db.add(obj)
        await self.db.commit()
        return obj
    
    async def update(self, id: UUID, organization_id: UUID, obj_in: dict) -> Optional[MFAMethod]:
        """Update MFA method with multi-tenancy filtering."""
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
    
    async def delete(self, id: UUID, organization_id: UUID) -> bool:
        """Soft delete MFA method."""
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


class MFAChallengeRepository(BaseRepository[MFAChallenge]):
    """Repository for MFA challenge management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db, MFAChallenge)
    
    async def get_by_token(self, challenge_token: str, organization_id: UUID) -> Optional[MFAChallenge]:
        """Get MFA challenge by token."""
        stmt = select(self.model).where(
            and_(
                self.model.challenge_token == challenge_token,
                self.model.organization_id == organization_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def create(self, obj_in: dict) -> MFAChallenge:
        """Create new MFA challenge."""
        obj = self.model(**obj_in)
        self.db.add(obj)
        await self.db.commit()
        return obj
    
    async def mark_used(self, challenge_id: UUID, organization_id: UUID) -> bool:
        """Mark challenge as used."""
        stmt = select(self.model).where(
            and_(
                self.model.id == challenge_id,
                self.model.organization_id == organization_id,
            )
        )
        result = await self.db.execute(stmt)
        obj = result.scalars().first()
        
        if not obj:
            return False
        
        obj.is_used = True
        self.db.add(obj)
        await self.db.commit()
        return True
    
    async def increment_attempt(self, challenge_id: UUID, organization_id: UUID) -> bool:
        """Increment failed attempt count."""
        stmt = select(self.model).where(
            and_(
                self.model.id == challenge_id,
                self.model.organization_id == organization_id,
            )
        )
        result = await self.db.execute(stmt)
        obj = result.scalars().first()
        
        if not obj:
            return False
        
        obj.attempt_count += 1
        self.db.add(obj)
        await self.db.commit()
        return True
    
    async def cleanup_expired(self, organization_id: UUID) -> int:
        """Delete expired challenges (cleanup)."""
        stmt = select(self.model).where(
            and_(
                self.model.organization_id == organization_id,
                self.model.expires_at < datetime.utcnow(),
            )
        )
        result = await self.db.execute(stmt)
        challenges = result.scalars().all()
        
        for challenge in challenges:
            await self.db.delete(challenge)
        
        await self.db.commit()
        return len(challenges)


class MFABackupCodeRepository(BaseRepository[MFABackupCode]):
    """Repository for MFA backup code management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db, MFABackupCode)
    
    async def get_by_user(self, user_id: UUID, organization_id: UUID) -> List[MFABackupCode]:
        """Get all backup codes for user."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_unused_count(self, user_id: UUID, organization_id: UUID) -> int:
        """Get count of unused backup codes."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
                self.model.is_used.is_(False),
            )
        )
        result = await self.db.execute(stmt)
        return len(result.scalars().all())
    
    async def create_batch(self, codes: List[dict]) -> List[MFABackupCode]:
        """Create multiple backup codes."""
        objs = [self.model(**code_data) for code_data in codes]
        self.db.add_all(objs)
        await self.db.commit()
        return objs
    
    async def mark_used(self, code_id: UUID, organization_id: UUID) -> bool:
        """Mark backup code as used."""
        stmt = select(self.model).where(
            and_(
                self.model.id == code_id,
                self.model.organization_id == organization_id,
            )
        )
        result = await self.db.execute(stmt)
        obj = result.scalars().first()
        
        if not obj:
            return False
        
        obj.is_used = True
        obj.used_at = datetime.utcnow()
        self.db.add(obj)
        await self.db.commit()
        return True
    
    async def delete_by_user(self, user_id: UUID, organization_id: UUID) -> int:
        """Delete all backup codes for user (when disabling MFA)."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
            )
        )
        result = await self.db.execute(stmt)
        codes = result.scalars().all()
        
        for code in codes:
            await self.db.delete(code)
        
        await self.db.commit()
        return len(codes)
