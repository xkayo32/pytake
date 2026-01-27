"""
Auth GraphQL Types
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

import strawberry

from app.graphql.types.common import TimestampFields


@strawberry.type
class UserType:
    """User type for GraphQL"""
    id: strawberry.ID
    organization_id: strawberry.ID
    email: str
    name: str
    role: str
    is_active: bool
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None


@strawberry.type
class TokenResponse:
    """JWT Token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserType


@strawberry.input
class LoginInput:
    """Login credentials"""
    email: str
    password: str


@strawberry.input
class RegisterInput:
    """User registration input"""
    email: str
    password: str
    name: str
    organization_name: str
    phone: Optional[str] = None


@strawberry.input
class RefreshTokenInput:
    """Refresh token input"""
    refresh_token: str


@strawberry.type
class AuthPayload:
    """Auth mutation response"""
    success: bool
    message: Optional[str] = None
    user: Optional[UserType] = None
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
