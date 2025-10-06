"""
Campaign schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# CAMPAIGN SCHEMAS
# ============================================

class CampaignBase(BaseModel):
    """Base schema for Campaign"""

    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    campaign_type: str = Field(default="broadcast", description="broadcast, drip, trigger")
    whatsapp_number_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    message_type: str = Field(default="text")
    message_content: dict = Field(default_factory=dict)
    template_variables: dict = Field(default_factory=dict)
    audience_type: str = Field(default="all_contacts", description="all_contacts, segment, tags, custom_list")
    target_tag_ids: List[UUID] = Field(default_factory=list)
    target_contact_ids: List[UUID] = Field(default_factory=list)
    segment_filters: dict = Field(default_factory=dict)
    messages_per_hour: int = Field(default=100, ge=1, le=1000)
    delay_between_messages_seconds: int = Field(default=2, ge=0, le=60)
    respect_opt_out: bool = True
    skip_active_conversations: bool = False
    scheduled_at: Optional[datetime] = None
    settings: dict = Field(default_factory=dict)


class CampaignCreate(CampaignBase):
    """Schema for creating a campaign"""
    pass


class CampaignUpdate(BaseModel):
    """Schema for updating a campaign"""

    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    campaign_type: Optional[str] = None
    whatsapp_number_id: Optional[UUID] = None
    template_id: Optional[UUID] = None
    message_type: Optional[str] = None
    message_content: Optional[dict] = None
    template_variables: Optional[dict] = None
    audience_type: Optional[str] = None
    target_tag_ids: Optional[List[UUID]] = None
    target_contact_ids: Optional[List[UUID]] = None
    segment_filters: Optional[dict] = None
    messages_per_hour: Optional[int] = Field(None, ge=1, le=1000)
    delay_between_messages_seconds: Optional[int] = Field(None, ge=0, le=60)
    respect_opt_out: Optional[bool] = None
    skip_active_conversations: Optional[bool] = None
    scheduled_at: Optional[datetime] = None
    settings: Optional[dict] = None


class CampaignInDB(CampaignBase):
    """Schema for campaign in database"""

    id: UUID
    organization_id: UUID
    created_by_user_id: Optional[UUID] = None
    status: str = "draft"
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    paused_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    total_recipients: int = 0
    messages_sent: int = 0
    messages_delivered: int = 0
    messages_read: int = 0
    messages_failed: int = 0
    messages_pending: int = 0
    replies_count: int = 0
    unique_replies_count: int = 0
    opt_outs_count: int = 0
    delivery_rate: Optional[float] = None
    read_rate: Optional[float] = None
    reply_rate: Optional[float] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    error_count: int = 0
    last_error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class CampaignStats(BaseModel):
    """Campaign statistics"""

    total_recipients: int
    messages_sent: int
    messages_delivered: int
    messages_read: int
    messages_failed: int
    messages_pending: int
    replies_count: int
    unique_replies_count: int
    opt_outs_count: int
    delivery_rate: float
    read_rate: float
    reply_rate: float
    progress_percentage: float
    success_rate: float


class CampaignProgress(BaseModel):
    """Campaign progress details"""

    status: str
    total_recipients: int
    messages_sent: int
    messages_pending: int
    messages_failed: int
    progress_percentage: float
    estimated_completion_time: Optional[datetime] = None


# ============================================
# AUDIENCE PREVIEW
# ============================================

class AudiencePreview(BaseModel):
    """Preview of campaign audience"""

    total_contacts: int
    sample_contacts: List[dict] = Field(default_factory=list)
    filters_applied: dict = Field(default_factory=dict)


# ============================================
# RESPONSE SCHEMAS
# ============================================

class CampaignListResponse(BaseModel):
    """Response for campaign list"""

    total: int
    items: List[CampaignInDB]


class CampaignScheduleResponse(BaseModel):
    """Response for schedule action"""

    campaign_id: UUID
    scheduled_at: datetime
    total_recipients: int
    estimated_cost: Optional[float] = None
    message: str


class CampaignStartResponse(BaseModel):
    """Response for start action"""

    campaign_id: UUID
    status: str
    started_at: datetime
    total_recipients: int
    message: str
