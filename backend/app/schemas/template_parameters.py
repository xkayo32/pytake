"""
Pydantic schemas for template parameter validation and support.

Supports both POSITIONAL ({{1}}, {{2}}) and NAMED ({{name}}) parameter formats
with proper validation and conversion logic.
"""

from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator
import re


class TemplateParameterVariable(BaseModel):
    """Represents a single variable/parameter in a template"""
    
    name: str = Field(..., description="Variable name (e.g., '1' for {{1}} or 'nome_cliente' for {{{{nome_cliente}}}}")
    type: Literal["text", "currency", "date_time"] = Field(default="text", description="Parameter type")
    example: Optional[str] = Field(None, description="Example value for preview")


class TemplateComponentBase(BaseModel):
    """Base template component schema"""
    
    type: Literal["HEADER", "BODY", "FOOTER", "BUTTONS"] = Field(..., description="Component type")
    text: Optional[str] = Field(None, description="Component text content")
    format: Optional[Literal["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]] = Field(None, description="Header format if type=HEADER")


class TemplateParameterFormatValidator(BaseModel):
    """Validator for template parameter format consistency"""
    
    parameter_format: Literal["POSITIONAL", "NAMED"] = Field(..., description="POSITIONAL: {{1}}, {{2}} | NAMED: {{name}}")
    text_content: str = Field(..., description="Template text to validate")
    named_variables: Optional[List[TemplateParameterVariable]] = Field(
        None, 
        description="List of named variables (required if parameter_format=NAMED)"
    )
    
    @field_validator("text_content")
    @classmethod
    def validate_text_not_empty(cls, v):
        """Ensure text content is not empty"""
        if not v or not v.strip():
            raise ValueError("Text content cannot be empty")
        return v
    
    @model_validator(mode="after")
    def validate_format_consistency(self) -> "TemplateParameterFormatValidator":
        """Validate that parameter format matches the variables used in text"""
        
        # Extract all variables from text
        # Matches {{1}}, {{2}}, {{name}}, etc.
        pattern = r"\{\{(\w+)\}\}"
        found_vars = re.findall(pattern, self.text_content)
        
        if not found_vars:
            # No variables found
            if self.parameter_format == "NAMED" and self.named_variables:
                raise ValueError("Text contains no variables but named_variables provided")
            return self
        
        # Check if all variables are numeric (POSITIONAL) or text (NAMED)
        all_numeric = all(var.isdigit() for var in found_vars)
        has_non_numeric = any(not var.isdigit() for var in found_vars)
        
        if all_numeric and self.parameter_format == "NAMED":
            raise ValueError(
                f"Text uses POSITIONAL variables {found_vars} but parameter_format is NAMED. "
                "Use {{{{name}}}} format instead."
            )
        
        if has_non_numeric and self.parameter_format == "POSITIONAL":
            raise ValueError(
                f"Text uses NAMED variables {found_vars} but parameter_format is POSITIONAL. "
                "Use {{{{1}}}}, {{{{2}}}} format instead."
            )
        
        # If NAMED format, validate named_variables provided
        if self.parameter_format == "NAMED":
            if not self.named_variables:
                raise ValueError("NAMED parameter format requires named_variables list")
            
            provided_names = {v.name for v in self.named_variables}
            found_names = set(found_vars)
            
            if found_names != provided_names:
                missing = found_names - provided_names
                extra = provided_names - found_names
                error_parts = []
                if missing:
                    error_parts.append(f"Missing: {missing}")
                if extra:
                    error_parts.append(f"Extra: {extra}")
                raise ValueError(
                    f"Named variables mismatch. {', '.join(error_parts)}"
                )
        
        return self


class TemplateCreateRequest(BaseModel):
    """Request to create a new template"""
    
    name: str = Field(..., min_length=1, max_length=512, description="Template name (slug format)")
    category: Literal["UTILITY", "AUTHENTICATION", "MARKETING"] = Field(..., description="Template category for pricing")
    language: str = Field(default="pt_BR", description="Language code (e.g., pt_BR, en_US)")
    parameter_format: Literal["POSITIONAL", "NAMED"] = Field(
        default="POSITIONAL",
        description="POSITIONAL: {{1}}, {{2}} | NAMED: {{name}}"
    )
    
    # Component texts
    body_text: str = Field(..., min_length=1, max_length=1024, description="Template body (required)")
    header_text: Optional[str] = Field(None, max_length=1024, description="Template header (optional)")
    header_format: Optional[Literal["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]] = Field(None, description="Header format if header_text provided")
    footer_text: Optional[str] = Field(None, max_length=60, description="Template footer (optional, max 60 chars)")
    
    # Named variables (required if parameter_format=NAMED)
    named_variables: Optional[List[TemplateParameterVariable]] = Field(
        None,
        description="List of named variables (required if parameter_format=NAMED)"
    )
    
    # Buttons (optional)
    buttons: Optional[List[Dict[str, Any]]] = Field(None, description="Quick reply or call-to-action buttons")
    
    @model_validator(mode="after")
    def validate_template_format(self) -> "TemplateCreateRequest":
        """Validate template parameter format consistency"""
        
        # Validate body text
        validator = TemplateParameterFormatValidator(
            parameter_format=self.parameter_format,
            text_content=self.body_text,
            named_variables=self.named_variables
        )
        
        # Validate header if provided
        if self.header_text:
            header_validator = TemplateParameterFormatValidator(
                parameter_format=self.parameter_format,
                text_content=self.header_text,
                named_variables=self.named_variables
            )
        
        return self


class TemplateUpdateRequest(BaseModel):
    """Request to update an existing template (limited fields only)"""
    
    is_enabled: Optional[bool] = Field(None, description="Enable/disable template")
    # Note: Cannot edit template content after submission, only status can change


class TemplateResponse(BaseModel):
    """Response when returning template data"""
    
    id: UUID
    organization_id: UUID
    whatsapp_number_id: UUID
    
    name: str
    category: str
    language: str
    parameter_format: str
    
    status: str  # DRAFT, PENDING, APPROVED, REJECTED, DISABLED
    quality_score: Optional[str]  # GREEN, YELLOW, RED, UNKNOWN
    
    body_text: str
    header_text: Optional[str]
    header_format: Optional[str]
    footer_text: Optional[str]
    
    named_variables: Optional[List[TemplateParameterVariable]]
    buttons: Optional[List[Dict[str, Any]]]
    
    is_enabled: bool
    is_system_template: bool
    
    # Meta info
    meta_template_id: Optional[str]
    approved_at: Optional[datetime]
    rejected_at: Optional[datetime]
    rejected_reason: Optional[str]
    paused_at: Optional[datetime]
    disabled_at: Optional[datetime]
    disabled_reason: Optional[str]
    
    # Metrics
    sent_count: int
    delivered_count: int
    read_count: int
    failed_count: int
    
    created_at: datetime
    updated_at: datetime
    
    model_config = {"from_attributes": True}
    
    @property
    def can_be_used(self) -> bool:
        """Check if template can be used for sending messages"""
        return (
            self.status == "APPROVED"
            and self.is_enabled
            and self.paused_at is None
            and self.disabled_at is None
            and self.quality_score != "RED"
        )
    
    @property
    def total_sent(self) -> int:
        """Total messages sent with this template"""
        return self.sent_count + self.delivered_count + self.read_count


class ConversationWindowStatus(BaseModel):
    """Response for conversation window status endpoint"""
    
    conversation_id: UUID
    is_window_open: bool = Field(..., description="Can send free-form messages?")
    expires_at: Optional[datetime] = Field(None, description="When 24h window expires")
    remaining_minutes: Optional[int] = Field(None, description="Minutes remaining in window")
    last_user_message_at: Optional[datetime] = Field(None, description="When last user message received")
    can_send_free_message: bool = Field(..., description="Can send non-template message?")
    template_required: bool = Field(..., description="Is template required?")
    
    model_config = {"from_attributes": True}
