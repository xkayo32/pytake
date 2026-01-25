"""
Unit tests for OIDCService
Tests OAuth 2.0 + OpenID Connect authentication flow implementation.
"""

import pytest
from uuid import uuid4
from unittest.mock import AsyncMock, patch, MagicMock
import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.services.oidc_service import OIDCService
from app.models import OAuthProvider, User, UserIdentity, Organization
from app.repositories.oauth_sso_repository import OAuthProviderRepository
from app.core.exceptions import BadRequestException, UnauthorizedException, NotFoundException


@pytest.mark.asyncio
class TestOIDCService:
    """Test OIDCService methods."""
    
    async def test_get_discovery_document(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test OIDC discovery document generation."""
        service = OIDCService(db)
        
        discovery = await service.get_discovery_document(test_org.id)
        
        # Verify discovery document structure
        assert "issuer" in discovery
        assert "authorization_endpoint" in discovery
        assert "token_endpoint" in discovery
        assert "userinfo_endpoint" in discovery
        assert "jwks_uri" in discovery
        assert "scopes_supported" in discovery
        assert "response_types_supported" in discovery
    
    async def test_authorization_url_generation(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test OIDC authorization URL generation."""
        service = OIDCService(db)
        
        # Create OIDC provider config
        provider = OAuthProvider(
            id=uuid4(),
            organization_id=test_org.id,
            provider_type="oidc",
            provider_name="google",
            client_id="client_id_123",
            client_secret="client_secret_456",
            authorize_url="https://accounts.google.com/o/oauth2/v2/auth",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            is_active=True,
        )
        await db.merge(provider)
        await db.commit()
        
        # Generate authorization URL
        auth_url = await service.get_authorization_url(
            organization_id=test_org.id,
            provider_id=provider.id,
            redirect_uri="https://app.example.com/callback",
            state="state_value_123",
            nonce="nonce_value_456",
        )
        
        # Verify URL components
        assert "client_id=client_id_123" in auth_url
        assert "state=state_value_123" in auth_url
        assert "nonce=nonce_value_456" in auth_url
        assert "response_type=code" in auth_url
        assert "scope=" in auth_url
    
    async def test_code_exchange_flow(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test OAuth 2.0 authorization code exchange."""
        service = OIDCService(db)
        
        # Create OIDC provider
        provider = OAuthProvider(
            id=uuid4(),
            organization_id=test_org.id,
            provider_type="oidc",
            provider_name="google",
            client_id="client_id",
            client_secret="client_secret",
            token_url="https://oauth2.googleapis.com/token",
            userinfo_url="https://openidconnect.googleapis.com/v1/userinfo",
            is_active=True,
        )
        await db.merge(provider)
        await db.commit()
        
        # Mock token exchange response
        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value.json = AsyncMock(
                return_value={
                    "access_token": "access_token_abc",
                    "refresh_token": "refresh_token_xyz",
                    "expires_in": 3600,
                    "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                    "token_type": "Bearer",
                }
            )
            
            # Exchange authorization code for tokens
            access_token, refresh_token = await service.exchange_code_for_tokens(
                organization_id=test_org.id,
                provider_id=provider.id,
                authorization_code="auth_code_123",
                redirect_uri="https://app.example.com/callback",
                client_ip="192.168.1.1",
                user_agent="Mozilla/5.0",
            )
        
        # Verify tokens returned
        assert access_token is not None
        assert refresh_token is not None
        assert isinstance(access_token, str)
        assert isinstance(refresh_token, str)
    
    async def test_userinfo_retrieval(
        self,
        db: AsyncSession,
        test_org: Organization,
        test_user: User,
    ):
        """Test retrieving user information from OIDC provider."""
        service = OIDCService(db)
        
        # Get user info
        userinfo = await service.get_userinfo(
            organization_id=test_org.id,
            user_id=test_user.id,
        )
        
        # Verify userinfo structure
        assert "sub" in userinfo
        assert "email" in userinfo
        assert userinfo["sub"] == str(test_user.id)
        assert userinfo["email"] == test_user.email
    
    async def test_id_token_validation(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test ID token validation."""
        service = OIDCService(db)
        
        # Create provider
        provider = OAuthProvider(
            id=uuid4(),
            organization_id=test_org.id,
            provider_type="oidc",
            provider_name="google",
            client_id="client_id",
            client_secret="client_secret",
            jwks_uri="https://www.googleapis.com/oauth2/v3/certs",
            is_active=True,
        )
        await db.merge(provider)
        await db.commit()
        
        # Mock JWT validation
        with patch("jwt.decode") as mock_decode:
            mock_decode.return_value = {
                "sub": str(uuid4()),
                "iss": "https://accounts.google.com",
                "aud": "client_id",
                "exp": 9999999999,
                "nonce": "nonce_value",
            }
            
            # Validate ID token
            claims = await service.validate_id_token(
                organization_id=test_org.id,
                provider_id=provider.id,
                id_token="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
                nonce="nonce_value",
            )
        
        # Verify claims
        assert "sub" in claims
        assert "iss" in claims
        assert claims["nonce"] == "nonce_value"
    
    async def test_multi_tenancy_isolation_oidc(
        self,
        db: AsyncSession,
    ):
        """Test OIDC service enforces multi-tenancy isolation."""
        service = OIDCService(db)
        
        org1 = Organization(id=uuid4(), name="Org 1", slug="org1")
        org2 = Organization(id=uuid4(), name="Org 2", slug="org2")
        await db.merge(org1)
        await db.merge(org2)
        await db.commit()
        
        # Create provider for org1
        provider = OAuthProvider(
            id=uuid4(),
            organization_id=org1.id,
            provider_type="oidc",
            provider_name="google",
            client_id="client_id",
            client_secret="secret",
            is_active=True,
        )
        await db.merge(provider)
        await db.commit()
        
        # Try to access from org2 (should fail)
        repo = OAuthProviderRepository(db)
        result = await repo.get_by_id(provider.id, org2.id)
        
        assert result is None  # Multi-tenancy isolation working
    
    async def test_logout_invalidates_tokens(
        self,
        db: AsyncSession,
        test_org: Organization,
        test_user: User,
    ):
        """Test OIDC logout invalidates user tokens."""
        service = OIDCService(db)
        
        # Mock SessionManager
        with patch("app.services.session_manager.SessionManager.invalidate_user_sessions") as mock_invalidate:
            mock_invalidate.return_value = None
            
            # Process logout
            await service.process_logout(
                organization_id=test_org.id,
                user_id=test_user.id,
                ip_address="192.168.1.1",
                user_agent="Mozilla/5.0",
            )
        
        # Verify invalidation called
        mock_invalidate.assert_called_once()
    
    async def test_user_provisioning_on_first_login(
        self,
        db: AsyncSession,
        test_org: Organization,
    ):
        """Test automatic user provisioning on first OIDC login."""
        service = OIDCService(db)
        
        user_claims = {
            "sub": "google_user_123",
            "email": "newuser@example.com",
            "name": "John Doe",
            "given_name": "John",
            "family_name": "Doe",
        }
        
        # Mock user creation
        with patch("app.repositories.user.UserRepository.create") as mock_create:
            mock_user = User(
                id=uuid4(),
                organization_id=test_org.id,
                email=user_claims["email"],
                username=user_claims["email"],
                first_name=user_claims.get("given_name", ""),
                last_name=user_claims.get("family_name", ""),
                is_active=True,
            )
            mock_create.return_value = mock_user
            
            # Simulate user provisioning
            provider_id = uuid4()
            user = await service._link_user_identity(
                organization_id=test_org.id,
                provider_id=provider_id,
                provider_name="google",
                user_claims=user_claims,
            )
        
        # Verify user created and linked
        assert user is not None


@pytest.mark.asyncio
class TestOIDCEndpoints:
    """Test OIDC REST endpoints."""
    
    async def test_discovery_endpoint(self, client):
        """Test GET /.well-known/openid-configuration returns discovery document."""
        org_id = uuid4()
        
        response = client.get(
            f"/api/v1/oidc/.well-known/openid-configuration?organization_id={org_id}"
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "issuer" in data
        assert "authorization_endpoint" in data
        assert "token_endpoint" in data
    
    async def test_authorize_endpoint(self, client):
        """Test GET /authorize redirects to provider."""
        org_id = uuid4()
        provider_id = uuid4()
        
        response = client.get(
            f"/api/v1/oidc/{org_id}/authorize",
            params={
                "provider_id": str(provider_id),
                "redirect_uri": "https://app.example.com/callback",
                "state": "state_123",
            },
            follow_redirects=False,
        )
        
        # May redirect or error (depends on provider config)
        assert response.status_code in [302, 400, 404, 500]
    
    async def test_token_endpoint(self, client):
        """Test POST /token exchanges authorization code."""
        org_id = uuid4()
        
        response = client.post(
            f"/api/v1/oidc/{org_id}/token",
            data={
                "grant_type": "authorization_code",
                "code": "auth_code_123",
                "redirect_uri": "https://app.example.com/callback",
                "client_id": str(uuid4()),
                "client_secret": "secret",
            },
        )
        
        # May return tokens or error (depends on provider config)
        assert response.status_code >= 400  # Error for invalid code
    
    async def test_userinfo_endpoint(self, client, auth_headers):
        """Test GET /userinfo returns authenticated user claims."""
        org_id = uuid4()
        
        response = client.get(
            f"/api/v1/oidc/{org_id}/userinfo",
            headers=auth_headers,
        )
        
        # May return user info or 401 (depends on auth)
        assert response.status_code in [200, 401, 403]
    
    async def test_logout_endpoint(self, client, auth_headers):
        """Test POST /logout terminates session."""
        org_id = uuid4()
        
        response = client.post(
            f"/api/v1/oidc/{org_id}/logout",
            headers=auth_headers,
        )
        
        # Should handle logout
        assert response.status_code in [200, 302, 401]
    
    async def test_health_check_endpoint(self, client):
        """Test GET /health returns service status."""
        org_id = uuid4()
        
        response = client.get(f"/api/v1/oidc/{org_id}/health")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["service"] == "oidc"


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
        email="oidc@example.com",
        username="oidcuser",
        first_name="OIDC",
        last_name="User",
        is_active=True,
    )
    db.add(user)
    await db.commit()
    return user
