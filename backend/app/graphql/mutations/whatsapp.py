"""
WhatsApp Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.whatsapp import WhatsAppNumberType, WhatsAppNumberCreateInput, WhatsAppNumberUpdateInput
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth, require_role
from app.repositories.whatsapp import WhatsAppNumberRepository
from app.schemas.whatsapp import WhatsAppNumberCreate, WhatsAppNumberUpdate


@strawberry.type
class WhatsAppMutation:
    """WhatsApp-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_whatsapp_number(
        self,
        info: Info[GraphQLContext, None],
        input: WhatsAppNumberCreateInput,
    ) -> WhatsAppNumberType:
        """Create new WhatsApp connection"""
        context: GraphQLContext = info.context

        whatsapp_repo = WhatsAppNumberRepository(context.db)

        number_data = WhatsAppNumberCreate(
            phone_number=input.phone_number,
            display_name=input.display_name,
            organization_id=context.organization_id,
        )

        number = await whatsapp_repo.create(number_data, context.organization_id)

        return WhatsAppNumberType(
            id=strawberry.ID(str(number.id)),
            organization_id=strawberry.ID(str(number.organization_id)),
            phone_number=number.phone_number,
            display_name=number.display_name,
            is_active=number.is_active,
            is_connected=number.is_connected,
            qr_code=number.qr_code,
            status=number.status,
            created_at=number.created_at,
            updated_at=number.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def update_whatsapp_number(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: WhatsAppNumberUpdateInput,
    ) -> WhatsAppNumberType:
        """Update WhatsApp connection"""
        context: GraphQLContext = info.context

        whatsapp_repo = WhatsAppNumberRepository(context.db)

        update_data = WhatsAppNumberUpdate(
            display_name=input.display_name,
            is_active=input.is_active,
        )

        number = await whatsapp_repo.update(UUID(id), update_data, context.organization_id)

        if not number:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WhatsApp number not found"
            )

        return WhatsAppNumberType(
            id=strawberry.ID(str(number.id)),
            organization_id=strawberry.ID(str(number.organization_id)),
            phone_number=number.phone_number,
            display_name=number.display_name,
            is_active=number.is_active,
            is_connected=number.is_connected,
            qr_code=number.qr_code,
            status=number.status,
            created_at=number.created_at,
            updated_at=number.updated_at,
        )

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_whatsapp_number(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete WhatsApp connection"""
        context: GraphQLContext = info.context

        whatsapp_repo = WhatsAppNumberRepository(context.db)
        success = await whatsapp_repo.delete(UUID(id), context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="WhatsApp number not found"
            )

        return SuccessResponse(
            success=True,
            message="WhatsApp number deleted successfully"
        )
