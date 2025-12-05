"""
Department GraphQL Types
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

import strawberry


@strawberry.type
class DepartmentType:
    """Department type for GraphQL"""
    id: strawberry.ID
    organization_id: strawberry.ID
    name: str
    slug: str
    description: Optional[str] = None
    color: str
    icon: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


@strawberry.input
class DepartmentCreateInput:
    """Input for creating department"""
    name: str
    slug: str
    description: Optional[str] = None
    color: str = "#10B981"
    icon: Optional[str] = None


@strawberry.input
class DepartmentUpdateInput:
    """Input for updating department"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


@strawberry.type
class DepartmentStats:
    """Department statistics"""
    total_agents: int
    total_queues: int
    active_conversations: int
    completed_conversations: int
