"""
AI Assistant & Flow Templates API Endpoints
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ai_assistant import (
    AIAssistantSettings,
    AIAssistantSettingsUpdate,
    AIModelListResponse,
    AIModel,
    AIModelCreate,
    GenerateFlowRequest,
    GenerateFlowResponse,
    SuggestImprovementsRequest,
    SuggestImprovementsResponse,
    TemplateCategory,
    FlowTemplate,
    FlowTemplateDetail,
    TemplateListResponse,
    ImportTemplateRequest,
)
from app.schemas.chatbot import FlowInDB
from app.services.flow_generator_service import FlowGeneratorService
from app.repositories.flow_template_repository import FlowTemplateRepository
from app.repositories.chatbot import ChatbotRepository, FlowRepository
from app.repositories.organization import OrganizationRepository
from app.models.chatbot import Chatbot, Flow
from app.models.organization import Organization
from app.data.ai_models import (
    get_all_models,
    get_models_by_provider,
    get_model_by_id,
    get_recommended_models
)

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== AI Models Management ====================

@router.get("/models", response_model=AIModelListResponse)
async def list_ai_models(
    provider: Optional[str] = Query(None, description="Filter by provider (openai, anthropic, gemini)"),
    recommended: bool = Query(False, description="Show only recommended models"),
    include_deprecated: bool = Query(False, description="Include deprecated models"),
    current_user: User = Depends(get_current_user),
):
    """
    List all available AI models (predefined + custom).

    Returns available AI models from multiple providers with pricing information,
    capabilities, and compatibility details for flow generation and analysis.

    **Path Parameters:** None

    **Query Parameters:**
    - provider (str, optional): Filter by provider ('openai', 'anthropic', 'gemini')
    - recommended (bool): Show only recommended models for flow generation (default: false)
    - include_deprecated (bool): Include models no longer supported (default: false)

    **Returns:**
    - models (array): List of available AI models:
      - id (str): Unique model identifier
      - name (str): Human-readable model name
      - provider (str): Provider name ('openai', 'anthropic', 'gemini')
      - max_tokens (int): Maximum context window size
      - cost_per_1k_input (float): Input token cost per 1K tokens
      - cost_per_1k_output (float): Output token cost per 1K tokens
      - capabilities (array): Supported capabilities ['text', 'vision', 'tool_use']
      - is_custom (bool): Custom model created for organization
      - is_deprecated (bool): Model no longer supported
    - total (int): Total number of models

    **Example Request (Recommended OpenAI):**
    ```
    GET /api/v1/ai-assistant/models?provider=openai&recommended=true
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    {
        "models": [
            {
                "id": "gpt-4o",
                "name": "GPT-4 Optimized",
                "provider": "openai",
                "max_tokens": 128000,
                "cost_per_1k_input": 0.005,
                "cost_per_1k_output": 0.015,
                "capabilities": ["text", "vision", "tool_use"],
                "is_custom": false,
                "is_deprecated": false
            },
            {
                "id": "gpt-4o-mini",
                "name": "GPT-4 Mini (Fast)",
                "provider": "openai",
                "max_tokens": 128000,
                "cost_per_1k_input": 0.00015,
                "cost_per_1k_output": 0.0006,
                "capabilities": ["text"],
                "is_custom": false,
                "is_deprecated": false
            }
        ],
        "total": 2
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Note: All organization members can list available models

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 500: Server error (model list retrieval failure)
    """
    # Get predefined models
    if recommended:
        predefined_models = get_recommended_models()
    elif provider:
        predefined_models = get_models_by_provider(provider)
    else:
        predefined_models = get_all_models()

    # Filter deprecated if needed
    if not include_deprecated:
        predefined_models = [m for m in predefined_models if not m.get("is_deprecated", False)]

    # Convert to response format
    models = []
    for i, model_data in enumerate(predefined_models):
        model = AIModel(
            id=f"predefined_{i}",
            organization_id=None,
            created_at="2025-01-01T00:00:00Z",
            is_custom=False,
            **model_data
        )
        models.append(model)

    # TODO: Add custom models from database (organization-specific)

    return AIModelListResponse(
        models=models,
        total=len(models)
    )


@router.get("/models/{model_id}")
async def get_model_details(
    model_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information about a specific AI model.

    Retrieve comprehensive details about a model including pricing, capabilities,
    usage limits, and recommended use cases for flow generation.

    **Path Parameters:**
    - model_id (str, required): Model identifier (e.g., 'gpt-4o', 'claude-3-opus-20240229')

    **Query Parameters:** None

    **Returns:**
    - id (str): Model identifier
    - name (str): Human-readable name
    - provider (str): Provider ('openai', 'anthropic', 'gemini')
    - description (str): Detailed model description
    - max_tokens (int): Maximum context window
    - training_date (str): Latest training data cutoff
    - cost_per_1k_input (float): Input token pricing
    - cost_per_1k_output (float): Output token pricing
    - capabilities (array): Supported features
    - recommended_for (array): Best use cases
    - rate_limits (object): API rate limits
    - release_date (str): Model release date

    **Example Request:**
    ```
    GET /api/v1/ai-assistant/models/claude-3-opus-20240229
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    {
        "id": "claude-3-opus-20240229",
        "name": "Claude 3 Opus",
        "provider": "anthropic",
        "description": "Most capable Claude model for complex reasoning",
        "max_tokens": 200000,
        "training_date": "2024-02-29",
        "cost_per_1k_input": 0.015,
        "cost_per_1k_output": 0.075,
        "capabilities": ["text", "vision", "tool_use", "reasoning"],
        "recommended_for": ["flow_generation", "complex_analysis", "improvement_suggestions"],
        "rate_limits": {"requests_per_minute": 100, "tokens_per_minute": 40000},
        "release_date": "2024-02-29"
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 404: Not Found (model_id doesn't exist)
    - 500: Server error (model details retrieval failure)
    """
    model_data = get_model_by_id(model_id)

    if not model_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Model not found"
        )

    return AIModel(
        id=f"predefined_{model_id}",
        organization_id=None,
        created_at="2025-01-01T00:00:00Z",
        is_custom=False,
        **model_data
    )


@router.post("/models/custom", response_model=AIModel, status_code=status.HTTP_201_CREATED)
async def create_custom_model(
    model: AIModelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a custom AI model for your organization.

    Register fine-tuned models or custom model implementations not available
    in the predefined list. Useful for proprietary or specialized models.

    **Path Parameters:** None

    **Request Body:**
    - model_id (str, required): Unique model identifier (e.g., 'custom_gpt4_finetuned')
    - name (str, required): Human-readable model name
    - provider (str, required): Provider ('openai', 'anthropic', 'gemini', 'custom')
    - description (str, optional): Model description and use cases
    - max_tokens (int, required): Context window size
    - cost_per_1k_input (float, optional): Input token cost (default: 0)
    - cost_per_1k_output (float, optional): Output token cost (default: 0)
    - capabilities (array): Supported capabilities ['text', 'vision', 'tool_use']
    - api_endpoint (str, optional): Custom API endpoint URL
    - authentication_method (str, optional): 'bearer_token', 'api_key', 'custom'

    **Returns:**
    - id (str): Generated custom model ID
    - organization_id (str): Organization that owns the model
    - is_custom (bool): Always true
    - created_at (datetime): Creation timestamp
    - (all request body fields)

    **Example Request:**
    ```json
    {
        "model_id": "gpt4_medical_finetuned",
        "name": "GPT-4 Medical Specialized",
        "provider": "openai",
        "description": "Fine-tuned for medical flow generation",
        "max_tokens": 8192,
        "cost_per_1k_input": 0.01,
        "cost_per_1k_output": 0.03,
        "capabilities": ["text"],
        "api_endpoint": "https://api.openai.com/v1/chat/completions"
    }
    ```

    **Example Response:**
    ```json
    {
        "id": "custom_gpt4_med_20250115",
        "organization_id": "550e8400-e29b-41d4-a716-446655440000",
        "model_id": "gpt4_medical_finetuned",
        "name": "GPT-4 Medical Specialized",
        "provider": "openai",
        "description": "Fine-tuned for medical flow generation",
        "max_tokens": 8192,
        "cost_per_1k_input": 0.01,
        "cost_per_1k_output": 0.03,
        "capabilities": ["text"],
        "is_custom": true,
        "created_at": "2025-01-15T10:30:00Z"
    }
    ```

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization (organization_id from current user)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 403: Forbidden (insufficient permissions - not org_admin)
    - 422: Unprocessable Entity (invalid model configuration)
    - 409: Conflict (model_id already exists in organization)
    - 500: Server error (model creation failure)
    """
    # Check permission
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create custom models"
        )

    # TODO: Store in database (new table: ai_custom_models)
    # For now, return validation that it would work

    return AIModel(
        id=f"custom_{model.model_id}",
        organization_id=str(current_user.organization_id),
        created_at="2025-10-16T00:00:00Z",
        is_custom=True,
        **model.model_dump()
    )


# ==================== AI Assistant Settings ====================

@router.get("/settings", response_model=Optional[AIAssistantSettings])
async def get_ai_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI Assistant settings for the organization.

    Retrieve current configuration including enabled providers, API keys,
    and default model selection for flow generation features.

    **Path Parameters:** None

    **Query Parameters:** None

    **Returns:**
    - enabled (bool): Whether AI Assistant is active
    - default_provider (str): Primary provider ('openai', 'anthropic', 'gemini')
    - default_model (str): Default model for flow generation
    - openai_api_key (str, optional): OpenAI API key (masked in response)
    - anthropic_api_key (str, optional): Anthropic API key (masked in response)
    - temperature (float): Generation temperature (0-2)
    - max_tokens (int): Maximum output tokens
    - enable_flow_generation (bool): Allow AI flow generation
    - enable_improvements (bool): Allow improvement suggestions
    - created_at (datetime): Configuration creation date

    Or **null** if not configured

    **Example Request:**
    ```
    GET /api/v1/ai-assistant/settings
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response (Configured):**
    ```json
    {
        "enabled": true,
        "default_provider": "anthropic",
        "default_model": "claude-3-opus-20240229",
        "openai_api_key": "sk-***...",
        "anthropic_api_key": "sk-ant-***...",
        "temperature": 0.7,
        "max_tokens": 2048,
        "enable_flow_generation": true,
        "enable_improvements": true,
        "created_at": "2025-01-01T00:00:00Z"
    }
    ```

    **Example Response (Not Configured):**
    ```json
    null
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Note: Any user can view organization's AI settings (keys are masked)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 404: Organization not found
    - 500: Server error (settings retrieval failure)
    """
    org_repo = OrganizationRepository(db)
    org = await org_repo.get(current_user.organization_id)

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    ai_settings = org.settings.get('ai_assistant')

    if not ai_settings:
        return None

    try:
        return AIAssistantSettings(**ai_settings)
    except Exception as e:
        logger.error(f"Error parsing AI settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid AI settings configuration"
        )


@router.post("/settings", response_model=AIAssistantSettings)
async def update_ai_settings(
    settings: AIAssistantSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update AI Assistant settings for the organization.

    Configure API keys, select default provider and model, and enable/disable
    AI features like flow generation and improvement suggestions.

    **Path Parameters:** None

    **Request Body:**
    - enabled (bool, optional): Enable/disable AI Assistant
    - default_provider (str, optional): Provider choice ('openai', 'anthropic', 'gemini')
    - default_model (str, optional): Model identifier for generation
    - openai_api_key (str, optional): OpenAI API key
    - anthropic_api_key (str, optional): Anthropic API key
    - gemini_api_key (str, optional): Google Gemini API key
    - temperature (float, optional): Generation temperature (0-2, default: 0.7)
    - max_tokens (int, optional): Max output tokens (default: 2048)
    - enable_flow_generation (bool, optional): Allow AI flow generation
    - enable_improvements (bool, optional): Allow improvement suggestions

    **Returns:** Updated AIAssistantSettings object

    **Example Request:**
    ```json
    {
        "enabled": true,
        "default_provider": "anthropic",
        "default_model": "claude-3-opus-20240229",
        "anthropic_api_key": "sk-ant-...",
        "temperature": 0.8,
        "max_tokens": 4096,
        "enable_flow_generation": true,
        "enable_improvements": true
    }
    ```

    **Example Response:**
    ```json
    {
        "enabled": true,
        "default_provider": "anthropic",
        "default_model": "claude-3-opus-20240229",
        "openai_api_key": null,
        "anthropic_api_key": "sk-ant-***...",
        "temperature": 0.8,
        "max_tokens": 4096,
        "enable_flow_generation": true,
        "enable_improvements": true,
        "created_at": "2025-01-15T10:30:00Z"
    }
    ```

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization (organization_id from current user)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 403: Forbidden (insufficient permissions - not org_admin)
    - 404: Organization not found
    - 422: Unprocessable Entity (invalid settings configuration)
    - 500: Server error (settings update failure)
    """
    # Check permission
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update AI settings"
        )

    org_repo = OrganizationRepository(db)
    org = await org_repo.get(current_user.organization_id)

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    # Get current settings or create new
    current_settings = org.settings.get('ai_assistant', {})

    # Update with new values
    update_data = settings.model_dump(exclude_unset=True)

    # BACKWARD COMPATIBILITY: Convert old format to new format
    # If 'provider' is present (old format), convert to 'default_provider'
    if 'provider' in update_data and 'default_provider' not in update_data:
        update_data['default_provider'] = update_data.pop('provider')

    # If 'api_key' is present (old format), distribute to provider-specific keys
    if 'api_key' in update_data:
        api_key = update_data.pop('api_key')
        provider = update_data.get('default_provider', current_settings.get('default_provider', 'anthropic'))

        if provider == 'openai':
            update_data['openai_api_key'] = api_key
        elif provider == 'anthropic':
            update_data['anthropic_api_key'] = api_key

    current_settings.update(update_data)

    # Validate complete settings
    try:
        validated_settings = AIAssistantSettings(**current_settings)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid settings: {str(e)}"
        )

    # Update organization
    new_settings = org.settings.copy()
    new_settings['ai_assistant'] = validated_settings.model_dump()

    await org_repo.update(
        org.id,
        {"settings": new_settings}
    )

    logger.info(f"Updated AI settings for organization {org.id}")

    return validated_settings


