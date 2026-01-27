"""
Conversation GraphQL Types
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

import strawberry


@strawberry.type
class ConversationType:
    """Conversation type for GraphQL"""
    id: strawberry.ID
    organization_id: strawberry.ID
    contact_id: strawberry.ID
    queue_id: Optional[strawberry.ID] = None
    assigned_agent_id: Optional[strawberry.ID] = None
    whatsapp_number_id: strawberry.ID
    status: str  # active, waiting, closed, etc.
    last_message_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


@strawberry.type
class MessageType:
    """Message type for GraphQL"""
    id: strawberry.ID
    conversation_id: strawberry.ID
    sender_type: str  # contact, agent, bot
    sender_id: Optional[strawberry.ID] = None
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    is_read: bool
    created_at: datetime


@strawberry.input
class ConversationFilterInput:
    """Filter for listing conversations"""
    status: Optional[str] = None
    queue_id: Optional[strawberry.ID] = None
    assigned_agent_id: Optional[strawberry.ID] = None
    contact_id: Optional[strawberry.ID] = None


@strawberry.input
class SendMessageInput:
    """Input for sending message"""
    conversation_id: strawberry.ID
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None


@strawberry.input
class AssignConversationInput:
    """Input for assigning conversation"""
    conversation_id: strawberry.ID
    agent_id: strawberry.ID
    queue_id: Optional[strawberry.ID] = None


@strawberry.type
class ConversationListResponse:
    """Paginated conversation list"""
    conversations: List["ConversationType"]
    total: int
    skip: int
    limit: int
