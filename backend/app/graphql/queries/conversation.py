"""
Conversation Queries
"""

from typing import Optional, List
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.conversation import (
    ConversationType,
    MessageType,
    ConversationListResponse,
    ConversationFilterInput,
)
from app.graphql.permissions import require_auth
from app.repositories.conversation import ConversationRepository
from app.repositories.message import MessageRepository


@strawberry.type
class ConversationQuery:
    """Conversation-related queries"""

    @strawberry.field
    @require_auth
    async def conversation(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> ConversationType:
        """Get conversation by ID"""
        context: GraphQLContext = info.context

        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

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

    @strawberry.field
    @require_auth
    async def conversations(
        self,
        info: Info[GraphQLContext, None],
        skip: int = 0,
        limit: int = 10,
        filter: Optional[ConversationFilterInput] = None,
    ) -> ConversationListResponse:
        """List conversations with filters"""
        context: GraphQLContext = info.context

        conv_repo = ConversationRepository(context.db)
        conversations = await conv_repo.get_by_organization(context.organization_id)

        # Apply filters
        if filter:
            if filter.status:
                conversations = [c for c in conversations if c.status == filter.status]
            if filter.queue_id:
                conversations = [c for c in conversations if c.queue_id and str(c.queue_id) == filter.queue_id]
            if filter.assigned_agent_id:
                conversations = [c for c in conversations if c.assigned_agent_id and str(c.assigned_agent_id) == filter.assigned_agent_id]
            if filter.contact_id:
                conversations = [c for c in conversations if str(c.contact_id) == filter.contact_id]

        total = len(conversations)
        conversations = conversations[skip : skip + limit]

        conv_types = [
            ConversationType(
                id=strawberry.ID(str(c.id)),
                organization_id=strawberry.ID(str(c.organization_id)),
                contact_id=strawberry.ID(str(c.contact_id)),
                queue_id=strawberry.ID(str(c.queue_id)) if c.queue_id else None,
                assigned_agent_id=strawberry.ID(str(c.assigned_agent_id)) if c.assigned_agent_id else None,
                whatsapp_number_id=strawberry.ID(str(c.whatsapp_number_id)),
                status=c.status,
                last_message_at=c.last_message_at,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in conversations
        ]

        return ConversationListResponse(
            conversations=conv_types,
            total=total,
            skip=skip,
            limit=limit,
        )

    @strawberry.field
    @require_auth
    async def conversation_messages(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
        skip: int = 0,
        limit: int = 50,
    ) -> List[MessageType]:
        """Get messages for a conversation"""
        context: GraphQLContext = info.context

        # Verify conversation exists and belongs to organization
        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(conversation_id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Get messages
        message_repo = MessageRepository(context.db)
        messages = await message_repo.get_by_conversation(UUID(conversation_id))

        # Apply pagination
        messages = messages[skip : skip + limit]

        return [
            MessageType(
                id=strawberry.ID(str(m.id)),
                conversation_id=strawberry.ID(str(m.conversation_id)),
                sender_type=m.sender_type,
                sender_id=strawberry.ID(str(m.sender_id)) if m.sender_id else None,
                content=m.content,
                media_url=m.media_url,
                media_type=m.media_type,
                is_read=m.is_read,
                created_at=m.created_at,
            )
            for m in messages
        ]
