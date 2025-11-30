"""
WhatsApp Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.whatsapp_service import WhatsAppService
from app.schemas.whatsapp import (
    WhatsAppConfigCreate,
    WhatsAppConfigUpdate,
    TemplateCreate,
    MessageSend
)
from tests.conftest import OrganizationFactory, UserFactory


class TestWhatsAppServiceConfig:
    """Tests for WhatsApp configuration management"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    async def test_create_config_success(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test successful WhatsApp config creation"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Main Number",
            phone_number_id="123456789",
            business_account_id="987654321",
            access_token="test_token_123",
            webhook_verify_token="verify_token"
        )

        config = await whatsapp_service.create_config(config_data, org.id)

        assert config.name == "Main Number"
        assert config.phone_number_id == "123456789"
        assert config.organization_id == org.id

    @pytest.mark.asyncio
    async def test_create_config_duplicate_phone(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test creating config with duplicate phone fails"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Number 1",
            phone_number_id="same_phone_id",
            business_account_id="987654321",
            access_token="token_1",
            webhook_verify_token="verify_1"
        )

        # Create first config
        await whatsapp_service.create_config(config_data, org.id)

        # Try to create duplicate
        config_data.name = "Number 2"
        config_data.access_token = "token_2"

        with pytest.raises(HTTPException) as exc_info:
            await whatsapp_service.create_config(config_data, org.id)

        assert exc_info.value.status_code == 400


class TestWhatsAppServiceGetConfig:
    """Tests for getting WhatsApp configs"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    async def test_get_config_success(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test getting existing config"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Test Config",
            phone_number_id="111222333",
            business_account_id="444555666",
            access_token="test_token",
            webhook_verify_token="verify"
        )

        created = await whatsapp_service.create_config(config_data, org.id)
        result = await whatsapp_service.get_config(created.id, org.id)

        assert result.id == created.id
        assert result.name == "Test Config"

    @pytest.mark.asyncio
    async def test_get_config_not_found(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test getting non-existent config"""
        org = await OrganizationFactory.create_in_db(db_session)

        with pytest.raises(HTTPException) as exc_info:
            await whatsapp_service.get_config(uuid4(), org.id)

        assert exc_info.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_config_wrong_organization(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test getting config from wrong organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Org1 Config",
            phone_number_id="org1_phone",
            business_account_id="org1_business",
            access_token="org1_token",
            webhook_verify_token="verify"
        )

        created = await whatsapp_service.create_config(config_data, org1.id)

        with pytest.raises(HTTPException) as exc_info:
            await whatsapp_service.get_config(created.id, org2.id)

        assert exc_info.value.status_code == 404


