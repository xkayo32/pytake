"""
Chatbot, Flow, and Node repositories
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chatbot import Chatbot, Flow, Node
from app.repositories.base import BaseRepository


class ChatbotRepository(BaseRepository[Chatbot]):
    """Repository for Chatbot model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Chatbot, db)

    async def get_by_organization(
        self,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        include_deleted: bool = False,
    ) -> List[Chatbot]:
        """
        Get all chatbots for an organization

        Args:
            organization_id: Organization UUID
            skip: Number of records to skip
            limit: Maximum number of records
            include_deleted: Include soft-deleted records

        Returns:
            List of chatbots
        """
        query = select(Chatbot).where(Chatbot.organization_id == organization_id)

        if not include_deleted:
            query = query.where(Chatbot.deleted_at.is_(None))

        query = query.offset(skip).limit(limit).order_by(Chatbot.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_with_flows(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> Optional[Chatbot]:
        """
        Get chatbot with flows loaded

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Chatbot with flows or None
        """
        result = await self.db.execute(
            select(Chatbot)
            .options(selectinload(Chatbot.flows))
            .where(Chatbot.id == chatbot_id)
            .where(Chatbot.organization_id == organization_id)
            .where(Chatbot.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_active_chatbots(self, organization_id: UUID) -> List[Chatbot]:
        """
        Get all active chatbots for organization

        Args:
            organization_id: Organization UUID

        Returns:
            List of active chatbots
        """
        result = await self.db.execute(
            select(Chatbot)
            .where(Chatbot.organization_id == organization_id)
            .where(Chatbot.is_active == True)
            .where(Chatbot.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def count_by_organization(
        self, organization_id: UUID, include_deleted: bool = False
    ) -> int:
        """
        Count chatbots for organization

        Args:
            organization_id: Organization UUID
            include_deleted: Include soft-deleted records

        Returns:
            Count of chatbots
        """
        query = select(func.count(Chatbot.id)).where(
            Chatbot.organization_id == organization_id
        )

        if not include_deleted:
            query = query.where(Chatbot.deleted_at.is_(None))

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def increment_stats(
        self,
        chatbot_id: UUID,
        conversations: int = 0,
        messages_sent: int = 0,
        messages_received: int = 0,
    ):
        """
        Increment chatbot statistics

        Args:
            chatbot_id: Chatbot UUID
            conversations: Number to increment conversations
            messages_sent: Number to increment messages sent
            messages_received: Number to increment messages received
        """
        chatbot = await self.get(chatbot_id)
        if chatbot:
            chatbot.total_conversations += conversations
            chatbot.total_messages_sent += messages_sent
            chatbot.total_messages_received += messages_received
            await self.db.commit()


class FlowRepository(BaseRepository[Flow]):
    """Repository for Flow model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Flow, db)

    async def get_by_chatbot(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> List[Flow]:
        """
        Get all flows for a chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            List of flows
        """
        result = await self.db.execute(
            select(Flow)
            .where(Flow.chatbot_id == chatbot_id)
            .where(Flow.organization_id == organization_id)
            .where(Flow.deleted_at.is_(None))
            .order_by(Flow.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_with_nodes(
        self, flow_id: UUID, organization_id: UUID
    ) -> Optional[Flow]:
        """
        Get flow with nodes loaded

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            Flow with nodes or None
        """
        result = await self.db.execute(
            select(Flow)
            .options(selectinload(Flow.nodes))
            .where(Flow.id == flow_id)
            .where(Flow.organization_id == organization_id)
            .where(Flow.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_main_flow(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> Optional[Flow]:
        """
        Get main flow for chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Main flow or None
        """
        result = await self.db.execute(
            select(Flow)
            .where(Flow.chatbot_id == chatbot_id)
            .where(Flow.organization_id == organization_id)
            .where(Flow.is_main == True)
            .where(Flow.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def unset_main_flows(self, chatbot_id: UUID, organization_id: UUID):
        """
        Unset all main flows for a chatbot (before setting a new one)

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID
        """
        flows = await self.get_by_chatbot(chatbot_id, organization_id)
        for flow in flows:
            if flow.is_main:
                flow.is_main = False
        await self.db.commit()


class NodeRepository(BaseRepository[Node]):
    """Repository for Node model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Node, db)

    async def get_by_flow(self, flow_id: UUID, organization_id: UUID) -> List[Node]:
        """
        Get all nodes for a flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            List of nodes
        """
        result = await self.db.execute(
            select(Node)
            .where(Node.flow_id == flow_id)
            .where(Node.organization_id == organization_id)
            .order_by(Node.order, Node.created_at)
        )
        return list(result.scalars().all())

    async def get_by_node_id(
        self, node_id: str, flow_id: UUID, organization_id: UUID
    ) -> Optional[Node]:
        """
        Get node by node_id (React Flow ID)

        Args:
            node_id: React Flow node ID
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            Node or None
        """
        result = await self.db.execute(
            select(Node)
            .where(Node.node_id == node_id)
            .where(Node.flow_id == flow_id)
            .where(Node.organization_id == organization_id)
        )
        return result.scalar_one_or_none()

    async def get_start_node(
        self, flow_id: UUID, organization_id: UUID
    ) -> Optional[Node]:
        """
        Get start node for a flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            Start node or None
        """
        result = await self.db.execute(
            select(Node)
            .where(Node.flow_id == flow_id)
            .where(Node.organization_id == organization_id)
            .where(Node.node_type == "start")
        )
        return result.scalar_one_or_none()

    async def delete_by_flow(self, flow_id: UUID, organization_id: UUID):
        """
        Delete all nodes for a flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
        """
        await self.db.execute(
            delete(Node)
            .where(Node.flow_id == flow_id)
            .where(Node.organization_id == organization_id)
        )
        await self.db.commit()

    async def bulk_create(self, nodes: List[Node]) -> List[Node]:
        """
        Bulk create nodes

        Args:
            nodes: List of Node instances

        Returns:
            List of created nodes
        """
        self.db.add_all(nodes)
        await self.db.commit()
        for node in nodes:
            await self.db.refresh(node)
        return nodes
