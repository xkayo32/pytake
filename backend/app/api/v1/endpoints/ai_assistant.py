"""
AI Assistant & Flow Templates API Endpoints
"""

import logging
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

import httpx

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ai_assistant import (
    AIProvider,
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

@router.get(
    "/models",
    response_model=AIModelListResponse,
    summary="Listar modelos de IA",
    description="Lista todos os modelos de IA disponíveis (predefinidos + customizados). Retorna modelos de todos os providers com preços e capacidades.",
    responses={
        200: {"description": "Lista de modelos de IA"},
        401: {"description": "Não autenticado"}
    }
)
async def list_ai_models(
    provider: Optional[str] = Query(None, description="Filter by provider (openai, anthropic)"),
    recommended: bool = Query(False, description="Show only recommended models"),
    include_deprecated: bool = Query(False, description="Include deprecated models"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all available AI models (predefined + custom).

    Returns models from both providers with pricing and capabilities.
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

    # Add custom models from database (organization-specific)
    from app.repositories.ai_custom_model import AICustomModelRepository

    repo = AICustomModelRepository(db)
    custom_models = await repo.get_by_organization(
        organization_id=current_user.organization_id,
        provider=provider if provider else None,
        is_active=True
    )

    for custom in custom_models:
        model = AIModel(
            id=str(custom.id),
            organization_id=str(custom.organization_id),
            created_at=custom.created_at.isoformat(),
            is_custom=True,
            model_id=custom.model_id,
            provider=AIProvider(custom.provider),
            name=custom.name,
            description=custom.description,
            context_window=custom.context_window,
            max_output_tokens=custom.max_output_tokens,
            input_cost_per_million=custom.input_cost_per_million,
            output_cost_per_million=custom.output_cost_per_million,
            supports_vision=custom.supports_vision,
            supports_tools=custom.supports_tools,
            is_deprecated=False,
            release_date=custom.release_date,
        )
        models.append(model)

    return AIModelListResponse(
        models=models,
        total=len(models)
    )


@router.get(
    "/models/{model_id}",
    summary="Obter detalhes do modelo",
    description="Retorna informações detalhadas sobre um modelo de IA específico.",
    responses={
        200: {"description": "Detalhes do modelo"},
        401: {"description": "Não autenticado"},
        404: {"description": "Modelo não encontrado"}
    }
)
async def get_model_details(
    model_id: str,
    current_user: User = Depends(get_current_user),
):
    """Get detailed information about a specific model"""
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


@router.post(
    "/models/custom",
    response_model=AIModel,
    status_code=status.HTTP_201_CREATED,
    summary="Criar modelo customizado",
    description="Cria um modelo de IA customizado para sua organização. Útil para modelos fine-tuned ou novos modelos. Apenas org_admin pode criar.",
    responses={
        201: {"description": "Modelo customizado criado"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas admins)"}
    }
)
async def create_custom_model(
    model: AIModelCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a custom AI model for your organization.

    Useful for adding fine-tuned models or new models not in the predefined list.
    Only org_admin can create custom models.
    """
    # Check permission
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create custom models"
        )

    # Import repository
    from app.repositories.ai_custom_model import AICustomModelRepository
    from app.models.ai_custom_model import AICustomModel

    repo = AICustomModelRepository(db)

    # Check if model_id already exists for this organization
    existing = await repo.model_exists(
        organization_id=current_user.organization_id,
        model_id=model.model_id
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Model with ID '{model.model_id}' already exists for your organization"
        )

    # Create new custom model
    new_model = AICustomModel(
        organization_id=current_user.organization_id,
        model_id=model.model_id,
        provider=model.provider.value,
        name=model.name,
        description=model.description,
        context_window=model.context_window,
        max_output_tokens=model.max_output_tokens,
        input_cost_per_million=model.input_cost_per_million,
        output_cost_per_million=model.output_cost_per_million,
        supports_vision=model.supports_vision,
        supports_tools=model.supports_tools,
        release_date=model.release_date,
        is_active=True,
    )

    db.add(new_model)
    await db.commit()
    await db.refresh(new_model)

    # Return as AIModel schema
    return AIModel(
        id=str(new_model.id),
        organization_id=str(new_model.organization_id),
        created_at=new_model.created_at.isoformat(),
        is_custom=True,
        model_id=new_model.model_id,
        provider=AIProvider(new_model.provider),
        name=new_model.name,
        description=new_model.description,
        context_window=new_model.context_window,
        max_output_tokens=new_model.max_output_tokens,
        input_cost_per_million=new_model.input_cost_per_million,
        output_cost_per_million=new_model.output_cost_per_million,
        supports_vision=new_model.supports_vision,
        supports_tools=new_model.supports_tools,
        is_deprecated=False,
        release_date=new_model.release_date,
    )


# ==================== AI Assistant Settings ====================

@router.get(
    "/settings",
    response_model=Optional[AIAssistantSettings],
    summary="Obter configurações de IA",
    description="Retorna as configurações do AI Assistant para a organização. Retorna None se não configurado.",
    responses={
        200: {"description": "Configurações de IA (ou null se não configurado)"},
        401: {"description": "Não autenticado"},
        404: {"description": "Organização não encontrada"}
    }
)
async def get_ai_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get AI Assistant settings for the organization.

    Returns None if not configured.
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


@router.post(
    "/settings",
    response_model=AIAssistantSettings,
    summary="Atualizar configurações de IA",
    description="Atualiza as configurações do AI Assistant para a organização. Apenas org_admin pode atualizar.",
    responses={
        200: {"description": "Configurações atualizadas"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas admins)"},
        404: {"description": "Organização não encontrada"},
        422: {"description": "Configurações inválidas"}
    }
)
async def update_ai_settings(
    settings: AIAssistantSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update AI Assistant settings for the organization.

    Only org_admin can update settings.
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
        provider_value = provider.value if isinstance(provider, AIProvider) else provider

        if provider_value == 'openai':
            update_data['openai_api_key'] = api_key
        elif provider_value == 'anthropic':
            update_data['anthropic_api_key'] = api_key
        elif provider_value == 'anythingllm':
            update_data['anythingllm_api_key'] = api_key

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


@router.post(
    "/test",
    summary="Testar conexão com IA",
    description="Testa a conexão com o provider de IA configurado. Valida API keys e faz uma chamada de teste.",
    responses={
        200: {"description": "Conexão bem-sucedida", "content": {"application/json": {"example": {"success": True, "provider": "anthropic", "message": "Connection successful!"}}}},
        400: {"description": "IA não configurada"},
        401: {"description": "API key inválida"},
        403: {"description": "Sem permissão (apenas admins)"},
        429: {"description": "Rate limit excedido"}
    }
)
async def test_ai_connection(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Test AI connection with current settings.

    Validates API keys and makes a simple test call to verify connectivity.
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
        if settings.default_provider == AIProvider.ANTHROPIC:
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

        elif settings.default_provider == AIProvider.OPENAI:
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

        elif settings.default_provider == AIProvider.ANYTHINGLLM:
            if not settings.has_anythingllm_configuration:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="AnythingLLM API não configurada"
                )

            base_url = settings.anythingllm_base_url.rstrip("/")
            headers = {
                "Authorization": f"Bearer {settings.anythingllm_api_key}",
                "Content-Type": "application/json"
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(f"{base_url}/v1/workspaces", headers=headers)
                if response.status_code not in (200, 204):
                    raise HTTPException(
                        status_code=status.HTTP_502_BAD_GATEWAY,
                        detail="Não foi possível conectar ao AnythingLLM"
                    )

            return {
                "success": True,
                "provider": "anythingllm",
                "message": "Connection successful! AnythingLLM API is working."
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

@router.post(
    "/generate-flow",
    response_model=GenerateFlowResponse,
    summary="Gerar flow com IA",
    description="Gera um flow a partir de descrição em linguagem natural usando IA. Requer AI Assistant configurado e habilitado.",
    responses={
        200: {"description": "Flow gerado com sucesso"},
        401: {"description": "Não autenticado"},
        500: {"description": "Erro ao gerar flow"}
    }
)
async def generate_flow(
    request: GenerateFlowRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Generate a flow from natural language description using AI.

    Requires AI Assistant to be configured and enabled.
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


@router.post(
    "/suggest-improvements",
    response_model=SuggestImprovementsResponse,
    summary="Sugerir melhorias no flow",
    description="Analisa um flow existente e sugere melhorias usando IA. Requer AI Assistant configurado.",
    responses={
        200: {"description": "Sugestões de melhoria"},
        400: {"description": "Dados inválidos"},
        401: {"description": "Não autenticado"},
        404: {"description": "Flow não encontrado"}
    }
)
async def suggest_improvements(
    request: SuggestImprovementsRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze a flow and suggest improvements using AI.

    Requires AI Assistant to be configured and enabled.
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

@router.get(
    "/templates/categories",
    response_model=List[TemplateCategory],
    summary="Listar categorias de templates",
    description="Lista todas as categorias de templates de flow disponíveis.",
    responses={
        200: {"description": "Lista de categorias"},
        401: {"description": "Não autenticado"}
    }
)
async def list_template_categories(
    current_user: User = Depends(get_current_user),
):
    """
    List all template categories.
    """
    categories = FlowTemplateRepository.list_categories()
    return categories


@router.get(
    "/templates",
    response_model=TemplateListResponse,
    summary="Listar templates de flow",
    description="Lista templates de flow disponíveis com suporte a filtros por categoria, complexidade e tags.",
    responses={
        200: {"description": "Lista paginada de templates"},
        401: {"description": "Não autenticado"}
    }
)
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
    List available flow templates with filters.
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


@router.get(
    "/templates/{template_id}",
    response_model=FlowTemplateDetail,
    summary="Obter template por ID",
    description="Retorna um template específico com dados completos do flow.",
    responses={
        200: {"description": "Detalhes do template"},
        401: {"description": "Não autenticado"},
        404: {"description": "Template não encontrado"}
    }
)
async def get_template(
    template_id: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific template by ID with full flow data.
    """
    template = await FlowTemplateRepository.get_template(template_id)

    if not template:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Template not found"
        )

    return template


@router.get(
    "/templates/search/{query}",
    response_model=List[FlowTemplate],
    summary="Buscar templates",
    description="Busca templates de flow por termo de pesquisa.",
    responses={
        200: {"description": "Templates encontrados"},
        401: {"description": "Não autenticado"}
    }
)
async def search_templates(
    query: str,
    language: str = Query("pt-BR"),
    limit: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
):
    """
    Search templates by query string.
    """
    templates = await FlowTemplateRepository.search_templates(
        query=query,
        language=language,
        limit=limit
    )

    return templates


@router.post(
    "/templates/{template_id}/import",
    response_model=FlowInDB,
    summary="Importar template",
    description="Importa um template como um novo flow em um chatbot existente.",
    responses={
        200: {"description": "Flow criado a partir do template"},
        401: {"description": "Não autenticado"},
        404: {"description": "Template ou chatbot não encontrado"}
    }
)
async def import_template(
    template_id: str,
    request: ImportTemplateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Import a template into a chatbot as a new flow.
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
