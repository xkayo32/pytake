"""
Node Repository - Data access for Flow Nodes
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatbot import Node
from app.repositories.base import BaseRepository


class NodeRepository(BaseRepository[Node]):
    """Repository for Node operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Node, db)

    async def get_by_id(self, node_id: UUID, organization_id: UUID) -> Optional[Node]:
        """Get node by ID with organization scope"""
        query = select(Node).where(
            Node.id == node_id,
            Node.organization_id == organization_id,
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_flow(
        self, flow_id: UUID, organization_id: UUID
    ) -> List[Node]:
        """Get all nodes in a flow"""
        query = select(Node).where(
            Node.flow_id == flow_id,
            Node.organization_id == organization_id,
        ).order_by(Node.order.asc(), Node.created_at.asc())
        result = await self.db.execute(query)
        return result.scalars().all()

    async def get_start_node(
        self, flow_id: UUID, organization_id: UUID
    ) -> Optional[Node]:
        """Get the start node of a flow"""
        query = select(Node).where(
            Node.flow_id == flow_id,
            Node.organization_id == organization_id,
            Node.node_type == "start",
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_node_id(
        self, flow_id: UUID, node_id: str, organization_id: UUID
    ) -> Optional[Node]:
        """Get node by React Flow node ID"""
        query = select(Node).where(
            Node.flow_id == flow_id,
            Node.node_id == node_id,
            Node.organization_id == organization_id,
        )
        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_by_type(
        self, flow_id: UUID, node_type: str, organization_id: UUID
    ) -> List[Node]:
        """Get all nodes of a specific type in a flow"""
        query = select(Node).where(
            Node.flow_id == flow_id,
            Node.node_type == node_type,
            Node.organization_id == organization_id,
        )
        result = await self.db.execute(query)
        return result.scalars().all()
