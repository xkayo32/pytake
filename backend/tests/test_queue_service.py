"""
Queue Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.queue_service import QueueService
from app.services.department_service import DepartmentService
from app.schemas.queue import QueueCreate, QueueUpdate
from app.schemas.department import DepartmentCreate
from tests.conftest import OrganizationFactory


class TestQueueServiceCreate:
    """Tests for QueueService.create_queue()"""

    @pytest_asyncio.fixture
    async def queue_service(self, db_session: AsyncSession) -> QueueService:
        return QueueService(db_session)

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_create_queue_success(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test successful queue creation"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create department first
        dept = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )

        data = QueueCreate(
            department_id=dept.id,
            name="VIP Queue",
            slug="vip",
            description="Priority queue for VIP customers",
            priority=100,
            sla_minutes=15
        )

        queue = await queue_service.create_queue(org.id, data)

        assert queue.name == data.name
        assert queue.slug == data.slug
        assert queue.department_id == dept.id
        assert queue.organization_id == org.id
        assert queue.priority == 100
        assert queue.sla_minutes == 15
        assert queue.is_active is True

    @pytest.mark.asyncio
    async def test_create_queue_minimal(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test queue creation with minimal data"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept = await department_service.create(
            org.id, DepartmentCreate(name="Support", slug="support")
        )

        data = QueueCreate(
            department_id=dept.id,
            name="Normal Queue",
            slug="normal"
        )

        queue = await queue_service.create_queue(org.id, data)

        assert queue.name == "Normal Queue"
        assert queue.slug == "normal"

    @pytest.mark.asyncio
    async def test_create_queue_duplicate_slug_in_same_department_fails(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test that duplicate slug in same department is rejected"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )

        # Create first queue
        await queue_service.create_queue(
            org.id,
            QueueCreate(department_id=dept.id, name="Queue 1", slug="vip")
        )

        # Try to create second with same slug in same department
        with pytest.raises(HTTPException) as exc:
            await queue_service.create_queue(
                org.id,
                QueueCreate(department_id=dept.id, name="Queue 2", slug="vip")
            )

        assert exc.value.status_code == 400
        assert "already exists" in str(exc.value.detail)

    @pytest.mark.asyncio
    async def test_create_queue_same_slug_in_different_departments_allowed(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test that same slug in different departments is allowed"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept1 = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )
        dept2 = await department_service.create(
            org.id, DepartmentCreate(name="Support", slug="support")
        )

        # Create queue with slug "vip" in dept1
        queue1 = await queue_service.create_queue(
            org.id,
            QueueCreate(department_id=dept1.id, name="Sales VIP", slug="vip")
        )

        # Create queue with same slug "vip" in dept2 - should be allowed
        queue2 = await queue_service.create_queue(
            org.id,
            QueueCreate(department_id=dept2.id, name="Support VIP", slug="vip")
        )

        assert queue1.slug == queue2.slug == "vip"
        assert queue1.department_id != queue2.department_id


class TestQueueServiceGet:
    """Tests for QueueService.get_queue()"""

    @pytest_asyncio.fixture
    async def queue_service(self, db_session: AsyncSession) -> QueueService:
        return QueueService(db_session)

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_get_queue_success(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test successful queue retrieval"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )

        data = QueueCreate(department_id=dept.id, name="Test Queue", slug="test")
        created = await queue_service.create_queue(org.id, data)

        retrieved = await queue_service.get_queue(created.id, org.id)

        assert retrieved.id == created.id
        assert retrieved.name == created.name

    @pytest.mark.asyncio
    async def test_get_queue_not_found(
        self, queue_service: QueueService, db_session: AsyncSession
    ):
        """Test queue not found"""
        org = await OrganizationFactory.create_in_db(db_session)
        fake_id = uuid4()

        with pytest.raises(HTTPException) as exc:
            await queue_service.get_queue(fake_id, org.id)

        assert exc.value.status_code == 404


class TestQueueServiceList:
    """Tests for QueueService.list_queues()"""

    @pytest_asyncio.fixture
    async def queue_service(self, db_session: AsyncSession) -> QueueService:
        return QueueService(db_session)

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_list_queues_empty(
        self, queue_service: QueueService, db_session: AsyncSession
    ):
        """Test listing queues when empty"""
        org = await OrganizationFactory.create_in_db(db_session)

        queues = await queue_service.list_queues(org.id)

        assert len(queues) == 0

    @pytest.mark.asyncio
    async def test_list_queues_multiple(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test listing multiple queues"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )

        await queue_service.create_queue(
            org.id, QueueCreate(department_id=dept.id, name="VIP", slug="vip")
        )
        await queue_service.create_queue(
            org.id, QueueCreate(department_id=dept.id, name="Normal", slug="normal")
        )
        await queue_service.create_queue(
            org.id, QueueCreate(department_id=dept.id, name="Low", slug="low")
        )

        queues = await queue_service.list_queues(org.id)

        assert len(queues) == 3

    @pytest.mark.asyncio
    async def test_list_queues_filters_by_organization(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test that list only returns queues from same organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        dept1 = await department_service.create(
            org1.id, DepartmentCreate(name="Sales", slug="sales")
        )
        dept2 = await department_service.create(
            org2.id, DepartmentCreate(name="Sales", slug="sales")
        )

        await queue_service.create_queue(
            org1.id, QueueCreate(department_id=dept1.id, name="Org1 Queue", slug="org1")
        )
        await queue_service.create_queue(
            org2.id, QueueCreate(department_id=dept2.id, name="Org2 Queue", slug="org2")
        )

        org1_queues = await queue_service.list_queues(org1.id)
        org2_queues = await queue_service.list_queues(org2.id)

        assert len(org1_queues) == 1
        assert len(org2_queues) == 1
        assert org1_queues[0].name == "Org1 Queue"
        assert org2_queues[0].name == "Org2 Queue"

    @pytest.mark.asyncio
    async def test_list_queues_filters_by_department(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test filtering queues by department"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept1 = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )
        dept2 = await department_service.create(
            org.id, DepartmentCreate(name="Support", slug="support")
        )

        await queue_service.create_queue(
            org.id, QueueCreate(department_id=dept1.id, name="Sales VIP", slug="sales-vip")
        )
        await queue_service.create_queue(
            org.id, QueueCreate(department_id=dept2.id, name="Support VIP", slug="support-vip")
        )

        dept1_queues = await queue_service.list_queues(org.id, department_id=dept1.id)
        dept2_queues = await queue_service.list_queues(org.id, department_id=dept2.id)

        assert len(dept1_queues) == 1
        assert len(dept2_queues) == 1
        assert dept1_queues[0].name == "Sales VIP"
        assert dept2_queues[0].name == "Support VIP"


class TestQueueServiceUpdate:
    """Tests for QueueService.update_queue()"""

    @pytest_asyncio.fixture
    async def queue_service(self, db_session: AsyncSession) -> QueueService:
        return QueueService(db_session)

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_update_queue_name(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test updating queue name"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )

        data = QueueCreate(department_id=dept.id, name="Old Name", slug="queue")
        queue = await queue_service.create_queue(org.id, data)

        update_data = QueueUpdate(name="New Name")
        updated = await queue_service.update_queue(queue.id, org.id, update_data)

        assert updated.name == "New Name"

    @pytest.mark.asyncio
    async def test_update_queue_priority(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test updating queue priority"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )

        data = QueueCreate(department_id=dept.id, name="Queue", slug="queue", priority=50)
        queue = await queue_service.create_queue(org.id, data)

        update_data = QueueUpdate(priority=100)
        updated = await queue_service.update_queue(queue.id, org.id, update_data)

        assert updated.priority == 100


class TestQueueServiceDelete:
    """Tests for QueueService.delete_queue()"""

    @pytest_asyncio.fixture
    async def queue_service(self, db_session: AsyncSession) -> QueueService:
        return QueueService(db_session)

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_delete_queue_success(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test successful queue deletion (soft delete)"""
        org = await OrganizationFactory.create_in_db(db_session)

        dept = await department_service.create(
            org.id, DepartmentCreate(name="Sales", slug="sales")
        )

        data = QueueCreate(department_id=dept.id, name="To Delete", slug="delete")
        queue = await queue_service.create_queue(org.id, data)

        await queue_service.delete_queue(queue.id, org.id)

        with pytest.raises(HTTPException) as exc:
            await queue_service.get_queue(queue.id, org.id)

        assert exc.value.status_code == 404


class TestQueueServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def queue_service(self, db_session: AsyncSession) -> QueueService:
        return QueueService(db_session)

    @pytest_asyncio.fixture
    async def department_service(self, db_session: AsyncSession) -> DepartmentService:
        return DepartmentService(db_session)

    @pytest.mark.asyncio
    async def test_queue_isolation_between_organizations(
        self,
        queue_service: QueueService,
        department_service: DepartmentService,
        db_session: AsyncSession
    ):
        """Test that queues are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        dept1 = await department_service.create(
            org1.id, DepartmentCreate(name="Sales", slug="sales")
        )
        dept2 = await department_service.create(
            org2.id, DepartmentCreate(name="Sales", slug="sales")
        )

        queue1 = await queue_service.create_queue(
            org1.id, QueueCreate(department_id=dept1.id, name="Org1 Queue", slug="org1")
        )
        queue2 = await queue_service.create_queue(
            org2.id, QueueCreate(department_id=dept2.id, name="Org2 Queue", slug="org2")
        )

        # Org1 should not be able to access Org2's queue
        with pytest.raises(HTTPException):
            await queue_service.get_queue(queue2.id, org1.id)

        # Org2 should not be able to access Org1's queue
        with pytest.raises(HTTPException):
            await queue_service.get_queue(queue1.id, org2.id)

        # Each org should only see their own queues
        org1_queues = await queue_service.list_queues(org1.id)
        org2_queues = await queue_service.list_queues(org2.id)

        assert len(org1_queues) == 1
        assert len(org2_queues) == 1
        assert org1_queues[0].id == queue1.id
        assert org2_queues[0].id == queue2.id
