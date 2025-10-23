"""
Service for managing agent skills
"""

from typing import List
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, func

from app.core.exceptions import NotFoundException
from app.models.user import User
from app.repositories.agent_skill import AgentSkillRepository
from app.schemas.agent_skill import AgentSkill as AgentSkillSchema, AgentSkillCreate, AgentSkillUpdate


class AgentSkillService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = AgentSkillRepository(db)

    async def _ensure_user_belongs_to_org(self, user_id: UUID, organization_id: UUID):
        from sqlalchemy import select
        result = await self.db.execute(
            select(User).where(User.id == user_id, User.organization_id == organization_id, User.deleted_at.is_(None))
        )
        if not result.scalar_one_or_none():
            raise NotFoundException("User not found")

    async def list_user_skills(self, organization_id: UUID, user_id: UUID) -> List[AgentSkillSchema]:
        await self._ensure_user_belongs_to_org(user_id, organization_id)
        return await self.repo.list_by_user(organization_id, user_id)

    async def add_skill(self, organization_id: UUID, user_id: UUID, data: AgentSkillCreate) -> AgentSkillSchema:
        await self._ensure_user_belongs_to_org(user_id, organization_id)
        skill = await self.repo.create(
            organization_id=organization_id,
            user_id=user_id,
            skill_name=data.skill_name,
            proficiency_level=data.proficiency_level,
        )
        await self.db.commit()
        return skill

    async def update_skill(self, organization_id: UUID, user_id: UUID, skill_id: UUID, data: AgentSkillUpdate) -> AgentSkillSchema:
        await self._ensure_user_belongs_to_org(user_id, organization_id)
        fields = {k: v for k, v in data.dict(exclude_unset=True).items()}
        skill = await self.repo.update(skill_id, organization_id, user_id, **fields)
        if not skill:
            raise NotFoundException("Skill not found")
        await self.db.commit()
        return skill

    async def delete_skill(self, organization_id: UUID, user_id: UUID, skill_id: UUID) -> None:
        await self._ensure_user_belongs_to_org(user_id, organization_id)
        await self.repo.soft_delete(skill_id, organization_id, user_id)
        await self.db.commit()

    async def list_available_skills(self, organization_id: UUID) -> List[str]:
        """Return unique skill names across organization"""
        from app.models.agent_skill import AgentSkill
        result = await self.db.execute(
            select(AgentSkill.skill_name)
            .where(AgentSkill.organization_id == organization_id, AgentSkill.deleted_at.is_(None))
            .distinct()
            .order_by(AgentSkill.skill_name.asc())
        )
        return [row[0] for row in result.fetchall()]

    async def replace_user_skills(self, organization_id: UUID, user_id: UUID, skills: List[AgentSkillCreate]) -> List[AgentSkillSchema]:
        """Replace all current user skills with provided list (soft-delete + create)"""
        from app.models.agent_skill import AgentSkill
        from datetime import datetime

        await self._ensure_user_belongs_to_org(user_id, organization_id)

        # Soft-delete existing skills
        await self.db.execute(
            update(AgentSkill)
            .where(
                AgentSkill.organization_id == organization_id,
                AgentSkill.user_id == user_id,
                AgentSkill.deleted_at.is_(None),
            )
            .values(deleted_at=datetime.utcnow())
        )

        # Create new skills
        created: List[AgentSkillSchema] = []
        for s in skills:
            created_skill = await self.repo.create(
                organization_id=organization_id,
                user_id=user_id,
                skill_name=s.skill_name,
                proficiency_level=s.proficiency_level,
            )
            created.append(created_skill)

        await self.db.commit()

        return created
