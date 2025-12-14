"""
Conversation Endpoints
"""

from typing import List, Optional
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user, get_db, require_permission_dynamic
from app.models.user import User
from app.schemas.conversation import (
    Conversation,
    ConversationAssign,
    ConversationClose,
    ConversationCreate,
    ConversationTransfer,
    ConversationTransferToAgent,
    ConversationUpdate,
    Message,
    MessageCreate,
)
from app.schemas.message import MessageSendRequest, MessageResponse
from app.schemas.sla import SlaAlert
from app.schemas.user import AgentAvailable
from app.services.conversation_service import ConversationService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=List[Conversation])
async def list_conversations(
    active_chatbot_id: Optional[UUID] = Query(None, description="Filtrar por ID do chatbot ativo"),
    skip: int = Query(0, ge=0, description="Número de registros para pular (paginação)"),
    limit: int = Query(100, ge=1, le=100, description="Quantidade máxima de registros retornados"),
    status: Optional[str] = Query(
        None, 
        regex="^(open|pending|resolved|closed)$",
        description="Filtrar por status: 'open', 'pending', 'resolved' ou 'closed'"
    ),
    assigned_to_me: bool = Query(
        False,
        description="Se true, retorna apenas conversas atribuídas ao usuário atual"
    ),
    department_id: Optional[UUID] = Query(None, description="Filtrar por ID do departamento"),
    queue_id: Optional[UUID] = Query(None, description="Filtrar por ID da fila"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all conversations with filtering and pagination
    
    **Query Parameters:**
    - `active_chatbot_id` (UUID, opcional): Filtrar por chatbot ativo
    - `skip` (int, default: 0): Offset para paginação
    - `limit` (int, default: 100, max: 100): Número de registros por página
    - `status` (string, opcional): Filtrar por status (open|pending|resolved|closed)
    - `assigned_to_me` (boolean, default: false): Mostrar apenas minhas conversas
    - `department_id` (UUID, opcional): Filtrar por departamento
    - `queue_id` (UUID, opcional): Filtrar por fila
    
    **Returns:** Array de conversas com paginação
    
    **Example Response:**
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "contact_id": "650e8400-e29b-41d4-a716-446655440001",
        "status": "open",
        "assigned_agent_id": "750e8400-e29b-41d4-a716-446655440002",
        "created_at": "2025-12-08T10:00:00Z",
        "updated_at": "2025-12-08T21:00:00Z"
      }
    ]
    ```
    
    **Headers:**
    - `X-Total-Count`: Total de registros
    - `X-Page`: Página atual
    - `X-Per-Page`: Registros por página
    """
    service = ConversationService(db)

    assigned_agent_id = current_user.id if assigned_to_me else None

    return await service.list_conversations(
        organization_id=current_user.organization_id,
        chatbot_id=active_chatbot_id,
        status=status,
        assigned_agent_id=assigned_agent_id,
        assigned_department_id=department_id,
        queue_id=queue_id,
        skip=skip,
        limit=limit,
    )


@router.get("/available-agents", response_model=List[AgentAvailable])
async def list_available_agents(
    department_id: UUID = Query(..., description="Department ID to list agents from"),
    current_user: User = Depends(require_permission_dynamic("view_agents")),
    db: AsyncSession = Depends(get_db),
):
    """
    List available agents in a department with remaining capacity

    **Query Parameters:**
    - `department_id` (UUID, required): ID do departamento

    **Returns:** Array of available agents with capacity information

    **Example Response:**
    ```json
    [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "full_name": "João Agent",
        "email": "joao@example.com",
        "department_id": "650e8400-e29b-41d4-a716-446655440001",
        "agent_status": "available",
        "active_conversations_count": 5,
        "capacity_remaining": 5
      }
    ]
    ```

    **Responses:**
    - `200`: Lista de agentes disponíveis
    - `403`: Sem permissão para visualizar agentes
    - `404`: Departamento não encontrado
    """
    service = ConversationService(db)
    agents = await service.list_available_agents(
        organization_id=current_user.organization_id,
        department_id=department_id,
    )
    return agents


@router.post("/", response_model=Conversation, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    data: ConversationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new conversation
    
    **Description:** Initiates a new conversation with a contact. Can be created from incoming WhatsApp messages or manually for outbound communication.
    
    **Request Body:**
    - `contact_id` (UUID, required): Target contact identifier
    - `initial_message` (string, optional): First message to send
    - `department_id` (UUID, optional): Assign to specific department
    - `queue_id` (UUID, optional): Assign to specific queue
    
    **Returns:** Created Conversation object with status 'open'
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `400`: Invalid conversation data
    - `401`: User not authenticated
    - `404`: Contact not found
    - `500`: Database error
    """
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
    """
    Get conversation by ID
    
    **Description:** Retrieves complete conversation details including messages, history, and current status.
    
    **Path Parameters:**
    - `conversation_id` (UUID, required): Unique conversation identifier
    
    **Returns:** Conversation object with full details
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Conversation not found
    - `500`: Database error
    """
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
    """
    Update conversation
    
    **Description:** Updates conversation metadata and notes without changing status or assignment.
    
    **Path Parameters:**
    - `conversation_id` (UUID, required): Unique conversation identifier
    
    **Request Body (all optional):**
    - `notes` (string): Internal notes about conversation
    - `tags` (array): Tags for organizing conversations
    
    **Returns:** Updated Conversation object
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `400`: Invalid update data
    - `401`: User not authenticated
    - `404`: Conversation not found
    - `500`: Database error
    """
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
    current_user: User = Depends(require_permission_dynamic("assign_conversation")),
    db: AsyncSession = Depends(get_db),
):
    """
    Assign conversation to a specific agent
    
    **Description:** Assigns an unassigned conversation to an agent and changes status to 'active'. If conversation was queued, removes from queue.
    
    **Path Parameters:**
    - `conversation_id` (UUID, required): Unique conversation identifier
    
    **Request Body:**
    - `agent_id` (UUID, required): Target agent identifier
    
    **Returns:** Updated Conversation with new assignment
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `400`: Invalid agent ID
    - `401`: User not authenticated
    - `404`: Conversation or agent not found
    - `409`: Conversation already assigned
    - `500`: Database error
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
    current_user: User = Depends(require_permission_dynamic("assign_conversation")),
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


@router.post("/{conversation_id}/transfer-to-agent", response_model=Conversation)
async def transfer_to_agent(
    conversation_id: UUID,
    data: ConversationTransferToAgent,
    current_user: User = Depends(require_permission_dynamic("assign_conversation")),
    db: AsyncSession = Depends(get_db),
):
    """
    Transfer conversation directly to a specific agent

    Validates agent is active, belongs to conversation's department,
    and hasn't reached maximum capacity. Stores transfer history.
    
    **Validations:**
    - Agent must be active
    - Agent must be in 'available' status or None
    - Agent must belong to conversation's department
    - Agent capacity must not be exceeded

    **Returns:** Updated conversation with new agent assignment
    """
    service = ConversationService(db)
    return await service.transfer_to_agent(
        conversation_id=conversation_id,
        organization_id=current_user.organization_id,
        agent_id=data.agent_id,
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
    
    **Description:** Closes an active conversation, records close timestamp and reason. Can optionally mark as resolved.
    
    **Path Parameters:**
    - `conversation_id` (UUID, required): Unique conversation identifier
    
    **Request Body:**
    - `reason` (string, optional): Reason for closing (e.g., "Resolved", "Not interested", "Spam")
    - `resolved` (boolean, default: true): Whether issue was resolved
    
    **Returns:** Closed Conversation with status='closed'
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `400`: Invalid close data
    - `401`: User not authenticated
    - `404`: Conversation not found
    - `409`: Conversation already closed
    - `500`: Database error
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



