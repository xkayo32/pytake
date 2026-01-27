"""
Flow Service - Business logic for Flow operations
"""

import logging
from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ConflictException, NotFoundException
from app.models.chatbot import Flow, Chatbot
from app.repositories.flow import FlowRepository
from app.schemas.flow import FlowCreate, FlowUpdate, CanvasData

logger = logging.getLogger(__name__)


class FlowService:
    """Service for Flow management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = FlowRepository(db)

    async def create_flow(
        self, data: FlowCreate, organization_id: UUID
    ) -> Flow:
        """Create a new flow"""
        # Verify chatbot exists and belongs to organization
        chatbot = await self.db.get(Chatbot, data.chatbot_id)
        if not chatbot or chatbot.organization_id != organization_id:
            raise NotFoundException("Chatbot not found")

        # If marking as main, unset other main flows
        if data.is_main:
            current_main = await self.repo.get_main_flow(data.chatbot_id, organization_id)
            if current_main:
                await self.repo.update(current_main.id, {"is_main": False})

        # If marking as fallback, unset other fallback flows
        if data.is_fallback:
            current_fallback = await self.repo.get_fallback_flow(
                data.chatbot_id, organization_id
            )
            if current_fallback:
                await self.repo.update(current_fallback.id, {"is_fallback": False})

        flow_data = data.model_dump()
        flow_data["organization_id"] = organization_id
        
        # Convert CanvasData to dict if needed
        if isinstance(flow_data.get("canvas_data"), CanvasData):
            flow_data["canvas_data"] = flow_data["canvas_data"].model_dump()

        flow = await self.repo.create(flow_data)
        return flow

    async def get_flow(
        self, flow_id: UUID, organization_id: UUID
    ) -> Flow:
        """Get flow by ID"""
        flow = await self.repo.get_by_id_and_org(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")
        return flow

    async def list_flows_by_chatbot(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> List[Flow]:
        """List all flows for a chatbot"""
        return await self.repo.get_by_chatbot(chatbot_id, organization_id)

    async def update_flow(
        self, flow_id: UUID, data: FlowUpdate, organization_id: UUID
    ) -> Flow:
        """Update a flow"""
        logger.info(f"📝 Updating flow {flow_id} with data: {data.model_dump(exclude_unset=True)}")
        
        flow = await self.get_flow(flow_id, organization_id)

        # If marking as main, unset other main flows
        if data.is_main and not flow.is_main:
            current_main = await self.repo.get_main_flow(flow.chatbot_id, organization_id)
            if current_main:
                await self.repo.update(current_main.id, {"is_main": False})

        # If marking as fallback, unset other fallback flows
        if data.is_fallback and not flow.is_fallback:
            current_fallback = await self.repo.get_fallback_flow(
                flow.chatbot_id, organization_id
            )
            if current_fallback:
                await self.repo.update(current_fallback.id, {"is_fallback": False})

        update_data = data.model_dump(exclude_unset=True)
        
        # Convert CanvasData to dict if needed
        if isinstance(update_data.get("canvas_data"), CanvasData):
            update_data["canvas_data"] = update_data["canvas_data"].model_dump()

        logger.info(f"✅ Updating flow in DB with: {update_data}")
        updated_flow = await self.repo.update(flow_id, update_data)
        
        if not updated_flow:
            raise NotFoundException(f"Flow {flow_id} not found or could not be updated")
        
        logger.info(f"✅ Flow updated: {updated_flow.id} - canvas_data keys: {updated_flow.canvas_data.keys() if updated_flow.canvas_data else 'empty'}")
        
        return updated_flow

    async def delete_flow(
        self, flow_id: UUID, organization_id: UUID
    ) -> bool:
        """Delete a flow (soft delete)"""
        flow = await self.get_flow(flow_id, organization_id)
        return await self.repo.delete(flow_id)

    async def get_main_flow(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> Flow:
        """Get main entry flow for chatbot"""
        flow = await self.repo.get_main_flow(chatbot_id, organization_id)
        if not flow:
            raise NotFoundException("Main flow not found")
        return flow

    async def get_fallback_flow(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> Flow:
        """Get fallback flow for chatbot"""
        flow = await self.repo.get_fallback_flow(chatbot_id, organization_id)
        if not flow:
            raise NotFoundException("Fallback flow not found")
        return flow

    async def activate_flow(
        self, flow_id: UUID, organization_id: UUID
    ) -> Flow:
        """
        Activate a flow
        
        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
            
        Returns:
            Updated flow
            
        Raises:
            NotFoundException: If flow not found
        """
        flow = await self.get_flow(flow_id, organization_id)
        
        if flow.is_active:
            logger.info(f"ℹ️ Flow {flow_id} is already active")
            return flow
        
        logger.info(f"✅ Activating flow {flow_id}")
        updated_flow = await self.repo.update(flow_id, {"is_active": True})
        
        if not updated_flow:
            raise NotFoundException(f"Flow {flow_id} not found")
        
        return updated_flow

    async def deactivate_flow(
        self, flow_id: UUID, organization_id: UUID
    ) -> Flow:
        """
        Deactivate a flow
        
        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
            
        Returns:
            Updated flow
            
        Raises:
            NotFoundException: If flow not found
            ConflictException: If flow is main flow and cannot be deactivated
        """
        flow = await self.get_flow(flow_id, organization_id)
        
        if not flow.is_active:
            logger.info(f"ℹ️ Flow {flow_id} is already inactive")
            return flow
        
        # Check if it's the main flow (can still deactivate, but warn)
        if flow.is_main:
            logger.warning(
                f"⚠️ Flow {flow_id} is the main entry flow. "
                f"Deactivating it may affect conversation routing."
            )
        
        # Note: A chatbot can have zero active flows - it's a valid state
        # (chatbot is just a container/binding to WhatsApp, flows are the logic)
        
        logger.info(f"🔴 Deactivating flow {flow_id}")
        updated_flow = await self.repo.update(flow_id, {"is_active": False})
        
        if not updated_flow:
            raise NotFoundException(f"Flow {flow_id} not found")
        
        return updated_flow
