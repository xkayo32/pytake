"""
Flow Engine Service - Executes flows and handles node transitions
"""

import logging
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.chatbot import Node, Flow
from app.models.conversation import Conversation
from app.repositories.chatbot import FlowRepository
from app.repositories.conversation import ConversationRepository
from app.repositories.node import NodeRepository

logger = logging.getLogger(__name__)


class FlowEngineService:
    """Service for flow execution and node processing"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.flow_repo = FlowRepository(db)
        self.conversation_repo = ConversationRepository(db)
        self.node_repo = NodeRepository(db)

    async def execute_jump_to_flow(
        self,
        conversation_id: UUID,
        source_node_id: UUID,
        organization_id: UUID,
    ) -> Optional[Conversation]:
        """
        Execute a jump_to_flow node transition
        
        Args:
            conversation_id: Conversation being processed
            source_node_id: Current node that is a jump_to_flow type
            organization_id: Organization scope
            
        Returns:
            Updated Conversation or None if error
        """
        try:
            # Get conversation
            conversation = await self.conversation_repo.get_by_id(
                conversation_id, organization_id
            )
            if not conversation:
                logger.warning(f"Conversation {conversation_id} not found")
                return None

            # Get current node (jump node)
            node = await self.node_repo.get_by_id(source_node_id, organization_id)
            if not node:
                logger.warning(f"Node {source_node_id} not found")
                return None

            # Verify it's a jump_to_flow node
            if node.node_type != "jump_to_flow":
                logger.warning(
                    f"Node {source_node_id} is not a jump_to_flow node (type: {node.node_type})"
                )
                return None

            # Extract target flow ID from node.data
            target_flow_id_str = node.data.get("target_flow_id")
            if not target_flow_id_str:
                logger.warning(
                    f"Node {source_node_id} has no target_flow_id in data"
                )
                return None

            try:
                target_flow_id = UUID(target_flow_id_str)
            except (ValueError, TypeError):
                logger.warning(
                    f"Invalid target_flow_id in node {source_node_id}: {target_flow_id_str}"
                )
                return None

            # Get target flow
            target_flow = await self.flow_repo.get_by_id(
                target_flow_id, organization_id
            )
            if not target_flow:
                logger.warning(f"Target flow {target_flow_id} not found")
                return None

            # Find start node of target flow
            start_node = None
            for flow_node in target_flow.nodes:
                if flow_node.node_type == "start":
                    start_node = flow_node
                    break

            if not start_node:
                logger.warning(
                    f"Target flow {target_flow_id} has no start node"
                )
                # Still transition to flow but don't set current_node_id
                await self.conversation_repo.update(
                    conversation_id,
                    {"active_flow_id": target_flow_id},
                )
                return await self.conversation_repo.get_by_id(
                    conversation_id, organization_id
                )

            # Handle variable passing if configured
            source_variables = self._extract_source_variables(
                node.data, conversation.context_variables
            )

            # Update conversation
            update_data = {
                "active_flow_id": target_flow_id,
                "current_node_id": start_node.id,
            }

            # Merge variables if configured
            if source_variables:
                context_vars = conversation.context_variables or {}
                context_vars.update(source_variables)
                update_data["context_variables"] = context_vars

            await self.conversation_repo.update(conversation_id, update_data)

            # Get updated conversation
            updated_conversation = await self.conversation_repo.get_by_id(
                conversation_id, organization_id
            )

            logger.info(
                f"✅ Flow transition: {conversation.active_flow_id} → {target_flow_id} "
                f"(conversation: {conversation_id})"
            )

            return updated_conversation

        except Exception as e:
            logger.error(
                f"Error executing jump_to_flow for conversation {conversation_id}: {e}",
                exc_info=True,
            )
            return None

    def _extract_source_variables(
        self, node_data: Dict[str, Any], context_variables: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Extract variables to pass to target flow
        
        Node data format:
        {
            "target_flow_id": "uuid",
            "pass_variables": true,
            "variable_mapping": {
                "target_var_name": "{{source_var_name}}"
            }
        }
        """
        variables = {}
        
        if not node_data.get("pass_variables"):
            return variables

        context_variables = context_variables or {}
        variable_mapping = node_data.get("variable_mapping", {})

        if not variable_mapping:
            # If no explicit mapping, pass all variables
            return context_variables

        # Map variables according to configuration
        for target_var, source_expr in variable_mapping.items():
            # Handle template expressions like {{source_var_name}}
            if isinstance(source_expr, str) and source_expr.startswith("{{") and source_expr.endswith("}}"):
                source_var = source_expr[2:-2]  # Extract variable name
                if source_var in context_variables:
                    variables[target_var] = context_variables[source_var]
            else:
                # Direct value
                variables[target_var] = source_expr

        return variables

    async def find_next_node(
        self, flow_id: UUID, current_node_id: UUID, organization_id: UUID
    ) -> Optional[Node]:
        """
        Find next node to execute in flow
        (For future implementation of sequential node execution)
        """
        # TODO: Implement based on node.data connections
        # For now, this is placeholder for Phase 3+ enhancements
        pass

    async def execute_node(
        self, node: Node, conversation: Conversation, organization_id: UUID
    ) -> Optional[Dict[str, Any]]:
        """
        Execute a specific node and return result
        (For future implementation)
        """
        if node.node_type == "jump_to_flow":
            return await self.execute_jump_to_flow(
                conversation.id, node.id, organization_id
            )
        
        # TODO: Add handlers for other node types:
        # - message: Send message to contact
        # - question: Collect response
        # - condition: Evaluate condition and branch
        # - action: Execute action
        # - api_call: Call external API
        # - ai_prompt: Call AI model
        # - end: End flow
        # - handoff: Hand off to human

        logger.warning(f"No executor for node type: {node.node_type}")
        return None
