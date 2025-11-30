"""
Chatbot endpoints - Bot builder and flow management

Provides complete CRUD operations for:
- Chatbots: Create, list, update, activate/deactivate, delete
- Flows: Create, list, update, delete, export/import
- Nodes: Create, list, update, delete

All endpoints require authentication and respect organization multi-tenancy.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, require_role
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.schemas.chatbot import (
    ChatbotCreate,
    ChatbotInDB,
    ChatbotListResponse,
    ChatbotStats,
    ChatbotUpdate,
    ChatbotWithFlows,
    FlowCreate,
    FlowInDB,
    FlowListResponse,
    FlowUpdate,
    FlowWithNodes,
    NodeCreate,
    NodeInDB,
    NodeListResponse,
    NodeUpdate,
)
from app.services.chatbot_service import ChatbotService

router = APIRouter(tags=["Chatbots"])


# ============================================
# CHATBOT ENDPOINTS
# ============================================


@router.post(
    "/",
    response_model=ChatbotInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Create chatbot",
    description="Create a new chatbot with automatic main flow generation",
    responses={
        201: {"description": "Chatbot created successfully"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions (requires org_admin)"},
        422: {"description": "Validation error"},
    },
)
async def create_chatbot(
    data: ChatbotCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new chatbot

    Required role: org_admin

    A default main flow is automatically created.
    """
    service = ChatbotService(db)
    chatbot = await service.create_chatbot(data, current_user.organization_id)
    return chatbot


