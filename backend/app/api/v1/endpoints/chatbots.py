"""
Chatbot endpoints - Bot builder and flow management
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

router = APIRouter()


# ============================================
# CHATBOT ENDPOINTS
# ============================================


@router.post(
    "/",
    response_model=ChatbotInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin"]))],
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


@router.get("/", response_model=ChatbotListResponse)
async def list_chatbots(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all chatbots for current organization

    Supports pagination with skip and limit.
    """
    service = ChatbotService(db)
    chatbots, total = await service.list_chatbots(
        current_user.organization_id, skip, limit
    )
    return ChatbotListResponse(total=total, items=chatbots)


@router.get("/{chatbot_id}", response_model=ChatbotInDB)
async def get_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get chatbot by ID
    """
    service = ChatbotService(db)
    chatbot = await service.get_chatbot(chatbot_id, current_user.organization_id)
    if not chatbot:
        raise NotFoundException("Chatbot not found")
    return chatbot


@router.get("/{chatbot_id}/full", response_model=ChatbotWithFlows)
async def get_chatbot_with_flows(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get chatbot with all flows loaded
    """
    service = ChatbotService(db)
    chatbot = await service.get_chatbot(
        chatbot_id, current_user.organization_id, with_flows=True
    )
    if not chatbot:
        raise NotFoundException("Chatbot not found")
    return chatbot


@router.get("/{chatbot_id}/stats", response_model=ChatbotStats)
async def get_chatbot_stats(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get chatbot statistics
    """
    service = ChatbotService(db)
    stats = await service.get_chatbot_stats(chatbot_id, current_user.organization_id)
    return stats


@router.patch(
    "/{chatbot_id}",
    response_model=ChatbotInDB,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def update_chatbot(
    chatbot_id: UUID,
    data: ChatbotUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update chatbot

    Required role: org_admin
    """
    service = ChatbotService(db)
    chatbot = await service.update_chatbot(
        chatbot_id, current_user.organization_id, data
    )
    return chatbot


@router.post(
    "/{chatbot_id}/activate",
    response_model=ChatbotInDB,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def activate_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Activate chatbot

    Required role: org_admin

    Validates that chatbot has at least one flow and a main flow.
    """
    service = ChatbotService(db)
    chatbot = await service.activate_chatbot(chatbot_id, current_user.organization_id)
    return chatbot


@router.post(
    "/{chatbot_id}/deactivate",
    response_model=ChatbotInDB,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def deactivate_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Deactivate chatbot

    Required role: org_admin
    """
    service = ChatbotService(db)
    chatbot = await service.deactivate_chatbot(chatbot_id, current_user.organization_id)
    return chatbot


@router.delete(
    "/{chatbot_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def delete_chatbot(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete chatbot

    Required role: org_admin
    """
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
)
async def create_flow(
    chatbot_id: UUID,
    data: FlowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new flow for chatbot

    Required role: org_admin or agent

    If is_main is true, all other main flows will be unset.
    """
    # Ensure chatbot_id matches
    if data.chatbot_id != chatbot_id:
        data.chatbot_id = chatbot_id

    service = ChatbotService(db)
    flow = await service.create_flow(data, current_user.organization_id)
    return flow


@router.get("/{chatbot_id}/flows", response_model=FlowListResponse)
async def list_flows(
    chatbot_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all flows for chatbot
    """
    service = ChatbotService(db)
    flows = await service.list_flows(chatbot_id, current_user.organization_id)
    return FlowListResponse(total=len(flows), items=flows)


@router.get("/flows/{flow_id}", response_model=FlowInDB)
async def get_flow(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get flow by ID
    """
    service = ChatbotService(db)
    flow = await service.get_flow(flow_id, current_user.organization_id)
    if not flow:
        raise NotFoundException("Flow not found")
    return flow


@router.get("/flows/{flow_id}/full", response_model=FlowWithNodes)
async def get_flow_with_nodes(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get flow with all nodes loaded
    """
    service = ChatbotService(db)
    flow = await service.get_flow(flow_id, current_user.organization_id, with_nodes=True)
    if not flow:
        raise NotFoundException("Flow not found")
    return flow


@router.patch(
    "/flows/{flow_id}",
    response_model=FlowInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def update_flow(
    flow_id: UUID,
    data: FlowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update flow

    Required role: org_admin or agent
    """
    service = ChatbotService(db)
    flow = await service.update_flow(flow_id, current_user.organization_id, data)
    return flow


@router.delete(
    "/flows/{flow_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def delete_flow(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Soft delete flow

    Required role: org_admin

    Cannot delete main flow without setting another flow as main first.
    """
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
)
async def create_node(
    flow_id: UUID,
    data: NodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new node for flow

    Required role: org_admin or agent
    """
    service = ChatbotService(db)
    node = await service.create_node(data, flow_id, current_user.organization_id)
    return node


@router.get("/flows/{flow_id}/nodes", response_model=NodeListResponse)
async def list_nodes(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all nodes for flow
    """
    service = ChatbotService(db)
    nodes = await service.list_nodes(flow_id, current_user.organization_id)
    return NodeListResponse(total=len(nodes), items=nodes)


@router.patch(
    "/nodes/{node_id}",
    response_model=NodeInDB,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def update_node(
    node_id: UUID,
    data: NodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update node

    Required role: org_admin or agent
    """
    service = ChatbotService(db)
    node = await service.update_node(node_id, current_user.organization_id, data)
    return node


@router.delete(
    "/nodes/{node_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_role(["org_admin", "agent"]))],
)
async def delete_node(
    node_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete node

    Required role: org_admin or agent
    """
    service = ChatbotService(db)
    await service.delete_node(node_id, current_user.organization_id)


# ============================================
# EXPORT/IMPORT ENDPOINTS
# ============================================


@router.get(
    "/flows/{flow_id}/export",
    response_model=dict,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def export_flow(
    flow_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Export flow as JSON for backup/template

    Required role: org_admin

    Returns complete flow data including canvas_data, variables, and metadata.
    Use this exported JSON to import the flow into another chatbot or organization.
    """
    service = ChatbotService(db)
    export_data = await service.export_flow(flow_id, current_user.organization_id)
    return export_data


@router.post(
    "/{chatbot_id}/import",
    response_model=FlowInDB,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(["org_admin"]))],
)
async def import_flow(
    chatbot_id: UUID,
    import_data: dict,
    override_name: str = Query(None, description="Optional name override for imported flow"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Import flow from exported JSON

    Required role: org_admin

    Import a flow previously exported from this or another chatbot.
    The imported flow will never be set as main - you must set it manually.
    """
    service = ChatbotService(db)
    flow = await service.import_flow(
        import_data=import_data,
        chatbot_id=chatbot_id,
        organization_id=current_user.organization_id,
        override_name=override_name,
    )
    return flow
