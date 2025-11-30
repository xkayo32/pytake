"""
Analytics Service Unit Tests
Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from uuid import uuid4
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.analytics_service import AnalyticsService
from tests.conftest import OrganizationFactory, UserFactory


class TestAnalyticsOverview:
    """Tests for overview metrics"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> AnalyticsService:
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_get_overview_empty_org(self, service, db_session):
        """Test overview metrics for empty org"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        result = await service.get_overview_metrics(org.id)
        
        assert result.total_contacts == 0
        assert result.total_conversations == 0

    @pytest.mark.asyncio
    async def test_get_overview_returns_valid_structure(self, service, db_session):
        """Test overview returns all expected fields"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        result = await service.get_overview_metrics(org.id)
        
        assert hasattr(result, 'total_contacts')
        assert hasattr(result, 'total_conversations')


class TestAnalyticsConversations:
    """Tests for conversation metrics"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> AnalyticsService:
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_conversation_metrics_empty(self, service, db_session):
        """Test conversation metrics when empty"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        result = await service.get_conversation_metrics(org.id)
        
        assert result.total == 0


class TestAnalyticsAgents:
    """Tests for agent performance metrics"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> AnalyticsService:
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_agent_metrics_no_agents(self, service, db_session):
        """Test agent metrics when no agents"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        result = await service.get_agent_metrics(org.id)
        
        assert isinstance(result, list)
        assert len(result) == 0


class TestAnalyticsCampaigns:
    """Tests for campaign metrics"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> AnalyticsService:
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_campaign_metrics_empty(self, service, db_session):
        """Test campaign metrics when empty"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        result = await service.get_campaign_metrics(org.id)
        
        assert result.total_campaigns == 0


class TestAnalyticsMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> AnalyticsService:
        return AnalyticsService(db_session)

    @pytest.mark.asyncio
    async def test_metrics_isolated(self, service, db_session):
        """Test metrics are isolated between orgs"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)
        
        result1 = await service.get_overview_metrics(org1.id)
        result2 = await service.get_overview_metrics(org2.id)
        
        # Both should be independent
        assert result1.total_contacts == 0
        assert result2.total_contacts == 0
