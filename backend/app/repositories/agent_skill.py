"""
Repository for AgentSkill operations
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.agent_skill import AgentSkill


class AgentSkillRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_user(self, organization_id: UUID, user_id: UUID) -> List[AgentSkill]:
        stmt = (
            select(AgentSkill)
            .where(AgentSkill.organization_id == organization_id)
            .where(AgentSkill.user_id == user_id)
            .where(AgentSkill.deleted_at.is_(None))
            .order_by(AgentSkill.skill_name.asc())
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def create(self, organization_id: UUID, user_id: UUID, skill_name: str, proficiency_level: int) -> AgentSkill:
        skill = AgentSkill(
            organization_id=organization_id,
            user_id=user_id,
            skill_name=skill_name,
            proficiency_level=proficiency_level,
        )
        self.db.add(skill)
        await self.db.flush()
        await self.db.refresh(skill)
        return skill

    async def update(self, skill_id: UUID, organization_id: UUID, user_id: UUID, **fields) -> Optional[AgentSkill]:
        stmt = (
            update(AgentSkill)
            .where(AgentSkill.id == skill_id)
            .where(AgentSkill.organization_id == organization_id)
            .where(AgentSkill.user_id == user_id)
            .values(**fields)
            .returning(AgentSkill)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def soft_delete(self, skill_id: UUID, organization_id: UUID, user_id: UUID) -> None:
        # Use soft delete mixin via setting deleted_at
        stmt = (
            update(AgentSkill)
            .where(AgentSkill.id == skill_id)
            .where(AgentSkill.organization_id == organization_id)
            .where(AgentSkill.user_id == user_id)
            .values(deleted_at="now()")
        )
        await self.db.execute(stmt)
