"""
Tests for WindowValidationService - 24-hour message window validation.

Tests cover:
- Window status checking
- Free message validation (within/outside 24h)
- Template message validation
- Window reset on customer message
- Expiry calculations
"""

import pytest
from datetime import datetime, timedelta
from uuid import UUID, uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.models.base import Base
from app.models.organization import Organization
from app.models.conversation import Conversation
from app.models.contact import Contact
from app.models.whatsapp_number import WhatsAppNumber
from app.models.conversation_window import ConversationWindow
from app.services.window_validation_service import WindowValidationService, WindowStatus
from app.repositories.conversation_window import ConversationWindowRepository


# Test fixtures
@pytest.fixture
async def db_session():
    """Create a test database session"""
    # Use SQLite in-memory for tests
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with AsyncSessionLocal() as session:
        yield session
    
    await engine.dispose()


@pytest.fixture
async def test_organization(db_session):
    """Create test organization"""
    org = Organization(
        id=uuid4(),
        name="Test Org",
        slug="test-org",
        plan_type="professional",
    )
    db_session.add(org)
    await db_session.commit()
    return org


@pytest.fixture
async def test_contact(db_session, test_organization):
    """Create test contact"""
    contact = Contact(
        id=uuid4(),
        organization_id=test_organization.id,
        whatsapp_id="5511999999999",
        name="Test Contact",
        source="whatsapp",
    )
    db_session.add(contact)
    await db_session.commit()
    return contact


@pytest.fixture
async def test_whatsapp_number(db_session, test_organization):
    """Create test WhatsApp number"""
    number = WhatsAppNumber(
        id=uuid4(),
        organization_id=test_organization.id,
        phone_number="5511988888888",
        phone_number_id="123456789",
        whatsapp_business_account_id="987654321",
    )
    db_session.add(number)
    await db_session.commit()
    return number


@pytest.fixture
async def test_conversation(db_session, test_organization, test_contact, test_whatsapp_number):
    """Create test conversation with window"""
    now = datetime.utcnow()
    conversation = Conversation(
        id=uuid4(),
        organization_id=test_organization.id,
        contact_id=test_contact.id,
        whatsapp_number_id=test_whatsapp_number.id,
        status="open",
        channel="whatsapp",
        last_user_message_at=now,
        window_expires_at=now + timedelta(hours=24),
    )
    db_session.add(conversation)
    await db_session.commit()
    
    # Create window
    window = ConversationWindow(
        id=uuid4(),
        organization_id=test_organization.id,
        conversation_id=conversation.id,
        started_at=now,
        ends_at=now + timedelta(hours=24),
        is_active=True,
        status="active",
    )
    db_session.add(window)
    await db_session.commit()
    
    return conversation


# Tests
@pytest.mark.asyncio
async def test_window_status_active(db_session, test_organization, test_conversation):
    """Test that window is recognized as active when within 24h"""
    service = WindowValidationService(db_session)
    status, window = await service.get_window_status(
        test_conversation.id, test_organization.id
    )
    
    assert status == WindowStatus.ACTIVE
    assert window is not None
    assert window.is_within_window


@pytest.mark.asyncio
async def test_window_status_expired(db_session, test_organization, test_conversation):
    """Test that window is recognized as expired after 24h"""
    # Get window and set it to expired
    window_repo = ConversationWindowRepository(db_session)
    window = await window_repo.get_by_conversation_id(
        test_conversation.id, test_organization.id
    )
    
    # Manually set ends_at to past
    window.ends_at = datetime.utcnow() - timedelta(hours=1)
    db_session.add(window)
    await db_session.commit()
    
    service = WindowValidationService(db_session)
    status, updated_window = await service.get_window_status(
        test_conversation.id, test_organization.id
    )
    
    assert status == WindowStatus.EXPIRED
    assert not updated_window.is_within_window


@pytest.mark.asyncio
async def test_can_send_free_message_within_24h(db_session, test_organization, test_conversation):
    """Test that free message can be sent within 24h window"""
    service = WindowValidationService(db_session)
    can_send = await service.can_send_free_message(
        test_conversation.id, test_organization.id
    )
    
    assert can_send is True


@pytest.mark.asyncio
async def test_can_send_free_message_outside_24h(db_session, test_organization, test_conversation):
    """Test that free message cannot be sent outside 24h window"""
    # Expire the window
    window_repo = ConversationWindowRepository(db_session)
    window = await window_repo.get_by_conversation_id(
        test_conversation.id, test_organization.id
    )
    window.ends_at = datetime.utcnow() - timedelta(hours=1)
    db_session.add(window)
    await db_session.commit()
    
    service = WindowValidationService(db_session)
    can_send = await service.can_send_free_message(
        test_conversation.id, test_organization.id
    )
    
    assert can_send is False


