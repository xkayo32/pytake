"""
Flow Automation service - Business logic for proactive flow dispatching
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID
import re

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.flow_automation import (
    FlowAutomation,
    FlowAutomationExecution,
    FlowAutomationRecipient,
)
from app.models.chatbot import Chatbot, Flow
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.whatsapp_number import WhatsAppNumber
from app.schemas.flow_automation import (
    FlowAutomationCreate,
    FlowAutomationUpdate,
    FlowAutomationStartRequest,
    FlowAutomationStats,
)


class FlowAutomationService:
    """Service for flow automation operations"""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ============================================
    # FLOW AUTOMATION CRUD
    # ============================================

    async def create_automation(
        self, data: FlowAutomationCreate, organization_id: UUID, user_id: UUID
    ) -> FlowAutomation:
        """
        Create a new flow automation

        Args:
            data: Automation creation data
            organization_id: Organization UUID
            user_id: User UUID creating the automation

        Returns:
            Created automation

        Raises:
            NotFoundException: If referenced entities don't exist
            BadRequestException: If validation fails
        """
        # Validate chatbot exists and belongs to org
        chatbot = await self._get_chatbot(data.chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException(f"Chatbot {data.chatbot_id} not found")

        # Validate flow exists and belongs to chatbot
        flow = await self._get_flow(data.flow_id, data.chatbot_id)
        if not flow:
            raise NotFoundException(f"Flow {data.flow_id} not found in chatbot")

        # Validate whatsapp number exists and belongs to org
        whatsapp_number = await self._get_whatsapp_number(
            data.whatsapp_number_id, organization_id
        )
        if not whatsapp_number:
            raise NotFoundException(f"WhatsApp number {data.whatsapp_number_id} not found")

        # Create automation
        automation = FlowAutomation(
            organization_id=organization_id,
            **data.model_dump(),
            status="draft",
            is_active=False,
        )

        self.db.add(automation)
        await self.db.commit()
        await self.db.refresh(automation)

        return automation

    async def get_automation(
        self, automation_id: UUID, organization_id: UUID
    ) -> Optional[FlowAutomation]:
        """
        Get automation by ID

        Args:
            automation_id: Automation UUID
            organization_id: Organization UUID

        Returns:
            Automation or None
        """
        query = select(FlowAutomation).where(
            and_(
                FlowAutomation.id == automation_id,
                FlowAutomation.organization_id == organization_id,
                FlowAutomation.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_automations(
        self,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> Tuple[List[FlowAutomation], int]:
        """
        List all automations for organization

        Args:
            organization_id: Organization UUID
            skip: Records to skip
            limit: Max records
            status: Filter by status
            is_active: Filter by active status

        Returns:
            Tuple of (automations, total_count)
        """
        # Build query
        conditions = [
            FlowAutomation.organization_id == organization_id,
            FlowAutomation.deleted_at.is_(None),
        ]

        if status:
            conditions.append(FlowAutomation.status == status)
        if is_active is not None:
            conditions.append(FlowAutomation.is_active == is_active)

        # Get automations with relationships
        query = (
            select(FlowAutomation)
            .options(
                selectinload(FlowAutomation.chatbot),
                selectinload(FlowAutomation.flow),
                selectinload(FlowAutomation.whatsapp_number),
            )
            .where(and_(*conditions))
            .order_by(FlowAutomation.created_at.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await self.db.execute(query)
        automations = result.scalars().all()

        # Count total
        count_query = select(FlowAutomation).where(and_(*conditions))
        count_result = await self.db.execute(count_query)
        total = len(count_result.scalars().all())

        return list(automations), total

    async def update_automation(
        self, automation_id: UUID, organization_id: UUID, data: FlowAutomationUpdate
    ) -> FlowAutomation:
        """
        Update automation

        Args:
            automation_id: Automation UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated automation

        Raises:
            NotFoundException: If automation not found
            BadRequestException: If automation is running
        """
        automation = await self.get_automation(automation_id, organization_id)
        if not automation:
            raise NotFoundException("Automation not found")

        # Can't update while running
        if automation.status == "running":
            raise BadRequestException("Cannot update automation while running")

        # Apply updates
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(automation, field, value)

        automation.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(automation)

        return automation

    async def delete_automation(
        self, automation_id: UUID, organization_id: UUID
    ) -> None:
        """
        Soft delete automation

        Args:
            automation_id: Automation UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If automation not found
            BadRequestException: If automation is running
        """
        automation = await self.get_automation(automation_id, organization_id)
        if not automation:
            raise NotFoundException("Automation not found")

        if automation.status == "running":
            raise BadRequestException("Cannot delete running automation")

        automation.deleted_at = datetime.utcnow()
        await self.db.commit()

    # ============================================
    # AUTOMATION EXECUTION
    # ============================================

    async def start_automation(
        self,
        automation_id: UUID,
        organization_id: UUID,
        user_id: UUID,
        request: Optional[FlowAutomationStartRequest] = None,
    ) -> FlowAutomationExecution:
        """
        Start automation execution manually

        Args:
            automation_id: Automation UUID
            organization_id: Organization UUID
            user_id: User UUID starting the automation
            request: Optional request with test mode settings

        Returns:
            Created execution

        Raises:
            NotFoundException: If automation not found
            BadRequestException: If automation is not startable
        """
        automation = await self.get_automation(automation_id, organization_id)
        if not automation:
            raise NotFoundException("Automation not found")

        # Validate can start
        if automation.status == "archived":
            raise BadRequestException("Cannot start archived automation")

        # Resolve audience
        if request and request.test_mode and request.test_contact_ids:
            # Test mode: use provided contact IDs
            contact_ids = request.test_contact_ids
        else:
            # Normal mode: resolve from automation config
            contact_ids = await self.resolve_audience(automation)

        if not contact_ids:
            raise BadRequestException("No recipients found for automation")

        # Create execution
        execution = FlowAutomationExecution(
            automation_id=automation_id,
            organization_id=organization_id,
            execution_type="manual",
            triggered_by_user_id=user_id,
            status="queued",
            total_recipients=len(contact_ids),
            started_at=datetime.utcnow(),
        )

        self.db.add(execution)
        await self.db.flush()

        # Create recipient records
        await self._create_recipients(execution.id, organization_id, contact_ids, automation)

        # Update automation stats
        automation.total_executions += 1
        automation.last_executed_at = datetime.utcnow()
        automation.status = "active"

        await self.db.commit()
        await self.db.refresh(execution)

        # TODO: Enqueue background task to process execution
        # await self._enqueue_execution(execution.id)

        return execution

    # ============================================
    # AUDIENCE RESOLUTION
    # ============================================

    async def resolve_audience(self, automation: FlowAutomation) -> List[UUID]:
        """
        Resolve audience based on automation configuration

        Args:
            automation: FlowAutomation instance

        Returns:
            List of contact IDs

        Supports:
        - custom: List of specific contact IDs
        - all: All active contacts
        - tags: Contacts with specific tags (future)
        - segment: Contacts matching filters (future)
        """
        audience_type = automation.audience_type
        audience_config = automation.audience_config

        if audience_type == "custom":
            # Custom list of contact IDs
            return audience_config.get("contact_ids", [])

        elif audience_type == "all":
            # All active contacts
            query = select(Contact.id).where(
                and_(
                    Contact.organization_id == automation.organization_id,
                    Contact.is_active == True,
                )
            )
            result = await self.db.execute(query)
            return [row[0] for row in result.all()]

        # Future: tags, segment, uploaded
        else:
            raise BadRequestException(f"Audience type '{audience_type}' not implemented yet")

    # ============================================
    # VARIABLE RESOLUTION
    # ============================================

    async def resolve_variables_for_contact(
        self, automation: FlowAutomation, contact: Contact
    ) -> dict:
        """
        Resolve variables for a specific contact

        Args:
            automation: FlowAutomation instance
            contact: Contact instance

        Returns:
            Dictionary of resolved variables

        Supports:
        - {{contact.field}}: Direct field access
        - {{contact.custom_fields.key}}: Custom fields
        - Static values
        """
        variable_mapping = automation.variable_mapping
        resolved = {}

        for var_name, var_template in variable_mapping.items():
            resolved[var_name] = self._resolve_variable_template(var_template, contact)

        return resolved

    def _resolve_variable_template(self, template: str, contact: Contact) -> str:
        """
        Resolve a single variable template

        Args:
            template: Template string (e.g., "{{contact.name}}")
            contact: Contact instance

        Returns:
            Resolved value
        """
        if not isinstance(template, str):
            return str(template)

        # Pattern: {{contact.field}} or {{contact.custom_fields.key}}
        pattern = r"\{\{contact\.([^}]+)\}\}"
        
        def replacer(match):
            path = match.group(1)  # e.g., "name" or "custom_fields.points"
            
            # Handle nested paths
            parts = path.split(".")
            value = contact
            
            for part in parts:
                if hasattr(value, part):
                    value = getattr(value, part)
                elif isinstance(value, dict) and part in value:
                    value = value[part]
                else:
                    return ""  # Field not found
            
            return str(value) if value is not None else ""
        
        result = re.sub(pattern, replacer, template)
        return result

    # ============================================
    # HELPER METHODS
    # ============================================

    async def _get_chatbot(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> Optional[Chatbot]:
        """Get chatbot by ID and validate ownership"""
        query = select(Chatbot).where(
            and_(
                Chatbot.id == chatbot_id,
                Chatbot.organization_id == organization_id,
                Chatbot.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_flow(self, flow_id: UUID, chatbot_id: UUID) -> Optional[Flow]:
        """Get flow by ID and validate it belongs to chatbot"""
        query = select(Flow).where(
            and_(
                Flow.id == flow_id,
                Flow.chatbot_id == chatbot_id,
                Flow.deleted_at.is_(None),
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_whatsapp_number(
        self, whatsapp_number_id: UUID, organization_id: UUID
    ) -> Optional[WhatsAppNumber]:
        """Get WhatsApp number by ID and validate ownership"""
        query = select(WhatsAppNumber).where(
            and_(
                WhatsAppNumber.id == whatsapp_number_id,
                WhatsAppNumber.organization_id == organization_id,
            )
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _create_recipients(
        self,
        execution_id: UUID,
        organization_id: UUID,
        contact_ids: List[UUID],
        automation: FlowAutomation,
    ) -> None:
        """
        Create recipient records for an execution

        Args:
            execution_id: Execution UUID
            organization_id: Organization UUID
            contact_ids: List of contact UUIDs
            automation: FlowAutomation instance
        """
        # Fetch contacts
        query = select(Contact).where(Contact.id.in_(contact_ids))
        result = await self.db.execute(query)
        contacts = result.scalars().all()

        # Create recipient for each contact
        recipients = []
        for contact in contacts:
            # Resolve variables for this contact
            variables = await self.resolve_variables_for_contact(automation, contact)

            recipient = FlowAutomationRecipient(
                execution_id=execution_id,
                organization_id=organization_id,
                contact_id=contact.id,
                phone_number=contact.phone_number,
                variables=variables,
                status="pending",
            )
            recipients.append(recipient)

        self.db.add_all(recipients)
        await self.db.flush()

    async def get_automation_stats(
        self, automation_id: UUID, organization_id: UUID
    ) -> FlowAutomationStats:
        """
        Get statistics for an automation

        Args:
            automation_id: Automation UUID
            organization_id: Organization UUID

        Returns:
            Statistics object
        """
        automation = await self.get_automation(automation_id, organization_id)
        if not automation:
            raise NotFoundException("Automation not found")

        # Calculate rates
        delivery_rate = (
            (automation.total_delivered / automation.total_sent * 100)
            if automation.total_sent > 0
            else None
        )
        read_rate = (
            (automation.total_read / automation.total_delivered * 100)
            if automation.total_delivered > 0
            else None
        )
        reply_rate = (
            (automation.total_replied / automation.total_sent * 100)
            if automation.total_sent > 0
            else None
        )
        completion_rate = (
            (automation.total_completed / automation.total_sent * 100)
            if automation.total_sent > 0
            else None
        )

        # Get last execution
        last_execution_query = (
            select(FlowAutomationExecution)
            .where(FlowAutomationExecution.automation_id == automation_id)
            .order_by(FlowAutomationExecution.created_at.desc())
            .limit(1)
        )
        last_execution_result = await self.db.execute(last_execution_query)
        last_execution = last_execution_result.scalar_one_or_none()

        return FlowAutomationStats(
            total_executions=automation.total_executions,
            total_sent=automation.total_sent,
            total_delivered=automation.total_delivered,
            total_read=automation.total_read,
            total_replied=automation.total_replied,
            total_completed=automation.total_completed,
            total_failed=automation.total_failed,
            delivery_rate=delivery_rate,
            read_rate=read_rate,
            reply_rate=reply_rate,
            completion_rate=completion_rate,
            last_execution_id=last_execution.id if last_execution else None,
            last_execution_status=last_execution.status if last_execution else None,
            last_executed_at=automation.last_executed_at,
            next_scheduled_at=automation.next_scheduled_at,
        )
