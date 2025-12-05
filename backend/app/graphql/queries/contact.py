"""
Contact Queries
"""

from typing import Optional
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.contact import ContactType, ContactListResponse, ContactFilterInput
from app.graphql.permissions import require_auth
from app.repositories.contact import ContactRepository


@strawberry.type
class ContactQuery:
    """Contact-related queries"""

    @strawberry.field
    @require_auth
    async def contact(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> ContactType:
        """Get contact by ID"""
        context: GraphQLContext = info.context

        contact_repo = ContactRepository(context.db)
        contact = await contact_repo.get_by_id(UUID(id), context.organization_id)

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

    @strawberry.field
    @require_auth
    async def contacts(
        self,
        info: Info[GraphQLContext, None],
        skip: int = 0,
        limit: int = 10,
        filter: Optional[ContactFilterInput] = None,
    ) -> ContactListResponse:
        """List contacts with pagination and filters"""
        context: GraphQLContext = info.context

        contact_repo = ContactRepository(context.db)
        contacts = await contact_repo.get_by_organization(context.organization_id)

        # Apply filters
        if filter:
            if filter.query:
                query_lower = filter.query.lower()
                contacts = [
                    c for c in contacts
                    if (c.name and query_lower in c.name.lower())
                    or query_lower in c.phone
                    or (c.email and query_lower in c.email.lower())
                ]

            if filter.is_blocked is not None:
                contacts = [c for c in contacts if c.is_blocked == filter.is_blocked]

        total = len(contacts)
        contacts = contacts[skip : skip + limit]

        contact_types = [
            ContactType(
                id=strawberry.ID(str(c.id)),
                organization_id=strawberry.ID(str(c.organization_id)),
                phone=c.phone,
                name=c.name,
                email=c.email,
                avatar_url=c.avatar_url,
                is_blocked=c.is_blocked,
                last_contact_at=c.last_contact_at,
                created_at=c.created_at,
                updated_at=c.updated_at,
            )
            for c in contacts
        ]

        return ContactListResponse(
            contacts=contact_types,
            total=total,
            skip=skip,
            limit=limit,
        )
