"""
Organization Schemas
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# Base Organization Schema
class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Organization name")
    slug: Optional[str] = Field(None, pattern="^[a-z0-9-]+$", description="URL-friendly slug")
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


# Organization Create
class OrganizationCreate(OrganizationBase):
    pass


# Organization Update
class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


# Organization in DB
class OrganizationInDB(OrganizationBase):
    id: UUID
    is_active: bool
    plan_type: str
    plan_limits: Optional[dict] = None
    plan_usage: Optional[dict] = None
    trial_ends_at: Optional[datetime] = None
    subscription_starts_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# Organization Response
class Organization(OrganizationInDB):
    pass


# Organization with Stats
class OrganizationWithStats(Organization):
    stats: dict = Field(default_factory=dict)

    @field_validator("stats", mode="before")
    @classmethod
    def set_default_stats(cls, v):
        if v is None:
            return {
                "total_users": 0,
                "total_contacts": 0,
                "total_conversations": 0,
                "total_messages": 0,
                "total_whatsapp_numbers": 0,
                "total_chatbots": 0,
            }
        return v


# Organization Settings Update
class OrganizationSettingsUpdate(BaseModel):
    business_hours: Optional[dict] = None
    timezone: Optional[str] = None
    language: Optional[str] = None
    currency: Optional[str] = None
    notification_settings: Optional[dict] = None
    security_settings: Optional[dict] = None


# Organization Plan Update
class OrganizationPlanUpdate(BaseModel):
    plan_type: str = Field(..., pattern="^(free|starter|professional|enterprise)$")
    subscription_starts_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
