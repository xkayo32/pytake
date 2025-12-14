"""
AlertNotificationService - Sends notifications for alerts
"""

from typing import List, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertType, AlertSeverity
from app.models.alert_notification import AlertNotification
from app.repositories.alert_notification import AlertNotificationRepository


class AlertNotificationService:
    """Service for handling alert notifications"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = AlertNotificationRepository(db)

    async def notify_alert_created(
        self,
        organization_id: UUID,
        alert: Alert,
        user_id: UUID,
        recipient_email: str,
    ) -> AlertNotification:
        """
        Send notification when alert is created
        Called from AlertService.create_template_status_alert()
        """
        subject = f"🚨 Alert: {alert.title}"
        message = self._format_alert_message(alert)

        notification = await self.repository.create(
            organization_id=organization_id,
            alert_id=alert.id,
            user_id=user_id,
            channel="email",
            event_type="alert_created",
            subject=subject,
            message=message,
            recipient_email=recipient_email,
            metadata={
                "alert_type": alert.alert_type.value,
                "alert_severity": alert.severity.value,
                "template_id": str(alert.whatsapp_template_id),
                "title": alert.title,
            },
        )

        return notification

    async def notify_alert_escalated(
        self,
        organization_id: UUID,
        alert: Alert,
        user_id: UUID,
        recipient_email: str,
        from_level: int,
        to_level: int,
    ) -> AlertNotification:
        """
        Send notification when alert is escalated
        Called from AlertService.escalate_alert()
        """
        level_name = "Admin" if to_level >= 3 else f"Level {to_level}"
        subject = f"⚠️ Alert Escalated to {level_name}: {alert.title}"
        message = (
            f"Alert has been escalated from Level {from_level} to Level {to_level}\n\n"
            f"{self._format_alert_message(alert)}"
        )

        notification = await self.repository.create(
            organization_id=organization_id,
            alert_id=alert.id,
            user_id=user_id,
            channel="email",
            event_type="alert_escalated",
            subject=subject,
            message=message,
            recipient_email=recipient_email,
            metadata={
                "alert_type": alert.alert_type.value,
                "alert_severity": alert.severity.value,
                "escalation_from_level": from_level,
                "escalation_to_level": to_level,
                "escalated_to_admin": to_level >= 3,
            },
        )

        return notification

    async def notify_stale_alerts(
        self,
        organization_id: UUID,
        alerts: List[Alert],
        admin_user_id: UUID,
        admin_email: str,
    ) -> List[AlertNotification]:
        """
        Send notification for stale alerts (48h+ unacknowledged)
        Called from AlertService.auto_escalate_stale_alerts()
        """
        notifications = []

        for alert in alerts:
            subject = f"⏰ Stale Alert: {alert.title} (Unacknowledged for 48+ hours)"
            message = (
                f"This alert has been unacknowledged for more than 48 hours and has been "
                f"automatically escalated to admin level.\n\n"
                f"{self._format_alert_message(alert)}\n\n"
                f"Please review and take action."
            )

            notification = await self.repository.create(
                organization_id=organization_id,
                alert_id=alert.id,
                user_id=admin_user_id,
                channel="email",
                event_type="alert_stale",
                subject=subject,
                message=message,
                recipient_email=admin_email,
                metadata={
                    "alert_type": alert.alert_type.value,
                    "alert_severity": alert.severity.value,
                    "hours_unacknowledged": 48,
                    "auto_escalated": True,
                },
            )

            notifications.append(notification)

        return notifications

    async def send_pending_notifications(
        self, organization_id: UUID
    ) -> tuple[int, int]:
        """
        Send all pending notifications (background job)
        Returns: (sent_count, failed_count)
        """
        pending = await self.repository.get_pending_notifications(
            organization_id, limit=100
        )

        sent_count = 0
        failed_count = 0

        for notification in pending:
            try:
                # Send email
                if notification.channel == "email":
                    success = await self._send_email(notification)
                    if success:
                        await self.repository.mark_sent(
                            notification.id, organization_id
                        )
                        sent_count += 1
                    else:
                        await self.repository.mark_failed(
                            notification.id, organization_id, "Email send failed"
                        )
                        failed_count += 1

                # Send Slack (future)
                elif notification.channel == "slack":
                    # TODO: Implement Slack integration
                    await self.repository.mark_failed(
                        notification.id, organization_id, "Slack not yet implemented"
                    )
                    failed_count += 1

            except Exception as e:
                await self.repository.mark_failed(
                    notification.id, organization_id, str(e)
                )
                failed_count += 1

        return sent_count, failed_count

    async def _send_email(self, notification: AlertNotification) -> bool:
        """
        Send email notification (placeholder for actual SMTP implementation)
        In production, this would integrate with: EmailService
        """
        # This would call EmailService.send_alert_email() in production
        # For now, just mark as pending to be sent later

        if not notification.recipient_email:
            return False

        # TODO: Integrate with EmailService
        # await EmailService(self.db).send_alert_email(
        #     to=notification.recipient_email,
        #     subject=notification.subject,
        #     message=notification.message,
        #     html_message=notification.message_html,
        # )

        return True  # Assume success for now

    def _format_alert_message(self, alert: Alert) -> str:
        """Format alert details into readable message"""
        lines = [
            f"Alert ID: {alert.id}",
            f"Type: {alert.alert_type.value}",
            f"Severity: {alert.severity.value}",
            f"Status: {alert.status.value}",
            f"Title: {alert.title}",
            f"Description: {alert.description}",
            f"Created: {alert.created_at.isoformat() if alert.created_at else 'N/A'}",
        ]

        if alert.acknowledged_at:
            lines.append(f"Acknowledged: {alert.acknowledged_at.isoformat()}")

        if alert.escalation_level:
            lines.append(f"Escalation Level: {alert.escalation_level}")

        if alert.alert_metadata:
            lines.append(f"Metadata: {alert.alert_metadata}")

        return "\n".join(lines)

    async def get_alert_summary_for_notification(
        self, alert: Alert
    ) -> dict:
        """Get alert summary for notification message"""
        return {
            "id": str(alert.id),
            "type": alert.alert_type.value,
            "severity": alert.severity.value,
            "status": alert.status.value,
            "title": alert.title,
            "description": alert.description,
            "escalation_level": alert.escalation_level,
            "metadata": alert.alert_metadata or {},
        }
