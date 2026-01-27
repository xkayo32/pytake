"""
Repository for ConversationWindow model - Data access layer for 24-hour message window.
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, desc
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation_window import ConversationWindow
from app.repositories.base import BaseRepository


class ConversationWindowRepository(BaseRepository[ConversationWindow]):
    """Repository for ConversationWindow model with multi-tenancy enforcement."""

    def __init__(self, db: AsyncSession):
        """Initialize repository with database session."""
        super().__init__(ConversationWindow, db)

    async def get_by_conversation_id(
        self, conversation_id: UUID, organization_id: UUID
    ) -> Optional[ConversationWindow]:
        """
        Get conversation window by conversation ID.
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization (multi-tenancy)
        
        Returns:
            ConversationWindow if found, None otherwise
        """
        stmt = select(ConversationWindow).where(
            and_(
                ConversationWindow.conversation_id == conversation_id,
                ConversationWindow.organization_id == organization_id,
                ConversationWindow.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def create(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        started_at: datetime = None,
        ends_at: datetime = None,
    ) -> ConversationWindow:
        """
        Create a new conversation window.
        
        Args:
            conversation_id: ID of the conversation
            organization_id: ID of the organization
            started_at: Optional start time (defaults to now)
            ends_at: Optional end time (defaults to now + 24h)
        
        Returns:
            Created ConversationWindow
        """
        now = datetime.utcnow()
        started_at = started_at or now
        ends_at = ends_at or (now + timedelta(hours=24))

        window = ConversationWindow(
            conversation_id=conversation_id,
            organization_id=organization_id,
            started_at=started_at,
            ends_at=ends_at,
            is_active=True,
            status="active",
        )
        self.db.add(window)
        return window

    async def reset_window(
        self, window_id: UUID, organization_id: UUID
    ) -> Optional[ConversationWindow]:
        """
        Reset a conversation window (extend it 24 more hours).
        
        Args:
            window_id: ID of the window to reset
            organization_id: ID of the organization (multi-tenancy)
        
        Returns:
            Updated ConversationWindow if found, None otherwise
        """
        window = await self.get_by_id(window_id)
        if not window or window.organization_id != organization_id:
            return None

        now = datetime.utcnow()
        window.started_at = now
        window.ends_at = now + timedelta(hours=24)
        window.is_active = True
        window.status = "active"
        window.updated_at = now

        return window

    async def extend_window(
        self, window_id: UUID, organization_id: UUID, hours: int = 24
    ) -> Optional[ConversationWindow]:
        """
        Manually extend a conversation window.
        
        Args:
            window_id: ID of the window to extend
            organization_id: ID of the organization (multi-tenancy)
            hours: Number of hours to extend (default 24)
        
        Returns:
            Updated ConversationWindow if found, None otherwise
        """
        window = await self.get_by_id(window_id)
        if not window or window.organization_id != organization_id:
            return None

        window.ends_at = datetime.utcnow() + timedelta(hours=hours)
        window.is_active = True
        window.status = "manually_extended"
        window.updated_at = datetime.utcnow()

        return window

    async def close_window(
        self,
        window_id: UUID,
        organization_id: UUID,
        reason: str = "Window expired",
    ) -> Optional[ConversationWindow]:
        """
        Close/expire a conversation window.
        
        Args:
            window_id: ID of the window to close
            organization_id: ID of the organization (multi-tenancy)
            reason: Reason for closing
        
        Returns:
            Updated ConversationWindow if found, None otherwise
        """
        window = await self.get_by_id(window_id)
        if not window or window.organization_id != organization_id:
            return None

        window.is_active = False
        window.status = "expired"
        window.close_reason = reason
        window.updated_at = datetime.utcnow()

        return window

    async def get_active_windows(
        self, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[ConversationWindow]:
        """
        Get all active windows for an organization.
        
        Args:
            organization_id: ID of the organization
            skip: Number of records to skip (pagination)
            limit: Number of records to return
        
        Returns:
            List of active ConversationWindow records
        """
        stmt = select(ConversationWindow).where(
            and_(
                ConversationWindow.organization_id == organization_id,
                ConversationWindow.is_active.is_(True),
                ConversationWindow.deleted_at.is_(None),
            )
        ).offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_expiring_soon(
        self, organization_id: UUID, hours_threshold: int = 2
    ) -> list[ConversationWindow]:
        """
        Get windows expiring within the specified hours.
        
        Args:
            organization_id: ID of the organization
            hours_threshold: Get windows expiring within this many hours
        
        Returns:
            List of ConversationWindow records expiring soon
        """
        now = datetime.utcnow()
        threshold_time = now + timedelta(hours=hours_threshold)

        stmt = select(ConversationWindow).where(
            and_(
                ConversationWindow.organization_id == organization_id,
                ConversationWindow.is_active.is_(True),
                ConversationWindow.ends_at > now,
                ConversationWindow.ends_at <= threshold_time,
                ConversationWindow.deleted_at.is_(None),
            )
        ).order_by(ConversationWindow.ends_at)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_expired_windows(
        self, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> list[ConversationWindow]:
        """
        Get all expired windows for an organization.
        
        Args:
            organization_id: ID of the organization
            skip: Number of records to skip (pagination)
            limit: Number of records to return
        
        Returns:
            List of expired ConversationWindow records
        """
        now = datetime.utcnow()
        stmt = select(ConversationWindow).where(
            and_(
                ConversationWindow.organization_id == organization_id,
                ConversationWindow.ends_at <= now,
                ConversationWindow.deleted_at.is_(None),
            )
        ).order_by(desc(ConversationWindow.ends_at)).offset(skip).limit(limit)
        
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def count_active_windows(self, organization_id: UUID) -> int:
        """
        Count active windows for an organization.
        
        Args:
            organization_id: ID of the organization
        
        Returns:
            Number of active windows
        """
        stmt = select(ConversationWindow).where(
            and_(
                ConversationWindow.organization_id == organization_id,
                ConversationWindow.is_active.is_(True),
                ConversationWindow.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return len(result.scalars().all())

    async def count_expired_windows(self, organization_id: UUID) -> int:
        """
        Count expired windows for an organization.
        
        Args:
            organization_id: ID of the organization
        
        Returns:
            Number of expired windows
        """
        now = datetime.utcnow()
        stmt = select(ConversationWindow).where(
            and_(
                ConversationWindow.organization_id == organization_id,
                ConversationWindow.ends_at <= now,
                ConversationWindow.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return len(result.scalars().all())

    async def close_expired_windows(self, organization_id: UUID) -> int:
        """
        Automatically close all expired windows.
        
        Args:
            organization_id: ID of the organization
        
        Returns:
            Number of windows closed
        """
        now = datetime.utcnow()
        stmt = select(ConversationWindow).where(
            and_(
                ConversationWindow.organization_id == organization_id,
                ConversationWindow.ends_at <= now,
                ConversationWindow.is_active.is_(True),
                ConversationWindow.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        windows = result.scalars().all()

        count = 0
        for window in windows:
            window.is_active = False
            window.status = "expired"
            window.updated_at = now
            count += 1

        return count
