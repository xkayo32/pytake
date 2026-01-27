"""
SAML 2.0 Authentication Service
Handles SAML 2.0 assertion parsing, user linking, and session management for SSO.
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, Tuple
from uuid import UUID
import json

from onelogin.saml2.auth import OneLogin_Saml2_Auth
from onelogin.saml2.utils import OneLogin_Saml2_Utils
from onelogin.saml2.errors import OneLogin_Saml2_Error
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


class SAMLService:
    """
    SAML 2.0 Service for handling authentication flows.
    
    Handles:
    - AuthnRequest generation (redirect to IdP for login)
    - ACS response processing (validate assertion, create/link user)
    - SLO (Single Logout) processing
    - Session token management
    """

    def __init__(self, db: AsyncSession):
        self.db = db
        self.oauth_provider_repo = OAuthProviderRepository(db)
        self.user_identity_repo = UserIdentityRepository(db)
        self.sso_audit_log_repo = SSOAuditLogRepository(db)
        self.user_repo = UserRepository(db)

    async def get_sso_login_url(
        self,
        organization_id: UUID,
        provider_id: UUID,
        relay_state: Optional[str] = None,
    ) -> str:
        """
        Generate SAML AuthnRequest and return IdP login URL.
        
        Args:
            organization_id: Organization performing the login
            provider_id: OAuth provider (SAML IdP) configuration
            relay_state: Optional state to preserve (e.g., redirect URL after login)
            
        Returns:
            SAML AuthnRequest URL to redirect user to IdP
            
        Raises:
            NotFoundError: If provider not found
            ValidationError: If provider not properly configured
        """
        provider = await self.oauth_provider_repo.get_by_id(provider_id, organization_id)
        if not provider:
            raise NotFoundException(f"OAuth provider {provider_id} not found")

        if provider.provider_type != "saml2.0":
            raise BadRequestException(f"Provider is not SAML 2.0: {provider.provider_type}")

        if not provider.is_enabled:
            raise BadRequestException(f"Provider {provider.name} is disabled")

        auth = self._initialize_saml_auth(provider, relay_state)
        return auth.login()

    async def process_acs_response(
        self,
        organization_id: UUID,
        provider_id: UUID,
        acs_response: Dict,
        relay_state: Optional[str] = None,
    ) -> Tuple[str, str]:
        """
        Process SAML assertion from IdP (ACS callback).
        
        Steps:
        1. Validate SAML response signature
        2. Extract user attributes (NameID, email, groups)
        3. Find or create user identity
        4. Generate JWT tokens
        5. Log authentication event
        
        Args:
            organization_id: Organization receiving the assertion
            provider_id: SAML IdP provider
            acs_response: SAML response dict with 'SAMLResponse' key
            relay_state: State parameter from AuthnRequest
            
        Returns:
            Tuple of (access_token, refresh_token)
            
        Raises:
            AuthenticationError: If assertion validation fails
            NotFoundError: If provider or user not found
        """
        provider = await self.oauth_provider_repo.get_by_id(provider_id, organization_id)
        if not provider:
            raise NotFoundException(f"OAuth provider {provider_id} not found")

        auth = self._initialize_saml_auth(provider, relay_state)
        
        try:
            auth.process_response()
        except OneLogin_Saml2_Error as e:
            await self._log_auth_event(
                organization_id=organization_id,
                provider=provider,
                status="failed",
                error=str(e),
                ip_address=acs_response.get("ip_address", "unknown"),
                user_agent=acs_response.get("user_agent", "unknown"),
            )
            raise UnauthorizedException(f"SAML assertion validation failed: {e}")

        # Check for errors in SAML response
        if not auth.is_authenticated():
            errors = auth.get_errors()
            await self._log_auth_event(
                organization_id=organization_id,
                provider=provider,
                status="failed",
                error=str(errors),
                ip_address=acs_response.get("ip_address", "unknown"),
                user_agent=acs_response.get("user_agent", "unknown"),
            )
            raise UnauthorizedException(f"SAML authentication failed: {errors}")

        # Extract user attributes
        external_id = auth.get_nameid()
        external_email = auth.get_attribute("email")
        user_attributes = auth.get_attributes()

        if not external_id:
            raise BadRequestException("SAML response missing NameID")

        # Find or create user identity
        user, is_new = await self._link_user_identity(
            organization_id=organization_id,
            provider=provider,
            external_id=external_id,
            external_email=external_email,
        )

        # Generate session tokens
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
            ip_address=acs_response.get("ip_address", "unknown"),
            user_agent=acs_response.get("user_agent", "unknown"),
        )

        return access_token, refresh_token

    async def process_logout_request(
        self,
        organization_id: UUID,
        provider_id: UUID,
        user_id: UUID,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
    ) -> str:
        """
        Process SAML Single Logout (SLO) request.
        
        Steps:
        1. Validate provider
        2. Prepare SLO request to IdP
        3. Log logout event
        4. Blacklist any active sessions (handled by session manager)
        
        Args:
            organization_id: Organization
            provider_id: SAML IdP provider
            user_id: User logging out
            ip_address: Client IP (for audit)
            user_agent: Client user agent (for audit)
            
        Returns:
            SLO redirect URL to IdP
        """
        provider = await self.oauth_provider_repo.get_by_id(provider_id, organization_id)
        if not provider:
            raise NotFoundException(f"OAuth provider {provider_id} not found")

        user = await self.user_repo.get_by_id(user_id)
        if not user:
            raise NotFoundException(f"User {user_id} not found")

        # Log logout event
        await self._log_auth_event(
            organization_id=organization_id,
            provider=provider,
            user_id=user_id,
            status="logout",
            ip_address=ip_address,
            user_agent=user_agent,
            action="logout",
        )

        auth = self._initialize_saml_auth(provider)
        return auth.logout()

    # ==================== PRIVATE METHODS ====================

    def _initialize_saml_auth(
        self,
        provider: OAuthProvider,
        relay_state: Optional[str] = None,
    ) -> OneLogin_Saml2_Auth:
        """
        Initialize OneLogin SAML auth handler with provider config.
        
        Builds SAML settings from OAuthProvider configuration
        and instantiates OneLogin_Saml2_Auth for request/response handling.
        """
        saml_settings = self._build_saml_settings(provider)
        
        request_data = {
            "http_host": "api.pytake.net",  # TODO: Make configurable per environment
            "script_name": f"/api/v1/saml/{provider.organization_id}/acs",
            "get_data": {},
            "post_data": {},
        }
        
        if relay_state:
            request_data["get_data"]["RelayState"] = relay_state

        auth = OneLogin_Saml2_Auth(request_data, saml_settings)
        return auth

    def _build_saml_settings(self, provider: OAuthProvider) -> Dict:
        """
        Build SAML settings dict from OAuthProvider configuration.
        
        Returns dict compatible with OneLogin_Saml2_Auth.
        """
        config = provider.config or {}
        
        return {
            "sp": {
                "entityId": f"https://api.pytake.net/api/v1/saml/{provider.organization_id}/metadata",
                "assertionConsumerService": {
                    "url": f"https://api.pytake.net/api/v1/saml/{provider.organization_id}/acs",
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST",
                },
                "singleLogoutService": {
                    "url": f"https://api.pytake.net/api/v1/saml/{provider.organization_id}/slo",
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
                },
                "privateKey": config.get("sp_private_key", ""),
                "publicKey": config.get("sp_public_key", ""),
            },
            "idp": {
                "entityId": provider.entity_id or provider.client_id,
                "singleSignOnService": {
                    "url": provider.sso_url or "",
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
                },
                "singleLogoutService": {
                    "url": provider.logout_url or "",
                    "binding": "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect",
                },
                "x509cert": config.get("idp_x509_cert", ""),
            },
            "security": {
                "nameIdEncrypted": False,
                "authnRequestsSigned": True,
                "wantAssertionsSigned": True,
                "wantResponseSigned": True,
                "signMetadata": True,
                "encryptionAlgorithm": "http://www.w3.org/2001/04/xmlenc#aes256-cbc",
                "digestAlgorithm": "http://www.w3.org/2001/04/xmlenc#sha256",
            },
        }

    async def _link_user_identity(
        self,
        organization_id: UUID,
        provider: OAuthProvider,
        external_id: str,
        external_email: Optional[str] = None,
    ) -> Tuple[User, bool]:
        """
        Find or create user identity for SAML assertion.
        
        Strategy:
        1. Look up existing UserIdentity by external_id + provider
        2. If found, return user
        3. If not found but email matches, link to existing user
        4. Otherwise, create new user
        
        Args:
            organization_id: Organization
            provider: SAML provider
            external_id: SAML NameID
            external_email: Email from SAML assertion (optional)
            
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
            email=external_email or f"saml-{external_id}@pytake.local",
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
        provider: OAuthProvider,
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
            provider: SAML provider
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
                provider=provider.provider_type,
                ip_address=ip_address,
                user_agent=user_agent,
                status=status,
                error_message=error,
            )

        await self.sso_audit_log_repo.create(log)
