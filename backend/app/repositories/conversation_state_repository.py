"""
ConversationStateRepository - Data access layer for conversation_states table.
Handles CRUD operations with organization_id filtering (multi-tenancy).

Author: Kayo Carvalho Fernandes
"""

from datetime import datetime, timedelta
from typing import Optional
from uuid import UUID

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConversationState


class ConversationStateRepository:
    """Repository for ConversationState model with multi-tenancy support."""

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session.
        
        Args:
            session: SQLAlchemy AsyncSession for database operations
        """
        self.session = session

    async def get_by_phone_and_flow(
        self,
        organization_id: UUID,
        phone_number: str,
        flow_id: UUID,
    ) -> Optional[ConversationState]:
        """Fetch conversation state by phone_number and flow_id within organization.
        
        Args:
            organization_id: Organization UUID (multi-tenancy filter)
            phone_number: WhatsApp phone number (e.g., "5511999999999")
            flow_id: Flow UUID
            
        Returns:
            ConversationState instance or None if not found
        """
        query = select(ConversationState).where(
            and_(
                ConversationState.organization_id == organization_id,
                ConversationState.phone_number == phone_number,
                ConversationState.flow_id == flow_id,
            )
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        organization_id: UUID,
        phone_number: str,
        flow_id: UUID,
    ) -> tuple[ConversationState, bool]:
        """Get existing conversation state or create a new one.
        
        Args:
            organization_id: Organization UUID
            phone_number: WhatsApp phone number
            flow_id: Flow UUID
            
        Returns:
            Tuple of (ConversationState instance, is_created: bool)
        """
        existing = await self.get_by_phone_and_flow(
            organization_id, phone_number, flow_id
        )
        
        if existing:
            return existing, False

        # Create new conversation state
        new_state = ConversationState(
            organization_id=organization_id,
            phone_number=phone_number,
            flow_id=flow_id,
            current_node_id=None,  # Will be set by router
            variables={},
            execution_path=[],
            is_active=True,
            session_expires_at=datetime.utcnow() + timedelta(hours=24),
        )
        self.session.add(new_state)
        await self.session.flush()  # Get the ID without committing
        return new_state, True

    async def update(
        self,
        conversation_state_id: UUID,
        organization_id: UUID,
        current_node_id: Optional[str] = None,
        variables: Optional[dict] = None,
        execution_path: Optional[list] = None,
        is_active: Optional[bool] = None,
    ) -> Optional[ConversationState]:
        """Update conversation state fields.
        
        Args:
            conversation_state_id: ConversationState UUID
            organization_id: Organization UUID (for security)
            current_node_id: Current flow node ID
            variables: Collected user variables/context
            execution_path: List of visited node IDs
            is_active: Whether conversation is still active
            
        Returns:
            Updated ConversationState or None if not found
        """
        query = select(ConversationState).where(
            and_(
                ConversationState.id == conversation_state_id,
                ConversationState.organization_id == organization_id,
            )
        )
        result = await self.session.execute(query)
        state = result.scalar_one_or_none()

        if not state:
            return None

        # Update fields only if provided
        if current_node_id is not None:
            state.current_node_id = current_node_id

        if variables is not None:
            state.variables = variables

        if execution_path is not None:
            state.execution_path = execution_path

        if is_active is not None:
            state.is_active = is_active

        # Reset session TTL on every update
        state.session_expires_at = datetime.utcnow() + timedelta(hours=24)
        state.last_message_at = datetime.utcnow()

        await self.session.flush()
        return state

    async def close(
        self,
        conversation_state_id: UUID,
        organization_id: UUID,
    ) -> Optional[ConversationState]:
        """Close conversation by setting is_active=False.
        
        Args:
            conversation_state_id: ConversationState UUID
            organization_id: Organization UUID (for security)
            
        Returns:
            Closed ConversationState or None if not found
        """
        return await self.update(
            conversation_state_id,
            organization_id,
            is_active=False,
        )

    async def cleanup_expired(self, organization_id: UUID) -> int:
        """Delete expired conversation states (session_expires_at < now).
        
        Args:
            organization_id: Organization UUID (cleanup scoped to org)
            
        Returns:
            Number of rows deleted
        """
        query = select(ConversationState).where(
            and_(
                ConversationState.organization_id == organization_id,
                ConversationState.session_expires_at < datetime.utcnow(),
                ConversationState.is_active == True,
            )
        )
        result = await self.session.execute(query)
        expired_states = result.scalars().all()

        count = len(expired_states)
        for state in expired_states:
            state.is_active = False
            state.session_expires_at = datetime.utcnow()

        if count > 0:
            await self.session.flush()

        return count

    async def get_active_conversations_by_flow(
        self,
        organization_id: UUID,
        flow_id: UUID,
        limit: int = 100,
    ) -> list[ConversationState]:
        """Get active conversations for a specific flow.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            limit: Maximum number of records to return
            
        Returns:
            List of active ConversationState instances
        """
        query = (
            select(ConversationState)
            .where(
                and_(
                    ConversationState.organization_id == organization_id,
                    ConversationState.flow_id == flow_id,
                    ConversationState.is_active == True,
                )
            )
            .order_by(desc(ConversationState.last_message_at))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def commit(self) -> None:
        """Commit pending changes to database."""
        await self.session.commit()

    async def rollback(self) -> None:
        """Rollback pending changes."""
        await self.session.rollback()
