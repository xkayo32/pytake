"""
WhatsApp Template Service
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
import logging
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.models.whatsapp_number import WhatsAppTemplate
from app.schemas.template import (
    TemplateCreateRequest,
    TemplateUpdateRequest,
    TemplateResponse,
    TemplateComponentSchema
)
from app.integrations.meta_api import MetaCloudAPI, MetaAPIError
from app.core.exceptions import NotFoundException, ConflictException
from app.core.logging import get_logger

logger = get_logger(__name__)


class TemplateService:
    """Service for managing WhatsApp templates"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============= CRUD Operations =============

    async def list_templates(
        self,
        whatsapp_number_id: UUID,
        organization_id: UUID,
        status: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[WhatsAppTemplate]:
        """
        List templates for a WhatsApp number

        Args:
            whatsapp_number_id: WhatsApp number ID
            organization_id: Organization ID
            status: Filter by status (optional)
            skip: Number of records to skip
            limit: Number of records to return

        Returns:
            List of templates
        """
        query = select(WhatsAppTemplate).where(
            and_(
                WhatsAppTemplate.whatsapp_number_id == whatsapp_number_id,
                WhatsAppTemplate.organization_id == organization_id,
                WhatsAppTemplate.deleted_at.is_(None)
            )
        )

        if status:
            query = query.where(WhatsAppTemplate.status == status)

        query = query.offset(skip).limit(limit).order_by(WhatsAppTemplate.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_template(
        self,
        template_id: UUID,
        organization_id: UUID
    ) -> WhatsAppTemplate:
        """
        Get template by ID

        Args:
            template_id: Template ID
            organization_id: Organization ID

        Returns:
            Template instance

        Raises:
            NotFoundException: If template not found
        """
        query = select(WhatsAppTemplate).where(
            and_(
                WhatsAppTemplate.id == template_id,
                WhatsAppTemplate.organization_id == organization_id,
                WhatsAppTemplate.deleted_at.is_(None)
            )
        )

        result = await self.db.execute(query)
        template = result.scalar_one_or_none()

        if not template:
            raise NotFoundException("Template not found")

        return template

    async def create_template(
        self,
        data: TemplateCreateRequest,
        whatsapp_number_id: UUID,
        organization_id: UUID,
        waba_id: str,
        access_token: str,
        submit_to_meta: bool = True
    ) -> WhatsAppTemplate:
        """
        Create a new template

        Args:
            data: Template data
            whatsapp_number_id: WhatsApp number ID
            organization_id: Organization ID
            waba_id: WhatsApp Business Account ID
            access_token: Meta API access token
            submit_to_meta: Whether to submit to Meta immediately

        Returns:
            Created template

        Raises:
            ConflictException: If template with same name exists
            MetaAPIError: If Meta API submission fails
        """
        # Check if template with same name already exists
        existing = await self._get_by_name(
            name=data.name,
            language=data.language,
            whatsapp_number_id=whatsapp_number_id,
            organization_id=organization_id
        )

        if existing:
            raise ConflictException(f"Template with name '{data.name}' already exists")

        # Extract header, body, footer from components
        header_type = None
        header_text = None
        header_vars = 0
        body_text = ""
        body_vars = 0
        footer_text = None
        buttons = []

        for component in data.components:
            if component.type == "HEADER":
                header_type = component.format
                header_text = component.text
                if component.text:
                    header_vars = self._count_variables(component.text)

            elif component.type == "BODY":
                body_text = component.text or ""
                body_vars = self._count_variables(body_text)

            elif component.type == "FOOTER":
                footer_text = component.text

            elif component.type == "BUTTONS" and component.buttons:
                buttons = [btn.model_dump() for btn in component.buttons]

        # Detect variable format and extract variable names
        # Check all text fields to determine if using named or positional variables
        all_text = f"{header_text or ''} {body_text} {footer_text or ''}"
        parameter_format = self._detect_variable_format(all_text)

        # Extract named variable names if using named format
        named_variables = []
        if parameter_format == "NAMED":
            if header_text:
                named_variables.extend(self._extract_named_variables(header_text))
            named_variables.extend(self._extract_named_variables(body_text))
            if footer_text:
                named_variables.extend(self._extract_named_variables(footer_text))
            # Remove duplicates while preserving order
            named_variables = list(dict.fromkeys(named_variables))

        # Create template in database
        template = WhatsAppTemplate(
            organization_id=organization_id,
            whatsapp_number_id=whatsapp_number_id,
            name=data.name,
            language=data.language,
            category=data.category,
            status="DRAFT",
            header_type=header_type,
            header_text=header_text,
            header_variables_count=header_vars,
            body_text=body_text,
            body_variables_count=body_vars,
            footer_text=footer_text,
            buttons=buttons,
            parameter_format=parameter_format,
            named_variables=named_variables,
        )

        self.db.add(template)
        await self.db.commit()
        await self.db.refresh(template)

        logger.info(f"Template '{data.name}' created locally with ID {template.id}")

        # ALWAYS run AI Analysis (regardless of submit_to_meta)
        # This provides immediate feedback on template quality
        from app.services.template_ai_analysis_service import TemplateAIAnalysisService

        ai_service = TemplateAIAnalysisService(self.db)
        analysis = None

        try:
            # Execute AI analysis
            logger.info(f"Running AI analysis for template '{template.name}'")
            analysis = await ai_service.analyze_template(
                template=template,
                organization_id=organization_id
            )

            # Save analysis results to template
            template.ai_analysis_result = analysis.dict()
            template.ai_analysis_score = analysis.overall_score
            template.ai_suggested_category = analysis.suggested_category
            template.ai_analyzed_at = datetime.utcnow()
            await self.db.commit()

            logger.info(
                f"AI analysis completed for template '{template.name}': "
                f"score={analysis.overall_score}, can_submit={analysis.can_submit}, "
                f"critical_issues={analysis.has_critical_issues}"
            )

        except Exception as e:
            # If AI analysis fails, continue (failsafe)
            logger.warning(
                f"AI analysis failed for template '{template.name}': {e}. "
                f"Template created without analysis."
            )

        # Submit to Meta if requested
        if submit_to_meta:
            # If analysis detected critical issues, DO NOT submit to Meta
            # Return template with analysis for user to review
            if analysis and analysis.has_critical_issues:
                logger.warning(
                    f"Template '{template.name}' has critical issues "
                    f"(score: {analysis.overall_score}). Not submitting to Meta."
                )
                await self.db.refresh(template)

                # Return dict with analysis info instead of just template
                # This will be handled by the endpoint to return proper response
                return {
                    "template": template,
                    "ai_analysis": analysis,
                    "submitted_to_meta": False,
                    "message": (
                        "Template não foi enviado à Meta devido a problemas detectados pela IA. "
                        "Revise as sugestões e corrija os problemas antes de submeter."
                    )
                }

            # Analysis passed (or no analysis), continue with Meta submission
            if analysis:
                logger.info(
                    f"Template '{template.name}' passed AI analysis "
                    f"(score: {analysis.overall_score}). Proceeding with Meta submission."
                )
            else:
                logger.info(
                    f"Template '{template.name}' proceeding with Meta submission "
                    f"(AI analysis was not available)."
                )

            # Submit to Meta
            try:
                await self.submit_to_meta(template, waba_id, access_token)
            except MetaAPIError as e:
                logger.error(f"Failed to submit template to Meta: {e.message}")
                # Keep template as DRAFT, don't delete
                raise

        return template

    async def update_template(
        self,
        template_id: UUID,
        data: TemplateUpdateRequest,
        organization_id: UUID
    ) -> WhatsAppTemplate:
        """
        Update template (only local fields)

        Note: Template content cannot be edited after submission to Meta.
        To modify a template, create a new one.

        Args:
            template_id: Template ID
            data: Update data
            organization_id: Organization ID

        Returns:
            Updated template
        """
        template = await self.get_template(template_id, organization_id)

        if data.is_enabled is not None:
            template.is_enabled = data.is_enabled

        template.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(template)

        return template

    async def delete_template(
        self,
        template_id: UUID,
        organization_id: UUID,
        waba_id: Optional[str] = None,
        access_token: Optional[str] = None,
        delete_from_meta: bool = False
    ) -> bool:
        """
        Delete template

        Args:
            template_id: Template ID
            organization_id: Organization ID
            waba_id: WhatsApp Business Account ID (required if delete_from_meta=True)
            access_token: Meta API access token (required if delete_from_meta=True)
            delete_from_meta: Whether to delete from Meta as well

        Returns:
            True if deleted

        Raises:
            ValueError: If template is system template
        """
        template = await self.get_template(template_id, organization_id)

        if template.is_system_template:
            raise ValueError("Cannot delete system template")

        # Delete from Meta if requested
        if delete_from_meta and waba_id and access_token:
            if template.status == "APPROVED":
                try:
                    meta_api = MetaCloudAPI(
                        phone_number_id="",  # Not needed for delete
                        access_token=access_token
                    )
                    await meta_api.delete_template(waba_id, template.name)
                    logger.info(f"Template '{template.name}' deleted from Meta")
                except MetaAPIError as e:
                    logger.error(f"Failed to delete template from Meta: {e.message}")
                    # Continue with local delete anyway

        # Soft delete
        template.deleted_at = datetime.utcnow()
        await self.db.commit()

        logger.info(f"Template {template_id} deleted locally")
        return True

    # ============= Meta API Operations =============

    async def submit_to_meta(
        self,
        template: WhatsAppTemplate,
        waba_id: str,
        access_token: str
    ) -> WhatsAppTemplate:
        """
        Submit template to Meta for approval

        Args:
            template: Template instance
            waba_id: WhatsApp Business Account ID
            access_token: Meta API access token

        Returns:
            Updated template with PENDING status

        Raises:
            MetaAPIError: If API call fails
        """
        if template.status != "DRAFT":
            raise ValueError("Only DRAFT templates can be submitted")

        # Build components for Meta API
        components = []

        # Header
        if template.header_type and template.header_text:
            components.append({
                "type": "HEADER",
                "format": template.header_type,
                "text": template.header_text
            })

        # Body (required)
        components.append({
            "type": "BODY",
            "text": template.body_text
        })

        # Footer
        if template.footer_text:
            components.append({
                "type": "FOOTER",
                "text": template.footer_text
            })

        # Buttons
        if template.buttons and len(template.buttons) > 0:
            components.append({
                "type": "BUTTONS",
                "buttons": template.buttons
            })

        # Submit to Meta
        meta_api = MetaCloudAPI(
            phone_number_id="",  # Not needed for template creation
            access_token=access_token
        )

        response = await meta_api.create_template(
            waba_id=waba_id,
            name=template.name,
            language=template.language,
            category=template.category,
            components=components
        )

        # Update template with Meta response
        template.meta_template_id = response.get("id")
        template.status = response.get("status", "PENDING")
        template.updated_at = datetime.utcnow()

        # LEGACY CODE: Check if Meta suggested a different category
        # NOTE: As of April 2025, Meta no longer returns a different category in API responses.
        # Meta now either approves/rejects templates directly, or automatically changes
        # categories during monthly reviews (with 30-day advance notice).
        # This code is kept for backward compatibility but will not be triggered anymore.
        # Ref: https://support.wati.io/en/articles/12320234
        returned_category = response.get("category")
        if returned_category and returned_category != template.category:
            template.suggested_category = returned_category
            logger.warning(
                f"Meta suggested category '{returned_category}' for template '{template.name}' "
                f"(submitted as '{template.category}')"
            )
        else:
            template.suggested_category = None

        await self.db.commit()
        await self.db.refresh(template)

        logger.info(f"Template '{template.name}' submitted to Meta with ID {template.meta_template_id}")

        return template

    async def sync_from_meta(
        self,
        whatsapp_number_id: UUID,
        organization_id: UUID,
        waba_id: str,
        access_token: str
    ) -> Dict[str, int]:
        """
        Sync templates from Meta API

        Fetches all templates from Meta and updates local database:
        - Creates new templates found in Meta
        - Updates status of existing templates
        - Marks deleted templates

        Args:
            whatsapp_number_id: WhatsApp number ID
            organization_id: Organization ID
            waba_id: WhatsApp Business Account ID
            access_token: Meta API access token

        Returns:
            Dict with sync statistics: {created, updated, deleted}
        """
        meta_api = MetaCloudAPI(
            phone_number_id="",
            access_token=access_token
        )

        # Fetch all templates from Meta (all statuses)
         meta_templates = await meta_api.list_templates(waba_id, status="", limit=1000)

         logger.info(f"Fetched {len(meta_templates)} templates from Meta API")

         stats = {"created": 0, "updated": 0, "deleted": 0}

         # Get all local templates
         local_templates = await self.list_templates(
             whatsapp_number_id=whatsapp_number_id,
             organization_id=organization_id,
             limit=1000
         )
         local_by_name = {f"{t.name}_{t.language}": t for t in local_templates}

         # Process Meta templates
         for meta_template in meta_templates:
             name = meta_template.get("name")
             language = meta_template.get("language")

             # Meta API can return nested structure with templates[] array
             # Each item in templates[] has language-specific data
             template_data = meta_template
             if "templates" in meta_template and isinstance(meta_template["templates"], list):
                 # Find the template version for this language
                 for lang_version in meta_template["templates"]:
                     if lang_version.get("language") == language:
                         template_data = lang_version
                         break

             # Log every template from Meta for debugging
             logger.info(
                 f"Meta template: name={name}, language={language}, "
                 f"status={template_data.get('status')}, "
                 f"rejected_reason={template_data.get('rejected_reason')}"
             )

             key = f"{name}_{language}"
             local_template = local_by_name.get(key)

            if local_template:
                # Update existing template
                updated = False

                # Get status and rejected_reason from correct level
                status = template_data.get("status")
                rejected_reason = template_data.get("rejected_reason")

                # Log for debugging REJECTED templates
                if status == "REJECTED":
                    logger.info(
                        f"🔍 REJECTED template sync - name={name}, "
                        f"rejected_reason={rejected_reason}, "
                        f"has_templates_array={('templates' in meta_template)}"
                    )
                    # Log full template_data structure for debugging
                    logger.debug(f"Full template_data: {template_data}")

                # Log for debugging when rejected_reason is found
                if rejected_reason and rejected_reason != "NONE":
                    logger.info(f"✅ Found rejected_reason for {name}: {rejected_reason}")

                if local_template.status != status:
                    local_template.status = status
                    updated = True

                if status == "APPROVED" and not local_template.approved_at:
                    local_template.approved_at = datetime.utcnow()
                    updated = True

                if status == "REJECTED":
                    if not local_template.rejected_at:
                        local_template.rejected_at = datetime.utcnow()
                        updated = True

                    # Update rejected_reason if available and not "NONE"
                    if rejected_reason and rejected_reason != "NONE":
                        local_template.rejected_reason = rejected_reason
                        updated = True
                    elif not local_template.rejected_reason:
                        # Set default if Meta didn't provide reason
                        local_template.rejected_reason = "Rejected by Meta (reason not specified)"
                        updated = True

                if updated:
                    local_template.updated_at = datetime.utcnow()
                    stats["updated"] += 1

            else:
                # Create new template from Meta
                # (Template was created directly in Meta Business Manager)
                await self._create_from_meta_response(
                    meta_template,
                    whatsapp_number_id,
                    organization_id
                )
                stats["created"] += 1

        await self.db.commit()

        logger.info(f"Sync completed: {stats['created']} created, {stats['updated']} updated")

        return stats

    # ============= Helper Methods =============

    async def _get_by_name(
        self,
        name: str,
        language: str,
        whatsapp_number_id: UUID,
        organization_id: UUID
    ) -> Optional[WhatsAppTemplate]:
        """Get template by name and language"""
        query = select(WhatsAppTemplate).where(
            and_(
                WhatsAppTemplate.name == name,
                WhatsAppTemplate.language == language,
                WhatsAppTemplate.whatsapp_number_id == whatsapp_number_id,
                WhatsAppTemplate.organization_id == organization_id,
                WhatsAppTemplate.deleted_at.is_(None)
            )
        )

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    def _detect_variable_format(self, text: str) -> str:
        """
        Detect if template uses positional or named variables

        Returns:
            "POSITIONAL" if uses {{1}}, {{2}}, etc.
            "NAMED" if uses {{name}}, {{codigo}}, etc.
            "POSITIONAL" as default if no variables found
        """
        if not text:
            return "POSITIONAL"

        # Check for named variables (non-numeric)
        named_matches = re.findall(r'\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}', text)
        if named_matches:
            return "NAMED"

        # Check for positional variables (numeric)
        positional_matches = re.findall(r'\{\{(\d+)\}\}', text)
        if positional_matches:
            return "POSITIONAL"

        return "POSITIONAL"

    def _extract_named_variables(self, text: str) -> List[str]:
        """
        Extract named variable names from text

        Example: "Hello {{name}}, your code is {{codigo}}"
        Returns: ["name", "codigo"]
        """
        if not text:
            return []

        matches = re.findall(r'\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}', text)
        return list(set(matches))  # Remove duplicates

    def _count_variables(self, text: str) -> int:
        """
        Count number of unique variables in text
        Supports both positional ({{1}}) and named ({{name}}) variables
        """
        if not text:
            return 0

        # Try named variables first
        named_matches = re.findall(r'\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}', text)
        if named_matches:
            return len(set(named_matches))

        # Fall back to positional variables
        positional_matches = re.findall(r'\{\{(\d+)\}\}', text)
        return len(set(positional_matches))

    async def _create_from_meta_response(
        self,
        meta_template: Dict[str, Any],
        whatsapp_number_id: UUID,
        organization_id: UUID
    ) -> WhatsAppTemplate:
        """
        Create local template from Meta API response

        Used during sync to import templates created directly in Meta
        """
        # Meta API can return nested structure with templates[] array
        template_data = meta_template
        language = meta_template.get("language")

        if "templates" in meta_template and isinstance(meta_template["templates"], list):
            # Find the template version for this language
            for lang_version in meta_template["templates"]:
                if lang_version.get("language") == language:
                    template_data = lang_version
                    break

        # Extract components
        components = template_data.get("components", [])

        header_type = None
        header_text = None
        header_vars = 0
        body_text = ""
        body_vars = 0
        footer_text = None
        buttons = []

        for comp in components:
            comp_type = comp.get("type")

            if comp_type == "HEADER":
                header_type = comp.get("format")
                header_text = comp.get("text")
                if header_text:
                    header_vars = self._count_variables(header_text)

            elif comp_type == "BODY":
                body_text = comp.get("text", "")
                body_vars = self._count_variables(body_text)

            elif comp_type == "FOOTER":
                footer_text = comp.get("text")

            elif comp_type == "BUTTONS":
                buttons = comp.get("buttons", [])

        # Detect variable format and extract variable names
        all_text = f"{header_text or ''} {body_text} {footer_text or ''}"
        parameter_format = self._detect_variable_format(all_text)

        # Extract named variable names if using named format
        named_variables = []
        if parameter_format == "NAMED":
            if header_text:
                named_variables.extend(self._extract_named_variables(header_text))
            named_variables.extend(self._extract_named_variables(body_text))
            if footer_text:
                named_variables.extend(self._extract_named_variables(footer_text))
            # Remove duplicates while preserving order
            named_variables = list(dict.fromkeys(named_variables))

        # Get status and rejection info from correct level
        status = template_data.get("status")
        rejected_reason = template_data.get("rejected_reason")

        # Create template
        template = WhatsAppTemplate(
            organization_id=organization_id,
            whatsapp_number_id=whatsapp_number_id,
            meta_template_id=meta_template.get("id"),
            name=meta_template.get("name"),
            language=meta_template.get("language"),
            category=meta_template.get("category"),
            status=status,
            header_type=header_type,
            header_text=header_text,
            header_variables_count=header_vars,
            body_text=body_text,
            body_variables_count=body_vars,
            footer_text=footer_text,
            buttons=buttons,
            parameter_format=parameter_format,
            named_variables=named_variables,
        )

        # Set approval/rejection timestamps and reasons
        if status == "APPROVED":
            template.approved_at = datetime.utcnow()
        elif status == "REJECTED":
            template.rejected_at = datetime.utcnow()
            if rejected_reason and rejected_reason != "NONE":
                template.rejected_reason = rejected_reason
            else:
                template.rejected_reason = "Rejected by Meta (reason not specified)"

        self.db.add(template)
        return template
