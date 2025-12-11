"""
WhatsApp GraphQL Types
"""

from datetime import datetime
from typing import Optional, List

import strawberry


@strawberry.type
class WhatsAppNumberType:
    """WhatsApp number/connection type"""
    id: strawberry.ID
    organization_id: strawberry.ID
    phone_number: str
    display_name: Optional[str] = None
    is_active: bool
    status: str  # connecting, connected, disconnected
    created_at: datetime
    updated_at: datetime


@strawberry.input
class WhatsAppNumberCreateInput:
    """Input for creating WhatsApp connection"""
    phone_number: str
    display_name: Optional[str] = None


@strawberry.input
class WhatsAppNumberUpdateInput:
    """Input for updating WhatsApp connection"""
    display_name: Optional[str] = None
    is_active: Optional[bool] = None


@strawberry.type
class WhatsAppStats:
    """WhatsApp statistics"""
    total_messages_sent: int
    total_messages_received: int
    active_conversations: int
