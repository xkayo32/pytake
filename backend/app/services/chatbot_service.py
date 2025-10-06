"""
Chatbot service - Business logic for chatbots, flows, and nodes
"""

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.chatbot import Chatbot, Flow, Node
from app.repositories.chatbot import ChatbotRepository, FlowRepository, NodeRepository
from app.schemas.chatbot import (
    ChatbotCreate,
    ChatbotInDB,
    ChatbotStats,
    ChatbotUpdate,
    FlowCreate,
    FlowUpdate,
    NodeCreate,
    NodeUpdate,
)


class ChatbotService:
    """Service for chatbot operations"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chatbot_repo = ChatbotRepository(db)
        self.flow_repo = FlowRepository(db)
        self.node_repo = NodeRepository(db)

    # ============================================
    # CHATBOT OPERATIONS
    # ============================================

    async def create_chatbot(
        self, data: ChatbotCreate, organization_id: UUID
    ) -> Chatbot:
        """
        Create a new chatbot

        Args:
            data: Chatbot creation data
            organization_id: Organization UUID

        Returns:
            Created chatbot
        """
        chatbot_data = {
            **data.model_dump(),
            "organization_id": organization_id,
        }

        chatbot = await self.chatbot_repo.create(chatbot_data)

        # Create default main flow
        default_flow = await self.flow_repo.create(
            {
                "name": "Main Flow",
                "description": "Default entry flow",
                "chatbot_id": chatbot.id,
                "organization_id": organization_id,
                "is_main": True,
                "canvas_data": {"nodes": [], "edges": []},
                "variables": {},
            }
        )

        return chatbot

    async def get_chatbot(
        self, chatbot_id: UUID, organization_id: UUID, with_flows: bool = False
    ) -> Optional[Chatbot]:
        """
        Get chatbot by ID

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID
            with_flows: Include flows

        Returns:
            Chatbot or None
        """
        if with_flows:
            return await self.chatbot_repo.get_with_flows(chatbot_id, organization_id)

        chatbot = await self.chatbot_repo.get(chatbot_id)
        if chatbot and chatbot.organization_id != organization_id:
            return None
        if chatbot and chatbot.deleted_at:
            return None

        return chatbot

    async def list_chatbots(
        self, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[List[Chatbot], int]:
        """
        List all chatbots for organization

        Args:
            organization_id: Organization UUID
            skip: Records to skip
            limit: Max records

        Returns:
            Tuple of (chatbots, total_count)
        """
        chatbots = await self.chatbot_repo.get_by_organization(
            organization_id, skip, limit
        )
        total = await self.chatbot_repo.count_by_organization(organization_id)
        return chatbots, total

    async def update_chatbot(
        self, chatbot_id: UUID, organization_id: UUID, data: ChatbotUpdate
    ) -> Chatbot:
        """
        Update chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated chatbot

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_chatbot = await self.chatbot_repo.update(chatbot_id, update_data)

        return updated_chatbot

    async def delete_chatbot(self, chatbot_id: UUID, organization_id: UUID):
        """
        Soft delete chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        await self.chatbot_repo.soft_delete(chatbot_id)

    async def activate_chatbot(self, chatbot_id: UUID, organization_id: UUID) -> Chatbot:
        """
        Activate chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Updated chatbot

        Raises:
            NotFoundException: If chatbot not found
            BadRequestException: If chatbot has no flows
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id, with_flows=True)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        # Validate chatbot has at least one flow
        flows = await self.flow_repo.get_by_chatbot(chatbot_id, organization_id)
        if not flows:
            raise BadRequestException("Chatbot must have at least one flow to be activated")

        # Check if main flow exists
        main_flow = await self.flow_repo.get_main_flow(chatbot_id, organization_id)
        if not main_flow:
            raise BadRequestException("Chatbot must have a main flow to be activated")

        updated_chatbot = await self.chatbot_repo.update(
            chatbot_id, {"is_active": True}
        )
        return updated_chatbot

    async def deactivate_chatbot(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> Chatbot:
        """
        Deactivate chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Updated chatbot

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        updated_chatbot = await self.chatbot_repo.update(
            chatbot_id, {"is_active": False}
        )
        return updated_chatbot

    async def get_chatbot_stats(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> ChatbotStats:
        """
        Get chatbot statistics

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Chatbot statistics

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id, with_flows=True)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        flows = await self.flow_repo.get_by_chatbot(chatbot_id, organization_id)
        total_nodes = 0
        for flow in flows:
            nodes = await self.node_repo.get_by_flow(flow.id, organization_id)
            total_nodes += len(nodes)

        return ChatbotStats(
            total_conversations=chatbot.total_conversations,
            total_messages_sent=chatbot.total_messages_sent,
            total_messages_received=chatbot.total_messages_received,
            total_flows=len(flows),
            total_nodes=total_nodes,
            is_active=chatbot.is_active,
            is_published=chatbot.is_published,
        )

    # ============================================
    # FLOW OPERATIONS
    # ============================================

    async def create_flow(self, data: FlowCreate, organization_id: UUID) -> Flow:
        """
        Create a new flow

        Args:
            data: Flow creation data
            organization_id: Organization UUID

        Returns:
            Created flow

        Raises:
            NotFoundException: If chatbot not found
            ConflictException: If trying to set as main but main already exists
        """
        # Verify chatbot exists
        chatbot = await self.get_chatbot(data.chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        # If this is main flow, unset other main flows
        if data.is_main:
            await self.flow_repo.unset_main_flows(data.chatbot_id, organization_id)

        flow_data = {**data.model_dump(), "organization_id": organization_id}
        flow = await self.flow_repo.create(flow_data)

        return flow

    async def get_flow(
        self, flow_id: UUID, organization_id: UUID, with_nodes: bool = False
    ) -> Optional[Flow]:
        """
        Get flow by ID

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
            with_nodes: Include nodes

        Returns:
            Flow or None
        """
        if with_nodes:
            return await self.flow_repo.get_with_nodes(flow_id, organization_id)

        flow = await self.flow_repo.get(flow_id)
        if flow and flow.organization_id != organization_id:
            return None
        if flow and flow.deleted_at:
            return None

        return flow

    async def list_flows(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> List[Flow]:
        """
        List all flows for a chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            List of flows
        """
        return await self.flow_repo.get_by_chatbot(chatbot_id, organization_id)

    async def update_flow(
        self, flow_id: UUID, organization_id: UUID, data: FlowUpdate
    ) -> Flow:
        """
        Update flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated flow

        Raises:
            NotFoundException: If flow not found
        """
        flow = await self.get_flow(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")

        # If setting as main, unset other main flows
        if data.is_main:
            await self.flow_repo.unset_main_flows(flow.chatbot_id, organization_id)

        update_data = data.model_dump(exclude_unset=True)
        updated_flow = await self.flow_repo.update(flow_id, update_data)

        return updated_flow

    async def delete_flow(self, flow_id: UUID, organization_id: UUID):
        """
        Soft delete flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If flow not found
            BadRequestException: If trying to delete main flow
        """
        flow = await self.get_flow(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")

        if flow.is_main:
            raise BadRequestException("Cannot delete main flow. Set another flow as main first.")

        await self.flow_repo.soft_delete(flow_id)

    # ============================================
    # NODE OPERATIONS
    # ============================================

    async def create_node(self, data: NodeCreate, flow_id: UUID, organization_id: UUID) -> Node:
        """
        Create a new node

        Args:
            data: Node creation data
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            Created node

        Raises:
            NotFoundException: If flow not found
        """
        # Verify flow exists
        flow = await self.get_flow(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")

        node_data = {
            **data.model_dump(),
            "flow_id": flow_id,
            "organization_id": organization_id,
        }
        node = await self.node_repo.create(node_data)

        return node

    async def list_nodes(self, flow_id: UUID, organization_id: UUID) -> List[Node]:
        """
        List all nodes for a flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            List of nodes
        """
        return await self.node_repo.get_by_flow(flow_id, organization_id)

    async def update_node(
        self, node_id: UUID, organization_id: UUID, data: NodeUpdate
    ) -> Node:
        """
        Update node

        Args:
            node_id: Node UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated node

        Raises:
            NotFoundException: If node not found
        """
        node = await self.node_repo.get(node_id)
        if not node or node.organization_id != organization_id:
            raise NotFoundException("Node not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_node = await self.node_repo.update(node_id, update_data)

        return updated_node

    async def delete_node(self, node_id: UUID, organization_id: UUID):
        """
        Delete node

        Args:
            node_id: Node UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If node not found
        """
        node = await self.node_repo.get(node_id)
        if not node or node.organization_id != organization_id:
            raise NotFoundException("Node not found")

        await self.node_repo.delete(node_id)
