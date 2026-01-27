"""
Alert Service - Business logic for alert management and escalation
"""

import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alert import Alert, AlertType, AlertSeverity, AlertStatus
from app.models.notification import NotificationType, NotificationChannel
from app.repositories.alert import AlertRepository
from app.repositories.user import UserRepository
from app.services.alert_notification_service import AlertNotificationService


logger = logging.getLogger(__name__)


class AlertService:
    """Service for managing template alerts and escalations"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AlertRepository(db)
        self.user_repo = UserRepository(db)
        self.notification_service = AlertNotificationService(db)

    async def create_template_status_alert(
        self,
        organization_id: UUID,
        whatsapp_template_id: UUID,
        alert_type: AlertType,
        severity: AlertSeverity,
        title: str,
        description: Optional[str] = None,
        metadata: Optional[dict] = None,
    ) -> Alert:
        """
        Create an alert for template status change.
        
        This is called by TemplateStatusService when:
        - Template is disabled by Meta
        - Template is paused by Meta
        - Quality score changes to RED
        - Approval is rejected
        - Send failure rate exceeds threshold
        
        Args:
            organization_id: Organization UUID
            whatsapp_template_id: Template UUID
            alert_type: Type of alert (DISABLED, PAUSED, QUALITY_DEGRADED, etc)
            severity: Severity level (INFO, WARNING, CRITICAL)
            title: Alert title
            description: Detailed description
            metadata: Additional context (quality_score_before, failure_rate, etc)
        
        Returns:
            Created Alert record
        """
        alert = await self.repo.create(
            organization_id=organization_id,
            whatsapp_template_id=whatsapp_template_id,
            alert_type=alert_type,
            severity=severity,
            title=title,
            description=description,
            metadata=metadata or {},
        )
        
        # Log alert creation
        logger.info(
            f"Alert created: type={alert_type}, severity={severity}, "
            f"template_id={whatsapp_template_id}, org_id={organization_id}"
        )
        
        await self.db.commit()
        
        # Send notifications to organization admins (async in background)
        try:
            # Get org admins
            admin_users = await self.user_repo.get_by_role(
                organization_id=organization_id,
                role="org_admin"
            )
            
            for admin_user in admin_users:
                if admin_user.email:
                    await self.notification_service.notify_alert_created(
                        organization_id=organization_id,
                        alert=alert,
                        user_id=admin_user.id,
                        recipient_email=admin_user.email,
                    )
        except Exception as e:
            # Log notification error but don't fail alert creation
            logger.warning(f"Failed to send alert notifications: {str(e)}")
        
        return alert

    async def get_critical_alerts(
        self,
        organization_id: UUID,
        include_resolved: bool = False,
    ) -> List[Alert]:
        """Get critical alerts for organization"""
        return await self.repo.get_critical_alerts(
            organization_id=organization_id,
            include_resolved=include_resolved,
        )

    async def get_open_alerts(
        self,
        organization_id: UUID,
    ) -> List[Alert]:
        """Get all open (unresolved) alerts"""
        return await self.repo.get_open_alerts(organization_id=organization_id)

    async def get_template_alerts(
        self,
        organization_id: UUID,
        template_id: UUID,
        status: Optional[AlertStatus] = None,
    ) -> List[Alert]:
        """Get all alerts for a specific template"""
        return await self.repo.get_template_alerts(
            template_id=template_id,
            organization_id=organization_id,
            status=status,
        )

    async def acknowledge_alert(
        self,
        alert_id: UUID,
        organization_id: UUID,
        user_id: UUID,
        notes: Optional[str] = None,
    ) -> Optional[Alert]:
        """
        Acknowledge an alert (mark as seen by user).
        
        Args:
            alert_id: Alert UUID
            organization_id: Organization UUID
            user_id: User UUID who is acknowledging
            notes: Optional notes about the acknowledgment
        
        Returns:
            Updated Alert or None if not found
        """
        alert = await self.repo.acknowledge(
            alert_id=alert_id,
            organization_id=organization_id,
            user_id=user_id,
            notes=notes,
        )
        
        if alert:
            await self.db.commit()
            logger.info(f"Alert {alert_id} acknowledged by user {user_id}")
        
        return alert

    async def escalate_alert(
        self,
        alert_id: UUID,
        organization_id: UUID,
        to_admin: bool = False,
    ) -> Optional[Alert]:
        """
        Escalate alert to next level.
        
        Escalation levels:
        1 -> 2: Alert needs review from senior agent
        2 -> 3: Alert needs admin/org_admin intervention
        
        Args:
            alert_id: Alert UUID
            organization_id: Organization UUID
            to_admin: Whether to escalate directly to admin
        
        Returns:
            Updated Alert or None if cannot escalate
        """
        alert = await self.repo.escalate(
            alert_id=alert_id,
            organization_id=organization_id,
            to_admin=to_admin,
        )
        
        if alert:
            from_level = alert.escalation_level - 1 if alert.escalation_level > 1 else 1
            
            await self.db.commit()
            logger.info(
                f"Alert {alert_id} escalated to level {alert.escalation_level} "
                f"(admin={to_admin})"
            )
            
            # Send notification to admins
            try:
                admin_users = await self.user_repo.get_by_role(
                    organization_id=organization_id,
                    role="org_admin"
                )
                
                for admin_user in admin_users:
                    if admin_user.email:
                        await self.notification_service.notify_alert_escalated(
                            organization_id=organization_id,
                            alert=alert,
                            user_id=admin_user.id,
                            recipient_email=admin_user.email,
                            from_level=from_level,
                            to_level=alert.escalation_level,
                        )
            except Exception as e:
                logger.warning(f"Failed to send escalation notifications: {str(e)}")
        
        return alert

    async def resolve_alert(
        self,
        alert_id: UUID,
        organization_id: UUID,
        reason: Optional[str] = None,
    ) -> Optional[Alert]:
        """
        Manually resolve an alert (issue has been fixed).
        
        Args:
            alert_id: Alert UUID
            organization_id: Organization UUID
            reason: Reason for resolution
        
        Returns:
            Updated Alert or None if not found
        """
        alert = await self.repo.resolve(
            alert_id=alert_id,
            organization_id=organization_id,
            auto=False,
            reason=reason,
        )
        
        if alert:
            await self.db.commit()
            logger.info(f"Alert {alert_id} manually resolved: {reason}")
        
        return alert

    async def auto_resolve_quality_alert(
        self,
        template_id: UUID,
        organization_id: UUID,
        new_quality_score: str,
    ) -> bool:
        """
        Auto-resolve quality degradation alerts when quality improves.
        
        Called by TemplateStatusService when quality_score changes from RED back to YELLOW/GREEN.
        
        Args:
            template_id: Template UUID
            organization_id: Organization UUID
            new_quality_score: The improved quality score
        
        Returns:
            True if alert was resolved, False if no open alert found
        """
        # Find open QUALITY_DEGRADED alert for this template
        open_alerts = await self.repo.get_template_alerts(
            template_id=template_id,
            organization_id=organization_id,
            status=AlertStatus.OPEN,
        )
        
        quality_alert = next(
            (a for a in open_alerts if a.alert_type == AlertType.QUALITY_DEGRADED),
            None,
        )
        
        if not quality_alert:
            return False
        
        # Resolve it
        alert = await self.repo.resolve(
            alert_id=quality_alert.id,
            organization_id=organization_id,
            auto=True,
            reason=f"Quality score improved to {new_quality_score}",
        )
        
        if alert:
            await self.db.commit()
            logger.info(
                f"Quality alert auto-resolved for template {template_id}: "
                f"new score = {new_quality_score}"
            )
            return True
        
        return False

    async def check_stale_alerts(
        self,
        organization_id: UUID,
        hours_threshold: int = 48,
    ) -> List[Alert]:
        """
        Find alerts that have been open for too long without acknowledgment.
        
        These are candidates for escalation.
        
        Args:
            organization_id: Organization UUID
            hours_threshold: Hours without acknowledgment to consider stale
        
        Returns:
            List of stale alerts
        """
        stale_alerts = []
        open_alerts = await self.repo.get_open_alerts(organization_id)
        
        for alert in open_alerts:
            if alert.time_since_creation > hours_threshold:
                stale_alerts.append(alert)
        
        return stale_alerts

    async def auto_escalate_stale_alerts(
        self,
        organization_id: UUID,
        hours_threshold: int = 48,
    ) -> int:
        """
        Auto-escalate alerts that have been open too long.
        
        Called by background task to prevent alerts from being ignored.
        
        Args:
            organization_id: Organization UUID
            hours_threshold: Hours without acknowledgment to trigger escalation
        
        Returns:
            Number of alerts escalated
        """
        stale_alerts = await self.check_stale_alerts(
            organization_id=organization_id,
            hours_threshold=hours_threshold,
        )
        
        escalated_count = 0
        for alert in stale_alerts:
            # Only escalate if not already at max level
            if alert.escalation_level < 3:
                escalated = await self.escalate_alert(
                    alert_id=alert.id,
                    organization_id=organization_id,
                    to_admin=(alert.escalation_level >= 2),
                )
                if escalated:
                    escalated_count += 1
        
        return escalated_count

    async def get_alert_summary(
        self,
        organization_id: UUID,
    ) -> dict:
        """
        Get summary statistics for alerts.
        
        Returns:
            Dict with:
            - total_open: Number of open alerts
            - critical_count: Number of critical severity
            - warning_count: Number of warning severity
            - escalated_count: Number escalated (level >= 2)
            - unacknowledged_count: Number not yet acknowledged
        """
        open_alerts = await self.repo.get_open_alerts(organization_id)
        critical_alerts = await self.repo.get_critical_alerts(organization_id)
        escalated_alerts = await self.repo.get_escalated_alerts(organization_id)
        unacknowledged = await self.repo.get_unacknowledged_alerts(organization_id)
        
        warning_alerts = [a for a in open_alerts if a.severity == AlertSeverity.WARNING]
        
        return {
            "total_open": len(open_alerts),
            "critical_count": len(critical_alerts),
            "warning_count": len(warning_alerts),
            "escalated_count": len(escalated_alerts),
            "unacknowledged_count": len(unacknowledged),
        }

    async def get_alerts_for_user(
        self,
        organization_id: UUID,
        user_id: UUID,
        status: Optional[AlertStatus] = None,
    ) -> List[Alert]:
        """
        Get alerts that are relevant to a user based on their role.
        
        Args:
            organization_id: Organization UUID
            user_id: User UUID
            status: Filter by status
        
        Returns:
            List of relevant alerts
        """
        # For now, return all open alerts
        # In future, could filter based on user's departments, etc
        open_alerts = await self.repo.get_open_alerts(organization_id)
        
        if status:
            return [a for a in open_alerts if a.status == status]
        
        return open_alerts

    async def get_critical_alerts_count(
        self,
        organization_id: UUID,
    ) -> int:
        """Get count of critical open alerts"""
        return await self.repo.count_critical_for_org(organization_id)
