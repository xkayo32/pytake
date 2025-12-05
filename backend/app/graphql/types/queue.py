"""
Queue GraphQL Types
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

import strawberry


@strawberry.type
class QueueType:
    """Queue type for GraphQL"""
    id: strawberry.ID
    organization_id: strawberry.ID
    department_id: strawberry.ID
    name: str
    slug: str
    description: Optional[str] = None
    color: str
    icon: Optional[str] = None
    is_active: bool
    priority: int
    sla_minutes: Optional[int] = None
    routing_mode: str
    auto_assign_conversations: bool
    max_conversations_per_agent: int
    created_at: datetime
    updated_at: datetime


@strawberry.input
class QueueCreateInput:
    """Input for creating queue"""
    department_id: strawberry.ID
    name: str
    slug: str
    description: Optional[str] = None
    color: str = "#10B981"
    icon: Optional[str] = None
    priority: int = 50
    sla_minutes: Optional[int] = None
    routing_mode: str = "round_robin"
    auto_assign_conversations: bool = True
    max_conversations_per_agent: int = 10


@strawberry.input
class QueueUpdateInput:
    """Input for updating queue"""
    name: Optional[str] = None
    description: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None
    priority: Optional[int] = None
    sla_minutes: Optional[int] = None
    routing_mode: Optional[str] = None
    auto_assign_conversations: Optional[bool] = None
    max_conversations_per_agent: Optional[int] = None


@strawberry.type
class QueueStats:
    """Queue statistics"""
    total_conversations: int
    active_conversations: int
    queued_conversations: int
    completed_conversations: int
    average_wait_time_seconds: Optional[int] = None
