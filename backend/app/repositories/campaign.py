"""
Campaign repository
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.campaign import Campaign
from app.repositories.base import BaseRepository


class CampaignRepository(BaseRepository[Campaign]):
    """Repository for Campaign model"""

    def __init__(self, db: AsyncSession):
        super().__init__(Campaign, db)

    async def get_by_id(self, id: UUID, organization_id: UUID) -> Optional[Campaign]:
        """Get campaign by ID within organization"""
        result = await self.db.execute(
            select(Campaign)
            .where(Campaign.id == id)
            .where(Campaign.organization_id == organization_id)
            .where(Campaign.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def get_by_organization(
        self,
        organization_id: UUID,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        include_deleted: bool = False,
    ) -> List[Campaign]:
        """
        Get all campaigns for an organization

        Args:
            organization_id: Organization UUID
            skip: Number of records to skip
            limit: Maximum number of records
            status: Filter by status
            include_deleted: Include soft-deleted records

        Returns:
            List of campaigns
        """
        query = select(Campaign).where(Campaign.organization_id == organization_id)

        if status:
            query = query.where(Campaign.status == status)

        if not include_deleted:
            query = query.where(Campaign.deleted_at.is_(None))

        query = query.offset(skip).limit(limit).order_by(Campaign.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_by_organization(
        self, organization_id: UUID, status: Optional[str] = None, include_deleted: bool = False
    ) -> int:
        """
        Count campaigns for organization

        Args:
            organization_id: Organization UUID
            status: Filter by status
            include_deleted: Include soft-deleted records

        Returns:
            Count of campaigns
        """
        query = select(func.count(Campaign.id)).where(
            Campaign.organization_id == organization_id
        )

        if status:
            query = query.where(Campaign.status == status)

        if not include_deleted:
            query = query.where(Campaign.deleted_at.is_(None))

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def get_scheduled_campaigns(
        self, organization_id: UUID, before_time: Optional[datetime] = None
    ) -> List[Campaign]:
        """
        Get scheduled campaigns ready to run

        Args:
            organization_id: Organization UUID
            before_time: Get campaigns scheduled before this time (default: now)

        Returns:
            List of scheduled campaigns
        """
        if before_time is None:
            before_time = datetime.utcnow()

        result = await self.db.execute(
            select(Campaign)
            .where(Campaign.organization_id == organization_id)
            .where(Campaign.status == "scheduled")
            .where(Campaign.scheduled_at <= before_time)
            .where(Campaign.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def get_running_campaigns(self, organization_id: UUID) -> List[Campaign]:
        """
        Get all running campaigns

        Args:
            organization_id: Organization UUID

        Returns:
            List of running campaigns
        """
        result = await self.db.execute(
            select(Campaign)
            .where(Campaign.organization_id == organization_id)
            .where(Campaign.status == "running")
            .where(Campaign.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def get_by_status(
        self, organization_id: UUID, status: str
    ) -> List[Campaign]:
        """
        Get campaigns by status

        Args:
            organization_id: Organization UUID
            status: Campaign status

        Returns:
            List of campaigns
        """
        result = await self.db.execute(
            select(Campaign)
            .where(Campaign.organization_id == organization_id)
            .where(Campaign.status == status)
            .where(Campaign.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def update_stats(
        self,
        campaign_id: UUID,
        messages_sent: int = 0,
        messages_delivered: int = 0,
        messages_read: int = 0,
        messages_failed: int = 0,
        replies_count: int = 0,
    ):
        """
        Update campaign statistics

        Args:
            campaign_id: Campaign UUID
            messages_sent: Number to increment sent
            messages_delivered: Number to increment delivered
            messages_read: Number to increment read
            messages_failed: Number to increment failed
            replies_count: Number to increment replies
        """
        campaign = await self.get(campaign_id)
        if campaign:
            campaign.messages_sent += messages_sent
            campaign.messages_delivered += messages_delivered
            campaign.messages_read += messages_read
            campaign.messages_failed += messages_failed
            campaign.replies_count += replies_count
            campaign.messages_pending = max(
                0, campaign.total_recipients - campaign.messages_sent - campaign.messages_failed
            )

            # Update rates
            if campaign.messages_sent > 0:
                campaign.delivery_rate = (campaign.messages_delivered / campaign.messages_sent) * 100
                campaign.read_rate = (campaign.messages_read / campaign.messages_sent) * 100
                campaign.reply_rate = (campaign.replies_count / campaign.messages_sent) * 100

            await self.db.commit()
            await self.db.refresh(campaign)

    async def start_campaign(self, campaign_id: UUID) -> Campaign:
        """
        Mark campaign as started

        Args:
            campaign_id: Campaign UUID

        Returns:
            Updated campaign
        """
        campaign = await self.get(campaign_id)
        if campaign:
            campaign.status = "running"
            campaign.started_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(campaign)
        return campaign

    async def pause_campaign(self, campaign_id: UUID) -> Campaign:
        """
        Pause campaign

        Args:
            campaign_id: Campaign UUID

        Returns:
            Updated campaign
        """
        campaign = await self.get(campaign_id)
        if campaign:
            campaign.status = "paused"
            campaign.paused_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(campaign)
        return campaign

    async def resume_campaign(self, campaign_id: UUID) -> Campaign:
        """
        Resume paused campaign

        Args:
            campaign_id: Campaign UUID

        Returns:
            Updated campaign
        """
        campaign = await self.get(campaign_id)
        if campaign:
            campaign.status = "running"
            campaign.paused_at = None
            await self.db.commit()
            await self.db.refresh(campaign)
        return campaign

    async def complete_campaign(self, campaign_id: UUID) -> Campaign:
        """
        Mark campaign as completed

        Args:
            campaign_id: Campaign UUID

        Returns:
            Updated campaign
        """
        campaign = await self.get(campaign_id)
        if campaign:
            campaign.status = "completed"
            campaign.completed_at = datetime.utcnow()

            # Calculate final rates
            if campaign.messages_sent > 0:
                campaign.delivery_rate = (campaign.messages_delivered / campaign.messages_sent) * 100
                campaign.read_rate = (campaign.messages_read / campaign.messages_sent) * 100
                campaign.reply_rate = (campaign.replies_count / campaign.messages_sent) * 100

            await self.db.commit()
            await self.db.refresh(campaign)
        return campaign

    async def cancel_campaign(self, campaign_id: UUID) -> Campaign:
        """
        Cancel campaign

        Args:
            campaign_id: Campaign UUID

        Returns:
            Updated campaign
        """
        campaign = await self.get(campaign_id)
        if campaign:
            campaign.status = "cancelled"
            campaign.cancelled_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(campaign)
        return campaign
