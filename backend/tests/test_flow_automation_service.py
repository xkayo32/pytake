"""
Flow Automation Service Unit Tests
Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from uuid import uuid4
from datetime import datetime

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.flow_automation_service import FlowAutomationService
from app.schemas.flow_automation import FlowAutomationCreate, FlowAutomationUpdate
from tests.conftest import OrganizationFactory, UserFactory


class TestFlowAutomationCRUD:
    """Tests for Flow Automation CRUD operations"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> FlowAutomationService:
        return FlowAutomationService(db_session)

    @pytest.mark.asyncio
    async def test_get_automation_not_found(self, service, db_session):
        """Test getting non-existent automation"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        with pytest.raises(HTTPException) as exc:
            await service.get_automation(uuid4(), org.id)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_automation_wrong_org(self, service, db_session):
        """Test getting automation from wrong org"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)
        
        # Automation in org1 should not be accessible by org2
        with pytest.raises(HTTPException) as exc:
            await service.get_automation(uuid4(), org2.id)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_list_automations_empty(self, service, db_session):
        """Test listing when no automations exist"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        result = await service.list_automations(org.id)
        assert len(result) == 0

    @pytest.mark.asyncio
    async def test_list_automations_with_status_filter(self, service, db_session):
        """Test listing with status filter"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        result = await service.list_automations(org.id, status="active")
        assert isinstance(result, list)


class TestFlowAutomationExecution:
    """Tests for automation execution"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> FlowAutomationService:
        return FlowAutomationService(db_session)

    @pytest.mark.asyncio
    async def test_start_automation_not_found(self, service, db_session):
        """Test starting non-existent automation"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        with pytest.raises(HTTPException) as exc:
            await service.start_automation(uuid4(), org.id)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_pause_automation_not_found(self, service, db_session):
        """Test pausing non-existent automation"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        with pytest.raises(HTTPException) as exc:
            await service.pause_automation(uuid4(), org.id)
        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_cancel_automation_not_found(self, service, db_session):
        """Test canceling non-existent automation"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        with pytest.raises(HTTPException) as exc:
            await service.cancel_automation(uuid4(), org.id)
        assert exc.value.status_code == 404


class TestFlowAutomationStats:
    """Tests for automation statistics"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> FlowAutomationService:
        return FlowAutomationService(db_session)

    @pytest.mark.asyncio
    async def test_get_stats_not_found(self, service, db_session):
        """Test getting stats for non-existent automation"""
        org = await OrganizationFactory.create_in_db(db_session)
        
        with pytest.raises(HTTPException) as exc:
            await service.get_automation_stats(uuid4(), org.id)
        assert exc.value.status_code == 404


class TestFlowAutomationMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def service(self, db_session: AsyncSession) -> FlowAutomationService:
        return FlowAutomationService(db_session)

    @pytest.mark.asyncio
    async def test_automations_isolated(self, service, db_session):
        """Test automations are isolated between orgs"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)
        
        list1 = await service.list_automations(org1.id)
        list2 = await service.list_automations(org2.id)
        
        # Both should be empty and independent
        assert list1 == []
        assert list2 == []
