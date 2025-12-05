"""
Department Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.department_service import DepartmentService
from app.schemas.department import DepartmentCreate, DepartmentUpdate
from tests.conftest import OrganizationFactory, UserFactory


class TestDepartmentServiceCreate:
    """Tests for DepartmentService.create()"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_create_department_success(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test successful department creation"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = DepartmentCreate(
            name="Sales Team",
            description="Sales department",
            slug="sales"
        )

        department = await department_service.create(org.id, data)

        assert department.name == data.name
        assert department.description == data.description
        assert department.slug == data.slug
        assert department.organization_id == org.id
        assert department.is_active is True

    @pytest.mark.asyncio
    async def test_create_department_minimal(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test department creation with minimal data"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = DepartmentCreate(
            name="Support",
            slug="support"
        )

        department = await department_service.create(org.id, data)

        assert department.name == "Support"
        assert department.slug == "support"


class TestDepartmentServiceGet:
    """Tests for DepartmentService.get()"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_get_department_success(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test successful department retrieval"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = DepartmentCreate(name="Finance", slug="finance")
        created = await department_service.create(org.id, data)

        retrieved = await department_service.get(created.id, org.id)

        assert retrieved.id == created.id
        assert retrieved.name == created.name

    @pytest.mark.asyncio
    async def test_get_department_not_found(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test department not found"""
        org = await OrganizationFactory.create_in_db(db_session)
        fake_id = uuid4()

        with pytest.raises(HTTPException) as exc:
            await department_service.get(fake_id, org.id)

        assert exc.value.status_code == 404


class TestDepartmentServiceList:
    """Tests for DepartmentService.list()"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_list_departments_empty(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test listing departments when empty"""
        org = await OrganizationFactory.create_in_db(db_session)

        departments = await department_service.list(org.id)

        assert len(departments) == 0

    @pytest.mark.asyncio
    async def test_list_departments_multiple(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test listing multiple departments"""
        org = await OrganizationFactory.create_in_db(db_session)

        await department_service.create(org.id, DepartmentCreate(name="Sales", slug="sales"))
        await department_service.create(org.id, DepartmentCreate(name="Support", slug="support"))
        await department_service.create(org.id, DepartmentCreate(name="Finance", slug="finance"))

        departments = await department_service.list(org.id)

        assert len(departments) == 3

    @pytest.mark.asyncio
    async def test_list_departments_filters_by_organization(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test that list only returns departments from same organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        await department_service.create(org1.id, DepartmentCreate(name="Org1 Sales", slug="org1-sales"))
        await department_service.create(org2.id, DepartmentCreate(name="Org2 Sales", slug="org2-sales"))

        org1_depts = await department_service.list(org1.id)
        org2_depts = await department_service.list(org2.id)

        assert len(org1_depts) == 1
        assert len(org2_depts) == 1
        assert org1_depts[0].name == "Org1 Sales"
        assert org2_depts[0].name == "Org2 Sales"


class TestDepartmentServiceUpdate:
    """Tests for DepartmentService.update()"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_update_department_name(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test updating department name"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = DepartmentCreate(name="Old Name", slug="dept")
        department = await department_service.create(org.id, data)

        update_data = DepartmentUpdate(name="New Name")
        updated = await department_service.update(department.id, org.id, update_data)

        assert updated.name == "New Name"

    @pytest.mark.asyncio
    async def test_update_department_description(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test updating department description"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = DepartmentCreate(name="Department", slug="dept", description="Old")
        department = await department_service.create(org.id, data)

        update_data = DepartmentUpdate(description="New description")
        updated = await department_service.update(department.id, org.id, update_data)

        assert updated.description == "New description"


class TestDepartmentServiceDelete:
    """Tests for DepartmentService.delete()"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_delete_department_success(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test successful department deletion (soft delete)"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = DepartmentCreate(name="To Delete", slug="delete")
        department = await department_service.create(org.id, data)

        await department_service.delete(department.id, org.id)

        with pytest.raises(HTTPException) as exc:
            await department_service.get(department.id, org.id)

        assert exc.value.status_code == 404


class TestDepartmentServiceAgents:
    """Tests for DepartmentService.add_agent() and remove_agent()"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_add_agent_to_department(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test adding agent to department"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        data = DepartmentCreate(name="Sales", slug="sales")
        department = await department_service.create(org.id, data)

        updated = await department_service.add_agent(department.id, user.id, org.id)

        assert updated is not None

    @pytest.mark.asyncio
    async def test_remove_agent_from_department(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test removing agent from department"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        data = DepartmentCreate(name="Sales", slug="sales")
        department = await department_service.create(org.id, data)

        # Add agent first
        await department_service.add_agent(department.id, user.id, org.id)

        # Then remove
        updated = await department_service.remove_agent(department.id, user.id, org.id)

        assert updated is not None


class TestDepartmentServiceStats:
    """Tests for DepartmentService.get_stats()"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_get_department_stats(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test getting department statistics"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = DepartmentCreate(name="Support", slug="support")
        department = await department_service.create(org.id, data)

        stats = await department_service.get_stats(department.id, org.id)

        assert stats is not None
        # New department should have zero stats
        assert stats.get("total_agents", 0) >= 0
        assert stats.get("active_conversations", 0) >= 0


class TestDepartmentServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_department_isolation_between_organizations(
        self, department_service: DepartmentService, db_session: AsyncSession
    ):
        """Test that departments are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        dept1 = await department_service.create(
            org1.id, DepartmentCreate(name="Org1 Dept", slug="org1")
        )
        dept2 = await department_service.create(
            org2.id, DepartmentCreate(name="Org2 Dept", slug="org2")
        )

        # Org1 should not be able to access Org2's department
        with pytest.raises(HTTPException):
            await department_service.get(dept2.id, org1.id)

        # Org2 should not be able to access Org1's department
        with pytest.raises(HTTPException):
            await department_service.get(dept1.id, org2.id)

        # Each org should only see their own departments
        org1_depts = await department_service.list(org1.id)
        org2_depts = await department_service.list(org2.id)

        assert len(org1_depts) == 1
        assert len(org2_depts) == 1
        assert org1_depts[0].id == dept1.id
        assert org2_depts[0].id == dept2.id
