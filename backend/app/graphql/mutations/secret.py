"""
Secret Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth, require_role
from app.graphql.types.secret import (
    SecretType,
    SecretCreateInput,
    SecretUpdateInput,
    SecretScopeEnum,
    EncryptionProviderEnum,
)
from app.graphql.types.common import SuccessResponse
from app.schemas.secret import SecretCreate, SecretUpdate
from app.models.secret import SecretScope, EncryptionProvider


@strawberry.type
class SecretMutation:
    """Secret-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_secret(
        self,
        info: Info[GraphQLContext, None],
        input: SecretCreateInput,
    ) -> SecretType:
        """Create new secret"""
        context: GraphQLContext = info.context

        # Import service
        from app.services.secret_service import SecretService

        service = SecretService(context.db)

        # Convert enums
        scope = SecretScope.ORGANIZATION if input.scope == SecretScopeEnum.ORGANIZATION else SecretScope.CHATBOT

        encryption_provider = EncryptionProvider.FERNET
        if input.encryption_provider == EncryptionProviderEnum.AWS_KMS:
            encryption_provider = EncryptionProvider.AWS_KMS
        elif input.encryption_provider == EncryptionProviderEnum.VAULT:
            encryption_provider = EncryptionProvider.VAULT

        # Create secret data
        secret_data = SecretCreate(
            name=input.name,
            display_name=input.display_name,
            description=input.description,
            value=input.value,
            scope=scope,
            chatbot_id=UUID(input.chatbot_id) if input.chatbot_id else None,
            encryption_provider=encryption_provider,
            encryption_key_id=input.encryption_key_id,
            secret_metadata=input.secret_metadata,
        )

        secret = await service.create_secret(secret_data, context.organization_id)

        # Convert enum for response
        scope_enum = SecretScopeEnum.ORGANIZATION if secret.scope.value == "organization" else SecretScopeEnum.CHATBOT

        encryption_provider_enum = EncryptionProviderEnum.FERNET
        if secret.encryption_provider.value == "aws_kms":
            encryption_provider_enum = EncryptionProviderEnum.AWS_KMS
        elif secret.encryption_provider.value == "vault":
            encryption_provider_enum = EncryptionProviderEnum.VAULT

        return SecretType(
            id=strawberry.ID(str(secret.id)),
            organization_id=strawberry.ID(str(secret.organization_id)),
            chatbot_id=strawberry.ID(str(secret.chatbot_id)) if secret.chatbot_id else None,
            name=secret.name,
            display_name=secret.display_name,
            description=secret.description,
            scope=scope_enum,
            encryption_provider=encryption_provider_enum,
            encryption_key_id=secret.encryption_key_id,
            encryption_metadata=secret.encryption_metadata,
            is_active=secret.is_active,
            secret_metadata=secret.secret_metadata,
            last_used_at=secret.last_used_at,
            usage_count=secret.usage_count,
            created_at=secret.created_at,
            updated_at=secret.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def update_secret(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: SecretUpdateInput,
    ) -> SecretType:
        """Update secret"""
        context: GraphQLContext = info.context

        # Import service
        from app.services.secret_service import SecretService

        service = SecretService(context.db)

        # Create update data
        update_data = SecretUpdate(
            display_name=input.display_name,
            description=input.description,
            value=input.value,
            is_active=input.is_active,
            secret_metadata=input.secret_metadata,
        )

        secret = await service.update_secret(UUID(id), context.organization_id, update_data)

        if not secret:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )

        # Convert enum
        scope = SecretScopeEnum.ORGANIZATION if secret.scope.value == "organization" else SecretScopeEnum.CHATBOT

        encryption_provider = EncryptionProviderEnum.FERNET
        if secret.encryption_provider.value == "aws_kms":
            encryption_provider = EncryptionProviderEnum.AWS_KMS
        elif secret.encryption_provider.value == "vault":
            encryption_provider = EncryptionProviderEnum.VAULT

        return SecretType(
            id=strawberry.ID(str(secret.id)),
            organization_id=strawberry.ID(str(secret.organization_id)),
            chatbot_id=strawberry.ID(str(secret.chatbot_id)) if secret.chatbot_id else None,
            name=secret.name,
            display_name=secret.display_name,
            description=secret.description,
            scope=scope,
            encryption_provider=encryption_provider,
            encryption_key_id=secret.encryption_key_id,
            encryption_metadata=secret.encryption_metadata,
            is_active=secret.is_active,
            secret_metadata=secret.secret_metadata,
            last_used_at=secret.last_used_at,
            usage_count=secret.usage_count,
            created_at=secret.created_at,
            updated_at=secret.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_secret(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete secret"""
        context: GraphQLContext = info.context

        from app.repositories.secret import SecretRepository

        repo = SecretRepository(context.db)
        secret = await repo.get(UUID(id))

        if not secret:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )

        # Verify organization access
        if secret.organization_id != context.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        success = await repo.delete(UUID(id))

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )

        return SuccessResponse(success=True, message="Secret deleted successfully")

    @strawberry.mutation
    @require_role("org_admin")
    async def deactivate_secret(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SecretType:
        """Deactivate secret"""
        context: GraphQLContext = info.context

        from app.repositories.secret import SecretRepository

        repo = SecretRepository(context.db)
        secret = await repo.get(UUID(id))

        if not secret:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )

        # Verify organization access
        if secret.organization_id != context.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied",
            )

        success = await repo.deactivate(UUID(id))

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )

        # Refresh secret
        secret = await repo.get(UUID(id))

        # Convert enum
        scope = SecretScopeEnum.ORGANIZATION if secret.scope.value == "organization" else SecretScopeEnum.CHATBOT

        encryption_provider = EncryptionProviderEnum.FERNET
        if secret.encryption_provider.value == "aws_kms":
            encryption_provider = EncryptionProviderEnum.AWS_KMS
        elif secret.encryption_provider.value == "vault":
            encryption_provider = EncryptionProviderEnum.VAULT

        return SecretType(
            id=strawberry.ID(str(secret.id)),
            organization_id=strawberry.ID(str(secret.organization_id)),
            chatbot_id=strawberry.ID(str(secret.chatbot_id)) if secret.chatbot_id else None,
            name=secret.name,
            display_name=secret.display_name,
            description=secret.description,
            scope=scope,
            encryption_provider=encryption_provider,
            encryption_key_id=secret.encryption_key_id,
            encryption_metadata=secret.encryption_metadata,
            is_active=secret.is_active,
            secret_metadata=secret.secret_metadata,
            last_used_at=secret.last_used_at,
            usage_count=secret.usage_count,
            created_at=secret.created_at,
            updated_at=secret.updated_at,
        )
