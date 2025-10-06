"""
WhatsApp Repository
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.whatsapp_number import WhatsAppNumber, WhatsAppTemplate
from app.repositories.base import BaseRepository


class WhatsAppNumberRepository(BaseRepository[WhatsAppNumber]):
    """Repository for WhatsAppNumber model"""

    def __init__(self, db: AsyncSession):
        super().__init__(WhatsAppNumber, db)

    async def get_by_phone(
        self, phone_number: str, organization_id: UUID
    ) -> Optional[WhatsAppNumber]:
        """Get WhatsApp number by phone"""
        result = await self.db.execute(
            select(WhatsAppNumber).where(
                WhatsAppNumber.phone_number == phone_number,
                WhatsAppNumber.organization_id == organization_id,
                WhatsAppNumber.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_active_numbers(self, organization_id: UUID) -> List[WhatsAppNumber]:
        """Get all active WhatsApp numbers"""
        result = await self.db.execute(
            select(WhatsAppNumber).where(
                WhatsAppNumber.organization_id == organization_id,
                WhatsAppNumber.is_active == True,
                WhatsAppNumber.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())


class WhatsAppTemplateRepository(BaseRepository[WhatsAppTemplate]):
    """Repository for WhatsAppTemplate model"""

    def __init__(self, db: AsyncSession):
        super().__init__(WhatsAppTemplate, db)

    async def get_by_name(
        self, name: str, whatsapp_number_id: UUID
    ) -> Optional[WhatsAppTemplate]:
        """Get template by name"""
        result = await self.db.execute(
            select(WhatsAppTemplate).where(
                WhatsAppTemplate.name == name,
                WhatsAppTemplate.whatsapp_number_id == whatsapp_number_id,
                WhatsAppTemplate.deleted_at.is_(None),
            )
        )
        return result.scalar_one_or_none()

    async def get_approved_templates(
        self, whatsapp_number_id: UUID
    ) -> List[WhatsAppTemplate]:
        """Get approved templates"""
        result = await self.db.execute(
            select(WhatsAppTemplate).where(
                WhatsAppTemplate.whatsapp_number_id == whatsapp_number_id,
                WhatsAppTemplate.status == "APPROVED",
                WhatsAppTemplate.deleted_at.is_(None),
            )
        )
        return list(result.scalars().all())
