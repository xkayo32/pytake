"""
Campaign Queries
"""

from typing import List, Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.campaign import CampaignType
from app.graphql.permissions import require_auth
from app.repositories.campaign import CampaignRepository


@strawberry.type
class CampaignQuery:
    """Campaign-related queries"""

    @strawberry.field
    @require_auth
    async def campaign(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> CampaignType:
        """Get campaign by ID"""
        context: GraphQLContext = info.context

        campaign_repo = CampaignRepository(context.db)
        campaign = await campaign_repo.get_by_id(UUID(id), context.organization_id)

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

    @strawberry.field
    @require_auth
    async def campaigns(
        self,
        info: Info[GraphQLContext, None],
        status: Optional[str] = None,
    ) -> List[CampaignType]:
        """List campaigns"""
        context: GraphQLContext = info.context

        campaign_repo = CampaignRepository(context.db)
        campaigns = await campaign_repo.get_by_organization(context.organization_id)

        if status:
            campaigns = [c for c in campaigns if c.status == status]

        return [
            CampaignType(
                id=strawberry.ID(str(c.id)),
                organization_id=strawberry.ID(str(c.organization_id)),
                name=c.name,
                description=c.description,
                message_template=c.message_template,
                status=c.status,
                scheduled_at=c.scheduled_at,
                started_at=c.started_at,
                completed_at=c.completed_at,
                target_count=c.target_count,
                sent_count=c.sent_count,
                delivered_count=c.delivered_count,
                failed_count=c.failed_count,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in campaigns
        ]
