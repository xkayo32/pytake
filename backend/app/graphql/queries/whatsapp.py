"""
WhatsApp Queries
"""

from typing import List, Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.whatsapp import WhatsAppNumberType, WhatsAppStats
from app.graphql.permissions import require_auth
from app.repositories.whatsapp import WhatsAppNumberRepository


@strawberry.type
class WhatsAppQuery:
    """WhatsApp-related queries"""

    @strawberry.field
    @require_auth
    async def whatsapp_number(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> WhatsAppNumberType:
        """Get WhatsApp number by ID"""
        context: GraphQLContext = info.context

        whatsapp_repo = WhatsAppNumberRepository(context.db)
        number = await whatsapp_repo.get_by_id(UUID(id), context.organization_id)

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
            status=number.status,
            created_at=number.created_at,
            updated_at=number.updated_at,
        )

    @strawberry.field
    @require_auth
    async def whatsapp_numbers(
        self,
        info: Info[GraphQLContext, None],
        is_active: Optional[bool] = None,
    ) -> List[WhatsAppNumberType]:
        """List WhatsApp numbers"""
        context: GraphQLContext = info.context

        whatsapp_repo = WhatsAppNumberRepository(context.db)
        numbers = await whatsapp_repo.get_by_organization(context.organization_id)

        if is_active is not None:
            numbers = [n for n in numbers if n.is_active == is_active]

        return [
            WhatsAppNumberType(
                id=strawberry.ID(str(n.id)),
                organization_id=strawberry.ID(str(n.organization_id)),
                phone_number=n.phone_number,
                display_name=n.display_name,
                is_active=n.is_active,
                status=n.status,
                created_at=n.created_at,
                updated_at=n.updated_at,
            )
            for n in numbers
        ]
