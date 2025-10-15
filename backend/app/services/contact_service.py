"""
Contact Service
Business logic for contact management
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.contact import Contact, Tag
from app.repositories.contact import ContactRepository, TagRepository
from app.schemas.contact import ContactCreate, ContactUpdate, TagCreate, TagUpdate
from app.core.exceptions import ConflictException, NotFoundException


class ContactService:
    """Service for contact management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ContactRepository(db)

    async def get_by_id(self, contact_id: UUID, organization_id: UUID) -> Contact:
        """Get contact by ID"""
        contact = await self.repo.get(contact_id)
        if not contact or contact.organization_id != organization_id:
            raise NotFoundException("Contact not found")
        return contact

    async def get_by_whatsapp_id(
        self, whatsapp_id: str, organization_id: UUID
    ) -> Optional[Contact]:
        """Get contact by WhatsApp ID"""
        return await self.repo.get_by_whatsapp_id(whatsapp_id, organization_id)

    async def list_contacts(
        self,
        organization_id: UUID,
        query: Optional[str] = None,
        tags: Optional[List[UUID]] = None,
        assigned_agent_id: Optional[UUID] = None,
        is_blocked: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Contact]:
        """List and search contacts"""
        return await self.repo.search_contacts(
            organization_id=organization_id,
            query=query,
            tags=tags,
            assigned_agent_id=assigned_agent_id,
            is_blocked=is_blocked,
            skip=skip,
            limit=limit,
        )

    async def create_contact(
        self, data: ContactCreate, organization_id: UUID
    ) -> Contact:
        """Create new contact"""
        # Check if contact already exists
        existing = await self.repo.get_by_whatsapp_id(
            data.whatsapp_id, organization_id
        )
        if existing:
            raise ConflictException(
                f"Contact with WhatsApp ID {data.whatsapp_id} already exists"
            )

        # Create contact
        contact_data = data.model_dump()
        contact_data["organization_id"] = organization_id
        contact_data["opt_in"] = True
        contact_data["is_blocked"] = False
        contact_data["total_messages_sent"] = 0
        contact_data["total_messages_received"] = 0
        contact_data["total_conversations"] = 0

        contact = await self.repo.create(contact_data)
        return contact

    async def update_contact(
        self, contact_id: UUID, data: ContactUpdate, organization_id: UUID
    ) -> Contact:
        """Update contact"""
        contact = await self.get_by_id(contact_id, organization_id)

        update_data = data.model_dump(exclude_unset=True)
        updated_contact = await self.repo.update(contact_id, update_data)

        return updated_contact

    async def delete_contact(
        self, contact_id: UUID, organization_id: UUID
    ) -> bool:
        """Soft delete contact"""
        contact = await self.get_by_id(contact_id, organization_id)
        return await self.repo.delete(contact_id)

    async def block_contact(
        self, contact_id: UUID, organization_id: UUID, reason: Optional[str] = None
    ) -> Contact:
        """Block a contact"""
        from datetime import datetime

        contact = await self.get_by_id(contact_id, organization_id)

        update_data = {
            "is_blocked": True,
            "blocked_at": datetime.utcnow(),
            "blocked_reason": reason,
        }

        return await self.repo.update(contact_id, update_data)

    async def unblock_contact(
        self, contact_id: UUID, organization_id: UUID
    ) -> Contact:
        """Unblock a contact"""
        contact = await self.get_by_id(contact_id, organization_id)

        update_data = {
            "is_blocked": False,
            "blocked_at": None,
            "blocked_reason": None,
        }

        return await self.repo.update(contact_id, update_data)

    async def add_tags(
        self, contact_id: UUID, tag_ids: List[UUID], organization_id: UUID
    ) -> Contact:
        """Add tags to contact"""
        contact = await self.get_by_id(contact_id, organization_id)
        return await self.repo.add_tags(contact_id, tag_ids)

    async def remove_tags(
        self, contact_id: UUID, tag_ids: List[UUID], organization_id: UUID
    ) -> Contact:
        """Remove tags from contact"""
        contact = await self.get_by_id(contact_id, organization_id)
        return await self.repo.remove_tags(contact_id, tag_ids)

    async def replace_tags(
        self, contact_id: UUID, tag_ids: List[UUID], organization_id: UUID
    ) -> Contact:
        """Replace all contact tags with the provided list"""
        contact = await self.get_by_id(contact_id, organization_id)
        return await self.repo.replace_tags(contact_id, tag_ids)

    async def get_stats(self, contact_id: UUID, organization_id: UUID) -> dict:
        """Get contact statistics"""
        contact = await self.get_by_id(contact_id, organization_id)
        return await self.repo.get_contact_stats(contact_id)

    async def get_organization_stats(self, organization_id: UUID) -> dict:
        """Get organization-wide contact statistics"""
        return await self.repo.get_organization_stats(organization_id)


class TagService:
    """Service for tag management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = TagRepository(db)

    async def get_by_id(self, tag_id: UUID, organization_id: UUID) -> Tag:
        """Get tag by ID"""
        tag = await self.repo.get(tag_id)
        if not tag or tag.organization_id != organization_id:
            raise NotFoundException("Tag not found")
        return tag

    async def list_tags(self, organization_id: UUID) -> List[Tag]:
        """List all tags for organization"""
        return await self.repo.get_organization_tags(organization_id)

    async def create_tag(self, data: TagCreate, organization_id: UUID) -> Tag:
        """Create new tag"""
        # Check if tag name already exists
        existing = await self.repo.get_by_name(data.name, organization_id)
        if existing:
            raise ConflictException(f"Tag '{data.name}' already exists")

        tag_data = data.model_dump()
        tag_data["organization_id"] = organization_id

        tag = await self.repo.create(tag_data)
        return tag

    async def update_tag(
        self, tag_id: UUID, data: TagUpdate, organization_id: UUID
    ) -> Tag:
        """Update tag"""
        tag = await self.get_by_id(tag_id, organization_id)

        # If updating name, check for conflicts
        if data.name and data.name != tag.name:
            existing = await self.repo.get_by_name(data.name, organization_id)
            if existing:
                raise ConflictException(f"Tag '{data.name}' already exists")

        update_data = data.model_dump(exclude_unset=True)
        updated_tag = await self.repo.update(tag_id, update_data)

        return updated_tag

    async def delete_tag(self, tag_id: UUID, organization_id: UUID) -> bool:
        """Delete tag"""
        tag = await self.get_by_id(tag_id, organization_id)
        return await self.repo.delete(tag_id)
