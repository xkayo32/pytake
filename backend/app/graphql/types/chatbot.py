"""
Chatbot GraphQL Types
"""

from datetime import datetime
from typing import Optional, List

import strawberry


@strawberry.type
class ChatbotType:
    """Chatbot type for GraphQL"""
    id: strawberry.ID
    organization_id: strawberry.ID
    name: str
    description: Optional[str] = None
    is_active: bool
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime


@strawberry.input
class ChatbotCreateInput:
    """Input for creating chatbot"""
    name: str
    description: Optional[str] = None
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None


@strawberry.input
class ChatbotUpdateInput:
    """Input for updating chatbot"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    greeting_message: Optional[str] = None
    fallback_message: Optional[str] = None


@strawberry.type
class FlowType:
    """Flow type (visual automation flow)"""
    id: strawberry.ID
    chatbot_id: strawberry.ID
    name: str
    description: Optional[str] = None
    is_active: bool
    trigger_type: str  # message, keyword, webhook, etc.
    created_at: datetime


@strawberry.type
class ChatbotStats:
    """Chatbot statistics"""
    total_conversations: int
    active_conversations: int
    total_messages_sent: int
    completion_rate: Optional[float] = None  # 0-100
