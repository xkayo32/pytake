"""
Queue Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.queue import QueueType, QueueCreateInput, QueueUpdateInput
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth, require_role
from app.repositories.queue import QueueRepository
from app.schemas.queue import QueueCreate, QueueUpdate


@strawberry.type
class QueueMutation:
    """Queue-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_queue(
        self,
        info: Info[GraphQLContext, None],
        input: QueueCreateInput,
    ) -> QueueType:
        """Create new queue"""
        context: GraphQLContext = info.context

        queue_repo = QueueRepository(context.db)

        queue_data = QueueCreate(
            department_id=UUID(input.department_id),
            name=input.name,
            slug=input.slug,
            description=input.description,
            color=input.color,
            icon=input.icon,
            priority=input.priority,
            sla_minutes=input.sla_minutes,
            routing_mode=input.routing_mode,
            auto_assign_conversations=input.auto_assign_conversations,
            max_conversations_per_agent=input.max_conversations_per_agent,
            organization_id=context.organization_id,
        )

        queue = await queue_repo.create(queue_data, context.organization_id)

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

    @strawberry.mutation
    @require_role("org_admin")
    async def update_queue(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: QueueUpdateInput,
    ) -> QueueType:
        """Update queue"""
        context: GraphQLContext = info.context

        queue_repo = QueueRepository(context.db)

        update_data = QueueUpdate(
            name=input.name,
            description=input.description,
            color=input.color,
            icon=input.icon,
            is_active=input.is_active,
            priority=input.priority,
            sla_minutes=input.sla_minutes,
            routing_mode=input.routing_mode,
            auto_assign_conversations=input.auto_assign_conversations,
            max_conversations_per_agent=input.max_conversations_per_agent,
        )

        queue = await queue_repo.update(UUID(id), update_data, context.organization_id)

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

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_queue(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete queue (soft delete)"""
        context: GraphQLContext = info.context

        queue_repo = QueueRepository(context.db)
        success = await queue_repo.delete(UUID(id), context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Queue not found"
            )

        return SuccessResponse(
            success=True,
            message="Queue deleted successfully"
        )
