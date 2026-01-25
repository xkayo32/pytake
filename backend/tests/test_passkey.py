"""
Tests for Passkey (WebAuthn) endpoints and services.
"""

import pytest
from uuid import uuid4
import base64
import secrets
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.testclient import TestClient

from app.models.passkey import PasskeyCredential, PasskeyChallenge
from app.models.user import User
from app.models.organization import Organization
from app.services.passkey_service import PasskeyService
from app.repositories.passkey_repository import (
    PasskeyCredentialRepository,
    PasskeyChallengeRepository,
)


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
async def test_passkey_credential_create(db: AsyncSession, user: User, org: Organization):
    """Test creating a passkey credential."""
    repo = PasskeyCredentialRepository(db)
    
    credential_id = base64.b64encode(secrets.token_bytes(32)).decode()
    public_key = base64.b64encode(secrets.token_bytes(64)).decode()
    
    cred = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "credential_id": credential_id,
        "public_key": public_key,
        "counter": 0,
        "transports": "usb,nfc",
        "device_name": "Test YubiKey",
        "is_primary": False,
    })
    
    assert cred.id is not None
    assert cred.user_id == user.id
    assert cred.organization_id == org.id
    assert cred.device_name == "Test YubiKey"
    assert cred.counter == 0


@pytest.mark.asyncio
async def test_passkey_credential_get_by_id(db: AsyncSession, user: User, org: Organization):
    """Test fetching credential by ID."""
    repo = PasskeyCredentialRepository(db)
    
    credential_id = base64.b64encode(secrets.token_bytes(32)).decode()
    public_key = base64.b64encode(secrets.token_bytes(64)).decode()
    
    cred = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "credential_id": credential_id,
        "public_key": public_key,
        "counter": 0,
        "transports": "usb",
        "device_name": "Test Device",
        "is_primary": True,
    })
    
    fetched = await repo.get_by_id(cred.id, org.id)
    assert fetched is not None
    assert fetched.id == cred.id
    assert fetched.device_name == "Test Device"
    assert fetched.is_primary is True


@pytest.mark.asyncio
async def test_passkey_credential_get_by_credential_id(db: AsyncSession, user: User, org: Organization):
    """Test fetching credential by credential_id."""
    repo = PasskeyCredentialRepository(db)
    
    credential_id = base64.b64encode(secrets.token_bytes(32)).decode()
    public_key = base64.b64encode(secrets.token_bytes(64)).decode()
    
    cred = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "credential_id": credential_id,
        "public_key": public_key,
        "counter": 0,
        "transports": "nfc",
        "device_name": "Test Device",
    })
    
    fetched = await repo.get_by_credential_id(credential_id, org.id)
    assert fetched is not None
    assert fetched.credential_id == credential_id


@pytest.mark.asyncio
async def test_passkey_credential_get_by_user(db: AsyncSession, user: User, org: Organization):
    """Test fetching all credentials for a user."""
    repo = PasskeyCredentialRepository(db)
    
    # Create 3 credentials
    for i in range(3):
        credential_id = base64.b64encode(secrets.token_bytes(32)).decode()
        public_key = base64.b64encode(secrets.token_bytes(64)).decode()
        
        await repo.create({
            "user_id": user.id,
            "organization_id": org.id,
            "credential_id": credential_id,
            "public_key": public_key,
            "counter": 0,
            "transports": "usb",
            "device_name": f"Device {i}",
        })
    
    credentials = await repo.get_by_user(user.id, org.id)
    assert len(credentials) == 3
    assert all(c.user_id == user.id for c in credentials)


@pytest.mark.asyncio
async def test_passkey_credential_increment_counter(db: AsyncSession, user: User, org: Organization):
    """Test counter increment (replay prevention)."""
    repo = PasskeyCredentialRepository(db)
    
    credential_id = base64.b64encode(secrets.token_bytes(32)).decode()
    public_key = base64.b64encode(secrets.token_bytes(64)).decode()
    
    cred = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "credential_id": credential_id,
        "public_key": public_key,
        "counter": 0,
        "transports": "usb",
        "device_name": "Test",
    })
    
    assert cred.counter == 0
    
    # Increment counter
    success = await repo.increment_counter(credential_id, org.id)
    assert success is True
    
    # Verify counter incremented
    fetched = await repo.get_by_credential_id(credential_id, org.id)
    assert fetched.counter == 1
    assert fetched.last_used_at is not None


@pytest.mark.asyncio
async def test_passkey_credential_delete(db: AsyncSession, user: User, org: Organization):
    """Test soft delete of credential."""
    repo = PasskeyCredentialRepository(db)
    
    credential_id = base64.b64encode(secrets.token_bytes(32)).decode()
    public_key = base64.b64encode(secrets.token_bytes(64)).decode()
    
    cred = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "credential_id": credential_id,
        "public_key": public_key,
        "counter": 0,
        "transports": "usb",
        "device_name": "Test",
    })
    
    # Delete credential
    success = await repo.delete(cred.id, org.id)
    assert success is True
    
    # Verify deleted
    fetched = await repo.get_by_id(cred.id, org.id)
    assert fetched is None


