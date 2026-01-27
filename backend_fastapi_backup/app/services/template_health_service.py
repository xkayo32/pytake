"""
Phase 2.2 - Template Health Service

Monitors template quality scores and creates alerts for degradation.
Tracks quality history and provides dashboard metrics.

Author: Kayo Carvalho Fernandes
"""

import logging
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional, List, Dict
from enum import Enum

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import WhatsAppTemplate
from app.repositories.alert import AlertRepository
from app.schemas.alert import AlertCreate

logger = logging.getLogger(__name__)


class QualityScore(str, Enum):
    """Template quality score levels from Meta API."""
    UNKNOWN = "UNKNOWN"
    GREEN = "GREEN"  # High quality
    YELLOW = "YELLOW"  # Medium quality
    RED = "RED"  # Low quality


class TemplateHealthService:
    """Service for monitoring and managing template health."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)

    async def check_template_quality(
        self,
        template_id: UUID,
        organization_id: UUID,
    ) -> Optional[Dict]:
        """
        Check current quality score for a template.

        Returns:
            Quality score info or None if not found
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                logger.warning(
                    f"Template {template_id} not found for org {organization_id}"
                )
                return None

            return {
                "template_id": template_id,
                "quality_score": template.quality_score,
                "last_checked_at": template.quality_score_last_updated,
                "organization_id": organization_id,
            }

        except Exception as e:
            logger.error(f"Error checking template quality: {e}", exc_info=True)
            return None

    async def update_quality_score(
        self,
        template_id: UUID,
        organization_id: UUID,
        new_score: str,
    ) -> bool:
        """
        Update template quality score and create alerts if degraded.

        Args:
            template_id: Template ID
            organization_id: Organization ID
            new_score: New quality score (UNKNOWN, GREEN, YELLOW, RED)

        Returns:
            True if updated successfully
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return False

            old_score = template.quality_score
            template.quality_score = new_score
            template.quality_score_last_updated = datetime.now(timezone.utc)

            # Create alert if quality degraded
            if self._is_degradation(old_score, new_score):
                await self._create_quality_alert(
                    template_id, organization_id, old_score, new_score
                )
                logger.warning(
                    f"Template {template_id} quality degraded: "
                    f"{old_score} → {new_score}"
                )

            await self.db.flush()
            logger.info(
                f"Template {template_id} quality updated: "
                f"{old_score} → {new_score}"
            )

            return True

        except Exception as e:
            logger.error(f"Error updating quality score: {e}", exc_info=True)
            return False

    def _is_degradation(self, old_score: str, new_score: str) -> bool:
        """Check if quality score degraded."""
        score_levels = {
            "UNKNOWN": 0,
            "RED": 1,
            "YELLOW": 2,
            "GREEN": 3,
        }

        old_level = score_levels.get(old_score, 0)
        new_level = score_levels.get(new_score, 0)

        return new_level < old_level

    async def _get_template(
        self,
        template_id: UUID,
        organization_id: UUID,
    ) -> Optional[WhatsAppTemplate]:
        """Get template by ID."""
        result = await self.db.execute(
            select(WhatsAppTemplate)
            .where(WhatsAppTemplate.id == template_id)
            .where(WhatsAppTemplate.organization_id == organization_id)
            .where(WhatsAppTemplate.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def _create_quality_alert(
        self,
        template_id: UUID,
        organization_id: UUID,
        old_score: str,
        new_score: str,
    ) -> None:
        """Create alert for quality score degradation."""
        try:
            severity = self._get_alert_severity(new_score)

            alert_data = AlertCreate(
                organization_id=organization_id,
                alert_type="TEMPLATE_QUALITY_DEGRADED",
                severity=severity,
                title=f"Template Quality Degraded to {new_score}",
                message=(
                    f"Template quality score degraded from '{old_score}' "
                    f"to '{new_score}'. This may affect message delivery."
                ),
                resource_id=str(template_id),
                resource_type="TEMPLATE",
                metadata={
                    "template_id": str(template_id),
                    "old_score": old_score,
                    "new_score": new_score,
                    "degraded_at": datetime.now(timezone.utc).isoformat(),
                },
                is_read=False,
            )

            await self.alert_repo.create(alert_data.dict())
            logger.info(
                f"Created quality alert for template {template_id}"
            )

        except Exception as e:
            logger.error(f"Error creating quality alert: {e}", exc_info=True)

    def _get_alert_severity(self, quality_score: str) -> str:
        """Get alert severity based on quality score."""
        severity_map = {
            "RED": "CRITICAL",
            "YELLOW": "HIGH",
            "GREEN": "LOW",
            "UNKNOWN": "MEDIUM",
        }
        return severity_map.get(quality_score, "MEDIUM")

    async def get_org_quality_summary(
        self,
        organization_id: UUID,
    ) -> Dict:
        """
        Get quality score summary for organization.

        Returns:
            Summary of template quality scores
        """
        try:
            result = await self.db.execute(
                select(
                    WhatsAppTemplate.quality_score,
                )
                .where(WhatsAppTemplate.organization_id == organization_id)
                .where(WhatsAppTemplate.deleted_at.is_(None))
            )

            templates = result.scalars().all()
            quality_counts = {
                "GREEN": templates.count("GREEN"),
                "YELLOW": templates.count("YELLOW"),
                "RED": templates.count("RED"),
                "UNKNOWN": templates.count("UNKNOWN"),
            }

            total = sum(quality_counts.values())

            return {
                "organization_id": organization_id,
                "total_templates": total,
                "quality_distribution": quality_counts,
                "health_percentage": self._calculate_health(quality_counts, total),
            }

        except Exception as e:
            logger.error(
                f"Error getting quality summary: {e}", exc_info=True
            )
            return {}

    def _calculate_health(
        self,
        quality_counts: Dict[str, int],
        total: int,
    ) -> float:
        """Calculate overall health percentage."""
        if total == 0:
            return 0.0

        green_score = quality_counts.get("GREEN", 0) * 1.0
        yellow_score = quality_counts.get("YELLOW", 0) * 0.7
        red_score = quality_counts.get("RED", 0) * 0.0

        total_score = green_score + yellow_score + red_score
        return round((total_score / total) * 100, 2)
