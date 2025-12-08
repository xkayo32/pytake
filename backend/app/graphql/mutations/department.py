"""
Department Mutations
"""

from uuid import UUID

import strawberry
from strawberry.types import Info
from fastapi import HTTPException, status

from app.graphql.context import GraphQLContext
from app.graphql.types.department import DepartmentType, DepartmentCreateInput, DepartmentUpdateInput
from app.graphql.types.common import SuccessResponse
from app.graphql.permissions import require_auth, require_role
from app.repositories.department import DepartmentRepository
from app.schemas.department import DepartmentCreate, DepartmentUpdate


@strawberry.type
class DepartmentMutation:
    """Department-related mutations"""

    @strawberry.mutation
    @require_role("org_admin")
    async def create_department(
        self,
        info: Info[GraphQLContext, None],
        input: DepartmentCreateInput,
    ) -> DepartmentType:
        """Create new department"""
        context: GraphQLContext = info.context

        dept_repo = DepartmentRepository(context.db)

        dept_data = DepartmentCreate(
            name=input.name,
            slug=input.slug,
            description=input.description,
            color=input.color,
            icon=input.icon,
            organization_id=context.organization_id,
        )

        dept = await dept_repo.create(dept_data, context.organization_id)

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

    @strawberry.mutation
    @require_role("org_admin")
    async def update_department(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
        input: DepartmentUpdateInput,
    ) -> DepartmentType:
        """Update department"""
        context: GraphQLContext = info.context

        dept_repo = DepartmentRepository(context.db)

        update_data = DepartmentUpdate(
            name=input.name,
            description=input.description,
            color=input.color,
            icon=input.icon,
            is_active=input.is_active,
        )

        dept = await dept_repo.update(UUID(id), update_data, context.organization_id)

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

    @strawberry.mutation
    @require_role("org_admin")
    async def delete_department(
        self,
        info: Info[GraphQLContext, None],
        id: strawberry.ID,
    ) -> SuccessResponse:
        """Delete department (soft delete)"""
        context: GraphQLContext = info.context

        dept_repo = DepartmentRepository(context.db)
        success = await dept_repo.delete(UUID(id), context.organization_id)

        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

        return SuccessResponse(
            success=True,
            message="Department deleted successfully"
        )
