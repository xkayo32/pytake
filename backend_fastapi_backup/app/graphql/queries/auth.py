"""
Auth Queries - Get current user, user profile, etc.
"""

from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.auth import UserType
from app.graphql.permissions import require_auth
from app.repositories.user import UserRepository


@strawberry.type
class AuthQuery:
    """Auth-related queries"""

    @strawberry.field
    @require_auth
    async def me(
        self,
        info: Info[GraphQLContext, None],
    ) -> UserType:
        """
        Get current authenticated user

        Requires: Authentication
        """
        context: GraphQLContext = info.context

        user = context.user

        return UserType(
            id=strawberry.ID(str(user.id)),
            organization_id=strawberry.ID(str(user.organization_id)),
            email=user.email,
            name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            phone=user.phone_number,
            avatar_url=user.avatar_url,
            created_at=user.created_at,
            updated_at=user.updated_at,
            deleted_at=user.deleted_at,
        )
