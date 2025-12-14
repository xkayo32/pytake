"""
User schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema, IDTimestampSchema


class UserBase(BaseSchema):
    """Base user schema"""

    email: EmailStr
    full_name: str = Field(..., min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: str = "agent"


class UserCreate(UserBase):
    """Schema for creating a user"""

    password: str = Field(..., min_length=8, max_length=100)
    department_ids: Optional[List[UUID]] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "email": "agent@example.com",
                "full_name": "Jane Agent",
                "password": "SecurePassword123!",
                "role": "agent",
            }
        }
    }


class UserUpdate(BaseSchema):
    """Schema for updating a user"""

    full_name: Optional[str] = Field(None, min_length=2, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None
    agent_status: Optional[str] = None
    agent_greeting_message: Optional[str] = None
    department_ids: Optional[List[UUID]] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "full_name": "Jane Agent Updated",
                "phone_number": "+5511999999999",
                "agent_status": "available",
                "department_ids": ["123e4567-e89b-12d3-a456-426614174000"],
            }
        }
    }


class User(IDTimestampSchema, UserBase):
    """User response schema"""

    organization_id: UUID
    email_verified: bool
    is_active: bool
    is_online: bool
    last_seen_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    agent_status: Optional[str] = None
    agent_greeting_message: Optional[str] = None
    department_ids: List[UUID] = []

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174000",
                "organization_id": "123e4567-e89b-12d3-a456-426614174001",
                "email": "agent@example.com",
                "full_name": "Jane Agent",
                "role": "agent",
                "email_verified": True,
                "is_active": True,
                "is_online": False,
                "created_at": "2025-10-03T12:00:00Z",
                "updated_at": "2025-10-03T12:00:00Z",
            }
        }
    }


class UserInDB(User):
    """User schema with sensitive fields (for internal use)"""

    password_hash: str
    permissions: List[str] = []
    failed_login_attempts: int = 0
    locked_until: Optional[datetime] = None


class UserProfile(User):
    """User profile schema (current user)"""

    permissions: List[str] = []


class UserListItem(BaseSchema):
    """Minimal user info for lists"""

    id: UUID
    email: EmailStr
    full_name: str
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    is_online: bool
    last_seen_at: Optional[datetime] = None


class AgentAvailable(BaseSchema):
    """Schema for available agents in a department"""

    id: UUID
    full_name: str
    email: EmailStr
    department_id: UUID
    agent_status: Optional[str] = Field(None, description="available, busy, away, offline")
    active_conversations_count: int = Field(
        ..., ge=0, description="Number of active conversations assigned to agent"
    )
    capacity_remaining: int = Field(
        ..., ge=0, description="Remaining capacity (max - active)"
    )
