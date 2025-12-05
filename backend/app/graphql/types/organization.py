"""
Organization GraphQL Types
"""

from datetime import datetime
from typing import Optional, Dict, Any
from uuid import UUID

import strawberry

from app.graphql.types.common import TimestampFields


@strawberry.type
class OrganizationType:
    """Organization type for GraphQL"""
    id: strawberry.ID
    name: str
    slug: str
    is_active: bool

    # Subscription & Plan
    plan_tier: Optional[str] = None
    max_users: Optional[int] = None
    max_contacts: Optional[int] = None
    max_conversations_per_month: Optional[int] = None
    max_whatsapp_numbers: Optional[int] = None

    # Features
    features_enabled: Optional[str] = None  # JSON string

    # Contact info
    phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None

    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime
    deleted_at: Optional[datetime] = None


@strawberry.input
class OrganizationCreateInput:
    """Input for creating organization"""
    name: str
    slug: str
    phone: Optional[str] = None
    website: Optional[str] = None
    plan_tier: Optional[str] = "free"


@strawberry.input
class OrganizationUpdateInput:
    """Input for updating organization"""
    name: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postal_code: Optional[str] = None


@strawberry.input
class OrganizationSettingsInput:
    """Input for updating organization settings"""
    plan_tier: Optional[str] = None
    max_users: Optional[int] = None
    max_contacts: Optional[int] = None
    max_conversations_per_month: Optional[int] = None
    max_whatsapp_numbers: Optional[int] = None
    features_enabled: Optional[str] = None  # JSON string


@strawberry.type
class OrganizationStats:
    """Organization statistics"""
    total_users: int
    active_users: int
    total_contacts: int
    total_conversations: int
    total_whatsapp_numbers: int
    conversations_this_month: int
