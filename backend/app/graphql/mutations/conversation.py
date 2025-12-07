"""
Conversation Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.conversation import (
    ConversationType,
    MessageType,
    SendMessageInput,
    AssignConversationInput,
)
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth
from app.repositories.conversation import ConversationRepository, MessageRepository
from app.schemas.conversation import MessageCreate


@strawberry.type
class ConversationMutation:
    """Conversation-related mutations"""

    @strawberry.mutation
    @require_auth
    async def send_message(
        self,
        info: Info[GraphQLContext, None],
        input: SendMessageInput,
    ) -> MessageType:
        """Send message in conversation"""
        context: GraphQLContext = info.context

        # Verify conversation exists
        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(input.conversation_id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Create message
        message_repo = MessageRepository(context.db)
        message_data = MessageCreate(
            conversation_id=UUID(input.conversation_id),
            sender_type="agent",
            sender_id=context.user_id,
            content=input.content,
            media_url=input.media_url,
            media_type=input.media_type,
        )

        message = await message_repo.create(message_data)

        return MessageType(
            id=strawberry.ID(str(message.id)),
            conversation_id=strawberry.ID(str(message.conversation_id)),
            sender_type=message.sender_type,
            sender_id=strawberry.ID(str(message.sender_id)) if message.sender_id else None,
            content=message.content,
            media_url=message.media_url,
            media_type=message.media_type,
            is_read=message.is_read,
            created_at=message.created_at,
        )

    @strawberry.mutation
    @require_auth
    async def assign_conversation(
        self,
        info: Info[GraphQLContext, None],
        input: AssignConversationInput,
    ) -> ConversationType:
        """Assign conversation to agent"""
        context: GraphQLContext = info.context

        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(input.conversation_id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Assign
        conv.assigned_agent_id = UUID(input.agent_id)
        if input.queue_id:
            conv.queue_id = UUID(input.queue_id)

        await context.db.commit()
        await context.db.refresh(conv)

        return ConversationType(
            id=strawberry.ID(str(conv.id)),
            organization_id=strawberry.ID(str(conv.organization_id)),
            contact_id=strawberry.ID(str(conv.contact_id)),
            queue_id=strawberry.ID(str(conv.queue_id)) if conv.queue_id else None,
            assigned_agent_id=strawberry.ID(str(conv.assigned_agent_id)) if conv.assigned_agent_id else None,
            whatsapp_number_id=strawberry.ID(str(conv.whatsapp_number_id)),
            status=conv.status,
            last_message_at=conv.last_message_at,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        )

    @strawberry.mutation
    @require_auth
    async def close_conversation(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
    ) -> ConversationType:
        """Close conversation"""
        context: GraphQLContext = info.context

        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(conversation_id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        conv.status = "closed"
        await context.db.commit()
        await context.db.refresh(conv)

        return ConversationType(
            id=strawberry.ID(str(conv.id)),
            organization_id=strawberry.ID(str(conv.organization_id)),
            contact_id=strawberry.ID(str(conv.contact_id)),
            queue_id=strawberry.ID(str(conv.queue_id)) if conv.queue_id else None,
            assigned_agent_id=strawberry.ID(str(conv.assigned_agent_id)) if conv.assigned_agent_id else None,
            whatsapp_number_id=strawberry.ID(str(conv.whatsapp_number_id)),
            status=conv.status,
            last_message_at=conv.last_message_at,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        )

    @strawberry.mutation
    @require_auth
    async def reopen_conversation(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
    ) -> ConversationType:
        """Reopen closed conversation"""
        context: GraphQLContext = info.context

        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(conversation_id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        conv.status = "active"
        await context.db.commit()
        await context.db.refresh(conv)

        return ConversationType(
            id=strawberry.ID(str(conv.id)),
            organization_id=strawberry.ID(str(conv.organization_id)),
            contact_id=strawberry.ID(str(conv.contact_id)),
            queue_id=strawberry.ID(str(conv.queue_id)) if conv.queue_id else None,
            assigned_agent_id=strawberry.ID(str(conv.assigned_agent_id)) if conv.assigned_agent_id else None,
            whatsapp_number_id=strawberry.ID(str(conv.whatsapp_number_id)),
            status=conv.status,
            last_message_at=conv.last_message_at,
            created_at=conv.created_at,
            updated_at=conv.updated_at,
        )
