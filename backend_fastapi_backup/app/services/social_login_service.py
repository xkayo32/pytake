"""
Social Login Service
Handles OAuth 2.0 flows for Google, GitHub, and Microsoft.
"""

import base64
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from uuid import UUID

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.social_identity import SocialIdentity
from app.models.user import User
from app.repositories.social_identity_repository import SocialIdentityRepository
from app.core.security import encrypt_string, decrypt_string
from app.core.exceptions import HTTPException


class SocialLoginService:
    """
    Service for OAuth 2.0 social authentication.
    Supports Google, GitHub, and Microsoft providers.
    """
    
    # OAuth Provider Configurations
    PROVIDERS = {
        "google": {
            "auth_url": "https://accounts.google.com/o/oauth2/v2/auth",
            "token_url": "https://oauth2.googleapis.com/token",
            "user_info_url": "https://www.googleapis.com/oauth2/v2/userinfo",
            "scopes": ["openid", "email", "profile"],
        },
        "github": {
            "auth_url": "https://github.com/login/oauth/authorize",
            "token_url": "https://github.com/login/oauth/access_token",
            "user_info_url": "https://api.github.com/user",
            "user_email_url": "https://api.github.com/user/emails",
            "scopes": ["user:email"],
        },
        "microsoft": {
            "auth_url": "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
            "token_url": "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            "user_info_url": "https://graph.microsoft.com/v1.0/me",
            "scopes": ["openid", "email", "profile"],
        },
    }
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = SocialIdentityRepository(db)
        self.state_timeout = 600  # 10 minutes
    
    def generate_state_and_challenge(self) -> Tuple[str, str]:
        """Generate state token and PKCE challenge."""
        state = base64.b64encode(secrets.token_bytes(32)).decode()
        challenge = base64.b64encode(secrets.token_bytes(32)).decode()
        return state, challenge
    
    def initiate_oauth_flow(
        self,
        provider: str,
        client_id: str,
        redirect_uri: str,
    ) -> Dict[str, str]:
        """Generate OAuth authorization URL."""
        if provider not in self.PROVIDERS:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        config = self.PROVIDERS[provider]
        state, challenge = self.generate_state_and_challenge()
        
        params = {
            "client_id": client_id,
            "redirect_uri": redirect_uri,
            "response_type": "code",
            "scope": " ".join(config["scopes"]),
            "state": state,
        }
        
        # Add provider-specific params
        if provider == "google":
            params["access_type"] = "offline"
            params["prompt"] = "consent"
        elif provider == "microsoft":
            params["response_mode"] = "query"
        
        auth_url = config["auth_url"]
        query_string = "&".join(f"{k}={v}" for k, v in params.items())
        authorization_url = f"{auth_url}?{query_string}"
        
        return {
            "authorization_url": authorization_url,
            "state": state,
            "challenge": challenge,
        }
    
    async def exchange_code_for_token(
        self,
        provider: str,
        code: str,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
    ) -> Dict[str, Any]:
        """Exchange authorization code for access token."""
        if provider not in self.PROVIDERS:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        config = self.PROVIDERS[provider]
        
        data = {
            "grant_type": "authorization_code",
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
        }
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(config["token_url"], data=data, timeout=10.0)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as e:
                raise HTTPException(status_code=400, detail=f"Token exchange failed: {str(e)}")
    
    async def get_user_info(
        self,
        provider: str,
        access_token: str,
    ) -> Dict[str, Any]:
        """Fetch user info from OAuth provider."""
        if provider not in self.PROVIDERS:
            raise HTTPException(status_code=400, detail=f"Unknown provider: {provider}")
        
        config = self.PROVIDERS[provider]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(config["user_info_url"], headers=headers, timeout=10.0)
                response.raise_for_status()
                user_info = response.json()
                
                # Handle provider-specific response formats
                if provider == "github":
                    # GitHub requires separate call to get email
                    email_response = await client.get(
                        config["user_email_url"],
                        headers=headers,
                        timeout=10.0,
                    )
                    email_data = email_response.json()
                    primary_email = next(
                        (e for e in email_data if e.get("primary")),
                        email_data[0] if email_data else {},
                    )
                    user_info["email"] = primary_email.get("email", "")
                
                return user_info
            except httpx.HTTPError as e:
                raise HTTPException(status_code=400, detail=f"User info fetch failed: {str(e)}")
    
    async def link_social_identity(
        self,
        user_id: UUID,
        organization_id: UUID,
        provider: str,
        social_user_id: str,
        email: str,
        name: str,
        avatar_url: Optional[str],
        access_token: str,
        refresh_token: Optional[str],
        expires_at: Optional[datetime],
    ) -> SocialIdentity:
        """Link social account to user."""
        # Encrypt tokens before storage
        encrypted_access_token = encrypt_string(access_token)
        encrypted_refresh_token = encrypt_string(refresh_token) if refresh_token else None
        
        # Check if identity already exists
        existing = await self.repo.get_by_user_and_provider(
            user_id=user_id,
            organization_id=organization_id,
            provider=provider,
        )
        
        if existing:
            # Update existing identity
            return await self.repo.update(
                existing.id,
                organization_id,
                {
                    "social_user_id": social_user_id,
                    "email": email,
                    "name": name,
                    "avatar_url": avatar_url,
                    "access_token": encrypted_access_token,
                    "refresh_token": encrypted_refresh_token,
                    "expires_at": expires_at,
                    "last_login_at": datetime.utcnow(),
                },
            )
        else:
            # Create new identity
            return await self.repo.create({
                "user_id": user_id,
                "organization_id": organization_id,
                "provider": provider,
                "social_user_id": social_user_id,
                "email": email,
                "name": name,
                "avatar_url": avatar_url,
                "access_token": encrypted_access_token,
                "refresh_token": encrypted_refresh_token,
                "expires_at": expires_at,
            })
    
    async def get_or_create_user_from_social(
        self,
        organization_id: UUID,
        provider: str,
        social_user_id: str,
        email: str,
        name: str,
    ) -> User:
        """Get or create user from social identity."""
        from sqlalchemy import select
        
        # First check if social identity exists
        social_identity = await self.repo.get_by_provider(
            organization_id=organization_id,
            provider=provider,
            social_user_id=social_user_id,
        )
        
        if social_identity:
            # Return existing user
            stmt = select(User).where(User.id == social_identity.user_id)
            result = await self.db.execute(stmt)
            return result.scalars().first()
        
        # Try to find user by email
        stmt = select(User).where(
            (User.email == email) & (User.organization_id == organization_id)
        )
        result = await self.db.execute(stmt)
        existing_user = result.scalars().first()
        
        if existing_user:
            return existing_user
        
        # Create new user from social identity
        user = User(
            organization_id=organization_id,
            email=email,
            username=f"{provider}_{social_user_id}",
            full_name=name,
            email_verified=True,  # Trust social provider's email
            is_active=True,
            password_hash="",  # No password for OAuth users
        )
        self.db.add(user)
        await self.db.commit()
        return user
    
    async def unlink_social_account(
        self,
        user_id: UUID,
        organization_id: UUID,
        provider: str,
    ) -> bool:
        """Unlink social account from user."""
        identity = await self.repo.get_by_user_and_provider(
            user_id=user_id,
            organization_id=organization_id,
            provider=provider,
        )
        
        if not identity:
            raise HTTPException(status_code=404, detail="Social account not found")
        
        return await self.repo.delete(identity.id, organization_id)
    
    async def list_identities(
        self,
        user_id: UUID,
        organization_id: UUID,
    ) -> list[Dict[str, Any]]:
        """List all social identities for user."""
        identities = await self.repo.get_by_user(user_id, organization_id)
        
        return [
            {
                "id": str(i.id),
                "provider": i.provider,
                "email": i.email,
                "name": i.name,
                "avatar_url": i.avatar_url,
                "linked_at": i.linked_at.isoformat(),
                "last_login_at": i.last_login_at.isoformat() if i.last_login_at else None,
            }
            for i in identities
        ]
