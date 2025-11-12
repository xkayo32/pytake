"""
Department Repository
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.department import Department
from app.repositories.base import BaseRepository


class DepartmentRepository(BaseRepository[Department]):
    """Repository for Department model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Department, db)

    async def get(self, id: UUID) -> Optional[Department]:
        """Get department by ID"""
        result = await self.db.execute(
            select(Department).where(
                Department.id == id,
                Department.deleted_at.is_(None)
            )
        )
        return result.scalar_one_or_none()

    async def get_by_slug(
        self, slug: str, organization_id: UUID
    ) -> Optional[Department]:
        """Get department by slug within organization"""
        result = await self.db.execute(
            select(Department).where(
                Department.slug == slug,
                Department.organization_id == organization_id,
                Department.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def list_departments(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Department]:
        """List departments for organization with optional filters"""
        stmt = select(Department).where(
            Department.organization_id == organization_id,
            Department.deleted_at.is_(None)
        )

        # Filter by active status
        if is_active is not None:
            stmt = stmt.where(Department.is_active == is_active)

        stmt = stmt.offset(skip).limit(limit).order_by(Department.name)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_organization(
        self, organization_id: UUID
    ) -> List[Department]:
        """Get all departments for an organization (no limit)"""
        return await self.list_departments(
            organization_id=organization_id,
            skip=0,
            limit=1000  # High limit for getting all departments
        )

    async def get_active_departments(
        self, organization_id: UUID
    ) -> List[Department]:
        """Get only active departments"""
        return await self.list_departments(
            organization_id=organization_id,
            is_active=True,
            skip=0,
            limit=1000
        )

    async def count_departments(
        self,
        organization_id: UUID,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count departments with optional filters"""
        stmt = select(func.count(Department.id)).where(
            Department.organization_id == organization_id,
            Department.deleted_at.is_(None)
        )

        if is_active is not None:
            stmt = stmt.where(Department.is_active == is_active)

        result = await self.db.execute(stmt)
        return result.scalar() or 0

    async def update_stats(
        self,
        department_id: UUID,
        total_agents: Optional[int] = None,
        active_conversations: Optional[int] = None,
        queued_conversations: Optional[int] = None,
    ) -> Optional[Department]:
        """Update department statistics"""
        department = await self.get(department_id)
        if not department:
            return None

        if total_agents is not None:
            department.total_agents = total_agents
        if active_conversations is not None:
            department.active_conversations = active_conversations
        if queued_conversations is not None:
            department.queued_conversations = queued_conversations

        await self.db.commit()
        await self.db.refresh(department)
        return department

    async def add_agent(
        self, department_id: UUID, agent_id: UUID
    ) -> Optional[Department]:
        """Add agent to department"""
        department = await self.get(department_id)
        if not department:
            return None

        # Add agent ID if not already present
        if agent_id not in department.agent_ids:
            department.agent_ids.append(agent_id)
            department.total_agents = len(department.agent_ids)

            await self.db.commit()
            await self.db.refresh(department)

        return department

    async def remove_agent(
        self, department_id: UUID, agent_id: UUID
    ) -> Optional[Department]:
        """Remove agent from department"""
        department = await self.get(department_id)
        if not department:
            return None

        # Remove agent ID if present
        if agent_id in department.agent_ids:
            department.agent_ids.remove(agent_id)
            department.total_agents = len(department.agent_ids)

            await self.db.commit()
            await self.db.refresh(department)

        return department

    async def get_organization_stats(self, organization_id: UUID) -> dict:
        """Get organization-wide department statistics"""
        # Total departments
        total_departments = await self.count_departments(organization_id)

        # Active departments
        active_departments = await self.count_departments(
            organization_id, is_active=True
        )

        # Total agents across all departments
        result = await self.db.execute(
            select(func.sum(Department.total_agents)).where(
                Department.organization_id == organization_id,
                Department.deleted_at.is_(None)
            )
        )
        total_agents = result.scalar() or 0

        # Total queued conversations
        result = await self.db.execute(
            select(func.sum(Department.queued_conversations)).where(
                Department.organization_id == organization_id,
                Department.deleted_at.is_(None),
                Department.is_active == True
            )
        )
        total_queued = result.scalar() or 0

        return {
            "total_departments": total_departments,
            "active_departments": active_departments,
            "total_agents": total_agents,
            "total_queued_conversations": total_queued,
        }
