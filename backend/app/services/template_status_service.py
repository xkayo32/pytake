"""
Template Status Service - Handle Meta webhook updates for template quality, status changes

Processes message_template_status_update webhooks from Meta Cloud API:
- Quality score changes (UNKNOWN → GREEN/YELLOW/RED)
- Template pausing/disabling
- Status transitions
"""

from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.whatsapp_number import WhatsAppTemplate
from app.models.campaign import Campaign
from app.models.alert import AlertType, AlertSeverity
from app.services.campaign_service import CampaignService
from app.services.alert_service import AlertService
from app.core.exceptions import NotFoundException

logger = logging.getLogger(__name__)


class TemplateStatusService:
    """Service for processing template status updates from Meta webhooks"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def process_template_status_update(
        self,
        waba_id: str,
        template_name: str,
        organization_id: UUID,
        webhook_data: Dict[str, Any]
    ) -> Optional[WhatsAppTemplate]:
        """
        Process template status update from Meta webhook.

        Meta sends:
        {
            "waba_id": "123456789",
            "message_template_id": "template_uuid",
            "message_template_name": "template_name",
            "language": "pt_BR",
            "event": "APPROVED|PENDING|REJECTED|DISABLED|PAUSED|QUALITY_CHANGE",
            "reason": "reason_code",
            "quality_score": "GREEN|YELLOW|RED|UNKNOWN",
            "timestamp": "1234567890"
        }

        Args:
            waba_id: WhatsApp Business Account ID
            template_name: Template name
            organization_id: Organization ID
            webhook_data: Webhook payload with status update

        Returns:
            Updated WhatsAppTemplate or None if not found
        """
        # Extract event and quality score from webhook
        event = webhook_data.get("event")
        quality_score = webhook_data.get("quality_score")
        reason = webhook_data.get("reason")
        timestamp = webhook_data.get("timestamp")

        logger.info(
            f"📋 Processing template status update: "
            f"template={template_name}, event={event}, quality={quality_score}"
        )

        # Find template by name and organization
        template = await self._find_template_by_name(
            template_name=template_name,
            organization_id=organization_id
        )

        if not template:
            logger.warning(
                f"⚠️ Template not found: {template_name} (org={organization_id})"
            )
            return None

        # Track original status for alerts
        original_status = template.status
        original_quality = template.quality_score

        # Update based on event type
        if event == "APPROVED":
            await self._handle_approval(template)

        elif event == "REJECTED":
            await self._handle_rejection(template, reason)

        elif event == "PENDING":
            await self._handle_pending(template)

        elif event == "DISABLED":
            await self._handle_disabled(template, reason)

        elif event == "PAUSED":
            await self._handle_paused(template, reason)

        elif event == "QUALITY_CHANGE":
            await self._handle_quality_change(template, quality_score, reason)

        else:
            logger.warning(f"⚠️ Unknown event type: {event}")

        # Update last status update timestamp
        if timestamp:
            try:
                template.last_status_update = datetime.fromtimestamp(int(timestamp))
            except (ValueError, TypeError):
                template.last_status_update = datetime.utcnow()
        else:
            template.last_status_update = datetime.utcnow()

        # Commit changes
        await self.db.commit()
        await self.db.refresh(template)

        logger.info(
            f"✅ Template status updated: {template_name} "
            f"(status: {original_status}→{template.status}, "
            f"quality: {original_quality}→{template.quality_score})"
        )

        # Handle side effects (auto-pause campaigns, alerts, etc)
        await self._handle_side_effects(
            template=template,
            original_status=original_status,
            original_quality=original_quality,
            event=event
        )

        return template

    async def _find_template_by_name(
        self,
        template_name: str,
        organization_id: UUID
    ) -> Optional[WhatsAppTemplate]:
        """Find template by name within organization"""
        query = select(WhatsAppTemplate).where(
            and_(
                WhatsAppTemplate.name == template_name,
                WhatsAppTemplate.organization_id == organization_id,
                WhatsAppTemplate.deleted_at.is_(None)
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _handle_approval(self, template: WhatsAppTemplate) -> None:
        """Handle APPROVED event"""
        logger.info(f"✅ Template APPROVED: {template.name}")
        
        if template.status != "APPROVED":
            template.status = "APPROVED"
            template.approved_at = datetime.utcnow()
            template.quality_score = "UNKNOWN"  # Initial quality is unknown
            
            logger.info(
                f"📊 Template {template.name} approved and ready to use. "
                f"Quality score starts as UNKNOWN (24h evaluation period)"
            )

    async def _handle_rejection(
        self,
        template: WhatsAppTemplate,
        reason: Optional[str] = None
    ) -> None:
        """Handle REJECTED event"""
        logger.warning(f"❌ Template REJECTED: {template.name}")
        
        template.status = "REJECTED"
        template.rejected_reason = reason or "Rejected by Meta"
        template.rejected_at = datetime.utcnow()

        logger.warning(
            f"Template {template.name} was rejected. Reason: {reason}"
        )

    async def _handle_pending(self, template: WhatsAppTemplate) -> None:
        """Handle PENDING event (awaiting approval)"""
        logger.info(f"⏳ Template PENDING: {template.name}")
        
        if template.status != "PENDING":
            template.status = "PENDING"
            logger.info(f"Template {template.name} is now pending approval from Meta")

    async def _handle_disabled(
        self,
        template: WhatsAppTemplate,
        reason: Optional[str] = None
    ) -> None:
        """Handle DISABLED event (template no longer usable)"""
        logger.error(f"🚫 Template DISABLED: {template.name}")
        
        template.status = "DISABLED"
        template.disabled_at = datetime.utcnow()
        template.disabled_reason = reason or "Disabled by Meta"
        template.is_enabled = False

        logger.error(
            f"⚠️ CRITICAL: Template {template.name} has been DISABLED by Meta. "
            f"Campaigns using this template will be paused. Reason: {reason}"
        )

    async def _handle_paused(
        self,
        template: WhatsAppTemplate,
        reason: Optional[str] = None
    ) -> None:
        """Handle PAUSED event (temporary suspension)"""
        logger.warning(f"⏸️ Template PAUSED: {template.name}")
        
        template.status = "PAUSED"
        template.paused_at = datetime.utcnow()

        logger.warning(
            f"⚠️ Template {template.name} has been PAUSED by Meta. "
            f"Campaigns using this template will be paused. Reason: {reason}"
        )

    async def _handle_quality_change(
        self,
        template: WhatsAppTemplate,
        quality_score: Optional[str] = None,
        reason: Optional[str] = None
    ) -> None:
        """Handle QUALITY_CHANGE event (quality rating update)"""
        old_quality = template.quality_score
        template.quality_score = quality_score or "UNKNOWN"

        logger.info(
            f"📊 Template quality changed: {template.name} "
            f"({old_quality}→{template.quality_score})"
        )

        if quality_score == "RED":
            logger.error(
                f"🔴 CRITICAL: Template {template.name} has RED quality score! "
                f"Reason: {reason}. Campaigns may be blocked by Meta."
            )

        elif quality_score == "YELLOW":
            logger.warning(
                f"🟡 Template {template.name} has YELLOW quality score. "
                f"Monitor usage. Reason: {reason}"
            )

        elif quality_score == "GREEN":
            logger.info(f"🟢 Template {template.name} has GREEN quality score")

    async def _handle_side_effects(
        self,
        template: WhatsAppTemplate,
        original_status: str,
        original_quality: Optional[str],
        event: str
    ) -> None:
        """
        Handle side effects of status changes:
        - Auto-pause campaigns
        - Create alerts for critical changes
        - Auto-resolve quality alerts when quality improves
        """
        alert_service = AlertService(self.db)
        
        # Auto-pause campaigns if template is disabled/paused
        if template.status in ["DISABLED", "PAUSED"] and original_status != template.status:
            await self._pause_dependent_campaigns(template)
            
            # Create alert
            if template.status == "DISABLED":
                await alert_service.create_template_status_alert(
                    organization_id=template.organization_id,
                    whatsapp_template_id=template.id,
                    alert_type=AlertType.TEMPLATE_DISABLED,
                    severity=AlertSeverity.CRITICAL,
                    title=f"Template '{template.name}' was disabled by Meta",
                    description=f"Template status changed from {original_status} to DISABLED. "
                                f"Campaigns using this template have been auto-paused.",
                    metadata={
                        "original_status": original_status,
                        "disabled_reason": template.disabled_reason,
                        "disabled_at": template.disabled_at.isoformat() if template.disabled_at else None,
                    }
                )
            elif template.status == "PAUSED":
                await alert_service.create_template_status_alert(
                    organization_id=template.organization_id,
                    whatsapp_template_id=template.id,
                    alert_type=AlertType.TEMPLATE_PAUSED,
                    severity=AlertSeverity.WARNING,
                    title=f"Template '{template.name}' was paused by Meta",
                    description=f"Template was paused. This may affect message delivery.",
                    metadata={
                        "original_status": original_status,
                        "paused_at": template.paused_at.isoformat() if template.paused_at else None,
                    }
                )

        # Handle quality changes
        if template.quality_score != original_quality:
            if template.quality_score == "RED" and original_quality != "RED":
                # Quality dropped to RED - create alert
                await alert_service.create_template_status_alert(
                    organization_id=template.organization_id,
                    whatsapp_template_id=template.id,
                    alert_type=AlertType.QUALITY_DEGRADED,
                    severity=AlertSeverity.CRITICAL,
                    title=f"Template '{template.name}' quality score is RED",
                    description="Template quality has degraded. Messages may be blocked or delayed.",
                    metadata={
                        "quality_score_before": original_quality,
                        "quality_score_after": template.quality_score,
                        "sent_count": template.sent_count,
                        "failed_count": template.failed_count,
                        "failure_rate": self._calculate_failure_rate(
                            template.sent_count,
                            template.failed_count
                        ),
                    }
                )
            elif template.quality_score in ["GREEN", "YELLOW"] and original_quality == "RED":
                # Quality improved from RED - auto-resolve alert
                resolved = await alert_service.auto_resolve_quality_alert(
                    template_id=template.id,
                    organization_id=template.organization_id,
                    new_quality_score=template.quality_score,
                )
                if resolved:
                    logger.info(f"✅ Quality alert auto-resolved for template {template.name}")

        # Handle rejection
        if event == "REJECTED" and original_status != "REJECTED":
            await alert_service.create_template_status_alert(
                organization_id=template.organization_id,
                whatsapp_template_id=template.id,
                alert_type=AlertType.APPROVAL_REJECTED,
                severity=AlertSeverity.CRITICAL,
                title=f"Template '{template.name}' approval was rejected",
                description=f"Meta rejected this template. Reason: {template.rejected_reason or 'Unknown'}",
                metadata={
                    "rejection_reason": template.rejected_reason,
                    "rejected_at": template.rejected_at.isoformat() if template.rejected_at else None,
                }
            )

    async def _pause_dependent_campaigns(
        self,
        template: WhatsAppTemplate
    ) -> None:
        """
        Auto-pause all campaigns that use this template.

        This prevents sending messages via disabled/paused templates.
        """
        logger.warning(
            f"⏸️ Auto-pausing campaigns using template: {template.name}"
        )

        try:
            # Find all campaigns using this template
            campaign_service = CampaignService(self.db)
            
            # Query campaigns that use this template
            query = select(Campaign).where(
                and_(
                    Campaign.template_id == template.id,
                    Campaign.status == "ACTIVE",
                    Campaign.deleted_at.is_(None)
                )
            )

            result = await self.db.execute(query)
            campaigns = result.scalars().all()

            # Pause each campaign
            for campaign in campaigns:
                logger.warning(
                    f"⏸️ Auto-pausing campaign: {campaign.name} "
                    f"(reason: template {template.name} is {template.status})"
                )

                campaign.is_active = False
                campaign.updated_at = datetime.utcnow()

            await self.db.commit()

            logger.info(
                f"✅ Auto-paused {len(campaigns)} campaigns "
                f"using template {template.name}"
            )

        except Exception as e:
            logger.error(
                f"❌ Error auto-pausing campaigns: {e}",
                exc_info=True
            )

    async def get_templates_by_quality_score(
        self,
        organization_id: UUID,
        quality_score: str
    ) -> List[WhatsAppTemplate]:
        """
        Get all templates with specific quality score.

        Useful for monitoring and analytics.

        Args:
            organization_id: Organization ID
            quality_score: GREEN, YELLOW, RED, UNKNOWN

        Returns:
            List of templates with given quality score
        """
        query = select(WhatsAppTemplate).where(
            and_(
                WhatsAppTemplate.organization_id == organization_id,
                WhatsAppTemplate.quality_score == quality_score,
                WhatsAppTemplate.deleted_at.is_(None)
            )
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_templates_by_status(
        self,
        organization_id: UUID,
        status: str
    ) -> List[WhatsAppTemplate]:
        """
        Get all templates with specific status.

        Args:
            organization_id: Organization ID
            status: DRAFT, PENDING, APPROVED, REJECTED, DISABLED, PAUSED

        Returns:
            List of templates with given status
        """
        query = select(WhatsAppTemplate).where(
            and_(
                WhatsAppTemplate.organization_id == organization_id,
                WhatsAppTemplate.status == status,
                WhatsAppTemplate.deleted_at.is_(None)
            )
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_critical_templates(
        self,
        organization_id: UUID
    ) -> List[WhatsAppTemplate]:
        """
        Get templates that need attention:
        - Status: DISABLED or PAUSED
        - Quality: RED
        - Not fully updated yet

        Returns:
            List of critical templates
        """
        # Critical templates: DISABLED, PAUSED, or RED quality
        query = select(WhatsAppTemplate).where(
            and_(
                WhatsAppTemplate.organization_id == organization_id,
                (
                    (WhatsAppTemplate.status.in_(["DISABLED", "PAUSED"])) |
                    (WhatsAppTemplate.quality_score == "RED")
                ),
                WhatsAppTemplate.deleted_at.is_(None)
            )
        )

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_template_quality_summary(
        self,
        organization_id: UUID
    ) -> Dict[str, int]:
        """
        Get summary of template quality scores for organization.

        Returns:
            Dict with counts: {"GREEN": 5, "YELLOW": 2, "RED": 1, "UNKNOWN": 3}
        """
        summary = {
            "GREEN": 0,
            "YELLOW": 0,
            "RED": 0,
            "UNKNOWN": 0,
            "TOTAL": 0
        }

        try:
            # Get all approved templates
            query = select(WhatsAppTemplate).where(
                and_(
                    WhatsAppTemplate.organization_id == organization_id,
                    WhatsAppTemplate.status == "APPROVED",
                    WhatsAppTemplate.deleted_at.is_(None)
                )
            )

            result = await self.db.execute(query)
            templates = result.scalars().all()

            summary["TOTAL"] = len(templates)

            # Count by quality score
            for template in templates:
                quality = template.quality_score or "UNKNOWN"
                if quality in summary:
                    summary[quality] += 1

            logger.info(
                f"📊 Template quality summary for org {organization_id}: {summary}"
            )

        except Exception as e:
            logger.error(f"❌ Error getting quality summary: {e}")

        return summary

    def _calculate_failure_rate(self, sent_count: int, failed_count: int) -> float:
        """
        Calculate failure rate percentage.

        Args:
            sent_count: Total messages sent
            failed_count: Failed messages

        Returns:
            Failure rate as percentage (0-100)
        """
        if sent_count == 0:
            return 0.0

        return (failed_count / sent_count) * 100.0

