"""
User repository
"""

from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    """Repository for User model"""

    def __init__(self, db: AsyncSession):
        super().__init__(User, db)

    async def get_by_email(self, email: str) -> Optional[User]:
        """
        Get user by email
        Args:
            email: User email
        Returns:
            User instance or None
        """
        result = await self.db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        """
        Check if email already exists
        Args:
            email: Email to check
        Returns:
            True if exists, False otherwise
        """
        user = await self.get_by_email(email)
        return user is not None

    async def get_by_organization(
        self, organization_id: UUID, skip: int = 0, limit: int = 100
    ):
        """
        Get users by organization
        Args:
            organization_id: Organization UUID
            skip: Number of records to skip
            limit: Maximum number of records to return
        Returns:
            List of users
        """
        result = await self.db.execute(
            select(User)
            .where(User.organization_id == organization_id)
            .where(User.deleted_at.is_(None))
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_active_by_organization(self, organization_id: UUID):
        """
        Get active users by organization
        Args:
            organization_id: Organization UUID
        Returns:
            List of active users
        """
        result = await self.db.execute(
            select(User)
            .where(User.organization_id == organization_id)
            .where(User.is_active == True)
            .where(User.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def get_agents_by_department(
        self, organization_id: UUID, department_id: UUID
    ):
        """
        Get agents by department
        Args:
            organization_id: Organization UUID
            department_id: Department UUID
        Returns:
            List of agents
        """
        result = await self.db.execute(
            select(User)
            .where(User.organization_id == organization_id)
            .where(User.department_ids.contains([department_id]))
            .where(User.role == "agent")
            .where(User.is_active == True)
            .where(User.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def increment_failed_attempts(self, user_id: UUID):
        """
        Increment failed login attempts
        Args:
            user_id: User UUID
        """
        user = await self.get(user_id)
        if user:
            user.record_failed_login()
            await self.db.commit()
            await self.db.refresh(user)
        return user

    async def reset_failed_attempts(self, user_id: UUID):
        """
        Reset failed login attempts
        Args:
            user_id: User UUID
        """
        user = await self.get(user_id)
        if user:
            user.reset_failed_attempts()
            await self.db.commit()
            await self.db.refresh(user)
        return user

    async def record_login(self, user_id: UUID, ip_address: Optional[str] = None):
        """
        Record successful login
        Args:
            user_id: User UUID
            ip_address: IP address
        """
        user = await self.get(user_id)
        if user:
            user.record_login(ip_address)
            await self.db.commit()
            await self.db.refresh(user)
        return user
