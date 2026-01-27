"""
Phase 2.1 - Template Category Change Detection Service

Detects category changes in WhatsApp templates and creates alerts.
Monitors allow_category_change flag to determine alert behavior.

Author: Kayo Carvalho Fernandes
"""

import logging
from uuid import UUID
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import WhatsAppTemplate, Alert
from app.repositories.alert import AlertRepository
from app.schemas.alert import AlertCreate

logger = logging.getLogger(__name__)


class CategoryChangeDetectionService:
    """Service for detecting and handling template category changes."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)

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


class CategoryChangeDetectionService:
    """Service for detecting and handling template category changes."""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.alert_repo = AlertRepository(db)

    async def detect_category_change(
        self,
        template_id: UUID,
        organization_id: UUID,
        new_category: str,
    ) -> Optional[dict]:
        """
        Detect category change and create alert if configured.

        Args:
            template_id: Template ID
            organization_id: Organization ID
            new_category: New category value from Meta API

        Returns:
            Change detection info or None if no change
        """
        try:
            # Get current template
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                logger.warning(
                    f"Template {template_id} not found for org {organization_id}"
                )
                return None

            # Check if category actually changed
            current_category = template.category
            if current_category == new_category:
                logger.debug(
                    f"No category change for template {template_id}: "
                    f"{current_category} == {new_category}"
                )
                return None

            # Category changed!
            logger.warning(
                f"Category change detected for template {template_id}: "
                f"{current_category} → {new_category}"
            )

            change_info = {
                "template_id": template_id,
                "organization_id": organization_id,
                "old_category": current_category,
                "new_category": new_category,
                "detected_at": datetime.now(timezone.utc),
                "allow_category_change": template.allow_category_change,
            }

            # Update template fields
            await self._update_template_category(
                template_id, organization_id, new_category, current_category
            )

            # Create alert if not allowed
            if not template.allow_category_change:
                await self._create_category_change_alert(
                    template_id, organization_id, current_category, new_category
                )

            return change_info

        except Exception as e:
            logger.error(
                f"Error detecting category change for template {template_id}: {e}",
                exc_info=True,
            )
            return None

    async def _update_template_category(
        self,
        template_id: UUID,
        organization_id: UUID,
        new_category: str,
        previous_category: str,
    ) -> None:
        """Update template category tracking fields."""
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if template:
                # Update category
                template.category = new_category

                # Update tracking fields
                template.previous_category = previous_category
                template.last_category_change_at = datetime.now(timezone.utc)
                template.category_change_count = (
                    template.category_change_count + 1
                )

                await self.db.flush()
                logger.info(
                    f"Template {template_id} category updated: "
                    f"{previous_category} → {new_category} "
                    f"(change #{template.category_change_count})"
                )

        except Exception as e:
            logger.error(f"Error updating template category: {e}", exc_info=True)

    async def _create_category_change_alert(
        self,
        template_id: UUID,
        organization_id: UUID,
        old_category: str,
        new_category: str,
    ) -> None:
        """Create alert for category change."""
        try:
            alert_data = AlertCreate(
                organization_id=organization_id,
                alert_type="TEMPLATE_CATEGORY_CHANGED",
                severity="HIGH",
                title=f"Template Category Change Detected",
                message=(
                    f"Template category changed from '{old_category}' "
                    f"to '{new_category}'. This change may affect message routing."
                ),
                resource_id=str(template_id),
                resource_type="TEMPLATE",
                metadata={
                    "template_id": str(template_id),
                    "old_category": old_category,
                    "new_category": new_category,
                    "detected_at": datetime.now(timezone.utc).isoformat(),
                },
                is_read=False,
            )

            await self.alert_repo.create(alert_data.dict())

            logger.info(
                f"Created category change alert for template {template_id}"
            )

        except Exception as e:
            logger.error(
                f"Error creating category change alert: {e}", exc_info=True
            )

    async def allow_category_change_for_template(
        self,
        template_id: UUID,
        organization_id: UUID,
        allow: bool,
    ) -> bool:
        """
        Configure whether to allow category changes for a template.

        Args:
            template_id: Template ID
            organization_id: Organization ID
            allow: True to allow changes without alerts, False to alert

        Returns:
            True if updated successfully
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return False

            template.allow_category_change = allow
            await self.db.flush()

            logger.info(
                f"Template {template_id} allow_category_change set to {allow}"
            )

            return True

        except Exception as e:
            logger.error(
                f"Error updating allow_category_change: {e}", exc_info=True
            )
            return False

    async def enable_category_change_detection(
        self,
        template_id: UUID,
        organization_id: UUID,
        enable: bool,
    ) -> bool:
        """
        Enable/disable category change detection for a template.

        Args:
            template_id: Template ID
            organization_id: Organization ID
            enable: True to enable detection, False to disable

        Returns:
            True if updated successfully
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return False

            template.category_change_detection = enable
            await self.db.flush()

            logger.info(
                f"Template {template_id} category_change_detection set to {enable}"
            )

            return True

        except Exception as e:
            logger.error(
                f"Error updating category_change_detection: {e}", exc_info=True
            )
            return False

    async def get_category_change_history(
        self,
        template_id: UUID,
        organization_id: UUID,
    ) -> dict:
        """
        Get category change history for a template.

        Returns:
            Dictionary with change tracking info
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return {}

            return {
                "template_id": template_id,
                "current_category": template.category,
                "previous_category": template.previous_category,
                "last_change_at": template.last_category_change_at,
                "total_changes": template.category_change_count,
                "allow_category_change": template.allow_category_change,
                "detection_enabled": template.category_change_detection,
            }

        except Exception as e:
            logger.error(
                f"Error getting category change history: {e}", exc_info=True
            )
            return {}
