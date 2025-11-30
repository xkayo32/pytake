"""
Contact Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.contact_service import ContactService
from app.schemas.contact import ContactCreate, ContactUpdate
from tests.conftest import OrganizationFactory, UserFactory


class TestContactServiceCreate:
    """Tests for ContactService.create()"""

    @pytest_asyncio.fixture
    async def contact_service(self, db_session: AsyncSession) -> ContactService:
        return ContactService(db_session)

    @pytest.mark.asyncio
    async def test_create_contact_success(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test successful contact creation"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ContactCreate(
            name="John Doe",
            phone="+5511999999999",
            email="john@example.com"
        )

        contact = await contact_service.create(org.id, data)

        assert contact.name == data.name
        assert contact.phone == data.phone
        assert contact.email == data.email
        assert contact.organization_id == org.id

    @pytest.mark.asyncio
    async def test_create_contact_with_tags(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test contact creation with tags"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ContactCreate(
            name="Jane Doe",
            phone="+5511888888888",
            tags=["vip", "premium"]
        )

        contact = await contact_service.create(org.id, data)

        assert contact.name == data.name
        assert "vip" in (contact.tags or [])

    @pytest.mark.asyncio
    async def test_create_contact_with_custom_fields(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test contact creation with custom fields"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ContactCreate(
            name="Custom User",
            phone="+5511777777777",
            custom_fields={"company": "ACME", "role": "Manager"}
        )

        contact = await contact_service.create(org.id, data)

        assert contact.custom_fields.get("company") == "ACME"

    @pytest.mark.asyncio
    async def test_create_contact_minimal(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test contact creation with minimal data"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ContactCreate(
            name="Minimal Contact",
            phone="+5511666666666"
        )

        contact = await contact_service.create(org.id, data)

        assert contact.name == "Minimal Contact"
        assert contact.phone == "+5511666666666"


class TestContactServiceGet:
    """Tests for ContactService.get()"""

    @pytest_asyncio.fixture
    async def contact_service(self, db_session: AsyncSession) -> ContactService:
        return ContactService(db_session)

    @pytest.mark.asyncio
    async def test_get_contact_not_found(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test getting non-existent contact"""
        org = await OrganizationFactory.create_in_db(db_session)

        with pytest.raises(HTTPException) as exc_info:
            await contact_service.get(uuid4(), org.id)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_contact_wrong_organization(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test getting contact from wrong organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        # Create contact in org1
        data = ContactCreate(name="Org1 Contact", phone="+5511555555555")
        contact = await contact_service.create(org1.id, data)

        # Try to get from org2
        with pytest.raises(HTTPException) as exc_info:
            await contact_service.get(contact.id, org2.id)

        assert exc_info.value.status_code == 404


class TestContactServiceUpdate:
    """Tests for ContactService.update()"""

    @pytest_asyncio.fixture
    async def contact_service(self, db_session: AsyncSession) -> ContactService:
        return ContactService(db_session)

    @pytest.mark.asyncio
    async def test_update_contact_success(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test successful contact update"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create contact
        create_data = ContactCreate(name="Original Name", phone="+5511444444444")
        contact = await contact_service.create(org.id, create_data)

        # Update contact
        update_data = ContactUpdate(name="Updated Name")
        updated = await contact_service.update(contact.id, org.id, update_data)

        assert updated.name == "Updated Name"
        assert updated.phone == "+5511444444444"  # Unchanged

    @pytest.mark.asyncio
    async def test_update_contact_tags(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test updating contact tags"""
        org = await OrganizationFactory.create_in_db(db_session)

        create_data = ContactCreate(name="Tag User", phone="+5511333333333", tags=["old"])
        contact = await contact_service.create(org.id, create_data)

        update_data = ContactUpdate(tags=["new", "updated"])
        updated = await contact_service.update(contact.id, org.id, update_data)

        assert "new" in updated.tags
        assert "updated" in updated.tags


class TestContactServiceList:
    """Tests for ContactService.list()"""

    @pytest_asyncio.fixture
    async def contact_service(self, db_session: AsyncSession) -> ContactService:
        return ContactService(db_session)

    @pytest.mark.asyncio
    async def test_list_contacts_empty(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test listing contacts when empty"""
        org = await OrganizationFactory.create_in_db(db_session)

        contacts = await contact_service.list(org.id)

        assert len(contacts) == 0

    @pytest.mark.asyncio
    async def test_list_contacts_pagination(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test contact pagination"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create multiple contacts
        for i in range(5):
            data = ContactCreate(name=f"Contact {i}", phone=f"+551100000000{i}")
            await contact_service.create(org.id, data)

        # Get first page
        page1 = await contact_service.list(org.id, skip=0, limit=2)
        assert len(page1) == 2

        # Get second page
        page2 = await contact_service.list(org.id, skip=2, limit=2)
        assert len(page2) == 2

    @pytest.mark.asyncio
    async def test_list_contacts_search(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test contact search"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create contacts
        await contact_service.create(org.id, ContactCreate(name="John Doe", phone="+5511111111111"))
        await contact_service.create(org.id, ContactCreate(name="Jane Smith", phone="+5511222222222"))

        # Search for John
        results = await contact_service.list(org.id, search="John")
        assert len(results) >= 1
        assert any(c.name == "John Doe" for c in results)


class TestContactServiceDelete:
    """Tests for ContactService.delete()"""

    @pytest_asyncio.fixture
    async def contact_service(self, db_session: AsyncSession) -> ContactService:
        return ContactService(db_session)

    @pytest.mark.asyncio
    async def test_delete_contact_success(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test successful contact deletion (soft delete)"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create contact
        data = ContactCreate(name="To Delete", phone="+5511000000000")
        contact = await contact_service.create(org.id, data)

        # Delete contact
        await contact_service.delete(contact.id, org.id)

        # Contact should not be found
        with pytest.raises(HTTPException) as exc_info:
            await contact_service.get(contact.id, org.id)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_delete_contact_not_found(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test deleting non-existent contact"""
        org = await OrganizationFactory.create_in_db(db_session)

        with pytest.raises(HTTPException) as exc_info:
            await contact_service.delete(uuid4(), org.id)

        assert exc_info.value.status_code == 404


class TestContactServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def contact_service(self, db_session: AsyncSession) -> ContactService:
        return ContactService(db_session)

    @pytest.mark.asyncio
    async def test_contacts_isolated_by_organization(
        self, contact_service: ContactService, db_session: AsyncSession
    ):
        """Test that contacts are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        # Create contacts in both orgs
        await contact_service.create(org1.id, ContactCreate(name="Org1 Contact", phone="+5511111111111"))
        await contact_service.create(org2.id, ContactCreate(name="Org2 Contact", phone="+5511222222222"))

        # List should only show org's own contacts
        org1_contacts = await contact_service.list(org1.id)
        org2_contacts = await contact_service.list(org2.id)

        assert len(org1_contacts) == 1
        assert len(org2_contacts) == 1
        assert org1_contacts[0].name == "Org1 Contact"
        assert org2_contacts[0].name == "Org2 Contact"
