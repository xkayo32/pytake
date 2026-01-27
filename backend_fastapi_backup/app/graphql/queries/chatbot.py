"""
Chatbot Queries
"""

from typing import List, Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.chatbot import ChatbotType, ChatbotStats
from app.graphql.permissions import require_auth
from app.repositories.chatbot import ChatbotRepository


@strawberry.type
class ChatbotQuery:
    """Chatbot-related queries"""

    @strawberry.field
    @require_auth
    async def chatbot(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> ChatbotType:
        """Get chatbot by ID"""
        context: GraphQLContext = info.context

        chatbot_repo = ChatbotRepository(context.db)
        chatbot = await chatbot_repo.get_by_id(UUID(id), context.organization_id)

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

    @strawberry.field
    @require_auth
    async def chatbots(
        self,
        info: Info[GraphQLContext, None],
        is_active: Optional[bool] = None,
    ) -> List[ChatbotType]:
        """List chatbots"""
        context: GraphQLContext = info.context

        chatbot_repo = ChatbotRepository(context.db)
        chatbots = await chatbot_repo.get_by_organization(context.organization_id)

        if is_active is not None:
            chatbots = [c for c in chatbots if c.is_active == is_active]

        return [
            ChatbotType(
                id=strawberry.ID(str(c.id)),
                organization_id=strawberry.ID(str(c.organization_id)),
                name=c.name,
                description=c.description,
                is_active=c.is_active,
                greeting_message=c.greeting_message,
                fallback_message=c.fallback_message,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in chatbots
        ]
