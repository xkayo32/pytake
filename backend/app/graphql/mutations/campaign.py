"""
Campaign Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.campaign import CampaignType, CampaignCreateInput, CampaignUpdateInput
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth, require_role
from app.repositories.campaign import CampaignRepository
from app.schemas.campaign import CampaignCreate, CampaignUpdate


@strawberry.type
class CampaignMutation:
    """Campaign-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_campaign(
        self,
        info: Info[GraphQLContext, None],
        input: CampaignCreateInput,
    ) -> CampaignType:
        """Create new campaign"""
        context: GraphQLContext = info.context

        campaign_repo = CampaignRepository(context.db)

        campaign_data = CampaignCreate(
            name=input.name,
            description=input.description,
            message_template=input.message_template,
            scheduled_at=input.scheduled_at,
            organization_id=context.organization_id,
        )

        campaign = await campaign_repo.create(campaign_data, context.organization_id)

        return CampaignType(
            id=strawberry.ID(str(campaign.id)),
            organization_id=strawberry.ID(str(campaign.organization_id)),
            name=campaign.name,
            description=campaign.description,
            message_template=campaign.message_template,
            status=campaign.status,
            scheduled_at=campaign.scheduled_at,
            started_at=campaign.started_at,
            completed_at=campaign.completed_at,
            target_count=campaign.target_count,
            sent_count=campaign.sent_count,
            delivered_count=campaign.delivered_count,
            failed_count=campaign.failed_count,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def update_campaign(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: CampaignUpdateInput,
    ) -> CampaignType:
        """Update campaign"""
        context: GraphQLContext = info.context

        campaign_repo = CampaignRepository(context.db)

        update_data = CampaignUpdate(
            name=input.name,
            description=input.description,
            message_template=input.message_template,
            scheduled_at=input.scheduled_at,
            status=input.status,
        )

        campaign = await campaign_repo.update(UUID(id), update_data, context.organization_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        return CampaignType(
            id=strawberry.ID(str(campaign.id)),
            organization_id=strawberry.ID(str(campaign.organization_id)),
            name=campaign.name,
            description=campaign.description,
            message_template=campaign.message_template,
            status=campaign.status,
            scheduled_at=campaign.scheduled_at,
            started_at=campaign.started_at,
            completed_at=campaign.completed_at,
            target_count=campaign.target_count,
            sent_count=campaign.sent_count,
            delivered_count=campaign.delivered_count,
            failed_count=campaign.failed_count,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def start_campaign(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> CampaignType:
        """Start campaign execution"""
        context: GraphQLContext = info.context

        campaign_repo = CampaignRepository(context.db)
        campaign = await campaign_repo.get_by_id(UUID(id), context.organization_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        from datetime import datetime
        campaign.status = "running"
        campaign.started_at = datetime.utcnow()
        await context.db.commit()
        await context.db.refresh(campaign)

        return CampaignType(
            id=strawberry.ID(str(campaign.id)),
            organization_id=strawberry.ID(str(campaign.organization_id)),
            name=campaign.name,
            description=campaign.description,
            message_template=campaign.message_template,
            status=campaign.status,
            scheduled_at=campaign.scheduled_at,
            started_at=campaign.started_at,
            completed_at=campaign.completed_at,
            target_count=campaign.target_count,
            sent_count=campaign.sent_count,
            delivered_count=campaign.delivered_count,
            failed_count=campaign.failed_count,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def cancel_campaign(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> CampaignType:
        """Cancel campaign"""
        context: GraphQLContext = info.context

        campaign_repo = CampaignRepository(context.db)
        campaign = await campaign_repo.get_by_id(UUID(id), context.organization_id)

        if not campaign:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        campaign.status = "cancelled"
        await context.db.commit()
        await context.db.refresh(campaign)

        return CampaignType(
            id=strawberry.ID(str(campaign.id)),
            organization_id=strawberry.ID(str(campaign.organization_id)),
            name=campaign.name,
            description=campaign.description,
            message_template=campaign.message_template,
            status=campaign.status,
            scheduled_at=campaign.scheduled_at,
            started_at=campaign.started_at,
            completed_at=campaign.completed_at,
            target_count=campaign.target_count,
            sent_count=campaign.sent_count,
            delivered_count=campaign.delivered_count,
            failed_count=campaign.failed_count,
            created_at=campaign.created_at,
            updated_at=campaign.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_campaign(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete campaign"""
        context: GraphQLContext = info.context

        campaign_repo = CampaignRepository(context.db)
        success = await campaign_repo.delete(UUID(id), context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Campaign not found"
            )

        return SuccessResponse(
            success=True,
            message="Campaign deleted successfully"
        )
