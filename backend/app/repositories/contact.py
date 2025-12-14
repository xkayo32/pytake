"""
Contact Repository
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.contact import Contact, Tag, contact_tags
from app.repositories.base import BaseRepository


class ContactRepository(BaseRepository[Contact]):
    """Repository for Contact model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Contact, db)

    async def create(self, obj_in: dict) -> Contact:
        """Create a new contact with eager-loaded tags"""
        db_obj = Contact(**obj_in)
        self.db.add(db_obj)
        await self.db.commit()
        # Re-fetch with tags eager-loaded to avoid lazy-loading issues
        await self.db.refresh(db_obj, ["tags"])
        return db_obj

    async def get(self, id: UUID) -> Optional[Contact]:
        """Get contact by ID with tags loaded"""
        result = await self.db.execute(
            select(Contact)
            .where(Contact.id == id)
            .options(selectinload(Contact.tags))
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, id: UUID, organization_id: UUID) -> Optional[Contact]:
        """Get contact by ID within organization"""
        result = await self.db.execute(
            select(Contact)
            .where(Contact.id == id)
            .where(Contact.organization_id == organization_id)
            .where(Contact.deleted_at.is_(None))
            .options(selectinload(Contact.tags))
        )
        return result.scalar_one_or_none()

    async def get_by_whatsapp_id(
        self, whatsapp_id: str, organization_id: UUID
    ) -> Optional[Contact]:
        """Get contact by WhatsApp ID within organization"""
        result = await self.db.execute(
            select(Contact)
            .where(
                Contact.whatsapp_id == whatsapp_id,
                Contact.organization_id == organization_id,
                Contact.deleted_at.is_(None),
            )
            .options(selectinload(Contact.tags))
        )
        return result.scalar_one_or_none()

    async def search_contacts(
        self,
        organization_id: UUID,
        query: Optional[str] = None,
        tags: Optional[List[UUID]] = None,
        assigned_agent_id: Optional[UUID] = None,
        is_blocked: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Contact]:
        """Search contacts with filters"""
        stmt = select(Contact).where(
            Contact.organization_id == organization_id,
            Contact.deleted_at.is_(None)
        )

        # Text search
        if query:
            search_filter = or_(
                Contact.name.ilike(f"%{query}%"),
                Contact.email.ilike(f"%{query}%"),
                Contact.whatsapp_id.ilike(f"%{query}%"),
                Contact.company.ilike(f"%{query}%"),
            )
            stmt = stmt.where(search_filter)

        # Filter by tags
        if tags:
            stmt = stmt.join(Contact.tags).where(Tag.id.in_(tags))

        # Filter by assigned agent
        if assigned_agent_id:
            stmt = stmt.where(Contact.assigned_agent_id == assigned_agent_id)

        # Filter by blocked status
        if is_blocked is not None:
            stmt = stmt.where(Contact.is_blocked == is_blocked)

        stmt = stmt.offset(skip).limit(limit).order_by(Contact.created_at.desc())
        stmt = stmt.options(selectinload(Contact.tags))

        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def add_tags(self, contact_id: UUID, tag_ids: List[UUID]) -> Contact:
        """Add tags to contact"""
        contact = await self.get(contact_id)
        if not contact:
            return None

        # Get tags
        result = await self.db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
        tags = list(result.scalars().all())

        # Add tags (SQLAlchemy will handle duplicates)
        for tag in tags:
            if tag not in contact.tags:
                contact.tags.append(tag)

        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def remove_tags(self, contact_id: UUID, tag_ids: List[UUID]) -> Contact:
        """Remove tags from contact"""
        contact = await self.get(contact_id)
        if not contact:
            return None

        # Remove tags
        contact.tags = [tag for tag in contact.tags if tag.id not in tag_ids]

        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def replace_tags(self, contact_id: UUID, tag_ids: List[UUID]) -> Contact:
        """Replace all contact tags with the provided list"""
        contact = await self.get(contact_id)
        if not contact:
            return None

        # Get new tags
        if tag_ids:
            result = await self.db.execute(select(Tag).where(Tag.id.in_(tag_ids)))
            new_tags = list(result.scalars().all())
        else:
            new_tags = []

        # Replace all tags
        contact.tags = new_tags

        await self.db.commit()
        await self.db.refresh(contact)
        return contact

    async def get_contact_stats(self, contact_id: UUID) -> dict:
        """Get contact statistics"""
        from app.models.conversation import Conversation, Message
        from datetime import datetime

        # Count conversations
        conv_count = await self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.contact_id == contact_id,
                Conversation.deleted_at.is_(None)
            )
        )

        # Count messages (join with conversations to filter by contact_id)
        msg_count = await self.db.scalar(
            select(func.count(Message.id))
            .select_from(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.contact_id == contact_id,
                Message.deleted_at.is_(None)
            )
        )

        # Get last interaction (most recent message)
        last_message = await self.db.scalar(
            select(Message.created_at)
            .select_from(Message)
            .join(Conversation, Message.conversation_id == Conversation.id)
            .where(
                Conversation.contact_id == contact_id,
                Message.deleted_at.is_(None)
            )
            .order_by(Message.created_at.desc())
            .limit(1)
        )

        # Calculate average response time using CTE to avoid window function in aggregate
        # First, create a CTE with response times
        response_times_cte = select(
            (func.extract('epoch', Message.created_at - func.lag(Message.created_at).over(
                partition_by=Message.conversation_id,
                order_by=Message.created_at
            )) / 60).label('response_time')
        ).select_from(Message).join(
            Conversation, Message.conversation_id == Conversation.id
        ).where(
            Conversation.contact_id == contact_id,
            Message.direction == 'outgoing',
            Message.deleted_at.is_(None)
        ).cte('response_times')

        # Then calculate average from the CTE
        avg_response_time_result = await self.db.execute(
            select(func.avg(response_times_cte.c.response_time)).where(
                response_times_cte.c.response_time.isnot(None)
            )
        )
        avg_response_time = avg_response_time_result.scalar()

        return {
            "total_conversations": conv_count or 0,
            "total_messages": msg_count or 0,
            "avg_response_time_minutes": float(avg_response_time) if avg_response_time else None,
            "last_interaction": last_message.isoformat() if last_message else None,
        }

    async def get_organization_stats(self, organization_id: UUID) -> dict:
        """Get organization-wide contact statistics"""
        from datetime import datetime, timedelta

        # Total contacts
        total_contacts = await self.db.scalar(
            select(func.count(Contact.id)).where(
                Contact.organization_id == organization_id,
                Contact.deleted_at.is_(None)
            )
        )

        # Contacts with tags
        contacts_with_tags = await self.db.scalar(
            select(func.count(func.distinct(contact_tags.c.contact_id)))
            .where(
                contact_tags.c.contact_id.in_(
                    select(Contact.id).where(
                        Contact.organization_id == organization_id,
                        Contact.deleted_at.is_(None)
                    )
                )
            )
        )

        # Blocked contacts
        blocked_contacts = await self.db.scalar(
            select(func.count(Contact.id)).where(
                Contact.organization_id == organization_id,
                Contact.deleted_at.is_(None),
                Contact.is_blocked == True
            )
        )

        # Recently added contacts (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_contacts = await self.db.scalar(
            select(func.count(Contact.id)).where(
                Contact.organization_id == organization_id,
                Contact.deleted_at.is_(None),
                Contact.created_at >= seven_days_ago
            )
        )

        return {
            "total_contacts": total_contacts or 0,
            "contacts_with_tags": contacts_with_tags or 0,
            "blocked_contacts": blocked_contacts or 0,
            "recent_contacts": recent_contacts or 0,
        }


class TagRepository(BaseRepository[Tag]):
    """Repository for Tag model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Tag, db)

    async def get_by_id(self, tag_id: UUID, organization_id: UUID) -> Optional[Tag]:
        """Get tag by ID within organization"""
        result = await self.db.execute(
            select(Tag)
            .where(Tag.id == tag_id)
            .where(Tag.organization_id == organization_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name(
        self, name: str, organization_id: UUID
    ) -> Optional[Tag]:
        """Get tag by name within organization"""
        result = await self.db.execute(
            select(Tag).where(
                Tag.name == name,
                Tag.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()

    async def get_organization_tags(
        self, organization_id: UUID
    ) -> List[Tag]:
        """Get all tags for organization"""
        result = await self.db.execute(
            select(Tag)
            .where(
                Tag.organization_id == organization_id,
            )
            .order_by(Tag.name)
        )
        return list(result.scalars().all())
