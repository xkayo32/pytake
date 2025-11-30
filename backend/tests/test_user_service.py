"""
User Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.user_service import UserService
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import hash_password, verify_password
from tests.conftest import OrganizationFactory, UserFactory


class TestUserServiceCreate:
    """Tests for UserService.create_user()"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_create_user_success(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test successful user creation"""
        org = await OrganizationFactory.create_in_db(db_session)
        admin = await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin"
        )

        data = UserCreate(
            email="newuser@test.com",
            password="SecurePass123!",
            full_name="New User",
            role="agent"
        )

        user = await user_service.create_user(data, org.id, admin)

        assert user.email == data.email
        assert user.full_name == data.full_name
        assert user.role == "agent"
        assert user.organization_id == org.id

    @pytest.mark.asyncio
    async def test_create_user_duplicate_email(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test creating user with duplicate email fails"""
        org = await OrganizationFactory.create_in_db(db_session)
        admin = await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin"
        )
        
        # Create first user
        await UserFactory.create_in_db(
            db_session,
            organization_id=org.id,
            email="duplicate@test.com"
        )

        # Try to create second user with same email
        data = UserCreate(
            email="duplicate@test.com",
            password="SecurePass123!",
            full_name="Duplicate User",
            role="agent"
        )

        with pytest.raises(HTTPException) as exc_info:
            await user_service.create_user(data, org.id, admin)

        assert exc_info.value.status_code == 400


class TestUserServiceGet:
    """Tests for UserService.get_by_id()"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_get_user_success(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test getting existing user"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        result = await user_service.get_by_id(user.id, org.id)

        assert result.id == user.id
        assert result.email == user.email

    @pytest.mark.asyncio
    async def test_get_user_not_found(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test getting non-existent user"""
        org = await OrganizationFactory.create_in_db(db_session)

        with pytest.raises(HTTPException) as exc_info:
            await user_service.get_by_id(uuid4(), org.id)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_user_wrong_organization(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test getting user from wrong organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org1.id)

        with pytest.raises(HTTPException) as exc_info:
            await user_service.get_by_id(user.id, org2.id)

        assert exc_info.value.status_code == 404


class TestUserServiceList:
    """Tests for UserService.list_users()"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_list_users_empty(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test listing users when empty"""
        org = await OrganizationFactory.create_in_db(db_session)

        users = await user_service.list_users(org.id)

        assert len(users) == 0

    @pytest.mark.asyncio
    async def test_list_users_with_role_filter(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test listing users with role filter"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create users with different roles
        await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="agent", email="agent@test.com"
        )
        await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin", email="admin@test.com"
        )

        # Filter by role
        agents = await user_service.list_users(org.id, role="agent")
        admins = await user_service.list_users(org.id, role="org_admin")

        assert len(agents) == 1
        assert len(admins) == 1

    @pytest.mark.asyncio
    async def test_list_users_pagination(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test user pagination"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create multiple users
        for i in range(5):
            await UserFactory.create_in_db(
                db_session, organization_id=org.id, email=f"user{i}@test.com"
            )

        # Get first page
        page1 = await user_service.list_users(org.id, skip=0, limit=2)
        assert len(page1) == 2

        # Get second page
        page2 = await user_service.list_users(org.id, skip=2, limit=2)
        assert len(page2) == 2


class TestUserServiceUpdate:
    """Tests for UserService.update_user()"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_update_user_success(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test successful user update"""
        org = await OrganizationFactory.create_in_db(db_session)
        admin = await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin", email="admin@test.com"
        )
        user = await UserFactory.create_in_db(
            db_session, organization_id=org.id, email="user@test.com"
        )

        update_data = UserUpdate(full_name="Updated Name")
        updated = await user_service.update_user(user.id, update_data, org.id, admin)

        assert updated.full_name == "Updated Name"

    @pytest.mark.asyncio
    async def test_update_user_not_found(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test updating non-existent user"""
        org = await OrganizationFactory.create_in_db(db_session)
        admin = await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin"
        )

        update_data = UserUpdate(full_name="New Name")

        with pytest.raises(HTTPException) as exc_info:
            await user_service.update_user(uuid4(), update_data, org.id, admin)

        assert exc_info.value.status_code == 404


class TestUserServiceActivation:
    """Tests for activate/deactivate"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_deactivate_user(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test deactivating user"""
        org = await OrganizationFactory.create_in_db(db_session)
        admin = await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin", email="admin@test.com"
        )
        user = await UserFactory.create_in_db(
            db_session, organization_id=org.id, is_active=True, email="user@test.com"
        )

        result = await user_service.deactivate_user(user.id, org.id, admin)

        assert result.is_active is False

    @pytest.mark.asyncio
    async def test_activate_user(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test activating user"""
        org = await OrganizationFactory.create_in_db(db_session)
        admin = await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin", email="admin@test.com"
        )
        user = await UserFactory.create_in_db(
            db_session, organization_id=org.id, is_active=False, email="user@test.com"
        )

        result = await user_service.activate_user(user.id, org.id, admin)

        assert result.is_active is True


class TestUserServiceDelete:
    """Tests for UserService.delete_user()"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_delete_user_success(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test successful user deletion (soft delete)"""
        org = await OrganizationFactory.create_in_db(db_session)
        admin = await UserFactory.create_in_db(
            db_session, organization_id=org.id, role="org_admin", email="admin@test.com"
        )
        user = await UserFactory.create_in_db(
            db_session, organization_id=org.id, email="todelete@test.com"
        )

        await user_service.delete_user(user.id, org.id, admin)

        # User should not be found
        with pytest.raises(HTTPException) as exc_info:
            await user_service.get_by_id(user.id, org.id)

        assert exc_info.value.status_code == 404


class TestUserServiceStats:
    """Tests for user statistics"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_get_user_stats(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test getting user statistics"""
        org = await OrganizationFactory.create_in_db(db_session)
        user = await UserFactory.create_in_db(db_session, organization_id=org.id)

        stats = await user_service.get_user_stats(user.id, org.id)

        assert stats is not None
        assert isinstance(stats, dict)


class TestUserServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def user_service(self, db_session: AsyncSession) -> UserService:
        return UserService(db_session)

    @pytest.mark.asyncio
    async def test_users_isolated_by_organization(
        self, user_service: UserService, db_session: AsyncSession
    ):
        """Test that users are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        # Create users in both orgs
        await UserFactory.create_in_db(
            db_session, organization_id=org1.id, email="org1user@test.com"
        )
        await UserFactory.create_in_db(
            db_session, organization_id=org2.id, email="org2user@test.com"
        )

        # List should only show org's own users
        org1_users = await user_service.list_users(org1.id)
        org2_users = await user_service.list_users(org2.id)

        assert len(org1_users) == 1
        assert len(org2_users) == 1
        assert org1_users[0].email == "org1user@test.com"
        assert org2_users[0].email == "org2user@test.com"
