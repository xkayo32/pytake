"""
Conversation and Message Repositories
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select, func, desc, and_, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.conversation import Conversation, Message
from app.models.contact import Contact
from app.models.queue import Queue
from app.repositories.base import BaseRepository


class ConversationRepository(BaseRepository[Conversation]):
    """Repository for Conversation model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Conversation, db)

    async def get_with_contact(
        self, conversation_id: UUID, organization_id: UUID
    ) -> Optional[Conversation]:
        """Get conversation with contact details"""
        result = await self.db.execute(
            select(Conversation)
            .where(
                Conversation.id == conversation_id,
                Conversation.organization_id == organization_id,
                Conversation.deleted_at.is_(None),
            )
            .options(joinedload(Conversation.contact))
        )
        return result.scalar_one_or_none()

    async def get_by_contact(
        self, contact_id: UUID, organization_id: UUID, status: Optional[str] = None
    ) -> List[Conversation]:
        """Get all conversations for a contact"""
        stmt = select(Conversation).where(
            Conversation.contact_id == contact_id,
            Conversation.organization_id == organization_id,
            Conversation.deleted_at.is_(None),
        )

        if status:
            stmt = stmt.where(Conversation.status == status)

        stmt = stmt.order_by(desc(Conversation.last_message_at))

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def list_conversations(
        self,
        organization_id: UUID,
        status: Optional[str] = None,
        assigned_agent_id: Optional[UUID] = None,
        assigned_department_id: Optional[UUID] = None,
        queue_id: Optional[UUID] = None,
        priority: Optional[str] = None,
        unread_only: bool = False,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Conversation]:
        """List conversations with filters"""
        stmt = (
            select(Conversation)
            .where(
                Conversation.organization_id == organization_id,
                Conversation.deleted_at.is_(None),
            )
            .options(joinedload(Conversation.contact))
        )

        if status:
            stmt = stmt.where(Conversation.status == status)

        if assigned_agent_id:
            stmt = stmt.where(Conversation.assigned_agent_id == assigned_agent_id)

        if assigned_department_id:
            stmt = stmt.where(Conversation.assigned_department_id == assigned_department_id)

        if queue_id:
            stmt = stmt.where(Conversation.queue_id == queue_id)

        if priority:
            stmt = stmt.where(Conversation.priority == priority)

        if unread_only:
            stmt = stmt.where(Conversation.unread_count > 0)

        stmt = stmt.order_by(desc(Conversation.last_message_at)).offset(skip).limit(limit)

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def mark_as_read(
        self, conversation_id: UUID, organization_id: UUID
    ) -> Conversation:
        """Mark conversation as read"""
        conversation = await self.get(conversation_id)
        if conversation and conversation.organization_id == organization_id:
            await self.update(conversation_id, {"unread_count": 0})
            await self.db.commit()
            await self.db.refresh(conversation)
        return conversation

    async def count_queued_by_queue(
        self, organization_id: UUID, queue_id: UUID
    ) -> int:
        """Count conversations with status 'queued' for a given queue"""
        stmt = select(func.count(Conversation.id)).where(
            Conversation.organization_id == organization_id,
            Conversation.queue_id == queue_id,
            Conversation.status == "queued",
            Conversation.deleted_at.is_(None),
        )
        result = await self.db.execute(stmt)
        return int(result.scalar() or 0)

    async def increment_message_count(self, conversation_id: UUID) -> None:
        """Increment total message count"""
        conversation = await self.get(conversation_id)
        if conversation:
            conversation.total_messages += 1
            await self.db.commit()

    async def increment_unread_count(self, conversation_id: UUID) -> None:
        """Increment unread count"""
        conversation = await self.get(conversation_id)
        if conversation:
            conversation.unread_count += 1
            await self.db.commit()

    async def list_sla_alerts(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        queue_id: Optional[UUID] = None,
        nearing_threshold: float = 0.8,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Tuple[Conversation, Contact, Queue, float, float, str]]:
        """
        List queued conversations that exceeded or are nearing SLA.

        Returns a list of tuples: (
          Conversation, Contact, Queue, waited_minutes, progress, severity
        ) where:
          - waited_minutes: minutes since queued_at
          - progress: waited_minutes / queue.sla_minutes (None-safe)
          - severity: 'critical' (>=1.0), 'warning' (>=nearing_threshold), else 'ok'
        """
        # Only consider conversations that are queued and have queued_at
        now = func.now()

        # Build base query joining Queue (for sla_minutes) and Contact for display
        q = (
            select(
                Conversation,
                Contact,
                Queue,
                # waited_minutes
                (func.extract('epoch', now - Conversation.queued_at) / 60.0).label('waited_minutes'),
                # progress: waited / sla
                (
                    (func.extract('epoch', now - Conversation.queued_at) / 60.0)
                    / func.nullif(Queue.sla_minutes, 0)
                ).label('progress')
            )
            .join(Contact, Contact.id == Conversation.contact_id)
            .join(Queue, Queue.id == Conversation.queue_id)
            .where(
                Conversation.organization_id == organization_id,
                Conversation.status == 'queued',
                Conversation.deleted_at.is_(None),
                Queue.deleted_at.is_(None),
                Queue.sla_minutes.is_not(None),
                Conversation.queued_at.is_not(None),
            )
        )

        if department_id:
            q = q.where(Conversation.department_id == department_id)

        if queue_id:
            q = q.where(Conversation.queue_id == queue_id)

        # Severity computation in SQL is DB-specific; we filter by threshold and order by progress desc
        # Filter candidates that are either over SLA or nearing
        q = q.where(
            (
                (func.extract('epoch', now - Conversation.queued_at) / 60.0)
                / func.nullif(Queue.sla_minutes, 0)
            ) >= nearing_threshold
        )

        # Order by highest progress then oldest queued
        q = q.order_by(desc('progress'), Conversation.queued_at.asc()).offset(skip).limit(limit)

        res = await self.db.execute(q)
        rows = res.all()

        results: List[Tuple[Conversation, Contact, Queue, float, float, str]] = []
        for conv, contact, queue, waited_minutes, progress in rows:
            # Determine severity client-side for portability
            severity = 'critical' if (progress or 0) >= 1.0 else ('warning' if (progress or 0) >= nearing_threshold else 'ok')
            results.append((conv, contact, queue, float(waited_minutes or 0.0), float(progress or 0.0), severity))

        return results


