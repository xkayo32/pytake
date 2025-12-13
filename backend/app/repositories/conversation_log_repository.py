"""
ConversationLogRepository - Data access layer for conversation_logs table.
Handles immutable audit trail of all conversation messages.

Author: Kayo Carvalho Fernandes
"""

from datetime import datetime
from typing import Optional
from uuid import UUID, uuid4

from sqlalchemy import and_, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ConversationLog


class ConversationLogRepository:
    """Repository for ConversationLog model with multi-tenancy support."""

    def __init__(self, session: AsyncSession):
        """Initialize repository with database session.
        
        Args:
            session: SQLAlchemy AsyncSession for database operations
        """
        self.session = session

    async def create(
        self,
        organization_id: UUID,
        phone_number: str,
        flow_id: UUID,
        bot_response: str,
        user_message: Optional[str] = None,
        node_id: Optional[str] = None,
        extra_data: Optional[dict] = None,
    ) -> ConversationLog:
        """Create a new conversation log entry (immutable).
        
        Args:
            organization_id: Organization UUID (multi-tenancy filter)
            phone_number: WhatsApp phone number (e.g., "5511999999999")
            flow_id: Flow UUID
            bot_response: Bot's response message text
            user_message: User's input message (optional)
            node_id: Current flow node ID (optional)
            extra_data: Additional context (dict, stored as JSONB)
            
        Returns:
            Created ConversationLog instance
        """
        log_entry = ConversationLog(
            id=uuid4(),
            organization_id=organization_id,
            phone_number=phone_number,
            flow_id=flow_id,
            user_message=user_message,
            bot_response=bot_response,
            node_id=node_id,
            timestamp=datetime.utcnow(),
            extra_data=extra_data or {},
        )
        self.session.add(log_entry)
        await self.session.flush()
        return log_entry

    async def get_by_phone(
        self,
        organization_id: UUID,
        phone_number: str,
        limit: int = 50,
        offset: int = 0,
    ) -> tuple[list[ConversationLog], int]:
        """Get conversation logs for a phone number within organization.
        
        Args:
            organization_id: Organization UUID (multi-tenancy filter)
            phone_number: WhatsApp phone number
            limit: Maximum records to return (pagination)
            offset: Number of records to skip (pagination)
            
        Returns:
            Tuple of (list of ConversationLog instances, total_count)
        """
        # Get total count
        count_query = select(ConversationLog).where(
            and_(
                ConversationLog.organization_id == organization_id,
                ConversationLog.phone_number == phone_number,
            )
        )
        count_result = await self.session.execute(
            select(ConversationLog).where(
                and_(
                    ConversationLog.organization_id == organization_id,
                    ConversationLog.phone_number == phone_number,
                )
            )
        )
        total_count = len(count_result.scalars().all())

        # Get paginated results, ordered by timestamp DESC (newest first)
        query = (
            select(ConversationLog)
            .where(
                and_(
                    ConversationLog.organization_id == organization_id,
                    ConversationLog.phone_number == phone_number,
                )
            )
            .order_by(desc(ConversationLog.timestamp))
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(query)
        logs = result.scalars().all()

        return logs, total_count

    async def get_by_flow(
        self,
        organization_id: UUID,
        flow_id: UUID,
        limit: int = 100,
        offset: int = 0,
    ) -> tuple[list[ConversationLog], int]:
        """Get conversation logs for a specific flow within organization.
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            limit: Maximum records to return
            offset: Number of records to skip
            
        Returns:
            Tuple of (list of ConversationLog instances, total_count)
        """
        # Get total count
        count_result = await self.session.execute(
            select(ConversationLog).where(
                and_(
                    ConversationLog.organization_id == organization_id,
                    ConversationLog.flow_id == flow_id,
                )
            )
        )
        total_count = len(count_result.scalars().all())

        # Get paginated results
        query = (
            select(ConversationLog)
            .where(
                and_(
                    ConversationLog.organization_id == organization_id,
                    ConversationLog.flow_id == flow_id,
                )
            )
            .order_by(desc(ConversationLog.timestamp))
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(query)
        logs = result.scalars().all()

        return logs, total_count

    async def get_by_node(
        self,
        organization_id: UUID,
        flow_id: UUID,
        node_id: str,
        limit: int = 50,
    ) -> list[ConversationLog]:
        """Get logs for a specific node in a flow (for analytics).
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            node_id: Flow node ID
            limit: Maximum records to return
            
        Returns:
            List of ConversationLog instances
        """
        query = (
            select(ConversationLog)
            .where(
                and_(
                    ConversationLog.organization_id == organization_id,
                    ConversationLog.flow_id == flow_id,
                    ConversationLog.node_id == node_id,
                )
            )
            .order_by(desc(ConversationLog.timestamp))
            .limit(limit)
        )
        result = await self.session.execute(query)
        return result.scalars().all()

    async def delete_by_flow(
        self,
        organization_id: UUID,
        flow_id: UUID,
    ) -> int:
        """Delete all logs for a flow (when flow is deleted).
        
        Args:
            organization_id: Organization UUID
            flow_id: Flow UUID
            
        Returns:
            Number of rows deleted
        """
        query = select(ConversationLog).where(
            and_(
                ConversationLog.organization_id == organization_id,
                ConversationLog.flow_id == flow_id,
            )
        )
        result = await self.session.execute(query)
        logs = result.scalars().all()

        count = len(logs)
        for log in logs:
            await self.session.delete(log)

        if count > 0:
            await self.session.flush()

        return count

    async def commit(self) -> None:
        """Commit pending changes to database."""
        await self.session.commit()

    async def rollback(self) -> None:
        """Rollback pending changes."""
        await self.session.rollback()
