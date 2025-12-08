"""
User Mutations
"""

from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.auth import UserType
from app.graphql.types.user import UserCreateInput, UserUpdateInput
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth, require_role
from app.repositories.user import UserRepository
from app.schemas.user import UserCreate, UserUpdate


@strawberry.type
class UserMutation:
    """User-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_user(
        self,
        info: Info[GraphQLContext, None],
        input: UserCreateInput,
    ) -> UserType:
        """
        Create new user in organization

        Requires: org_admin role
        """
        context: GraphQLContext = info.context

        user_repo = UserRepository(context.db)

        # Convert to Pydantic schema
        user_data = UserCreate(
            email=input.email,
            password=input.password,
            name=input.name,
            role=input.role,
            phone=input.phone,
            organization_id=context.organization_id,
            department_id=UUID(input.department_id) if input.department_id else None,
        )

        # Create user
        user = await user_repo.create(user_data, context.organization_id)

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

    @strawberry.mutation
    @require_auth
    async def update_user(
        self,
        info: Info[GraphQLContext, None],
        user_id: strawberry.ID,
        input: UserUpdateInput,
    ) -> UserType:
        """
        Update user

        Requires: Authentication
        - Users can update themselves
        - org_admin can update any user in organization
        """
        context: GraphQLContext = info.context
        user_repo = UserRepository(context.db)

        # Get user to update
        user_to_update = await user_repo.get_by_id(UUID(user_id))

        if not user_to_update or user_to_update.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        # Check permissions
        if str(user_to_update.organization_id) != str(context.organization_id):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: User belongs to different organization"
            )

        # Check if user can update
        is_self = str(user_to_update.id) == str(context.user_id)
        is_admin = context.user.role == "org_admin"

        if not is_self and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own profile or must be org_admin"
            )

        # Role changes only allowed for org_admin
        if input.role is not None and not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only org_admin can change user roles"
            )

        # Convert to Pydantic schema
        update_data = UserUpdate(
            name=input.name,
            phone=input.phone,
            avatar_url=input.avatar_url,
            role=input.role,
            department_id=UUID(input.department_id) if input.department_id else None,
        )

        # Update user
        user = await user_repo.update(UUID(user_id), update_data, context.organization_id)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
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

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_user(
        self,
        info: Info[GraphQLContext, None],
        user_id: strawberry.ID,
    ) -> SuccessResponse:
        """
        Delete user (soft delete)

        Requires: org_admin role
        """
        context: GraphQLContext = info.context

        # Cannot delete self
        if str(user_id) == str(context.user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot delete your own account"
            )

        user_repo = UserRepository(context.db)
        success = await user_repo.delete(UUID(user_id), context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        return SuccessResponse(
            success=True,
            message="User deleted successfully"
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def activate_user(
        self,
        info: Info[GraphQLContext, None],
        user_id: strawberry.ID,
    ) -> UserType:
        """
        Activate user account

        Requires: org_admin role
        """
        context: GraphQLContext = info.context

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

        user.is_active = True
        await context.db.commit()
        await context.db.refresh(user)

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

    @strawberry.mutation
    @require_role("org_admin")
    async def deactivate_user(
        self,
        info: Info[GraphQLContext, None],
        user_id: strawberry.ID,
    ) -> UserType:
        """
        Deactivate user account

        Requires: org_admin role
        """
        context: GraphQLContext = info.context

        # Cannot deactivate self
        if str(user_id) == str(context.user_id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot deactivate your own account"
            )

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

        user.is_active = False
        await context.db.commit()
        await context.db.refresh(user)

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
