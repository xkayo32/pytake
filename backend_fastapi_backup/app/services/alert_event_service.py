"""
Alert Event Service - Orchestrates alert events and WebSocket emissions
Integrates alerts with real-time notifications
"""

from typing import Optional
from uuid import UUID
import logging

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertStatus, AlertSeverity
from app.repositories.alert import AlertRepository
from app.websocket.alert_manager import alert_manager

logger = logging.getLogger(__name__)


class AlertEventService:
    """Service for emitting alert events to WebSocket"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)

    async def on_alert_created(
        self,
        alert: Alert,
    ) -> None:
        """
        Handle alert created event - broadcast to organization

        Args:
            alert: Created Alert object
        """
        try:
            alert_data = {
                "title": alert.title,
                "description": alert.description,
                "severity": alert.severity.value if alert.severity else None,
                "alert_type": alert.alert_type.value if alert.alert_type else None,
                "status": alert.status.value if alert.status else None,
                "template_id": str(alert.whatsapp_template_id),
                "created_at": alert.created_at.isoformat() if alert.created_at else None,
            }

            await alert_manager.emit_alert_created(
                organization_id=alert.organization_id,
                alert_id=alert.id,
                alert_data=alert_data,
                template_id=alert.whatsapp_template_id,
            )

            logger.info(f"✅ Alert created event emitted: {alert.id}")

        except Exception as e:
            logger.error(f"❌ Error emitting alert created event: {str(e)}", exc_info=True)

    async def on_alert_acknowledged(
        self,
        alert_id: UUID,
        organization_id: UUID,
        user_id: UUID,
        notes: Optional[str] = None,
    ) -> None:
        """
        Handle alert acknowledged event - broadcast acknowledgment

        Args:
            alert_id: Alert ID
            organization_id: Organization ID
            user_id: User who acknowledged
            notes: Optional acknowledgment notes
        """
        try:
            await alert_manager.emit_alert_acknowledged(
                organization_id=organization_id,
                alert_id=alert_id,
                user_id=user_id,
                notes=notes,
            )

            logger.info(f"✅ Alert acknowledged event emitted: {alert_id}")

        except Exception as e:
            logger.error(f"❌ Error emitting alert acknowledged event: {str(e)}", exc_info=True)

    async def on_alert_escalated(
        self,
        alert_id: UUID,
        organization_id: UUID,
        escalation_level: int,
        escalated_by: Optional[UUID] = None,
        reason: Optional[str] = None,
    ) -> None:
        """
        Handle alert escalated event - broadcast to org and admins

        Args:
            alert_id: Alert ID
            organization_id: Organization ID
            escalation_level: New escalation level
            escalated_by: User who escalated
            reason: Escalation reason
        """
        try:
            await alert_manager.emit_alert_escalated(
                organization_id=organization_id,
                alert_id=alert_id,
                escalation_level=escalation_level,
                escalated_by=escalated_by,
                reason=reason,
            )

            logger.info(f"✅ Alert escalated event emitted: {alert_id}")

        except Exception as e:
            logger.error(f"❌ Error emitting alert escalated event: {str(e)}", exc_info=True)

    async def on_alert_resolved(
        self,
        alert_id: UUID,
        organization_id: UUID,
        resolved_by: Optional[UUID] = None,
        reason: Optional[str] = None,
    ) -> None:
        """
        Handle alert resolved event - broadcast to organization

        Args:
            alert_id: Alert ID
            organization_id: Organization ID
            resolved_by: User who resolved
            reason: Resolution reason
        """
        try:
            await alert_manager.emit_alert_resolved(
                organization_id=organization_id,
                alert_id=alert_id,
                resolved_by=resolved_by,
                reason=reason,
            )

            logger.info(f"✅ Alert resolved event emitted: {alert_id}")

        except Exception as e:
            logger.error(f"❌ Error emitting alert resolved event: {str(e)}", exc_info=True)

    async def on_alert_updated(
        self,
        alert_id: UUID,
        organization_id: UUID,
        updated_fields: dict,
    ) -> None:
        """
        Handle alert updated event - broadcast field changes

        Args:
            alert_id: Alert ID
            organization_id: Organization ID
            updated_fields: Dict of updated fields and new values
        """
        try:
            await alert_manager.emit_alert_updated(
                organization_id=organization_id,
                alert_id=alert_id,
                updated_fields=updated_fields,
            )

            logger.info(f"✅ Alert updated event emitted: {alert_id}")

        except Exception as e:
            logger.error(f"❌ Error emitting alert updated event: {str(e)}", exc_info=True)

    async def on_alert_counts_changed(
        self,
        organization_id: UUID,
    ) -> None:
        """
        Handle alert counts changed event - recalculate and broadcast

        Args:
            organization_id: Organization ID
        """
        try:
            # Get current alert counts
            critical_count = await self.alert_repo.count_critical_for_org(organization_id)

            # Get all alerts to calculate other counts
            all_alerts = await self.alert_repo.get_multi(skip=0, limit=1000)
            org_alerts = [a for a in all_alerts if a.organization_id == organization_id]

            by_severity = {}
            by_status = {}

            for alert in org_alerts:
                # Count by severity
                severity_key = alert.severity.value if alert.severity else "unknown"
                by_severity[severity_key] = by_severity.get(severity_key, 0) + 1

                # Count by status
                status_key = alert.status.value if alert.status else "unknown"
                by_status[status_key] = by_status.get(status_key, 0) + 1

            counts = {
                "total": len(org_alerts),
                "critical": critical_count,
                "by_severity": by_severity,
                "by_status": by_status,
            }

            await alert_manager.emit_alert_count_update(
                organization_id=organization_id,
                alert_counts=counts,
            )

            logger.info(f"✅ Alert counts event emitted: {organization_id}")

        except Exception as e:
            logger.error(f"❌ Error emitting alert counts event: {str(e)}", exc_info=True)

    async def on_alert_summary_requested(
        self,
        organization_id: UUID,
        summary_data: dict,
    ) -> None:
        """
        Handle alert summary request - broadcast dashboard summary

        Args:
            organization_id: Organization ID
            summary_data: Summary statistics dict
        """
        try:
            await alert_manager.broadcast_alert_summary(
                organization_id=organization_id,
                summary_data=summary_data,
            )

            logger.info(f"✅ Alert summary event emitted: {organization_id}")

        except Exception as e:
            logger.error(f"❌ Error emitting alert summary event: {str(e)}", exc_info=True)


# Convenience function to get service instance
def get_alert_event_service(db: AsyncSession) -> AlertEventService:
    """Get AlertEventService instance"""
    return AlertEventService(db)
