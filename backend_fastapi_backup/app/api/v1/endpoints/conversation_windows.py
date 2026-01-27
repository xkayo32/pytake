"""
REST endpoints for ConversationWindow - 24-hour message window management.

Endpoints for checking, managing, and validating WhatsApp's 24-hour message windows.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.conversation_window import ConversationWindowRepository
from app.services.window_validation_service import WindowValidationService
from app.schemas.conversation_window import (
    ConversationWindowResponse,
    ConversationWindowStatusResponse,
    ConversationWindowListResponse,
    ConversationWindowExtend,
    MessageValidationRequest,
    MessageValidationResponse,
)

router = APIRouter(prefix="/api/v1/conversations", tags=["conversation_windows"])


@router.get(
    "/{conversation_id}/window",
    response_model=ConversationWindowResponse,
    status_code=status.HTTP_200_OK,
    summary="Get conversation window",
    description="Get the 24-hour message window for a conversation",
)
async def get_conversation_window(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationWindowResponse:
    """
    Get the conversation window for a specific conversation.
    
    - **conversation_id**: ID of the conversation
    
    Returns the window details including status and time remaining.
    """
    window_repo = ConversationWindowRepository(db)
    window = await window_repo.get_by_conversation_id(
        conversation_id, current_user.organization_id
    )

    if not window:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation window not found",
        )

    return ConversationWindowResponse(
        **{**window.__dict__, **window.to_dict()}
    )


@router.get(
    "/{conversation_id}/window/status",
    response_model=ConversationWindowStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Check window status",
    description="Check if a conversation is within the 24-hour message window",
)
async def check_window_status(
    conversation_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationWindowStatusResponse:
    """
    Check the current status of a conversation's 24-hour window.
    
    - **conversation_id**: ID of the conversation
    
    Returns whether the conversation is within the active window and time remaining.
    """
    validation_service = WindowValidationService(db)
    window_info = await validation_service.get_window_info(
        conversation_id, current_user.organization_id
    )

    return ConversationWindowStatusResponse(**window_info)


@router.post(
    "/{conversation_id}/window/extend",
    response_model=ConversationWindowResponse,
    status_code=status.HTTP_200_OK,
    summary="Extend window",
    description="Manually extend a conversation's 24-hour window (admin only)",
)
async def extend_window(
    conversation_id: UUID,
    request: ConversationWindowExtend,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationWindowResponse:
    """
    Manually extend a conversation's 24-hour window.
    
    This is an admin-only operation for special cases.
    
    - **conversation_id**: ID of the conversation
    - **request.hours**: Number of hours to extend (1-168)
    """
    # TODO: Add RBAC check for admin-only access
    window_repo = ConversationWindowRepository(db)
    window = await window_repo.get_by_conversation_id(
        conversation_id, current_user.organization_id
    )

    if not window:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation window not found",
        )

    updated_window = await window_repo.extend_window(
        window.id, current_user.organization_id, request.hours
    )

    await db.commit()

    return ConversationWindowResponse(
        **{**updated_window.__dict__, **updated_window.to_dict()}
    )


@router.get(
    "/organization/{org_id}/windows/active",
    response_model=ConversationWindowListResponse,
    status_code=status.HTTP_200_OK,
    summary="List active windows",
    description="List all active conversation windows for an organization",
)
async def list_active_windows(
    org_id: UUID,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ConversationWindowListResponse:
    """
    List all active conversation windows for an organization.
    
    - **org_id**: Organization ID (must match current user's organization)
    - **skip**: Number of records to skip (pagination)
    - **limit**: Number of records to return (max 1000)
    """
    if org_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other organizations",
        )

    if limit > 1000:
        limit = 1000

    window_repo = ConversationWindowRepository(db)
    windows = await window_repo.get_active_windows(org_id, skip, limit)
    total = await window_repo.count_active_windows(org_id)

    return ConversationWindowListResponse(
        windows=[
            ConversationWindowResponse(**{**w.__dict__, **w.to_dict()})
            for w in windows
        ],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/organization/{org_id}/windows/expiring-soon",
    response_model=List[ConversationWindowResponse],
    status_code=status.HTTP_200_OK,
    summary="List expiring windows",
    description="List windows expiring within the next N hours",
)
async def list_expiring_windows(
    org_id: UUID,
    hours_threshold: int = 2,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> List[ConversationWindowResponse]:
    """
    List conversation windows expiring soon.
    
    - **org_id**: Organization ID (must match current user's organization)
    - **hours_threshold**: Get windows expiring within this many hours (default 2)
    """
    if org_id != current_user.organization_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot access other organizations",
        )

    window_repo = ConversationWindowRepository(db)
    windows = await window_repo.get_expiring_soon(org_id, hours_threshold)

    return [
        ConversationWindowResponse(**{**w.__dict__, **w.to_dict()})
        for w in windows
    ]


@router.post(
    "/validate-message",
    response_model=MessageValidationResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate message",
    description="Validate a message against 24-hour window rules",
)
async def validate_message(
    request: MessageValidationRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> MessageValidationResponse:
    """
    Validate a message before sending against 24-hour window rules.
    
    Rules:
    - Free messages: Must be within 24h window
    - Template messages: Can be sent anytime if template is approved
    
    Request body:
    - **conversation_id**: ID of the conversation
    - **is_template_message**: Whether this is a template message (default false)
    - **template_id**: ID of template (for template messages)
    """
    validation_service = WindowValidationService(db)
    result = await validation_service.validate_message_before_send(
        request.conversation_id,
        current_user.organization_id,
        request.is_template_message,
        {"status": "approved"} if request.template_id else None,
    )

    return MessageValidationResponse(
        is_valid=result.is_valid,
        reason=result.reason,
        window_status=result.window_status.value,
        hours_remaining=result.hours_remaining,
        template_required=result.template_required,
    )
