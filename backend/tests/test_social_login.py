"""
Tests for Social Login (OAuth) endpoints and services.
"""

import pytest
import base64
import secrets
from uuid import uuid4
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.social_identity import SocialIdentity
from app.models.user import User
from app.models.organization import Organization
from app.services.social_login_service import SocialLoginService
from app.repositories.social_identity_repository import SocialIdentityRepository


@pytest.fixture
async def org(db: AsyncSession) -> Organization:
    """Create test organization."""
    org = Organization(id=uuid4(), name="Test Org", slug="test-org")
    db.add(org)
    await db.commit()
    return org


@pytest.fixture
async def user(db: AsyncSession, org: Organization) -> User:
    """Create test user."""
    user = User(
        id=uuid4(),
        organization_id=org.id,
        email=f"test_{uuid4()}@example.com",
        username=f"testuser_{uuid4()}",
        password_hash="hashed_password",
    )
    db.add(user)
    await db.commit()
    return user


@pytest.mark.asyncio
async def test_social_identity_create(db: AsyncSession, user: User, org: Organization):
    """Test creating a social identity."""
    repo = SocialIdentityRepository(db)
    
    social_identity = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "provider": "google",
        "social_user_id": "google_123456",
        "email": "user@gmail.com",
        "name": "Test User",
        "avatar_url": "https://example.com/avatar.jpg",
        "access_token": "encrypted_access_token",
        "refresh_token": "encrypted_refresh_token",
        "expires_at": datetime.utcnow() + timedelta(hours=1),
    })
    
    assert social_identity.id is not None
    assert social_identity.provider == "google"
    assert social_identity.social_user_id == "google_123456"


@pytest.mark.asyncio
async def test_social_identity_get_by_id(db: AsyncSession, user: User, org: Organization):
    """Test fetching social identity by ID."""
    repo = SocialIdentityRepository(db)
    
    social_id = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "provider": "github",
        "social_user_id": "github_789",
        "email": "user@github.com",
        "name": "GitHub User",
        "avatar_url": None,
        "access_token": "token",
        "refresh_token": None,
        "expires_at": None,
    })
    
    fetched = await repo.get_by_id(social_id.id, org.id)
    assert fetched is not None
    assert fetched.provider == "github"
    assert fetched.social_user_id == "github_789"


@pytest.mark.asyncio
async def test_social_identity_get_by_provider(db: AsyncSession, user: User, org: Organization):
    """Test fetching by provider and social_user_id."""
    repo = SocialIdentityRepository(db)
    
    await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "provider": "microsoft",
        "social_user_id": "microsoft_abc",
        "email": "user@outlook.com",
        "name": "Microsoft User",
        "avatar_url": None,
        "access_token": "token",
        "refresh_token": None,
        "expires_at": None,
    })
    
    fetched = await repo.get_by_provider(org.id, "microsoft", "microsoft_abc")
    assert fetched is not None
    assert fetched.provider == "microsoft"


@pytest.mark.asyncio
async def test_social_identity_get_by_user(db: AsyncSession, user: User, org: Organization):
    """Test listing all social identities for user."""
    repo = SocialIdentityRepository(db)
    
    # Create 2 identities
    for provider, social_id in [("google", "g123"), ("github", "gh456")]:
        await repo.create({
            "user_id": user.id,
            "organization_id": org.id,
            "provider": provider,
            "social_user_id": social_id,
            "email": f"user@{provider}.com",
            "name": f"{provider.title()} User",
            "avatar_url": None,
            "access_token": "token",
            "refresh_token": None,
            "expires_at": None,
        })
    
    identities = await repo.get_by_user(user.id, org.id)
    assert len(identities) == 2


@pytest.mark.asyncio
async def test_social_identity_get_by_user_and_provider(db: AsyncSession, user: User, org: Organization):
    """Test getting specific provider for user."""
    repo = SocialIdentityRepository(db)
    
    await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "provider": "google",
        "social_user_id": "g123",
        "email": "test@gmail.com",
        "name": "Test",
        "avatar_url": None,
        "access_token": "token",
        "refresh_token": None,
        "expires_at": None,
    })
    
    fetched = await repo.get_by_user_and_provider(user.id, org.id, "google")
    assert fetched is not None
    assert fetched.provider == "google"


@pytest.mark.asyncio
async def test_social_identity_delete(db: AsyncSession, user: User, org: Organization):
    """Test soft delete of social identity."""
    repo = SocialIdentityRepository(db)
    
    identity = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "provider": "google",
        "social_user_id": "g123",
        "email": "test@gmail.com",
        "name": "Test",
        "avatar_url": None,
        "access_token": "token",
        "refresh_token": None,
        "expires_at": None,
    })
    
    success = await repo.delete(identity.id, org.id)
    assert success is True
    
    # Verify soft deleted
    fetched = await repo.get_by_id(identity.id, org.id)
    assert fetched is None


