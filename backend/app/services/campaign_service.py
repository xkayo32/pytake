"""
Campaign service - Business logic for bulk messaging campaigns
"""

from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, NotFoundException
from app.models.campaign import Campaign
from app.models.contact import Contact
from app.repositories.campaign import CampaignRepository
from app.repositories.contact import ContactRepository
from app.schemas.campaign import (
    AudiencePreview,
    CampaignCreate,
    CampaignProgress,
    CampaignScheduleResponse,
    CampaignStartResponse,
    CampaignStats,
    CampaignUpdate,
)


class CampaignService:
    """Service for campaign operations"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.campaign_repo = CampaignRepository(db)
        self.contact_repo = ContactRepository(db)

    # ============================================
    # CAMPAIGN OPERATIONS
    # ============================================

    async def create_campaign(
        self, data: CampaignCreate, organization_id: UUID, user_id: UUID
    ) -> Campaign:
        """
        Create a new campaign

        Args:
            data: Campaign creation data
            organization_id: Organization UUID
            user_id: User UUID creating the campaign

        Returns:
            Created campaign
        """
        campaign_data = {
            **data.model_dump(),
            "organization_id": organization_id,
            "created_by_user_id": user_id,
            "status": "draft",
        }

        # Calculate total recipients
        total_recipients = await self._calculate_recipients(
            organization_id,
            data.audience_type,
            data.target_tag_ids,
            data.target_contact_ids,
            data.segment_filters,
        )
        campaign_data["total_recipients"] = total_recipients
        campaign_data["messages_pending"] = total_recipients

        campaign = await self.campaign_repo.create(campaign_data)
        return campaign

    async def get_campaign(
        self, campaign_id: UUID, organization_id: UUID
    ) -> Optional[Campaign]:
        """
        Get campaign by ID

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Campaign or None
        """
        campaign = await self.campaign_repo.get(campaign_id)
        if campaign and campaign.organization_id != organization_id:
            return None
        if campaign and campaign.deleted_at:
            return None
        return campaign

    async def list_campaigns(
        self,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
    ) -> Tuple[List[Campaign], int]:
        """
        List all campaigns for organization

        Args:
            organization_id: Organization UUID
            skip: Records to skip
            limit: Max records
            status: Filter by status

        Returns:
            Tuple of (campaigns, total_count)
        """
        campaigns = await self.campaign_repo.get_by_organization(
            organization_id, skip, limit, status
        )
        total = await self.campaign_repo.count_by_organization(organization_id, status)
        return campaigns, total

    async def update_campaign(
        self, campaign_id: UUID, organization_id: UUID, data: CampaignUpdate
    ) -> Campaign:
        """
        Update campaign

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated campaign

        Raises:
            NotFoundException: If campaign not found
            BadRequestException: If campaign is not editable
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        # Can only edit draft or scheduled campaigns
        if campaign.status not in ["draft", "scheduled"]:
            raise BadRequestException(
                f"Cannot edit campaign with status '{campaign.status}'"
            )

        update_data = data.model_dump(exclude_unset=True)

        # Recalculate recipients if audience changed
        if any(
            key in update_data
            for key in [
                "audience_type",
                "target_tag_ids",
                "target_contact_ids",
                "segment_filters",
            ]
        ):
            total_recipients = await self._calculate_recipients(
                organization_id,
                update_data.get("audience_type", campaign.audience_type),
                update_data.get("target_tag_ids", campaign.target_tag_ids),
                update_data.get("target_contact_ids", campaign.target_contact_ids),
                update_data.get("segment_filters", campaign.segment_filters),
            )
            update_data["total_recipients"] = total_recipients
            update_data["messages_pending"] = total_recipients

        updated_campaign = await self.campaign_repo.update(campaign_id, update_data)
        return updated_campaign

    async def delete_campaign(self, campaign_id: UUID, organization_id: UUID):
        """
        Soft delete campaign

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If campaign not found
            BadRequestException: If campaign is running
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        if campaign.status == "running":
            raise BadRequestException("Cannot delete running campaign. Pause or cancel it first.")

        await self.campaign_repo.soft_delete(campaign_id)

    # ============================================
    # CAMPAIGN ACTIONS
    # ============================================

    async def schedule_campaign(
        self, campaign_id: UUID, organization_id: UUID, scheduled_at: datetime
    ) -> CampaignScheduleResponse:
        """
        Schedule campaign for future sending

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID
            scheduled_at: Time to send

        Returns:
            Schedule response

        Raises:
            NotFoundException: If campaign not found
            BadRequestException: If campaign is not schedulable
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        if campaign.status not in ["draft", "scheduled"]:
            raise BadRequestException(
                f"Cannot schedule campaign with status '{campaign.status}'"
            )

        if scheduled_at <= datetime.utcnow():
            raise BadRequestException("Scheduled time must be in the future")

        if campaign.total_recipients == 0:
            raise BadRequestException("Campaign has no recipients")

        await self.campaign_repo.update(
            campaign_id, {"status": "scheduled", "scheduled_at": scheduled_at}
        )

        return CampaignScheduleResponse(
            campaign_id=campaign_id,
            scheduled_at=scheduled_at,
            total_recipients=campaign.total_recipients,
            estimated_cost=campaign.estimated_cost,
            message=f"Campaign scheduled for {scheduled_at.isoformat()}",
        )

    async def start_campaign(
        self, campaign_id: UUID, organization_id: UUID
    ) -> CampaignStartResponse:
        """
        Start campaign immediately

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Start response

        Raises:
            NotFoundException: If campaign not found
            BadRequestException: If campaign cannot be started
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        if campaign.status not in ["draft", "scheduled", "paused"]:
            raise BadRequestException(
                f"Cannot start campaign with status '{campaign.status}'"
            )

        if campaign.total_recipients == 0:
            raise BadRequestException("Campaign has no recipients")

        updated_campaign = await self.campaign_repo.start_campaign(campaign_id)

        return CampaignStartResponse(
            campaign_id=campaign_id,
            status=updated_campaign.status,
            started_at=updated_campaign.started_at,
            total_recipients=campaign.total_recipients,
            message="Campaign started successfully",
        )

    async def pause_campaign(self, campaign_id: UUID, organization_id: UUID) -> Campaign:
        """
        Pause running campaign

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Updated campaign

        Raises:
            NotFoundException: If campaign not found
            BadRequestException: If campaign is not running
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        if campaign.status != "running":
            raise BadRequestException("Can only pause running campaigns")

        return await self.campaign_repo.pause_campaign(campaign_id)

    async def resume_campaign(self, campaign_id: UUID, organization_id: UUID) -> Campaign:
        """
        Resume paused campaign

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Updated campaign

        Raises:
            NotFoundException: If campaign not found
            BadRequestException: If campaign is not paused
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        if campaign.status != "paused":
            raise BadRequestException("Can only resume paused campaigns")

        return await self.campaign_repo.resume_campaign(campaign_id)

    async def cancel_campaign(self, campaign_id: UUID, organization_id: UUID) -> Campaign:
        """
        Cancel campaign

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Updated campaign

        Raises:
            NotFoundException: If campaign not found
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        if campaign.status in ["completed", "cancelled"]:
            raise BadRequestException(
                f"Cannot cancel campaign with status '{campaign.status}'"
            )

        return await self.campaign_repo.cancel_campaign(campaign_id)

    # ============================================
    # STATS & PROGRESS
    # ============================================

    async def get_campaign_stats(
        self, campaign_id: UUID, organization_id: UUID
    ) -> CampaignStats:
        """
        Get campaign statistics

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Campaign statistics

        Raises:
            NotFoundException: If campaign not found
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        progress_percentage = 0.0
        if campaign.total_recipients > 0:
            sent = campaign.messages_sent + campaign.messages_failed
            progress_percentage = (sent / campaign.total_recipients) * 100

        success_rate = 0.0
        if campaign.messages_sent > 0:
            success_rate = (campaign.messages_delivered / campaign.messages_sent) * 100

        return CampaignStats(
            total_recipients=campaign.total_recipients,
            messages_sent=campaign.messages_sent,
            messages_delivered=campaign.messages_delivered,
            messages_read=campaign.messages_read,
            messages_failed=campaign.messages_failed,
            messages_pending=campaign.messages_pending,
            replies_count=campaign.replies_count,
            unique_replies_count=campaign.unique_replies_count,
            opt_outs_count=campaign.opt_outs_count,
            delivery_rate=campaign.delivery_rate or 0.0,
            read_rate=campaign.read_rate or 0.0,
            reply_rate=campaign.reply_rate or 0.0,
            progress_percentage=progress_percentage,
            success_rate=success_rate,
        )

    async def get_campaign_progress(
        self, campaign_id: UUID, organization_id: UUID
    ) -> CampaignProgress:
        """
        Get campaign progress

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Campaign progress

        Raises:
            NotFoundException: If campaign not found
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        progress_percentage = 0.0
        if campaign.total_recipients > 0:
            sent = campaign.messages_sent + campaign.messages_failed
            progress_percentage = (sent / campaign.total_recipients) * 100

        # Estimate completion time
        estimated_completion_time = None
        if campaign.status == "running" and campaign.messages_sent > 0:
            # Simple estimation based on current rate
            from datetime import timedelta

            elapsed = (datetime.utcnow() - campaign.started_at).total_seconds()
            rate = campaign.messages_sent / elapsed  # messages per second
            remaining = campaign.messages_pending
            if rate > 0:
                seconds_remaining = remaining / rate
                estimated_completion_time = datetime.utcnow() + timedelta(
                    seconds=seconds_remaining
                )

        return CampaignProgress(
            status=campaign.status,
            total_recipients=campaign.total_recipients,
            messages_sent=campaign.messages_sent,
            messages_pending=campaign.messages_pending,
            messages_failed=campaign.messages_failed,
            progress_percentage=progress_percentage,
            estimated_completion_time=estimated_completion_time,
        )

    async def preview_audience(
        self, campaign_id: UUID, organization_id: UUID
    ) -> AudiencePreview:
        """
        Preview campaign audience

        Args:
            campaign_id: Campaign UUID
            organization_id: Organization UUID

        Returns:
            Audience preview

        Raises:
            NotFoundException: If campaign not found
        """
        campaign = await self.get_campaign(campaign_id, organization_id)
        if not campaign:
            raise NotFoundException("Campaign not found")

        # Get sample contacts (first 10)
        contacts = await self._get_target_contacts(
            organization_id,
            campaign.audience_type,
            campaign.target_tag_ids,
            campaign.target_contact_ids,
            campaign.segment_filters,
            limit=10,
        )

        sample_contacts = [
            {
                "id": str(c.id),
                "name": c.name,
                "whatsapp_id": c.whatsapp_id,
                "email": c.email,
            }
            for c in contacts
        ]

        return AudiencePreview(
            total_contacts=campaign.total_recipients,
            sample_contacts=sample_contacts,
            filters_applied={
                "audience_type": campaign.audience_type,
                "target_tag_ids": [str(t) for t in campaign.target_tag_ids],
                "segment_filters": campaign.segment_filters,
            },
        )

    # ============================================
    # HELPER METHODS
    # ============================================

    async def _calculate_recipients(
        self,
        organization_id: UUID,
        audience_type: str,
        target_tag_ids: List[UUID],
        target_contact_ids: List[UUID],
        segment_filters: dict,
    ) -> int:
        """Calculate total number of recipients"""
        if audience_type == "custom_list":
            return len(target_contact_ids)

        contacts = await self._get_target_contacts(
            organization_id,
            audience_type,
            target_tag_ids,
            target_contact_ids,
            segment_filters,
        )
        return len(contacts)

    async def _get_target_contacts(
        self,
        organization_id: UUID,
        audience_type: str,
        target_tag_ids: List[UUID],
        target_contact_ids: List[UUID],
        segment_filters: dict,
        limit: Optional[int] = None,
    ) -> List[Contact]:
        """Get target contacts based on audience configuration"""
        if audience_type == "all_contacts":
            return await self.contact_repo.get_by_organization(
                organization_id, limit=limit or 10000
            )

        elif audience_type == "tags":
            # Get contacts with any of the target tags
            contacts = []
            for tag_id in target_tag_ids:
                tag_contacts = await self.contact_repo.get_by_tag(
                    tag_id, organization_id
                )
                contacts.extend(tag_contacts)
            # Remove duplicates
            unique_contacts = {c.id: c for c in contacts}.values()
            result = list(unique_contacts)
            if limit:
                result = result[:limit]
            return result

        elif audience_type == "custom_list":
            contacts = []
            for contact_id in target_contact_ids:
                contact = await self.contact_repo.get(contact_id)
                if contact and contact.organization_id == organization_id:
                    contacts.append(contact)
            if limit:
                contacts = contacts[:limit]
            return contacts

        elif audience_type == "segment":
            # TODO: Implement segment filtering based on segment_filters
            # This would require complex query building
            return []

        return []