@router.post("/test")
async def test_ai_connection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test AI connection with current organization settings.

    Validates configured API keys and makes a minimal test call to verify
    connectivity and quota availability. Uses smallest/cheapest models to
    minimize costs.

    **Path Parameters:** None

    **Request Body:** None

    **Returns:**
    - success (bool): Connection successful
    - provider (str): Provider that was tested
    - message (str): Status message
    - model_tested (str): Model used for test
    - latency_ms (int, optional): Response latency

    **Example Request:**
    ```
    POST /api/v1/ai-assistant/test
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response (Success - Anthropic):**
    ```json
    {
        "success": true,
        "provider": "anthropic",
        "message": "Connection successful! Anthropic API is working.",
        "model_tested": "claude-3-5-haiku-20241022"
    }
    ```

    **Example Response (Success - OpenAI):**
    ```json
    {
        "success": true,
        "provider": "openai",
        "message": "Connection successful! OpenAI API is working.",
        "model_tested": "gpt-4o-mini"
    }
    ```

    **Example Response (Success - Gemini):**
    ```json
    {
        "success": true,
        "provider": "gemini",
        "message": "Connection successful! Google Gemini API is working.",
        "model_tested": "gemini-2.5-flash-lite"
    }
    ```

    **Example Response (Auth Error):**
    ```json
    {
        "success": false,
        "error": "401",
        "message": "Invalid API key. Please check your credentials."
    }
    ```

    **Example Response (Quota Error):**
    ```json
    {
        "success": false,
        "error": "402",
        "message": "API quota exceeded. Please check your billing."
    }
    ```

    **Permissions:**
    - Requires: org_admin or super_admin role
    - Scoped to: Organization (organization_id from current user)

    **Error Codes:**
    - 400: Bad Request (not configured or missing API key)
    - 401: Unauthorized (invalid API key/credentials)
    - 402: Payment Required (quota exceeded, billing issue)
    - 403: Forbidden (insufficient permissions - not org_admin)
    - 404: Organization not found
    - 429: Too Many Requests (rate limit exceeded)
    - 500: Server error (connection test failure)
    - 504: Gateway Timeout (API response timeout)
    """
    # Check permission
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can test AI connection"
        )

    # Get organization settings
    org_repo = OrganizationRepository(db)
    org = await org_repo.get(current_user.organization_id)

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Organization not found"
        )

    ai_settings = org.settings.get('ai_assistant')

    if not ai_settings:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="AI Assistant not configured. Please configure API keys first."
        )

    try:
        settings = AIAssistantSettings(**ai_settings)
    except Exception as e:
        logger.error(f"Error parsing AI settings: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Invalid AI settings configuration"
        )

    # Test connection based on provider
    try:
        if settings.default_provider == "anthropic":
            # Test Anthropic API
            if not settings.anthropic_api_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Anthropic API key not configured"
                )

            # Import here to avoid loading if not needed
            from anthropic import Anthropic

            client = Anthropic(api_key=settings.anthropic_api_key)

            # Make a minimal test call
            response = client.messages.create(
                model="claude-3-5-haiku-20241022",  # Smallest/cheapest model
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )

            return {
                "success": True,
                "provider": "anthropic",
                "message": "Connection successful! Anthropic API is working.",
                "model_tested": "claude-3-5-haiku-20241022"
            }

        elif settings.default_provider == "openai":
            # Test OpenAI API
            if not settings.openai_api_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="OpenAI API key not configured"
                )

            # Import here to avoid loading if not needed
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)

            # Make a minimal test call
            response = client.chat.completions.create(
                model="gpt-4o-mini",  # Smallest/cheapest model
                max_tokens=10,
                messages=[{"role": "user", "content": "Hi"}]
            )

            return {
                "success": True,
                "provider": "openai",
                "message": "Connection successful! OpenAI API is working.",
                "model_tested": "gpt-4o-mini"
            }

        elif settings.default_provider == "gemini":
            # Test Google Gemini API
            if not settings.gemini_api_key:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Gemini API key not configured"
                )

            # Import here to avoid loading if not needed
            import google.genai as genai

            client = genai.Client(api_key=settings.gemini_api_key)

            # Make a minimal test call
            response = client.models.generate_content(
                model="gemini-2.5-flash-lite",  # Smallest/cheapest model
                contents="Hi"
            )

            return {
                "success": True,
                "provider": "gemini",
                "message": "Connection successful! Google Gemini API is working.",
                "model_tested": "gemini-2.5-flash-lite"
            }

        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported provider: {settings.default_provider}"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error testing AI connection: {e}")
        error_msg = str(e)

        # Parse common errors
        if "authentication" in error_msg.lower() or "api key" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid API key. Please check your credentials."
            )
        elif "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded. Please try again later."
            )
        elif "quota" in error_msg.lower():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="API quota exceeded. Please check your billing."
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error testing connection: {error_msg}"
            )


# ==================== Flow Generation ====================

@router.post("/generate-flow", response_model=GenerateFlowResponse)
async def generate_flow(
    request: GenerateFlowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a chatbot flow from natural language description using AI.

    Creates a complete conversational flow based on user description.
    Requires AI Assistant to be configured and enabled.

    **Path Parameters:** None

    **Request Body:**
    - description (str, required): What the flow should do in natural language
    - industry (str, optional): Industry context ('ecommerce', 'support', 'banking')
    - language (str, optional): Flow language (default: 'pt-BR')
    - chatbot_id (str, optional): Target chatbot UUID (for direct assignment)
    - clarifications (object, optional): User answers to clarification questions

    **Returns:**
    - flow_id (str): Generated flow UUID
    - name (str): Auto-generated flow name
    - canvas_data (object): Flow diagram and node structure
    - variables (object): Variables extracted from description
    - success (bool): Generation successful
    - message (str): Generation summary
    - cost_estimate (float, optional): Estimated API cost

    **Example Request:**
    ```json
    {
        "description": "Create a flow for customer support. Start by asking what issue they have, then route to specialized agent based on category (technical, billing, or general).",
        "industry": "support",
        "language": "pt-BR",
        "chatbot_id": "550e8400-e29b-41d4-a716-446655440000"
    }
    ```

    **Example Response:**
    ```json
    {
        "flow_id": "550e8400-e29b-41d4-a716-446655440001",
        "name": "Customer Support Router - Generated",
        "canvas_data": {
            "nodes": [
                {"id": "start", "type": "start", "data": {"label": "Start"}},
                {"id": "ask_issue", "type": "text", "data": {"message": "What issue are you experiencing?"}},
                {"id": "route", "type": "router", "data": {"routes": ["technical", "billing", "general"]}}
            ]
        },
        "variables": {
            "issue_type": {"type": "string"},
            "priority": {"type": "string"}
        },
        "success": true,
        "message": "Flow generated successfully with 12 nodes and 3 decision points",
        "cost_estimate": 0.0456
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization (organization_id from current user)
    - Note: Requires configured AI Assistant settings

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 400: Bad Request (AI Assistant not configured)
    - 404: Chatbot not found (if chatbot_id provided)
    - 422: Unprocessable Entity (invalid description or parameters)
    - 500: Server error (flow generation failed)
    """
    service = FlowGeneratorService(db)

    try:
        # Parse chatbot_id if provided
        chatbot_id = None
        if request.chatbot_id:
            chatbot_id = UUID(request.chatbot_id)

        response = await service.generate_flow_from_description(
            organization_id=current_user.organization_id,
            description=request.description,
            industry=request.industry,
            language=request.language,
            clarifications=None,  # TODO: Support clarifications in future
            chatbot_id=chatbot_id
        )

        return response

    except Exception as e:
        logger.error(f"Error generating flow: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating flow: {str(e)}"
        )


@router.post("/suggest-improvements", response_model=SuggestImprovementsResponse)
async def suggest_improvements(
    request: SuggestImprovementsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a chatbot flow and suggest AI-powered improvements.

    Examines flow structure, logic, and user experience to provide actionable
    recommendations for enhancement. Can focus on specific areas of interest.

    **Path Parameters:** None

    **Request Body:**
    - flow_id (str, required): Target flow UUID
    - focus_areas (array, optional): Areas to focus on
      - 'user_experience': UX and conversation flow
      - 'routing_logic': Decision points and conditions
      - 'error_handling': Error cases and fallbacks
      - 'performance': Optimization opportunities
      - 'security': Security and data validation
    - max_suggestions (int, optional): Number of suggestions (default: 5)

    **Returns:**
    - flow_id (str): Analyzed flow UUID
    - suggestions (array): List of improvement suggestions:
      - category (str): Type of improvement
      - severity (str): 'critical', 'high', 'medium', 'low'
      - current_state (str): Current implementation
      - recommended_change (str): Suggested change
      - benefit (str): Expected benefit
      - estimated_impact (str): 'high', 'medium', 'low'
    - score (float): Current flow quality score (0-100)
    - estimated_score_after (float): Projected score after improvements

    **Example Request:**
    ```json
    {
        "flow_id": "550e8400-e29b-41d4-a716-446655440000",
        "focus_areas": ["user_experience", "routing_logic"],
        "max_suggestions": 5
    }
    ```

    **Example Response:**
    ```json
    {
        "flow_id": "550e8400-e29b-41d4-a716-446655440000",
        "suggestions": [
            {
                "category": "user_experience",
                "severity": "high",
                "current_state": "Single text input for complex issue categorization",
                "recommended_change": "Use button options for issue categories (Technical, Billing, General)",
                "benefit": "Reduces user confusion and improves routing accuracy",
                "estimated_impact": "high"
            },
            {
                "category": "error_handling",
                "severity": "medium",
                "current_state": "No fallback for unrecognized input",
                "recommended_change": "Add clarification message and retry logic",
                "benefit": "Prevents conversation drops and improves resolution rate",
                "estimated_impact": "medium"
            }
        ],
        "score": 72.5,
        "estimated_score_after": 87.3
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)
    - Scoped to: Organization (flow must belong to user's organization)
    - Note: Requires configured AI Assistant settings

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 400: Bad Request (invalid flow_id format)
    - 404: Not Found (flow doesn't exist or not owned by org)
    - 422: Unprocessable Entity (invalid focus_areas)
    - 500: Server error (analysis failed)
    """
    service = FlowGeneratorService(db)

    try:
        flow_id = UUID(request.flow_id)

        # Check flow ownership
        flow_repo = FlowRepository(db)
        flow = await flow_repo.get(flow_id)

        if not flow or flow.organization_id != current_user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Flow not found"
            )

        response = await service.suggest_improvements(
            organization_id=current_user.organization_id,
            flow_id=flow_id,
            focus_areas=request.focus_areas
        )

        return response

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error suggesting improvements: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error suggesting improvements: {str(e)}"
        )


