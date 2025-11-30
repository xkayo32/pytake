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

@router.get(
    "/stats",
    response_model=dict,
    summary="Get organization statistics",
    description="Retrieve aggregated contact statistics for the organization including total contacts, active contacts, blocked contacts, and VIP contacts count.",
    responses={
        200: {
            "description": "Statistics retrieved successfully",
            "content": {
                "application/json": {
                    "example": {
                        "total_contacts": 1250,
                        "active_contacts": 1100,
                        "blocked_contacts": 45,
                        "vip_contacts": 78,
                        "new_this_week": 32,
                        "new_this_month": 145
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
    }
)
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


@router.get(
    "/",
    response_model=List[Contact],
    summary="List contacts",
    description="List all contacts with optional filtering by search query, assigned agent, or blocked status. Supports pagination.",
    responses={
        200: {"description": "List of contacts returned successfully"},
        401: {"description": "Not authenticated"},
    }
)
async def list_contacts(
    skip: int = Query(0, ge=0, description="Number of records to skip for pagination"),
    limit: int = Query(100, ge=1, le=100, description="Maximum number of records to return"),
    query: Optional[str] = Query(None, description="Search query (name, email, phone, company)"),
    assigned_agent_id: Optional[UUID] = Query(None, description="Filter by assigned agent UUID"),
    is_blocked: Optional[bool] = Query(None, description="Filter by blocked status"),
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


@router.post(
    "/",
    response_model=Contact,
    status_code=status.HTTP_201_CREATED,
    summary="Create contact",
    description="Create a new contact with the provided information including name, phone, email, and optional metadata.",
    responses={
        201: {"description": "Contact created successfully"},
        400: {"description": "Invalid contact data or phone number format"},
        401: {"description": "Not authenticated"},
        409: {"description": "Contact with this phone number already exists"},
    }
)
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


@router.get(
    "/{contact_id}",
    response_model=Contact,
    summary="Get contact by ID",
    description="Retrieve detailed information about a specific contact including tags, conversation history count, and metadata.",
    responses={
        200: {"description": "Contact details returned successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.get(
    "/{contact_id}/stats",
    response_model=dict,
    summary="Get contact statistics",
    description="Retrieve messaging statistics for a specific contact including total messages, response rates, and engagement metrics.",
    responses={
        200: {
            "description": "Contact statistics returned successfully",
            "content": {
                "application/json": {
                    "example": {
                        "total_conversations": 12,
                        "total_messages_sent": 156,
                        "total_messages_received": 89,
                        "avg_response_time_seconds": 45.5,
                        "last_interaction": "2024-01-15T10:30:00Z"
                    }
                }
            }
        },
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.put(
    "/{contact_id}",
    response_model=Contact,
    summary="Update contact",
    description="Update an existing contact's information. Only provided fields will be updated.",
    responses={
        200: {"description": "Contact updated successfully"},
        400: {"description": "Invalid update data"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete contact",
    description="Soft delete a contact. The contact data is preserved but marked as deleted and won't appear in listings.",
    responses={
        204: {"description": "Contact deleted successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.post(
    "/{contact_id}/block",
    response_model=Contact,
    summary="Block contact",
    description="Block a contact to prevent them from sending messages. Optionally provide a reason for blocking.",
    responses={
        200: {"description": "Contact blocked successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
async def block_contact(
    contact_id: UUID,
    reason: Optional[str] = Query(None, description="Reason for blocking the contact"),
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


@router.post(
    "/{contact_id}/unblock",
    response_model=Contact,
    summary="Unblock contact",
    description="Remove the block from a previously blocked contact, allowing them to send messages again.",
    responses={
        200: {"description": "Contact unblocked successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.post(
    "/{contact_id}/vip",
    response_model=Contact,
    summary="Mark contact as VIP",
    description="Mark a contact as VIP to prioritize their messages and enable special handling in the system.",
    responses={
        200: {"description": "Contact marked as VIP successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.delete(
    "/{contact_id}/vip",
    response_model=Contact,
    summary="Remove VIP status",
    description="Remove the VIP status from a contact, returning them to normal priority handling.",
    responses={
        200: {"description": "VIP status removed successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.put(
    "/{contact_id}/tags",
    response_model=Contact,
    summary="Replace contact tags",
    description="Replace all tags on a contact with the provided list of tag names. Tags that don't exist will be created automatically.",
    responses={
        200: {"description": "Contact tags replaced successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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


@router.post(
    "/{contact_id}/tags",
    response_model=Contact,
    summary="Add tags to contact",
    description="Add one or more tags to a contact by their UUIDs. Existing tags on the contact are preserved.",
    responses={
        200: {"description": "Tags added to contact successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact or tag not found"},
    }
)
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


@router.delete(
    "/{contact_id}/tags",
    response_model=Contact,
    summary="Remove tags from contact",
    description="Remove one or more tags from a contact by their UUIDs. Other tags on the contact are preserved.",
    responses={
        200: {"description": "Tags removed from contact successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Contact not found"},
    }
)
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

@router.get(
    "/tags/",
    response_model=List[Tag],
    summary="List all tags",
    description="Retrieve all tags available in the organization for categorizing contacts.",
    responses={
        200: {"description": "List of tags returned successfully"},
        401: {"description": "Not authenticated"},
    }
)
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


@router.post(
    "/tags/",
    response_model=Tag,
    status_code=status.HTTP_201_CREATED,
    summary="Create tag",
    description="Create a new tag for categorizing contacts. Tags can have a name and optional color.",
    responses={
        201: {"description": "Tag created successfully"},
        400: {"description": "Invalid tag data"},
        401: {"description": "Not authenticated"},
        409: {"description": "Tag with this name already exists"},
    }
)
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


@router.get(
    "/tags/{tag_id}",
    response_model=Tag,
    summary="Get tag by ID",
    description="Retrieve details about a specific tag including its name, color, and usage count.",
    responses={
        200: {"description": "Tag details returned successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Tag not found"},
    }
)
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


@router.put(
    "/tags/{tag_id}",
    response_model=Tag,
    summary="Update tag",
    description="Update an existing tag's name or color.",
    responses={
        200: {"description": "Tag updated successfully"},
        400: {"description": "Invalid update data"},
        401: {"description": "Not authenticated"},
        404: {"description": "Tag not found"},
        409: {"description": "Tag with this name already exists"},
    }
)
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


@router.delete(
    "/tags/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete tag",
    description="Delete a tag. The tag will be removed from all contacts that have it.",
    responses={
        204: {"description": "Tag deleted successfully"},
        401: {"description": "Not authenticated"},
        404: {"description": "Tag not found"},
    }
)
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
