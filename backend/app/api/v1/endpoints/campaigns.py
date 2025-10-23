"""
Campaign endpoints - Bulk messaging campaigns
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.campaign import (
    AudiencePreview,
    CampaignCreate,
    CampaignInDB,
    CampaignListResponse,
    CampaignProgress,
    CampaignScheduleResponse,
    CampaignStartResponse,
    CampaignStats,
    CampaignUpdate,
)
from app.services.campaign_service import CampaignService

router = APIRouter()


# ============================================
# REQUEST SCHEMAS
# ============================================


class ScheduleCampaignRequest(BaseModel):
    """Request schema for scheduling campaign"""

    scheduled_at: datetime


# ============================================
# CAMPAIGN ENDPOINTS
# ============================================


@router.post(
    "/",
    response_model=CampaignInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def create_campaign(
    data: CampaignCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new campaign

    Required role: org_admin or agent

    The campaign starts in 'draft' status.
    """
    service = CampaignService(db)
    campaign = await service.create_campaign(
        data, current_user.organization_id, current_user.id
    )
    return campaign


@router.get("/", response_model=CampaignListResponse)
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None, description="Filter by status"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all campaigns for current organization

    Supports pagination and status filtering.
    """
    service = CampaignService(db)
    campaigns, total = await service.list_campaigns(
        current_user.organization_id, skip, limit, status
    )
    return CampaignListResponse(total=total, items=campaigns)


@router.get("/{campaign_id}", response_model=CampaignInDB)
async def get_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get campaign by ID
    """
    service = CampaignService(db)
    campaign = await service.get_campaign(campaign_id, current_user.organization_id)
    if not campaign:
        raise NotFoundException("Campaign not found")
    return campaign


@router.get("/{campaign_id}/stats", response_model=CampaignStats)
async def get_campaign_stats(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get campaign statistics

    Returns detailed statistics including delivery rates, read rates, etc.
    """
    service = CampaignService(db)
    stats = await service.get_campaign_stats(campaign_id, current_user.organization_id)
    return stats


@router.get("/{campaign_id}/progress", response_model=CampaignProgress)
async def get_campaign_progress(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get campaign progress

    Returns current progress and estimated completion time.
    """
    service = CampaignService(db)
    progress = await service.get_campaign_progress(
        campaign_id, current_user.organization_id
    )
    return progress


@router.get("/{campaign_id}/retry-stats")
async def get_campaign_retry_stats(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed retry statistics for campaign
    
    Returns:
    - Total contacts and status breakdown
    - Average attempts per contact
    - Successful on first attempt vs required retries
    - Retry rate percentage
    - Detailed error logs
    """
    service = CampaignService(db)
    
    # Get campaign
    campaign = await service.get_campaign_by_id(campaign_id, current_user.organization_id)
    if not campaign:
        raise NotFoundException(resource="Campaign", resource_id=campaign_id)
    
    # Import retry manager to get stats
    from app.tasks.campaign_retry import CampaignRetryManager
    retry_manager = CampaignRetryManager(campaign, db)
    
    stats = retry_manager.get_retry_statistics()
    
    # Add configuration info
    stats["configuration"] = {
        "retry_max_attempts": campaign.retry_max_attempts,
        "retry_base_delay": campaign.retry_base_delay,
        "retry_max_delay": campaign.retry_max_delay,
    }
    
    # Add recent errors (last 10)
    stats["recent_errors"] = campaign.errors[-10:] if campaign.errors else []
    
    return stats


@router.get("/{campaign_id}/audience/preview", response_model=AudiencePreview)
async def preview_campaign_audience(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Preview campaign audience

    Returns total count and sample of target contacts.
    """
    service = CampaignService(db)
    preview = await service.preview_audience(campaign_id, current_user.organization_id)
    return preview


@router.patch(
    "/{campaign_id}",
    response_model=CampaignInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def update_campaign(
    campaign_id: UUID,
    data: CampaignUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update campaign

    Required role: org_admin or agent

    Can only update draft or scheduled campaigns.
    """
    service = CampaignService(db)
    campaign = await service.update_campaign(
        campaign_id, current_user.organization_id, data
    )
    return campaign


@router.delete(
    "/{campaign_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def delete_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete campaign

    Required role: org_admin

    Cannot delete running campaigns.
    """
    service = CampaignService(db)
    await service.delete_campaign(campaign_id, current_user.organization_id)


# ============================================
# CAMPAIGN ACTIONS
# ============================================


@router.post(
    "/{campaign_id}/schedule",
    response_model=CampaignScheduleResponse,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def schedule_campaign(
    campaign_id: UUID,
    request: ScheduleCampaignRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Schedule campaign for future sending

    Required role: org_admin or agent

    The campaign will start automatically at the scheduled time.
    """
    service = CampaignService(db)
    response = await service.schedule_campaign(
        campaign_id, current_user.organization_id, request.scheduled_at
    )
    return response


@router.post(
    "/{campaign_id}/start",
    response_model=CampaignStartResponse,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def start_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Start campaign immediately

    Required role: org_admin or agent

    Begins sending messages to the target audience.
    """
    service = CampaignService(db)
    response = await service.start_campaign(campaign_id, current_user.organization_id)
    return response


@router.post(
    "/{campaign_id}/pause",
    response_model=CampaignInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def pause_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Pause running campaign

    Required role: org_admin or agent

    Stops sending messages. Can be resumed later.
    """
    service = CampaignService(db)
    campaign = await service.pause_campaign(campaign_id, current_user.organization_id)
    return campaign


@router.post(
    "/{campaign_id}/resume",
    response_model=CampaignInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def resume_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Resume paused campaign

    Required role: org_admin or agent

    Continues sending messages from where it was paused.
    """
    service = CampaignService(db)
    campaign = await service.resume_campaign(campaign_id, current_user.organization_id)
    return campaign


@router.post(
    "/{campaign_id}/cancel",
    response_model=CampaignInDB,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def cancel_campaign(
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Cancel campaign

    Required role: org_admin

    Permanently stops the campaign. Cannot be resumed.
    """
    service = CampaignService(db)
    campaign = await service.cancel_campaign(campaign_id, current_user.organization_id)
    return campaign
