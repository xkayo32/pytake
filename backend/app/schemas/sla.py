"""
SLA Schemas for alerts and summaries
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SlaAlert(BaseModel):
    """Represents a conversation nearing or exceeding SLA"""

    conversation_id: UUID
    contact_id: UUID
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None

    queue_id: UUID
    queue_name: str

    sla_minutes: Optional[int] = None
    queued_at: Optional[datetime] = None

    waited_minutes: float = Field(0, description="Minutes already waited in queue")
    progress: float = Field(0, description="waited_minutes / sla_minutes; >=1 is over SLA")
    severity: str = Field('warning', description="warning | critical")
    priority: int = 0

    model_config = {"from_attributes": True}


class SlaSummary(BaseModel):
    """Summary counts for SLA alerts"""

    total_warning: int = 0
    total_critical: int = 0
    max_progress: float = 0.0
    last_updated_at: datetime = Field(default_factory=datetime.utcnow)
