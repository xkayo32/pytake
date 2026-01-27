"""
Chatbot Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.chatbot import ChatbotType, ChatbotCreateInput, ChatbotUpdateInput
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth, require_role
from app.repositories.chatbot import ChatbotRepository
from app.schemas.chatbot import ChatbotCreate, ChatbotUpdate


@strawberry.type
class ChatbotMutation:
    """Chatbot-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_chatbot(
        self,
        info: Info[GraphQLContext, None],
        input: ChatbotCreateInput,
    ) -> ChatbotType:
        """Create new chatbot"""
        context: GraphQLContext = info.context

        chatbot_repo = ChatbotRepository(context.db)

        chatbot_data = ChatbotCreate(
            name=input.name,
            description=input.description,
            greeting_message=input.greeting_message,
            fallback_message=input.fallback_message,
            organization_id=context.organization_id,
        )

        chatbot = await chatbot_repo.create(chatbot_data, context.organization_id)

        return ChatbotType(
            id=strawberry.ID(str(chatbot.id)),
            organization_id=strawberry.ID(str(chatbot.organization_id)),
            name=chatbot.name,
            description=chatbot.description,
            is_active=chatbot.is_active,
            greeting_message=chatbot.greeting_message,
            fallback_message=chatbot.fallback_message,
            created_at=chatbot.created_at,
            updated_at=chatbot.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def update_chatbot(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: ChatbotUpdateInput,
    ) -> ChatbotType:
        """Update chatbot"""
        context: GraphQLContext = info.context

        chatbot_repo = ChatbotRepository(context.db)

        update_data = ChatbotUpdate(
            name=input.name,
            description=input.description,
            is_active=input.is_active,
            greeting_message=input.greeting_message,
            fallback_message=input.fallback_message,
        )

        chatbot = await chatbot_repo.update(UUID(id), update_data, context.organization_id)

        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )

        return ChatbotType(
            id=strawberry.ID(str(chatbot.id)),
            organization_id=strawberry.ID(str(chatbot.organization_id)),
            name=chatbot.name,
            description=chatbot.description,
            is_active=chatbot.is_active,
            greeting_message=chatbot.greeting_message,
            fallback_message=chatbot.fallback_message,
            created_at=chatbot.created_at,
            updated_at=chatbot.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_chatbot(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete chatbot"""
        context: GraphQLContext = info.context

        chatbot_repo = ChatbotRepository(context.db)
        success = await chatbot_repo.delete(UUID(id), context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )

        return SuccessResponse(
            success=True,
            message="Chatbot deleted successfully"
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def activate_chatbot(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> ChatbotType:
        """Activate chatbot"""
        context: GraphQLContext = info.context

        chatbot_repo = ChatbotRepository(context.db)
        chatbot = await chatbot_repo.get_by_id(UUID(id), context.organization_id)

        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )

        chatbot.is_active = True
        await context.db.commit()
        await context.db.refresh(chatbot)

        return ChatbotType(
            id=strawberry.ID(str(chatbot.id)),
            organization_id=strawberry.ID(str(chatbot.organization_id)),
            name=chatbot.name,
            description=chatbot.description,
            is_active=chatbot.is_active,
            greeting_message=chatbot.greeting_message,
            fallback_message=chatbot.fallback_message,
            created_at=chatbot.created_at,
            updated_at=chatbot.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def deactivate_chatbot(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> ChatbotType:
        """Deactivate chatbot"""
        context: GraphQLContext = info.context

        chatbot_repo = ChatbotRepository(context.db)
        chatbot = await chatbot_repo.get_by_id(UUID(id), context.organization_id)

        if not chatbot:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chatbot not found"
            )

        chatbot.is_active = False
        await context.db.commit()
        await context.db.refresh(chatbot)

        return ChatbotType(
            id=strawberry.ID(str(chatbot.id)),
            organization_id=strawberry.ID(str(chatbot.organization_id)),
            name=chatbot.name,
            description=chatbot.description,
            is_active=chatbot.is_active,
            greeting_message=chatbot.greeting_message,
            fallback_message=chatbot.fallback_message,
            created_at=chatbot.created_at,
            updated_at=chatbot.updated_at,
        )
