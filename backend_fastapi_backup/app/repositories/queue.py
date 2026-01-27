"""
Queue repository for data access
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import and_, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.queue import Queue
from app.repositories.base import BaseRepository


class QueueRepository(BaseRepository[Queue]):
    """Repository for Queue operations"""

    def __init__(self, db: AsyncSession):
        # Initialize base repository with model and db session
        super().__init__(Queue, db)

    async def create(
        self,
        organization_id: UUID,
        department_id: UUID,
        name: str,
        slug: str,
        **kwargs,
    ) -> Queue:
        """Create a new queue"""
        queue = Queue(
            organization_id=organization_id,
            department_id=department_id,
            name=name,
            slug=slug,
            **kwargs,
        )
        self.db.add(queue)
        await self.db.commit()
        await self.db.refresh(queue)
        return queue

    async def get_by_id(
        self, queue_id: UUID, organization_id: UUID
    ) -> Optional[Queue]:
        """Get queue by ID (organization scoped)"""
        result = await self.db.execute(
            select(Queue)
            .where(Queue.id == queue_id)
            .where(Queue.organization_id == organization_id)
            .where(Queue.deleted_at.is_(None))
        )
        return result.scalars().first()

    async def get_by_slug(
        self, slug: str, organization_id: UUID, department_id: Optional[UUID] = None
    ) -> Optional[Queue]:
        """Get queue by slug (organization scoped)"""
        query = (
            select(Queue)
            .where(Queue.slug == slug)
            .where(Queue.organization_id == organization_id)
            .where(Queue.deleted_at.is_(None))
        )

        if department_id:
            query = query.where(Queue.department_id == department_id)

        result = await self.db.execute(query)
        return result.scalars().first()

    async def list_queues(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Queue]:
        """List queues with filters"""
        query = (
            select(Queue)
            .where(Queue.organization_id == organization_id)
            .where(Queue.deleted_at.is_(None))
        )

        # Filters
        if department_id:
            query = query.where(Queue.department_id == department_id)

        if is_active is not None:
            query = query.where(Queue.is_active == is_active)

        if search:
            search_pattern = f"%{search}%"
            query = query.where(
                or_(
                    Queue.name.ilike(search_pattern),
                    Queue.description.ilike(search_pattern),
                    Queue.slug.ilike(search_pattern),
                )
            )

        # Order by priority (desc) and name (asc)
        query = query.order_by(Queue.priority.desc(), Queue.name.asc())

        # Pagination
        query = query.offset(skip).limit(limit)

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def count_queues(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count queues with filters"""
        query = select(func.count(Queue.id)).where(
            Queue.organization_id == organization_id
        ).where(Queue.deleted_at.is_(None))

        if department_id:
            query = query.where(Queue.department_id == department_id)

        if is_active is not None:
            query = query.where(Queue.is_active == is_active)

        result = await self.db.execute(query)
        return result.scalar() or 0

    async def update(self, queue_id: UUID, organization_id: UUID, **kwargs) -> Optional[Queue]:
        """Update queue"""
        queue = await self.get_by_id(queue_id, organization_id)
        if not queue:
            return None

        for key, value in kwargs.items():
            if hasattr(queue, key):
                setattr(queue, key, value)

        await self.db.commit()
        await self.db.refresh(queue)
        return queue

    async def delete(self, queue_id: UUID, organization_id: UUID) -> bool:
        """Soft delete queue"""
        from datetime import datetime

        queue = await self.get_by_id(queue_id, organization_id)
        if not queue:
            return False

        queue.deleted_at = datetime.utcnow()
        await self.db.commit()
        return True

    async def bulk_delete(self, queue_ids: List[UUID], organization_id: UUID) -> int:
        """Soft delete multiple queues"""
        from datetime import datetime
        from sqlalchemy import update

        result = await self.db.execute(
            update(Queue)
            .where(Queue.id.in_(queue_ids))
            .where(Queue.organization_id == organization_id)
            .where(Queue.deleted_at.is_(None))
            .values(deleted_at=datetime.utcnow())
        )
        await self.db.commit()
        return result.rowcount or 0

    async def update_statistics(
        self,
        queue_id: UUID,
        organization_id: UUID,
        total_conversations: Optional[int] = None,
        active_conversations: Optional[int] = None,
        queued_conversations: Optional[int] = None,
        completed_conversations: Optional[int] = None,
    ) -> Optional[Queue]:
        """Update queue statistics"""
        queue = await self.get_by_id(queue_id, organization_id)
        if not queue:
            return None

        if total_conversations is not None:
            queue.total_conversations = total_conversations
        if active_conversations is not None:
            queue.active_conversations = active_conversations
        if queued_conversations is not None:
            queue.queued_conversations = queued_conversations
        if completed_conversations is not None:
            queue.completed_conversations = completed_conversations

        await self.db.commit()
        await self.db.refresh(queue)
        return queue

    async def get_next_queue_by_priority(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
    ) -> Optional[Queue]:
        """Get next available queue by priority"""
        query = (
            select(Queue)
            .where(Queue.organization_id == organization_id)
            .where(Queue.is_active == True)
            .where(Queue.deleted_at.is_(None))
            .where(Queue.queued_conversations > 0)
        )

        if department_id:
            query = query.where(Queue.department_id == department_id)

        # Order by priority (desc)
        query = query.order_by(Queue.priority.desc()).limit(1)

        result = await self.db.execute(query)
        return result.scalars().first()

    async def get_vip_queue(self, organization_id: UUID) -> Optional[Queue]:
        """
        Get the VIP queue for an organization.
        VIP queues are identified by settings.is_vip_queue = true.
        Returns the highest priority VIP queue if multiple exist.
        """
        query = (
            select(Queue)
            .where(Queue.organization_id == organization_id)
            .where(Queue.is_active == True)
            .where(Queue.deleted_at.is_(None))
            .where(Queue.settings["is_vip_queue"].astext == "true")
            .order_by(Queue.priority.desc())
            .limit(1)
        )

        result = await self.db.execute(query)
        return result.scalars().first()