@router.get(
    "/",
    response_model=ChatbotListResponse,
    summary="List chatbots",
    description="List all chatbots for the current organization with pagination",
    responses={
        200: {"description": "List of chatbots"},
        401: {"description": "Not authenticated"},
    },
)
async def list_chatbots(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of records to return"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all chatbots for current organization with pagination support."""
    service = ChatbotService(db)
    chatbots, total = await service.list_chatbots(
        current_user.organization_id, skip, limit
    )
    return ChatbotListResponse(total=total, items=chatbots)


@router.get(
    "/{chatbot_id}",
    response_model=ChatbotInDB,
    summary="Get chatbot",
    description="Get a specific chatbot by its ID",
    responses={
        200: {"description": "Chatbot details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Chatbot not found"},
    },
)
async def get_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chatbot by ID."""
    service = ChatbotService(db)
    chatbot = await service.get_chatbot(chatbot_id, current_user.organization_id)
    if not chatbot:
        raise NotFoundException("Chatbot not found")
    return chatbot


@router.get(
    "/{chatbot_id}/full",
    response_model=ChatbotWithFlows,
    summary="Get chatbot with flows",
    description="Get chatbot with all associated flows loaded",
    responses={
        200: {"description": "Chatbot with flows"},
        401: {"description": "Not authenticated"},
        404: {"description": "Chatbot not found"},
    },
)
async def get_chatbot_with_flows(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chatbot with all flows loaded."""
    service = ChatbotService(db)
    chatbot = await service.get_chatbot(
        chatbot_id, current_user.organization_id, with_flows=True
    )
    if not chatbot:
        raise NotFoundException("Chatbot not found")
    return chatbot


@router.get(
    "/{chatbot_id}/stats",
    response_model=ChatbotStats,
    summary="Get chatbot statistics",
    description="Get usage statistics for a chatbot including message counts and response times",
    responses={
        200: {"description": "Chatbot statistics"},
        401: {"description": "Not authenticated"},
        404: {"description": "Chatbot not found"},
    },
)
async def get_chatbot_stats(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get chatbot usage statistics."""
    service = ChatbotService(db)
    stats = await service.get_chatbot_stats(chatbot_id, current_user.organization_id)
    return stats


@router.patch(
    "/{chatbot_id}",
    response_model=ChatbotInDB,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Update chatbot",
    description="Update chatbot properties. Only provided fields will be updated.",
    responses={
        200: {"description": "Chatbot updated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Chatbot not found"},
    },
)
async def update_chatbot(
    chatbot_id: UUID,
    data: ChatbotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update chatbot. Requires org_admin role."""
    service = ChatbotService(db)
    chatbot = await service.update_chatbot(
        chatbot_id, current_user.organization_id, data
    )
    return chatbot


@router.post(
    "/{chatbot_id}/activate",
    response_model=ChatbotInDB,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Activate chatbot",
    description="Activate a chatbot. Validates that it has at least one flow and a main flow configured.",
    responses={
        200: {"description": "Chatbot activated"},
        400: {"description": "Validation failed (missing flows or main flow)"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Chatbot not found"},
    },
)
async def activate_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Activate chatbot. Requires org_admin role."""
    service = ChatbotService(db)
    chatbot = await service.activate_chatbot(chatbot_id, current_user.organization_id)
    return chatbot


@router.post(
    "/{chatbot_id}/deactivate",
    response_model=ChatbotInDB,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Deactivate chatbot",
    description="Deactivate a chatbot. The chatbot will stop responding to messages.",
    responses={
        200: {"description": "Chatbot deactivated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Chatbot not found"},
    },
)
async def deactivate_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Deactivate chatbot. Requires org_admin role."""
    service = ChatbotService(db)
    chatbot = await service.deactivate_chatbot(chatbot_id, current_user.organization_id)
    return chatbot


@router.delete(
    "/{chatbot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Delete chatbot",
    description="Soft delete a chatbot and all associated flows and nodes",
    responses={
        204: {"description": "Chatbot deleted"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Chatbot not found"},
    },
)
async def delete_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete chatbot. Requires org_admin role."""
    service = ChatbotService(db)
    await service.delete_chatbot(chatbot_id, current_user.organization_id)


# ============================================
# FLOW ENDPOINTS
# ============================================


@router.post(
    "/{chatbot_id}/flows",
    response_model=FlowInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
    summary="Create flow",
    description="Create a new flow for a chatbot. If is_main is true, other main flows will be unset.",
    responses={
        201: {"description": "Flow created"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Chatbot not found"},
    },
)
async def create_flow(
    chatbot_id: UUID,
    data: FlowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new flow for chatbot."""
    # Ensure chatbot_id matches
    if data.chatbot_id != chatbot_id:
        data.chatbot_id = chatbot_id

    service = ChatbotService(db)
    flow = await service.create_flow(data, current_user.organization_id)
    return flow


@router.get(
    "/{chatbot_id}/flows",
    response_model=FlowListResponse,
    summary="List flows",
    description="List all flows belonging to a chatbot",
    responses={
        200: {"description": "List of flows"},
        401: {"description": "Not authenticated"},
        404: {"description": "Chatbot not found"},
    },
)
async def list_flows(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all flows for a chatbot."""
    service = ChatbotService(db)
    flows = await service.list_flows(chatbot_id, current_user.organization_id)
    return FlowListResponse(total=len(flows), items=flows)


@router.get(
    "/flows/{flow_id}",
    response_model=FlowInDB,
    summary="Get flow",
    description="Get a specific flow by its ID",
    responses={
        200: {"description": "Flow details"},
        401: {"description": "Not authenticated"},
        404: {"description": "Flow not found"},
    },
)
async def get_flow(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get flow by ID."""
    service = ChatbotService(db)
    flow = await service.get_flow(flow_id, current_user.organization_id)
    if not flow:
        raise NotFoundException("Flow not found")
    return flow


@router.get(
    "/flows/{flow_id}/full",
    response_model=FlowWithNodes,
    summary="Get flow with nodes",
    description="Get flow with all associated nodes loaded",
    responses={
        200: {"description": "Flow with nodes"},
        401: {"description": "Not authenticated"},
        404: {"description": "Flow not found"},
    },
)
async def get_flow_with_nodes(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get flow with all nodes loaded."""
    service = ChatbotService(db)
    flow = await service.get_flow(flow_id, current_user.organization_id, with_nodes=True)
    if not flow:
        raise NotFoundException("Flow not found")
    return flow


@router.patch(
    "/flows/{flow_id}",
    response_model=FlowInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
    summary="Update flow",
    description="Update flow properties. Only provided fields will be updated.",
    responses={
        200: {"description": "Flow updated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Flow not found"},
    },
)
async def update_flow(
    flow_id: UUID,
    data: FlowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update flow properties."""
    service = ChatbotService(db)
    flow = await service.update_flow(flow_id, current_user.organization_id, data)
    return flow


@router.delete(
    "/flows/{flow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Delete flow",
    description="Soft delete a flow. Cannot delete main flow without setting another as main first.",
    responses={
        204: {"description": "Flow deleted"},
        400: {"description": "Cannot delete main flow"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Flow not found"},
    },
)
async def delete_flow(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Soft delete flow. Requires org_admin role."""
    service = ChatbotService(db)
    await service.delete_flow(flow_id, current_user.organization_id)


# ============================================
# NODE ENDPOINTS
# ============================================


@router.post(
    "/flows/{flow_id}/nodes",
    response_model=NodeInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
    summary="Create node",
    description="Create a new node in a flow",
    responses={
        201: {"description": "Node created"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Flow not found"},
    },
)
async def create_node(
    flow_id: UUID,
    data: NodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new node for flow."""
    service = ChatbotService(db)
    node = await service.create_node(data, flow_id, current_user.organization_id)
    return node


@router.get(
    "/flows/{flow_id}/nodes",
    response_model=NodeListResponse,
    summary="List nodes",
    description="List all nodes in a flow",
    responses={
        200: {"description": "List of nodes"},
        401: {"description": "Not authenticated"},
        404: {"description": "Flow not found"},
    },
)
async def list_nodes(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all nodes for a flow."""
    service = ChatbotService(db)
    nodes = await service.list_nodes(flow_id, current_user.organization_id)
    return NodeListResponse(total=len(nodes), items=nodes)


@router.patch(
    "/nodes/{node_id}",
    response_model=NodeInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
    summary="Update node",
    description="Update node properties and configuration",
    responses={
        200: {"description": "Node updated"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Node not found"},
    },
)
async def update_node(
    node_id: UUID,
    data: NodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update node properties."""
    service = ChatbotService(db)
    node = await service.update_node(node_id, current_user.organization_id, data)
    return node


@router.delete(
    "/nodes/{node_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
    summary="Delete node",
    description="Delete a node from a flow",
    responses={
        204: {"description": "Node deleted"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Node not found"},
    },
)
async def delete_node(
    node_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete node from flow."""
    service = ChatbotService(db)
    await service.delete_node(node_id, current_user.organization_id)


# ============================================
# EXPORT/IMPORT ENDPOINTS
# ============================================


@router.get(
    "/flows/{flow_id}/export",
    response_model=dict,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Export flow",
    description="Export flow as JSON for backup or as a template. Includes canvas_data, variables, and metadata.",
    responses={
        200: {"description": "Exported flow JSON"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Flow not found"},
    },
)
async def export_flow(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Export flow as JSON for backup/template."""
    service = ChatbotService(db)
    export_data = await service.export_flow(flow_id, current_user.organization_id)
    return export_data


@router.post(
    "/{chatbot_id}/import",
    response_model=FlowInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin"]))],
    summary="Import flow",
    description="Import a flow from previously exported JSON. The imported flow will not be set as main.",
    responses={
        201: {"description": "Flow imported"},
        400: {"description": "Invalid import data"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient permissions"},
        404: {"description": "Chatbot not found"},
    },
)
async def import_flow(
    chatbot_id: UUID,
    import_data: dict,
    override_name: str = Query(None, description="Optional name override for imported flow"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Import flow from exported JSON."""
    service = ChatbotService(db)
    flow = await service.import_flow(
        import_data=import_data,
        chatbot_id=chatbot_id,
        organization_id=current_user.organization_id,
        override_name=override_name,
    )
    return flow
