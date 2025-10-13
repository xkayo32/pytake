"""
WhatsApp Number and Template Schemas
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============= Enums =============

class ConnectionType(str, Enum):
    """WhatsApp connection type"""
    OFFICIAL = "official"  # Meta Cloud API (Official)
    QRCODE = "qrcode"      # Evolution API (QR Code via Baileys)


# ============= WhatsApp Number Schemas =============

class WhatsAppNumberBase(BaseModel):
    phone_number: str = Field(..., min_length=10, max_length=20)
    display_name: Optional[str] = Field(None, max_length=255)


class WhatsAppNumberCreate(WhatsAppNumberBase):
    """Schema for registering a WhatsApp number"""
    connection_type: ConnectionType = Field(default=ConnectionType.OFFICIAL)

    # Meta Cloud API fields (Official)
    phone_number_id: Optional[str] = None
    whatsapp_business_account_id: Optional[str] = None
    access_token: Optional[str] = None
    app_secret: Optional[str] = None  # Meta App Secret for webhook signature verification
    webhook_url: Optional[str] = None
    webhook_verify_token: Optional[str] = None

    # Evolution API fields (QR Code)
    evolution_instance_name: Optional[str] = None  # Nome único da instância
    evolution_api_url: Optional[str] = None         # URL da Evolution API
    evolution_api_key: Optional[str] = None         # API Key global da Evolution


class WhatsAppNumberUpdate(BaseModel):
    """Schema for updating a WhatsApp number"""
    display_name: Optional[str] = Field(None, max_length=255)
    webhook_url: Optional[str] = None
    is_active: Optional[bool] = None
    away_message: Optional[str] = None
    default_chatbot_id: Optional[UUID] = None


class WhatsAppNumberInDB(WhatsAppNumberBase):
    id: UUID
    organization_id: UUID
    connection_type: ConnectionType = ConnectionType.OFFICIAL

    # Meta Cloud API fields (Official)
    whatsapp_business_account_id: Optional[str] = None
    phone_number_id: Optional[str] = None
    access_token: Optional[str] = None
    webhook_verify_token: Optional[str] = None
    verified: bool = False
    quality_rating: Optional[str] = None
    messaging_limit: Optional[str] = None

    # Evolution API fields (QR Code)
    evolution_instance_name: Optional[str] = None
    evolution_api_url: Optional[str] = None
    evolution_api_key: Optional[str] = None

    # Connection status
    status: str = "disconnected"
    connected_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None

    # Settings
    is_active: bool = True
    auto_reply_enabled: bool = False
    away_message: Optional[str] = None
    business_hours: Optional[Dict] = None

    # Routing
    default_department_id: Optional[UUID] = None
    default_chatbot_id: Optional[UUID] = None
    webhook_url: Optional[str] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WhatsAppNumber(WhatsAppNumberInDB):
    """Public WhatsApp number schema"""
    pass


class WhatsAppNumberWithStats(WhatsAppNumber):
    """WhatsApp number with statistics"""
    total_conversations: int = 0
    total_messages_sent: int = 0
    total_messages_received: int = 0


# ============= WhatsApp Template Schemas =============

class WhatsAppTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=512)
    category: str = Field(..., pattern="^(MARKETING|UTILITY|AUTHENTICATION)$")
    language: str = Field(default="pt_BR", max_length=10)


class WhatsAppTemplateCreate(WhatsAppTemplateBase):
    """Schema for creating a template"""
    whatsapp_number_id: UUID
    components: List[Dict] = Field(default_factory=list)


class WhatsAppTemplateUpdate(BaseModel):
    """Schema for updating a template"""
    components: Optional[List[Dict]] = None
    status: Optional[str] = None


class WhatsAppTemplateInDB(WhatsAppTemplateBase):
    id: UUID
    organization_id: UUID
    whatsapp_number_id: UUID
    template_id: Optional[str] = None

    status: str = "PENDING"
    components: List[Dict] = Field(default_factory=list)

    # Approval tracking
    rejected_reason: Optional[str] = None
    approved_at: Optional[datetime] = None

    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WhatsAppTemplate(WhatsAppTemplateInDB):
    """Public template schema"""
    pass


# ============= QR Code Schema =============

class QRCodeResponse(BaseModel):
    """QR Code for WhatsApp connection"""
    qr_code: str
    expires_at: datetime
