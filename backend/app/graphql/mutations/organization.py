"""
Organization Mutations
"""

from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.organization import (
    OrganizationType,
    OrganizationUpdateInput,
    OrganizationSettingsInput,
)
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth, require_role
from app.repositories.organization import OrganizationRepository
from app.schemas.organization import OrganizationUpdate


@strawberry.type
class OrganizationMutation:
    """Organization-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def update_organization(
        self,
        info: Info[GraphQLContext, None],
        input: OrganizationUpdateInput,
    ) -> OrganizationType:
        """
        Update organization details

        Requires: org_admin role
        """
        context: GraphQLContext = info.context

        org_repo = OrganizationRepository(context.db)

        # Convert GraphQL input to Pydantic schema
        update_data = OrganizationUpdate(
            name=input.name,
            phone=input.phone,
            website=input.website,
            logo_url=input.logo_url,
            address=input.address,
            city=input.city,
            state=input.state,
            country=input.country,
            postal_code=input.postal_code,
        )

        # Update organization
        org = await org_repo.update(context.organization_id, update_data)

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

    @strawberry.mutation
    @require_role("org_admin")
    async def update_organization_settings(
        self,
        info: Info[GraphQLContext, None],
        input: OrganizationSettingsInput,
    ) -> OrganizationType:
        """
        Update organization subscription settings

        Requires: org_admin role
        """
        context: GraphQLContext = info.context

        org_repo = OrganizationRepository(context.db)
        org = await org_repo.get_by_id(context.organization_id)

        if not org:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        # Update settings
        if input.plan_tier is not None:
            org.plan_tier = input.plan_tier
        if input.max_users is not None:
            org.max_users = input.max_users
        if input.max_contacts is not None:
            org.max_contacts = input.max_contacts
        if input.max_conversations_per_month is not None:
            org.max_conversations_per_month = input.max_conversations_per_month
        if input.max_whatsapp_numbers is not None:
            org.max_whatsapp_numbers = input.max_whatsapp_numbers
        if input.features_enabled is not None:
            org.features_enabled = input.features_enabled

        await context.db.commit()
        await context.db.refresh(org)

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

    @strawberry.mutation
    @require_role("org_admin")
    async def deactivate_organization(
        self,
        info: Info[GraphQLContext, None],
    ) -> SuccessResponse:
        """
        Deactivate organization (soft delete)

        Requires: org_admin role
        """
        context: GraphQLContext = info.context

        org_repo = OrganizationRepository(context.db)
        success = await org_repo.delete(context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Organization not found"
            )

        return SuccessResponse(
            success=True,
            message="Organization deactivated successfully"
        )
