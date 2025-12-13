"""
WhatsAppRouterService - Routes incoming messages to flows and manages conversation state.

Responsibilities:
- Extract message context (phone, flow_id, organization_id)
- Manage conversation state transitions
- Route to appropriate flow node
- Log all interactions

Author: Kayo Carvalho Fernandes
"""

import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConversationState, ConversationLog, Flow
from app.repositories.conversation_state_repository import ConversationStateRepository
from app.repositories.conversation_log_repository import ConversationLogRepository

logger = logging.getLogger(__name__)


class WhatsAppRouterService:
    """Routes incoming WhatsApp messages to flows and manages state."""

    def __init__(self, db: AsyncSession):
        """Initialize router with database session.
        
        Args:
            db: SQLAlchemy AsyncSession
        """
        self.db = db
        self.state_repo = ConversationStateRepository(db)
        self.log_repo = ConversationLogRepository(db)

    async def route_message(
        self,
        organization_id: UUID,
        phone_number: str,
        flow_id: UUID,
        user_message: str,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> tuple[Optional[ConversationState], str]:
        """Route incoming message to flow and return bot response.
        
        Args:
            organization_id: Organization UUID (multi-tenancy)
            phone_number: Customer WhatsApp number (e.g., "5511999999999")
            flow_id: Flow UUID to route to
            user_message: Customer's input text
            metadata: Additional context (e.g., contact profile, media info)
            
        Returns:
            Tuple of (ConversationState, bot_response_text)
            
        Raises:
            ValueError: If flow not found or invalid state
        """
        try:
            # 1. Get or create conversation state
            state, is_new = await self.state_repo.get_or_create(
                organization_id=organization_id,
                phone_number=phone_number,
                flow_id=flow_id,
            )

            # 2. Execute flow using FlowExecutor
            from app.services.flow_executor import FlowExecutor
            flow_executor = FlowExecutor(self.db)
            
            bot_response, updated_state = await flow_executor.execute_flow(
                organization_id=organization_id,
                flow_id=flow_id,
                current_state=state,
                user_message=user_message,
            )

            # 3. Log the interaction
            await self.log_repo.create(
                organization_id=organization_id,
                phone_number=phone_number,
                flow_id=flow_id,
                user_message=user_message,
                bot_response=bot_response,
                node_id=updated_state.current_node_id,
                extra_data=metadata or {},
            )

            # 4. Update state in database
            state = await self.state_repo.update(
                conversation_state_id=updated_state.id,
                organization_id=organization_id,
                current_node_id=updated_state.current_node_id,
                variables=updated_state.variables,
                execution_path=updated_state.execution_path,
            )

            await self.state_repo.commit()

            return state, bot_response

        except Exception as e:
            logger.error(f"Error routing message: {e}", exc_info=True)
            await self.state_repo.rollback()
            raise

    async def close_conversation(
        self,
        organization_id: UUID,
        conversation_state_id: UUID,
    ) -> Optional[ConversationState]:
        """Close active conversation.
        
        Args:
            organization_id: Organization UUID
            conversation_state_id: ConversationState UUID
            
        Returns:
            Closed ConversationState or None if not found
        """
        state = await self.state_repo.close(
            conversation_state_id=conversation_state_id,
            organization_id=organization_id,
        )
        
        if state:
            await self.state_repo.commit()
            logger.info(f"Closed conversation state {conversation_state_id}")
        
        return state

    async def get_conversation_history(
        self,
        organization_id: UUID,
        phone_number: str,
        flow_id: UUID,
        limit: int = 50,
    ) -> list[ConversationLog]:
        """Get recent conversation history (logs).
        
        Args:
            organization_id: Organization UUID
            phone_number: Customer WhatsApp number
            flow_id: Flow UUID
            limit: Max number of logs to return
            
        Returns:
            List of ConversationLog entries (newest first)
        """
        logs, total = await self.log_repo.get_by_phone(
            organization_id=organization_id,
            phone_number=phone_number,
            limit=limit,
            offset=0,
        )
        return logs

    async def handle_expired_sessions(self, organization_id: UUID) -> int:
        """Clean up expired conversation states.
        
        Args:
            organization_id: Organization UUID
            
        Returns:
            Number of sessions cleaned up
        """
        count = await self.state_repo.cleanup_expired(
            organization_id=organization_id
        )
        await self.state_repo.commit()
        logger.info(f"Cleaned up {count} expired conversation states for org {organization_id}")
        return count

    # ============= Internal Helper Methods =============

    async def _get_start_node(
        self,
        organization_id: UUID,
        flow_id: UUID,
    ) -> Optional[str]:
        """Get the start node ID for a flow.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            
        Returns:
            Start node ID or None if not found
        """
        from sqlalchemy import select
        from app.models import Flow
        
        query = select(Flow).where(
            (Flow.id == flow_id) & (Flow.organization_id == organization_id)
        )
        result = await self.db.execute(query)
        flow = result.scalar_one_or_none()
        
        if not flow:
            logger.warning(f"Flow {flow_id} not found")
            return None

        # Find START node in flow.nodes
        if hasattr(flow, 'nodes') and flow.nodes:
            for node in flow.nodes:
                if hasattr(node, 'type') and node.type == "START":
                    return str(node.id)

        logger.warning(f"No START node found in flow {flow_id}")
        return None

    async def validate_flow_exists(
        self,
        organization_id: UUID,
        flow_id: UUID,
    ) -> bool:
        """Validate that flow exists in organization.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            
        Returns:
            True if flow exists and is owned by organization
        """
        from sqlalchemy import select
        from app.models import Flow
        
        query = select(Flow).where(
            (Flow.id == flow_id) & (Flow.organization_id == organization_id)
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None
