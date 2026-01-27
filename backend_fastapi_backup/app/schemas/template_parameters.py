"""
Pydantic schemas for template parameter validation and support.

Supports both POSITIONAL ({{1}}, {{2}}) and NAMED ({{name}}) parameter formats
with proper validation and conversion logic.
"""

from typing import List, Optional, Dict, Any, Literal
from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, Field, field_validator, model_validator, ConfigDict
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

    name: str = Field(
        ...,
        min_length=1,
        max_length=512,
        description="Template name (slug format: lowercase, underscores only)",
        pattern=r'^[a-z][a-z0-9_]*$',
        examples=["order_confirmation", "welcome_user", "payment_receipt"]
    )

    category: Literal["UTILITY", "AUTHENTICATION", "MARKETING"] = Field(
        ...,
        description="Template category for pricing (affects cost per message)",
        examples=["UTILITY"]
    )

    language: str = Field(
        default="pt_BR",
        description="Language code (ISO 639-1 with country, e.g., pt_BR, en_US)",
        pattern=r'^[a-z]{2}_[A-Z]{2}$',
        examples=["pt_BR", "en_US", "es_ES"]
    )

    parameter_format: Literal["POSITIONAL", "NAMED"] = Field(
        default="POSITIONAL",
        description="POSITIONAL: {{1}}, {{2}} | NAMED: {{nome}}, {{codigo}}",
        examples=["NAMED", "POSITIONAL"]
    )

    # Component texts
    body_text: str = Field(
        ...,
        min_length=1,
        max_length=1024,
        description="Template body text (required, supports variables)",
        examples=["Olá {{nome}}, seu código é {{codigo}}. Válido por {{validade}} minutos."]
    )

    header_text: Optional[str] = Field(
        None,
        max_length=1024,
        description="Template header text (optional, supports variables)",
        examples=["Bem-vindo {{nome}}", "Pedido {{numero_pedido}}"]
    )

    header_format: Optional[Literal["TEXT", "IMAGE", "VIDEO", "DOCUMENT"]] = Field(
        None,
        description="Header format if header_text provided",
        examples=["TEXT"]
    )

    footer_text: Optional[str] = Field(
        None,
        max_length=60,
        description="Template footer (optional, max 60 chars, no variables)",
        examples=["PyTake - Automação WhatsApp", "Obrigado pela preferência"]
    )

    # Named variables (required if parameter_format=NAMED)
    named_variables: Optional[List[TemplateParameterVariable]] = Field(
        None,
        description="List of named variables (required if parameter_format=NAMED)"
    )

    # Buttons (optional)
    buttons: Optional[List[Dict[str, Any]]] = Field(
        None,
        description="Quick reply or call-to-action buttons"
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "name": "welcome_user",
                    "category": "UTILITY",
                    "language": "pt_BR",
                    "parameter_format": "NAMED",
                    "body_text": "Olá {{nome}}, seu código de verificação é {{codigo}}. Válido por {{validade}} minutos.",
                    "header_text": "Bem-vindo {{nome}}",
                    "header_format": "TEXT",
                    "footer_text": "PyTake - Automação WhatsApp",
                    "named_variables": [
                        {"name": "nome", "type": "text", "example": "João Silva"},
                        {"name": "codigo", "type": "text", "example": "123456"},
                        {"name": "validade", "type": "text", "example": "10"}
                    ],
                    "buttons": None
                },
                {
                    "name": "order_confirmation",
                    "category": "UTILITY",
                    "language": "pt_BR",
                    "parameter_format": "NAMED",
                    "body_text": "Olá {{cliente}}, seu pedido {{numero_pedido}} no valor de {{total}} foi confirmado! Previsão de entrega: {{data_entrega}}.",
                    "header_text": "Pedido Confirmado",
                    "header_format": "TEXT",
                    "footer_text": "Obrigado pela preferência",
                    "named_variables": [
                        {"name": "cliente", "type": "text", "example": "Maria Santos"},
                        {"name": "numero_pedido", "type": "text", "example": "#12345"},
                        {"name": "total", "type": "currency", "example": "R$ 150,00"},
                        {"name": "data_entrega", "type": "date_time", "example": "15/01/2025"}
                    ],
                    "buttons": [
                        {"type": "QUICK_REPLY", "text": "Rastrear pedido"},
                        {"type": "QUICK_REPLY", "text": "Falar com suporte"}
                    ]
                },
                {
                    "name": "payment_reminder_positional",
                    "category": "UTILITY",
                    "language": "en_US",
                    "parameter_format": "POSITIONAL",
                    "body_text": "Hello {{1}}, your payment of {{2}} is due on {{3}}. Please pay to avoid service interruption.",
                    "header_text": "Payment Reminder",
                    "header_format": "TEXT",
                    "footer_text": "Thank you",
                    "named_variables": None,
                    "buttons": None
                }
            ]
        }
    )
    
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

    id: UUID = Field(..., description="Template UUID", examples=["550e8400-e29b-41d4-a716-446655440000"])
    organization_id: UUID = Field(..., description="Organization UUID")
    whatsapp_number_id: UUID = Field(..., description="WhatsApp number UUID")

    name: str = Field(..., description="Template name (slug format)", examples=["welcome_user", "order_confirmation"])
    category: str = Field(..., description="Template category", examples=["UTILITY", "AUTHENTICATION", "MARKETING"])
    suggested_category: Optional[str] = Field(
        None,
        deprecated=True,
        description="[DEPRECATED] Category suggested by Meta. NOTE: As of April 2025, Meta no longer returns this field. Meta now approves/rejects templates directly or automatically changes categories during monthly reviews. This field is kept for backward compatibility and will always be null for new templates.",
        examples=[None]
    )
    language: str = Field(..., description="Language code", examples=["pt_BR", "en_US"])
    parameter_format: str = Field(..., description="POSITIONAL or NAMED", examples=["NAMED", "POSITIONAL"])

    status: str = Field(..., description="Template status", examples=["APPROVED", "PENDING", "DRAFT", "REJECTED", "DISABLED"])
    quality_score: Optional[str] = Field(None, description="Quality score from Meta", examples=["GREEN", "YELLOW", "RED", "UNKNOWN"])

    body_text: str = Field(..., description="Template body text", examples=["Olá {{nome}}, seu código é {{codigo}}"])
    header_text: Optional[str] = Field(None, description="Template header text", examples=["Bem-vindo {{nome}}"])
    header_format: Optional[str] = Field(None, description="Header format", examples=["TEXT", "IMAGE", "VIDEO"])
    footer_text: Optional[str] = Field(None, description="Template footer text", examples=["PyTake - Automação WhatsApp"])

    named_variables: Optional[List[TemplateParameterVariable]] = Field(None, description="Named variables list (NAMED format only)")
    buttons: Optional[List[Dict[str, Any]]] = Field(None, description="Template buttons")

    is_enabled: bool = Field(..., description="Is template enabled?", examples=[True])
    is_system_template: bool = Field(..., description="Is system template?", examples=[False])

    # Meta info
    meta_template_id: Optional[str] = Field(None, description="Meta API template ID", examples=["1234567890"])
    approved_at: Optional[datetime] = Field(None, description="When approved by Meta")
    rejected_at: Optional[datetime] = Field(None, description="When rejected by Meta")
    rejected_reason: Optional[str] = Field(None, description="Rejection reason from Meta")
    paused_at: Optional[datetime] = Field(None, description="When paused due to quality")
    disabled_at: Optional[datetime] = Field(None, description="When disabled by Meta")
    disabled_reason: Optional[str] = Field(None, description="Disability reason from Meta")

    # Metrics
    sent_count: int = Field(..., description="Count of sent messages", examples=[150])
    delivered_count: int = Field(..., description="Count of delivered messages", examples=[148])
    read_count: int = Field(..., description="Count of read messages", examples=[120])
    failed_count: int = Field(..., description="Count of failed messages", examples=[2])

    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "organization_id": "660e8400-e29b-41d4-a716-446655440001",
                "whatsapp_number_id": "770e8400-e29b-41d4-a716-446655440002",
                "name": "welcome_user",
                "category": "UTILITY",
                "suggested_category": None,
                "language": "pt_BR",
                "parameter_format": "NAMED",
                "status": "APPROVED",
                "quality_score": "GREEN",
                "body_text": "Olá {{nome}}, seu código de verificação é {{codigo}}. Válido por {{validade}} minutos.",
                "header_text": "Bem-vindo {{nome}}",
                "header_format": "TEXT",
                "footer_text": "PyTake - Automação WhatsApp",
                "named_variables": [
                    {"name": "nome", "type": "text", "example": "João Silva"},
                    {"name": "codigo", "type": "text", "example": "123456"},
                    {"name": "validade", "type": "text", "example": "10"}
                ],
                "buttons": None,
                "is_enabled": True,
                "is_system_template": False,
                "meta_template_id": "1234567890",
                "approved_at": "2025-01-15T14:30:00Z",
                "rejected_at": None,
                "rejected_reason": None,
                "paused_at": None,
                "disabled_at": None,
                "disabled_reason": None,
                "sent_count": 150,
                "delivered_count": 148,
                "read_count": 120,
                "failed_count": 2,
                "created_at": "2025-01-15T10:00:00Z",
                "updated_at": "2025-01-15T14:30:00Z"
            }
        }
    )
    
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
