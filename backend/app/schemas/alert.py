"""
Alert schemas - Pydantic models for request/response validation
"""

from typing import Optional, List
from uuid import UUID
from datetime import datetime

from pydantic import BaseModel, Field

from app.models.alert import AlertType, AlertSeverity, AlertStatus


class AlertMetadata(BaseModel):
    """Metadata for alert context"""
    quality_score_before: Optional[str] = None
    quality_score_after: Optional[str] = None
    failure_count: Optional[int] = None
    sent_count: Optional[int] = None
    failure_rate: Optional[float] = None
    rejection_reason: Optional[str] = None
    previous_alert_id: Optional[str] = None

    class Config:
        extra = "allow"  # Allow additional fields


class AlertBase(BaseModel):
    """Base alert schema"""
    alert_type: AlertType
    severity: AlertSeverity
    title: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None


class AlertCreate(AlertBase):
    """Create alert request"""
    whatsapp_template_id: UUID
    metadata: Optional[AlertMetadata] = None


class AlertAcknowledge(BaseModel):
    """Acknowledge alert request"""
    notes: Optional[str] = Field(None, max_length=500)


class AlertEscalate(BaseModel):
    """Escalate alert request"""
    to_admin: bool = Field(default=False, description="Escalate directly to admin")


class AlertResolve(BaseModel):
    """Resolve alert request"""
    reason: Optional[str] = Field(None, max_length=500)


class AlertResponse(AlertBase):
    """Alert response schema"""
    id: UUID
    organization_id: UUID
    whatsapp_template_id: UUID
    status: AlertStatus
    escalation_level: int
    escalated_to_admin: bool
    acknowledged_by_user_id: Optional[UUID] = None
    acknowledged_at: Optional[datetime] = None
    acknowledgment_notes: Optional[str] = None
    escalated_at: Optional[datetime] = None
    auto_resolved: bool
    auto_resolved_at: Optional[datetime] = None
    auto_resolved_reason: Optional[str] = None
    notification_sent: bool
    notification_sent_at: Optional[datetime] = None
    alert_metadata: Optional[dict] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AlertListResponse(BaseModel):
    """Alert list response"""
    data: List[AlertResponse]
    total: int
    skip: int
    limit: int


class AlertSummary(BaseModel):
    """Alert summary statistics"""
    total_open: int
    critical_count: int
    warning_count: int
    escalated_count: int
    unacknowledged_count: int


class CriticalAlertsResponse(BaseModel):
    """Critical alerts response"""
    data: List[AlertResponse]
    summary: AlertSummary
