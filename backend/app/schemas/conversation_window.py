"""
Pydantic schemas for ConversationWindow - WhatsApp 24-hour message window.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.base import BaseSchema


class ConversationWindowBase(BaseSchema):
    """Base schema for ConversationWindow."""

    conversation_id: UUID = Field(..., description="ID of the conversation")
    started_at: Optional[datetime] = Field(None, description="When the 24h window started")
    ends_at: Optional[datetime] = Field(None, description="When the 24h window ends (started_at + 24h)")
    is_active: bool = Field(True, description="Whether the window is currently active")
    status: str = Field("active", description="Window status: active, expired, manually_extended, closed")
    close_reason: Optional[str] = Field(None, description="Reason for closing (if closed)")
    notes: Optional[str] = Field(None, description="Additional notes")


class ConversationWindowCreate(BaseModel):
    """Create a new conversation window."""

    conversation_id: UUID = Field(..., description="ID of the conversation")


class ConversationWindowUpdate(BaseModel):
    """Update a conversation window."""

    notes: Optional[str] = Field(None, description="Additional notes")


class ConversationWindowExtend(BaseModel):
    """Request to manually extend a conversation window."""

    hours: int = Field(24, ge=1, le=168, description="Number of hours to extend (1-168)")


class ConversationWindowResponse(ConversationWindowBase):
    """Response schema for a conversation window."""

    id: UUID = Field(..., description="Window ID")
    organization_id: UUID = Field(..., description="Organization ID")
    created_at: datetime = Field(..., description="When the window was created")
    updated_at: datetime = Field(..., description="When the window was last updated")
    
    # Computed properties
    is_within_window: bool = Field(..., description="Whether current time is within the window")
    hours_remaining: float = Field(..., description="Hours remaining in the window (0 if expired)")
    minutes_remaining: float = Field(..., description="Minutes remaining in the window (0 if expired)")
    time_until_expiry: dict = Field(..., description="Detailed time until expiry")

    class Config:
        from_attributes = True


class ConversationWindowStatusResponse(BaseSchema):
    """Response for window status check."""

    window_status: str = Field(..., description="Status: active, expired, unknown")
    is_within_window: bool = Field(..., description="Whether within 24h window")
    started_at: Optional[str] = Field(None, description="ISO format start time")
    ends_at: Optional[str] = Field(None, description="ISO format end time")
    hours_remaining: float = Field(..., description="Hours remaining (0 if expired)")
    minutes_remaining: float = Field(..., description="Minutes remaining (0 if expired)")
    time_until_expiry: dict = Field(..., description="Detailed time breakdown")
    window_id: Optional[str] = Field(None, description="Window ID")
    error: Optional[str] = Field(None, description="Error message if any")


class ConversationWindowListResponse(BaseSchema):
    """Response for listing conversation windows."""

    windows: list[ConversationWindowResponse] = Field(..., description="List of windows")
    total: int = Field(..., description="Total number of windows")
    skip: int = Field(..., description="Number of records skipped")
    limit: int = Field(..., description="Number of records returned")


class MessageValidationRequest(BaseSchema):
    """Request to validate a message against 24h window."""

    conversation_id: UUID = Field(..., description="ID of the conversation")
    is_template_message: bool = Field(False, description="Whether this is a template message")
    template_id: Optional[UUID] = Field(None, description="ID of the template (if template message)")


class MessageValidationResponse(BaseSchema):
    """Response from message validation."""

    is_valid: bool = Field(..., description="Whether message can be sent")
    reason: str = Field(..., description="Reason for validity/invalidity")
    window_status: str = Field(..., description="Current window status: active, expired, unknown")
    hours_remaining: float = Field(..., description="Hours remaining in window (0 if expired)")
    template_required: bool = Field(..., description="Whether template is required")
