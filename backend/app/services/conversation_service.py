"""
Conversation Service
Business logic for conversation and message management
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.models.conversation import Conversation, Message
from app.repositories.conversation import ConversationRepository, MessageRepository
from app.repositories.contact import ContactRepository
from app.repositories.queue import QueueRepository
from app.schemas.conversation import (
    ConversationCreate,
    ConversationUpdate,
    MessageCreate,
)
from app.schemas.sla import SlaAlert
from app.core.exceptions import NotFoundException


class ConversationService:
    """Service for conversation management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ConversationRepository(db)
        self.message_repo = MessageRepository(db)
        self.contact_repo = ContactRepository(db)
        self.queue_repo = QueueRepository(db)

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
        chatbot_id: Optional[UUID] = None,
        status: Optional[str] = None,
        assigned_agent_id: Optional[UUID] = None,
        assigned_department_id: Optional[UUID] = None,
        queue_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Conversation]:
        """List conversations with optional filters"""
        return await self.repo.list_conversations(
            organization_id=organization_id,
            chatbot_id=chatbot_id,
            status=status,
            assigned_agent_id=assigned_agent_id,
            assigned_department_id=assigned_department_id,
            queue_id=queue_id,
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

    async def get_sla_alerts(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        queue_id: Optional[UUID] = None,
        nearing_threshold: float = 0.8,
        skip: int = 0,
        limit: int = 100,
    ) -> List[SlaAlert]:
        """Return conversations exceeding or nearing SLA with metadata"""
        rows = await self.repo.list_sla_alerts(
            organization_id=organization_id,
            department_id=department_id,
            queue_id=queue_id,
            nearing_threshold=nearing_threshold,
            skip=skip,
            limit=limit,
        )

        alerts: List[SlaAlert] = []
        for conv, contact, queue, waited_minutes, progress, severity in rows:
            alerts.append(
                SlaAlert(
                    conversation_id=conv.id,
                    contact_id=contact.id,
                    contact_name=getattr(contact, 'full_name', None) or getattr(contact, 'name', None),
                    contact_phone=getattr(contact, 'whatsapp_id', None) or getattr(contact, 'phone', None),
                    queue_id=queue.id,
                    queue_name=queue.name,
                    sla_minutes=queue.sla_minutes,
                    queued_at=conv.queued_at,
                    waited_minutes=waited_minutes,
                    progress=progress,
                    severity=severity,
                    priority=conv.queue_priority if hasattr(conv, 'queue_priority') else 0,
                )
            )
        return alerts

    async def get_queue(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        queue_id: Optional[UUID] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Conversation]:
        """Get conversations in queue (optionally filtered by department and/or queue)"""
        # Build filters
        filters = {
            "organization_id": organization_id,
            "status": "queued",
            "skip": skip,
            "limit": limit,
        }

        if department_id:
            filters["assigned_department_id"] = department_id

        if queue_id:
            filters["queue_id"] = queue_id

        conversations = await self.repo.list_conversations(**filters)

        return conversations

    async def pull_from_queue(
        self,
        organization_id: UUID,
        agent_id: UUID,
        department_id: Optional[UUID] = None,
        queue_id: Optional[UUID] = None,
    ) -> Optional[Conversation]:
        """Pull next conversation from queue and assign to agent"""
        from sqlalchemy import select
        from app.models.conversation import Conversation as ConversationModel
        from app.models.queue import Queue

        # Find next queued conversation with highest priority
        query = (
            select(ConversationModel)
            .where(ConversationModel.organization_id == organization_id)
            .where(ConversationModel.status == "queued")
            .where(ConversationModel.deleted_at.is_(None))
        )

        if department_id:
            query = query.where(ConversationModel.department_id == department_id)

        if queue_id:
            query = query.where(ConversationModel.queue_id == queue_id)

        # Order by priority (desc) and queued_at (asc)
        query = query.order_by(
            ConversationModel.queue_priority.desc(),
            ConversationModel.queued_at.asc(),
        )

        result = await self.db.execute(query)
        conversations = result.scalars().all()

        # Filter conversations by agent restrictions and required skills
        for conversation in conversations:
            if conversation.queue_id:
                # Get queue to check agent restrictions
                queue = await self.queue_repo.get(conversation.queue_id)
                if queue and queue.settings:
                    allowed_agent_ids = queue.settings.get("allowed_agent_ids", [])
                    # Skills required for this queue (optional)
                    skills_required = queue.settings.get("skills_required", [])

                    # If allowed_agent_ids is set and not empty, check if agent is allowed
                    if allowed_agent_ids and str(agent_id) not in allowed_agent_ids:
                        continue  # Skip this conversation, agent not allowed

                    # If skills are required, verify agent has all of them
                    if skills_required:
                        from sqlalchemy import select
                        from app.models.agent_skill import AgentSkill as AgentSkillModel

                        stmt = select(AgentSkillModel.skill_name).where(
                            AgentSkillModel.user_id == agent_id,
                            AgentSkillModel.organization_id == organization_id,
                            AgentSkillModel.deleted_at.is_(None),
                        )
                        res = await self.db.execute(stmt)
                        agent_skill_names = {row[0].lower() for row in res.fetchall()}

                        # Normalize required skills to lowercase for comparison
                        req = {str(s).lower() for s in skills_required}

                        if not req.issubset(agent_skill_names):
                            # Agent doesn't satisfy skills requirement
                            continue

                    # Check business hours: skip if queue is outside business hours
                    if not self._is_within_business_hours(queue):
                        continue  # Skip this conversation, queue outside business hours
            
            # Found a conversation the agent can take
            conversation.assign_to_agent(agent_id, department_id)
            await self.db.commit()
            await self.db.refresh(conversation)
            return conversation

        # No conversation found that agent can take
        return None

    def _is_within_business_hours(self, queue) -> bool:
        """
        Check if current time is within queue's business hours.
        Returns True if no business_hours configured (always open) or if within hours.
        """
        from datetime import datetime
        import pytz

        business_hours = queue.settings.get("business_hours") if queue.settings else None
        if not business_hours:
            return True  # No restriction

        schedule = business_hours.get("schedule", {})
        if not schedule:
            return True

        # Get timezone (default to UTC)
        tz_str = business_hours.get("timezone", "UTC")
        try:
            tz = pytz.timezone(tz_str)
        except Exception:
            tz = pytz.UTC

        now = datetime.now(tz)
        weekday_name = now.strftime("%A").lower()  # monday, tuesday, etc.

        day_config = schedule.get(weekday_name)
        if not day_config or not day_config.get("enabled"):
            return False  # Day disabled

        start_str = day_config.get("start")  # e.g., "09:00"
        end_str = day_config.get("end")      # e.g., "18:00"

        if not start_str or not end_str:
            return True  # No time restriction

        try:
            start_time = datetime.strptime(start_str, "%H:%M").time()
            end_time = datetime.strptime(end_str, "%H:%M").time()
            current_time = now.time()

            return start_time <= current_time <= end_time
        except Exception:
            return True  # Parse error, allow by default

    # ============================================
    # ACTIONS
    # ============================================

    async def assign_to_agent(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        agent_id: UUID,
    ) -> Conversation:
        """
        Assign conversation to a specific agent

        Args:
            conversation_id: Conversation ID
            organization_id: Organization ID
            agent_id: Agent ID to assign

        Returns:
            Updated conversation

        Raises:
            NotFoundException: If conversation not found
        """
        conversation = await self.get_by_id(conversation_id, organization_id)

        # Update status to active and assign agent
        update_data = {
            "assigned_agent_id": agent_id,
            "status": "active",
            "assigned_at": datetime.utcnow(),
        }

        # If conversation was queued, clear queue timestamp
        if conversation.status == "queued":
            update_data["queued_at"] = None

        updated = await self.repo.update(conversation_id, update_data)
        return updated

    async def transfer_to_department(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        department_id: UUID,
        note: Optional[str] = None,
    ) -> Conversation:
        """
        Transfer conversation to a department

        Args:
            conversation_id: Conversation ID
            organization_id: Organization ID
            department_id: Department ID to transfer to
            note: Optional transfer note

        Returns:
            Updated conversation

        Raises:
            NotFoundException: If conversation not found
        """
        conversation = await self.get_by_id(conversation_id, organization_id)

        # Update department and put back in queue
        update_data = {
            "assigned_department_id": department_id,
            "current_agent_id": None,  # Unassign current agent (use current_agent_id column)
            "status": "queued",
            "queued_at": datetime.utcnow(),
        }

        # Store transfer note in extra_data if provided
        if note:
            extra_data = conversation.extra_data or {}
            if "transfers" not in extra_data:
                extra_data["transfers"] = []

            extra_data["transfers"].append({
                "from_agent_id": str(conversation.current_agent_id) if conversation.current_agent_id else None,
                "to_department_id": str(department_id),
                "note": note,
                "transferred_at": datetime.utcnow().isoformat(),
            })

            update_data["extra_data"] = extra_data

        updated = await self.repo.update(conversation_id, update_data)
        return updated

    async def close_conversation(
        self,
        conversation_id: UUID,
        organization_id: UUID,
        reason: Optional[str] = None,
        resolved: bool = True,
    ) -> Conversation:
        """
        Close a conversation

        Args:
            conversation_id: Conversation ID
            organization_id: Organization ID
            reason: Optional close reason
            resolved: Whether conversation was resolved

        Returns:
            Updated conversation

        Raises:
            NotFoundException: If conversation not found
        """
        conversation = await self.get_by_id(conversation_id, organization_id)

        # Update status
        now = datetime.utcnow()
        update_data = {
            "status": "closed",
            "closed_at": now,
        }

        if resolved:
            update_data["resolved_at"] = now

        # Store close reason in extra_data if provided
        if reason:
            extra_data = conversation.extra_data or {}
            extra_data["close_reason"] = reason
            extra_data["closed_by_agent_id"] = str(conversation.current_agent_id) if conversation.current_agent_id else None
            update_data["extra_data"] = extra_data

        updated = await self.repo.update(conversation_id, update_data)
        return updated

    async def check_and_apply_overflow(
        self, queue_id: UUID, organization_id: UUID
    ) -> Optional[UUID]:
        """
        Check if queue should overflow and return overflow queue ID
        
        Args:
            queue_id: Queue to check
            organization_id: Organization ID
            
        Returns:
            Overflow queue ID if overflow should happen, None otherwise
        """
        # Get queue with overflow settings
        queue = await self.queue_repo.get(queue_id)
        if not queue or queue.organization_id != organization_id:
            return None
        
        # Check if queue has overflow configured
        if not queue.overflow_queue_id or not queue.max_queue_size:
            return None
        
        # Check if queue is at or over capacity
        if queue.queued_conversations >= queue.max_queue_size:
            # Verify overflow queue exists and has capacity
            overflow_queue = await self.queue_repo.get(queue.overflow_queue_id)
            if overflow_queue and overflow_queue.is_active:
                # Check if overflow queue also has capacity
                # (prevent infinite loops)
                if not overflow_queue.max_queue_size or overflow_queue.queued_conversations < overflow_queue.max_queue_size:
                    return queue.overflow_queue_id
        
        return None

    async def get_metrics(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        queue_id: Optional[UUID] = None,
        since: Optional[datetime] = None,
        overflow_seconds: int = 600,
    ) -> dict:
        """
        Return aggregated metrics for conversations.

        Returns: { total, open, active, queued, avg_wait_seconds, overflow_count, sla_violations }
        """
        from app.models.queue import Queue
        from app.models.conversation import Conversation as ConversationModel

        base_filters = [
            ConversationModel.organization_id == organization_id,
            ConversationModel.deleted_at.is_(None),
        ]

        if department_id:
            base_filters.append(ConversationModel.assigned_department_id == department_id)

        if queue_id:
            base_filters.append(ConversationModel.queue_id == queue_id)

        if since:
            base_filters.append(func.coalesce(ConversationModel.last_message_at, ConversationModel.created_at) >= since)

        # total
        total_stmt = select(func.count(ConversationModel.id)).where(*base_filters)
        total_res = await self.db.execute(total_stmt)
        total = int(total_res.scalar() or 0)

        # counts by status
        def count_by_status(s: str):
            stmt = select(func.count(ConversationModel.id)).where(*base_filters, ConversationModel.status == s)
            return stmt

        open_res = await self.db.execute(count_by_status('open'))
        active_res = await self.db.execute(count_by_status('active'))
        queued_res = await self.db.execute(count_by_status('queued'))

        open_count = int(open_res.scalar() or 0)
        active_count = int(active_res.scalar() or 0)
        queued_count = int(queued_res.scalar() or 0)

        # avg wait seconds (since last_message_at or created_at)
        avg_stmt = select(func.avg(func.extract('epoch', func.now() - func.coalesce(ConversationModel.last_message_at, ConversationModel.created_at))))
        if base_filters:
            avg_stmt = avg_stmt.where(*base_filters)

        avg_res = await self.db.execute(avg_stmt)
        avg_wait_seconds = avg_res.scalar()
        avg_wait_seconds = int(avg_wait_seconds) if avg_wait_seconds else None

        # overflow count: conversations with last activity older than overflow_seconds
        overflow_stmt = select(func.count(ConversationModel.id)).where(*base_filters, (func.extract('epoch', func.now() - func.coalesce(ConversationModel.last_message_at, ConversationModel.created_at))) > overflow_seconds)
        overflow_res = await self.db.execute(overflow_stmt)
        overflow_count = int(overflow_res.scalar() or 0)

        # sla violations: join with queue and count progress >= 1.0 (only queued with queued_at and queue.sla_minutes)
        sla_q = (
            select(func.count(ConversationModel.id))
            .join(Queue, Queue.id == ConversationModel.queue_id)
            .where(
                ConversationModel.organization_id == organization_id,
                ConversationModel.status == 'queued',
                ConversationModel.deleted_at.is_(None),
                Queue.deleted_at.is_(None),
                Queue.sla_minutes.is_not(None),
                ConversationModel.queued_at.is_not(None),
                (
                    (func.extract('epoch', func.now() - ConversationModel.queued_at) / 60.0) / func.nullif(Queue.sla_minutes, 0)
                ) >= 1.0,
            )
        )

        if department_id:
            sla_q = sla_q.where(ConversationModel.assigned_department_id == department_id)
        if queue_id:
            sla_q = sla_q.where(ConversationModel.queue_id == queue_id)

        sla_res = await self.db.execute(sla_q)
        sla_violations = int(sla_res.scalar() or 0)

        return {
            'total': total,
            'open': open_count,
            'active': active_count,
            'queued': queued_count,
            'avg_wait_seconds': avg_wait_seconds,
            'overflow_count': overflow_count,
            'sla_violations': sla_violations,
        }
    
    async def assign_to_queue_with_overflow(
        self, 
        conversation_id: UUID, 
        queue_id: UUID, 
        organization_id: UUID
    ) -> Conversation:
        """
        Assign conversation to queue, checking for overflow
        
        Args:
            conversation_id: Conversation to assign
            queue_id: Target queue ID
            organization_id: Organization ID
            
        Returns:
            Updated conversation
        """
        # Check if we should overflow to another queue
        overflow_queue_id = await self.check_and_apply_overflow(queue_id, organization_id)
        
        # Use overflow queue if applicable
        final_queue_id = overflow_queue_id if overflow_queue_id else queue_id
        
        # Update conversation
        update_data = {
            "queue_id": final_queue_id,
            "status": "queued",
            "queued_at": datetime.utcnow(),
        }
        
        # Store overflow info if it happened
        if overflow_queue_id:
            conversation = await self.get_by_id(conversation_id, organization_id)
            extra_data = conversation.extra_data or {}
            if "overflow_history" not in extra_data:
                extra_data["overflow_history"] = []
            
            extra_data["overflow_history"].append({
                "original_queue_id": str(queue_id),
                "overflow_queue_id": str(overflow_queue_id),
                "overflowed_at": datetime.utcnow().isoformat(),
            })
            update_data["extra_data"] = extra_data
        
        updated = await self.repo.update(conversation_id, update_data)
        return updated

