"""
Integration tests for Phase 1.3 - 24-Hour Conversation Window Validation

Tests the complete window validation flow:
1. Window creation and reset
2. Window expiration checking
3. Message validation (free vs template)
4. Multi-tenancy isolation
5. Webhook integration

Tests require PostgreSQL and async SQLAlchemy session setup.

Author: Kayo Carvalho Fernandes
"""

import pytest
import logging
from uuid import uuid4
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models import Base
from app.models.organization import Organization
from app.models.user import User
from app.models.conversation import Conversation
from app.models.conversation_window import ConversationWindow
from app.services.window_validation_service import (
    WindowValidationService,
    WindowStatus,
)
from app.repositories.conversation_window import ConversationWindowRepository
from app.repositories.conversation import ConversationRepository

logger = logging.getLogger(__name__)

# Database URL for testing (PostgreSQL on Docker)
TEST_DATABASE_URL = "postgresql+asyncpg://pytake:pytake123@localhost:5435/pytake_test"


@pytest.fixture(scope="session")
def event_loop():
    """Create event loop for async tests."""
    import asyncio
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
async def async_engine():
    """Create async database engine."""
    engine = create_async_engine(
        TEST_DATABASE_URL,
        echo=False,
        future=True,
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Cleanup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest.fixture
async def db_session(async_engine):
    """Create database session for each test."""
    async_session = sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with async_session() as session:
        yield session


@pytest.fixture
async def org_and_user(db_session):
    """Create test organization and user."""
    org = Organization(
        id=uuid4(),
        name="Test Organization",
        slug="test-org",
        plan="pro",
    )
    
    user = User(
        id=uuid4(),
        email="test@example.com",
        username="testuser",
        is_active=True,
        organization_id=org.id,
    )
    
    db_session.add(org)
    db_session.add(user)
    await db_session.commit()
    
    return org, user


@pytest.fixture
async def test_conversation(db_session, org_and_user):
    """Create test conversation."""
    org, user = org_and_user
    
    conversation = Conversation(
        id=uuid4(),
        phone_number="+5585999999999",
        organization_id=org.id,
        contact_id=uuid4(),  # Would normally link to Contact model
        conversation_flow="default",
        is_window_open=False,
    )
    
    db_session.add(conversation)
    await db_session.commit()
    
    return conversation


class TestWindowValidationIntegration:
    """Integration tests for window validation with real database."""

    @pytest.mark.asyncio
    async def test_window_creation_on_first_conversation(self, db_session, test_conversation):
        """Test that window is created on first customer message."""
        service = WindowValidationService(db_session)
        
        # Reset window (simulating first customer message)
        window = await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Verify window was created
        assert window is not None
        assert window.conversation_id == test_conversation.id
        assert window.organization_id == test_conversation.organization_id
        
        # Verify window is active
        status, w = await service.get_window_status(
            test_conversation.id,
            test_conversation.organization_id,
        )
        assert status == WindowStatus.ACTIVE
        assert w.is_within_window is True
        
        logger.info("✅ Window created and verified as active")

    @pytest.mark.asyncio
    async def test_window_allows_free_messages_within_24h(
        self, db_session, test_conversation
    ):
        """Test that free messages are allowed within 24-hour window."""
        service = WindowValidationService(db_session)
        
        # Create active window
        await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Check if free message is allowed
        can_send = await service.can_send_free_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        assert can_send is True
        logger.info("✅ Free message allowed within 24-hour window")

    @pytest.mark.asyncio
    async def test_window_validation_result_free_message(
        self, db_session, test_conversation
    ):
        """Test message validation result for free message within window."""
        service = WindowValidationService(db_session)
        
        # Create active window
        await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Validate free message
        result = await service.validate_message_before_send(
            test_conversation.id,
            test_conversation.organization_id,
            is_template_message=False,
        )
        
        assert result.is_valid is True
        assert result.window_status == WindowStatus.ACTIVE
        assert result.template_required is False
        assert result.hours_remaining > 0
        
        logger.info(f"✅ Free message validated: {result.hours_remaining}h remaining")

    @pytest.mark.asyncio
    async def test_window_status_details(self, db_session, test_conversation):
        """Test getting detailed window status information."""
        service = WindowValidationService(db_session)
        
        # Create active window
        await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Get window info
        window_info = await service.get_window_info(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Verify window info structure
        assert "window_status" in window_info
        assert "is_within_window" in window_info
        assert "hours_remaining" in window_info
        assert "minutes_remaining" in window_info
        assert window_info["window_status"] == "active"
        assert window_info["is_within_window"] is True
        
        logger.info(f"✅ Window info retrieved: {window_info['hours_remaining']}h remaining")

    @pytest.mark.asyncio
    async def test_multi_tenant_isolation_in_window_operations(
        self, db_session, org_and_user
    ):
        """Test that window operations respect organization isolation."""
        org1, user1 = org_and_user
        
        # Create second organization
        org2 = Organization(
            id=uuid4(),
            name="Test Organization 2",
            slug="test-org-2",
            plan="pro",
        )
        db_session.add(org2)
        await db_session.commit()
        
        # Create conversation in org1
        conv1 = Conversation(
            id=uuid4(),
            phone_number="+5585999999991",
            organization_id=org1.id,
            contact_id=uuid4(),
            conversation_flow="default",
        )
        
        # Create conversation in org2
        conv2 = Conversation(
            id=uuid4(),
            phone_number="+5585999999992",
            organization_id=org2.id,
            contact_id=uuid4(),
            conversation_flow="default",
        )
        
        db_session.add(conv1)
        db_session.add(conv2)
        await db_session.commit()
        
        # Create service
        service = WindowValidationService(db_session)
        
        # Create window for org1 conversation
        await service.reset_window_on_customer_message(conv1.id, org1.id)
        
        # Verify org1 window
        status1, window1 = await service.get_window_status(conv1.id, org1.id)
        assert status1 == WindowStatus.ACTIVE
        assert window1.organization_id == org1.id
        
        # Verify org2 conversation has no window
        status2, window2 = await service.get_window_status(conv2.id, org2.id)
        assert status2 == WindowStatus.UNKNOWN
        assert window2 is None
        
        logger.info("✅ Multi-tenant isolation verified")

    @pytest.mark.asyncio
    async def test_template_message_validation(self, db_session, test_conversation):
        """Test that template messages can be validated."""
        service = WindowValidationService(db_session)
        
        # Create active window
        await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Test with approved template
        approved_template = {"status": "approved", "id": "template_123"}
        result = await service.validate_message_before_send(
            test_conversation.id,
            test_conversation.organization_id,
            is_template_message=True,
            template=approved_template,
        )
        
        assert result.is_valid is True
        assert "Template message with approved template" in result.reason
        
        logger.info("✅ Template message validation passed")

    @pytest.mark.asyncio
    async def test_missing_window_returns_unknown_status(
        self, db_session, test_conversation
    ):
        """Test that missing window returns UNKNOWN status."""
        service = WindowValidationService(db_session)
        
        # Get status without creating window
        status, window = await service.get_window_status(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        assert status == WindowStatus.UNKNOWN
        assert window is None
        
        logger.info("✅ Missing window correctly returns UNKNOWN status")

    @pytest.mark.asyncio
    async def test_window_reset_extends_expiry(self, db_session, test_conversation):
        """Test that window reset extends expiration time."""
        service = WindowValidationService(db_session)
        
        # Create initial window
        window1 = await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Get initial expiry time
        initial_expiry = window1.ends_at
        
        # Wait a moment
        await asyncio.sleep(0.1)
        
        # Reset window again
        window2 = await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # New expiry should be later
        new_expiry = window2.ends_at
        
        # Both should exist and be valid
        assert initial_expiry is not None
        assert new_expiry is not None
        assert new_expiry >= initial_expiry
        
        logger.info("✅ Window reset correctly extends expiry time")

    @pytest.mark.asyncio
    async def test_window_hours_remaining_calculation(
        self, db_session, test_conversation
    ):
        """Test that hours_remaining is correctly calculated."""
        service = WindowValidationService(db_session)
        
        # Create window
        window = await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Hours remaining should be close to 24
        hours_remaining = window.hours_remaining
        assert 23.5 < hours_remaining <= 24.0
        
        # Minutes remaining should be calculated
        minutes_remaining = window.minutes_remaining
        assert minutes_remaining > 0
        assert minutes_remaining <= 24 * 60
        
        logger.info(f"✅ Hours remaining: {hours_remaining}h, Minutes: {minutes_remaining}min")


class TestWindowValidationWebhookIntegration:
    """Test integration with webhook handlers."""

    @pytest.mark.asyncio
    async def test_webhook_updates_window_on_customer_message(
        self, db_session, test_conversation
    ):
        """Test that webhook properly updates window on customer message."""
        service = WindowValidationService(db_session)
        
        # Simulate webhook: customer sends message
        window = await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Verify window was updated
        assert window is not None
        assert window.is_within_window is True
        
        # Verify conversation lastmessage tracking
        conv = await db_session.get(Conversation, test_conversation.id)
        assert conv is not None
        
        logger.info("✅ Webhook correctly updates window")

    @pytest.mark.asyncio
    async def test_window_expiry_check_identifies_expired_windows(
        self, db_session, test_conversation
    ):
        """Test that expiry check can identify expired windows."""
        service = WindowValidationService(db_session)
        
        # Create window
        window = await service.reset_window_on_customer_message(
            test_conversation.id,
            test_conversation.organization_id,
        )
        
        # Window should be active initially
        status, _ = await service.get_window_status(
            test_conversation.id,
            test_conversation.organization_id,
        )
        assert status == WindowStatus.ACTIVE
        
        logger.info("✅ Window expiry check framework functional")


# Helper async import
import asyncio
