"""Notification service business logic"""

from typing import Optional
from app.repositories.notification import NotificationPreferenceRepository
from app.models.notification import NotificationChannel
from app.tasks.email_tasks import send_email_notification_task
from datetime import datetime, time
import logging

logger = logging.getLogger(__name__)


class NotificationService:
    """Handle notification logic and preferences"""

    def __init__(self, pref_repo: NotificationPreferenceRepository):
        self.pref_repo = pref_repo

    async def should_notify(
        self,
        user_id: str,
        org_id: str,
        channel: NotificationChannel
    ) -> bool:
        """Check if user should be notified via channel"""
        pref = await self.pref_repo.get_or_create(user_id, org_id)

        if channel == NotificationChannel.EMAIL and not pref.email_enabled:
            return False

        if pref.quiet_hours_enabled and pref.quiet_hours_start:
            now = datetime.utcnow().time()
            start = datetime.strptime(pref.quiet_hours_start, "%H:%M").time()
            end = datetime.strptime(pref.quiet_hours_end, "%H:%M").time()

            if start < end:
                if start <= now <= end:
                    return False
            else:
                if now >= start or now <= end:
                    return False

        return True

    async def notify_conversation_assigned(
        self,
        org_id: str,
        user_id: str,
        user_email: str,
        user_name: str,
        contact_name: str,
        conversation_id: str
    ):
        """Notify agent of conversation assignment"""
        if await self.should_notify(user_id, org_id, NotificationChannel.EMAIL):
            from app.services.email_service import EmailService
            email_svc = EmailService()
            html = email_svc.render_template(
                'conversation_assigned.html',
                {
                    'agent_name': user_name,
                    'contact_name': contact_name,
                    'conversation_id': conversation_id,
                    'dashboard_url': 'https://pytake.app'
                }
            )
            send_email_notification_task.delay(
                to_email=user_email,
                subject=f'Nova conversa: {contact_name}',
                html_content=html
            )
            logger.info(f"📧 Notification queued for {user_name}")
