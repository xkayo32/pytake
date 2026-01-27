"""
AI Flow Assistant Schemas - Configuration and request/response models
"""

from typing import Optional, List, Dict, Any
from enum import Enum
from pydantic import BaseModel, Field, field_validator


class AIProvider(str, Enum):
    """Supported AI providers"""
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


class AIModelBase(BaseModel):
    """Base schema for AI models"""
    model_id: str = Field(..., description="Model identifier (e.g., 'gpt-4o', 'claude-sonnet-4.5')")
    provider: AIProvider = Field(..., description="AI provider")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(None, description="Model description")
    context_window: int = Field(..., description="Maximum context window in tokens")
    max_output_tokens: int = Field(..., description="Maximum output tokens")
    input_cost_per_million: float = Field(..., description="Cost per million input tokens (USD)")
    output_cost_per_million: float = Field(..., description="Cost per million output tokens (USD)")
    supports_vision: bool = Field(default=False, description="Supports image inputs")
    supports_tools: bool = Field(default=True, description="Supports function calling/tools")
    is_custom: bool = Field(default=False, description="Is custom model (user-added)")
    is_deprecated: bool = Field(default=False, description="Is deprecated")
    release_date: Optional[str] = Field(None, description="Release date (YYYY-MM-DD)")


class AIModelCreate(AIModelBase):
    """Schema for creating custom AI models"""
    pass


class AIModel(AIModelBase):
    """Schema for AI model with ID"""
    id: str = Field(..., description="Unique model ID in database")
    organization_id: Optional[str] = Field(None, description="Organization ID (null for global models)")
    created_at: str

    class Config:
        from_attributes = True


class AIModelListResponse(BaseModel):
    """Response for listing AI models"""
    models: List[AIModel] = Field(..., description="List of available models")
    total: int = Field(..., description="Total number of models")


class AIAssistantSettings(BaseModel):
    """
    AI Assistant settings stored in organization.settings['ai_assistant']

    Example:
    {
        "ai_assistant": {
            "enabled": true,
            "default_provider": "anthropic",
            "openai_api_key": "sk-...",
            "anthropic_api_key": "sk-ant-...",
            "model": "claude-3-5-sonnet-20241022",
            "max_tokens": 8192,
            "temperature": 0.7
        }
    }
    """
    enabled: bool = Field(
        default=False,
        description="Enable/disable AI Flow Assistant feature"
    )
    default_provider: AIProvider = Field(
        default=AIProvider.ANTHROPIC,
        description="Default AI provider (openai or anthropic)"
    )
    openai_api_key: Optional[str] = Field(
        None,
        min_length=10,
        description="OpenAI API key"
    )
    anthropic_api_key: Optional[str] = Field(
        None,
        min_length=10,
        description="Anthropic API key"
    )
    gemini_api_key: Optional[str] = Field(
        None,
        min_length=10,
        description="Google Gemini API key"
    )
    model: str = Field(
        default="claude-3-5-sonnet-20241022",
        description="AI model to use"
    )
    max_tokens: int = Field(
        default=8192,
        ge=1024,
        le=200000,
        description="Maximum tokens for AI responses"
    )
    temperature: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="AI temperature (0-1, higher = more creative)"
    )

    @field_validator('model')
    @classmethod
    def validate_model(cls, v: str, info) -> str:
        """Validate model name format - accept any model string"""
        # Remove strict validation to allow custom models
        # Just ensure it's not empty
        if not v or not v.strip():
            raise ValueError("Model name cannot be empty")
        return v


class AIAssistantSettingsUpdate(BaseModel):
    """Schema for updating AI Assistant settings"""
    enabled: Optional[bool] = None
    # New format (preferred)
    default_provider: Optional[AIProvider] = None
    openai_api_key: Optional[str] = Field(None, min_length=10)
    anthropic_api_key: Optional[str] = Field(None, min_length=10)
    gemini_api_key: Optional[str] = Field(None, min_length=10)
    # Old format (backward compatibility)
    provider: Optional[AIProvider] = None  # Will be converted to default_provider
    api_key: Optional[str] = Field(None, min_length=10)  # Will be converted to provider-specific key
    # Common fields
    model: Optional[str] = None
    max_tokens: Optional[int] = Field(None, ge=1024, le=200000)
    temperature: Optional[float] = Field(None, ge=0.0, le=1.0)


class GenerateFlowRequest(BaseModel):
    """Request to generate a flow from description"""
    description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Natural language description of the desired flow"
    )
    industry: Optional[str] = Field(
        None,
        max_length=100,
        description="Industry context (e.g., 'real estate', 'e-commerce')"
    )
    language: str = Field(
        default="pt-BR",
        description="Flow language"
    )
    chatbot_id: Optional[str] = Field(
        None,
        description="Chatbot ID to associate the flow with"
    )
    save_to_database: bool = Field(
        default=False,
        description="If True, saves the generated flow directly to the database"
    )
    flow_name: Optional[str] = Field(
        None,
        max_length=200,
        description="Custom name for the flow (auto-generated if not provided)"
    )


class ClarificationQuestion(BaseModel):
    """Clarification question from AI"""
    question: str = Field(..., description="The clarification question")
    options: Optional[List[str]] = Field(
        None,
        description="Suggested answer options (if applicable)"
    )
    field: str = Field(..., description="Field being clarified (e.g., 'tone', 'complexity')")


