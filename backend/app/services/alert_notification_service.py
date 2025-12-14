"""
AlertNotificationService - Sends notifications for alerts
"""

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertType, AlertSeverity
from app.models.alert_notification import AlertNotification
from app.repositories.alert_notification import AlertNotificationRepository
from app.integrations.email import EmailService, EmailTemplate
from app.integrations.slack import SlackService, SlackAlert, AlertEventType, AlertSeverity as SlackAlertSeverity

logger = logging.getLogger(__name__)


class AlertNotificationService:
    """Service for handling alert notifications"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repository = AlertNotificationRepository(db)
        self.email_service = EmailService()
        self.slack_service = SlackService()

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
        Send email notification using EmailService
        Supports HTML templates for different alert types
        """
        if not notification.recipient_email:
            logger.warning(f"Alert notification {notification.id} has no recipient email")
            return False

        try:
            # Map alert types to email templates
            template_map = {
                "alert_created": EmailTemplate.ALERT_CREATED,
                "alert_escalated": EmailTemplate.ALERT_ESCALATED,
                "alert_resolved": EmailTemplate.ALERT_RESOLVED,
                "stale_alert": EmailTemplate.STALE_ALERT,
            }

            email_template = template_map.get(notification.event_type, EmailTemplate.ALERT_CREATED)

            # Build context for template rendering
            context = {
                "recipient_name": notification.recipient_email.split("@")[0],
                "alert_title": notification.metadata.get("title", "N/A"),
                "alert_description": notification.message,
                "severity": notification.metadata.get("alert_severity", "N/A"),
                "category": notification.metadata.get("alert_type", "N/A"),
                "organization_name": notification.metadata.get("organization_name", ""),
                "created_at": notification.created_at.strftime("%d/%m/%Y %H:%M") if notification.created_at else "",
                "updated_at": notification.updated_at.strftime("%d/%m/%Y %H:%M") if notification.updated_at else "",
                "dashboard_url": f"{notification.metadata.get('base_url', 'http://localhost:3000')}/alerts/{notification.alert_id}",
            }

            # Add template-specific context
            if notification.event_type == "alert_escalated":
                context.update({
                    "escalation_level": notification.metadata.get("escalation_level", "Medium"),
                    "escalation_reason": notification.metadata.get("escalation_reason", ""),
                    "assigned_to": notification.metadata.get("assigned_to", ""),
                })
            elif notification.event_type == "alert_resolved":
                context.update({
                    "resolved_at": notification.metadata.get("resolved_at", ""),
                    "resolved_by": notification.metadata.get("resolved_by", ""),
                    "resolution_notes": notification.metadata.get("resolution_notes", ""),
                    "duration": notification.metadata.get("duration", ""),
                })
            elif notification.event_type == "stale_alert":
                context.update({
                    "days_inactive": notification.metadata.get("days_inactive", "7"),
                    "last_activity_date": notification.metadata.get("last_activity_date", ""),
                    "current_owner": notification.metadata.get("current_owner", ""),
                })

            # Send templated email
            success = await self.email_service.send_templated_email(
                to_email=notification.recipient_email,
                template=email_template,
                subject=notification.subject,
                context=context,
                to_name=context.get("recipient_name"),
            )

            if success:
                logger.info(
                    f"Email sent for alert notification {notification.id} | "
                    f"To: {notification.recipient_email} | "
                    f"Type: {notification.event_type}"
                )
            else:
                logger.warning(
                    f"Failed to send email for alert notification {notification.id} | "
                    f"To: {notification.recipient_email}"
                )

            return success

        except Exception as e:
            logger.error(
                f"Error sending email notification {notification.id}: {str(e)}",
                exc_info=True
            )
            return False

    async def _send_slack(self, notification: AlertNotification) -> bool:
        """
        Send Slack notification using SlackService
        Supports Block Kit formatting for different alert types
        """
        if not notification.recipient_email:
            # Try to get from metadata
            webhook_url = notification.metadata.get("slack_webhook_url") if notification.metadata else None
            if not webhook_url:
                logger.warning(f"Slack notification {notification.id} has no webhook URL")
                return False
        else:
            webhook_url = None  # Use default configured webhook

        try:
            # Map event types to Slack alert event types
            event_type_map = {
                "alert_created": AlertEventType.ALERT_CREATED,
                "alert_escalated": AlertEventType.ALERT_ESCALATED,
                "alert_resolved": AlertEventType.ALERT_RESOLVED,
                "stale_alert": AlertEventType.STALE_ALERT,
            }

            slack_event_type = event_type_map.get(
                notification.event_type,
                AlertEventType.ALERT_CREATED
            )

            # Map severity to Slack alert severity
            severity_value = notification.metadata.get("alert_severity", "MEDIUM") if notification.metadata else "MEDIUM"
            try:
                slack_severity = SlackAlertSeverity(severity_value)
            except ValueError:
                slack_severity = SlackAlertSeverity.MEDIUM

            # Build dashboard URL
            base_url = notification.metadata.get("base_url", "http://localhost:3000") if notification.metadata else "http://localhost:3000"
            dashboard_url = f"{base_url}/alerts/{notification.alert_id}"

            # Create SlackAlert
            slack_alert = SlackAlert(
                alert_id=str(notification.alert_id),
                alert_title=notification.metadata.get("title", "N/A") if notification.metadata else "N/A",
                alert_description=notification.message,
                severity=slack_severity,
                event_type=slack_event_type,
                organization_name=notification.metadata.get("organization_name", "") if notification.metadata else "",
                created_at=notification.created_at.strftime("%d/%m/%Y %H:%M") if notification.created_at else "",
                updated_at=notification.updated_at.strftime("%d/%m/%Y %H:%M") if notification.updated_at else "",
                dashboard_url=dashboard_url,
                metadata=notification.metadata or {}
            )

            # Send to Slack
            success = await self.slack_service.send_alert(
                slack_alert,
                webhook_url=webhook_url
            )

            if success:
                logger.info(
                    f"Slack sent for alert notification {notification.id} | "
                    f"Event: {notification.event_type}"
                )
            else:
                logger.warning(
                    f"Failed to send Slack for alert notification {notification.id}"
                )

            return success

        except Exception as e:
            logger.error(
                f"Error sending Slack notification {notification.id}: {str(e)}",
                exc_info=True
            )
            return False
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
