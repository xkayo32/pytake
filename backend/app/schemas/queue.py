"""
Queue schemas for request/response validation
"""

from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


# ============================================
# BASE SCHEMAS
# ============================================


class QueueBase(BaseModel):
    """Base Queue schema with common fields"""

    name: str = Field(..., min_length=1, max_length=255, description="Queue name")
    slug: str = Field(..., min_length=1, max_length=100, description="URL-friendly slug")
    description: Optional[str] = Field(None, description="Queue description")
    color: str = Field("#10B981", pattern="^#[0-9A-Fa-f]{6}$", description="Hex color")
    icon: Optional[str] = Field(None, max_length=50, description="Icon identifier")
    is_active: bool = Field(True, description="Is queue active")
    priority: int = Field(50, ge=0, le=100, description="Queue priority (0-100)")
    sla_minutes: Optional[int] = Field(
        None, ge=1, description="SLA in minutes (max wait time)"
    )
    routing_mode: str = Field(
        "round_robin",
        description="Routing mode (round_robin, load_balance, manual, skills_based)",
    )
    auto_assign_conversations: bool = Field(
        True, description="Auto-assign conversations to agents"
    )
    max_conversations_per_agent: int = Field(
        10, ge=1, le=100, description="Max concurrent conversations per agent"
    )
    max_queue_size: Optional[int] = Field(
        None, ge=1, description="Maximum queue size before overflow (optional)"
    )
    overflow_queue_id: Optional[UUID] = Field(
        None, description="Queue to redirect to when max_queue_size is reached"
    )
    settings: Dict[str, Any] = Field(
        default_factory=dict, description="Additional settings (JSONB)"
    )


# ============================================
# CREATE SCHEMAS
# ============================================


class QueueCreate(QueueBase):
    """Schema for creating a new queue"""

    department_id: UUID = Field(..., description="Parent department ID")


# ============================================
# UPDATE SCHEMAS
# ============================================


class QueueUpdate(BaseModel):
    """Schema for updating a queue (all fields optional)"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = Field(None, max_length=50)
    is_active: Optional[bool] = None
    priority: Optional[int] = Field(None, ge=0, le=100)
    sla_minutes: Optional[int] = Field(None, ge=1)
    routing_mode: Optional[str] = None
    auto_assign_conversations: Optional[bool] = None
    max_conversations_per_agent: Optional[int] = Field(None, ge=1, le=100)
    settings: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(extra="forbid")


# ============================================
# RESPONSE SCHEMAS
# ============================================


class Queue(QueueBase):
    """Complete Queue schema for API responses"""

    id: UUID
    organization_id: UUID
    department_id: UUID

    # Statistics
    total_conversations: int = 0
    active_conversations: int = 0
    queued_conversations: int = 0
    completed_conversations: int = 0

    # Metrics
    average_wait_time_seconds: Optional[int] = None
    average_response_time_seconds: Optional[int] = None
    average_resolution_time_seconds: Optional[int] = None
    customer_satisfaction_score: Optional[int] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class QueueWithStats(Queue):
    """Queue with additional computed statistics"""

    # Computed fields
    is_overloaded: bool = Field(False, description="Queue is overloaded")
    has_capacity: bool = Field(True, description="Queue has capacity")
    average_wait_time_minutes: Optional[float] = Field(
        None, description="Average wait time in minutes"
    )
    sla_compliance_rate: Optional[float] = Field(
        None, ge=0, le=100, description="SLA compliance rate (%)"
    )


# ============================================
# BULK OPERATIONS
# ============================================


class QueueBulkDelete(BaseModel):
    """Schema for bulk deleting queues"""

    queue_ids: list[UUID] = Field(..., min_length=1, max_length=100)


class QueueReorder(BaseModel):
    """Schema for reordering queues (changing priority)"""

    queue_id: UUID
    new_priority: int = Field(..., ge=0, le=100)


class QueueBulkReorder(BaseModel):
    """Schema for bulk reordering queues"""

    reorders: list[QueueReorder] = Field(..., min_length=1, max_length=50)


# ============================================
# METRICS SCHEMAS
# ============================================


class QueueVolumeMetrics(BaseModel):
    """Volume metrics by hour"""

    hour: int = Field(..., ge=0, le=23, description="Hour of day (0-23)")
    count: int = Field(..., ge=0, description="Number of conversations")


class QueueMetrics(BaseModel):
    """Detailed queue metrics for analytics"""

    queue_id: UUID
    queue_name: str
    
    # Volume metrics
    total_conversations: int = Field(0, description="Total conversations (all time)")
    conversations_today: int = Field(0, description="Conversations today")
    conversations_last_7_days: int = Field(0, description="Conversations last 7 days")
    conversations_last_30_days: int = Field(0, description="Conversations last 30 days")
    
    # Current status
    queued_conversations: int = Field(0, description="Currently in queue")
    active_conversations: int = Field(0, description="Currently being handled")
    
    # Time metrics (in seconds)
    average_wait_time_seconds: Optional[float] = Field(None, description="Avg time in queue")
    average_response_time_seconds: Optional[float] = Field(None, description="Avg first response time")
    average_resolution_time_seconds: Optional[float] = Field(None, description="Avg resolution time")
    median_wait_time_seconds: Optional[float] = Field(None, description="Median time in queue")
    
    # SLA metrics
    sla_minutes: Optional[int] = Field(None, description="Configured SLA in minutes")
    sla_compliance_rate: Optional[float] = Field(None, ge=0, le=100, description="% within SLA")
    sla_violations: int = Field(0, description="Number of SLA violations")
    
    # Quality metrics
    customer_satisfaction_score: Optional[float] = Field(None, ge=0, le=100, description="CSAT score")
    resolution_rate: Optional[float] = Field(None, ge=0, le=100, description="% resolved conversations")
    
    # Volume by hour (last 24h)
    volume_by_hour: list[QueueVolumeMetrics] = Field(default_factory=list, description="24h volume distribution")
    
    # Period
    period_start: datetime = Field(..., description="Metrics period start")
    period_end: datetime = Field(..., description="Metrics period end")
    
    model_config = ConfigDict(from_attributes=True)
