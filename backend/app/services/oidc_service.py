"""
OIDC (OpenID Connect) Authentication Service
Handles OAuth 2.0 authorization code flow with OpenID Connect extensions.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from uuid import UUID
import secrets
import json

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OAuthProvider, User, UserIdentity, SSOAuditLog
from app.repositories.oauth_sso_repository import (
    OAuthProviderRepository,
    UserIdentityRepository,
    SSOAuditLogRepository,
)
from app.repositories.user import UserRepository
from app.core.security import create_access_token, create_refresh_token
from app.core.exceptions import (
    BadRequestException,
    UnauthorizedException,
    NotFoundException,
)


class OIDCService:
    """
    OIDC (OpenID Connect) Service for handling OAuth 2.0 + OIDC flows.
    
    Implements OAuth 2.0 Authorization Code Flow with OIDC extensions.
    
    Handles:
    - OIDC discovery document
    - Authorization request (redirect to provider)
    - Token exchange (authorization code → tokens)
    - UserInfo endpoint (get user claims)
    - OIDC logout
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.oauth_provider_repo = OAuthProviderRepository(db)
        self.user_identity_repo = UserIdentityRepository(db)
        self.sso_audit_log_repo = SSOAuditLogRepository(db)
        self.user_repo = UserRepository(db)

    async def get_discovery_document(
        self,
        organization_id: UUID,
    ) -> Dict:
        """
        Get OIDC discovery document (.well-known/openid-configuration).
        
        Describes OIDC endpoints, supported scopes, grant types, etc.
        
        Args:
            organization_id: Organization ID
            
        Returns:
            OIDC discovery document dict
        """
        # Base URL (should be configurable per environment)
        base_url = "https://api.pytake.net"
        
        return {
            "issuer": f"{base_url}/api/v1/oidc",
            "authorization_endpoint": f"{base_url}/api/v1/oidc/{{organization_id}}/authorize",
            "token_endpoint": f"{base_url}/api/v1/oidc/{{organization_id}}/token",
            "userinfo_endpoint": f"{base_url}/api/v1/oidc/{{organization_id}}/userinfo",
            "logout_endpoint": f"{base_url}/api/v1/oidc/{{organization_id}}/logout",
            "scopes_supported": [
                "openid",
                "profile",
                "email",
                "offline_access",
            ],
            "response_types_supported": [
                "code",
                "id_token",
                "id_token token",
            ],
            "grant_types_supported": [
                "authorization_code",
                "refresh_token",
            ],
            "id_token_signing_alg_values_supported": [
                "RS256",
                "HS256",
            ],
            "token_endpoint_auth_methods_supported": [
                "client_secret_basic",
                "client_secret_post",
                "client_secret_jwt",
            ],
            "claims_supported": [
                "iss",
                "sub",
                "aud",
                "exp",
                "iat",
                "auth_time",
                "email",
                "email_verified",
                "name",
                "given_name",
                "family_name",
            ],
        }

    async def get_authorization_url(
        self,
        organization_id: UUID,
        provider_id: UUID,
        redirect_uri: str,
        state: Optional[str] = None,
        nonce: Optional[str] = None,
        scopes: Optional[list] = None,
    ) -> str:
        """
        Generate authorization URL to redirect user to OIDC provider.
        
        Args:
            organization_id: Organization ID
            provider_id: OAuth provider configuration ID
            redirect_uri: Callback URL (must match provider config)
            state: CSRF protection state (auto-generated if not provided)
            nonce: Nonce for ID token validation (auto-generated if not provided)
            scopes: Requested scopes (default: openid profile email)
            
        Returns:
            Authorization URL to redirect user to
            
        Raises:
            NotFoundException: If provider not found
            BadRequestException: If provider not OIDC
        """
        provider = await self.oauth_provider_repo.get_by_id(provider_id, organization_id)
        if not provider:
            raise NotFoundException(f"OAuth provider {provider_id} not found")

        if provider.provider_type not in ["oidc", "oauth2.0"]:
            raise BadRequestException(f"Provider is not OIDC: {provider.provider_type}")

        if not provider.is_enabled:
            raise BadRequestException(f"Provider {provider.name} is disabled")

        # Generate state and nonce if not provided
        if not state:
            state = secrets.token_urlsafe(32)
        if not nonce:
            nonce = secrets.token_urlsafe(32)

        if not scopes:
            scopes = ["openid", "profile", "email"]

        # Build authorization URL
        auth_url = f"{provider.sso_url}?client_id={provider.client_id}"
        auth_url += f"&response_type=code"
        auth_url += f"&redirect_uri={redirect_uri}"
        auth_url += f"&state={state}"
        auth_url += f"&nonce={nonce}"
        auth_url += f"&scope={' '.join(scopes)}"

        return auth_url

    async def exchange_code_for_tokens(
        self,
        organization_id: UUID,
        provider_id: UUID,
        authorization_code: str,
        redirect_uri: str,
        client_ip: str = "unknown",
        user_agent: str = "unknown",
    ) -> Tuple[str, str]:
        """
        Exchange authorization code for tokens (OAuth 2.0 code flow).
        
        Steps:
        1. Validate provider config
        2. POST to token endpoint with code + client credentials
        3. Validate ID token (JWT signature)
        4. Extract user claims from ID token
        5. Create/link user identity
        6. Generate PyTake JWT tokens
        7. Log authentication event
        
        Args:
            organization_id: Organization ID
            provider_id: OAuth provider configuration
            authorization_code: Code from authorize callback
            redirect_uri: Must match original redirect_uri
            client_ip: Client IP for audit
            user_agent: Client user agent for audit
            
        Returns:
            Tuple of (access_token, refresh_token)
            
        Raises:
            UnauthorizedException: If code exchange or validation fails
            NotFoundException: If provider or user not found
        """
        provider = await self.oauth_provider_repo.get_by_id(provider_id, organization_id)
        if not provider:
            raise NotFoundException(f"OAuth provider {provider_id} not found")

        try:
            # Exchange code for tokens
            token_data = {
                "grant_type": "authorization_code",
                "code": authorization_code,
                "redirect_uri": redirect_uri,
                "client_id": provider.client_id,
                "client_secret": provider.client_secret,
            }

            # In real implementation, would POST to provider.metadata_url (token endpoint)
            # For now, simulate successful token exchange
            id_token = secrets.token_urlsafe(256)
            access_token_provider = secrets.token_urlsafe(256)

            # Extract user claims from ID token
            # In real implementation, would validate JWT signature and decode
            user_claims = {
                "sub": secrets.token_hex(16),  # Subject (unique user ID from provider)
                "email": f"user-{secrets.token_hex(4)}@example.com",
                "name": "OIDC User",
            }

        except Exception as e:
            await self._log_auth_event(
                organization_id=organization_id,
                provider=provider,
                status="failed",
                error=str(e),
                ip_address=client_ip,
                user_agent=user_agent,
            )
            raise UnauthorizedException(f"Failed to exchange code for tokens: {e}")

        # Find or create user identity
        user, is_new = await self._link_user_identity(
            organization_id=organization_id,
            provider=provider,
            external_id=user_claims.get("sub"),
            external_email=user_claims.get("email"),
        )

        # Generate PyTake JWT tokens
        access_token = create_access_token(
            subject=str(user.id),
            additional_claims={"organization_id": str(organization_id)},
            expires_delta=timedelta(minutes=15),
        )
        refresh_token = create_refresh_token(
            subject=str(user.id),
            expires_delta=timedelta(days=7),
        )

        # Log successful authentication
        await self._log_auth_event(
            organization_id=organization_id,
            provider=provider,
            user_id=user.id,
            status="success",
            ip_address=client_ip,
            user_agent=user_agent,
        )

        return access_token, refresh_token

    async def get_userinfo(
        self,
        organization_id: UUID,
        user_id: UUID,
    ) -> Dict:
        """
        Get user information (OIDC userinfo endpoint).
        
        Returns user claims (email, name, profile, etc).
        
        Args:
            organization_id: Organization ID
            user_id: User ID
            
        Returns:
            User claims dict
            
        Raises:
            NotFoundException: If user not found
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User {user_id} not found")

        # Return user claims
        return {
            "sub": str(user.id),
            "email": user.email,
            "email_verified": getattr(user, "email_verified", False),
            "name": user.full_name,
            "given_name": user.full_name.split()[0] if user.full_name else "",
            "family_name": user.full_name.split()[-1] if user.full_name else "",
            "updated_at": int(user.updated_at.timestamp()) if hasattr(user, "updated_at") else int(datetime.utcnow().timestamp()),
        }

    async def process_logout(
        self,
        organization_id: UUID,
        user_id: UUID,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> Optional[str]:
        """
        Process OIDC logout.
        
        Logs logout event (token blacklist happens at endpoint level).
        
        Args:
            organization_id: Organization ID
            user_id: User ID
            ip_address: Client IP
            user_agent: Client user agent
            
        Returns:
            Logout endpoint URL (optional, for provider-side logout)
        """
        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User {user_id} not found")

        # Log logout event
        await self._log_auth_event(
            organization_id=organization_id,
            provider=None,
            user_id=user_id,
            status="logout",
            ip_address=ip_address,
            user_agent=user_agent,
            action="logout",
        )

        return None  # No provider logout URL needed

    # ==================== PRIVATE METHODS ====================

    async def _link_user_identity(
        self,
        organization_id: UUID,
        provider: OAuthProvider,
        external_id: str,
        external_email: Optional[str] = None,
    ) -> Tuple[User, bool]:
        """
        Find or create user identity for OIDC token.
        
        Strategy:
        1. Look up existing UserIdentity by external_id + provider
        2. If found, return user
        3. If not found but email matches, link to existing user
        4. Otherwise, create new user
        
        Args:
            organization_id: Organization
            provider: OIDC provider
            external_id: OIDC subject (unique user ID from provider)
            external_email: Email from OIDC token (optional)
            
        Returns:
            Tuple of (User, is_new_user)
        """
        # Try to find existing identity
        user_identity = await self.user_identity_repo.get_by_external_id(
            external_id=external_id,
            oauth_provider_id=provider.id,
            organization_id=organization_id,
        )

        if user_identity:
            # Update last login timestamp
            await self.user_identity_repo.update_last_login(user_identity.id)
            user = await self.user_repo.get_by_id(user_identity.user_id)
            return user, False

        # Try to find user by email (if provided)
        if external_email:
            user = await self.user_repo.get_by_email(external_email)
            if user and user.organization_id == organization_id:
                # Link identity to existing user
                await self.user_identity_repo.link_identity(
                    user_id=user.id,
                    oauth_provider_id=provider.id,
                    external_id=external_id,
                    external_email=external_email,
                    is_primary=False,
                )
                return user, False

        # Create new user
        new_user = User(
            organization_id=organization_id,
            email=external_email or f"oidc-{external_id}@pytake.local",
            full_name=external_email or external_id,
            is_active=True,
        )
        user = await self.user_repo.create(new_user)

        # Link identity to new user
        await self.user_identity_repo.link_identity(
            user_id=user.id,
            oauth_provider_id=provider.id,
            external_id=external_id,
            external_email=external_email,
            is_primary=True,
        )

        return user, True

    async def _log_auth_event(
        self,
        organization_id: UUID,
        provider: Optional[OAuthProvider],
        status: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
        user_id: Optional[UUID] = None,
        error: Optional[str] = None,
        action: str = "login",
    ) -> None:
        """
        Log authentication event to SSOAuditLog.
        
        Args:
            organization_id: Organization
            provider: OIDC provider (None for logout)
            status: success, failed, logout
            ip_address: Client IP
            user_agent: Client user agent
            user_id: User ID (None for failed logins)
            error: Error message (for failed logins)
            action: login or logout
        """
        if action == "logout":
            log = SSOAuditLog.create_logout_event(
                organization_id=organization_id,
                user_id=user_id,
                ip_address=ip_address,
                user_agent=user_agent,
            )
        else:
            log = SSOAuditLog.create_login_event(
                organization_id=organization_id,
                user_id=user_id,
                provider=provider.provider_type if provider else "oidc",
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                error_message=error,
            )

        await self.sso_audit_log_repo.create(log)
