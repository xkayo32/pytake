"""
Contact Endpoints
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.contact import (
    Contact,
    ContactCreate,
    ContactUpdate,
    Tag,
    TagCreate,
    TagUpdate,
)
from app.services.contact_service import ContactService, TagService
from app.core.swagger_examples import CONTACT_EXAMPLES, ERROR_EXAMPLES
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["Contacts"])


# ============= Contacts =============

@router.get("/stats", response_model=dict)
async def get_organization_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization-wide contact statistics
    """
    service = ContactService(db)
    return await service.get_organization_stats(
        organization_id=current_user.organization_id,
    )


@router.get("/", response_model=List[Contact])
async def list_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    query: Optional[str] = Query(None, description="Search query (name, email, phone, company)"),
    assigned_agent_id: Optional[UUID] = None,
    is_blocked: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List contacts with optional filters
    """
    service = ContactService(db)
    return await service.list_contacts(
        organization_id=current_user.organization_id,
        query=query,
        assigned_agent_id=assigned_agent_id,
        is_blocked=is_blocked,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=Contact, status_code=status.HTTP_201_CREATED)
async def create_contact(
    data: ContactCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new contact
    """
    service = ContactService(db)
    return await service.create_contact(
        data=data,
        organization_id=current_user.organization_id,
    )


@router.get("/{contact_id}", response_model=Contact)
async def get_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get contact by ID
    """
    service = ContactService(db)
    return await service.get_by_id(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
    )


@router.get("/{contact_id}/stats", response_model=dict)
async def get_contact_stats(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get contact statistics
    """
    service = ContactService(db)
    return await service.get_stats(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
    )


@router.put("/{contact_id}", response_model=Contact)
async def update_contact(
    contact_id: UUID,
    data: ContactUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update contact
    """
    service = ContactService(db)
    return await service.update_contact(
        contact_id=contact_id,
        data=data,
        organization_id=current_user.organization_id,
    )


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete contact (soft delete)
    """
    service = ContactService(db)
    await service.delete_contact(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
    )
    return None


@router.post("/{contact_id}/block", response_model=Contact)
async def block_contact(
    contact_id: UUID,
    reason: Optional[str] = Query(None, description="Reason for blocking"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Block a contact
    """
    service = ContactService(db)
    return await service.block_contact(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
        reason=reason,
    )


@router.post("/{contact_id}/unblock", response_model=Contact)
async def unblock_contact(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Unblock a contact
    """
    service = ContactService(db)
    return await service.unblock_contact(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
    )


@router.post("/{contact_id}/vip", response_model=Contact)
async def mark_as_vip(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Mark a contact as VIP
    """
    service = ContactService(db)
    return await service.mark_as_vip(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
    )


@router.delete("/{contact_id}/vip", response_model=Contact)
async def unmark_as_vip(
    contact_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove VIP status from a contact
    """
    service = ContactService(db)
    return await service.unmark_as_vip(
        contact_id=contact_id,
        organization_id=current_user.organization_id,
    )


@router.put("/{contact_id}/tags", response_model=Contact)
async def update_contact_tags(
    contact_id: UUID,
    tag_names: List[str],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update contact tags (replaces all tags with the provided list)
    Accepts tag names as strings - creates tags if they don't exist
    """
    service = ContactService(db)
    tag_service = TagService(db)

    # Get or create tags
    tag_ids = []
    for tag_name in tag_names:
        # Try to find existing tag
        existing_tags = await tag_service.list_tags(organization_id=current_user.organization_id)
        existing_tag = next((t for t in existing_tags if t.name.lower() == tag_name.lower()), None)

        if existing_tag:
            tag_ids.append(existing_tag.id)
        else:
            # Create new tag
            new_tag = await tag_service.create_tag(
                data=TagCreate(name=tag_name),
                organization_id=current_user.organization_id,
            )
            tag_ids.append(new_tag.id)

    # Replace all tags
    return await service.replace_tags(
        contact_id=contact_id,
        tag_ids=tag_ids,
        organization_id=current_user.organization_id,
    )


@router.post("/{contact_id}/tags", response_model=Contact)
async def add_contact_tags(
    contact_id: UUID,
    tag_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Add tags to contact (by UUID)
    """
    service = ContactService(db)
    return await service.add_tags(
        contact_id=contact_id,
        tag_ids=tag_ids,
        organization_id=current_user.organization_id,
    )


@router.delete("/{contact_id}/tags", response_model=Contact)
async def remove_contact_tags(
    contact_id: UUID,
    tag_ids: List[UUID],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Remove tags from contact
    """
    service = ContactService(db)
    return await service.remove_tags(
        contact_id=contact_id,
        tag_ids=tag_ids,
        organization_id=current_user.organization_id,
    )


# ============= Tags =============

@router.get("/tags/", response_model=List[Tag])
async def list_tags(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all tags
    """
    service = TagService(db)
    return await service.list_tags(
        organization_id=current_user.organization_id,
    )


@router.post("/tags/", response_model=Tag, status_code=status.HTTP_201_CREATED)
async def create_tag(
    data: TagCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new tag
    """
    service = TagService(db)
    return await service.create_tag(
        data=data,
        organization_id=current_user.organization_id,
    )


@router.get("/tags/{tag_id}", response_model=Tag)
async def get_tag(
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get tag by ID
    """
    service = TagService(db)
    return await service.get_by_id(
        tag_id=tag_id,
        organization_id=current_user.organization_id,
    )


@router.put("/tags/{tag_id}", response_model=Tag)
async def update_tag(
    tag_id: UUID,
    data: TagUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update tag
    """
    service = TagService(db)
    return await service.update_tag(
        tag_id=tag_id,
        data=data,
        organization_id=current_user.organization_id,
    )


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete tag
    """
    service = TagService(db)
    await service.delete_tag(
        tag_id=tag_id,
        organization_id=current_user.organization_id,
    )
    return None
