"""
Department Schemas
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============= Base Schemas =============

class DepartmentBase(BaseModel):
    """Base department schema"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    color: str = Field(default="#3B82F6", pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)


class DepartmentCreate(DepartmentBase):
    """Schema for creating a department"""
    slug: Optional[str] = Field(None, max_length=100)
    is_active: bool = True
    business_hours: Optional[Dict] = Field(default_factory=dict)
    offline_message: Optional[str] = None
    routing_mode: str = Field(default="round_robin", pattern="^(round_robin|load_balance|manual)$")
    auto_assign_conversations: bool = True
    max_conversations_per_agent: int = Field(default=10, ge=1, le=100)


class DepartmentUpdate(BaseModel):
    """Schema for updating a department"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    business_hours: Optional[Dict] = None
    offline_message: Optional[str] = None
    routing_mode: Optional[str] = Field(None, pattern="^(round_robin|load_balance|manual)$")
    auto_assign_conversations: Optional[bool] = None
    max_conversations_per_agent: Optional[int] = Field(None, ge=1, le=100)


class DepartmentInDB(DepartmentBase):
    """Department from database"""
    id: UUID
    organization_id: UUID
    slug: str
    is_active: bool
    business_hours: Dict
    offline_message: Optional[str]
    routing_mode: str
    auto_assign_conversations: bool
    max_conversations_per_agent: int
    agent_ids: List[UUID]

    # Statistics
    total_agents: int
    total_conversations: int
    active_conversations: int
    queued_conversations: int

    # Performance Metrics
    average_response_time_seconds: Optional[int]
    average_resolution_time_seconds: Optional[int]
    customer_satisfaction_score: Optional[int]

    # Settings
    settings: Dict

    # Timestamps
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime]

    model_config = {"from_attributes": True}


class Department(DepartmentInDB):
    """Public department schema"""
    pass


class DepartmentWithStats(Department):
    """Department with additional statistics"""
    agents_online: int = 0
    agents_available: int = 0
    average_wait_time_seconds: Optional[int] = None
    is_within_business_hours: bool = True
