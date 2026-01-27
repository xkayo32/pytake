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
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


# ============= Contacts =============

@router.get("/stats", response_model=dict)
async def get_organization_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization-wide contact statistics
    
    **Description:** Returns aggregated contact metrics for the entire organization
    including total contacts, active contacts, blocked contacts, and VIP count.
    
    **Returns:** Dictionary with organization contact statistics
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `500`: Database error
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
    List all contacts in organization with filtering and pagination
    
    **Description:** Retrieves a paginated list of contacts with optional filtering by search query, assigned agent, or blocked status.
    
    **Query Parameters:**
    - `skip` (int, default: 0): Offset for pagination
    - `limit` (int, default: 100, max: 100): Records per page
    - `query` (string, optional): Search contacts by name, email, phone, or company
    - `assigned_agent_id` (UUID, optional): Filter by assigned agent
    - `is_blocked` (boolean, optional): Filter by blocked status
    
    **Returns:** Array of Contact objects with pagination headers
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `500`: Database error
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
    Create a new contact in the organization
    
    **Description:** Creates a new contact with basic information.
    
    **Request Body:**
    - `phone_number` (string, required): Contact phone number
    - `name` (string, optional): Contact full name
    - `email` (string, optional): Contact email address
    - `company` (string, optional): Contact company name
    - `custom_fields` (object, optional): Additional custom data
    
    **Returns:** Created Contact object with generated ID
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `400`: Invalid contact data
    - `401`: User not authenticated
    - `409`: Contact already exists (duplicate phone/email)
    - `500`: Database error
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
    Get contact details by ID
    
    **Description:** Retrieves a single contact with all its information including tags and custom fields.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Returns:** Contact object
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
    Get contact statistics and interaction metrics
    
    **Description:** Returns detailed statistics for a specific contact including total conversations, 
    messages sent/received, last interaction, and interaction history.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Returns:** Dictionary with contact metrics
    
    **Response Example:**
    ```json
    {
      "total_conversations": 5,
      "total_messages_sent": 23,
      "total_messages_received": 18,
      "last_interaction": "2024-11-20T15:30:00Z",
      "average_response_time": "2 minutes"
    }
    ```
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
    Update contact information
    
    **Description:** Updates contact name, email, company, custom fields, or other properties.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Request Body (all optional):**
    - `phone_number` (string): Updated phone
    - `name` (string): Updated name
    - `email` (string): Updated email
    - `company` (string): Updated company
    - `custom_fields` (object): Updated custom data
    
    **Returns:** Updated Contact object
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `400`: Invalid update data
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
    Delete contact (soft delete - data is archived not removed)
    
    **Description:** Marks a contact as deleted. The data is retained in archive for compliance and audit purposes.
    Data is not physically removed from the database.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Returns:** 204 No Content on success
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
    reason: Optional[str] = Query(None, description="Optional reason for blocking this contact"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Block a contact from sending/receiving messages
    
    **Description:** Marks a contact as blocked. Blocked contacts cannot initiate conversations 
    or receive messages.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Query Parameters:**
    - `reason` (string, optional): Reason for blocking (e.g., "Spam", "Abusive behavior", "Account closed")
    
    **Returns:** Updated Contact object with is_blocked=true
    
    **Response Example:**
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone_number": "+5511999999999",
      "name": "João Silva",
      "is_blocked": true,
      "blocked_reason": "Spam"
    }
    ```
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
    
    **Description:** Removes block status from a contact. A blocked contact can now send messages and 
    receive communications again.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Returns:** Updated Contact object with is_blocked=false
    
    **Response Example:**
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone_number": "+5511999999999",
      "name": "João Silva",
      "is_blocked": false,
      "blocked_reason": null
    }
    ```
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
    Mark a contact as VIP (priority customer)
    
    **Description:** Sets VIP flag for a contact. VIP contacts receive priority support and are 
    routed to senior agents for handling.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Returns:** Updated Contact object with is_vip=true
    
    **Response Example:**
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone_number": "+5511999999999",
      "name": "João Silva",
      "is_vip": true,
      "vip_level": "premium"
    }
    ```
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
    
    **Description:** Removes VIP flag from a contact. Contact returns to normal priority routing 
    and support queue.
    
    **Path Parameters:**
    - `contact_id` (UUID, required): Unique contact identifier
    
    **Returns:** Updated Contact object with is_vip=false
    
    **Response Example:**
    ```json
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "phone_number": "+5511999999999",
      "name": "João Silva",
      "is_vip": false,
      "vip_level": null
    }
    ```
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
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
