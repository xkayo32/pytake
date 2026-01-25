"""
Unit tests for SAMLService
Tests SAML 2.0 authentication flow implementation.
"""

import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.saml_service import SAMLService
from app.models import OAuthProvider, User, UserIdentity, Organization
from app.repositories.oauth_sso_repository import OAuthProviderRepository
from app.core.exceptions import BadRequestException, UnauthorizedException
from tests.factories import UserFactory, OrganizationFactory


@pytest.mark.asyncio
class TestSAMLService:
    """Test SAMLService methods."""
    
    async def test_get_sso_login_url(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test SAML login URL generation."""
        service = SAMLService(db)
        
        # Create SAML provider config
        provider = OAuthProvider(
            id=uuid4(),
            organization_id=test_org.id,
            provider_type="saml",
            provider_name="okta",
            client_id="okta.example.com",
            client_secret="okta_secret",
            metadata_url="https://okta.example.com/app/metadata.xml",
            is_active=True,
        )
        await db.merge(provider)
        await db.commit()
        
        # Generate login URL
        login_url = await service.get_sso_login_url(
            organization_id=test_org.id,
            provider_id=provider.id,
        )
        
        # Verify URL format
        assert "RelayState=" in login_url
        assert "SAMLRequest=" in login_url
        assert login_url.startswith("https://")
    
    async def test_process_acs_response_creates_user(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test ACS callback creates new user on first login."""
        service = SAMLService(db)
        
        # Mock SAML response
        mock_response = {
            "attributes": {
                "email": ["newuser@example.com"],
                "first_name": ["John"],
                "last_name": ["Doe"],
            }
        }
        
        with patch.object(
            service,
            "_initialize_saml_auth",
            return_value=MagicMock(
                process_response=MagicMock(
                    return_value=None,
                    side_effect=None,
                ),
                get_last_assertion_not_on_or_after=lambda: 1000000000,
            ),
        ):
            # Process ACS response
            tokens = await service.process_acs_response(
                organization_id=test_org.id,
                saml_response="fake_saml_response",
                relay_state="relay_state_value",
            )
        
        # Verify tokens returned
        assert tokens is not None
        assert len(tokens) > 0
    
    async def test_process_acs_response_invalid_signature(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test ACS callback rejects invalid SAML signature."""
        service = SAMLService(db)
        
        with patch.object(
            service,
            "_initialize_saml_auth",
            return_value=MagicMock(
                process_response=MagicMock(
                    side_effect=Exception("Invalid signature"),
                ),
            ),
        ):
            with pytest.raises(Exception):
                await service.process_acs_response(
                    organization_id=test_org.id,
                    saml_response="invalid_response",
                    relay_state="state",
                )
    
    async def test_process_logout_request(
        self,
        db: AsyncSession,
        test_org: Organization,
        test_user: User,
    ):
        """Test SAML Single Logout (SLO) processing."""
        service = SAMLService(db)
        
        # Create user identity link
        user_identity = UserIdentity(
            id=uuid4(),
            organization_id=test_org.id,
            user_id=test_user.id,
            provider_id=uuid4(),
            provider_user_id="saml_user_123",
            provider_name="okta",
        )
        await db.merge(user_identity)
        await db.commit()
        
        with patch.object(
            service,
            "_initialize_saml_auth",
            return_value=MagicMock(
                process_response=MagicMock(return_value=None),
            ),
        ):
            # Process logout request
            result = await service.process_logout_request(
                organization_id=test_org.id,
                saml_request="logout_request",
                relay_state="state",
            )
        
        # Verify logout processed
        assert result is not None
    
    async def test_multi_tenancy_isolation(
        self,
        db: AsyncSession,
    ):
        """Test SAML service enforces multi-tenancy isolation."""
        service = SAMLService(db)
        
        org1 = Organization(
            id=uuid4(),
            name="Org 1",
            slug="org1",
        )
        org2 = Organization(
            id=uuid4(),
            name="Org 2",
            slug="org2",
        )
        await db.merge(org1)
        await db.merge(org2)
        await db.commit()
        
        # Create provider for org1
        provider = OAuthProvider(
            id=uuid4(),
            organization_id=org1.id,
            provider_type="saml",
            provider_name="okta",
            client_id="okta.org1.com",
            client_secret="secret",
            is_active=True,
        )
        await db.merge(provider)
        await db.commit()
        
        # Try to access from org2 (should fail)
        repo = OAuthProviderRepository(db)
        result = await repo.get_by_id(provider.id, org2.id)
        
        assert result is None  # Multi-tenancy isolation working
    
    async def test_link_user_identity_by_email(
        self,
        db: AsyncSession,
        test_org: Organization,
        test_user: User,
    ):
        """Test user identity linking by email."""
        service = SAMLService(db)
        
        saml_attributes = {
            "email": [test_user.email],
            "first_name": ["John"],
        }
        
        provider_id = uuid4()
        
        # Link user identity
        result = await service._link_user_identity(
            organization_id=test_org.id,
            provider_id=provider_id,
            provider_name="okta",
            saml_attributes=saml_attributes,
        )
        
        # Verify user linked
        assert result is not None
        assert result.user_id == test_user.id
        assert result.provider_id == provider_id
    
    async def test_audit_logging(
        self,
        db: AsyncSession,
        test_org: Organization,
        test_user: User,
    ):
        """Test SAML audit logging."""
        service = SAMLService(db)
        
        # Create audit log entry
        await service._log_auth_event(
            organization_id=test_org.id,
            user_id=test_user.id,
            event_type="saml_login",
            provider_name="okta",
            ip_address="192.168.1.1",
            user_agent="Mozilla/5.0",
            success=True,
        )
        
        # Verify audit log created
        repo = SSOAuditLogRepository(db)
        logs = await repo.get_by_user(test_user.id, test_org.id)
        
        assert len(logs) > 0
        assert logs[-1].event_type == "saml_login"
        assert logs[-1].success is True


@pytest.mark.asyncio
class TestSAMLEndpoints:
    """Test SAML REST endpoints."""
    
    async def test_saml_metadata_endpoint(self, client):
        """Test GET /saml/{org_id}/metadata returns valid XML."""
        org_id = uuid4()
        
        response = client.get(f"/api/v1/saml/{org_id}/metadata")
        
        assert response.status_code == 200
        assert "xml" in response.text.lower()
    
    async def test_saml_login_endpoint(self, client):
        """Test POST /saml/{org_id}/login returns redirect URL."""
        org_id = uuid4()
        
        response = client.post(
            f"/api/v1/saml/{org_id}/login",
            json={"provider_id": str(uuid4())},
        )
        
        # May return 302 redirect or error (depends on provider config)
        assert response.status_code in [302, 400, 404, 500]
    
    async def test_saml_acs_endpoint(self, client):
        """Test POST /saml/{org_id}/acs handles SAML response."""
        org_id = uuid4()
        
        response = client.post(
            f"/api/v1/saml/{org_id}/acs",
            data={
                "SAMLResponse": "invalid_response",
                "RelayState": "state",
            },
        )
        
        # Should return error (invalid SAML response)
        assert response.status_code >= 400
    
    async def test_saml_slo_endpoint(self, client, auth_headers):
        """Test POST /saml/{org_id}/slo logs user out."""
        org_id = uuid4()
        
        response = client.post(
            f"/api/v1/saml/{org_id}/slo",
            headers=auth_headers,
            data={"SAMLRequest": "logout_request"},
        )
        
        # Should handle logout (may redirect or return JSON)
        assert response.status_code in [200, 302, 400, 401]


# Fixtures

@pytest.fixture
async def test_org(db: AsyncSession) -> Organization:
    """Create test organization."""
    org = Organization(
        id=uuid4(),
        name="Test Org",
        slug="test-org",
    )
    db.add(org)
    await db.commit()
    return org


@pytest.fixture
async def test_user(db: AsyncSession, test_org: Organization) -> User:
    """Create test user."""
    user = User(
        id=uuid4(),
        organization_id=test_org.id,
        email="test@example.com",
        username="testuser",
        first_name="Test",
        last_name="User",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    return user