class MessageRepository(BaseRepository[Message]):
    """Repository for Message model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Message, db)

    async def get_conversation_messages(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Message]:
        """Get messages for a conversation"""
        result = await self.db.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.organization_id == organization_id,
                Message.deleted_at.is_(None),
            )
            .order_by(Message.created_at.asc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_last_message(
        self, conversation_id: UUID, organization_id: UUID
    ) -> Optional[Message]:
        """Get last message in conversation"""
        result = await self.db.execute(
            select(Message)
            .where(
                Message.conversation_id == conversation_id,
                Message.organization_id == organization_id,
                Message.deleted_at.is_(None),
            )
            .order_by(desc(Message.created_at))
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def mark_as_delivered(
        self, message_id: UUID, whatsapp_message_id: str
    ) -> Message:
        """Mark message as delivered"""
        message = await self.get(message_id)
        if message:
            await self.update(
                message_id,
                {
                    "status": "delivered",
                    "delivered_at": datetime.utcnow(),
                    "whatsapp_message_id": whatsapp_message_id,
                },
            )
            await self.db.commit()
            await self.db.refresh(message)
        return message

    async def mark_as_read(self, message_id: UUID) -> Message:
        """Mark message as read"""
        message = await self.get(message_id)
        if message:
            await self.update(
                message_id,
                {
                    "status": "read",
                    "read_at": datetime.utcnow(),
                },
            )
            await self.db.commit()
            await self.db.refresh(message)
        return message

    async def mark_as_failed(
        self, message_id: UUID, error_code: str, error_message: str
    ) -> Message:
        """Mark message as failed"""
        message = await self.get(message_id)
        if message:
            await self.update(
                message_id,
                {
                    "status": "failed",
                    "failed_at": datetime.utcnow(),
                    "error_code": error_code,
                    "error_message": error_message,
                },
            )
            await self.db.commit()
            await self.db.refresh(message)
        return message
