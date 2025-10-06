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

    async def get_contact_stats(self, contact_id: UUID) -> dict:
        """Get contact statistics"""
        from app.models.conversation import Conversation, Message

        # Count conversations
        conv_count = await self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.contact_id == contact_id,
                Conversation.deleted_at.is_(None)
            )
        )

        # Count messages
        msg_count = await self.db.scalar(
            select(func.count(Message.id)).where(
                Message.contact_id == contact_id,
                Message.deleted_at.is_(None)
            )
        )

        return {
            "total_conversations": conv_count or 0,
            "total_messages": msg_count or 0,
        }


class TagRepository(BaseRepository[Tag]):
    """Repository for Tag model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Tag, db)

    async def get_by_name(
        self, name: str, organization_id: UUID
    ) -> Optional[Tag]:
        """Get tag by name within organization"""
        result = await self.db.execute(
            select(Tag).where(
                Tag.name == name,
                Tag.organization_id == organization_id,
                Tag.deleted_at.is_(None),
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
                Tag.deleted_at.is_(None)
            )
            .order_by(Tag.name)
        )
        return list(result.scalars().all())
