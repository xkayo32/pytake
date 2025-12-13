"""
Flow Builder endpoints - Create, read, update, delete flows
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.api.deps import get_current_user, get_db, get_current_admin
from app.models.user import User
from app.schemas.flow import (
    Flow,
    FlowCreate,
    FlowUpdate,
    FlowList,
    CanvasData,
)
from app.services.flow_service import FlowService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.post("/", response_model=Flow, status_code=status.HTTP_201_CREATED)
async def create_flow(
    data: FlowCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new flow.

    Creates a new conversation flow within a chatbot. A flow contains nodes and edges
    that define the conversation logic (React Flow format).

    **Path Parameters:** None

    **Request Body:**
    - name (str, required): Flow name
    - description (str, optional): Flow description
    - chatbot_id (UUID, required): Chatbot this flow belongs to
    - is_main (bool, optional): Mark as main entry flow
    - is_fallback (bool, optional): Mark as fallback flow for errors
    - canvas_data (object, optional): React Flow canvas data with nodes and edges

    **Returns:**
    - Flow object with id, name, description, canvas_data, timestamps

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 400: Bad Request (invalid data)
    - 401: Unauthorized
    - 404: Chatbot not found
    - 500: Server error
    """
    service = FlowService(db)
    return await service.create_flow(data, current_user.organization_id)


@router.get("/", response_model=FlowList)
async def list_flows_by_chatbot(
    chatbot_id: UUID = Query(..., description="Chatbot ID to list flows for"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all flows for a chatbot.

    Returns all conversation flows for a specific chatbot in the organization.

    **Query Parameters:**
    - chatbot_id (UUID, required): Chatbot to list flows for

    **Returns:**
    - List of Flow objects with metadata

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Chatbot not found
    - 500: Server error
    """
    service = FlowService(db)
    flows = await service.list_flows_by_chatbot(
        chatbot_id, current_user.organization_id
    )
    return FlowList(
        flows=flows,
        total=len(flows),
        page=1,
        per_page=len(flows),
    )


@router.get("/{flow_id}", response_model=Flow)
async def get_flow(
    flow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get a specific flow.

    Returns a single flow with its complete canvas data (nodes and edges).

    **Path Parameters:**
    - flow_id (UUID): Flow ID

    **Returns:**
    - Flow object with all details

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Flow not found
    - 500: Server error
    """
    service = FlowService(db)
    return await service.get_flow(flow_id, current_user.organization_id)


@router.put("/{flow_id}", response_model=Flow)
async def update_flow(
    flow_id: UUID,
    data: FlowUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update a flow.

    Updates flow configuration and/or canvas data (nodes and edges).
    Can be used to save flow design changes from the builder.

    **Path Parameters:**
    - flow_id (UUID): Flow ID

    **Request Body:**
    - name (str, optional): New flow name
    - description (str, optional): New description
    - is_main (bool, optional): Change main flow status
    - is_fallback (bool, optional): Change fallback status
    - canvas_data (object, optional): Updated React Flow canvas data

    **Returns:**
    - Updated Flow object

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 400: Bad Request (invalid data)
    - 401: Unauthorized
    - 404: Flow not found
    - 500: Server error
    """
    service = FlowService(db)
    return await service.update_flow(flow_id, data, current_user.organization_id)


@router.delete("/{flow_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flow(
    flow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete a flow (soft delete).

    Removes a flow from the system. The flow is soft-deleted and can be restored.

    **Path Parameters:**
    - flow_id (UUID): Flow ID

    **Returns:** HTTP 204 No Content

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Flow not found
    - 500: Server error
    """
    service = FlowService(db)
    await service.delete_flow(flow_id, current_user.organization_id)
    return None


@router.get("/chatbots/{chatbot_id}/main", response_model=Flow)
async def get_main_flow(
    chatbot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get main entry flow for a chatbot.

    Returns the primary flow that starts conversations for a chatbot.

    **Path Parameters:**
    - chatbot_id (UUID): Chatbot ID

    **Returns:**
    - Main Flow object

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Chatbot or main flow not found
    - 500: Server error
    """
    service = FlowService(db)
    return await service.get_main_flow(chatbot_id, current_user.organization_id)


@router.get("/chatbots/{chatbot_id}/fallback", response_model=Flow)
async def get_fallback_flow(
    chatbot_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get fallback flow for a chatbot.

    Returns the fallback flow used when conversations can't be routed to a main flow.

    **Path Parameters:**
    - chatbot_id (UUID): Chatbot ID

    **Returns:**
    - Fallback Flow object

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Chatbot or fallback flow not found
    - 500: Server error
    """
    service = FlowService(db)
    return await service.get_fallback_flow(chatbot_id, current_user.organization_id)


@router.post("/{flow_id}/activate", response_model=Flow)
async def activate_flow(
    flow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate a flow.

    Enables a specific flow so it can be used in conversations.
    A flow can be independently activated/deactivated from its parent chatbot.

    **Path Parameters:**
    - flow_id (UUID): Flow ID

    **Returns:**
    - Updated Flow object with is_active=true

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Flow not found
    - 500: Server error
    """
    service = FlowService(db)
    return await service.activate_flow(flow_id, current_user.organization_id)


@router.post("/{flow_id}/deactivate", response_model=Flow)
async def deactivate_flow(
    flow_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate a flow.

    Disables a specific flow. The flow cannot be used in conversations
    while inactive, but all its data is preserved.

    **Path Parameters:**
    - flow_id (UUID): Flow ID

    **Returns:**
    - Updated Flow object with is_active=false

    **Permissions:**
    - Requires: Authenticated user
    - Scoped to: Organization

    **Error Codes:**
    - 401: Unauthorized
    - 404: Flow not found
    - 500: Server error
    """
    service = FlowService(db)
    return await service.deactivate_flow(flow_id, current_user.organization_id)
