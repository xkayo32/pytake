"""
Queue service for business logic
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.queue import QueueRepository
from app.schemas.queue import QueueCreate, QueueUpdate


class QueueService:
    """Service for Queue operations"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = QueueRepository(db)

    async def create_queue(
        self, organization_id: UUID, data: QueueCreate
    ) -> "Queue":
        """Create a new queue"""
        from app.models.queue import Queue

        # Check if slug already exists in this department
        existing = await self.repo.get_by_slug(
            data.slug, organization_id, data.department_id
        )
        if existing:
            from fastapi import HTTPException

            raise HTTPException(
                status_code=400,
                detail=f"Queue with slug '{data.slug}' already exists in this department",
            )

        return await self.repo.create(
            organization_id=organization_id,
            department_id=data.department_id,
            name=data.name,
            slug=data.slug,
            description=data.description,
            color=data.color,
            icon=data.icon,
            is_active=data.is_active,
            priority=data.priority,
            sla_minutes=data.sla_minutes,
            routing_mode=data.routing_mode,
            auto_assign_conversations=data.auto_assign_conversations,
            max_conversations_per_agent=data.max_conversations_per_agent,
            settings=data.settings,
        )

    async def get_queue(
        self, queue_id: UUID, organization_id: UUID
    ) -> Optional["Queue"]:
        """Get queue by ID"""
        return await self.repo.get_by_id(queue_id, organization_id)

    async def list_queues(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
    ) -> List["Queue"]:
        """List queues with filters"""
        return await self.repo.list_queues(
            organization_id=organization_id,
            department_id=department_id,
            is_active=is_active,
            search=search,
            skip=skip,
            limit=limit,
        )

    async def count_queues(
        self,
        organization_id: UUID,
        department_id: Optional[UUID] = None,
        is_active: Optional[bool] = None,
    ) -> int:
        """Count queues with filters"""
        return await self.repo.count_queues(
            organization_id=organization_id,
            department_id=department_id,
            is_active=is_active,
        )

    async def update_queue(
        self, queue_id: UUID, organization_id: UUID, data: QueueUpdate
    ) -> Optional["Queue"]:
        """Update queue"""
        # If updating slug, check if new slug exists
        if data.slug:
            queue = await self.repo.get_by_id(queue_id, organization_id)
            if not queue:
                return None

            existing = await self.repo.get_by_slug(
                data.slug, organization_id, queue.department_id
            )
            if existing and existing.id != queue_id:
                from fastapi import HTTPException

                raise HTTPException(
                    status_code=400,
                    detail=f"Queue with slug '{data.slug}' already exists in this department",
                )

        # Update queue
        update_data = data.model_dump(exclude_unset=True)
        return await self.repo.update(queue_id, organization_id, **update_data)

    async def delete_queue(self, queue_id: UUID, organization_id: UUID) -> bool:
        """Delete queue (soft delete)"""
        return await self.repo.delete(queue_id, organization_id)

    async def bulk_delete_queues(
        self, queue_ids: List[UUID], organization_id: UUID
    ) -> int:
        """Bulk delete queues"""
        return await self.repo.bulk_delete(queue_ids, organization_id)

    async def update_queue_stats(
        self,
        queue_id: UUID,
        organization_id: UUID,
        total_conversations: Optional[int] = None,
        active_conversations: Optional[int] = None,
        queued_conversations: Optional[int] = None,
        completed_conversations: Optional[int] = None,
    ) -> Optional["Queue"]:
        """Update queue statistics"""
        return await self.repo.update_statistics(
            queue_id=queue_id,
            organization_id=organization_id,
            total_conversations=total_conversations,
            active_conversations=active_conversations,
            queued_conversations=queued_conversations,
            completed_conversations=completed_conversations,
        )

    async def get_queue_by_slug(
        self, slug: str, organization_id: UUID, department_id: Optional[UUID] = None
    ) -> Optional["Queue"]:
        """Get queue by slug"""
        return await self.repo.get_by_slug(slug, organization_id, department_id)

    async def get_next_priority_queue(
        self, organization_id: UUID, department_id: Optional[UUID] = None
    ) -> Optional["Queue"]:
        """Get next queue with conversations by priority"""
        return await self.repo.get_next_queue_by_priority(
            organization_id, department_id
        )
