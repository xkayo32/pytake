"""
Secret Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.secret_service import SecretService
from app.models.secret import SecretScope, EncryptionProvider
from tests.conftest import OrganizationFactory


class TestSecretServiceCreate:
    """Tests for SecretService.create_secret()"""

    @pytest_asyncio.fixture
    async def secret_service(self, db_session: AsyncSession) -> SecretService:
        return SecretService(db_session)

    @pytest.mark.asyncio
    async def test_create_secret_organization_scope(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test creating organization-scoped secret"""
        org = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="api_key",
            display_name="API Key",
            value="super_secret_key_123",
            scope=SecretScope.ORGANIZATION
        )

        assert secret.name == "api_key"
        assert secret.display_name == "API Key"
        assert secret.organization_id == org.id
        assert secret.scope == SecretScope.ORGANIZATION
        assert secret.is_active is True
        # Value should be encrypted, not plaintext
        assert secret.encrypted_value != "super_secret_key_123"

    @pytest.mark.asyncio
    async def test_create_secret_chatbot_scope(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test creating chatbot-scoped secret"""
        org = await OrganizationFactory.create_in_db(db_session)
        chatbot_id = uuid4()

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="chatbot_api_key",
            display_name="Chatbot API Key",
            value="chatbot_secret_456",
            scope=SecretScope.CHATBOT,
            chatbot_id=chatbot_id
        )

        assert secret.chatbot_id == chatbot_id
        assert secret.scope == SecretScope.CHATBOT

    @pytest.mark.asyncio
    async def test_create_secret_chatbot_scope_without_chatbot_id_fails(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test that chatbot scope requires chatbot_id"""
        org = await OrganizationFactory.create_in_db(db_session)

        with pytest.raises(ValueError) as exc:
            await secret_service.create_secret(
                organization_id=org.id,
                name="invalid_secret",
                display_name="Invalid",
                value="secret",
                scope=SecretScope.CHATBOT
                # Missing chatbot_id
            )

        assert "chatbot_id required" in str(exc.value)

    @pytest.mark.asyncio
    async def test_create_secret_empty_value_fails(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test that empty value is rejected"""
        org = await OrganizationFactory.create_in_db(db_session)

        with pytest.raises(ValueError) as exc:
            await secret_service.create_secret(
                organization_id=org.id,
                name="empty_secret",
                display_name="Empty",
                value="",  # Empty value
                scope=SecretScope.ORGANIZATION
            )

        assert "cannot be empty" in str(exc.value)

    @pytest.mark.asyncio
    async def test_create_secret_duplicate_name_fails(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test that duplicate secret names are rejected"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create first secret
        await secret_service.create_secret(
            organization_id=org.id,
            name="duplicate_key",
            display_name="First",
            value="value1",
            scope=SecretScope.ORGANIZATION
        )

        # Try to create second with same name
        with pytest.raises(ValueError) as exc:
            await secret_service.create_secret(
                organization_id=org.id,
                name="duplicate_key",  # Same name
                display_name="Second",
                value="value2",
                scope=SecretScope.ORGANIZATION
            )

        assert "already exists" in str(exc.value)

    @pytest.mark.asyncio
    async def test_create_secret_with_metadata(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test creating secret with metadata"""
        org = await OrganizationFactory.create_in_db(db_session)

        metadata = {
            "created_by": "admin",
            "purpose": "production_api",
            "expires_at": "2025-12-31"
        }

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="api_key",
            display_name="API Key",
            value="secret_value",
            scope=SecretScope.ORGANIZATION,
            metadata=metadata
        )

        assert secret.secret_metadata == metadata


class TestSecretServiceGetDecrypted:
    """Tests for SecretService.get_decrypted_value()"""

    @pytest_asyncio.fixture
    async def secret_service(self, db_session: AsyncSession) -> SecretService:
        return SecretService(db_session)

    @pytest.mark.asyncio
    async def test_get_decrypted_value_success(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test decrypting secret value"""
        org = await OrganizationFactory.create_in_db(db_session)

        plaintext = "my_super_secret_password"

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="password",
            display_name="Password",
            value=plaintext,
            scope=SecretScope.ORGANIZATION
        )

        # Decrypt and verify
        decrypted = await secret_service.get_decrypted_value(
            secret_id=secret.id,
            organization_id=org.id
        )

        assert decrypted == plaintext

    @pytest.mark.asyncio
    async def test_get_decrypted_value_wrong_organization_fails(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test that wrong organization cannot decrypt secret"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org1.id,
            name="org1_secret",
            display_name="Org1 Secret",
            value="secret_value",
            scope=SecretScope.ORGANIZATION
        )

        # Try to decrypt from org2
        with pytest.raises(ValueError) as exc:
            await secret_service.get_decrypted_value(
                secret_id=secret.id,
                organization_id=org2.id
            )

        assert "Unauthorized" in str(exc.value)

    @pytest.mark.asyncio
    async def test_get_decrypted_value_inactive_secret_fails(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test that inactive secrets cannot be decrypted"""
        org = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="deactivated_key",
            display_name="Deactivated",
            value="secret",
            scope=SecretScope.ORGANIZATION
        )

        # Deactivate secret
        await secret_service.deactivate_secret(secret.id, org.id)

        # Try to decrypt
        with pytest.raises(ValueError) as exc:
            await secret_service.get_decrypted_value(
                secret_id=secret.id,
                organization_id=org.id
            )

        assert "inactive" in str(exc.value)


class TestSecretServiceList:
    """Tests for SecretService.list_secrets()"""

    @pytest_asyncio.fixture
    async def secret_service(self, db_session: AsyncSession) -> SecretService:
        return SecretService(db_session)

    @pytest.mark.asyncio
    async def test_list_secrets_empty(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test listing secrets when empty"""
        org = await OrganizationFactory.create_in_db(db_session)

        secrets = await secret_service.list_secrets(org.id)

        assert len(secrets) == 0

    @pytest.mark.asyncio
    async def test_list_secrets_multiple(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test listing multiple secrets"""
        org = await OrganizationFactory.create_in_db(db_session)

        await secret_service.create_secret(
            organization_id=org.id,
            name="key1",
            display_name="Key 1",
            value="value1",
            scope=SecretScope.ORGANIZATION
        )

        await secret_service.create_secret(
            organization_id=org.id,
            name="key2",
            display_name="Key 2",
            value="value2",
            scope=SecretScope.ORGANIZATION
        )

        secrets = await secret_service.list_secrets(org.id)

        assert len(secrets) == 2

    @pytest.mark.asyncio
    async def test_list_secrets_filters_by_organization(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test that list only returns secrets from same organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        await secret_service.create_secret(
            organization_id=org1.id,
            name="org1_key",
            display_name="Org1",
            value="value1",
            scope=SecretScope.ORGANIZATION
        )

        await secret_service.create_secret(
            organization_id=org2.id,
            name="org2_key",
            display_name="Org2",
            value="value2",
            scope=SecretScope.ORGANIZATION
        )

        org1_secrets = await secret_service.list_secrets(org1.id)
        org2_secrets = await secret_service.list_secrets(org2.id)

        assert len(org1_secrets) == 1
        assert len(org2_secrets) == 1
        assert org1_secrets[0].name == "org1_key"
        assert org2_secrets[0].name == "org2_key"


class TestSecretServiceActivateDeactivate:
    """Tests for SecretService.activate_secret() and deactivate_secret()"""

    @pytest_asyncio.fixture
    async def secret_service(self, db_session: AsyncSession) -> SecretService:
        return SecretService(db_session)

    @pytest.mark.asyncio
    async def test_deactivate_secret(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test deactivating a secret"""
        org = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="key",
            display_name="Key",
            value="value",
            scope=SecretScope.ORGANIZATION
        )

        deactivated = await secret_service.deactivate_secret(secret.id, org.id)

        assert deactivated.is_active is False

    @pytest.mark.asyncio
    async def test_activate_secret(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test activating a deactivated secret"""
        org = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="key",
            display_name="Key",
            value="value",
            scope=SecretScope.ORGANIZATION
        )

        # Deactivate first
        await secret_service.deactivate_secret(secret.id, org.id)

        # Then activate
        activated = await secret_service.activate_secret(secret.id, org.id)

        assert activated.is_active is True


class TestSecretServiceUpdate:
    """Tests for SecretService.update_secret()"""

    @pytest_asyncio.fixture
    async def secret_service(self, db_session: AsyncSession) -> SecretService:
        return SecretService(db_session)

    @pytest.mark.asyncio
    async def test_update_secret_display_name(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test updating secret display name"""
        org = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="key",
            display_name="Old Name",
            value="value",
            scope=SecretScope.ORGANIZATION
        )

        updated = await secret_service.update_secret(
            secret_id=secret.id,
            organization_id=org.id,
            display_name="New Name"
        )

        assert updated.display_name == "New Name"

    @pytest.mark.asyncio
    async def test_update_secret_description(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test updating secret description"""
        org = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="key",
            display_name="Key",
            value="value",
            scope=SecretScope.ORGANIZATION,
            description="Old description"
        )

        updated = await secret_service.update_secret(
            secret_id=secret.id,
            organization_id=org.id,
            description="New description"
        )

        assert updated.description == "New description"


class TestSecretServiceDelete:
    """Tests for SecretService.delete_secret()"""

    @pytest_asyncio.fixture
    async def secret_service(self, db_session: AsyncSession) -> SecretService:
        return SecretService(db_session)

    @pytest.mark.asyncio
    async def test_delete_secret_success(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test deleting a secret"""
        org = await OrganizationFactory.create_in_db(db_session)

        secret = await secret_service.create_secret(
            organization_id=org.id,
            name="to_delete",
            display_name="To Delete",
            value="value",
            scope=SecretScope.ORGANIZATION
        )

        await secret_service.delete_secret(secret.id, org.id)

        # Secret should not be in list anymore
        secrets = await secret_service.list_secrets(org.id)
        assert len(secrets) == 0


class TestSecretServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def secret_service(self, db_session: AsyncSession) -> SecretService:
        return SecretService(db_session)

    @pytest.mark.asyncio
    async def test_secret_isolation_between_organizations(
        self, secret_service: SecretService, db_session: AsyncSession
    ):
        """Test that secrets are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        secret1 = await secret_service.create_secret(
            organization_id=org1.id,
            name="org1_key",
            display_name="Org1 Key",
            value="secret1",
            scope=SecretScope.ORGANIZATION
        )

        secret2 = await secret_service.create_secret(
            organization_id=org2.id,
            name="org2_key",
            display_name="Org2 Key",
            value="secret2",
            scope=SecretScope.ORGANIZATION
        )

        # Org1 should not be able to access Org2's secret
        with pytest.raises(ValueError):
            await secret_service.get_decrypted_value(secret2.id, org1.id)

        # Org2 should not be able to access Org1's secret
        with pytest.raises(ValueError):
            await secret_service.get_decrypted_value(secret1.id, org2.id)

        # Each org should only see their own secrets
        org1_secrets = await secret_service.list_secrets(org1.id)
        org2_secrets = await secret_service.list_secrets(org2.id)

        assert len(org1_secrets) == 1
        assert len(org2_secrets) == 1
        assert org1_secrets[0].id == secret1.id
        assert org2_secrets[0].id == secret2.id
