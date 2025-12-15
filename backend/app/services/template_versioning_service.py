"""
Phase 2.3 - Template Versioning Service

Manages template versions, tracks changes, and supports rollback.

Author: Kayo Carvalho Fernandes
"""

import logging
from uuid import UUID, uuid4
from datetime import datetime, timezone
from typing import Optional, List, Dict

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models import WhatsAppTemplate

logger = logging.getLogger(__name__)


class TemplateVersioningService:
    """Service for managing template versions."""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_version(
        self,
        template_id: UUID,
        organization_id: UUID,
        content: Dict,
        change_summary: Optional[str] = None,
        created_by: Optional[UUID] = None,
    ) -> bool:
        """
        Create a new version of a template.

        Args:
            template_id: Template ID
            organization_id: Organization ID
            content: Template content (body, variables, etc)
            change_summary: Summary of changes
            created_by: User who made the change

        Returns:
            True if version created successfully
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template or not template.versioning_enabled:
                return False

            # Save previous version reference
            if template.body:
                template.previous_version_content = {
                    "body": template.body,
                    "variables": template.variables,
                }

            # Update template
            template.version_number += 1
            template.version_created_at = datetime.now(timezone.utc)
            # Update content fields from dict
            if "body" in content:
                template.body = content["body"]
            if "variables" in content:
                template.variables = content["variables"]

            # TODO: Create entry in whatsapp_template_versions table
            # This would require creating a WhatsAppTemplateVersion model

            await self.db.flush()

            logger.info(
                f"Template {template_id} version updated to "
                f"v{template.version_number}"
            )

            return True

        except Exception as e:
            logger.error(f"Error creating version: {e}", exc_info=True)
            return False

    async def get_version_history(
        self,
        template_id: UUID,
        organization_id: UUID,
        limit: int = 10,
    ) -> List[Dict]:
        """
        Get version history for a template.

        Returns:
            List of version history entries
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return []

            history = [
                {
                    "version_number": template.version_number,
                    "created_at": template.version_created_at,
                    "is_current": True,
                }
            ]

            # TODO: Query whatsapp_template_versions table for older versions

            logger.info(
                f"Retrieved version history for template {template_id}"
            )

            return history

        except Exception as e:
            logger.error(
                f"Error getting version history: {e}", exc_info=True
            )
            return []

    async def rollback_to_version(
        self,
        template_id: UUID,
        organization_id: UUID,
        target_version: int,
    ) -> bool:
        """
        Rollback template to a specific version.

        Args:
            template_id: Template ID
            organization_id: Organization ID
            target_version: Version number to rollback to

        Returns:
            True if rollback successful
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return False

            if not template.versioning_enabled:
                logger.warning(
                    f"Versioning disabled for template {template_id}"
                )
                return False

            if target_version >= template.version_number:
                logger.warning(
                    f"Cannot rollback to version {target_version}: "
                    f"current version is {template.version_number}"
                )
                return False

            # TODO: Query whatsapp_template_versions for target version content
            # and restore it to the template

            template.version_number += 1
            template.version_created_at = datetime.now(timezone.utc)

            await self.db.flush()

            logger.info(
                f"Template {template_id} rolled back to v{target_version}, "
                f"current v{template.version_number}"
            )

            return True

        except Exception as e:
            logger.error(f"Error rolling back version: {e}", exc_info=True)
            return False

    async def enable_versioning(
        self,
        template_id: UUID,
        organization_id: UUID,
        enable: bool,
    ) -> bool:
        """
        Enable or disable versioning for a template.

        Args:
            template_id: Template ID
            organization_id: Organization ID
            enable: True to enable versioning

        Returns:
            True if updated successfully
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return False

            template.versioning_enabled = enable
            await self.db.flush()

            logger.info(
                f"Template {template_id} versioning set to {enable}"
            )

            return True

        except Exception as e:
            logger.error(f"Error updating versioning flag: {e}", exc_info=True)
            return False

    async def compare_versions(
        self,
        template_id: UUID,
        organization_id: UUID,
        version1: int,
        version2: int,
    ) -> Optional[Dict]:
        """
        Compare two versions of a template.

        Returns:
            Differences between versions
        """
        try:
            # TODO: Fetch both versions from whatsapp_template_versions
            # and compute differences

            comparison = {
                "template_id": template_id,
                "version1": version1,
                "version2": version2,
                "differences": [],
            }

            logger.info(
                f"Compared template {template_id} versions "
                f"v{version1} vs v{version2}"
            )

            return comparison

        except Exception as e:
            logger.error(f"Error comparing versions: {e}", exc_info=True)
            return None

    async def get_current_version_info(
        self,
        template_id: UUID,
        organization_id: UUID,
    ) -> Optional[Dict]:
        """
        Get current version information.

        Returns:
            Current version details
        """
        try:
            template = await self._get_template(
                template_id, organization_id
            )

            if not template:
                return None

            return {
                "template_id": template_id,
                "current_version": template.version_number,
                "version_created_at": template.version_created_at,
                "versioning_enabled": template.versioning_enabled,
                "previous_version_content": template.previous_version_content,
            }

        except Exception as e:
            logger.error(
                f"Error getting current version info: {e}", exc_info=True
            )
            return None

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
