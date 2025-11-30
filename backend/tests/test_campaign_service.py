"""
Campaign Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.campaign_service import CampaignService
from app.schemas.campaign import CampaignCreate, CampaignUpdate
from app.core.exceptions import NotFoundException, BadRequestException
from tests.conftest import OrganizationFactory, UserFactory


class TestCampaignServiceCreate:
    """Tests for CampaignService.create_campaign()"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_create_campaign_success(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test successful campaign creation"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        data = CampaignCreate(
            name="Test Campaign",
            description="Test Description",
            message_template="Hello {{name}}!",
            audience_type="all"
        )

        campaign = await campaign_service.create_campaign(data, org.id, user.id)

        assert campaign.name == "Test Campaign"
        assert campaign.status == "draft"
        assert campaign.organization_id == org.id

    @pytest.mark.asyncio
    async def test_create_campaign_with_tags(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test campaign creation with tag targeting"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        data = CampaignCreate(
            name="Tagged Campaign",
            message_template="Hello!",
            audience_type="by_tags",
            target_tag_ids=[uuid4(), uuid4()]
        )

        campaign = await campaign_service.create_campaign(data, org.id, user.id)

        assert campaign.name == "Tagged Campaign"
        assert campaign.audience_type == "by_tags"


class TestCampaignServiceGet:
    """Tests for CampaignService.get_campaign()"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_get_campaign_not_found(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test getting non-existent campaign returns None"""
        org = await OrganizationFactory.create_in_db(db_session)

        campaign = await campaign_service.get_campaign(uuid4(), org.id)

        assert campaign is None

    @pytest.mark.asyncio
    async def test_get_campaign_wrong_organization(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test getting campaign from wrong organization returns None"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org1.id)

        # Create campaign in org1
        data = CampaignCreate(
            name="Org1 Campaign",
            message_template="Hello!",
            audience_type="all"
        )
        campaign = await campaign_service.create_campaign(data, org1.id, user.id)

        # Try to get from org2
        result = await campaign_service.get_campaign(campaign.id, org2.id)

        assert result is None


class TestCampaignServiceList:
    """Tests for CampaignService.list_campaigns()"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_list_campaigns_empty(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test listing campaigns when empty"""
        org = await OrganizationFactory.create_in_db(db_session)

        campaigns = await campaign_service.list_campaigns(org.id)

        assert len(campaigns) == 0

    @pytest.mark.asyncio
    async def test_list_campaigns_with_status_filter(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test listing campaigns with status filter"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        # Create campaigns
        for i in range(3):
            data = CampaignCreate(
                name=f"Campaign {i}",
                message_template="Hello!",
                audience_type="all"
            )
            await campaign_service.create_campaign(data, org.id, user.id)

        # List with status filter
        draft_campaigns = await campaign_service.list_campaigns(org.id, status="draft")

        assert len(draft_campaigns) == 3

    @pytest.mark.asyncio
    async def test_list_campaigns_pagination(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test campaign pagination"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        # Create 5 campaigns
        for i in range(5):
            data = CampaignCreate(
                name=f"Campaign {i}",
                message_template="Hello!",
                audience_type="all"
            )
            await campaign_service.create_campaign(data, org.id, user.id)

        # Get first page
        page1 = await campaign_service.list_campaigns(org.id, skip=0, limit=2)
        assert len(page1) == 2

        # Get second page
        page2 = await campaign_service.list_campaigns(org.id, skip=2, limit=2)
        assert len(page2) == 2


class TestCampaignServiceUpdate:
    """Tests for CampaignService.update_campaign()"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_update_campaign_success(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test successful campaign update"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        # Create campaign
        create_data = CampaignCreate(
            name="Original Name",
            message_template="Hello!",
            audience_type="all"
        )
        campaign = await campaign_service.create_campaign(create_data, org.id, user.id)

        # Update campaign
        update_data = CampaignUpdate(name="Updated Name")
        updated = await campaign_service.update_campaign(campaign.id, org.id, update_data)

        assert updated.name == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_campaign_not_found(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test updating non-existent campaign"""
        org = await OrganizationFactory.create_in_db(db_session)

        update_data = CampaignUpdate(name="New Name")

        with pytest.raises((NotFoundException, HTTPException, Exception)):
            await campaign_service.update_campaign(uuid4(), org.id, update_data)


class TestCampaignServiceDelete:
    """Tests for CampaignService.delete_campaign()"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_delete_campaign_success(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test successful campaign deletion"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        # Create campaign
        data = CampaignCreate(
            name="To Delete",
            message_template="Hello!",
            audience_type="all"
        )
        campaign = await campaign_service.create_campaign(data, org.id, user.id)

        # Delete campaign
        await campaign_service.delete_campaign(campaign.id, org.id)

        # Should not be found
        result = await campaign_service.get_campaign(campaign.id, org.id)
        assert result is None


class TestCampaignServiceSchedule:
    """Tests for campaign scheduling"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_schedule_campaign_success(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test scheduling a campaign"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        # Create campaign
        data = CampaignCreate(
            name="Scheduled Campaign",
            message_template="Hello!",
            audience_type="all"
        )
        campaign = await campaign_service.create_campaign(data, org.id, user.id)

        # Schedule campaign
        scheduled_at = datetime.utcnow() + timedelta(hours=1)
        result = await campaign_service.schedule_campaign(campaign.id, org.id, scheduled_at)

        assert result.status == "scheduled"
        assert result.scheduled_at is not None


class TestCampaignServiceStart:
    """Tests for starting campaigns"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_start_campaign_success(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test starting a campaign"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        # Create campaign
        data = CampaignCreate(
            name="To Start",
            message_template="Hello!",
            audience_type="all"
        )
        campaign = await campaign_service.create_campaign(data, org.id, user.id)

        # Start campaign
        result = await campaign_service.start_campaign(campaign.id, org.id)

        assert result.status in ["running", "sending", "completed"]


class TestCampaignServiceStats:
    """Tests for campaign statistics"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_get_campaign_stats(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test getting campaign statistics"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        # Create campaign
        data = CampaignCreate(
            name="Stats Campaign",
            message_template="Hello!",
            audience_type="all"
        )
        campaign = await campaign_service.create_campaign(data, org.id, user.id)

        # Get stats
        stats = await campaign_service.get_campaign_stats(campaign.id, org.id)

        assert stats is not None
        assert hasattr(stats, 'total_messages') or isinstance(stats, dict)


class TestCampaignServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def campaign_service(self, db_session: AsyncSession) -> CampaignService:
        return CampaignService(db_session)

    @pytest.mark.asyncio
    async def test_campaigns_isolated_by_organization(
        self, campaign_service: CampaignService, db_session: AsyncSession
    ):
        """Test that campaigns are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)
        user1 = await UserFactory.create_in_db(db_session, organization_id=org1.id)
        user2 = await UserFactory.create_in_db(db_session, organization_id=org2.id)

        # Create campaigns in both orgs
        data1 = CampaignCreate(name="Org1 Campaign", message_template="Hello!", audience_type="all")
        data2 = CampaignCreate(name="Org2 Campaign", message_template="Hello!", audience_type="all")

        await campaign_service.create_campaign(data1, org1.id, user1.id)
        await campaign_service.create_campaign(data2, org2.id, user2.id)

        # List should only show org's own campaigns
        org1_campaigns = await campaign_service.list_campaigns(org1.id)
        org2_campaigns = await campaign_service.list_campaigns(org2.id)

        assert len(org1_campaigns) == 1
        assert len(org2_campaigns) == 1
        assert org1_campaigns[0].name == "Org1 Campaign"
        assert org2_campaigns[0].name == "Org2 Campaign"
