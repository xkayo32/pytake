"""
Chatbot, Flow, and Node repositories
"""

from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, delete, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.chatbot import Chatbot, ChatbotLinkingHistory, ChatbotNumberLink, Flow, Node
from app.repositories.base import BaseRepository


class ChatbotRepository(BaseRepository[Chatbot]):
    """Repository for Chatbot model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Chatbot, db)

    async def get_by_id(self, id: UUID, organization_id: UUID) -> Optional[Chatbot]:
        """Get chatbot by ID within organization"""
        result = await self.db.execute(
            select(Chatbot)
            .where(Chatbot.id == id)
            .where(Chatbot.organization_id == organization_id)
            .where(Chatbot.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

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

    async def get_fallback_chatbot(self, organization_id: UUID) -> Optional[Chatbot]:
        """
        Get fallback chatbot for organization

        Args:
            organization_id: Organization UUID

        Returns:
            Fallback chatbot or None
        """
        result = await self.db.execute(
            select(Chatbot)
            .where(Chatbot.organization_id == organization_id)
            .where(Chatbot.is_fallback == True)
            .where(Chatbot.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_whatsapp_number(
        self, organization_id: UUID, whatsapp_number_id: str
    ) -> Optional[Chatbot]:
        """
        Get chatbot linked to a specific WhatsApp number

        Args:
            organization_id: Organization UUID
            whatsapp_number_id: WhatsApp number ID

        Returns:
            Chatbot linked to this number or None
        """
        result = await self.db.execute(
            select(Chatbot)
            .join(ChatbotNumberLink)
            .where(Chatbot.organization_id == organization_id)
            .where(ChatbotNumberLink.whatsapp_number_id == whatsapp_number_id)
            .where(Chatbot.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

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


class ChatbotNumberLinkRepository(BaseRepository[ChatbotNumberLink]):
    """Repository for ChatbotNumberLink model"""

    def __init__(self, db: AsyncSession):
        super().__init__(ChatbotNumberLink, db)

    async def create(self, obj_in: Dict[str, Any]) -> ChatbotNumberLink:
        """
        Create a new chatbot number link
        Ensures ID is not passed (let database generate via server_default)
        
        Args:
            obj_in: Dictionary with field values (id will be removed if present)
        
        Returns:
            Created ChatbotNumberLink instance
        """
        # Remove id if present to let server_default generate it
        data = {k: v for k, v in obj_in.items() if k != 'id'}
        
        db_obj = ChatbotNumberLink(**data)
        self.db.add(db_obj)
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def get_by_chatbot(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> List[ChatbotNumberLink]:
        """
        Get all number links for a chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            List of number links
        """
        result = await self.db.execute(
            select(ChatbotNumberLink)
            .where(ChatbotNumberLink.chatbot_id == chatbot_id)
            .where(ChatbotNumberLink.organization_id == organization_id)
            .order_by(ChatbotNumberLink.linked_at)
        )
        return list(result.scalars().all())

    async def get_by_number(
        self, organization_id: UUID, whatsapp_number_id: str
    ) -> Optional[ChatbotNumberLink]:
        """
        Get number link by WhatsApp number

        Args:
            organization_id: Organization UUID
            whatsapp_number_id: WhatsApp number ID

        Returns:
            Number link or None
        """
        result = await self.db.execute(
            select(ChatbotNumberLink)
            .where(ChatbotNumberLink.organization_id == organization_id)
            .where(ChatbotNumberLink.whatsapp_number_id == whatsapp_number_id)
        )
        return result.scalar_one_or_none()

    async def delete_by_chatbot(
        self, chatbot_id: UUID, organization_id: UUID
    ):
        """
        Delete all number links for a chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID
        """
        await self.db.execute(
            delete(ChatbotNumberLink)
            .where(ChatbotNumberLink.chatbot_id == chatbot_id)
            .where(ChatbotNumberLink.organization_id == organization_id)
        )
        await self.db.commit()

    async def delete_by_number(
        self, chatbot_id: UUID, whatsapp_number_id: str, organization_id: UUID
    ):
        """
        Delete a specific number link for a chatbot

        Args:
            chatbot_id: Chatbot UUID
            whatsapp_number_id: WhatsApp number ID
            organization_id: Organization UUID
        """
        await self.db.execute(
            delete(ChatbotNumberLink)
            .where(ChatbotNumberLink.chatbot_id == chatbot_id)
            .where(ChatbotNumberLink.whatsapp_number_id == whatsapp_number_id)
            .where(ChatbotNumberLink.organization_id == organization_id)
        )
        await self.db.commit()

    async def create_or_get(
        self, obj_in: Dict[str, Any]
    ) -> ChatbotNumberLink:
        """
        Create a new chatbot number link or return existing one
        Idempotent: if link already exists, returns the existing link
        
        Args:
            obj_in: Dictionary with field values (chatbot_id, whatsapp_number_id, organization_id, linked_at)
        
        Returns:
            Created or existing ChatbotNumberLink instance
        """
        # Check if link already exists
        result = await self.db.execute(
            select(ChatbotNumberLink)
            .where(ChatbotNumberLink.chatbot_id == obj_in["chatbot_id"])
            .where(ChatbotNumberLink.whatsapp_number_id == obj_in["whatsapp_number_id"])
            .where(ChatbotNumberLink.organization_id == obj_in["organization_id"])
        )
        existing_link = result.scalar_one_or_none()
        
        if existing_link:
            return existing_link
        
        # Create new link
        return await self.create(obj_in)

    async def get_numbers_list(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> List[str]:
        """
        Get list of WhatsApp numbers for a chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            List of WhatsApp number IDs
        """
        links = await self.get_by_chatbot(chatbot_id, organization_id)
        return [link.whatsapp_number_id for link in links]


class ChatbotLinkingHistoryRepository(BaseRepository[ChatbotLinkingHistory]):
    """Repository for ChatbotLinkingHistory model"""

    def __init__(self, db: AsyncSession):
        super().__init__(ChatbotLinkingHistory, db)

    async def get_by_chatbot(
        self,
        chatbot_id: UUID,
        organization_id: UUID,
        limit: int = 100,
    ) -> List[ChatbotLinkingHistory]:
        """
        Get linking history for a chatbot (most recent first)

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID
            limit: Maximum number of records

        Returns:
            List of history entries
        """
        result = await self.db.execute(
            select(ChatbotLinkingHistory)
            .where(ChatbotLinkingHistory.chatbot_id == chatbot_id)
            .where(ChatbotLinkingHistory.organization_id == organization_id)
            .order_by(desc(ChatbotLinkingHistory.timestamp))
            .limit(limit)
        )
        return list(result.scalars().all())

