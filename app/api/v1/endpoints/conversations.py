"""
Conversation Endpoints
"""

from typing import List, Optional
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.conversation import (
    Conversation,
    ConversationAssign,
    ConversationClose,
    ConversationCreate,
    ConversationTransfer,
    ConversationUpdate,
    Message,
    MessageCreate,
)
from app.schemas.message import MessageSendRequest, MessageResponse
from app.schemas.sla import SlaAlert
from app.services.conversation_service import ConversationService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=List[Conversation])
async def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = Query(None, regex="^(open|pending|resolved|closed)$"),
    assigned_to_me: bool = False,
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    queue_id: Optional[UUID] = Query(None, description="Filter by queue"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List conversations
    
    **Filters:**
    - status: Filter by status (open, pending, resolved, closed)
    - assigned_to_me: Show only conversations assigned to current user
    - department_id: Filter by department
    - queue_id: Filter by specific queue
    """
    service = ConversationService(db)

    assigned_agent_id = current_user.id if assigned_to_me else None

    return await service.list_conversations(
        organization_id=current_user.organization_id,
        status=status,
        assigned_agent_id=assigned_agent_id,
        assigned_department_id=department_id,
        queue_id=queue_id,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create new conversation"""
    service = ConversationService(db)
    return await service.create_conversation(
        data=data,
        organization_id=current_user.organization_id,
        user_id=current_user.id,
    )


# Move metrics endpoint above dynamic conversation_id routes so the static path
# '/metrics' is matched before '/{conversation_id}' (avoids 'metrics' being
# interpreted as a UUID path parameter and causing 422 validation errors).
@router.get('/metrics')
async def get_conversations_metrics(
    # Accept as strings here and coerce to UUID internally to avoid automatic 422 when
    # frontend sends empty string or literal 'undefined'. We parse safely and treat
    # invalid values as None.
    department_id: Optional[str] = Query(None, description='Filter by department'),
    queue_id: Optional[str] = Query(None, description='Filter by queue'),
    since: Optional[str] = Query(None, description='ISO datetime to filter recent conversations'),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated conversation metrics for admin dashboards (tolerant parser)"""
    from dateutil import parser

    service = ConversationService(db)

    # Log raw incoming values for debugging (development only)
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[metrics] raw params - department_id={department_id!r}, queue_id={queue_id!r}, since={since!r}")

    # Parse since param if provided
    since_dt = None
    if since:
        try:
            since_dt = parser.isoparse(since)
        except Exception:
            since_dt = None

    # Safely coerce department_id and queue_id to UUID or None using utility
    from app.utils.params import parse_optional_uuid

    dep_uuid = parse_optional_uuid(department_id)
    q_uuid = parse_optional_uuid(queue_id)

    return await service.get_metrics(
        organization_id=current_user.organization_id,
        department_id=dep_uuid,
        queue_id=q_uuid,
        since=since_dt,
    )


@router.get("/{conversation_id}", response_model=Conversation)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get conversation by ID"""
    service = ConversationService(db)
    return await service.get_by_id(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
    )


@router.put("/{conversation_id}", response_model=Conversation)
async def update_conversation(
    conversation_id: UUID,
    data: ConversationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Update conversation"""
    service = ConversationService(db)
    return await service.update_conversation(
        conversation_id=conversation_id,
        data=data,
        organization_id=current_user.organization_id,
    )


@router.get("/{conversation_id}/messages", response_model=List[MessageResponse])
async def get_conversation_messages(
    conversation_id: UUID,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get messages for a conversation"""
    service = ConversationService(db)
    return await service.get_messages(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
    )


@router.post("/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: UUID,
    data: MessageSendRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Send a message via WhatsApp

    Validates 24-hour window and sends via Meta Cloud API
    """
    from app.services.whatsapp_service import WhatsAppService

    service = WhatsAppService(db)
    message = await service.send_message(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
        message_type=data.message_type,
        content=data.content,
        sender_user_id=current_user.id,
    )

    return message


@router.post("/{conversation_id}/read", response_model=Conversation)
async def mark_conversation_as_read(
    conversation_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark conversation as read"""
    service = ConversationService(db)
    return await service.mark_as_read(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
    )


# ============================================
# ACTION ENDPOINTS
# ============================================


@router.post("/{conversation_id}/assign", response_model=Conversation)
async def assign_conversation(
    conversation_id: UUID,
    data: ConversationAssign,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign conversation to a specific agent

    Changes status to 'active' and assigns the specified agent.
    If conversation was queued, removes from queue.
    """
    service = ConversationService(db)
    return await service.assign_to_agent(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
        agent_id=data.agent_id,
    )


@router.post("/{conversation_id}/transfer", response_model=Conversation)
async def transfer_conversation(
    conversation_id: UUID,
    data: ConversationTransfer,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Transfer conversation to a department

    Unassigns current agent, changes status to 'queued',
    and sets the new department. Stores transfer history.
    """
    service = ConversationService(db)
    return await service.transfer_to_department(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
        department_id=data.department_id,
        note=data.note,
    )


@router.post("/{conversation_id}/close", response_model=Conversation)
async def close_conversation(
    conversation_id: UUID,
    data: ConversationClose,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Close a conversation

    Sets status to 'closed', records close timestamp and reason.
    Can optionally mark as resolved.
    """
    service = ConversationService(db)
    return await service.close_conversation(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
        reason=data.reason,
        resolved=data.resolved,
    )

# ============================================
# SLA ALERTS
# ============================================

@router.get("/sla-alerts", response_model=List[SlaAlert])
async def get_sla_alerts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    department_id: Optional[UUID] = Query(None, description="Filter by department"),
    queue_id: Optional[UUID] = Query(None, description="Filter by queue"),
    nearing_threshold: float = Query(0.8, ge=0.1, le=1.0, description="Threshold for 'warning' progress"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List conversations that are nearing or exceeding SLA.

    - severity 'critical': progress >= 1.0 (over SLA)
    - severity 'warning': progress >= nearing_threshold
    """
    service = ConversationService(db)
    return await service.get_sla_alerts(
        organization_id=current_user.organization_id,
        department_id=department_id,
        queue_id=queue_id,
        nearing_threshold=nearing_threshold,
        skip=skip,
        limit=limit,
    )


@router.get('/metrics')
async def get_conversations_metrics(
    # Accept as strings here and coerce to UUID internally to avoid automatic 422 when
    # frontend sends empty string or literal 'undefined'. We parse safely and treat
    # invalid values as None.
    department_id: Optional[str] = Query(None, description='Filter by department'),
    queue_id: Optional[str] = Query(None, description='Filter by queue'),
    since: Optional[str] = Query(None, description='ISO datetime to filter recent conversations'),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return aggregated conversation metrics for admin dashboards (tolerant parser)"""
    from dateutil import parser

    service = ConversationService(db)

    # Log raw incoming values for debugging (development only)
    import logging
    logger = logging.getLogger(__name__)
    logger.info(f"[metrics] raw params - department_id={department_id!r}, queue_id={queue_id!r}, since={since!r}")
    # Ensure immediate stdout for dev debugging (some environments filter logger level)
    print(f"[metrics-DEBUG] raw params - department_id={department_id!r}, queue_id={queue_id!r}, since={since!r}")

    # Parse since param if provided
    since_dt = None
    if since:
        try:
            since_dt = parser.isoparse(since)
        except Exception:
            since_dt = None

    # Safely coerce department_id and queue_id to UUID or None using utility
    from app.utils.params import parse_optional_uuid

    dep_uuid = parse_optional_uuid(department_id)
    q_uuid = parse_optional_uuid(queue_id)

    return await service.get_metrics(
        organization_id=current_user.organization_id,
        department_id=dep_uuid,
        queue_id=q_uuid,
        since=since_dt,
    )


# (temporary debug endpoint removed)
