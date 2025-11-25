"""Email tasks for Celery"""

from celery import shared_task, Task
from typing import Optional, Dict, Any
from app.services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)
email_service = EmailService()


class CallbackTask(Task):
    """Task with retry callbacks"""
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(f'Task {task_id} retry: {exc}')

    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f'Task {task_id} failed: {exc}')


@shared_task(base=CallbackTask, bind=True, max_retries=3)
async def send_email_notification_task(
    self,
    to_email: str,
    subject: str,
    html_content: str
):
    """Send email notification with retries"""
    try:
        result = await email_service.send_email(to_email, subject, html_content)
        if result['success']:
            logger.info(f"✅ Email sent to {to_email}")
            return result
        raise Exception(result['error'])
    except Exception as exc:
        logger.error(f"❌ Error: {exc}")
        raise self.retry(exc=exc, countdown=5 ** self.request.retries)
