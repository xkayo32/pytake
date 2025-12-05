"""
Department Queries
"""

from typing import Optional, List
from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.department import DepartmentType, DepartmentStats
from app.graphql.permissions import require_auth
from app.repositories.department import DepartmentRepository
from app.repositories.user import UserRepository
from app.repositories.queue import QueueRepository
from app.repositories.conversation import ConversationRepository


@strawberry.type
class DepartmentQuery:
    """Department-related queries"""

    @strawberry.field
    @require_auth
    async def department(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> DepartmentType:
        """Get department by ID"""
        context: GraphQLContext = info.context

        dept_repo = DepartmentRepository(context.db)
        dept = await dept_repo.get_by_id(UUID(id), context.organization_id)

        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

        return DepartmentType(
            id=strawberry.ID(str(dept.id)),
            organization_id=strawberry.ID(str(dept.organization_id)),
            name=dept.name,
            slug=dept.slug,
            description=dept.description,
            color=dept.color,
            icon=dept.icon,
            is_active=dept.is_active,
            created_at=dept.created_at,
            updated_at=dept.updated_at,
        )

    @strawberry.field
    @require_auth
    async def departments(
        self,
        info: Info[GraphQLContext, None],
        is_active: Optional[bool] = None,
    ) -> List[DepartmentType]:
        """List all departments in organization"""
        context: GraphQLContext = info.context

        dept_repo = DepartmentRepository(context.db)
        departments = await dept_repo.get_by_organization(context.organization_id)

        if is_active is not None:
            departments = [d for d in departments if d.is_active == is_active]

        return [
            DepartmentType(
                id=strawberry.ID(str(d.id)),
                organization_id=strawberry.ID(str(d.organization_id)),
                name=d.name,
                slug=d.slug,
                description=d.description,
                color=d.color,
                icon=d.icon,
                is_active=d.is_active,
                created_at=d.created_at,
                updated_at=d.updated_at,
            )
            for d in departments
        ]

    @strawberry.field
    @require_auth
    async def department_stats(
        self,
        info: Info[GraphQLContext, None],
        department_id: strawberry.ID,
    ) -> DepartmentStats:
        """Get department statistics"""
        context: GraphQLContext = info.context

        dept_repo = DepartmentRepository(context.db)
        dept = await dept_repo.get_by_id(UUID(department_id), context.organization_id)

        if not dept:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

        # Get stats from related entities
        user_repo = UserRepository(context.db)
        queue_repo = QueueRepository(context.db)
        conv_repo = ConversationRepository(context.db)

        users = await user_repo.get_by_organization(context.organization_id)
        dept_users = [u for u in users if u.department_id == dept.id]

        queues = await queue_repo.get_by_department(UUID(department_id), context.organization_id)

        # Get conversations for all queues in this department
        all_conversations = []
        for queue in queues:
            queue_convs = await conv_repo.get_by_queue(queue.id, context.organization_id)
            all_conversations.extend(queue_convs)

        active_convs = len([c for c in all_conversations if c.status == "active"])
        completed_convs = len([c for c in all_conversations if c.status == "closed"])

        return DepartmentStats(
            total_agents=len(dept_users),
            total_queues=len(queues),
            active_conversations=active_convs,
            completed_conversations=completed_convs,
        )
