"""
AI Assistant Queries
"""

from typing import List, Optional

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth
from app.graphql.types.ai_assistant import AIAssistantSettingsType, AIModelType, AIProviderEnum
from app.repositories.organization import OrganizationRepository
from app.data.ai_models import get_all_models, get_models_by_provider


@strawberry.type
class AIAssistantQuery:
    """AI Assistant-related queries"""

    @strawberry.field
    @require_auth
    async def ai_settings(
        self,
        info: Info[GraphQLContext, None],
    ) -> Optional[AIAssistantSettingsType]:
        """Get AI Assistant settings for organization"""
        context: GraphQLContext = info.context

        org_repo = OrganizationRepository(context.db)
        org = await org_repo.get(context.organization_id)

        if not org:
            return None

        ai_settings = org.settings.get("ai_assistant")

        if not ai_settings:
            return None

        # Convert provider
        provider = AIProviderEnum.ANTHROPIC
        if ai_settings.get("default_provider") == "openai":
            provider = AIProviderEnum.OPENAI

        return AIAssistantSettingsType(
            enabled=ai_settings.get("enabled", False),
            default_provider=provider,
            model=ai_settings.get("model", "claude-3-5-sonnet-20241022"),
            max_tokens=ai_settings.get("max_tokens", 8192),
            temperature=ai_settings.get("temperature", 0.7),
        )

    @strawberry.field
    @require_auth
    async def ai_models(
        self,
        info: Info[GraphQLContext, None],
        provider: Optional[AIProviderEnum] = None,
    ) -> List[AIModelType]:
        """List available AI models"""
        context: GraphQLContext = info.context

        # Get models from data/ai_models.py
        if provider:
            provider_str = "openai" if provider == AIProviderEnum.OPENAI else "anthropic"
            models = get_models_by_provider(provider_str)
        else:
            models = get_all_models()

        result = []
        for i, model_data in enumerate(models):
            provider_enum = AIProviderEnum.ANTHROPIC
            if model_data["provider"] == "openai":
                provider_enum = AIProviderEnum.OPENAI

            result.append(
                AIModelType(
                    id=strawberry.ID(f"model_{i}"),
                    model_id=model_data["model_id"],
                    provider=provider_enum,
                    name=model_data["name"],
                    description=model_data.get("description"),
                    context_window=model_data["context_window"],
                    max_output_tokens=model_data["max_output_tokens"],
                    input_cost_per_million=model_data["input_cost_per_million"],
                    output_cost_per_million=model_data["output_cost_per_million"],
                    supports_vision=model_data.get("supports_vision", False),
                    supports_tools=model_data.get("supports_tools", True),
                    is_custom=model_data.get("is_custom", False),
                    is_deprecated=model_data.get("is_deprecated", False),
                )
            )

        return result