class ClarificationResponse(BaseModel):
    """User's response to clarification questions"""
    field: str = Field(..., description="Field being answered")
    answer: str = Field(..., description="User's answer")


class GenerateFlowResponse(BaseModel):
    """Response from flow generation"""
    flow_id: Optional[str] = Field(
        None,
        description="Flow UUID if saved to database"
    )
    flow_name: Optional[str] = Field(
        None,
        description="Flow name if saved to database"
    )
    saved_to_database: bool = Field(
        default=False,
        description="Whether the flow was saved to database"
    )
    status: str = Field(..., description="Status: 'success', 'needs_clarification', 'error'")
    flow_data: Optional[Dict[str, Any]] = Field(
        None,
        description="Generated flow data (if status is 'success')"
    )
    clarification_questions: Optional[List[ClarificationQuestion]] = Field(
        None,
        description="Questions for clarification (if status is 'needs_clarification')"
    )
    error_message: Optional[str] = Field(
        None,
        description="Error message (if status is 'error')"
    )


class SuggestImprovementsRequest(BaseModel):
    """Request to suggest improvements for a flow"""
    flow_id: str = Field(..., description="Flow ID to analyze")
    focus_areas: Optional[List[str]] = Field(
        None,
        description="Specific areas to focus on (e.g., 'user_experience', 'conversion', 'clarity')"
    )


class FlowImprovement(BaseModel):
    """A suggested improvement for a flow"""
    title: str = Field(..., description="Improvement title")
    description: str = Field(..., description="Detailed description")
    category: str = Field(
        ...,
        description="Category: 'ux', 'conversion', 'clarity', 'error_handling', 'performance'"
    )
    priority: str = Field(
        ...,
        description="Priority: 'low', 'medium', 'high', 'critical'"
    )
    affected_nodes: List[str] = Field(
        default_factory=list,
        description="Node IDs affected by this improvement"
    )
    auto_fixable: bool = Field(
        default=False,
        description="Whether this improvement can be applied automatically"
    )
    patch: Optional[Dict[str, Any]] = Field(
        None,
        description="JSON patch to apply if auto_fixable is True"
    )


class SuggestImprovementsResponse(BaseModel):
    """Response with flow improvement suggestions"""
    flow_id: str
    improvements: List[FlowImprovement]
    analysis_summary: str = Field(
        ...,
        description="Overall analysis summary"
    )


class ApplyImprovementRequest(BaseModel):
    """Request to apply a specific improvement"""
    flow_id: str = Field(..., description="Flow ID")
    improvement_index: int = Field(
        ...,
        ge=0,
        description="Index of the improvement to apply"
    )


class TemplateCategory(BaseModel):
    """Template category"""
    id: str = Field(..., description="Category ID (e.g., 'lead_qualification')")
    name: str = Field(..., description="Category display name")
    description: str = Field(..., description="Category description")
    icon: Optional[str] = Field(None, description="Icon name or emoji")
    template_count: int = Field(default=0, description="Number of templates in category")


class FlowTemplate(BaseModel):
    """Flow template metadata"""
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: str = Field(..., description="Category ID")
    subcategory: Optional[str] = None
    thumbnail_url: Optional[str] = None
    preview_image_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    complexity: str = Field(
        ...,
        description="Complexity: 'simple', 'medium', 'complex'"
    )
    estimated_setup_time: str = Field(..., description="e.g., '5 minutes'")
    node_count: int = Field(..., description="Number of nodes in flow")
    features: List[str] = Field(default_factory=list, description="Key features")
    variables_used: List[str] = Field(default_factory=list)
    requires_integrations: List[str] = Field(default_factory=list)
    use_count: int = Field(default=0, description="How many times used")
    rating: float = Field(default=0.0, ge=0.0, le=5.0)
    language: str = Field(default="pt-BR")


class FlowTemplateDetail(FlowTemplate):
    """Detailed template with flow data"""
    flow_data: Dict[str, Any] = Field(..., description="Complete flow data (nodes + edges)")


class TemplateListResponse(BaseModel):
    """Response for template listing"""
    total: int
    items: List[FlowTemplate]
    categories: List[TemplateCategory]


class ImportTemplateRequest(BaseModel):
    """Request to import a template"""
    template_id: str = Field(..., description="Template ID to import")
    chatbot_id: str = Field(..., description="Chatbot ID to import into")
    flow_name: Optional[str] = Field(
        None,
        description="Custom name for the flow (uses template name if not provided)"
    )
    customize_variables: Optional[Dict[str, str]] = Field(
        None,
        description="Variable name mappings for customization"
    )


# Export all schemas
__all__ = [
    'AIProvider',
    'AIModelBase',
    'AIModelCreate',
    'AIModel',
    'AIModelListResponse',
    'AIAssistantSettings',
    'AIAssistantSettingsUpdate',
    'GenerateFlowRequest',
    'ClarificationQuestion',
    'ClarificationResponse',
    'GenerateFlowResponse',
    'SuggestImprovementsRequest',
    'FlowImprovement',
    'SuggestImprovementsResponse',
    'ApplyImprovementRequest',
    'TemplateCategory',
    'FlowTemplate',
    'FlowTemplateDetail',
    'TemplateListResponse',
    'ImportTemplateRequest',
]
