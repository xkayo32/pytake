"""
Passkey Repositories
Data access layer for WebAuthn credentials and challenges.
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.passkey import PasskeyCredential, PasskeyChallenge
from app.repositories.base import BaseRepository


class PasskeyCredentialRepository(BaseRepository[PasskeyCredential]):
    """Repository for passkey credential management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db, PasskeyCredential)
    
    async def get_by_id(self, id: UUID, organization_id: UUID) -> Optional[PasskeyCredential]:
        """Get credential by ID with multi-tenancy filtering."""
        stmt = select(self.model).where(
            and_(
                self.model.id == id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_by_credential_id(self, credential_id: str, organization_id: UUID) -> Optional[PasskeyCredential]:
        """Get credential by credential_id (base64)."""
        stmt = select(self.model).where(
            and_(
                self.model.credential_id == credential_id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def get_by_user(self, user_id: UUID, organization_id: UUID) -> List[PasskeyCredential]:
        """Get all credentials for user."""
        stmt = select(self.model).where(
            and_(
                self.model.user_id == user_id,
                self.model.organization_id == organization_id,
                self.model.deleted_at.is_(None),
            )
        ).order_by(self.model.created_at)
        result = await self.db.execute(stmt)
        return result.scalars().all()
    
    async def get_primary_credential(self, user_id: UUID, organization_id: UUID) -> Optional[PasskeyCredential]:
        """Get primary passkey for user."""
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
    
    async def create(self, obj_in: dict) -> PasskeyCredential:
        """Create new passkey credential."""
        obj = self.model(**obj_in)
        self.db.add(obj)
        await self.db.commit()
        return obj
    
    async def update(self, id: UUID, organization_id: UUID, obj_in: dict) -> Optional[PasskeyCredential]:
        """Update credential with multi-tenancy filtering."""
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
        """Soft delete credential."""
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
    
    async def increment_counter(self, credential_id: str, organization_id: UUID) -> bool:
        """Increment counter (after successful authentication) - replay prevention."""
        credential = await self.get_by_credential_id(credential_id, organization_id)
        if not credential:
            return False
        
        credential.counter += 1
        credential.last_used_at = datetime.utcnow()
        self.db.add(credential)
        await self.db.commit()
        return True


class PasskeyChallengeRepository(BaseRepository[PasskeyChallenge]):
    """Repository for passkey challenge management."""
    
    def __init__(self, db: AsyncSession):
        super().__init__(db, PasskeyChallenge)
    
    async def get_by_challenge(self, challenge: str, organization_id: UUID) -> Optional[PasskeyChallenge]:
        """Get challenge by value."""
        stmt = select(self.model).where(
            and_(
                self.model.challenge == challenge,
                self.model.organization_id == organization_id,
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()
    
    async def create(self, obj_in: dict) -> PasskeyChallenge:
        """Create new challenge."""
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
        obj.used_at = datetime.utcnow()
        self.db.add(obj)
        await self.db.commit()
        return True
    
    async def cleanup_expired(self, organization_id: UUID) -> int:
        """Delete expired challenges."""
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
