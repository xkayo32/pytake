"""
Notification Service
Business logic for notification management
"""

import logging
from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import (
    NotificationPreference,
    NotificationLog,
    NotificationChannel,
    NotificationType,
)
from app.repositories.notification import (
    NotificationPreferenceRepository,
    NotificationLogRepository,
)
from app.schemas.notification import (
    NotificationPreferenceUpdate,
    NotificationLogFilter,
)
from app.core.exceptions import NotFoundException

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for notification management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.pref_repo = NotificationPreferenceRepository(db)
        self.log_repo = NotificationLogRepository(db)

    # ==================== Preferences ====================
    
    async def get_preferences(
        self,
        user_id: UUID,
        organization_id: UUID,
    ) -> NotificationPreference:
        """
        Get notification preferences for user in organization
        Creates default preferences if none exist
        """
        pref = await self.pref_repo.get_or_create(
            user_id=str(user_id),
            org_id=str(organization_id),
        )
        await self.db.commit()
        return pref

    async def update_preferences(
        self,
        user_id: UUID,
        organization_id: UUID,
        data: NotificationPreferenceUpdate,
    ) -> NotificationPreference:
        """Update notification preferences"""
        pref = await self.get_preferences(user_id, organization_id)
        
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(pref, key, value)
        
        await self.db.commit()
        await self.db.refresh(pref)
        
        logger.info(f"✅ Updated preferences for user {user_id}")
        return pref

    # ==================== Notifications ====================

    async def list_notifications(
        self,
        user_id: UUID,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 50,
        status: Optional[str] = None,
        channel: Optional[str] = None,
    ) -> List[NotificationLog]:
        """List notifications for user"""
        return await self.log_repo.get_by_org(
            org_id=str(organization_id),
            skip=skip,
            limit=limit,
            status=status,
            channel=channel,
            user_id=str(user_id),
        )

    async def get_notification(
        self,
        notification_id: int,
        user_id: UUID,
        organization_id: UUID,
    ) -> NotificationLog:
        """Get single notification by ID"""
        notification = await self.log_repo.get(notification_id)
        
        if not notification:
            raise NotFoundException("Notification not found")
        
        # Verify access
        if (
            str(notification.user_id) != str(user_id) or
            str(notification.organization_id) != str(organization_id)
        ):
            raise NotFoundException("Notification not found")
        
        return notification

    async def mark_as_read(
        self,
        notification_id: int,
        user_id: UUID,
        organization_id: UUID,
    ) -> NotificationLog:
        """Mark notification as read"""
        notification = await self.get_notification(
            notification_id, user_id, organization_id
        )
        
        notification.status = "read"
        await self.db.commit()
        await self.db.refresh(notification)
        
        return notification

    async def mark_all_as_read(
        self,
        user_id: UUID,
        organization_id: UUID,
    ) -> int:
        """Mark all notifications as read, returns count updated"""
        from sqlalchemy import update
        
        result = await self.db.execute(
            update(NotificationLog)
            .where(
                NotificationLog.user_id == str(user_id),
                NotificationLog.organization_id == str(organization_id),
                NotificationLog.status == "sent",
            )
            .values(status="read")
        )
        
        await self.db.commit()
        count = result.rowcount
        
        logger.info(f"✅ Marked {count} notifications as read for user {user_id}")
        return count

    async def get_unread_count(
        self,
        user_id: UUID,
        organization_id: UUID,
    ) -> int:
        """Get count of unread notifications"""
        from sqlalchemy import select, func
        
        result = await self.db.execute(
            select(func.count(NotificationLog.id))
            .where(
                NotificationLog.user_id == str(user_id),
                NotificationLog.organization_id == str(organization_id),
                NotificationLog.status == "sent",
            )
        )
        return result.scalar() or 0

    async def delete_notification(
        self,
        notification_id: int,
        user_id: UUID,
        organization_id: UUID,
    ) -> bool:
        """Delete a notification"""
        notification = await self.get_notification(
            notification_id, user_id, organization_id
        )
        
        await self.db.delete(notification)
        await self.db.commit()
        
        logger.info(f"🗑️ Deleted notification {notification_id}")
        return True

    # ==================== Send Notifications ====================

    async def send_notification(
        self,
        user_id: UUID,
        organization_id: UUID,
        notification_type: NotificationType,
        message: str,
        subject: Optional[str] = None,
        metadata: Optional[dict] = None,
        channels: Optional[List[NotificationChannel]] = None,
    ) -> List[NotificationLog]:
        """
        Send notification to user via configured channels
        Respects user preferences and rate limits
        """
        # Get user preferences
        pref = await self.get_preferences(user_id, organization_id)
        
        # Determine which channels to use
        if channels is None:
            channels = []
            if pref.websocket_enabled:
                channels.append(NotificationChannel.WEBSOCKET)
            if pref.in_app_enabled:
                channels.append(NotificationChannel.IN_APP)
            if pref.email_enabled:
                channels.append(NotificationChannel.EMAIL)
        
        # Check quiet hours
        if pref.quiet_hours_enabled:
            if self._is_quiet_hours(pref.quiet_hours_start, pref.quiet_hours_end):
                # Only send in-app and websocket during quiet hours
                channels = [
                    c for c in channels 
                    if c in [NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET]
                ]
        
        logs = []
        for channel in channels:
            # Check rate limits
            if channel == NotificationChannel.EMAIL:
                count = await self.log_repo.count_by_org_hour(
                    str(organization_id), str(user_id), channel
                )
                if count >= pref.max_emails_per_hour:
                    logger.warning(f"⚠️ Email rate limit reached for user {user_id}")
                    continue
            
            # Create log entry
            log = NotificationLog(
                organization_id=str(organization_id),
                user_id=str(user_id),
                notification_type=notification_type,
                channel=channel,
                subject=subject,
                message=message,
                recipient=str(user_id),  # Will be replaced with actual recipient
                status="pending",
                notification_metadata=metadata,
            )
            self.db.add(log)
            logs.append(log)
        
        await self.db.commit()
        
        # Send via each channel
        for log in logs:
            await self._send_via_channel(log)
        
        return logs

    async def _send_via_channel(self, log: NotificationLog) -> None:
        """Send notification via specific channel"""
        try:
            if log.channel == NotificationChannel.WEBSOCKET:
                await self._send_websocket(log)
            elif log.channel == NotificationChannel.IN_APP:
                # In-app notifications are just stored in DB
                log.status = "sent"
                log.sent_at = datetime.utcnow()
            elif log.channel == NotificationChannel.EMAIL:
                # TODO: Implement email sending
                log.status = "sent"
                log.sent_at = datetime.utcnow()
            
            await self.db.commit()
            
        except Exception as e:
            log.status = "failed"
            log.error_message = str(e)
            log.retry_count += 1
            await self.db.commit()
            logger.error(f"❌ Failed to send notification: {e}")

    async def _send_websocket(self, log: NotificationLog) -> None:
        """Send notification via WebSocket"""
        try:
            from app.core.websocket_manager import websocket_manager
            
            payload = {
                "notification_id": log.id,
                "type": log.notification_type.value if log.notification_type else "custom",
                "subject": log.subject,
                "message": log.message,
                "metadata": log.notification_metadata,
                "created_at": log.created_at.isoformat() if log.created_at else None,
            }
            
            await websocket_manager.broadcast_to_room(
                room=f"user:{log.user_id}",
                message=payload,
                event="notification:new",
            )
            
            log.status = "sent"
            log.sent_at = datetime.utcnow()
            
        except ImportError:
            logger.warning("⚠️ WebSocket manager not available")
            log.status = "sent"  # Mark as sent anyway for in-app fallback
            log.sent_at = datetime.utcnow()

    def _is_quiet_hours(
        self,
        start: Optional[str],
        end: Optional[str],
    ) -> bool:
        """Check if current time is within quiet hours"""
        if not start or not end:
            return False
        
        try:
            now = datetime.now()
            current_time = now.strftime("%H:%M")
            
            # Handle overnight quiet hours (e.g., 22:00 to 08:00)
            if start > end:
                return current_time >= start or current_time <= end
            else:
                return start <= current_time <= end
        except Exception:
            return False
