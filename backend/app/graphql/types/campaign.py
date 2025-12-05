"""
Campaign GraphQL Types
"""

from datetime import datetime
from typing import Optional, List

import strawberry


@strawberry.type
class CampaignType:
    """Campaign type for GraphQL"""
    id: strawberry.ID
    organization_id: strawberry.ID
    name: str
    description: Optional[str] = None
    message_template: str
    status: str  # draft, scheduled, running, completed, cancelled
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    target_count: int
    sent_count: int
    delivered_count: int
    failed_count: int
    created_at: datetime
    updated_at: datetime


@strawberry.input
class CampaignCreateInput:
    """Input for creating campaign"""
    name: str
    description: Optional[str] = None
    message_template: str
    scheduled_at: Optional[datetime] = None


@strawberry.input
class CampaignUpdateInput:
    """Input for updating campaign"""
    name: Optional[str] = None
    description: Optional[str] = None
    message_template: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None


@strawberry.type
class CampaignStats:
    """Campaign statistics"""
    total_campaigns: int
    active_campaigns: int
    total_messages_sent: int
    average_delivery_rate: Optional[float] = None  # 0-100
