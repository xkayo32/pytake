"""
Contact Schemas
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# Base Contact Schema
class ContactBase(BaseModel):
    name: Optional[str] = Field(None, max_length=255)
    email: Optional[str] = Field(None, max_length=255)
    phone_number: Optional[str] = Field(None, max_length=20)
    avatar_url: Optional[str] = None
    company: Optional[str] = Field(None, max_length=255)
    job_title: Optional[str] = Field(None, max_length=255)
    notes: Optional[str] = None


# Contact Create
class ContactCreate(ContactBase):
    whatsapp_id: str = Field(..., description="WhatsApp ID (phone number with country code)")

    @field_validator("whatsapp_id")
    @classmethod
    def validate_whatsapp_id(cls, v: str) -> str:
        """Validate WhatsApp ID format"""
        # Remove non-digits
        cleaned = ''.join(filter(str.isdigit, v))
        if len(cleaned) < 10:
            raise ValueError("WhatsApp ID must have at least 10 digits")
        return cleaned


# Contact Update
class ContactUpdate(ContactBase):
    lifecycle_stage: Optional[str] = Field(None, max_length=50)
    opt_in: Optional[bool] = None
    is_blocked: Optional[bool] = None
    blocked_reason: Optional[str] = None
    is_vip: Optional[bool] = None
    assigned_agent_id: Optional[UUID] = None
    assigned_department_id: Optional[UUID] = None


# Contact in DB
class ContactInDB(ContactBase):
    id: UUID
    organization_id: UUID
    whatsapp_id: str
    whatsapp_name: Optional[str] = None
    whatsapp_profile_pic: Optional[str] = None

    # Address
    address_street: Optional[str] = None
    address_city: Optional[str] = None
    address_state: Optional[str] = None
    address_country: Optional[str] = None
    address_postal_code: Optional[str] = None

    # Marketing
    source: Optional[str] = None
    lifecycle_stage: Optional[str] = None
    opt_in: bool = True
    opt_in_date: Optional[datetime] = None
    opt_out_date: Optional[datetime] = None

    # Blocking
    is_blocked: bool = False
    blocked_at: Optional[datetime] = None
    blocked_reason: Optional[str] = None

    # VIP Status
    is_vip: bool = False

    # Activity
    last_message_at: Optional[datetime] = None
    last_message_received_at: Optional[datetime] = None
    last_message_sent_at: Optional[datetime] = None

    # Counts
    total_messages_sent: int = 0
    total_messages_received: int = 0
    total_conversations: int = 0

    # Assignment
    assigned_agent_id: Optional[UUID] = None
    assigned_department_id: Optional[UUID] = None

    # Timestamps
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Contact Response
class Contact(ContactInDB):
    tags: List[str] = Field(default_factory=list, description="List of tag names")

    @classmethod
    def model_validate(cls, obj, **kwargs):
        """Custom validation to extract tag names from SQLAlchemy relationship"""
        if hasattr(obj, '__dict__'):
            # SQLAlchemy object
            data = {key: value for key, value in obj.__dict__.items() if not key.startswith('_')}
            if hasattr(obj, 'tags') and obj.tags:
                data['tags'] = [tag.name for tag in obj.tags]
            else:
                data['tags'] = []
            return super().model_validate(data, **kwargs)
        return super().model_validate(obj, **kwargs)


# Contact with Tags
class ContactWithTags(Contact):
    tag_names: List[str] = Field(default_factory=list)


# Contact Stats
class ContactStats(BaseModel):
    total_conversations: int = 0
    total_messages: int = 0
    avg_response_time_minutes: Optional[float] = None
    last_interaction: Optional[datetime] = None


# Tag Schema
class TagBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=50)
    color: Optional[str] = Field(None, pattern="^#[0-9A-Fa-f]{6}$")


class Tag(TagBase):
    id: UUID
    organization_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# Bulk Operations
class ContactBulkTag(BaseModel):
    contact_ids: List[UUID] = Field(..., min_items=1)
    tag_ids: List[UUID] = Field(..., min_items=1)


class ContactBulkUpdate(BaseModel):
    contact_ids: List[UUID] = Field(..., min_items=1)
    update_data: ContactUpdate
