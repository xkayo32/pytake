"""
Organization Queries
"""

from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.organization import OrganizationType, OrganizationStats
from app.graphql.permissions import require_auth, require_role
from app.repositories.organization import OrganizationRepository
from app.repositories.user import UserRepository
from app.repositories.contact import ContactRepository
from app.repositories.conversation import ConversationRepository
from app.repositories.whatsapp import WhatsAppNumberRepository


@strawberry.type
class OrganizationQuery:
    """Organization-related queries"""

    @strawberry.field
    @require_auth
    async def my_organization(
        self,
        info: Info[GraphQLContext, None],
    ) -> OrganizationType:
        """
        Get current user's organization

        Requires: Authentication
        """
        context: GraphQLContext = info.context

        org_repo = OrganizationRepository(context.db)
        org = await org_repo.get_by_id(context.organization_id)

        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        return OrganizationType(
            id=strawberry.ID(str(org.id)),
            name=org.name,
            slug=org.slug,
            is_active=org.is_active,
            plan_tier=org.plan_tier,
            max_users=org.max_users,
            max_contacts=org.max_contacts,
            max_conversations_per_month=org.max_conversations_per_month,
            max_whatsapp_numbers=org.max_whatsapp_numbers,
            features_enabled=str(org.features_enabled) if org.features_enabled else None,
            phone=org.phone,
            website=org.website,
            logo_url=org.logo_url,
            address=org.address,
            city=org.city,
            state=org.state,
            country=org.country,
            postal_code=org.postal_code,
            created_at=org.created_at,
            updated_at=org.updated_at,
            deleted_at=org.deleted_at,
        )

    @strawberry.field
    @require_auth
    async def organization_stats(
        self,
        info: Info[GraphQLContext, None],
    ) -> OrganizationStats:
        """
        Get organization statistics

        Requires: Authentication
        """
        context: GraphQLContext = info.context
        org_id = context.organization_id

        # Get repositories
        user_repo = UserRepository(context.db)
        contact_repo = ContactRepository(context.db)
        conversation_repo = ConversationRepository(context.db)
        whatsapp_repo = WhatsAppNumberRepository(context.db)

        # Get counts
        users = await user_repo.get_by_organization(org_id)
        total_users = len(users)
        active_users = len([u for u in users if u.is_active and not u.deleted_at])

        contacts = await contact_repo.get_by_organization(org_id)
        total_contacts = len(contacts)

        conversations = await conversation_repo.get_by_organization(org_id)
        total_conversations = len(conversations)

        whatsapp_numbers = await whatsapp_repo.get_by_organization(org_id)
        total_whatsapp_numbers = len(whatsapp_numbers)

        # Count conversations this month
        from datetime import datetime
        current_month = datetime.utcnow().month
        current_year = datetime.utcnow().year
        conversations_this_month = len([
            c for c in conversations
            if c.created_at.month == current_month and c.created_at.year == current_year
        ])

        return OrganizationStats(
            total_users=total_users,
            active_users=active_users,
            total_contacts=total_contacts,
            total_conversations=total_conversations,
            total_whatsapp_numbers=total_whatsapp_numbers,
            conversations_this_month=conversations_this_month,
        )
