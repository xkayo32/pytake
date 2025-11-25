"""
Repository for notification preferences and logs
"""

from typing import Optional, List
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import NotificationPreference, NotificationLog, NotificationChannel
from app.repositories.base import BaseRepository


class NotificationPreferenceRepository(BaseRepository):
    """Repository for managing notification preferences"""

    def __init__(self, db: AsyncSession):
        super().__init__(NotificationPreference, db)

    async def get_by_user_org(self, user_id: str, org_id: str) -> Optional[NotificationPreference]:
        """Get preferences for user in organization"""
        result = await self.db.execute(
            select(NotificationPreference).where(
                and_(
                    NotificationPreference.user_id == user_id,
                    NotificationPreference.organization_id == org_id
                )
            )
        )
        return result.scalars().first()
    
    async def get_or_create(self, user_id: str, org_id: str) -> NotificationPreference:
        """Get preferences or create with defaults"""
        pref = await self.get_by_user_org(user_id, org_id)
        if pref:
            return pref
        
        pref = NotificationPreference(
            user_id=user_id,
            organization_id=org_id,
        )
        self.db.add(pref)
        await self.db.flush()
        return pref
    
    async def get_all_by_org(self, org_id: str) -> List[NotificationPreference]:
        """Get all preferences for an organization"""
        result = await self.db.execute(
            select(NotificationPreference).where(
                NotificationPreference.organization_id == org_id
            )
        )
        return result.scalars().all()


class NotificationLogRepository(BaseRepository):
    """Repository for managing notification logs"""

    def __init__(self, db: AsyncSession):
        super().__init__(NotificationLog, db)

    async def get_by_org(
        self, 
        org_id: str, 
        skip: int = 0, 
        limit: int = 50,
        status: Optional[str] = None,
        channel: Optional[str] = None,
        user_id: Optional[str] = None
    ) -> List[NotificationLog]:
        """Get notification logs for organization with optional filters"""
        query = select(NotificationLog).where(
            NotificationLog.organization_id == org_id
        )
        
        if status:
            query = query.where(NotificationLog.status == status)
        if channel:
            query = query.where(NotificationLog.channel == channel)
        if user_id:
            query = query.where(NotificationLog.user_id == user_id)
        
        query = query.order_by(NotificationLog.created_at.desc()).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def get_failed_for_retry(self, limit: int = 100) -> List[NotificationLog]:
        """Get failed notifications eligible for retry"""
        result = await self.db.execute(
            select(NotificationLog).where(
                and_(
                    NotificationLog.status == "failed",
                    NotificationLog.retry_count < NotificationLog.max_retries
                )
            ).limit(limit)
        )
        return result.scalars().all()
    
    async def count_by_org_hour(self, org_id: str, user_id: str, channel: NotificationChannel) -> int:
        """Count notifications sent to user in last hour"""
        from datetime import datetime, timedelta
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        
        result = await self.db.execute(
            select(func.count(NotificationLog.id)).where(
                and_(
                    NotificationLog.organization_id == org_id,
                    NotificationLog.user_id == user_id,
                    NotificationLog.channel == channel,
                    NotificationLog.status == "sent",
                    NotificationLog.created_at >= one_hour_ago
                )
            )
        )
        return result.scalar() or 0
