"""
FlowExecutor - Orchestrates multi-node flow execution for conversation state transitions.

Responsibilities:
- Execute flow nodes in sequence
- Handle node transitions (next_node_id logic)
- Manage variable accumulation across nodes
- Handle flow jumps and conversation endings

Author: Kayo Carvalho Fernandes
"""

import logging
from typing import Optional, Dict, Any, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Node, Flow, ConversationState
from app.services.node_executor import NodeExecutor

logger = logging.getLogger(__name__)


class FlowExecutor:
    """Executes flows and manages node state transitions."""

    MAX_ITERATIONS = 50  # Prevent infinite loops

    def __init__(self, db: AsyncSession):
        """Initialize flow executor.
        
        Args:
            db: SQLAlchemy AsyncSession
        """
        self.db = db
        self.node_executor = NodeExecutor(db)

    async def execute_flow(
        self,
        organization_id: UUID,
        flow_id: UUID,
        current_state: ConversationState,
        user_message: Optional[str] = None,
    ) -> tuple[str, ConversationState]:
        """Execute flow starting from current state and return bot response.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID to execute
            current_state: Current ConversationState
            user_message: User's input message (optional for first node)
            
        Returns:
            Tuple of (full_bot_response, updated_state)
            
        Raises:
            ValueError: If flow not found or invalid state
        """
        # 1. Load flow
        flow = await self._get_flow(organization_id, flow_id)
        if not flow:
            raise ValueError(f"Flow {flow_id} not found")

        # 2. Initialize execution state
        responses: List[str] = []
        variables = current_state.variables or {}
        execution_path = current_state.execution_path or []
        
        current_node_id = current_state.current_node_id
        if not current_node_id:
            # Start from flow's start node
            current_node_id = await self._get_start_node_id(flow)
            if not current_node_id:
                raise ValueError(f"Flow {flow_id} has no START node")

        # 3. Execute nodes in sequence (breadth-first, following next_node_id)
        iteration = 0
        user_input_consumed = False  # Track if we've used user_message

        while current_node_id and iteration < self.MAX_ITERATIONS:
            iteration += 1

            # Load node
            node = await self._get_node(organization_id, current_node_id)
            if not node:
                logger.warning(f"Node {current_node_id} not found")
                break

            # Execute node
            try:
                # Pass user_message only to first input node (QUESTION)
                msg_to_pass = None
                if not user_input_consumed and user_message and node.node_type == "question":
                    msg_to_pass = user_message
                    user_input_consumed = True

                response, next_node_id, updated_vars = await self.node_executor.execute(
                    node=node,
                    user_message=msg_to_pass,
                    variables=variables,
                )

                # Update variables
                variables = updated_vars or variables

                # Track execution path
                if str(node.id) not in execution_path:
                    execution_path.append(str(node.id))

                # Collect response if not empty
                if response:
                    responses.append(response)

                # Check for flow jump
                is_jump, target_flow_id = self.node_executor.is_flow_jump(next_node_id)
                if is_jump:
                    logger.info(f"Flow jump to {target_flow_id}")
                    # TODO: Implement flow jump logic
                    break

                # Check for conversation end
                if self.node_executor.is_conversation_end(next_node_id):
                    logger.info("Conversation ended")
                    break

                # Check if node expects user input (QUESTION without response yet)
                if node.node_type == "question" and not msg_to_pass and iteration == 1:
                    # QUESTION node waiting for input - don't proceed to next_node
                    current_node_id = node.id
                    break

                # Move to next node
                current_node_id = next_node_id
                if not current_node_id:
                    # No next node specified, flow ends
                    break

            except Exception as e:
                logger.error(f"Error executing node {current_node_id}: {e}", exc_info=True)
                responses.append("Desculpe, ocorreu um erro. Tente novamente.")
                break

        if iteration >= self.MAX_ITERATIONS:
            logger.warning(f"Flow execution exceeded {self.MAX_ITERATIONS} iterations")
            responses.append("Fluxo complexo detectado. Encerrando.")

        # 4. Prepare response
        full_response = "\n".join(filter(None, responses))
        if not full_response:
            full_response = "..."

        # 5. Update conversation state
        current_state.current_node_id = current_node_id
        current_state.variables = variables
        current_state.execution_path = execution_path

        logger.info(f"Flow executed: {iteration} iterations, current_node: {current_node_id}")

        return full_response, current_state

    async def execute_node_directly(
        self,
        organization_id: UUID,
        node_id: UUID,
        user_message: Optional[str] = None,
        variables: Optional[Dict[str, Any]] = None,
    ) -> tuple[str, Optional[str], Dict[str, Any]]:
        """Execute a single node directly (for testing/debugging).
        
        Args:
            organization_id: Organization UUID
            node_id: Node UUID to execute
            user_message: User input (optional)
            variables: Context variables
            
        Returns:
            Tuple of (response, next_node_id, updated_variables)
        """
        node = await self._get_node(organization_id, node_id)
        if not node:
            raise ValueError(f"Node {node_id} not found")

        return await self.node_executor.execute(
            node=node,
            user_message=user_message,
            variables=variables or {},
        )

    # ============= Internal Helper Methods =============

    async def _get_flow(
        self,
        organization_id: UUID,
        flow_id: UUID,
    ) -> Optional[Flow]:
        """Get flow from database.
        
        Args:
            organization_id: Organization UUID (for security)
            flow_id: Flow UUID
            
        Returns:
            Flow instance or None
        """
        query = select(Flow).where(
            (Flow.id == flow_id) & (Flow.organization_id == organization_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_node(
        self,
        organization_id: UUID,
        node_id: UUID,
    ) -> Optional[Node]:
        """Get node from database.
        
        Args:
            organization_id: Organization UUID (for security)
            node_id: Node UUID
            
        Returns:
            Node instance or None
        """
        query = select(Node).where(
            (Node.id == node_id) & (Node.organization_id == organization_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def _get_start_node_id(self, flow: Flow) -> Optional[UUID]:
        """Get start node ID from flow.
        
        Args:
            flow: Flow instance
            
        Returns:
            Start node UUID or None
        """
        if not hasattr(flow, 'nodes') or not flow.nodes:
            return None

        for node in flow.nodes:
            if node.node_type == "start":
                return node.id

        return None

    async def _find_node_by_id(
        self,
        organization_id: UUID,
        node_id,  # Can be UUID or str
    ) -> Optional[Node]:
        """Find node by ID (handles both UUID and string ID).
        
        Args:
            organization_id: Organization UUID
            node_id: Node UUID or string ID
            
        Returns:
            Node instance or None
        """
        try:
            # Try as UUID
            from uuid import UUID as UUIDType
            if isinstance(node_id, str):
                node_id = UUIDType(node_id)
            return await self._get_node(organization_id, node_id)
        except (ValueError, TypeError):
            # If not UUID, it might be node_id string field
            query = select(Node).where(
                (Node.organization_id == organization_id) &
                (Node.node_id == str(node_id))
            )
            result = await self.db.execute(query)
            return result.scalar_one_or_none()
