"""
User Queries
"""

from typing import Optional, List
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.auth import UserType
from app.graphql.types.user import UserListResponse, UserFilterInput, UserStats
from app.graphql.permissions import require_auth, require_role
from app.repositories.user import UserRepository
from app.repositories.conversation import ConversationRepository


@strawberry.type
class UserQuery:
    """User-related queries"""

    @strawberry.field
    @require_auth
    async def user(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> UserType:
        """
        Get user by ID

        Requires: Authentication
        Returns: User from same organization only
        """
        context: GraphQLContext = info.context

        user_repo = UserRepository(context.db)
        user = await user_repo.get_by_id(UUID(id))

        if not user or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Check organization access
        if str(user.organization_id) != str(context.organization_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User belongs to different organization"
            )

        return UserType(
            id=strawberry.ID(str(user.id)),
            organization_id=strawberry.ID(str(user.organization_id)),
            email=user.email,
            name=user.name,
            role=user.role,
            is_active=user.is_active,
            phone=user.phone,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at,
            deleted_at=user.deleted_at,
        )

    @strawberry.field
    @require_auth
    async def users(
        self,
        info: Info[GraphQLContext, None],
        skip: int = 0,
        limit: int = 10,
        filter: Optional[UserFilterInput] = None,
    ) -> UserListResponse:
        """
        List users in organization with pagination and filters

        Requires: Authentication
        Returns: Users from same organization only
        """
        context: GraphQLContext = info.context

        user_repo = UserRepository(context.db)

        # Get all users from organization
        users = await user_repo.get_by_organization(context.organization_id)

        # Apply filters
        if filter:
            if filter.query:
                query_lower = filter.query.lower()
                users = [
                    u for u in users
                    if query_lower in u.name.lower() or query_lower in u.email.lower()
                ]

            if filter.role:
                users = [u for u in users if u.role == filter.role]

            if filter.is_active is not None:
                users = [u for u in users if u.is_active == filter.is_active]

            if filter.department_id:
                users = [
                    u for u in users
                    if u.department_id and str(u.department_id) == filter.department_id
                ]

        # Count total before pagination
        total = len(users)

        # Apply pagination
        users = users[skip : skip + limit]

        # Convert to GraphQL types
        user_types = [
            UserType(
                id=strawberry.ID(str(u.id)),
                organization_id=strawberry.ID(str(u.organization_id)),
                email=u.email,
                name=u.name,
                role=u.role,
                is_active=u.is_active,
                phone=u.phone,
                avatar_url=u.avatar_url,
                created_at=u.created_at,
                updated_at=u.updated_at,
                deleted_at=u.deleted_at,
            )
            for u in users
        ]

        return UserListResponse(
            users=user_types,
            total=total,
            skip=skip,
            limit=limit,
        )

    @strawberry.field
    @require_auth
    async def user_stats(
        self,
        info: Info[GraphQLContext, None],
        user_id: strawberry.ID,
    ) -> UserStats:
        """
        Get user statistics

        Requires: Authentication
        """
        context: GraphQLContext = info.context

        # Verify user exists and belongs to organization
        user_repo = UserRepository(context.db)
        user = await user_repo.get_by_id(UUID(user_id))

        if not user or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if str(user.organization_id) != str(context.organization_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )

        # Get conversation stats
        conv_repo = ConversationRepository(context.db)
        conversations = await conv_repo.get_by_agent(UUID(user_id), context.organization_id)

        total_conversations = len(conversations)
        active_conversations = len([c for c in conversations if c.status == "active"])
        completed_conversations = len([c for c in conversations if c.status == "closed"])

        return UserStats(
            total_conversations=total_conversations,
            active_conversations=active_conversations,
            completed_conversations=completed_conversations,
            average_response_time_seconds=None,  # TODO: Calculate from messages
            customer_satisfaction_score=None,  # TODO: Get from feedback
        )