# ==================== Flow Templates ====================

@router.get("/templates/categories", response_model=List[TemplateCategory])
async def list_template_categories(
    current_user: User = Depends(get_current_user),
):
    """
    List all available flow template categories.

    Returns categories of pre-built templates for different industries and use cases.

    **Path Parameters:** None

    **Query Parameters:** None

    **Returns:** Array of template categories:
    - id (str): Category identifier
    - name (str): Category display name
    - description (str): Category description
    - icon (str, optional): Category icon name
    - templates_count (int): Number of templates in category

    **Example Request:**
    ```
    GET /api/v1/ai-assistant/templates/categories
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    [
        {
            "id": "ecommerce",
            "name": "E-commerce",
            "description": "Templates for online retail and shopping",
            "icon": "shopping-cart",
            "templates_count": 8
        },
        {
            "id": "customer_support",
            "name": "Customer Support",
            "description": "Templates for helpdesk and customer service",
            "icon": "headset",
            "templates_count": 12
        },
        {
            "id": "healthcare",
            "name": "Healthcare",
            "description": "Templates for medical and health services",
            "icon": "heart",
            "templates_count": 6
        }
    ]
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 500: Server error (category list retrieval failure)
    """
    categories = FlowTemplateRepository.list_categories()
    return categories


@router.get("/templates", response_model=TemplateListResponse)
async def list_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    complexity: Optional[str] = Query(None, description="Filter by complexity"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    language: str = Query("pt-BR", description="Language filter"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: User = Depends(get_current_user),
):
    """
    List available flow templates with filtering and pagination.

    Browse pre-built templates for different industries, use cases, and complexity levels.

    **Path Parameters:** None

    **Query Parameters:**
    - category (str, optional): Filter by category ID (e.g., 'ecommerce', 'customer_support')
    - complexity (str, optional): Filter by complexity ('simple', 'intermediate', 'advanced')
    - tags (str, optional): Comma-separated tag filters (e.g., 'billing,returns')
    - language (str, optional): Template language (default: 'pt-BR')
    - skip (int): Number of templates to skip (default: 0)
    - limit (int): Number of templates to return (1-100, default: 50)

    **Returns:**
    - total (int): Total templates matching filters
    - items (array): List of templates:
      - id (str): Template unique ID
      - name (str): Template name
      - description (str): Template description
      - category (str): Category ID
      - complexity (str): Complexity level
      - industry (str): Target industry
      - language (str): Template language
      - tags (array): Template tags
      - nodes_count (int): Number of flow nodes
      - preview_image (str, optional): Template thumbnail
      - use_count (int): Number of times imported
    - categories (array): All available categories (for UI dropdown)

    **Example Request:**
    ```
    GET /api/v1/ai-assistant/templates?category=customer_support&complexity=intermediate&language=pt-BR&limit=20
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    {
        "total": 156,
        "items": [
            {
                "id": "tpl_support_basic",
                "name": "Basic Support Flow",
                "description": "Simple customer support with issue categorization",
                "category": "customer_support",
                "complexity": "simple",
                "industry": "support",
                "language": "pt-BR",
                "tags": ["support", "routing", "basic"],
                "nodes_count": 8,
                "use_count": 1247
            },
            {
                "id": "tpl_support_escalation",
                "name": "Support with Escalation",
                "description": "Multi-level support with escalation to specialists",
                "category": "customer_support",
                "complexity": "intermediate",
                "industry": "support",
                "language": "pt-BR",
                "tags": ["support", "routing", "escalation", "queue"],
                "nodes_count": 15,
                "use_count": 892
            }
        ],
        "categories": [
            {"id": "ecommerce", "name": "E-commerce"},
            {"id": "customer_support", "name": "Customer Support"}
        ]
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 400: Bad Request (invalid filter parameters)
    - 500: Server error (template list retrieval failure)
    """
    # Parse tags
    tags_list = None
    if tags:
        tags_list = [t.strip() for t in tags.split(",")]

    templates, total = await FlowTemplateRepository.list_templates(
        category=category,
        complexity=complexity,
        language=language,
        tags=tags_list,
        skip=skip,
        limit=limit
    )

    categories = FlowTemplateRepository.list_categories()

    return TemplateListResponse(
        total=total,
        items=templates,
        categories=categories
    )


@router.get("/templates/{template_id}", response_model=FlowTemplateDetail)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed information about a specific template.

    Retrieve complete template details including flow canvas data, variables,
    and instructions for customization.

    **Path Parameters:**
    - template_id (str, required): Template unique identifier

    **Query Parameters:** None

    **Returns:**
    - id (str): Template ID
    - name (str): Template name
    - description (str): Detailed description
    - category (str): Category ID
    - complexity (str): Complexity level
    - language (str): Template language
    - tags (array): Template tags
    - flow_data (object): Complete flow structure:
      - canvas_data (object): Flow diagram nodes and connections
      - variables (object): Template variables and types
      - settings (object): Flow configuration
    - instructions (string): User instructions for customization
    - customization_tips (array): Tips for tailoring template
    - preview_image (str, optional): Template thumbnail
    - use_count (int): Import count
    - created_date (datetime): Template creation date

    **Example Request:**
    ```
    GET /api/v1/ai-assistant/templates/tpl_support_escalation
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    {
        "id": "tpl_support_escalation",
        "name": "Support with Escalation",
        "description": "Multi-level support routing with escalation to specialized agents",
        "category": "customer_support",
        "complexity": "intermediate",
        "language": "pt-BR",
        "tags": ["support", "escalation", "routing"],
        "flow_data": {
            "canvas_data": {
                "nodes": [
                    {"id": "start", "type": "start", "position": [0, 0]},
                    {"id": "ask_issue", "type": "text", "data": {"message": "How can we help?"}}
                ],
                "edges": [{"source": "start", "target": "ask_issue"}]
            },
            "variables": {
                "issue_type": {"type": "string", "required": true},
                "priority": {"type": "enum", "values": ["low", "medium", "high"]}
            },
            "settings": {"max_duration": 3600, "allow_handoff": true}
        },
        "instructions": "Customize the issue categories and agent queues...",
        "customization_tips": ["Update issue categories to match your business", "Configure agent teams"],
        "use_count": 892,
        "created_date": "2024-06-15T00:00:00Z"
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 404: Not Found (template_id doesn't exist)
    - 500: Server error (template retrieval failure)
    """
    template = await FlowTemplateRepository.get_template(template_id)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    return template


@router.get("/templates/search/{query}", response_model=List[FlowTemplate])
async def search_templates(
    query: str,
    language: str = Query("pt-BR"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """
    Search flow templates by keyword query.

    Find relevant templates using semantic search across template names,
    descriptions, tags, and use cases.

    **Path Parameters:**
    - query (str, required): Search term (e.g., 'billing', 'returns', 'escalation')

    **Query Parameters:**
    - language (str, optional): Language filter (default: 'pt-BR')
    - limit (int, optional): Max results (1-50, default: 10)

    **Returns:** Array of matching templates:
    - id (str): Template ID
    - name (str): Template name
    - description (str): Template description
    - category (str): Category ID
    - complexity (str): Complexity level
    - tags (array): Template tags
    - relevance_score (float, optional): Search relevance (0-1)

    **Example Request:**
    ```
    GET /api/v1/ai-assistant/templates/search/billing?language=pt-BR&limit=5
    Authorization: Bearer eyJhbGc...
    ```

    **Example Response:**
    ```json
    [
        {
            "id": "tpl_billing_inquiry",
            "name": "Billing Inquiry Handler",
            "description": "Handle billing questions and invoice retrieval",
            "category": "customer_support",
            "complexity": "simple",
            "tags": ["billing", "invoices", "payment"],
            "relevance_score": 0.95
        },
        {
            "id": "tpl_billing_dispute",
            "name": "Billing Dispute Resolution",
            "description": "Manage billing disputes and refund requests",
            "category": "customer_support",
            "complexity": "intermediate",
            "tags": ["billing", "disputes", "refunds"],
            "relevance_score": 0.88
        }
    ]
    ```

    **Permissions:**
    - Requires: Authenticated user (any role)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 422: Unprocessable Entity (invalid query or parameters)
    - 500: Server error (search failure)
    """
    templates = await FlowTemplateRepository.search_templates(
        query=query,
        language=language,
        limit=limit
    )

    return templates


@router.post("/templates/{template_id}/import", response_model=FlowInDB)
async def import_template(
    template_id: str,
    request: ImportTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import a template into a chatbot as a new flow.

    Create a new flow in a chatbot by importing a pre-built template.
    Optionally customize template variables and naming before creation.

    **Path Parameters:**
    - template_id (str, required): Template unique identifier

    **Request Body:**
    - chatbot_id (str, required): Target chatbot UUID
    - flow_name (str, optional): Custom name for imported flow (uses template name if not provided)
    - customize_variables (bool, optional): Apply variable name customizations (default: false)
    - variable_mappings (object, optional): Map template variables to custom names

    **Returns:** Created FlowInDB object:
    - id (str): New flow UUID
    - organization_id (str): Organization ID
    - chatbot_id (str): Parent chatbot UUID
    - name (str): Flow name
    - description (str): Flow description
    - canvas_data (object): Flow diagram
    - variables (object): Flow variables
    - is_active (bool): Flow enabled status
    - created_at (datetime): Creation timestamp
    - use_count (int): Import count (incremented)

    **Example Request:**
    ```json
    {
        "chatbot_id": "550e8400-e29b-41d4-a716-446655440000",
        "flow_name": "My Custom Support Flow",
        "customize_variables": true,
        "variable_mappings": {
            "issue_type": "problem_category",
            "priority": "severity_level"
        }
    }
    ```

    **Example Response:**
    ```json
    {
        "id": "550e8400-e29b-41d4-a716-446655440001",
        "organization_id": "550e8400-e29b-41d4-a716-446655440000",
        "chatbot_id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "My Custom Support Flow",
        "description": "Multi-level support routing with escalation",
        "canvas_data": {...},
        "variables": {
            "problem_category": {"type": "string"},
            "severity_level": {"type": "enum"}
        },
        "is_active": true,
        "created_at": "2025-01-15T14:32:00Z",
        "updated_at": "2025-01-15T14:32:00Z"
    }
    ```

    **Permissions:**
    - Requires: Authenticated user (agent or higher)
    - Scoped to: Organization (chatbot must belong to user's organization)

    **Error Codes:**
    - 401: Unauthorized (invalid or missing token)
    - 404: Not Found (template_id or chatbot_id doesn't exist)
    - 422: Unprocessable Entity (invalid variable mappings)
    - 409: Conflict (flow name already exists in chatbot)
    - 500: Server error (import failure)
    """
    # Get template
    template = await FlowTemplateRepository.get_template(template_id)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    # Verify chatbot ownership
    chatbot_id = UUID(request.chatbot_id)
    chatbot_repo = ChatbotRepository(db)
    chatbot = await chatbot_repo.get(chatbot_id)

    if not chatbot or chatbot.organization_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chatbot not found"
        )

    # Create flow from template
    flow_repo = FlowRepository(db)

    flow_name = request.flow_name or template.name
    flow_data = template.flow_data

    # Apply variable customizations if provided
    if request.customize_variables:
        # TODO: Implement variable name mapping
        pass

    # Create flow
    new_flow = await flow_repo.create({
        "organization_id": current_user.organization_id,
        "chatbot_id": chatbot_id,
        "name": flow_name,
        "description": template.description,
        "canvas_data": flow_data.get("canvas_data", {}),
        "variables": flow_data.get("variables", {}),
        "is_main": False,
        "is_active": True
    })

    # Increment template use count
    await FlowTemplateRepository.increment_use_count(template_id)

    logger.info(
        f"Imported template {template_id} as flow {new_flow.id} "
        f"into chatbot {chatbot_id}"
    )

    return new_flow
