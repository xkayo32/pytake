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

logger = logging.getLogger(__name__)

router = APIRouter()


# ==================== AI Assistant Settings ====================

@router.get("/settings", response_model=Optional[AIAssistantSettings])
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


@router.post("/settings", response_model=AIAssistantSettings)
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


# ==================== Flow Generation ====================

@router.post("/generate-flow", response_model=GenerateFlowResponse)
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
        response = await service.generate_flow_from_description(
            organization_id=current_user.organization_id,
            description=request.description,
            industry=request.industry,
            language=request.language,
            clarifications=None  # TODO: Support clarifications in future
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

@router.get("/templates/categories", response_model=List[TemplateCategory])
async def list_template_categories(
    current_user: User = Depends(get_current_user),
):
    """
    List all template categories.
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


@router.get("/templates/{template_id}", response_model=FlowTemplateDetail)
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


@router.get("/templates/search/{query}", response_model=List[FlowTemplate])
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


@router.post("/templates/{template_id}/import", response_model=FlowInDB)
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
