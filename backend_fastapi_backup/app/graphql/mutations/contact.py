"""
Contact Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.contact import ContactType, ContactCreateInput, ContactUpdateInput
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth
from app.repositories.contact import ContactRepository
from app.schemas.contact import ContactCreate, ContactUpdate


@strawberry.type
class ContactMutation:
    """Contact-related mutations"""

    @strawberry.mutation
    @require_auth
    async def create_contact(
        self,
        info: Info[GraphQLContext, None],
        input: ContactCreateInput,
    ) -> ContactType:
        """Create new contact"""
        context: GraphQLContext = info.context

        contact_repo = ContactRepository(context.db)

        contact_data = ContactCreate(
            phone=input.phone,
            name=input.name,
            email=input.email,
            avatar_url=input.avatar_url,
            organization_id=context.organization_id,
        )

        contact = await contact_repo.create(contact_data, context.organization_id)

        return ContactType(
            id=strawberry.ID(str(contact.id)),
            organization_id=strawberry.ID(str(contact.organization_id)),
            phone=contact.phone,
            name=contact.name,
            email=contact.email,
            avatar_url=contact.avatar_url,
            is_blocked=contact.is_blocked,
            last_contact_at=contact.last_contact_at,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
        )

    @strawberry.mutation
    @require_auth
    async def update_contact(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: ContactUpdateInput,
    ) -> ContactType:
        """Update contact"""
        context: GraphQLContext = info.context

        contact_repo = ContactRepository(context.db)

        update_data = ContactUpdate(
            name=input.name,
            email=input.email,
            avatar_url=input.avatar_url,
            is_blocked=input.is_blocked,
        )

        contact = await contact_repo.update(UUID(id), update_data, context.organization_id)

        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )

        return ContactType(
            id=strawberry.ID(str(contact.id)),
            organization_id=strawberry.ID(str(contact.organization_id)),
            phone=contact.phone,
            name=contact.name,
            email=contact.email,
            avatar_url=contact.avatar_url,
            is_blocked=contact.is_blocked,
            last_contact_at=contact.last_contact_at,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
        )

    @strawberry.mutation
    @require_auth
    async def block_contact(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> ContactType:
        """Block contact"""
        context: GraphQLContext = info.context

        contact_repo = ContactRepository(context.db)
        contact = await contact_repo.get_by_id(UUID(id), context.organization_id)

        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )

        contact.is_blocked = True
        await context.db.commit()
        await context.db.refresh(contact)

        return ContactType(
            id=strawberry.ID(str(contact.id)),
            organization_id=strawberry.ID(str(contact.organization_id)),
            phone=contact.phone,
            name=contact.name,
            email=contact.email,
            avatar_url=contact.avatar_url,
            is_blocked=contact.is_blocked,
            last_contact_at=contact.last_contact_at,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
        )

    @strawberry.mutation
    @require_auth
    async def unblock_contact(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> ContactType:
        """Unblock contact"""
        context: GraphQLContext = info.context

        contact_repo = ContactRepository(context.db)
        contact = await contact_repo.get_by_id(UUID(id), context.organization_id)

        if not contact:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )

        contact.is_blocked = False
        await context.db.commit()
        await context.db.refresh(contact)

        return ContactType(
            id=strawberry.ID(str(contact.id)),
            organization_id=strawberry.ID(str(contact.organization_id)),
            phone=contact.phone,
            name=contact.name,
            email=contact.email,
            avatar_url=contact.avatar_url,
            is_blocked=contact.is_blocked,
            last_contact_at=contact.last_contact_at,
            created_at=contact.created_at,
            updated_at=contact.updated_at,
        )

    @strawberry.mutation
    @require_auth
    async def delete_contact(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete contact (soft delete)"""
        context: GraphQLContext = info.context

        contact_repo = ContactRepository(context.db)
        success = await contact_repo.delete(UUID(id), context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )

        return SuccessResponse(
            success=True,
            message="Contact deleted successfully"
        )
