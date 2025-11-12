"""
Conversation and Message Schemas
"""

from datetime import datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============= Message Schemas =============

class MessageBase(BaseModel):
    content: str = Field(..., min_length=1, description="Message content")
    media_url: Optional[str] = None
    media_type: Optional[str] = Field(None, pattern="^(image|video|audio|document)$")
    media_caption: Optional[str] = None


class MessageCreate(MessageBase):
    """Schema for sending a message"""
    pass


class MessageInDB(MessageBase):
    id: UUID
    conversation_id: UUID
    contact_id: UUID
    organization_id: UUID
    whatsapp_number_id: UUID

    # Message metadata
    direction: str  # inbound, outbound
    status: str  # pending, sent, delivered, read, failed
    message_type: str  # text, image, video, audio, document, template, interactive
    whatsapp_message_id: Optional[str] = None

    # Sender info
    sender_id: Optional[UUID] = None  # User who sent (if outbound)
    sender_name: Optional[str] = None

    # Error handling
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # Timing
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None

    # Extra data
    extra_data: Optional[Dict] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Message(MessageInDB):
    """Public message schema"""
    pass


class MessageWithContact(Message):
    """Message with contact info"""
    contact_name: Optional[str] = None
    contact_whatsapp_id: Optional[str] = None


# ============= Conversation Schemas =============

class ConversationBase(BaseModel):
    pass


class ConversationCreate(BaseModel):
    """Schema for creating a conversation"""
    contact_id: UUID
    whatsapp_number_id: UUID
    initial_message: Optional[MessageCreate] = None


class ConversationUpdate(BaseModel):
    """Schema for updating a conversation"""
    status: Optional[str] = Field(None, pattern="^(open|pending|resolved|closed)$")
    assigned_agent_id: Optional[UUID] = None
    assigned_department_id: Optional[UUID] = None
    priority: Optional[str] = Field(None, pattern="^(low|medium|high|urgent)$")
    tags: Optional[List[str]] = None


# ============= Action Schemas =============

class ConversationAssign(BaseModel):
    """Schema for assigning conversation to agent"""
    agent_id: UUID = Field(..., description="Agent ID to assign conversation to")


class ConversationTransfer(BaseModel):
    """Schema for transferring conversation to department"""
    department_id: UUID = Field(..., description="Department ID to transfer conversation to")
    note: Optional[str] = Field(None, max_length=500, description="Optional transfer note")


class ConversationClose(BaseModel):
    """Schema for closing a conversation"""
    reason: Optional[str] = Field(None, max_length=500, description="Reason for closing")
    resolved: bool = Field(True, description="Mark as resolved")


class ConversationInDB(ConversationBase):
    id: UUID
    organization_id: UUID
    contact_id: UUID
    whatsapp_number_id: UUID

    # Status and assignment
    status: str  # open, pending, resolved, closed
    assigned_agent_id: Optional[UUID] = None
    assigned_department_id: Optional[UUID] = None
    priority: Optional[str] = None  # low, medium, high, urgent

    # Tracking
    last_message_at: Optional[datetime] = None
    last_inbound_at: Optional[datetime] = None
    last_outbound_at: Optional[datetime] = None
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None

    # Counts
    total_messages: int = 0
    unread_count: int = 0

    # Metrics
    response_time_seconds: Optional[int] = None
    resolution_time_seconds: Optional[int] = None

    # Channel
    channel: str = "whatsapp"

    # Extra data
    extra_data: Optional[Dict] = None
    tags: Optional[List[str]] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class Conversation(ConversationInDB):
    """Public conversation schema"""
    pass


class ConversationWithContact(Conversation):
    """Conversation with contact details"""
    contact_name: Optional[str] = None
    contact_whatsapp_id: Optional[str] = None
    contact_avatar_url: Optional[str] = None


class ConversationWithMessages(ConversationWithContact):
    """Conversation with messages"""
    messages: List[Message] = Field(default_factory=list)
    last_message: Optional[Message] = None


class ConversationStats(BaseModel):
    """Conversation statistics"""
    total_conversations: int = 0
    open_conversations: int = 0
    pending_conversations: int = 0
    resolved_conversations: int = 0
    closed_conversations: int = 0
    avg_response_time_minutes: Optional[float] = None
    avg_resolution_time_hours: Optional[float] = None


# ============= Bulk Operations =============

class ConversationBulkAssign(BaseModel):
    """Bulk assign conversations"""
    conversation_ids: List[UUID] = Field(..., min_items=1)
    assigned_agent_id: Optional[UUID] = None
    assigned_department_id: Optional[UUID] = None


class ConversationBulkUpdateStatus(BaseModel):
    """Bulk update conversation status"""
    conversation_ids: List[UUID] = Field(..., min_items=1)
    status: str = Field(..., pattern="^(open|pending|resolved|closed)$")
