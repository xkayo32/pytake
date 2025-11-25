"""
Pydantic schemas for notification endpoints and requests
"""

from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List, Any
from enum import Enum


class NotificationChannelEnum(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    WEBSOCKET = "websocket"
    IN_APP = "in_app"


class NotificationTypeEnum(str, Enum):
    CONVERSATION_ASSIGNED = "conversation_assigned"
    SLA_WARNING = "sla_warning"
    CAMPAIGN_FAILED = "campaign_failed"
    NEW_CONTACT = "new_contact"
    CONVERSATION_CLOSED = "conversation_closed"
    AGENT_OFFLINE = "agent_offline"
    CUSTOM = "custom"


class NotificationPreferenceResponse(BaseModel):
    """Response model for notification preferences"""
    id: int
    user_id: str
    organization_id: str
    email_enabled: bool
    sms_enabled: bool
    whatsapp_enabled: bool
    websocket_enabled: bool
    in_app_enabled: bool
    quiet_hours_start: Optional[str]
    quiet_hours_end: Optional[str]
    quiet_hours_enabled: bool
    max_emails_per_hour: int
    max_sms_per_hour: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


class NotificationPreferenceUpdate(BaseModel):
    """Request model for updating notification preferences"""
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    websocket_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_enabled: Optional[bool] = None
    max_emails_per_hour: Optional[int] = Field(None, ge=1, le=100)
    max_sms_per_hour: Optional[int] = Field(None, ge=1, le=50)


class NotificationLogResponse(BaseModel):
    """Response model for notification logs"""
    id: int
    organization_id: str
    user_id: str
    notification_type: str
    channel: str
    subject: Optional[str]
    message: str
    recipient: str
    status: str
    error_message: Optional[str]
    sent_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    notification_metadata: Optional[dict]
    retry_count: int
    
    class Config:
        from_attributes = True


class NotificationLogFilter(BaseModel):
    """Filter parameters for notification logs"""
    organization_id: str
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=100)
    status: Optional[str] = None
    channel: Optional[str] = None
    user_id: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class SendTestEmailRequest(BaseModel):
    """Request to send test email"""
    to_email: Optional[str] = None  # If not provided, uses current user email


class SendTestEmailResponse(BaseModel):
    """Response for test email"""
    message: str
    task_id: Optional[str] = None


class NotificationCreate(BaseModel):
    """Request model for creating a notification"""
    user_id: str
    organization_id: str
    notification_type: NotificationTypeEnum
    channel: NotificationChannelEnum
    subject: Optional[str] = None
    message: str
    recipient: str
    notification_metadata: Optional[dict] = None


class BatchNotificationRequest(BaseModel):
    """Request for sending batch notifications"""
    organization_id: str
    notifications: List[NotificationCreate]
