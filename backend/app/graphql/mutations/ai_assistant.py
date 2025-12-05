"""
AI Assistant Mutations
"""

from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth, require_role
from app.graphql.types.ai_assistant import (
    AIAssistantSettingsType,
    AIAssistantSettingsUpdateInput,
    GenerateFlowInput,
    GenerateFlowResponseType,
    AIProviderEnum,
)
from app.repositories.organization import OrganizationRepository
from app.schemas.ai_assistant import AIAssistantSettings, AIAssistantSettingsUpdate
from app.models.organization import Organization


@strawberry.type
class AIAssistantMutation:
    """AI Assistant-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def update_ai_settings(
        self,
        info: Info[GraphQLContext, None],
        input: AIAssistantSettingsUpdateInput,
    ) -> AIAssistantSettingsType:
        """Update AI Assistant settings"""
        context: GraphQLContext = info.context

        org_repo = OrganizationRepository(context.db)
        org = await org_repo.get(context.organization_id)

        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found"
            )

        # Get current settings or create new
        current_settings = org.settings.get("ai_assistant", {})

        # Update with new values
        if input.enabled is not None:
            current_settings["enabled"] = input.enabled
        if input.default_provider is not None:
            current_settings["default_provider"] = (
                "openai" if input.default_provider == AIProviderEnum.OPENAI else "anthropic"
            )
        if input.openai_api_key is not None:
            current_settings["openai_api_key"] = input.openai_api_key
        if input.anthropic_api_key is not None:
            current_settings["anthropic_api_key"] = input.anthropic_api_key
        if input.model is not None:
            current_settings["model"] = input.model
        if input.max_tokens is not None:
            current_settings["max_tokens"] = input.max_tokens
        if input.temperature is not None:
            current_settings["temperature"] = input.temperature

        # Update organization
        new_settings = org.settings.copy()
        new_settings["ai_assistant"] = current_settings

        await org_repo.update(org.id, {"settings": new_settings})

        # Return updated settings
        provider = AIProviderEnum.ANTHROPIC
        if current_settings.get("default_provider") == "openai":
            provider = AIProviderEnum.OPENAI

        return AIAssistantSettingsType(
            enabled=current_settings.get("enabled", False),
            default_provider=provider,
            model=current_settings.get("model", "claude-3-5-sonnet-20241022"),
            max_tokens=current_settings.get("max_tokens", 8192),
            temperature=current_settings.get("temperature", 0.7),
        )

    @strawberry.mutation
    @require_auth
    async def generate_flow(
        self,
        info: Info[GraphQLContext, None],
        input: GenerateFlowInput,
    ) -> GenerateFlowResponseType:
        """Generate flow from natural language description using AI"""
        context: GraphQLContext = info.context

        from app.services.flow_generator_service import FlowGeneratorService

        service = FlowGeneratorService(context.db)

        try:
            chatbot_id = None
            if input.chatbot_id:
                chatbot_id = UUID(input.chatbot_id)

            response = await service.generate_flow_from_description(
                organization_id=context.organization_id,
                description=input.description,
                industry=input.industry,
                language=input.language,
                clarifications=None,
                chatbot_id=chatbot_id,
            )

            return GenerateFlowResponseType(
                status=response.status,
                flow_data=response.flow_data,
                error_message=response.error_message,
            )

        except Exception as e:
            return GenerateFlowResponseType(
                status="error",
                flow_data=None,
                error_message=str(e),
            )
