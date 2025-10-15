"""
Conversation Service
Business logic for conversation and message management
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.conversation import Conversation, Message
from app.repositories.conversation import ConversationRepository, MessageRepository
from app.repositories.contact import ContactRepository
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    MessageCreate,
)
from app.core.exceptions import NotFoundException


class ConversationService:
    """Service for conversation management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ConversationRepository(db)
        self.message_repo = MessageRepository(db)
        self.contact_repo = ContactRepository(db)

    async def get_by_id(
        self, conversation_id: UUID, organization_id: UUID
    ) -> Conversation:
        """Get conversation by ID"""
        conversation = await self.repo.get_with_contact(conversation_id, organization_id)
        if not conversation:
            raise NotFoundException("Conversation not found")
        return conversation

    async def list_conversations(
        self,
        organization_id: UUID,
        status: Optional[str] = None,
        assigned_agent_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Conversation]:
        """List conversations"""
        return await self.repo.list_conversations(
            organization_id=organization_id,
            status=status,
            assigned_agent_id=assigned_agent_id,
            skip=skip,
            limit=limit,
        )

    async def create_conversation(
        self, data: ConversationCreate, organization_id: UUID, user_id: UUID
    ) -> Conversation:
        """Create new conversation"""
        # Verify contact exists
        contact = await self.contact_repo.get(data.contact_id)
        if not contact or contact.organization_id != organization_id:
            raise NotFoundException("Contact not found")

        # Create conversation
        conversation_data = {
            "organization_id": organization_id,
            "contact_id": data.contact_id,
            "whatsapp_number_id": data.whatsapp_number_id,
            "status": "open",
            "priority": "medium",
            "channel": "whatsapp",
            "total_messages": 0,
            "unread_count": 0,
        }

        conversation = await self.repo.create(conversation_data)

        # Create initial message if provided
        if data.initial_message:
            await self.send_message(
                conversation_id=conversation.id,
                data=data.initial_message,
                organization_id=organization_id,
                sender_id=user_id,
            )

        return conversation

    async def update_conversation(
        self, conversation_id: UUID, data: ConversationUpdate, organization_id: UUID
    ) -> Conversation:
        """Update conversation"""
        conversation = await self.get_by_id(conversation_id, organization_id)

        update_data = data.model_dump(exclude_unset=True)

        if "status" in update_data:
            if update_data["status"] == "resolved":
                update_data["resolved_at"] = datetime.utcnow()
            elif update_data["status"] == "closed":
                update_data["closed_at"] = datetime.utcnow()

        updated = await self.repo.update(conversation_id, update_data)
        return updated

    async def send_message(
        self,
        conversation_id: UUID,
        data: MessageCreate,
        organization_id: UUID,
        sender_id: UUID,
    ) -> Message:
        """Send a message in a conversation"""
        conversation = await self.get_by_id(conversation_id, organization_id)

        message_data = {
            "conversation_id": conversation_id,
            "contact_id": conversation.contact_id,
            "organization_id": organization_id,
            "whatsapp_number_id": conversation.whatsapp_number_id,
            "content": data.content,
            "media_url": data.media_url,
            "media_type": data.media_type,
            "media_caption": data.media_caption,
            "direction": "outbound",
            "status": "pending",
            "message_type": "text" if not data.media_url else data.media_type,
            "sender_id": sender_id,
        }

        message = await self.message_repo.create(message_data)

        # Update conversation
        await self.repo.update(
            conversation_id,
            {
                "last_message_at": datetime.utcnow(),
                "last_outbound_at": datetime.utcnow(),
            },
        )
        await self.repo.increment_message_count(conversation_id)

        return message

    async def get_messages(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Message]:
        """Get messages for a conversation"""
        # Verify conversation exists and belongs to organization
        await self.get_by_id(conversation_id, organization_id)

        return await self.message_repo.get_conversation_messages(
            conversation_id=conversation_id,
            organization_id=organization_id,
            skip=skip,
            limit=limit,
        )

    async def mark_as_read(
        self, conversation_id: UUID, organization_id: UUID
    ) -> Conversation:
        """Mark conversation as read"""
        conversation = await self.get_by_id(conversation_id, organization_id)
        return await self.repo.mark_as_read(conversation_id, organization_id)

    async def get_queue(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Conversation]:
        """Get conversations in queue"""
        return await self.repo.list_conversations(
            organization_id=organization_id,
            status="queued",
            assigned_department_id=department_id,
            skip=skip,
            limit=limit,
        )

    async def pull_from_queue(
        self, organization_id: UUID, agent_id: UUID, department_id: Optional[UUID] = None
    ) -> Optional[Conversation]:
        """Pull next conversation from queue and assign to agent"""
        from sqlalchemy import select
        from app.models.conversation import Conversation as ConversationModel

        # Find next queued conversation with highest priority
        query = (
            select(ConversationModel)
            .where(ConversationModel.organization_id == organization_id)
            .where(ConversationModel.status == "queued")
            .where(ConversationModel.deleted_at.is_(None))
        )

        if department_id:
            query = query.where(ConversationModel.department_id == department_id)

        # Order by priority (desc) and queued_at (asc)
        query = query.order_by(
            ConversationModel.queue_priority.desc(),
            ConversationModel.queued_at.asc(),
        ).limit(1)

        result = await self.db.execute(query)
        conversation = result.scalars().first()

        if not conversation:
            return None

        # Assign to agent
        conversation.assign_to_agent(agent_id, department_id)
        await self.db.commit()
        await self.db.refresh(conversation)

        return conversation
