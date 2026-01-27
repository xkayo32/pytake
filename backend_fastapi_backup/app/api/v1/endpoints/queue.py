"""
Queue Endpoints
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.conversation import Conversation
from app.services.conversation_service import ConversationService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=List[Conversation])
async def get_queue(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    queue_id: Optional[UUID] = Query(None, description="Filter by queue"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get conversations in queue

    Returns list of conversations waiting to be assigned to an agent,
    ordered by priority (high to low) and time in queue (oldest first).

    **Filters:**
    - department_id: Filter by department
    - queue_id: Filter by specific queue
    """
    service = ConversationService(db)
    return await service.get_queue(
        organization_id=current_user.organization_id,
        department_id=department_id,
        queue_id=queue_id,
        skip=skip,
        limit=limit,
    )


@router.post("/pull", response_model=Conversation)
async def pull_from_queue(
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    queue_id: Optional[UUID] = Query(None, description="Filter by queue"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Pull next conversation from queue

    Retrieves the next conversation from the queue based on priority
    and time waiting, then assigns it to the current agent.

    **Filters:**
    - department_id: Pull from specific department
    - queue_id: Pull from specific queue

    Returns the assigned conversation or 404 if queue is empty.
    """
    # Verify user is an agent
    if current_user.role not in ["agent", "org_admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only agents can pull from queue",
        )

    service = ConversationService(db)
    conversation = await service.pull_from_queue(
        organization_id=current_user.organization_id,
        agent_id=current_user.id,
        department_id=department_id,
        queue_id=queue_id,
    )

    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No conversations in queue",
        )

    return conversation
