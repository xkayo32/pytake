"""
Authentication service
Handles user registration, login, token management
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.organization import Organization
from app.models.user import RefreshToken, User
from app.repositories.organization import OrganizationRepository
from app.repositories.user import UserRepository
from app.schemas.auth import Token, UserLogin, UserRegister
from app.schemas.user import User as UserSchema


class AuthService:
    """Authentication service"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.user_repo = UserRepository(db)
        self.org_repo = OrganizationRepository(db)

    async def register(self, data: UserRegister) -> tuple[UserSchema, Token]:
        """
        Register a new user and organization

        Args:
            data: User registration data

        Returns:
            Tuple of (User, Token)

        Raises:
            HTTPException: If email already exists
        """
        # Check if email already exists
        if await self.user_repo.email_exists(data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create organization slug from name
        org_slug = data.organization_name.lower().replace(" ", "-")

        # Check if slug exists and make it unique
        base_slug = org_slug
        counter = 1
        while await self.org_repo.slug_exists(org_slug):
            org_slug = f"{base_slug}-{counter}"
            counter += 1

        # Create organization
        org_data = {
            "name": data.organization_name,
            "slug": org_slug,
            "plan_type": "free",
            "is_active": True,
            "is_trial": True,
            "trial_ends_at": datetime.utcnow() + timedelta(days=14),  # 14-day trial
        }
        organization = await self.org_repo.create(org_data)

        # Create user (as org admin)
        user_data = {
            "organization_id": organization.id,
            "email": data.email,
            "password_hash": hash_password(data.password),
            "full_name": data.full_name,
            "role": "org_admin",
            "is_active": True,
            "email_verified": False,  # Should be verified via email
        }
        user = await self.user_repo.create(user_data)

        # Generate tokens
        token = await self._generate_tokens(user)

        # Convert to schema
        user_schema = UserSchema.model_validate(user)

        return user_schema, token

    async def login(
        self, data: UserLogin, ip_address: Optional[str] = None
    ) -> tuple[UserSchema, Token]:
        """
        Authenticate user and generate tokens

        Args:
            data: Login credentials
            ip_address: Optional IP address for logging

        Returns:
            Tuple of (User, Token)

        Raises:
            HTTPException: If credentials are invalid or account is locked
        """
        # DEVELOPMENT: Allow test user
        if data.email == "test@example.com" and data.password == "password":
            # Create mock user for development
            mock_user = UserSchema(
                id="12345678-1234-1234-1234-123456789012",
                email="test@example.com",
                full_name="Test User",
                role="org_admin",
                organization_id="5892e0e8-bf92-4e02-9bdc-0dabb3c8fc66",
                is_active=True,
                email_verified=True,
                is_online=False,
                created_at="2024-01-01T00:00:00Z",
                updated_at="2024-01-01T00:00:00Z"
            )
            
            mock_token = Token(
                access_token="mock_access_token_123",
                refresh_token="mock_refresh_token_456",
                token_type="bearer",
                expires_in=3600
            )
            
            return mock_user, mock_token

        # Get user by email
        user = await self.user_repo.get_by_email(data.email)

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        # Check if account is locked
        if user.is_locked:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Account is locked until {user.locked_until.isoformat()}",
            )

        # Check if account is active
        if not user.is_active or user.deleted_at:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is not active",
            )

        # Verify password
        if not verify_password(data.password, user.password_hash):
            # Increment failed attempts
            await self.user_repo.increment_failed_attempts(user.id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        # Reset failed attempts and record login
        await self.user_repo.reset_failed_attempts(user.id)
        user = await self.user_repo.record_login(user.id, ip_address)

        # Generate tokens
        token = await self._generate_tokens(user)

        # Convert to schema and populate permissions
        user_schema = UserSchema.model_validate(user)
        user_schema.permissions = await self._get_user_permissions(user.id)

        return user_schema, token

    async def refresh_access_token(self, refresh_token: str) -> Token:
        """
        Generate new access token from refresh token

        Args:
            refresh_token: Refresh token

        Returns:
            New token pair

        Raises:
            HTTPException: If refresh token is invalid
        """
        try:
            # Decode refresh token
            payload = decode_token(refresh_token)

            # Verify token type
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                )

            user_id = UUID(payload.get("sub"))

            # Get user
            user = await self.user_repo.get(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )

            # Check if user is active
            if not user.is_active or user.deleted_at:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not active",
                )

            # Generate new tokens
            return await self._generate_tokens(user)

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )

    async def logout(self, user_id: UUID, refresh_token: str):
        """
        Logout user by revoking refresh token

        Args:
            user_id: User UUID
            refresh_token: Refresh token to revoke
        """
        # In production, you would store refresh tokens in database
        # and mark them as revoked here
        # For now, we'll just let the token expire naturally
        pass

    async def _generate_tokens(self, user: User) -> Token:
        """
        Generate access and refresh tokens for user

        Args:
            user: User model instance

        Returns:
            Token response
        """
        # Additional claims for access token
        additional_claims = {
            "organization_id": str(user.organization_id),
            "role": user.role,
        }

        # Generate tokens
        access_token = create_access_token(
            subject=str(user.id),
            additional_claims=additional_claims,
        )
        refresh_token = create_refresh_token(subject=str(user.id))

        # Calculate expiration
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds

        return Token(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=expires_in,
        )

    async def _get_user_permissions(self, user_id: UUID) -> list[str]:
        """
        Get list of permission names for a user based on their role
        
        Args:
            user_id: User ID
            
        Returns:
            List of permission names
        """
        from sqlalchemy import select
        from app.models.role import Permission, Role, RolePermission
        from app.models.user import User
        
        try:
            # Get user with role
            stmt = select(User).where(User.id == user_id)
            result = await self.db.execute(stmt)
            user = result.scalar_one_or_none()
            
            if not user or not user.role_id:
                return []
            
            # Get role with permissions eager-loaded
            stmt = (
                select(Role)
                .where(Role.id == user.role_id)
            )
            result = await self.db.execute(stmt)
            role = result.scalar_one_or_none()
            
            if not role:
                return []
            
            # Get permissions for role
            stmt = (
                select(Permission.name)
                .join(RolePermission, Permission.id == RolePermission.permission_id)
                .where(RolePermission.role_id == role.id)
                .where(Permission.is_active == True)
            )
            result = await self.db.execute(stmt)
            permissions = result.scalars().all()
            
            return list(permissions)
        except Exception as e:
            import logging
            logging.error(f"Error getting user permissions: {e}")
            return []

    async def get_current_user(self, token: str) -> User:
        """
        Get current user from access token

        Args:
            token: Access token

        Returns:
            User model instance

        Raises:
            HTTPException: If token is invalid or user not found
        """
        try:
            payload = decode_token(token)

            # Verify token type
            if payload.get("type") != "access":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type",
                )

            user_id = UUID(payload.get("sub"))

            # Get user
            user = await self.user_repo.get(user_id)
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="User not found",
                )

            # Check if user is active
            if not user.is_active or user.deleted_at:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="User is not active",
                )

            return user

        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
