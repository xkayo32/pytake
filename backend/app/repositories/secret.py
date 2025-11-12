"""
Secret Repository - Data access layer for secrets
"""

from typing import List, Optional
from uuid import UUID
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.base import BaseRepository
from app.models.secret import Secret, SecretScope


class SecretRepository(BaseRepository[Secret]):
    """
    Repository for Secret model.

    Provides data access methods for managing encrypted secrets.
    """

    async def get_by_name(
        self,
        organization_id: UUID,
        name: str,
        chatbot_id: Optional[UUID] = None
    ) -> Optional[Secret]:
        """
        Get secret by name within organization scope.

        Args:
            organization_id: Organization UUID
            name: Secret name (snake_case identifier)
            chatbot_id: Optional chatbot UUID (for chatbot-scoped secrets)

        Returns:
            Secret if found, None otherwise
        """
        query = select(Secret).where(
            Secret.organization_id == organization_id,
            Secret.name == name,
            Secret.is_active == True
        )

        if chatbot_id:
            query = query.where(Secret.chatbot_id == chatbot_id)
        else:
            query = query.where(Secret.chatbot_id.is_(None))

        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def list_available(
        self,
        organization_id: UUID,
        chatbot_id: Optional[UUID] = None,
        scope: Optional[SecretScope] = None,
        is_active: bool = True
    ) -> List[Secret]:
        """
        List secrets available for a specific context.

        Returns:
        - Organization-scoped secrets (available everywhere)
        - Chatbot-scoped secrets for the specific chatbot (if chatbot_id provided)

        Args:
            organization_id: Organization UUID
            chatbot_id: Optional chatbot UUID
            scope: Optional scope filter
            is_active: Filter by active status

        Returns:
            List of available secrets
        """
        query = select(Secret).where(
            Secret.organization_id == organization_id,
            Secret.is_active == is_active
        )

        # Build scope filter
        if chatbot_id:
            # Include org-wide secrets AND chatbot-specific secrets
            scope_filters = [
                Secret.scope == SecretScope.ORGANIZATION,
                or_(
                    Secret.scope == SecretScope.CHATBOT,
                    Secret.chatbot_id == chatbot_id
                )
            ]
            query = query.where(or_(*scope_filters))
        else:
            # Only org-wide secrets
            query = query.where(Secret.scope == SecretScope.ORGANIZATION)

        # Apply explicit scope filter if provided
        if scope:
            query = query.where(Secret.scope == scope)

        # Order by display name
        query = query.order_by(Secret.display_name)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def list_by_chatbot(
        self,
        chatbot_id: UUID,
        is_active: bool = True
    ) -> List[Secret]:
        """
        List secrets specific to a chatbot.

        Args:
            chatbot_id: Chatbot UUID
            is_active: Filter by active status

        Returns:
            List of chatbot-specific secrets
        """
        query = select(Secret).where(
            Secret.chatbot_id == chatbot_id,
            Secret.is_active == is_active
        ).order_by(Secret.display_name)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def deactivate(self, secret_id: UUID) -> bool:
        """
        Soft deactivate a secret (set is_active = False).

        Args:
            secret_id: Secret UUID

        Returns:
            True if deactivated, False if not found
        """
        secret = await self.get(secret_id)
        if not secret:
            return False

        secret.is_active = False
        await self.db.commit()
        await self.db.refresh(secret)
        return True

    async def increment_usage(self, secret_id: UUID) -> None:
        """
        Increment usage counter and update last_used_at timestamp.

        Args:
            secret_id: Secret UUID
        """
        secret = await self.get(secret_id)
        if secret:
            secret.increment_usage()
            await self.db.commit()

    async def exists_with_name(
        self,
        organization_id: UUID,
        name: str,
        chatbot_id: Optional[UUID] = None,
        exclude_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if a secret with the given name already exists.

        Useful for validation before creating/updating secrets.

        Args:
            organization_id: Organization UUID
            name: Secret name
            chatbot_id: Optional chatbot UUID
            exclude_id: Exclude this secret ID (for update operations)

        Returns:
            True if exists, False otherwise
        """
        query = select(Secret).where(
            Secret.organization_id == organization_id,
            Secret.name == name
        )

        if chatbot_id:
            query = query.where(Secret.chatbot_id == chatbot_id)
        else:
            query = query.where(Secret.chatbot_id.is_(None))

        if exclude_id:
            query = query.where(Secret.id != exclude_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
