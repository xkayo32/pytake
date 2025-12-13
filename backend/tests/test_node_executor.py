"""
Tests for NodeExecutor - Verifying each node type execution.

Author: Kayo Carvalho Fernandes
"""

import pytest
from uuid import uuid4, UUID
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.models import Base, Organization, Node, Flow
from app.services.node_executor import NodeExecutor


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
async def flow(db_session, org):
    """Create test flow."""
    from app.models import Chatbot
    
    chatbot = Chatbot(
        id=uuid4(),
        organization_id=org.id,
        name="Test Chatbot"
    )
    db_session.add(chatbot)
    await db_session.flush()
    
    flow_obj = Flow(
        id=uuid4(),
        organization_id=org.id,
        chatbot_id=chatbot.id,
        name="Test Flow",
        is_main=True,
        canvas_data={"nodes": [], "edges": []}
    )
    db_session.add(flow_obj)
    await db_session.flush()
    return flow_obj


class TestNodeExecutor:
    """Test cases for NodeExecutor."""

    @pytest.mark.asyncio
    async def test_execute_start_node(self, db_session, flow, org):
        """Test START node execution."""
        # Create START node
        start_node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="start-1",
            node_type="start",
            data={"greeting": "Olá! Bem-vindo"},
            label="Início"
        )
        db_session.add(start_node)
        await db_session.flush()

        executor = NodeExecutor(db_session)
        response, next_node_id, variables = await executor.execute(start_node)

        assert response == "Olá! Bem-vindo"
        assert next_node_id is None
        assert variables == {}

    @pytest.mark.asyncio
    async def test_execute_message_node(self, db_session, flow, org):
        """Test MESSAGE node execution."""
        message_node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="msg-1",
            node_type="message",
            data={
                "text": "Qual é seu nome?",
                "buttons": [
                    {"label": "João", "value": "joao"},
                    {"label": "Maria", "value": "maria"}
                ]
            },
            label="Pergunta"
        )
        db_session.add(message_node)
        await db_session.flush()

        executor = NodeExecutor(db_session)
        response, next_node_id, variables = await executor.execute(message_node)

        assert "Qual é seu nome?" in response
        assert "João" in response
        assert "Maria" in response

    @pytest.mark.asyncio
    async def test_execute_question_node_asking(self, db_session, flow, org):
        """Test QUESTION node when asking (no user input)."""
        question_node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="q-1",
            node_type="question",
            data={
                "question": "Qual seu email?",
                "variable": "customer_email",
                "validation": {"type": "email"}
            },
            label="Email"
        )
        db_session.add(question_node)
        await db_session.flush()

        executor = NodeExecutor(db_session)
        response, next_node_id, variables = await executor.execute(question_node)

        assert response == "Qual seu email?"
        assert next_node_id is None  # Waiting for user input

    @pytest.mark.asyncio
    async def test_execute_question_node_with_input(self, db_session, flow, org):
        """Test QUESTION node when receiving user input."""
        question_node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="q-1",
            node_type="question",
            data={
                "question": "Qual seu email?",
                "variable": "customer_email",
                "validation": {"type": "email"},
                "next_node_id": str(uuid4())
            },
            label="Email"
        )
        db_session.add(question_node)
        await db_session.flush()

        executor = NodeExecutor(db_session)
        response, next_node_id, variables = await executor.execute(
            question_node,
            user_message="joao@example.com"
        )

        assert variables["customer_email"] == "joao@example.com"
        assert next_node_id is not None

    @pytest.mark.asyncio
    async def test_execute_condition_node_true(self, db_session, flow, org):
        """Test CONDITION node when condition is true."""
        true_node_id = uuid4()
        condition_node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="cond-1",
            node_type="condition",
            data={
                "variable": "customer_type",
                "operator": "==",
                "value": "premium",
                "true_next_node_id": str(true_node_id),
                "false_next_node_id": str(uuid4())
            },
            label="Premium?"
        )
        db_session.add(condition_node)
        await db_session.flush()

        executor = NodeExecutor(db_session)
        response, next_node_id, variables = await executor.execute(
            condition_node,
            variables={"customer_type": "premium"}
        )

        assert str(next_node_id) == str(true_node_id)

    @pytest.mark.asyncio
    async def test_execute_condition_node_false(self, db_session, flow, org):
        """Test CONDITION node when condition is false."""
        false_node_id = uuid4()
        condition_node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="cond-1",
            node_type="condition",
            data={
                "variable": "age",
                "operator": ">=",
                "value": 18,
                "true_next_node_id": str(uuid4()),
                "false_next_node_id": str(false_node_id)
            },
            label="Maior de idade?"
        )
        db_session.add(condition_node)
        await db_session.flush()

        executor = NodeExecutor(db_session)
        response, next_node_id, variables = await executor.execute(
            condition_node,
            variables={"age": 15}
        )

        assert str(next_node_id) == str(false_node_id)

    @pytest.mark.asyncio
    async def test_execute_end_node(self, db_session, flow, org):
        """Test END node execution."""
        end_node = Node(
            id=uuid4(),
            organization_id=org.id,
            flow_id=flow.id,
            node_id="end-1",
            node_type="end",
            data={"message": "Obrigado! Conversa encerrada."},
            label="Fim"
        )
        db_session.add(end_node)
        await db_session.flush()

        executor = NodeExecutor(db_session)
        response, next_node_id, variables = await executor.execute(end_node)

        assert "Obrigado" in response
        assert next_node_id == "__END__"

    def test_validate_response_email(self):
        """Test email validation."""
        executor = NodeExecutor(None)
        
        assert executor._validate_response(
            "test@example.com",
            {"type": "email"}
        ) == True
        
        assert executor._validate_response(
            "invalid-email",
            {"type": "email"}
        ) == False

    def test_validate_response_text_length(self):
        """Test text length validation."""
        executor = NodeExecutor(None)
        
        assert executor._validate_response(
            "Hello",
            {"type": "text", "min_length": 3, "max_length": 10}
        ) == True
        
        assert executor._validate_response(
            "x",
            {"type": "text", "min_length": 3, "max_length": 10}
        ) == False

    def test_evaluate_condition_operators(self):
        """Test condition evaluation operators."""
        executor = NodeExecutor(None)
        
        assert executor._evaluate_condition("premium", "==", "premium") == True
        assert executor._evaluate_condition("premium", "!=", "basic") == True
        assert executor._evaluate_condition(25, ">", 18) == True
        assert executor._evaluate_condition(15, "<", 18) == True
        assert executor._evaluate_condition("hello", "contains", "ell") == True
        assert executor._evaluate_condition("hello", "starts_with", "hel") == True

    def test_is_flow_jump(self):
        """Test flow jump detection."""
        executor = NodeExecutor(None)
        flow_id = uuid4()
        
        is_jump, target = executor.is_flow_jump(f"__JUMP__{flow_id}")
        assert is_jump == True
        assert target == str(flow_id)
        
        is_jump, target = executor.is_flow_jump("regular-node-id")
        assert is_jump == False
        assert target is None

    def test_is_conversation_end(self):
        """Test conversation end detection."""
        executor = NodeExecutor(None)
        
        assert executor.is_conversation_end("__END__") == True
        assert executor.is_conversation_end("some-node-id") == False
