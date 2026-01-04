"""
WhatsApp Template Schemas
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


# ============= Component Schemas =============

class TemplateButtonSchema(BaseModel):
    """Template button schema"""
    type: str = Field(..., description="Button type: QUICK_REPLY, PHONE_NUMBER, URL")
    text: str = Field(..., max_length=25, description="Button text")
    phone_number: Optional[str] = Field(None, description="Phone number for PHONE_NUMBER type")
    url: Optional[str] = Field(None, description="URL for URL type")


class TemplateComponentSchema(BaseModel):
    """Template component schema (Header, Body, Footer, Buttons)"""
    type: str = Field(..., description="Component type: HEADER, BODY, FOOTER, BUTTONS")
    format: Optional[str] = Field(None, description="Format for HEADER: TEXT, IMAGE, VIDEO, DOCUMENT")
    text: Optional[str] = Field(None, description="Text content")
    buttons: Optional[List[TemplateButtonSchema]] = Field(None, description="Buttons for BUTTONS component")

    @field_validator("type")
    @classmethod
    def validate_type(cls, v):
        allowed = ["HEADER", "BODY", "FOOTER", "BUTTONS"]
        if v not in allowed:
            raise ValueError(f"type must be one of {allowed}")
        return v

    @field_validator("format")
    @classmethod
    def validate_format(cls, v):
        if v is not None:
            allowed = ["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]
            if v not in allowed:
                raise ValueError(f"format must be one of {allowed}")
        return v


# ============= Request Schemas =============

class TemplateCreateRequest(BaseModel):
    """Request schema for creating a template"""
    name: str = Field(..., min_length=1, max_length=512, description="Template name (lowercase, underscores, no spaces)")
    language: str = Field("pt_BR", description="Language code (pt_BR, en_US, es, etc)")
    category: str = Field(..., description="Category: MARKETING, UTILITY, AUTHENTICATION")
    components: List[TemplateComponentSchema] = Field(..., description="Template components")

    @field_validator("name")
    @classmethod
    def validate_name(cls, v):
        """Template names must be lowercase with underscores"""
        if not v.replace("_", "").isalnum():
            raise ValueError("Template name must contain only lowercase letters, numbers, and underscores")
        if v != v.lower():
            raise ValueError("Template name must be lowercase")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v):
        allowed = ["MARKETING", "UTILITY", "AUTHENTICATION"]
        if v not in allowed:
            raise ValueError(f"category must be one of {allowed}")
        return v


class TemplateUpdateRequest(BaseModel):
    """Request schema for updating a template (only local fields)"""
    is_enabled: Optional[bool] = Field(None, description="Enable/disable template")


# ============= Response Schemas =============

class TemplateResponse(BaseModel):
    """Response schema for a template"""
    id: UUID
    organization_id: UUID
    whatsapp_number_id: UUID
    meta_template_id: Optional[str] = None
    name: str
    language: str
    category: str
    # DEPRECATED: Meta no longer returns suggested_category as of April 2025
    suggested_category: Optional[str] = None
    status: str
    rejected_reason: Optional[str] = None

    # Content
    header_type: Optional[str] = None
    header_text: Optional[str] = None
    header_variables_count: int = 0
    body_text: str
    body_variables_count: int = 0
    footer_text: Optional[str] = None
    buttons: List[Dict[str, Any]] = []

    # Stats
    sent_count: int = 0
    delivered_count: int = 0
    read_count: int = 0
    failed_count: int = 0

    # Flags
    is_system_template: bool = False
    is_enabled: bool = True

    # Timestamps
    created_at: datetime
    updated_at: datetime
    approved_at: Optional[datetime] = None
    rejected_at: Optional[datetime] = None

    # AI Analysis (optional)
    ai_analysis_score: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Score da análise de IA (0-100). < 60 = crítico, 60-80 = atenção, > 80 = bom"
    )
    ai_suggested_category: Optional[str] = Field(
        None,
        description="Categoria sugerida pela IA (MARKETING, UTILITY, AUTHENTICATION)"
    )
    ai_analyzed_at: Optional[datetime] = Field(
        None,
        description="Data/hora quando foi analisado pela IA"
    )

    class Config:
        from_attributes = True


class TemplateListResponse(BaseModel):
    """Response schema for list of templates"""
    templates: List[TemplateResponse]
    total: int


# ============= Sync Schema =============

class TemplateSyncRequest(BaseModel):
    """Request to sync templates from Meta"""
    force: bool = Field(False, description="Force sync even if recently synced")


class TemplateSyncResponse(BaseModel):
    """Response from sync operation"""
    synced: int
    created: int
    updated: int
    deleted: int
    errors: List[str] = []
