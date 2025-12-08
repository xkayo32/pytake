"""
Queue Queries
"""

from typing import Optional, List
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.queue import QueueType, QueueStats
from app.graphql.permissions import require_auth
from app.repositories.queue import QueueRepository
from app.repositories.conversation import ConversationRepository


@strawberry.type
class QueueQuery:
    """Queue-related queries"""

    @strawberry.field
    @require_auth
    async def queue(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> QueueType:
        """Get queue by ID"""
        context: GraphQLContext = info.context

        queue_repo = QueueRepository(context.db)
        queue = await queue_repo.get_by_id(UUID(id), context.organization_id)

        if not queue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue not found"
            )

        return QueueType(
            id=strawberry.ID(str(queue.id)),
            organization_id=strawberry.ID(str(queue.organization_id)),
            department_id=strawberry.ID(str(queue.department_id)),
            name=queue.name,
            slug=queue.slug,
            description=queue.description,
            color=queue.color,
            icon=queue.icon,
            is_active=queue.is_active,
            priority=queue.priority,
            sla_minutes=queue.sla_minutes,
            routing_mode=queue.routing_mode,
            auto_assign_conversations=queue.auto_assign_conversations,
            max_conversations_per_agent=queue.max_conversations_per_agent,
            created_at=queue.created_at,
            updated_at=queue.updated_at,
        )

    @strawberry.field
    @require_auth
    async def queues(
        self,
        info: Info[GraphQLContext, None],
        department_id: Optional[strawberry.ID] = None,
        is_active: Optional[bool] = None,
    ) -> List[QueueType]:
        """List queues with filters"""
        context: GraphQLContext = info.context

        queue_repo = QueueRepository(context.db)

        if department_id:
            queues = await queue_repo.get_by_department(UUID(department_id), context.organization_id)
        else:
            queues = await queue_repo.get_by_organization(context.organization_id)

        if is_active is not None:
            queues = [q for q in queues if q.is_active == is_active]

        return [
            QueueType(
                id=strawberry.ID(str(q.id)),
                organization_id=strawberry.ID(str(q.organization_id)),
                department_id=strawberry.ID(str(q.department_id)),
                name=q.name,
                slug=q.slug,
                description=q.description,
                color=q.color,
                icon=q.icon,
                is_active=q.is_active,
                priority=q.priority,
                sla_minutes=q.sla_minutes,
                routing_mode=q.routing_mode,
                auto_assign_conversations=q.auto_assign_conversations,
                max_conversations_per_agent=q.max_conversations_per_agent,
                created_at=q.created_at,
                updated_at=q.updated_at,
            )
            for q in queues
        ]

    @strawberry.field
    @require_auth
    async def queue_stats(
        self,
        info: Info[GraphQLContext, None],
        queue_id: strawberry.ID,
    ) -> QueueStats:
        """Get queue statistics"""
        context: GraphQLContext = info.context

        queue_repo = QueueRepository(context.db)
        queue = await queue_repo.get_by_id(UUID(queue_id), context.organization_id)

        if not queue:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue not found"
            )

        # Get queue statistics from model
        return QueueStats(
            total_conversations=queue.total_conversations,
            active_conversations=queue.active_conversations,
            queued_conversations=queue.queued_conversations,
            completed_conversations=queue.completed_conversations,
            average_wait_time_seconds=queue.average_wait_time_seconds,
        )
