"""
Chatbot service - Business logic for chatbots, flows, and nodes
"""

from typing import List, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import BadRequestException, ConflictException, NotFoundException
from app.models.chatbot import Chatbot, Flow, Node
from app.repositories.chatbot import ChatbotRepository, FlowRepository, NodeRepository
from app.schemas.chatbot import (
    ChatbotCreate,
    ChatbotInDB,
    ChatbotStats,
    ChatbotUpdate,
    FlowCreate,
    FlowUpdate,
    NodeCreate,
    NodeUpdate,
)


class ChatbotService:
    """Service for chatbot operations"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.chatbot_repo = ChatbotRepository(db)
        self.flow_repo = FlowRepository(db)
        self.node_repo = NodeRepository(db)

    # ============================================
    # CHATBOT OPERATIONS
    # ============================================

    async def create_chatbot(
        self, data: ChatbotCreate, organization_id: UUID
    ) -> Chatbot:
        """
        Create a new chatbot

        Args:
            data: Chatbot creation data
            organization_id: Organization UUID

        Returns:
            Created chatbot
        """
        chatbot_data = {
            **data.model_dump(),
            "organization_id": organization_id,
        }

        chatbot = await self.chatbot_repo.create(chatbot_data)

        # Create default main flow
        default_flow = await self.flow_repo.create(
            {
                "name": "Main Flow",
                "description": "Default entry flow",
                "chatbot_id": chatbot.id,
                "organization_id": organization_id,
                "is_main": True,
                "canvas_data": {"nodes": [], "edges": []},
                "variables": {},
            }
        )

        return chatbot

    async def get_chatbot(
        self, chatbot_id: UUID, organization_id: UUID, with_flows: bool = False
    ) -> Optional[Chatbot]:
        """
        Get chatbot by ID

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID
            with_flows: Include flows

        Returns:
            Chatbot or None
        """
        if with_flows:
            return await self.chatbot_repo.get_with_flows(chatbot_id, organization_id)

        chatbot = await self.chatbot_repo.get(chatbot_id)
        if chatbot and chatbot.organization_id != organization_id:
            return None
        if chatbot and chatbot.deleted_at:
            return None

        return chatbot

    async def list_chatbots(
        self, organization_id: UUID, skip: int = 0, limit: int = 100
    ) -> tuple[List[Chatbot], int]:
        """
        List all chatbots for organization

        Args:
            organization_id: Organization UUID
            skip: Records to skip
            limit: Max records

        Returns:
            Tuple of (chatbots, total_count)
        """
        chatbots = await self.chatbot_repo.get_by_organization(
            organization_id, skip, limit
        )
        total = await self.chatbot_repo.count_by_organization(organization_id)
        return chatbots, total

    async def update_chatbot(
        self, chatbot_id: UUID, organization_id: UUID, data: ChatbotUpdate
    ) -> Chatbot:
        """
        Update chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated chatbot

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_chatbot = await self.chatbot_repo.update(chatbot_id, update_data)

        return updated_chatbot

    async def delete_chatbot(self, chatbot_id: UUID, organization_id: UUID):
        """
        Soft delete chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        await self.chatbot_repo.soft_delete(chatbot_id)

    async def activate_chatbot(self, chatbot_id: UUID, organization_id: UUID) -> Chatbot:
        """
        Activate chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Updated chatbot

        Raises:
            NotFoundException: If chatbot not found
            BadRequestException: If chatbot has no flows
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id, with_flows=True)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        # Validate chatbot has at least one flow
        flows = await self.flow_repo.get_by_chatbot(chatbot_id, organization_id)
        if not flows:
            raise BadRequestException("Chatbot must have at least one flow to be activated")

        # Check if main flow exists
        main_flow = await self.flow_repo.get_main_flow(chatbot_id, organization_id)
        if not main_flow:
            raise BadRequestException("Chatbot must have a main flow to be activated")

        updated_chatbot = await self.chatbot_repo.update(
            chatbot_id, {"is_active": True}
        )
        return updated_chatbot

    async def deactivate_chatbot(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> Chatbot:
        """
        Deactivate chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Updated chatbot

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        updated_chatbot = await self.chatbot_repo.update(
            chatbot_id, {"is_active": False}
        )
        return updated_chatbot

    async def get_chatbot_stats(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> ChatbotStats:
        """
        Get chatbot statistics

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            Chatbot statistics

        Raises:
            NotFoundException: If chatbot not found
        """
        chatbot = await self.get_chatbot(chatbot_id, organization_id, with_flows=True)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        flows = await self.flow_repo.get_by_chatbot(chatbot_id, organization_id)
        total_nodes = 0
        for flow in flows:
            nodes = await self.node_repo.get_by_flow(flow.id, organization_id)
            total_nodes += len(nodes)

        return ChatbotStats(
            total_conversations=chatbot.total_conversations,
            total_messages_sent=chatbot.total_messages_sent,
            total_messages_received=chatbot.total_messages_received,
            total_flows=len(flows),
            total_nodes=total_nodes,
            is_active=chatbot.is_active,
            is_published=chatbot.is_published,
        )

    # ============================================
    # FLOW OPERATIONS
    # ============================================

    async def create_flow(self, data: FlowCreate, organization_id: UUID) -> Flow:
        """
        Create a new flow

        Args:
            data: Flow creation data
            organization_id: Organization UUID

        Returns:
            Created flow

        Raises:
            NotFoundException: If chatbot not found
            ConflictException: If trying to set as main but main already exists
        """
        # Verify chatbot exists
        chatbot = await self.get_chatbot(data.chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Chatbot not found")

        # If this is main flow, unset other main flows
        if data.is_main:
            await self.flow_repo.unset_main_flows(data.chatbot_id, organization_id)

        flow_data = {**data.model_dump(), "organization_id": organization_id}
        flow = await self.flow_repo.create(flow_data)

        return flow

    async def get_flow(
        self, flow_id: UUID, organization_id: UUID, with_nodes: bool = False
    ) -> Optional[Flow]:
        """
        Get flow by ID

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
            with_nodes: Include nodes

        Returns:
            Flow or None
        """
        if with_nodes:
            return await self.flow_repo.get_with_nodes(flow_id, organization_id)

        flow = await self.flow_repo.get(flow_id)
        if flow and flow.organization_id != organization_id:
            return None
        if flow and flow.deleted_at:
            return None

        return flow

    async def list_flows(
        self, chatbot_id: UUID, organization_id: UUID
    ) -> List[Flow]:
        """
        List all flows for a chatbot

        Args:
            chatbot_id: Chatbot UUID
            organization_id: Organization UUID

        Returns:
            List of flows
        """
        return await self.flow_repo.get_by_chatbot(chatbot_id, organization_id)

    async def update_flow(
        self, flow_id: UUID, organization_id: UUID, data: FlowUpdate
    ) -> Flow:
        """
        Update flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated flow

        Raises:
            NotFoundException: If flow not found
        """
        flow = await self.get_flow(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")

        # If setting as main, unset other main flows
        if data.is_main:
            await self.flow_repo.unset_main_flows(flow.chatbot_id, organization_id)

        update_data = data.model_dump(exclude_unset=True)

        # If canvas_data is being updated, sync nodes to database
        if "canvas_data" in update_data and update_data["canvas_data"]:
            await self._sync_nodes_from_canvas(
                flow_id=flow_id,
                organization_id=organization_id,
                canvas_data=update_data["canvas_data"]
            )

        updated_flow = await self.flow_repo.update(flow_id, update_data)

        return updated_flow

    async def delete_flow(self, flow_id: UUID, organization_id: UUID):
        """
        Soft delete flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If flow not found
            BadRequestException: If trying to delete main flow
        """
        flow = await self.get_flow(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")

        if flow.is_main:
            raise BadRequestException("Cannot delete main flow. Set another flow as main first.")

        await self.flow_repo.soft_delete(flow_id)

    # ============================================
    # NODE OPERATIONS
    # ============================================

    async def create_node(self, data: NodeCreate, flow_id: UUID, organization_id: UUID) -> Node:
        """
        Create a new node

        Args:
            data: Node creation data
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            Created node

        Raises:
            NotFoundException: If flow not found
        """
        # Verify flow exists
        flow = await self.get_flow(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")

        node_data = {
            **data.model_dump(),
            "flow_id": flow_id,
            "organization_id": organization_id,
        }
        node = await self.node_repo.create(node_data)

        return node

    async def list_nodes(self, flow_id: UUID, organization_id: UUID) -> List[Node]:
        """
        List all nodes for a flow

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            List of nodes
        """
        return await self.node_repo.get_by_flow(flow_id, organization_id)

    async def update_node(
        self, node_id: UUID, organization_id: UUID, data: NodeUpdate
    ) -> Node:
        """
        Update node

        Args:
            node_id: Node UUID
            organization_id: Organization UUID
            data: Update data

        Returns:
            Updated node

        Raises:
            NotFoundException: If node not found
        """
        node = await self.node_repo.get(node_id)
        if not node or node.organization_id != organization_id:
            raise NotFoundException("Node not found")

        update_data = data.model_dump(exclude_unset=True)
        updated_node = await self.node_repo.update(node_id, update_data)

        return updated_node

    async def delete_node(self, node_id: UUID, organization_id: UUID):
        """
        Delete node

        Args:
            node_id: Node UUID
            organization_id: Organization UUID

        Raises:
            NotFoundException: If node not found
        """
        node = await self.node_repo.get(node_id)
        if not node or node.organization_id != organization_id:
            raise NotFoundException("Node not found")

        await self.node_repo.delete(node_id)

    # ============================================
    # HELPER METHODS
    # ============================================

    async def _sync_nodes_from_canvas(
        self, flow_id: UUID, organization_id: UUID, canvas_data: dict
    ):
        """
        Sync nodes from canvas_data to database

        Extracts nodes from React Flow canvas_data and saves them to nodes table.
        This allows querying nodes directly from DB for chatbot execution.

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID
            canvas_data: Canvas data with nodes and edges
        """
        import logging
        logger = logging.getLogger(__name__)

        # Delete all existing nodes for this flow
        await self.node_repo.delete_by_flow(flow_id, organization_id)

        # Extract nodes from canvas_data
        nodes_data = canvas_data.get("nodes", [])

        if not nodes_data:
            logger.warning(f"No nodes found in canvas_data for flow {flow_id}")
            return

        # Create Node instances
        nodes_to_create = []
        for idx, node_data in enumerate(nodes_data):
            # Extract node info from React Flow format
            react_flow_id = node_data.get("id")  # e.g., "node-1"
            node_info = node_data.get("data", {})
            node_type = node_info.get("nodeType", "custom")  # start, message, question, etc.
            position = node_data.get("position", {})

            # Create Node instance
            node = Node(
                flow_id=flow_id,
                organization_id=organization_id,
                node_id=react_flow_id,  # React Flow ID (e.g., "node-1")
                node_type=node_type,  # Node type (start, message, question, end, etc.)
                label=node_info.get("label", f"Node {idx + 1}"),
                data=node_info,  # Store all node data as JSONB
                position_x=position.get("x", 0),
                position_y=position.get("y", 0),
                order=idx,
            )
            nodes_to_create.append(node)

        # Bulk create nodes
        if nodes_to_create:
            await self.node_repo.bulk_create(nodes_to_create)
            logger.info(f"Synced {len(nodes_to_create)} nodes to database for flow {flow_id}")
        else:
            logger.warning(f"No valid nodes to sync for flow {flow_id}")

    # ============================================
    # EXPORT/IMPORT OPERATIONS
    # ============================================

    async def export_flow(self, flow_id: UUID, organization_id: UUID) -> dict:
        """
        Export flow as JSON for backup/template

        Args:
            flow_id: Flow UUID
            organization_id: Organization UUID

        Returns:
            Flow data as dictionary (JSON-serializable)

        Raises:
            NotFoundException: If flow not found
        """
        import logging
        from datetime import datetime

        logger = logging.getLogger(__name__)

        flow = await self.get_flow(flow_id, organization_id)
        if not flow:
            raise NotFoundException("Flow not found")

        logger.info(f"📤 Exportando flow '{flow.name}' (ID: {flow_id})")

        # Build export data
        export_data = {
            "format_version": "1.0",
            "exported_at": datetime.utcnow().isoformat(),
            "flow": {
                "name": flow.name,
                "description": flow.description,
                "is_main": flow.is_main,
                "canvas_data": flow.canvas_data,
                "variables": flow.variables,
                "settings": flow.settings,
            },
            "metadata": {
                "organization_id": str(organization_id),
                "chatbot_id": str(flow.chatbot_id),
                "original_flow_id": str(flow_id),
                "total_nodes": len(flow.canvas_data.get("nodes", [])) if flow.canvas_data else 0,
                "total_edges": len(flow.canvas_data.get("edges", [])) if flow.canvas_data else 0,
            }
        }

        logger.info(f"✅ Flow exportado com {export_data['metadata']['total_nodes']} nodes")

        return export_data

    async def import_flow(
        self,
        import_data: dict,
        chatbot_id: UUID,
        organization_id: UUID,
        override_name: Optional[str] = None
    ) -> Flow:
        """
        Import flow from exported JSON

        Args:
            import_data: Exported flow data
            chatbot_id: Target chatbot ID (can be different from original)
            organization_id: Organization UUID
            override_name: Optional name override (if None, uses original + " (Imported)")

        Returns:
            Created flow

        Raises:
            BadRequestException: If import data is invalid
            NotFoundException: If chatbot not found
        """
        import logging

        logger = logging.getLogger(__name__)

        # Validate import data format
        if "format_version" not in import_data or "flow" not in import_data:
            raise BadRequestException("Invalid import data format")

        format_version = import_data.get("format_version")
        if format_version != "1.0":
            raise BadRequestException(f"Unsupported format version: {format_version}")

        # Verify chatbot exists
        chatbot = await self.get_chatbot(chatbot_id, organization_id)
        if not chatbot:
            raise NotFoundException("Target chatbot not found")

        flow_data = import_data["flow"]

        # Prepare flow name
        flow_name = override_name or f"{flow_data.get('name', 'Imported Flow')} (Imported)"

        logger.info(f"📥 Importando flow '{flow_name}' para chatbot {chatbot_id}")

        # Create new flow
        new_flow_data = {
            "name": flow_name,
            "description": flow_data.get("description", ""),
            "chatbot_id": chatbot_id,
            "organization_id": organization_id,
            "is_main": False,  # Never import as main (user must set manually)
            "canvas_data": flow_data.get("canvas_data", {"nodes": [], "edges": []}),
            "variables": flow_data.get("variables", {}),
            "settings": flow_data.get("settings"),
        }

        new_flow = await self.flow_repo.create(new_flow_data)

        # Sync nodes to database
        if new_flow.canvas_data:
            await self._sync_nodes_from_canvas(
                flow_id=new_flow.id,
                organization_id=organization_id,
                canvas_data=new_flow.canvas_data
            )

        metadata = import_data.get("metadata", {})
        logger.info(
            f"✅ Flow importado com {metadata.get('total_nodes', 0)} nodes "
            f"(Original: {metadata.get('original_flow_id', 'unknown')})"
        )

        return new_flow
