"""
GraphQL Permissions and Access Control
"""

from typing import Any, Callable
from functools import wraps

import strawberry
from strawberry.types import Info

from app.graphql.context import GraphQLContext


def require_auth(func: Callable) -> Callable:
    """
    Decorator to require authentication for GraphQL resolver

    Usage:
        @strawberry.field
        @require_auth
        async def my_field(self, info: Info) -> str:
            context: GraphQLContext = info.context
            return f"Hello {context.user.name}"
    """
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # Get info parameter
        info = kwargs.get('info') or (args[1] if len(args) > 1 else None)

        if not info or not isinstance(info.context, GraphQLContext):
            raise ValueError("Invalid GraphQL context")

        context: GraphQLContext = info.context

        if not context.user:
            raise ValueError("Authentication required")

        return await func(*args, **kwargs)

    return wrapper


def require_role(*allowed_roles: str):
    """
    Decorator to require specific role(s) for GraphQL resolver

    Args:
        *allowed_roles: Allowed role names (e.g., "org_admin", "agent")

    Usage:
        @strawberry.field
        @require_role("org_admin")
        async def delete_user(self, info: Info, user_id: str) -> bool:
            ...
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get info parameter
            info = kwargs.get('info') or (args[1] if len(args) > 1 else None)

            if not info or not isinstance(info.context, GraphQLContext):
                raise ValueError("Invalid GraphQL context")

            context: GraphQLContext = info.context

            if not context.user:
                raise ValueError("Authentication required")

            if context.user.role not in allowed_roles:
                raise ValueError(
                    f"Required role: {', '.join(allowed_roles)}. "
                    f"Your role: {context.user.role}"
                )

            return await func(*args, **kwargs)

        return wrapper

    return decorator


def check_organization_access(resource_org_id: str, context: GraphQLContext) -> None:
    """
    Check if user has access to resource based on organization_id

    Args:
        resource_org_id: Organization ID of the resource
        context: GraphQL context with user info

    Raises:
        PermissionError: If user doesn't belong to resource's organization
    """
    if str(context.organization_id) != str(resource_org_id):
        raise PermissionError(
            "Access denied: Resource belongs to different organization"
        )
