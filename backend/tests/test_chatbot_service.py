"""
Chatbot Service Unit Tests

Autor: Kayo Carvalho Fernandes
"""

import pytest
import pytest_asyncio
from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.chatbot_service import ChatbotService
from app.schemas.chatbot import (
    ChatbotCreate,
    ChatbotUpdate,
    FlowCreate,
    FlowUpdate,
    NodeCreate,
    NodeUpdate,
)
from tests.conftest import OrganizationFactory, UserFactory


class TestChatbotServiceCreate:
    """Tests for ChatbotService.create_chatbot()"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_create_chatbot_success(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test successful chatbot creation"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(
            name="Customer Support Bot",
            description="Automated customer support",
            greeting_message="Hello! How can I help you?"
        )

        chatbot = await chatbot_service.create_chatbot(data, org.id)

        assert chatbot.name == data.name
        assert chatbot.description == data.description
        assert chatbot.greeting_message == data.greeting_message
        assert chatbot.organization_id == org.id
        assert chatbot.is_active is True

    @pytest.mark.asyncio
    async def test_create_chatbot_minimal(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test chatbot creation with minimal data"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(
            name="Minimal Bot"
        )

        chatbot = await chatbot_service.create_chatbot(data, org.id)

        assert chatbot.name == "Minimal Bot"
        assert chatbot.organization_id == org.id

    @pytest.mark.asyncio
    async def test_create_chatbot_with_welcome_flow(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test chatbot creation with welcome flow ID"""
        org = await OrganizationFactory.create_in_db(db_session)
        welcome_flow_id = uuid4()

        data = ChatbotCreate(
            name="Bot with Welcome",
            welcome_flow_id=welcome_flow_id
        )

        chatbot = await chatbot_service.create_chatbot(data, org.id)

        assert chatbot.welcome_flow_id == welcome_flow_id


class TestChatbotServiceGet:
    """Tests for ChatbotService.get_chatbot()"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_get_chatbot_success(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test successful chatbot retrieval"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="Test Bot")
        created = await chatbot_service.create_chatbot(data, org.id)

        retrieved = await chatbot_service.get_chatbot(created.id, org.id)

        assert retrieved.id == created.id
        assert retrieved.name == created.name

    @pytest.mark.asyncio
    async def test_get_chatbot_not_found(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test chatbot not found"""
        org = await OrganizationFactory.create_in_db(db_session)
        fake_id = uuid4()

        with pytest.raises(HTTPException) as exc:
            await chatbot_service.get_chatbot(fake_id, org.id)

        assert exc.value.status_code == 404

    @pytest.mark.asyncio
    async def test_get_chatbot_wrong_organization(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test chatbot access from different organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="Org1 Bot")
        chatbot = await chatbot_service.create_chatbot(data, org1.id)

        with pytest.raises(HTTPException) as exc:
            await chatbot_service.get_chatbot(chatbot.id, org2.id)

        assert exc.value.status_code == 404


class TestChatbotServiceUpdate:
    """Tests for ChatbotService.update_chatbot()"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_update_chatbot_name(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test updating chatbot name"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="Old Name")
        chatbot = await chatbot_service.create_chatbot(data, org.id)

        update_data = ChatbotUpdate(name="New Name")
        updated = await chatbot_service.update_chatbot(chatbot.id, update_data, org.id)

        assert updated.name == "New Name"

    @pytest.mark.asyncio
    async def test_update_chatbot_description(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test updating chatbot description"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="Bot", description="Old desc")
        chatbot = await chatbot_service.create_chatbot(data, org.id)

        update_data = ChatbotUpdate(description="New description")
        updated = await chatbot_service.update_chatbot(chatbot.id, update_data, org.id)

        assert updated.description == "New description"


class TestChatbotServiceDelete:
    """Tests for ChatbotService.delete_chatbot()"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_delete_chatbot_success(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test successful chatbot deletion (soft delete)"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="To Delete")
        chatbot = await chatbot_service.create_chatbot(data, org.id)

        await chatbot_service.delete_chatbot(chatbot.id, org.id)

        with pytest.raises(HTTPException) as exc:
            await chatbot_service.get_chatbot(chatbot.id, org.id)

        assert exc.value.status_code == 404


