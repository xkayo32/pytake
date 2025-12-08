"""
Queue management endpoints
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.queue import Queue, QueueBulkDelete, QueueCreate, QueueUpdate
from app.services.queue_service import QueueService

router = APIRouter()


@router.post("/", response_model=Queue, status_code=status.HTTP_201_CREATED)
async def create_queue(
    data: QueueCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new queue
    
    **Description:** Creates a new conversation queue for organizing conversations by department or priority.
    
    **Request Body:**
    - `name` (string, required): Queue name (e.g., "Support Tier 1", "High Priority")
    - `slug` (string, required): Unique URL-friendly identifier
    - `description` (string, optional): Queue description
    - `department_id` (UUID, optional): Associated department
    - `priority` (integer, optional): Queue priority for routing
    
    **Returns:** Created Queue object
    
    **Permissions Required:** org_admin role
    
    **Possible Errors:**
    - `400`: Invalid queue data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `409`: Queue slug already exists
    - `500`: Database error
    """
    # Only org_admin can create queues
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create queues",
        )

    service = QueueService(db)
    return await service.create_queue(current_user.organization_id, data)


@router.get("/", response_model=List[Queue])
async def list_queues(
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    search: Optional[str] = Query(None, description="Search in name/slug/description"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List queues
    
    **Description:** Retrieves a paginated list of queues with optional filtering by department, active status, or search term.
    
    **Query Parameters:**
    - `department_id` (UUID, optional): Filter by department
    - `is_active` (boolean, optional): Filter by active status
    - `search` (string, optional): Search in name, slug, or description
    - `skip` (int, default: 0): Offset for pagination
    - `limit` (int, default: 100, max: 100): Records per page
    
    **Returns:** Array of Queue objects
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `500`: Database error
    """
    service = QueueService(db)
    return await service.list_queues(
        organization_id=current_user.organization_id,
        department_id=department_id,
        is_active=is_active,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.get("/{queue_id}", response_model=Queue)
async def get_queue(
    queue_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get queue by ID
    
    **Description:** Retrieves full queue details including department association, metrics, and configuration.
    
    **Path Parameters:**
    - `queue_id` (UUID, required): Unique queue identifier
    
    **Returns:** Queue object
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Queue not found
    - `500`: Database error
    """
    service = QueueService(db)
    queue = await service.get_queue(queue_id, current_user.organization_id)

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue {queue_id} not found",
        )

    return queue


@router.put("/{queue_id}", response_model=Queue)
async def update_queue(
    queue_id: UUID,
    data: QueueUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update queue
    
    **Description:** Updates queue configuration including name, description, department, and active status.
    
    **Path Parameters:**
    - `queue_id` (UUID, required): Unique queue identifier
    
    **Request Body (all optional):**
    - `name` (string): New queue name
    - `slug` (string): Updated slug
    - `description` (string): Updated description
    - `department_id` (UUID): New department association
    - `is_active` (boolean): Active status
    
    **Returns:** Updated Queue object
    
    **Permissions Required:** org_admin role
    
    **Possible Errors:**
    - `400`: Invalid update data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Queue not found
    - `409`: Slug already in use
    - `500`: Database error
    """
    # Only org_admin can update queues
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update queues",
        )

    service = QueueService(db)
    queue = await service.update_queue(queue_id, current_user.organization_id, data)

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue {queue_id} not found",
        )

    return queue


@router.delete("/{queue_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_queue(
    queue_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete queue (soft delete)
    
    **Description:** Marks queue as deleted. Data is retained for audit purposes.
    
    **Path Parameters:**
    - `queue_id` (UUID, required): Unique queue identifier
    
    **Returns:** 204 No Content on success
    
    **Permissions Required:** org_admin role
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Queue not found
    - `409`: Cannot delete queue with active conversations
    - `500`: Database error
    """
    # Only org_admin can delete queues
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete queues",
        )

    service = QueueService(db)
    success = await service.delete_queue(queue_id, current_user.organization_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue {queue_id} not found",
        )


@router.post("/bulk-delete", status_code=status.HTTP_204_NO_CONTENT)
async def bulk_delete_queues(
    data: QueueBulkDelete,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Bulk delete queues

    **Permissions:** org_admin only
    """
    # Only org_admin can delete queues
    if current_user.role not in ["org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can delete queues",
        )

    service = QueueService(db)
    deleted_count = await service.bulk_delete_queues(
        data.queue_ids, current_user.organization_id
    )

    if deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No queues found to delete",
        )


@router.get("/by-slug/{slug}", response_model=Queue)
async def get_queue_by_slug(
    slug: str,
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get queue by slug"""
    service = QueueService(db)
    queue = await service.get_queue_by_slug(
        slug, current_user.organization_id, department_id
    )

    if not queue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Queue with slug '{slug}' not found",
        )

    return queue


@router.get("/{queue_id}/metrics")
async def get_queue_metrics(
    queue_id: UUID,
    days: int = Query(30, ge=1, le=90, description="Number of days for metrics"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get detailed metrics for a queue
    
    **Metrics included:**
    - Volume metrics (total, today, last 7/30 days)
    - Current status (queued, active)
    - Time metrics (wait, response, resolution times)
    - SLA compliance and violations
    - Resolution rate
    - Volume distribution by hour (last 24h)
    
    **Parameters:**
    - days: Number of days to calculate metrics (default: 30, max: 90)
    """
    service = QueueService(db)
    return await service.get_queue_metrics(
        queue_id=queue_id,
        organization_id=current_user.organization_id,
        days=days
    )