@pytest.mark.asyncio
async def test_passkey_challenge_create(db: AsyncSession, user: User, org: Organization):
    """Test creating a challenge."""
    repo = PasskeyChallengeRepository(db)
    
    challenge = base64.b64encode(secrets.token_bytes(32)).decode()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    chal = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "challenge": challenge,
        "challenge_type": "registration",
        "expires_at": expires_at,
    })
    
    assert chal.id is not None
    assert chal.challenge == challenge
    assert chal.is_used is False


@pytest.mark.asyncio
async def test_passkey_challenge_get_by_challenge(db: AsyncSession, user: User, org: Organization):
    """Test fetching challenge by value."""
    repo = PasskeyChallengeRepository(db)
    
    challenge = base64.b64encode(secrets.token_bytes(32)).decode()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    chal = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "challenge": challenge,
        "challenge_type": "authentication",
        "expires_at": expires_at,
    })
    
    fetched = await repo.get_by_challenge(challenge, org.id)
    assert fetched is not None
    assert fetched.challenge == challenge


@pytest.mark.asyncio
async def test_passkey_challenge_mark_used(db: AsyncSession, user: User, org: Organization):
    """Test marking challenge as used."""
    repo = PasskeyChallengeRepository(db)
    
    challenge = base64.b64encode(secrets.token_bytes(32)).decode()
    expires_at = datetime.utcnow() + timedelta(minutes=10)
    
    chal = await repo.create({
        "user_id": user.id,
        "organization_id": org.id,
        "challenge": challenge,
        "challenge_type": "registration",
        "expires_at": expires_at,
    })
    
    # Mark as used
    success = await repo.mark_used(chal.id, org.id)
    assert success is True
    
    # Verify used
    fetched = await repo.get_by_challenge(challenge, org.id)
    assert fetched.is_used is True
    assert fetched.used_at is not None


@pytest.mark.asyncio
async def test_passkey_service_initiate_registration(db: AsyncSession, user: User, org: Organization):
    """Test initiate_registration service method."""
    service = PasskeyService(db)
    
    result = await service.initiate_registration(user.id, org.id)
    
    assert "challenge" in result
    assert "challenge_id" in result
    assert "rp" in result
    assert "user" in result
    assert "pubKeyCredParams" in result
    assert result["rp"]["name"] == "PyTake"
    assert result["rp"]["id"] == "pytake.com"


@pytest.mark.asyncio
async def test_passkey_service_complete_registration(db: AsyncSession, user: User, org: Organization):
    """Test complete_registration service method."""
    service = PasskeyService(db)
    
    # Initiate
    init_result = await service.initiate_registration(user.id, org.id)
    challenge_id_str = init_result["challenge_id"]
    
    # Complete
    credential_id = base64.b64encode(secrets.token_bytes(32)).decode()
    public_key = base64.b64encode(secrets.token_bytes(64)).decode()
    
    from uuid import UUID
    credential = await service.complete_registration(
        user_id=user.id,
        organization_id=org.id,
        challenge_id=UUID(challenge_id_str),
        credential_id_b64=credential_id,
        public_key_b64=public_key,
        transports="usb,nfc",
        device_name="iPhone Face ID",
    )
    
    assert credential.id is not None
    assert credential.device_name == "iPhone Face ID"
    assert credential.counter == 0


@pytest.mark.asyncio
async def test_passkey_service_initiate_authentication(db: AsyncSession, org: Organization):
    """Test initiate_authentication service method."""
    service = PasskeyService(db)
    
    result = await service.initiate_authentication(org.id)
    
    assert "challenge" in result
    assert "challenge_id" in result
    assert "rp" in result
    assert result["rp"]["id"] == "pytake.com"


@pytest.mark.asyncio
async def test_passkey_multi_tenancy_isolation(db: AsyncSession):
    """Test multi-tenancy isolation - credentials from different orgs are isolated."""
    repo = PasskeyCredentialRepository(db)
    
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
    
    # Create credentials in different orgs
    credential_id1 = base64.b64encode(secrets.token_bytes(32)).decode()
    credential_id2 = base64.b64encode(secrets.token_bytes(32)).decode()
    
    cred1 = await repo.create({
        "user_id": user1.id,
        "organization_id": org1.id,
        "credential_id": credential_id1,
        "public_key": base64.b64encode(secrets.token_bytes(64)).decode(),
        "counter": 0,
        "transports": "usb",
        "device_name": "Device 1",
    })
    
    cred2 = await repo.create({
        "user_id": user2.id,
        "organization_id": org2.id,
        "credential_id": credential_id2,
        "public_key": base64.b64encode(secrets.token_bytes(64)).decode(),
        "counter": 0,
        "transports": "usb",
        "device_name": "Device 2",
    })
    
    # Org 1 should only see its credential
    creds_org1 = await repo.get_by_user(user1.id, org1.id)
    assert len(creds_org1) == 1
    assert creds_org1[0].id == cred1.id
    
    # Org 2 should only see its credential
    creds_org2 = await repo.get_by_user(user2.id, org2.id)
    assert len(creds_org2) == 1
    assert creds_org2[0].id == cred2.id
    
    # Cross-org query should fail
    cross_org_query = await repo.get_by_id(cred1.id, org2.id)
    assert cross_org_query is None
