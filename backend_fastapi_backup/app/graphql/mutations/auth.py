"""
Auth Mutations - Login, Register, Refresh, Logout
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.auth import (
    LoginInput,
    RegisterInput,
    RefreshTokenInput,
    TokenResponse,
    UserType,
    AuthPayload,
)
from app.graphql.permissions import require_auth
from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
)
from app.core.config import get_settings
from app.repositories.user import UserRepository
from app.repositories.organization import OrganizationRepository
from app.models.user import User
from app.models.organization import Organization
from app.schemas.user import UserCreate
from app.schemas.organization import OrganizationCreate


settings = get_settings()


@strawberry.type
class AuthMutation:
    """Auth-related mutations"""

    @strawberry.mutation
    async def login(
        self,
        info: Info[GraphQLContext, None],
        input: LoginInput
    ) -> TokenResponse:
        """
        Login with email and password

        Returns JWT access and refresh tokens
        """
        context: GraphQLContext = info.context

        # Get user by email
        user_repo = UserRepository(context.db)
        user = await user_repo.get_by_email(input.email)

        if not user or not verify_password(input.password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password"
            )

        if user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User account is inactive"
            )

        # Create tokens
        access_token = create_access_token(
            subject=str(user.id),
            additional_claims={
                "organization_id": str(user.organization_id),
                "role": user.role,
            }
        )

        refresh_token = create_refresh_token(
            subject=str(user.id)
        )

        # Convert SQLAlchemy model to Strawberry type
        user_type = UserType(
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

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_type,
        )

    @strawberry.mutation
    async def register(
        self,
        info: Info[GraphQLContext, None],
        input: RegisterInput
    ) -> TokenResponse:
        """
        Register new user and organization

        Creates both organization and first admin user
        """
        context: GraphQLContext = info.context

        user_repo = UserRepository(context.db)
        org_repo = OrganizationRepository(context.db)

        # Check if email already exists
        existing_user = await user_repo.get_by_email(input.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create organization
        org_data = OrganizationCreate(
            name=input.organization_name,
            slug=input.organization_name.lower().replace(" ", "-"),
        )

        organization = await org_repo.create(org_data)

        # Create user (org_admin)
        user_data = UserCreate(
            email=input.email,
            password=input.password,
            name=input.name,
            phone=input.phone,
            role="org_admin",
            organization_id=organization.id,
        )

        user = await user_repo.create(user_data, organization.id)

        # Create tokens
        access_token = create_access_token(
            subject=str(user.id),
            additional_claims={
                "organization_id": str(user.organization_id),
                "role": user.role,
            }
        )

        refresh_token = create_refresh_token(
            subject=str(user.id)
        )

        user_type = UserType(
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

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user=user_type,
        )

    @strawberry.mutation
    async def refresh_token(
        self,
        info: Info[GraphQLContext, None],
        input: RefreshTokenInput
    ) -> TokenResponse:
        """
        Refresh access token using refresh token
        """
        context: GraphQLContext = info.context

        try:
            # Decode refresh token
            payload = decode_refresh_token(input.refresh_token)
            user_id = payload.get("sub")

            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid refresh token"
                )

            # Get user
            user_repo = UserRepository(context.db)
            user = await user_repo.get(UUID(user_id))

            if not user or user.deleted_at or not user.is_active:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found or inactive"
                )

            # Create new access token
            access_token = create_access_token(
                subject=str(user.id),
                additional_claims={
                    "organization_id": str(user.organization_id),
                    "role": user.role,
                }
            )

            # Create new refresh token
            new_refresh_token = create_refresh_token(
                subject=str(user.id)
            )

            user_type = UserType(
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

            return TokenResponse(
                access_token=access_token,
                refresh_token=new_refresh_token,
                token_type="bearer",
                expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user=user_type,
            )

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid refresh token: {str(e)}"
            )

    @strawberry.mutation
    @require_auth
    async def logout(
        self,
        info: Info[GraphQLContext, None],
    ) -> AuthPayload:
        """
        Logout current user

        Note: With JWT, logout is client-side (remove tokens)
        This endpoint is kept for consistency and future server-side session management
        """
        context: GraphQLContext = info.context

        return AuthPayload(
            success=True,
            message="Logged out successfully"
        )
