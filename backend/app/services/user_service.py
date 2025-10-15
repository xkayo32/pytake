"""
User Service
Business logic for user management
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password
from app.core.exceptions import (
    BadRequestException,
    ConflictException,
    ForbiddenException,
    NotFoundException,
)


class UserService:
    """Service for user management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = UserRepository(db)

    async def get_by_id(self, user_id: UUID, organization_id: UUID) -> User:
        """Get user by ID within organization"""
        user = await self.repo.get(user_id)
        if not user:
            raise NotFoundException("User not found")

        # Check if user belongs to the organization
        if user.organization_id != organization_id:
            raise ForbiddenException("User does not belong to your organization")

        return user

    async def list_users(
        self,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        role: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> List[User]:
        """List users in organization"""
        query = select(User).where(
            User.organization_id == organization_id,
            User.deleted_at.is_(None)
        )

        if role:
            query = query.where(User.role == role)

        if is_active is not None:
            query = query.where(User.is_active == is_active)

        query = query.offset(skip).limit(limit).order_by(User.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_user(
        self, data: UserCreate, organization_id: UUID, created_by: User
    ) -> User:
        """Create new user in organization"""
        # Check if email already exists
        if await self.repo.email_exists(data.email):
            raise ConflictException("Email already registered")

        # Validate role assignment
        if data.role == "super_admin":
            raise ForbiddenException("Cannot create super_admin users")

        if data.role == "org_admin" and created_by.role not in ["super_admin", "org_admin"]:
            raise ForbiddenException("Only admins can create org_admin users")

        # Hash password
        password_hash = hash_password(data.password)

        # Create user
        user_data = {
            "email": data.email,
            "password_hash": password_hash,
            "full_name": data.full_name,
            "phone_number": data.phone_number,
            "role": data.role,
            "organization_id": organization_id,
            "is_active": True,
            "email_verified": False,
        }

        if data.department_ids:
            user_data["department_ids"] = data.department_ids

        user = await self.repo.create(user_data)
        return user

    async def update_user(
        self, user_id: UUID, data: UserUpdate, organization_id: UUID, updated_by: User
    ) -> User:
        """Update user"""
        user = await self.get_by_id(user_id, organization_id)

        # Prepare update data
        update_data = data.model_dump(exclude_unset=True)

        # Handle role changes
        if "role" in update_data:
            new_role = update_data["role"]

            # Prevent creating super_admin
            if new_role == "super_admin":
                raise ForbiddenException("Cannot assign super_admin role")

            # Only admins can change roles
            if updated_by.role not in ["super_admin", "org_admin"]:
                raise ForbiddenException("Only admins can change user roles")

            # Prevent changing own role
            if user_id == updated_by.id:
                raise ForbiddenException("Cannot change your own role")

        # Handle password changes
        if "password" in update_data and update_data["password"]:
            update_data["password_hash"] = hash_password(update_data["password"])
            del update_data["password"]

        updated_user = await self.repo.update(user_id, update_data)
        return updated_user

    async def deactivate_user(
        self, user_id: UUID, organization_id: UUID, deactivated_by: User
    ) -> User:
        """Deactivate user"""
        user = await self.get_by_id(user_id, organization_id)

        # Prevent self-deactivation
        if user_id == deactivated_by.id:
            raise ForbiddenException("Cannot deactivate yourself")

        # Only admins can deactivate users
        if deactivated_by.role not in ["super_admin", "org_admin"]:
            raise ForbiddenException("Only admins can deactivate users")

        return await self.repo.update(user_id, {"is_active": False})

    async def activate_user(
        self, user_id: UUID, organization_id: UUID, activated_by: User
    ) -> User:
        """Activate user"""
        user = await self.get_by_id(user_id, organization_id)

        # Only admins can activate users
        if activated_by.role not in ["super_admin", "org_admin"]:
            raise ForbiddenException("Only admins can activate users")

        return await self.repo.update(user_id, {"is_active": True})

    async def delete_user(
        self, user_id: UUID, organization_id: UUID, deleted_by: User
    ) -> bool:
        """Soft delete user"""
        user = await self.get_by_id(user_id, organization_id)

        # Prevent self-deletion
        if user_id == deleted_by.id:
            raise ForbiddenException("Cannot delete yourself")

        # Only admins can delete users
        if deleted_by.role not in ["super_admin", "org_admin"]:
            raise ForbiddenException("Only admins can delete users")

        return await self.repo.delete(user_id)

    async def get_user_stats(self, user_id: UUID, organization_id: UUID) -> dict:
        """Get user statistics"""
        user = await self.get_by_id(user_id, organization_id)

        # Import here to avoid circular imports
        from app.models.conversation import Conversation, Message

        # Count total conversations assigned to user
        total_conversations = await self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.current_agent_id == user_id,
                Conversation.deleted_at.is_(None)
            )
        ) or 0

        # Count active conversations
        conversations_active = await self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.current_agent_id == user_id,
                Conversation.status.in_(["active", "waiting"]),
                Conversation.deleted_at.is_(None)
            )
        ) or 0

        # Count resolved conversations
        conversations_resolved = await self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.current_agent_id == user_id,
                Conversation.status == "closed",
                Conversation.deleted_at.is_(None)
            )
        ) or 0

        # Count messages sent by user
        messages_sent = 0
        if user.role in ["agent", "org_admin"]:
            messages_sent = await self.db.scalar(
                select(func.count(Message.id)).where(
                    Message.sender_user_id == user_id,
                    Message.direction == "outgoing",
                    Message.deleted_at.is_(None)
                )
            ) or 0

        # Calculate average response time using CTE to avoid window function in aggregate
        # First, create a CTE with response times
        response_times_cte = select(
            (func.extract('epoch', Message.created_at - func.lag(Message.created_at).over(
                partition_by=Message.conversation_id,
                order_by=Message.created_at
            )) / 60).label('response_time')
        ).select_from(Message).where(
            Message.sender_user_id == user_id,
            Message.direction == 'outgoing',
            Message.deleted_at.is_(None)
        ).cte('response_times')

        # Then calculate average from the CTE
        avg_response_time_result = await self.db.execute(
            select(func.avg(response_times_cte.c.response_time)).where(
                response_times_cte.c.response_time.isnot(None)
            )
        )
        avg_response_time = avg_response_time_result.scalar()

        return {
            "total_conversations": total_conversations,
            "total_messages_sent": messages_sent,
            "avg_response_time_minutes": float(avg_response_time) if avg_response_time else None,
            "conversations_resolved": conversations_resolved,
            "conversations_active": conversations_active,
        }
