"""
Integration tests for 24-hour window enforcement in full message send flow.

Tests cover:
- Full conversation lifecycle with window tracking
- Message sending within/outside window
- Incoming message window reset
- Multi-conversation window isolation
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.organization import Organization
from app.models.conversation import Conversation
from app.models.contact import Contact
from app.models.whatsapp_number import WhatsAppNumber
from app.models.conversation_window import ConversationWindow
from app.repositories.conversation_window import ConversationWindowRepository
from app.services.conversation_service import ConversationService
from app.services.window_validation_service import WindowValidationService
from app.schemas.conversation import ConversationCreate, MessageCreate


# Fixtures
@pytest.fixture
async def db_session():
    """Create a test database session"""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with AsyncSessionLocal() as session:
        yield session
    
    await engine.dispose()


@pytest.fixture
async def test_data(db_session):
    """Create comprehensive test data"""
    org = Organization(
        id=uuid4(),
        name="Integration Test Org",
        slug="int-test-org",
        plan_type="professional",
    )
    db_session.add(org)
    
    contact = Contact(
        id=uuid4(),
        organization_id=org.id,
        whatsapp_id="5511999999999",
        name="Test Contact",
        source="whatsapp",
    )
    db_session.add(contact)
    
    number = WhatsAppNumber(
        id=uuid4(),
        organization_id=org.id,
        phone_number="5511988888888",
        phone_number_id="123456789",
        whatsapp_business_account_id="987654321",
    )
    db_session.add(number)
    
    await db_session.commit()
    
    return {
        "org": org,
        "contact": contact,
        "number": number,
    }


# Integration Tests
@pytest.mark.asyncio
async def test_conversation_lifecycle_with_window(db_session, test_data):
    """Test full conversation lifecycle with window tracking"""
    org = test_data["org"]
    contact = test_data["contact"]
    number = test_data["number"]
    
    # 1. Create conversation
    now = datetime.utcnow()
    conversation = Conversation(
        id=uuid4(),
        organization_id=org.id,
        contact_id=contact.id,
        whatsapp_number_id=number.id,
        status="open",
        channel="whatsapp",
        last_user_message_at=now,
        window_expires_at=now + timedelta(hours=24),
    )
    db_session.add(conversation)
    
    # 2. Create window
    window = ConversationWindow(
        id=uuid4(),
        organization_id=org.id,
        conversation_id=conversation.id,
        started_at=now,
        ends_at=now + timedelta(hours=24),
        is_active=True,
        status="active",
    )
    db_session.add(window)
    await db_session.commit()
    
    # 3. Verify window is active
    window_service = WindowValidationService(db_session)
    can_send_free = await window_service.can_send_free_message(
        conversation.id, org.id
    )
    assert can_send_free is True
    
    # 4. Simulate time passing (window expires)
    window.ends_at = datetime.utcnow() - timedelta(hours=1)
    db_session.add(window)
    await db_session.commit()
    
    # 5. Verify window is expired
    can_send_free = await window_service.can_send_free_message(
        conversation.id, org.id
    )
    assert can_send_free is False
    
    # 6. Simulate customer message (reset window)
    reset_window = await window_service.reset_window_on_customer_message(
        conversation.id, org.id
    )
    assert reset_window.is_within_window is True
    
    # 7. Verify window is active again
    can_send_free = await window_service.can_send_free_message(
        conversation.id, org.id
    )
    assert can_send_free is True


@pytest.mark.asyncio
async def test_multi_conversation_window_isolation(db_session, test_data):
    """Test that windows are isolated between conversations"""
    org = test_data["org"]
    contact1 = test_data["contact"]
    number = test_data["number"]
    
    # Create second contact
    contact2 = Contact(
        id=uuid4(),
        organization_id=org.id,
        whatsapp_id="5521999999999",
        name="Test Contact 2",
        source="whatsapp",
    )
    db_session.add(contact2)
    await db_session.commit()
    
    now = datetime.utcnow()
    
    # Create two conversations
    conv1 = Conversation(
        id=uuid4(),
        organization_id=org.id,
        contact_id=contact1.id,
        whatsapp_number_id=number.id,
        status="open",
        channel="whatsapp",
        last_user_message_at=now,
        window_expires_at=now + timedelta(hours=24),
    )
    
    conv2 = Conversation(
        id=uuid4(),
        organization_id=org.id,
        contact_id=contact2.id,
        whatsapp_number_id=number.id,
        status="open",
        channel="whatsapp",
        last_user_message_at=now,
        window_expires_at=now + timedelta(hours=24),
    )
    
    db_session.add(conv1)
    db_session.add(conv2)
    
    # Create windows for both
    window1 = ConversationWindow(
        id=uuid4(),
        organization_id=org.id,
        conversation_id=conv1.id,
        started_at=now,
        ends_at=now + timedelta(hours=24),
        is_active=True,
        status="active",
    )
    
    window2 = ConversationWindow(
        id=uuid4(),
        organization_id=org.id,
        conversation_id=conv2.id,
        started_at=now,
        ends_at=now + timedelta(hours=1),  # Different expiry time
        is_active=True,
        status="active",
    )
    
    db_session.add(window1)
    db_session.add(window2)
    await db_session.commit()
    
    # Expire window2
    window2.ends_at = datetime.utcnow() - timedelta(hours=1)
    db_session.add(window2)
    await db_session.commit()
    
    # Verify they are independent
    window_service = WindowValidationService(db_session)
    
    can_send_1 = await window_service.can_send_free_message(conv1.id, org.id)
    can_send_2 = await window_service.can_send_free_message(conv2.id, org.id)
    
    assert can_send_1 is True  # Conv1 still active
    assert can_send_2 is False  # Conv2 expired


@pytest.mark.asyncio
async def test_window_extension_preserves_state(db_session, test_data):
    """Test that manually extending window preserves conversation state"""
    org = test_data["org"]
    contact = test_data["contact"]
    number = test_data["number"]
    
    now = datetime.utcnow()
    
    # Create conversation with expired window
    conversation = Conversation(
        id=uuid4(),
        organization_id=org.id,
        contact_id=contact.id,
        whatsapp_number_id=number.id,
        status="open",
        channel="whatsapp",
        last_user_message_at=now,
        window_expires_at=now - timedelta(hours=1),  # Already expired
    )
    db_session.add(conversation)
    
    # Create expired window
    window = ConversationWindow(
        id=uuid4(),
        organization_id=org.id,
        conversation_id=conversation.id,
        started_at=now - timedelta(hours=25),
        ends_at=now - timedelta(hours=1),  # Expired
        is_active=False,
        status="expired",
    )
    db_session.add(window)
    await db_session.commit()
    
    # Verify it's expired
    window_service = WindowValidationService(db_session)
    status, _ = await window_service.get_window_status(conversation.id, org.id)
    assert status.value == "expired"
    
    # Extend window
    result = await window_service.extend_window_manually(
        conversation.id, org.id, hours=48
    )
    
    assert result.is_valid is True
    
    # Verify it's now active
    status, _ = await window_service.get_window_status(conversation.id, org.id)
    assert status.value == "active"


@pytest.mark.asyncio
async def test_batch_close_expired_windows(db_session, test_data):
    """Test closing all expired windows for an organization"""
    org = test_data["org"]
    contact = test_data["contact"]
    number = test_data["number"]
    
    now = datetime.utcnow()
    
    # Create multiple conversations with mixed window states
    conversations = []
    windows = []
    
    for i in range(3):
        conv = Conversation(
            id=uuid4(),
            organization_id=org.id,
            contact_id=contact.id,
            whatsapp_number_id=number.id,
            status="open",
            channel="whatsapp",
        )
        db_session.add(conv)
        conversations.append(conv)
    
    await db_session.flush()
    
    # Create windows: 1 active, 2 expired
    for i, conv in enumerate(conversations):
        if i == 0:
            # Active window
            window = ConversationWindow(
                id=uuid4(),
                organization_id=org.id,
                conversation_id=conv.id,
                started_at=now,
                ends_at=now + timedelta(hours=24),
                is_active=True,
                status="active",
            )
        else:
            # Expired window
            window = ConversationWindow(
                id=uuid4(),
                organization_id=org.id,
                conversation_id=conv.id,
                started_at=now - timedelta(hours=48),
                ends_at=now - timedelta(hours=24),
                is_active=True,  # Still marked active but expired
                status="active",
            )
        
        db_session.add(window)
        windows.append(window)
    
    await db_session.commit()
    
    # Close expired windows
    window_service = WindowValidationService(db_session)
    closed_count = await window_service.check_and_close_expired_windows(org.id)
    
    assert closed_count == 2  # Should close 2 expired windows
    
    # Verify state
    window_repo = ConversationWindowRepository(db_session)
    active_count = await window_repo.count_active_windows(org.id)
    assert active_count == 1  # Only 1 active now


@pytest.mark.asyncio
async def test_window_time_remaining_accuracy(db_session, test_data):
    """Test that time remaining calculations are accurate"""
    org = test_data["org"]
    contact = test_data["contact"]
    number = test_data["number"]
    
    now = datetime.utcnow()
    
    # Create window that expires in exactly 12 hours
    conversation = Conversation(
        id=uuid4(),
        organization_id=org.id,
        contact_id=contact.id,
        whatsapp_number_id=number.id,
        status="open",
        channel="whatsapp",
    )
    db_session.add(conversation)
    await db_session.flush()
    
    window = ConversationWindow(
        id=uuid4(),
        organization_id=org.id,
        conversation_id=conversation.id,
        started_at=now,
        ends_at=now + timedelta(hours=12),
        is_active=True,
        status="active",
    )
    db_session.add(window)
    await db_session.commit()
    
    # Check time remaining
    assert 11.9 < window.hours_remaining <= 12
    assert 719 < window.minutes_remaining <= 720  # ~12 hours in minutes
    
    # Check time_until_expiry dict
    time_info = window.time_until_expiry
    assert time_info["expired"] is False
    assert time_info["hours"] == 11 or time_info["hours"] == 12  # Allow for timing variance