@pytest.mark.asyncio
async def test_validate_free_message_allowed(db_session, test_organization, test_conversation):
    """Test validation for free message within window"""
    service = WindowValidationService(db_session)
    result = await service.validate_message_before_send(
        test_conversation.id,
        test_organization.id,
        is_template_message=False,
    )
    
    assert result.is_valid is True
    assert result.window_status == WindowStatus.ACTIVE
    assert result.template_required is False
    assert result.hours_remaining > 0


@pytest.mark.asyncio
async def test_validate_free_message_blocked(db_session, test_organization, test_conversation):
    """Test validation for free message outside window"""
    # Expire window
    window_repo = ConversationWindowRepository(db_session)
    window = await window_repo.get_by_conversation_id(
        test_conversation.id, test_organization.id
    )
    window.ends_at = datetime.utcnow() - timedelta(hours=1)
    db_session.add(window)
    await db_session.commit()
    
    service = WindowValidationService(db_session)
    result = await service.validate_message_before_send(
        test_conversation.id,
        test_organization.id,
        is_template_message=False,
    )
    
    assert result.is_valid is False
    assert result.window_status == WindowStatus.EXPIRED
    assert result.template_required is True
    assert result.hours_remaining == 0


@pytest.mark.asyncio
async def test_reset_window_on_customer_message(db_session, test_organization, test_conversation):
    """Test window reset on customer message"""
    # Wait slightly to see time difference
    import asyncio
    await asyncio.sleep(0.1)
    
    service = WindowValidationService(db_session)
    old_window = await service.get_window_info(
        test_conversation.id, test_organization.id
    )
    
    # Reset window
    new_window_obj = await service.reset_window_on_customer_message(
        test_conversation.id, test_organization.id
    )
    
    # Verify window was reset
    assert new_window_obj.is_within_window
    assert new_window_obj.started_at > datetime.utcnow() - timedelta(seconds=5)


@pytest.mark.asyncio
async def test_extend_window_manually(db_session, test_organization, test_conversation):
    """Test manual window extension (admin override)"""
    service = WindowValidationService(db_session)
    
    # Expire window first
    window_repo = ConversationWindowRepository(db_session)
    window = await window_repo.get_by_conversation_id(
        test_conversation.id, test_organization.id
    )
    window.ends_at = datetime.utcnow() - timedelta(hours=1)
    db_session.add(window)
    await db_session.commit()
    
    # Extend it
    result = await service.extend_window_manually(
        test_conversation.id, test_organization.id, hours=48
    )
    
    assert result.is_valid is True
    assert result.window_status == WindowStatus.ACTIVE


@pytest.mark.asyncio
async def test_window_hours_remaining(db_session, test_organization, test_conversation):
    """Test hours remaining calculation"""
    window_repo = ConversationWindowRepository(db_session)
    window = await window_repo.get_by_conversation_id(
        test_conversation.id, test_organization.id
    )
    
    # Verify hours remaining is close to 24
    assert 23 < window.hours_remaining <= 24


@pytest.mark.asyncio
async def test_window_info_response(db_session, test_organization, test_conversation):
    """Test window info response structure"""
    service = WindowValidationService(db_session)
    info = await service.get_window_info(
        test_conversation.id, test_organization.id
    )
    
    # Check response has required fields
    assert "window_status" in info
    assert "is_within_window" in info
    assert "hours_remaining" in info
    assert "minutes_remaining" in info
    assert "time_until_expiry" in info
    assert info["is_within_window"] is True


@pytest.mark.asyncio
async def test_window_close_expired_windows(db_session, test_organization, test_conversation):
    """Test batch closing of expired windows"""
    # Expire window
    window_repo = ConversationWindowRepository(db_session)
    window = await window_repo.get_by_conversation_id(
        test_conversation.id, test_organization.id
    )
    window.ends_at = datetime.utcnow() - timedelta(hours=1)
    db_session.add(window)
    await db_session.commit()
    
    # Close expired windows
    service = WindowValidationService(db_session)
    closed_count = await service.check_and_close_expired_windows(test_organization.id)
    
    assert closed_count >= 1
    
    # Verify window is now closed
    updated_window = await window_repo.get_by_conversation_id(
        test_conversation.id, test_organization.id
    )
    assert updated_window.is_active is False
    assert updated_window.status == "expired"
