"""
Message Schemas
"""

from datetime import datetime
from typing import Dict, Optional, Any
from uuid import UUID

from pydantic import BaseModel, Field


class MessageSendRequest(BaseModel):
    """Schema for sending a message"""
    message_type: str = Field(..., pattern="^(text|image|document|template|audio|video)$")
    content: Dict[str, Any] = Field(..., description="Message content based on type")

    # Examples:
    # text: {"text": "Hello!", "preview_url": false}
    # image: {"url": "https://...", "caption": "Caption"}
    # document: {"url": "https://...", "filename": "file.pdf", "caption": "Caption"}
    # template: {"name": "hello_world", "language": "pt_BR", "components": [...]}


class MessageResponse(BaseModel):
    """Schema for message response"""
    id: UUID
    conversation_id: UUID
    direction: str  # inbound, outbound
    sender_type: str  # contact, agent, bot, system
    message_type: str
    content: Dict[str, Any]
    status: str  # pending, sent, delivered, read, failed, received
    whatsapp_message_id: Optional[str] = None

    # Timestamps
    created_at: datetime
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None

    # Error info
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}
