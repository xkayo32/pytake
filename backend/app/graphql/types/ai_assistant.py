"""
AI Assistant GraphQL Types
"""

from enum import Enum
from typing import List, Optional

import strawberry


# ============================================
# AI ASSISTANT SETTINGS
# ============================================

@strawberry.enum
class AIProviderEnum(Enum):
    """AI Provider"""

    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GEMINI = "gemini"


@strawberry.type
class AIAssistantSettingsType:
    """AI Assistant settings"""

    enabled: bool
    default_provider: AIProviderEnum
    model: str
    max_tokens: int
    temperature: float


@strawberry.input
class AIAssistantSettingsUpdateInput:
    """Input for updating AI Assistant settings"""

    enabled: Optional[bool] = None
    default_provider: Optional[AIProviderEnum] = None
    openai_api_key: Optional[str] = None
    anthropic_api_key: Optional[str] = None
    gemini_api_key: Optional[str] = None
    model: Optional[str] = None
    max_tokens: Optional[int] = None
    temperature: Optional[float] = None


# ============================================
# AI MODELS
# ============================================

@strawberry.type
class AIModelType:
    """AI Model information"""

    id: strawberry.ID
    model_id: str
    provider: AIProviderEnum
    name: str
    description: Optional[str] = None
    context_window: int
    max_output_tokens: int
    input_cost_per_million: float
    output_cost_per_million: float
    supports_vision: bool
    supports_tools: bool
    is_custom: bool
    is_deprecated: bool


# ============================================
# FLOW GENERATION
# ============================================

@strawberry.input
class GenerateFlowInput:
    """Input for generating flow from description"""

    description: str
    industry: Optional[str] = None
    language: str = "pt-BR"
    chatbot_id: Optional[strawberry.ID] = None


@strawberry.type
class GenerateFlowResponseType:
    """Response from flow generation"""

    status: str  # success, needs_clarification, error
    flow_data: Optional[strawberry.scalars.JSON] = None
    error_message: Optional[str] = None
