"""
Flow Repository
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatbot import Flow
from app.repositories.base import BaseRepository


class FlowRepository(BaseRepository[Flow]):
    """Repository for Flow model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Flow, db)

    async def get_by_chatbot(self, chatbot_id: UUID, organization_id: UUID) -> List[Flow]:
        """Get all flows for a chatbot"""
        result = await self.db.execute(
            select(Flow).where(
                Flow.chatbot_id == chatbot_id,
                Flow.organization_id == organization_id,
                Flow.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())

    async def get_main_flow(self, chatbot_id: UUID, organization_id: UUID) -> Optional[Flow]:
        """Get main entry flow for chatbot"""
        result = await self.db.execute(
            select(Flow).where(
                Flow.chatbot_id == chatbot_id,
                Flow.organization_id == organization_id,
                Flow.is_main == True,
                Flow.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_fallback_flow(self, chatbot_id: UUID, organization_id: UUID) -> Optional[Flow]:
        """Get fallback flow for chatbot"""
        result = await self.db.execute(
            select(Flow).where(
                Flow.chatbot_id == chatbot_id,
                Flow.organization_id == organization_id,
                Flow.is_fallback == True,
                Flow.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_by_id_and_org(
        self, flow_id: UUID, organization_id: UUID
    ) -> Optional[Flow]:
        """Get flow by ID and verify organization access"""
        result = await self.db.execute(
            select(Flow).where(
                Flow.id == flow_id,
                Flow.organization_id == organization_id,
                Flow.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def count_active_flows(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> int:
        """Count active flows for a chatbot"""
        result = await self.db.execute(
            select(func.count(Flow.id)).where(
                Flow.chatbot_id == chatbot_id,
                Flow.organization_id == organization_id,
                Flow.is_active == True,
                Flow.deleted_at.is_(None),
            )
        )
        return result.scalar() or 0
