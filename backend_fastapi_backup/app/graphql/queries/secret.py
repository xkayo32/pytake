"""
Secret Queries
"""

from typing import List, Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.permissions import require_auth, require_role
from app.graphql.types.secret import SecretType, SecretWithValueType, SecretScopeEnum
from app.repositories.secret import SecretRepository
from app.models.secret import SecretScope


@strawberry.type
class SecretQuery:
    """Secret-related queries"""

    @strawberry.field
    @require_auth
    async def secret(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SecretType:
        """Get secret by ID (without decrypted value)"""
        context: GraphQLContext = info.context

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

        # Convert enum
        scope = SecretScopeEnum.ORGANIZATION if secret.scope.value == "organization" else SecretScopeEnum.CHATBOT

        from app.graphql.types.secret import EncryptionProviderEnum
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

    @strawberry.field
    @require_auth
    async def secrets(
        self,
        info: Info[GraphQLContext, None],
        chatbot_id: Optional[strawberry.ID] = None,
        scope: Optional[SecretScopeEnum] = None,
        is_active: bool = True,
    ) -> List[SecretType]:
        """List secrets (without decrypted values)"""
        context: GraphQLContext = info.context

        repo = SecretRepository(context.db)

        # Convert scope enum
        scope_filter = None
        if scope:
            scope_filter = SecretScope.ORGANIZATION if scope == SecretScopeEnum.ORGANIZATION else SecretScope.CHATBOT

        chatbot_uuid = UUID(chatbot_id) if chatbot_id else None

        secrets = await repo.list_available(
            organization_id=context.organization_id,
            chatbot_id=chatbot_uuid,
            scope=scope_filter,
            is_active=is_active,
        )

        from app.graphql.types.secret import EncryptionProviderEnum

        result = []
        for s in secrets:
            scope_enum = SecretScopeEnum.ORGANIZATION if s.scope.value == "organization" else SecretScopeEnum.CHATBOT

            encryption_provider = EncryptionProviderEnum.FERNET
            if s.encryption_provider.value == "aws_kms":
                encryption_provider = EncryptionProviderEnum.AWS_KMS
            elif s.encryption_provider.value == "vault":
                encryption_provider = EncryptionProviderEnum.VAULT

            result.append(
                SecretType(
                    id=strawberry.ID(str(s.id)),
                    organization_id=strawberry.ID(str(s.organization_id)),
                    chatbot_id=strawberry.ID(str(s.chatbot_id)) if s.chatbot_id else None,
                    name=s.name,
                    display_name=s.display_name,
                    description=s.description,
                    scope=scope_enum,
                    encryption_provider=encryption_provider,
                    encryption_key_id=s.encryption_key_id,
                    encryption_metadata=s.encryption_metadata,
                    is_active=s.is_active,
                    secret_metadata=s.secret_metadata,
                    last_used_at=s.last_used_at,
                    usage_count=s.usage_count,
                    created_at=s.created_at,
                    updated_at=s.updated_at,
                )
            )

        return result

    @strawberry.field
    @require_role("org_admin")
    async def secret_with_value(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SecretWithValueType:
        """
        Get secret with decrypted value

        WARNING: Returns plaintext secret value
        Only accessible to org_admin
        """
        context: GraphQLContext = info.context

        # Import service
        from app.services.secret_service import SecretService

        service = SecretService(context.db)
        secret = await service.get_secret_with_value(UUID(id), context.organization_id)

        if not secret:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )

        # Convert enum
        scope = SecretScopeEnum.ORGANIZATION if secret["scope"] == "organization" else SecretScopeEnum.CHATBOT

        return SecretWithValueType(
            id=strawberry.ID(str(secret["id"])),
            organization_id=strawberry.ID(str(secret["organization_id"])),
            chatbot_id=strawberry.ID(str(secret["chatbot_id"])) if secret.get("chatbot_id") else None,
            name=secret["name"],
            display_name=secret["display_name"],
            description=secret.get("description"),
            scope=scope,
            value=secret["value"],  # Decrypted value
            is_active=secret["is_active"],
            created_at=secret["created_at"],
        )
