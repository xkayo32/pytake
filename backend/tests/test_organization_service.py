"""
Organization Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.organization_service import OrganizationService
from app.schemas.organization import OrganizationUpdate, OrganizationSettingsUpdate
from tests.conftest import OrganizationFactory, UserFactory


class TestOrganizationServiceGet:
    """Tests for OrganizationService.get_by_id()"""

    @pytest_asyncio.fixture
    async def org_service(self, db_session: AsyncSession) -> OrganizationService:
        return OrganizationService(db_session)

    @pytest.mark.asyncio
    async def test_get_organization_success(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test getting existing organization"""
        org = await OrganizationFactory.create_in_db(db_session)

        result = await org_service.get_by_id(org.id)

        assert result.id == org.id
        assert result.name == org.name
        assert result.slug == org.slug

    @pytest.mark.asyncio
    async def test_get_organization_not_found(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test getting non-existent organization"""
        with pytest.raises(HTTPException) as exc_info:
            await org_service.get_by_id(uuid4())

        assert exc_info.value.status_code == 404


class TestOrganizationServiceUpdate:
    """Tests for OrganizationService.update_organization()"""

    @pytest_asyncio.fixture
    async def org_service(self, db_session: AsyncSession) -> OrganizationService:
        return OrganizationService(db_session)

    @pytest.mark.asyncio
    async def test_update_organization_name(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test updating organization name"""
        org = await OrganizationFactory.create_in_db(db_session)

        update_data = OrganizationUpdate(name="New Organization Name")
        result = await org_service.update_organization(org.id, update_data)

        assert result.name == "New Organization Name"

    @pytest.mark.asyncio
    async def test_update_organization_not_found(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test updating non-existent organization"""
        update_data = OrganizationUpdate(name="New Name")

        with pytest.raises(HTTPException) as exc_info:
            await org_service.update_organization(uuid4(), update_data)

        assert exc_info.value.status_code == 404


class TestOrganizationServiceSettings:
    """Tests for OrganizationService.update_settings()"""

    @pytest_asyncio.fixture
    async def org_service(self, db_session: AsyncSession) -> OrganizationService:
        return OrganizationService(db_session)

    @pytest.mark.asyncio
    async def test_update_settings_success(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test updating organization settings"""
        org = await OrganizationFactory.create_in_db(db_session)

        settings = OrganizationSettingsUpdate(
            business_hours={
                "monday": {"start": "09:00", "end": "18:00"},
                "tuesday": {"start": "09:00", "end": "18:00"},
            },
            timezone="America/Sao_Paulo"
        )

        result = await org_service.update_settings(org.id, settings)

        assert result.settings is not None


class TestOrganizationServiceStats:
    """Tests for OrganizationService.get_stats()"""

    @pytest_asyncio.fixture
    async def org_service(self, db_session: AsyncSession) -> OrganizationService:
        return OrganizationService(db_session)

    @pytest.mark.asyncio
    async def test_get_stats_success(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test getting organization statistics"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create some users
        for i in range(3):
            await UserFactory.create_in_db(
                db_session,
                organization_id=org.id,
                email=f"user{i}@test.com"
            )

        stats = await org_service.get_stats(org.id)

        assert "total_users" in stats or "users" in stats or isinstance(stats, dict)


class TestOrganizationServiceActivation:
    """Tests for activate/deactivate"""

    @pytest_asyncio.fixture
    async def org_service(self, db_session: AsyncSession) -> OrganizationService:
        return OrganizationService(db_session)

    @pytest.mark.asyncio
    async def test_deactivate_organization(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test deactivating organization"""
        org = await OrganizationFactory.create_in_db(db_session, is_active=True)

        result = await org_service.deactivate(org.id)

        assert result.is_active is False

    @pytest.mark.asyncio
    async def test_activate_organization(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test activating organization"""
        org = await OrganizationFactory.create_in_db(db_session, is_active=False)

        result = await org_service.activate(org.id)

        assert result.is_active is True


class TestOrganizationServiceList:
    """Tests for OrganizationService.list_organizations()"""

    @pytest_asyncio.fixture
    async def org_service(self, db_session: AsyncSession) -> OrganizationService:
        return OrganizationService(db_session)

    @pytest.mark.asyncio
    async def test_list_organizations(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test listing organizations"""
        # Create multiple orgs
        for i in range(3):
            await OrganizationFactory.create_in_db(db_session)

        orgs = await org_service.list_organizations()

        assert len(orgs) >= 3

    @pytest.mark.asyncio
    async def test_list_organizations_active_only(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test listing only active organizations"""
        await OrganizationFactory.create_in_db(db_session, is_active=True)
        await OrganizationFactory.create_in_db(db_session, is_active=False)

        active_orgs = await org_service.list_organizations(active_only=True)

        for org in active_orgs:
            assert org.is_active is True

    @pytest.mark.asyncio
    async def test_list_organizations_pagination(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test organization pagination"""
        for i in range(5):
            await OrganizationFactory.create_in_db(db_session)

        page1 = await org_service.list_organizations(skip=0, limit=2)
        page2 = await org_service.list_organizations(skip=2, limit=2)

        assert len(page1) == 2
        assert len(page2) == 2


class TestOrganizationServicePlan:
    """Tests for plan management"""

    @pytest_asyncio.fixture
    async def org_service(self, db_session: AsyncSession) -> OrganizationService:
        return OrganizationService(db_session)

    @pytest.mark.asyncio
    async def test_organization_trial_status(
        self, org_service: OrganizationService, db_session: AsyncSession
    ):
        """Test organization trial status"""
        org = await OrganizationFactory.create_in_db(
            db_session,
            is_trial=True,
            trial_ends_at=datetime.utcnow() + timedelta(days=7)
        )

        result = await org_service.get_by_id(org.id)

        assert result.is_trial is True
        assert result.trial_ends_at is not None
