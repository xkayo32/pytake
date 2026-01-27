"""
OAuth Provider and User Identity repositories
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import OAuthProvider, UserIdentity, SSOAuditLog
from app.repositories.base import BaseRepository


class OAuthProviderRepository(BaseRepository[OAuthProvider]):
    """Repository for OAuth/SAML provider configurations"""

    def __init__(self, db: AsyncSession):
        super().__init__(OAuthProvider, db)

    async def get_by_organization(
        self, organization_id: UUID
    ) -> List[OAuthProvider]:
        """Get all OAuth providers for an organization"""
        stmt = select(OAuthProvider).where(
            OAuthProvider.organization_id == organization_id
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_enabled_by_organization(
        self, organization_id: UUID
    ) -> List[OAuthProvider]:
        """Get enabled OAuth providers for an organization"""
        stmt = (
            select(OAuthProvider)
            .where(OAuthProvider.organization_id == organization_id)
            .where(OAuthProvider.is_enabled == True)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_primary_by_organization(
        self, organization_id: UUID
    ) -> Optional[OAuthProvider]:
        """Get primary OAuth provider for an organization"""
        stmt = (
            select(OAuthProvider)
            .where(OAuthProvider.organization_id == organization_id)
            .where(OAuthProvider.is_primary == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_provider_type(
        self, organization_id: UUID, provider_type: str
    ) -> Optional[OAuthProvider]:
        """Get OAuth provider by type (saml2.0, oidc, custom)"""
        stmt = (
            select(OAuthProvider)
            .where(OAuthProvider.organization_id == organization_id)
            .where(OAuthProvider.provider_type == provider_type)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_config(
        self, provider_id: UUID, organization_id: UUID, config: dict
    ) -> Optional[OAuthProvider]:
        """Update OAuth provider configuration"""
        provider = await self.get_by_id(provider_id)
        if provider and provider.organization_id == organization_id:
            provider.config = config
            await self.db.commit()
            await self.db.refresh(provider)
            return provider
        return None

    async def set_primary(
        self, provider_id: UUID, organization_id: UUID
    ) -> Optional[OAuthProvider]:
        """Set OAuth provider as primary for organization"""
        # Unset current primary
        await self.db.execute(
            (
                select(OAuthProvider)
                .where(OAuthProvider.organization_id == organization_id)
                .where(OAuthProvider.is_primary == True)
            )
        )

        # Set new primary
        provider = await self.get_by_id(provider_id)
        if provider and provider.organization_id == organization_id:
            provider.is_primary = True
            await self.db.commit()
            await self.db.refresh(provider)
            return provider
        return None


class UserIdentityRepository(BaseRepository[UserIdentity]):
    """Repository for OAuth/SAML user identities (SSO mapping)"""

    def __init__(self, db: AsyncSession):
        super().__init__(UserIdentity, db)

    async def get_by_external_id(
        self, external_id: str, oauth_provider_id: UUID
    ) -> Optional[UserIdentity]:
        """Get user identity by external ID (SAML NameID or OIDC sub)"""
        stmt = (
            select(UserIdentity)
            .where(UserIdentity.external_id == external_id)
            .where(UserIdentity.oauth_provider_id == oauth_provider_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user_id(self, user_id: UUID) -> List[UserIdentity]:
        """Get all OAuth identities for a user"""
        stmt = select(UserIdentity).where(UserIdentity.user_id == user_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_primary_identity(self, user_id: UUID) -> Optional[UserIdentity]:
        """Get primary OAuth identity for a user"""
        stmt = (
            select(UserIdentity)
            .where(UserIdentity.user_id == user_id)
            .where(UserIdentity.is_primary == True)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def link_identity(
        self,
        user_id: UUID,
        oauth_provider_id: UUID,
        external_id: str,
        external_email: Optional[str] = None,
        is_primary: bool = False,
    ) -> UserIdentity:
        """Link external OAuth identity to user"""
        identity = UserIdentity(
            user_id=user_id,
            oauth_provider_id=oauth_provider_id,
            external_id=external_id,
            external_email=external_email,
            is_primary=is_primary,
        )
        self.db.add(identity)
        await self.db.commit()
        await self.db.refresh(identity)
        return identity

    async def unlink_identity(
        self, user_id: UUID, oauth_provider_id: UUID
    ) -> bool:
        """Unlink OAuth identity from user"""
        stmt = (
            select(UserIdentity)
            .where(UserIdentity.user_id == user_id)
            .where(UserIdentity.oauth_provider_id == oauth_provider_id)
        )
        result = await self.db.execute(stmt)
        identity = result.scalar_one_or_none()

        if identity:
            await self.db.delete(identity)
            await self.db.commit()
            return True
        return False

    async def update_last_login(
        self, user_id: UUID, oauth_provider_id: UUID
    ) -> Optional[UserIdentity]:
        """Update last login timestamp for OAuth identity"""
        from datetime import datetime

        stmt = (
            select(UserIdentity)
            .where(UserIdentity.user_id == user_id)
            .where(UserIdentity.oauth_provider_id == oauth_provider_id)
        )
        result = await self.db.execute(stmt)
        identity = result.scalar_one_or_none()

        if identity:
            identity.last_login_at = datetime.utcnow()
            await self.db.commit()
            await self.db.refresh(identity)
            return identity
        return None


class SSOAuditLogRepository(BaseRepository[SSOAuditLog]):
    """Repository for immutable audit logs (HIPAA, GDPR compliance)"""

    def __init__(self, db: AsyncSession):
        super().__init__(SSOAuditLog, db)

    async def log_login(
        self,
        organization_id: UUID,
        user_id: Optional[UUID],
        provider: str,
        ip_address: str,
        user_agent: str,
        status: str = "success",
    ) -> SSOAuditLog:
        """Log login event"""
        log = SSOAuditLog.create_login_event(
            organization_id=organization_id,
            user_id=user_id,
            provider=provider,
            ip_address=ip_address,
            user_agent=user_agent,
            status=status,
        )
        self.db.add(log)
        await self.db.commit()
        return log

    async def log_logout(
        self,
        organization_id: UUID,
        user_id: UUID,
        ip_address: str,
        user_agent: str,
    ) -> SSOAuditLog:
        """Log logout event"""
        log = SSOAuditLog.create_logout_event(
            organization_id=organization_id,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        self.db.add(log)
        await self.db.commit()
        return log

    async def log_permission_change(
        self,
        organization_id: UUID,
        user_id: UUID,
        changed_by_user_id: UUID,
        changes: dict,
    ) -> SSOAuditLog:
        """Log permission change event"""
        log = SSOAuditLog.create_permission_change(
            organization_id=organization_id,
            user_id=user_id,
            changed_by_user_id=changed_by_user_id,
            changes=changes,
        )
        self.db.add(log)
        await self.db.commit()
        return log

    async def get_by_organization(
        self, organization_id: UUID, limit: int = 100
    ) -> List[SSOAuditLog]:
        """Get recent audit logs for organization"""
        stmt = (
            select(AuditLog)
            .where(SSOAuditLog.organization_id == organization_id)
            .order_by(SSOAuditLog.timestamp.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_user(
        self, user_id: UUID, limit: int = 100
    ) -> List[SSOAuditLog]:
        """Get audit logs for a specific user"""
        stmt = (
            select(AuditLog)
            .where(SSOAuditLog.user_id == user_id)
            .order_by(SSOAuditLog.timestamp.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_by_action(
        self, organization_id: UUID, action: str, limit: int = 100
    ) -> List[SSOAuditLog]:
        """Get audit logs filtered by action"""
        stmt = (
            select(AuditLog)
            .where(SSOAuditLog.organization_id == organization_id)
            .where(SSOAuditLog.action == action)
            .order_by(SSOAuditLog.timestamp.desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
