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

    @strawberry.mutation
    @require_auth
    async def activate_flow_in_conversation(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
        flow_id: strawberry.ID,
    ) -> ConversationType:
        """Activate a flow in a conversation (switch to another flow)"""
        context: GraphQLContext = info.context

        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(conversation_id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Update conversation with new flow
        from datetime import datetime
        
        conv.active_flow_id = UUID(flow_id)
        conv.updated_at = datetime.utcnow()
        
        # Get start node of the flow to set current_node_id
        try:
            from app.repositories.chatbot import FlowRepository
            
            flow_repo = FlowRepository(context.db)
            flow = await flow_repo.get_by_id(UUID(flow_id), context.organization_id)
            
            if flow and flow.nodes:
                # Find start node
                for node in flow.nodes:
                    if node.node_type == "start":
                        conv.current_node_id = node.id
                        break
        except Exception as e:
            # Log but don't fail - flow will still be activated even without start node
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Could not set start node for flow: {e}")
        
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
    async def deactivate_flow_in_conversation(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
    ) -> ConversationType:
        """Deactivate/pause flow in a conversation (hand off to human)"""
        context: GraphQLContext = info.context

        conv_repo = ConversationRepository(context.db)
        conv = await conv_repo.get_by_id(UUID(conversation_id), context.organization_id)

        if not conv:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found"
            )

        # Clear flow and set is_bot_active to False
        from datetime import datetime
        
        conv.active_flow_id = None
        conv.current_node_id = None
        conv.is_bot_active = False
        conv.updated_at = datetime.utcnow()
        
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
    async def execute_jump_to_flow(
        self,
        info: Info[GraphQLContext, None],
        conversation_id: strawberry.ID,
        node_id: strawberry.ID,
    ) -> ConversationType:
        """Execute a jump_to_flow node and transition conversation to target flow"""
        context: GraphQLContext = info.context

        from app.services.flow_engine import FlowEngineService

        # Execute jump transition
        flow_engine = FlowEngineService(context.db)
        updated_conv = await flow_engine.execute_jump_to_flow(
            UUID(conversation_id), UUID(node_id), context.organization_id
        )

        if not updated_conv:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to execute flow transition"
            )

        return ConversationType(
            id=strawberry.ID(str(updated_conv.id)),
            organization_id=strawberry.ID(str(updated_conv.organization_id)),
            contact_id=strawberry.ID(str(updated_conv.contact_id)),
            queue_id=strawberry.ID(str(updated_conv.queue_id)) if updated_conv.queue_id else None,
            assigned_agent_id=strawberry.ID(str(updated_conv.assigned_agent_id)) if updated_conv.assigned_agent_id else None,
            whatsapp_number_id=strawberry.ID(str(updated_conv.whatsapp_number_id)),
            status=updated_conv.status,
            last_message_at=updated_conv.last_message_at,
            created_at=updated_conv.created_at,
            updated_at=updated_conv.updated_at,
        )
