"""
Integration tests for WhatsApp flow execution - SEMANA 5.

Tests the complete flow from webhook → routing → execution → response.

Author: Kayo Carvalho Fernandes
"""

import pytest
from uuid import uuid4, UUID
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, Organization, Node, Flow, ConversationState, ConversationLog
from app.services.whatsapp_router_service import WhatsAppRouterService
from app.services.flow_executor import FlowExecutor
from app.services.node_executor import NodeExecutor
from app.repositories.conversation_state_repository import ConversationStateRepository
from app.repositories.conversation_log_repository import ConversationLogRepository


@pytest.fixture
async def db_session():
    """Create async test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async_session = sessionmaker(
        engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
    
    await engine.dispose()


@pytest.fixture
async def org(db_session):
    """Create test organization."""
    org = Organization(id=uuid4(), name="Test Org", slug="test-org")
    db_session.add(org)
    await db_session.flush()
    return org


@pytest.fixture
async def chatbot(db_session, org):
    """Create test chatbot."""
    from app.models import Chatbot
    
    chatbot = Chatbot(
        id=uuid4(),
        organization_id=org.id,
        name="Test Chatbot"
    )
    db_session.add(chatbot)
    await db_session.flush()
    return chatbot


@pytest.fixture
async def flow_with_nodes(db_session, org, chatbot):
    """Create flow with complete node structure."""
    flow = Flow(
        id=uuid4(),
        organization_id=org.id,
        chatbot_id=chatbot.id,
        name="Test Flow",
        is_main=True,
        canvas_data={"nodes": [], "edges": []}
    )
    db_session.add(flow)
    await db_session.flush()

    # Create START node
    start_node = Node(
        id=uuid4(),
        organization_id=org.id,
        flow_id=flow.id,
        node_id="start-1",
        node_type="start",
        data={"greeting": "Bem-vindo!"},
        label="Início"
    )
    db_session.add(start_node)
    await db_session.flush()

    # Create QUESTION node
    question_node_id = uuid4()
    question_node = Node(
        id=question_node_id,
        organization_id=org.id,
        flow_id=flow.id,
        node_id="q-1",
        node_type="question",
        data={
            "question": "Qual seu nome?",
            "variable": "customer_name",
            "validation": {"type": "text", "min_length": 2},
            "next_node_id": str(question_node_id)
        },
        label="Nome"
    )
    db_session.add(question_node)
    await db_session.flush()

    # Create MESSAGE node
    message_node = Node(
        id=uuid4(),
        organization_id=org.id,
        flow_id=flow.id,
        node_id="msg-1",
        node_type="message",
        data={
            "text": "Obrigado pelo seu interesse!",
            "next_node_id": None
        },
        label="Encerramento"
    )
    db_session.add(message_node)
    await db_session.flush()

    return flow


class TestWhatsAppIntegration:
    """Integration tests for complete WhatsApp flow."""

    @pytest.mark.asyncio
    async def test_new_conversation_flow(self, db_session, org, flow_with_nodes):
        """Test complete flow for new conversation."""
        router = WhatsAppRouterService(db_session)
        
        phone_number = "5511999999999"
        
        # 1. First message - should start flow and ask question
        state1, response1 = await router.route_message(
            organization_id=org.id,
            phone_number=phone_number,
            flow_id=flow_with_nodes.id,
            user_message="Olá",
        )
        
        assert state1 is not None
        assert "Bem-vindo" in response1  # START node response
        assert state1.phone_number == phone_number
        assert state1.is_active == True

        # 2. Check conversation state
        state_repo = ConversationStateRepository(db_session)
        fetched_state = await state_repo.get_by_phone_and_flow(
            organization_id=org.id,
            phone_number=phone_number,
            flow_id=flow_with_nodes.id,
        )
        assert fetched_state is not None
        assert fetched_state.id == state1.id

        # 3. Check conversation logs
        log_repo = ConversationLogRepository(db_session)
        logs, total = await log_repo.get_by_phone(
            organization_id=org.id,
            phone_number=phone_number,
            limit=10,
        )
        assert len(logs) > 0
        assert any("Bem-vindo" in log.bot_response for log in logs)

    @pytest.mark.asyncio
    async def test_conversation_with_variables(self, db_session, org, flow_with_nodes):
        """Test variable collection in conversation."""
        router = WhatsAppRouterService(db_session)
        
        phone_number = "5511888888888"
        
        # Start conversation
        state1, response1 = await router.route_message(
            organization_id=org.id,
            phone_number=phone_number,
            flow_id=flow_with_nodes.id,
            user_message="Olá",
        )
        
        # Answer question
        state2, response2 = await router.route_message(
            organization_id=org.id,
            phone_number=phone_number,
            flow_id=flow_with_nodes.id,
            user_message="João Silva",
        )
        
        # Check variables were collected
        assert "customer_name" in state2.variables
        assert state2.variables["customer_name"] == "João Silva"

    @pytest.mark.asyncio
    async def test_concurrent_conversations(self, db_session, org, flow_with_nodes):
        """Test handling multiple concurrent conversations."""
        router = WhatsAppRouterService(db_session)
        
        phones = [
            "5511111111111",
            "5511222222222",
            "5511333333333",
        ]
        
        # Start 3 conversations
        for phone in phones:
            state, response = await router.route_message(
                organization_id=org.id,
                phone_number=phone,
                flow_id=flow_with_nodes.id,
                user_message="Olá",
            )
            assert state is not None
            assert state.phone_number == phone
        
        # Verify all 3 states exist independently
        state_repo = ConversationStateRepository(db_session)
        
        for phone in phones:
            state = await state_repo.get_by_phone_and_flow(
                organization_id=org.id,
                phone_number=phone,
                flow_id=flow_with_nodes.id,
            )
            assert state is not None


class TestNodeExecutorIntegration:
    """Integration tests for node execution."""

    @pytest.mark.asyncio
    async def test_node_execution_sequence(self, db_session, org):
        """Test executing nodes in sequence."""
        # Create simple flow
        from app.models import Chatbot
        chatbot = Chatbot(
            id=uuid4(),
            organization_id=org.id,
            name="Test"
        )
        db_session.add(chatbot)
        await db_session.flush()
        
        flow = Flow(
            id=uuid4(),
            organization_id=org.id,
            chatbot_id=chatbot.id,
            name="Simple",
            canvas_data={}
        )
        db_session.add(flow)
        await db_session.flush()
        
        executor = NodeExecutor(db_session)
        
        # Test node execution
        node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="test-1",
            node_type="message",
            data={"text": "Test message"}
        )
        db_session.add(node)
        await db_session.flush()
        
        response, next_id, variables = await executor.execute(node)
        assert "Test message" in response
        assert isinstance(variables, dict)


class TestAnalyticsIntegration:
    """Integration tests for analytics."""

    @pytest.mark.asyncio
    async def test_conversation_analytics(self, db_session, org, flow_with_nodes):
        """Test analytics generation from conversation data."""
        from app.services.whatsapp_analytics_service import WhatsAppAnalyticsService
        
        router = WhatsAppRouterService(db_session)
        phone = "5511777777777"
        
        # Create conversation
        for i in range(3):
            await router.route_message(
                organization_id=org.id,
                phone_number=phone,
                flow_id=flow_with_nodes.id,
                user_message=f"Message {i}",
            )
        
        # Get analytics
        analytics = WhatsAppAnalyticsService(db_session)
        transcript = await analytics.get_conversation_transcript(
            organization_id=org.id,
            phone_number=phone,
            flow_id=flow_with_nodes.id,
        )
        
        assert transcript is not None
        assert transcript["phone_number"] == phone
        assert transcript["message_count"] > 0


class TestErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.asyncio
    async def test_invalid_flow_id(self, db_session, org):
        """Test handling invalid flow ID."""
        router = WhatsAppRouterService(db_session)
        
        with pytest.raises(ValueError):
            await router.route_message(
                organization_id=org.id,
                phone_number="5511999999999",
                flow_id=uuid4(),  # Non-existent flow
                user_message="Test",
            )

    @pytest.mark.asyncio
    async def test_invalid_node_type(self, db_session, org, chatbot):
        """Test handling invalid node type."""
        flow = Flow(
            id=uuid4(),
            organization_id=org.id,
            chatbot_id=chatbot.id,
            name="Test",
            canvas_data={}
        )
        db_session.add(flow)
        await db_session.flush()
        
        node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="invalid",
            node_type="unknown_type",  # Invalid type
            data={}
        )
        db_session.add(node)
        await db_session.flush()
        
        executor = NodeExecutor(db_session)
        
        with pytest.raises(ValueError):
            await executor.execute(node)