class TestChatbotServiceList:
    """Tests for ChatbotService.list_chatbots()"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_list_chatbots_empty(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test listing chatbots when empty"""
        org = await OrganizationFactory.create_in_db(db_session)

        chatbots = await chatbot_service.list_chatbots(org.id)

        assert len(chatbots) == 0

    @pytest.mark.asyncio
    async def test_list_chatbots_multiple(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test listing multiple chatbots"""
        org = await OrganizationFactory.create_in_db(db_session)

        await chatbot_service.create_chatbot(ChatbotCreate(name="Bot 1"), org.id)
        await chatbot_service.create_chatbot(ChatbotCreate(name="Bot 2"), org.id)
        await chatbot_service.create_chatbot(ChatbotCreate(name="Bot 3"), org.id)

        chatbots = await chatbot_service.list_chatbots(org.id)

        assert len(chatbots) == 3

    @pytest.mark.asyncio
    async def test_list_chatbots_filters_by_organization(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test that list only returns chatbots from same organization"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        await chatbot_service.create_chatbot(ChatbotCreate(name="Org1 Bot"), org1.id)
        await chatbot_service.create_chatbot(ChatbotCreate(name="Org2 Bot"), org2.id)

        org1_bots = await chatbot_service.list_chatbots(org1.id)
        org2_bots = await chatbot_service.list_chatbots(org2.id)

        assert len(org1_bots) == 1
        assert len(org2_bots) == 1
        assert org1_bots[0].name == "Org1 Bot"
        assert org2_bots[0].name == "Org2 Bot"


class TestChatbotServiceActivateDeactivate:
    """Tests for ChatbotService.activate_chatbot() and deactivate_chatbot()"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_activate_chatbot(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test activating a chatbot"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="Bot")
        chatbot = await chatbot_service.create_chatbot(data, org.id)

        # Deactivate first
        await chatbot_service.deactivate_chatbot(chatbot.id, org.id)

        # Then activate
        activated = await chatbot_service.activate_chatbot(chatbot.id, org.id)

        assert activated.is_active is True

    @pytest.mark.asyncio
    async def test_deactivate_chatbot(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test deactivating a chatbot"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="Bot")
        chatbot = await chatbot_service.create_chatbot(data, org.id)

        deactivated = await chatbot_service.deactivate_chatbot(chatbot.id, org.id)

        assert deactivated.is_active is False


class TestChatbotServiceStats:
    """Tests for ChatbotService.get_chatbot_stats()"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_get_chatbot_stats_new_bot(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test stats for newly created chatbot"""
        org = await OrganizationFactory.create_in_db(db_session)

        data = ChatbotCreate(name="New Bot")
        chatbot = await chatbot_service.create_chatbot(data, org.id)

        stats = await chatbot_service.get_chatbot_stats(chatbot.id, org.id)

        assert stats is not None
        # New bot should have zero stats
        assert stats.total_flows >= 0
        assert stats.total_executions >= 0


class TestChatbotServiceMultiTenancy:
    """Tests for multi-tenancy isolation"""

    @pytest_asyncio.fixture
    async def chatbot_service(self, db_session: AsyncSession) -> ChatbotService:
        return ChatbotService(db_session)

    @pytest.mark.asyncio
    async def test_chatbot_isolation_between_organizations(
        self, chatbot_service: ChatbotService, db_session: AsyncSession
    ):
        """Test that chatbots are isolated between organizations"""
        org1 = await OrganizationFactory.create_in_db(db_session)
        org2 = await OrganizationFactory.create_in_db(db_session)

        bot1 = await chatbot_service.create_chatbot(
            ChatbotCreate(name="Org1 Bot"), org1.id
        )
        bot2 = await chatbot_service.create_chatbot(
            ChatbotCreate(name="Org2 Bot"), org2.id
        )

        # Org1 should not be able to access Org2's chatbot
        with pytest.raises(HTTPException):
            await chatbot_service.get_chatbot(bot2.id, org1.id)

        # Org2 should not be able to access Org1's chatbot
        with pytest.raises(HTTPException):
            await chatbot_service.get_chatbot(bot1.id, org2.id)

        # Each org should only see their own chatbot
        org1_bots = await chatbot_service.list_chatbots(org1.id)
        org2_bots = await chatbot_service.list_chatbots(org2.id)

        assert len(org1_bots) == 1
        assert len(org2_bots) == 1
        assert org1_bots[0].id == bot1.id
        assert org2_bots[0].id == bot2.id
