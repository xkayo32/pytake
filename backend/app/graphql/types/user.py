"""
User GraphQL Types
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

import strawberry

# Reuse UserType from auth
from app.graphql.types.auth import UserType


@strawberry.input
class UserCreateInput:
    """Input for creating user"""
    email: str
    password: str
    name: str
    role: str  # org_admin, agent, etc.
    phone: Optional[str] = None
    department_id: Optional[str] = None


@strawberry.input
class UserUpdateInput:
    """Input for updating user"""
    name: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    role: Optional[str] = None
    department_id: Optional[str] = None


@strawberry.input
class UserFilterInput:
    """Filter for listing users"""
    query: Optional[str] = None  # Search by name or email
    role: Optional[str] = None
    department_id: Optional[str] = None
    is_active: Optional[bool] = None


@strawberry.type
class UserListResponse:
    """Paginated user list response"""
    users: List[UserType]
    total: int
    skip: int
    limit: int


@strawberry.type
class UserStats:
    """User statistics"""
    total_conversations: int
    active_conversations: int
    completed_conversations: int
    average_response_time_seconds: Optional[int] = None
    customer_satisfaction_score: Optional[int] = None  # 0-100