class TestWhatsAppServiceListConfigs:
    """Tests for listing WhatsApp configs"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    async def test_list_configs_empty(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test listing when no configs exist"""
        org = await OrganizationFactory.create_in_db(db_session)

        configs = await whatsapp_service.list_configs(org.id)

        assert len(configs) == 0

    @pytest.mark.asyncio
    async def test_list_configs_multiple(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test listing multiple configs"""
        org = await OrganizationFactory.create_in_db(db_session)

        for i in range(3):
            config_data = WhatsAppConfigCreate(
                name=f"Config {i}",
                phone_number_id=f"phone_{i}",
                business_account_id=f"business_{i}",
                access_token=f"token_{i}",
                webhook_verify_token=f"verify_{i}"
            )
            await whatsapp_service.create_config(config_data, org.id)

        configs = await whatsapp_service.list_configs(org.id)

        assert len(configs) == 3


class TestWhatsAppServiceSendMessage:
    """Tests for sending WhatsApp messages"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    @patch("app.services.whatsapp_service.httpx.AsyncClient")
    async def test_send_text_message_success(
        self, mock_client_class, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test sending text message successfully"""
        org = await OrganizationFactory.create_in_db(db_session)

        # Create config
        config_data = WhatsAppConfigCreate(
            name="Send Test",
            phone_number_id="sender_phone",
            business_account_id="sender_business",
            access_token="sender_token",
            webhook_verify_token="verify"
        )
        config = await whatsapp_service.create_config(config_data, org.id)

        # Mock HTTP response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "messaging_product": "whatsapp",
            "messages": [{"id": "wamid.test123"}]
        }

        mock_client = AsyncMock()
        mock_client.post.return_value = mock_response
        mock_client_class.return_value.__aenter__.return_value = mock_client

        message_data = MessageSend(
            to="5511999998888",
            type="text",
            text={"body": "Hello World!"}
        )

        result = await whatsapp_service.send_message(config.id, message_data, org.id)

        assert "messages" in result

    @pytest.mark.asyncio
    async def test_send_message_config_not_found(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test sending message with invalid config"""
        org = await OrganizationFactory.create_in_db(db_session)

        message_data = MessageSend(
            to="5511999998888",
            type="text",
            text={"body": "Test"}
        )

        with pytest.raises(HTTPException) as exc_info:
            await whatsapp_service.send_message(uuid4(), message_data, org.id)

        assert exc_info.value.status_code == 404


class TestWhatsAppServiceTemplates:
    """Tests for WhatsApp template management"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    async def test_create_template_success(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test creating WhatsApp template"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Template Test",
            phone_number_id="template_phone",
            business_account_id="template_business",
            access_token="template_token",
            webhook_verify_token="verify"
        )
        config = await whatsapp_service.create_config(config_data, org.id)

        template_data = TemplateCreate(
            name="order_confirmation",
            language="pt_BR",
            category="MARKETING",
            components=[
                {
                    "type": "BODY",
                    "text": "Seu pedido {{1}} foi confirmado!"
                }
            ]
        )

        template = await whatsapp_service.create_template(
            config.id, template_data, org.id
        )

        assert template.name == "order_confirmation"
        assert template.language == "pt_BR"

    @pytest.mark.asyncio
    async def test_list_templates(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test listing templates"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="List Templates Test",
            phone_number_id="list_phone",
            business_account_id="list_business",
            access_token="list_token",
            webhook_verify_token="verify"
        )
        config = await whatsapp_service.create_config(config_data, org.id)

        # Create templates
        for name in ["template_a", "template_b"]:
            template_data = TemplateCreate(
                name=name,
                language="pt_BR",
                category="UTILITY",
                components=[{"type": "BODY", "text": "Test {{1}}"}]
            )
            await whatsapp_service.create_template(config.id, template_data, org.id)

        templates = await whatsapp_service.list_templates(config.id, org.id)

        assert len(templates) == 2


class TestWhatsAppServiceWebhook:
    """Tests for webhook handling"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    async def test_verify_webhook_success(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test webhook verification"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Webhook Test",
            phone_number_id="webhook_phone",
            business_account_id="webhook_business",
            access_token="webhook_token",
            webhook_verify_token="my_verify_token"
        )
        config = await whatsapp_service.create_config(config_data, org.id)

        result = await whatsapp_service.verify_webhook(
            config.id,
            mode="subscribe",
            token="my_verify_token",
            challenge="test_challenge",
            org_id=org.id
        )

        assert result == "test_challenge"

    @pytest.mark.asyncio
    async def test_verify_webhook_invalid_token(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test webhook with invalid token"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Webhook Invalid",
            phone_number_id="invalid_phone",
            business_account_id="invalid_business",
            access_token="invalid_token",
            webhook_verify_token="correct_token"
        )
        config = await whatsapp_service.create_config(config_data, org.id)

        with pytest.raises(HTTPException) as exc_info:
            await whatsapp_service.verify_webhook(
                config.id,
                mode="subscribe",
                token="wrong_token",
                challenge="challenge",
                org_id=org.id
            )

        assert exc_info.value.status_code == 403


class TestWhatsAppServiceMessageHandling:
    """Tests for incoming message handling"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    async def test_process_incoming_message(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test processing incoming WhatsApp message"""
        org = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Incoming Test",
            phone_number_id="incoming_phone",
            business_account_id="incoming_business",
            access_token="incoming_token",
            webhook_verify_token="verify"
        )
        config = await whatsapp_service.create_config(config_data, org.id)

        webhook_payload = {
            "object": "whatsapp_business_account",
            "entry": [{
                "id": "incoming_business",
                "changes": [{
                    "value": {
                        "messaging_product": "whatsapp",
                        "metadata": {
                            "display_phone_number": "5511999990000",
                            "phone_number_id": "incoming_phone"
                        },
                        "contacts": [{
                            "profile": {"name": "Test User"},
                            "wa_id": "5511888887777"
                        }],
                        "messages": [{
                            "from": "5511888887777",
                            "id": "wamid.incoming123",
                            "timestamp": "1678886400",
                            "type": "text",
                            "text": {"body": "Hello!"}
                        }]
                    },
                    "field": "messages"
                }]
            }]
        }

        result = await whatsapp_service.handle_webhook(config.id, webhook_payload, org.id)

        assert result["status"] == "processed"


class TestWhatsAppServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def whatsapp_service(self, db_session: AsyncSession) -> WhatsAppService:
        return WhatsAppService(db_session)

    @pytest.mark.asyncio
    async def test_configs_isolated_by_organization(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test configs are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        # Create config in org1
        config_data = WhatsAppConfigCreate(
            name="Org1 Config",
            phone_number_id="org1_only",
            business_account_id="org1_business",
            access_token="org1_token",
            webhook_verify_token="verify"
        )
        await whatsapp_service.create_config(config_data, org1.id)

        # Org2 should not see org1's config
        org2_configs = await whatsapp_service.list_configs(org2.id)

        assert len(org2_configs) == 0

    @pytest.mark.asyncio
    async def test_update_config_wrong_org(
        self, whatsapp_service: WhatsAppService, db_session: AsyncSession
    ):
        """Test cannot update config from different org"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        config_data = WhatsAppConfigCreate(
            name="Cross Org Test",
            phone_number_id="cross_org_phone",
            business_account_id="cross_org_business",
            access_token="cross_org_token",
            webhook_verify_token="verify"
        )
        config = await whatsapp_service.create_config(config_data, org1.id)

        update_data = WhatsAppConfigUpdate(name="Hacked Name")

        with pytest.raises(HTTPException) as exc_info:
            await whatsapp_service.update_config(config.id, update_data, org2.id)

        assert exc_info.value.status_code == 404
