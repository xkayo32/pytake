"""
AlertNotification Repository - Data access for alert notifications
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert_notification import AlertNotification, AlertNotificationStatus


class AlertNotificationRepository:
    """Repository for AlertNotification model"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(
        self,
        organization_id: UUID,
        alert_id: UUID,
        user_id: UUID,
        channel: str,
        event_type: str,
        subject: str,
        message: str,
        recipient_email: Optional[str] = None,
        recipient_slack_id: Optional[str] = None,
        message_html: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> AlertNotification:
        """Create a new alert notification"""
        notification = AlertNotification(
            organization_id=organization_id,
            alert_id=alert_id,
            user_id=user_id,
            channel=channel,
            event_type=event_type,
            subject=subject,
            message=message,
            recipient_email=recipient_email,
            recipient_slack_id=recipient_slack_id,
            message_html=message_html,
            status=AlertNotificationStatus.PENDING.value,
            alert_metadata=metadata or {},
        )
        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def get_by_id(
        self, notification_id: UUID, organization_id: UUID
    ) -> Optional[AlertNotification]:
        """Get notification by ID with multi-tenancy check"""
        stmt = select(AlertNotification).where(
            and_(
                AlertNotification.id == notification_id,
                AlertNotification.organization_id == organization_id,
                AlertNotification.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().first()

    async def get_pending_notifications(
        self, organization_id: UUID, limit: int = 100
    ) -> List[AlertNotification]:
        """Get pending (unsent) notifications for batch processing"""
        stmt = (
            select(AlertNotification)
            .where(
                and_(
                    AlertNotification.organization_id == organization_id,
                    AlertNotification.status == AlertNotificationStatus.PENDING.value,
                    AlertNotification.deleted_at.is_(None),
                )
            )
            .limit(limit)
            .order_by(AlertNotification.created_at)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_pending_by_channel(
        self,
        organization_id: UUID,
        channel: str,
        limit: int = 100,
    ) -> List[AlertNotification]:
        """Get pending notifications for a specific channel"""
        stmt = (
            select(AlertNotification)
            .where(
                and_(
                    AlertNotification.organization_id == organization_id,
                    AlertNotification.channel == channel,
                    AlertNotification.status == AlertNotificationStatus.PENDING.value,
                    AlertNotification.deleted_at.is_(None),
                )
            )
            .limit(limit)
            .order_by(AlertNotification.created_at)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def mark_sent(
        self,
        notification_id: UUID,
        organization_id: UUID,
        external_message_id: Optional[str] = None,
    ) -> Optional[AlertNotification]:
        """Mark notification as sent"""
        notification = await self.get_by_id(notification_id, organization_id)
        if not notification:
            return None

        notification.status = AlertNotificationStatus.SENT.value
        notification.sent_at = notification.updated_at
        if external_message_id:
            notification.external_message_id = external_message_id

        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_failed(
        self,
        notification_id: UUID,
        organization_id: UUID,
        reason: str,
    ) -> Optional[AlertNotification]:
        """Mark notification as failed and increment retry count"""
        notification = await self.get_by_id(notification_id, organization_id)
        if not notification:
            return None

        notification.status = AlertNotificationStatus.FAILED.value
        notification.failed_reason = reason
        notification.retry_count = (notification.retry_count or 0) + 1
        notification.last_retry_at = notification.updated_at

        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def mark_bounced(
        self,
        notification_id: UUID,
        organization_id: UUID,
        reason: Optional[str] = None,
    ) -> Optional[AlertNotification]:
        """Mark notification as bounced (email bounced, Slack user not found, etc)"""
        notification = await self.get_by_id(notification_id, organization_id)
        if not notification:
            return None

        notification.status = AlertNotificationStatus.BOUNCED.value
        if reason:
            notification.failed_reason = reason

        self.db.add(notification)
        await self.db.commit()
        await self.db.refresh(notification)
        return notification

    async def get_notifications_for_alert(
        self, alert_id: UUID, organization_id: UUID
    ) -> List[AlertNotification]:
        """Get all notifications for a specific alert"""
        stmt = select(AlertNotification).where(
            and_(
                AlertNotification.alert_id == alert_id,
                AlertNotification.organization_id == organization_id,
                AlertNotification.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_user_notifications(
        self,
        user_id: UUID,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[List[AlertNotification], int]:
        """Get paginated notifications for a user"""
        # Count total
        count_stmt = select(AlertNotification).where(
            and_(
                AlertNotification.user_id == user_id,
                AlertNotification.organization_id == organization_id,
                AlertNotification.deleted_at.is_(None),
            )
        )
        count_result = await self.db.execute(count_stmt)
        total = len(count_result.scalars().all())

        # Get paginated results
        stmt = (
            select(AlertNotification)
            .where(
                and_(
                    AlertNotification.user_id == user_id,
                    AlertNotification.organization_id == organization_id,
                    AlertNotification.deleted_at.is_(None),
                )
            )
            .order_by(AlertNotification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        notifications = result.scalars().all()
        return notifications, total

    async def count_pending_by_channel(
        self, organization_id: UUID, channel: str
    ) -> int:
        """Count pending notifications for a channel"""
        stmt = select(AlertNotification).where(
            and_(
                AlertNotification.organization_id == organization_id,
                AlertNotification.channel == channel,
                AlertNotification.status == AlertNotificationStatus.PENDING.value,
                AlertNotification.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(stmt)
        return len(result.scalars().all())

    async def delete(
        self, notification_id: UUID, organization_id: UUID
    ) -> Optional[AlertNotification]:
        """Soft delete a notification"""
        notification = await self.get_by_id(notification_id, organization_id)
        if not notification:
            return None

        notification.deleted_at = notification.updated_at
        self.db.add(notification)
        await self.db.commit()
        return notification
