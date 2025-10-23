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

    async def get_queue_metrics(
        self, queue_id: UUID, organization_id: UUID, days: int = 30
    ) -> dict:
        """Get detailed metrics for a queue"""
        from datetime import datetime, timedelta
        from sqlalchemy import select, func, and_, case
        from app.models.conversation import Conversation
        from app.models.queue import Queue

        # Verify queue exists and belongs to organization
        queue = await self.repo.get(queue_id)
        if not queue or queue.organization_id != organization_id:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Queue not found")

        now = datetime.utcnow()
        period_start = now - timedelta(days=days)
        today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        last_7_days = now - timedelta(days=7)
        last_30_days = now - timedelta(days=30)

        # Base query for conversations in this queue
        base_query = select(Conversation).where(
            and_(
                Conversation.queue_id == queue_id,
                Conversation.deleted_at.is_(None)
            )
        )

        # Volume metrics
        total_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        total_conversations = total_result.scalar() or 0

        today_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.created_at >= today_start,
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        conversations_today = today_result.scalar() or 0

        last_7_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.created_at >= last_7_days,
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        conversations_last_7_days = last_7_result.scalar() or 0

        last_30_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.created_at >= last_30_days,
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        conversations_last_30_days = last_30_result.scalar() or 0

        # Current status
        queued_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.status == "queued",
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        queued_conversations = queued_result.scalar() or 0

        active_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.status.in_(["active", "open"]),
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        active_conversations = active_result.scalar() or 0

        # Time metrics (for period)
        time_metrics_result = await self.db.execute(
            select(
                func.avg(
                    func.extract('epoch', Conversation.assigned_at - Conversation.queued_at)
                ).label('avg_wait_time'),
                func.avg(
                    func.extract('epoch', Conversation.last_message_from_agent_at - Conversation.created_at)
                ).label('avg_response_time'),
                func.avg(
                    func.extract('epoch', Conversation.closed_at - Conversation.created_at)
                ).label('avg_resolution_time'),
            ).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.created_at >= period_start,
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        time_metrics = time_metrics_result.first()

        # SLA metrics
        sla_violations = 0
        sla_compliance_rate = None
        if queue.sla_minutes:
            sla_violations_result = await self.db.execute(
                select(func.count(Conversation.id)).where(
                    and_(
                        Conversation.queue_id == queue_id,
                        Conversation.queued_at.isnot(None),
                        Conversation.assigned_at.isnot(None),
                        func.extract('epoch', Conversation.assigned_at - Conversation.queued_at) > (queue.sla_minutes * 60),
                        Conversation.created_at >= period_start,
                        Conversation.deleted_at.is_(None)
                    )
                )
            )
            sla_violations = sla_violations_result.scalar() or 0
            
            # Calculate compliance rate
            total_with_sla_result = await self.db.execute(
                select(func.count(Conversation.id)).where(
                    and_(
                        Conversation.queue_id == queue_id,
                        Conversation.queued_at.isnot(None),
                        Conversation.assigned_at.isnot(None),
                        Conversation.created_at >= period_start,
                        Conversation.deleted_at.is_(None)
                    )
                )
            )
            total_with_sla = total_with_sla_result.scalar() or 0
            if total_with_sla > 0:
                sla_compliance_rate = ((total_with_sla - sla_violations) / total_with_sla) * 100

        # Resolution rate
        resolved_result = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.status.in_(["resolved", "closed"]),
                    Conversation.created_at >= period_start,
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        resolved_count = resolved_result.scalar() or 0
        period_total = await self.db.execute(
            select(func.count(Conversation.id)).where(
                and_(
                    Conversation.queue_id == queue_id,
                    Conversation.created_at >= period_start,
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        period_total_count = period_total.scalar() or 0
        resolution_rate = (resolved_count / period_total_count * 100) if period_total_count > 0 else None

        # Volume by hour (last 24h)
        volume_by_hour = []
        for hour in range(24):
            hour_start = now.replace(hour=hour, minute=0, second=0, microsecond=0) - timedelta(days=1)
            hour_end = hour_start + timedelta(hours=1)
            
            hour_result = await self.db.execute(
                select(func.count(Conversation.id)).where(
                    and_(
                        Conversation.queue_id == queue_id,
                        Conversation.created_at >= hour_start,
                        Conversation.created_at < hour_end,
                        Conversation.deleted_at.is_(None)
                    )
                )
            )
            count = hour_result.scalar() or 0
            volume_by_hour.append({"hour": hour, "count": count})

        # Overflow metrics (from extra_data.overflow_history)
        overflow_events = 0
        overflow_rate = None
        
        # Get all conversations in period that may have overflow history
        overflow_result = await self.db.execute(
            select(Conversation).where(
                and_(
                    Conversation.created_at >= period_start,
                    Conversation.extra_data.isnot(None),
                    Conversation.deleted_at.is_(None)
                )
            )
        )
        conversations_with_data = overflow_result.scalars().all()
        
        # Count overflow events from this queue
        for conv in conversations_with_data:
            if conv.extra_data and "overflow_history" in conv.extra_data:
                for overflow_entry in conv.extra_data["overflow_history"]:
                    if overflow_entry.get("original_queue_id") == str(queue_id):
                        overflow_events += 1
        
        # Calculate overflow rate (percentage of conversations that overflowed)
        if period_total_count > 0:
            overflow_rate = (overflow_events / period_total_count) * 100
        
        # Occupancy trend (average daily occupancy over period)
        occupancy_trend = []
        if queue.max_queue_size and queue.max_queue_size > 0:
            # Sample occupancy at end of each day in the period
            for day_offset in range(days):
                day_end = today_start - timedelta(days=day_offset)
                day_queued_result = await self.db.execute(
                    select(func.count(Conversation.id)).where(
                        and_(
                            Conversation.queue_id == queue_id,
                            Conversation.status == "queued",
                            Conversation.queued_at <= day_end,
                            Conversation.deleted_at.is_(None)
                        )
                    )
                )
                day_queued_count = day_queued_result.scalar() or 0
                occupancy_pct = round((day_queued_count / queue.max_queue_size) * 100, 1)
                occupancy_trend.append({
                    "day": day_end.date().isoformat(),
                    "queued": day_queued_count,
                    "capacity": queue.max_queue_size,
                    "occupancy_percent": occupancy_pct
                })
            # Reverse to show oldest first
            occupancy_trend.reverse()

        return {
            "queue_id": str(queue_id),
            "queue_name": queue.name,
            "total_conversations": total_conversations,
            "conversations_today": conversations_today,
            "conversations_last_7_days": conversations_last_7_days,
            "conversations_last_30_days": conversations_last_30_days,
            "queued_conversations": queued_conversations,
            "active_conversations": active_conversations,
            "average_wait_time_seconds": time_metrics[0] if time_metrics and time_metrics[0] else None,
            "average_response_time_seconds": time_metrics[1] if time_metrics and time_metrics[1] else None,
            "average_resolution_time_seconds": time_metrics[2] if time_metrics and time_metrics[2] else None,
            "median_wait_time_seconds": None,  # TODO: Implement median calculation
            "sla_minutes": queue.sla_minutes,
            "sla_compliance_rate": sla_compliance_rate,
            "sla_violations": sla_violations,
            "customer_satisfaction_score": None,  # TODO: Implement CSAT
            "resolution_rate": resolution_rate,
            "volume_by_hour": volume_by_hour,
            "overflow_events": overflow_events,
            "overflow_rate": overflow_rate,
            "occupancy_trend": occupancy_trend,
            "period_start": period_start.isoformat(),
            "period_end": now.isoformat(),
        }
