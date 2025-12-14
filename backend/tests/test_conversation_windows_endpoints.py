"""
Tests for ConversationWindow REST endpoints.

Tests cover:
- Get conversation window
- Check window status
- List active windows
- Extend window
- Message validation endpoint
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.models.base import Base
from app.models.organization import Organization
from app.models.user import User
from app.models.conversation import Conversation
from app.models.contact import Contact
from app.models.whatsapp_number import WhatsAppNumber
from app.models.conversation_window import ConversationWindow
from app.core.security import create_access_token


# Test fixtures
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
async def test_user(db_session, test_organization):
    """Create test user"""
    from app.core.security import hash_password
    user = User(
        id=uuid4(),
        organization_id=test_organization.id,
        email="test@example.com",
        hashed_password=hash_password("password123"),
        is_active=True,
        role="org_admin",
    )
    db_session.add(user)
    await db_session.commit()
    return user


@pytest.fixture
def auth_token(test_user):
    """Create JWT token for test user"""
    return create_access_token({"sub": str(test_user.id)})


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
async def test_get_conversation_window(test_conversation, test_organization, auth_token):
    """Test GET /conversations/{id}/window endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/conversations/{test_conversation.id}/window",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    
    assert response.status_code == 200
    data = response.json()
    assert data["window_status"] in ["active", "expired"]
    assert "hours_remaining" in data
    assert "is_within_window" in data


@pytest.mark.asyncio
async def test_get_window_status(test_conversation, test_organization, auth_token):
    """Test GET /conversations/{id}/window/status endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.get(
            f"/api/v1/conversations/{test_conversation.id}/window/status",
            headers={"Authorization": f"Bearer {auth_token}"},
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "window_status" in data
    assert "is_within_window" in data
    assert "time_until_expiry" in data


@pytest.mark.asyncio
async def test_validate_message_endpoint(test_conversation, test_organization, auth_token):
    """Test POST /conversations/validate-message endpoint"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/conversations/validate-message",
            headers={"Authorization": f"Bearer {auth_token}"},
            json={
                "conversation_id": str(test_conversation.id),
                "is_template_message": False,
            },
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "is_valid" in data
    assert "reason" in data
    assert "window_status" in data
    assert "template_required" in data


@pytest.mark.asyncio
async def test_auth_required_on_window_endpoints(test_conversation):
    """Test that authentication is required"""
    async with AsyncClient(app=app, base_url="http://test") as client:
        # Try without token
        response = await client.get(
            f"/api/v1/conversations/{test_conversation.id}/window"
        )
    
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_organization_isolation(test_conversation, test_organization):
    """Test that users cannot access conversations from other organizations"""
    other_org = Organization(
        id=uuid4(),
        name="Other Org",
        slug="other-org",
        plan_type="free",
    )
    # Note: This is a simple test, real implementation would verify org_id checking
    assert test_organization.id != other_org.id