@pytest.mark.asyncio
async def test_social_identity_update_last_login(db: AsyncSession, user: User, org: Organization):
    """Test updating last login timestamp."""
    repo = SocialIdentityRepository(db)
    
    identity = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "provider": "github",
        "social_user_id": "gh123",
        "email": "test@github.com",
        "name": "Test",
        "avatar_url": None,
        "access_token": "token",
        "refresh_token": None,
        "expires_at": None,
    })
    
    assert identity.last_login_at is None
    
    success = await repo.update_last_login(identity.id, org.id)
    assert success is True
    
    fetched = await repo.get_by_id(identity.id, org.id)
    assert fetched.last_login_at is not None


@pytest.mark.asyncio
async def test_social_login_service_state_challenge_generation(db: AsyncSession):
    """Test state and challenge generation."""
    service = SocialLoginService(db)
    
    state1, challenge1 = service.generate_state_and_challenge()
    state2, challenge2 = service.generate_state_and_challenge()
    
    assert len(state1) > 0
    assert len(challenge1) > 0
    assert state1 != state2
    assert challenge1 != challenge2


@pytest.mark.asyncio
async def test_social_login_service_initiate_oauth_google(db: AsyncSession):
    """Test initiate OAuth for Google."""
    service = SocialLoginService(db)
    
    result = service.initiate_oauth_flow(
        provider="google",
        client_id="test_client_id",
        redirect_uri="http://localhost:3000/callback",
    )
    
    assert "authorization_url" in result
    assert "state" in result
    assert "challenge" in result
    assert "accounts.google.com" in result["authorization_url"]


@pytest.mark.asyncio
async def test_social_login_service_initiate_oauth_github(db: AsyncSession):
    """Test initiate OAuth for GitHub."""
    service = SocialLoginService(db)
    
    result = service.initiate_oauth_flow(
        provider="github",
        client_id="test_client_id",
        redirect_uri="http://localhost:3000/callback",
    )
    
    assert "authorization_url" in result
    assert "github.com" in result["authorization_url"]


@pytest.mark.asyncio
async def test_social_login_service_initiate_oauth_microsoft(db: AsyncSession):
    """Test initiate OAuth for Microsoft."""
    service = SocialLoginService(db)
    
    result = service.initiate_oauth_flow(
        provider="microsoft",
        client_id="test_client_id",
        redirect_uri="http://localhost:3000/callback",
    )
    
    assert "authorization_url" in result
    assert "microsoft.com" in result["authorization_url"]


@pytest.mark.asyncio
async def test_social_multi_tenancy_isolation(db: AsyncSession):
    """Test multi-tenancy isolation for social identities."""
    repo = SocialIdentityRepository(db)
    
    # Create 2 orgs and users
    org1 = Organization(id=uuid4(), name="Org 1", slug="org1")
    org2 = Organization(id=uuid4(), name="Org 2", slug="org2")
    db.add(org1)
    db.add(org2)
    await db.commit()
    
    user1 = User(
        id=uuid4(),
        organization_id=org1.id,
        email="user1@org1.com",
        username="user1",
        password_hash="hashed",
    )
    user2 = User(
        id=uuid4(),
        organization_id=org2.id,
        email="user2@org2.com",
        username="user2",
        password_hash="hashed",
    )
    db.add(user1)
    db.add(user2)
    await db.commit()
    
    # Create social identities in different orgs
    identity1 = await repo.create({
        "user_id": user1.id,
        "organization_id": org1.id,
        "provider": "google",
        "social_user_id": "g1",
        "email": "user1@gmail.com",
        "name": "User 1",
        "avatar_url": None,
        "access_token": "token1",
        "refresh_token": None,
        "expires_at": None,
    })
    
    identity2 = await repo.create({
        "user_id": user2.id,
        "organization_id": org2.id,
        "provider": "google",
        "social_user_id": "g2",
        "email": "user2@gmail.com",
        "name": "User 2",
        "avatar_url": None,
        "access_token": "token2",
        "refresh_token": None,
        "expires_at": None,
    })
    
    # Org 1 should only see its identity
    identities_org1 = await repo.get_by_user(user1.id, org1.id)
    assert len(identities_org1) == 1
    assert identities_org1[0].id == identity1.id
    
    # Org 2 should only see its identity
    identities_org2 = await repo.get_by_user(user2.id, org2.id)
    assert len(identities_org2) == 1
    assert identities_org2[0].id == identity2.id
    
    # Cross-org query should fail
    cross_org_query = await repo.get_by_id(identity1.id, org2.id)
    assert cross_org_query is None
