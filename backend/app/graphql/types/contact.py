"""
Contact GraphQL Types
"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

import strawberry


@strawberry.type
class ContactType:
    """Contact type for GraphQL"""
    id: strawberry.ID
    organization_id: strawberry.ID
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    is_blocked: bool
    last_contact_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


@strawberry.input
class ContactCreateInput:
    """Input for creating contact"""
    phone: str
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None


@strawberry.input
class ContactUpdateInput:
    """Input for updating contact"""
    name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    is_blocked: Optional[bool] = None


@strawberry.input
class ContactFilterInput:
    """Filter for listing contacts"""
    query: Optional[str] = None  # Search by name, phone, email
    is_blocked: Optional[bool] = None


@strawberry.type
class ContactListResponse:
    """Paginated contact list"""
    contacts: List["ContactType"]
    total: int
    skip: int
    limit: int
