"""
Organization Service
Business logic for organization management
"""

from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.user import User
from app.models.contact import Contact
from app.models.conversation import Conversation
from app.models.whatsapp_number import WhatsAppNumber
from app.models.chatbot import Chatbot
from app.repositories.organization import OrganizationRepository
from app.schemas.organization import (
    OrganizationCreate,
    OrganizationPlanUpdate,
    OrganizationSettingsUpdate,
    OrganizationUpdate,
)
from app.core.exceptions import BadRequestException, NotFoundException


class OrganizationService:
    """Service for organization management"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = OrganizationRepository(db)

    async def get_by_id(self, org_id: UUID) -> Organization:
        """Get organization by ID"""
        org = await self.repo.get(org_id)
        if not org:
            raise NotFoundException("Organization not found")
        return org

    async def get_by_slug(self, slug: str) -> Organization:
        """Get organization by slug"""
        org = await self.repo.get_by_slug(slug)
        if not org:
            raise NotFoundException("Organization not found")
        return org

    async def list_organizations(
        self, skip: int = 0, limit: int = 100, active_only: bool = False
    ) -> List[Organization]:
        """List all organizations"""
        if active_only:
            return await self.repo.get_active()
        return await self.repo.get_multi(skip=skip, limit=limit)

    async def update_organization(
        self, org_id: UUID, data: OrganizationUpdate
    ) -> Organization:
        """Update organization"""
        org = await self.get_by_id(org_id)

        update_data = data.model_dump(exclude_unset=True)
        updated_org = await self.repo.update(org_id, update_data)

        return updated_org

    async def update_settings(
        self, org_id: UUID, settings: OrganizationSettingsUpdate
    ) -> Organization:
        """Update organization settings"""
        org = await self.get_by_id(org_id)

        # Merge with existing settings
        current_settings = org.settings or {}
        new_settings = settings.model_dump(exclude_unset=True)
        current_settings.update(new_settings)

        updated_org = await self.repo.update(org_id, {"settings": current_settings})
        return updated_org

    async def update_plan(
        self, org_id: UUID, plan_update: OrganizationPlanUpdate
    ) -> Organization:
        """Update organization plan"""
        org = await self.get_by_id(org_id)

        update_data = {
            "plan_type": plan_update.plan_type,
        }

        if plan_update.subscription_starts_at:
            update_data["subscription_starts_at"] = plan_update.subscription_starts_at

        if plan_update.subscription_ends_at:
            update_data["subscription_ends_at"] = plan_update.subscription_ends_at

        # Update plan limits based on plan type
        plan_limits = self._get_plan_limits(plan_update.plan_type)
        update_data["plan_limits"] = plan_limits

        updated_org = await self.repo.update(org_id, update_data)
        return updated_org

    async def deactivate(self, org_id: UUID) -> Organization:
        """Deactivate organization"""
        org = await self.get_by_id(org_id)
        return await self.repo.update(org_id, {"is_active": False})

    async def activate(self, org_id: UUID) -> Organization:
        """Activate organization"""
        org = await self.get_by_id(org_id)
        return await self.repo.update(org_id, {"is_active": True})

    async def delete(self, org_id: UUID) -> bool:
        """Soft delete organization"""
        org = await self.get_by_id(org_id)
        return await self.repo.delete(org_id)

    async def get_stats(self, org_id: UUID) -> dict:
        """Get organization statistics"""
        # Count users
        users_count = await self.db.scalar(
            select(func.count(User.id)).where(
                User.organization_id == org_id, User.deleted_at.is_(None)
            )
        )

        # Count contacts
        contacts_count = await self.db.scalar(
            select(func.count(Contact.id)).where(
                Contact.organization_id == org_id, Contact.deleted_at.is_(None)
            )
        )

        # Count conversations
        conversations_count = await self.db.scalar(
            select(func.count(Conversation.id)).where(
                Conversation.organization_id == org_id, Conversation.deleted_at.is_(None)
            )
        )

        # Count WhatsApp numbers
        whatsapp_count = await self.db.scalar(
            select(func.count(WhatsAppNumber.id)).where(
                WhatsAppNumber.organization_id == org_id,
                WhatsAppNumber.deleted_at.is_(None),
            )
        )

        # Count chatbots
        chatbots_count = await self.db.scalar(
            select(func.count(Chatbot.id)).where(
                Chatbot.organization_id == org_id, Chatbot.deleted_at.is_(None)
            )
        )

        return {
            "total_users": users_count or 0,
            "total_contacts": contacts_count or 0,
            "total_conversations": conversations_count or 0,
            "total_whatsapp_numbers": whatsapp_count or 0,
            "total_chatbots": chatbots_count or 0,
        }

    def _get_plan_limits(self, plan_type: str) -> dict:
        """Get plan limits based on plan type"""
        limits = {
            "free": {
                "max_users": 2,
                "max_whatsapp_numbers": 1,
                "max_contacts": 1000,
                "max_messages_per_month": 1000,
                "max_chatbots": 1,
                "max_campaigns": 5,
                "features": ["basic_chatbot", "manual_messaging"],
            },
            "starter": {
                "max_users": 5,
                "max_whatsapp_numbers": 2,
                "max_contacts": 10000,
                "max_messages_per_month": 10000,
                "max_chatbots": 3,
                "max_campaigns": 20,
                "features": [
                    "basic_chatbot",
                    "manual_messaging",
                    "campaigns",
                    "basic_analytics",
                ],
            },
            "professional": {
                "max_users": 20,
                "max_whatsapp_numbers": 5,
                "max_contacts": 50000,
                "max_messages_per_month": 50000,
                "max_chatbots": 10,
                "max_campaigns": 100,
                "features": [
                    "basic_chatbot",
                    "advanced_chatbot",
                    "manual_messaging",
                    "campaigns",
                    "advanced_analytics",
                    "integrations",
                    "api_access",
                ],
            },
            "enterprise": {
                "max_users": -1,  # unlimited
                "max_whatsapp_numbers": -1,
                "max_contacts": -1,
                "max_messages_per_month": -1,
                "max_chatbots": -1,
                "max_campaigns": -1,
                "features": [
                    "basic_chatbot",
                    "advanced_chatbot",
                    "manual_messaging",
                    "campaigns",
                    "advanced_analytics",
                    "integrations",
                    "api_access",
                    "custom_integrations",
                    "dedicated_support",
                    "sla",
                ],
            },
        }
        return limits.get(plan_type, limits["free"])
