"""
Conversation Endpoints
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.conversation import (
    Conversation,
    ConversationCreate,
    ConversationUpdate,
    Message,
    MessageCreate,
)
from app.schemas.message import MessageSendRequest, MessageResponse
from app.services.conversation_service import ConversationService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get("/", response_model=List[Conversation])
async def list_conversations(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    status: Optional[str] = Query(None, regex="^(open|pending|resolved|closed)$"),
    assigned_to_me: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List conversations"""
    service = ConversationService(db)

    assigned_agent_id = current_user.id if assigned_to_me else None

    return await service.list_conversations(
        organization_id=current_user.organization_id,
        status=status,
        assigned_agent_id=assigned_agent_id,
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


@router.get("/{conversation_id}/messages", response_model=List[Message])
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
