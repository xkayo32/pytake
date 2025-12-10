"""
GraphQL Context - Manages authentication, database session, and multi-tenancy
"""

from typing import Optional
from uuid import UUID

import strawberry
from fastapi import Request, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from strawberry.fastapi import BaseContext

from app.core.database import async_session
from app.core.security import decode_token
from app.models.user import User
from app.repositories.user import UserRepository


@strawberry.type
class Info:
    """GraphQL Info with custom context"""
    pass


class GraphQLContext(BaseContext):
    """
    GraphQL execution context

    Provides:
    - Database session (async)
    - Current authenticated user
    - Organization ID (multi-tenancy)
    - Request object
    """

    def __init__(
        self,
        request: Request,
        db: Optional[AsyncSession] = None,
        user: Optional[User] = None,
    ):
        self.request = request
        self.db = db
        self.user = user
        self._organization_id: Optional[UUID] = None

    @property
    def organization_id(self) -> UUID:
        """
        Get organization_id from authenticated user

        Raises:
            HTTPException: If user not authenticated or no organization_id
        """
        if not self.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        if not self.user.organization_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User has no organization"
            )

        return self.user.organization_id

    @property
    def user_id(self) -> UUID:
        """Get current user ID"""
        if not self.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        return self.user.id

    def require_role(self, *roles: str) -> None:
        """
        Require user to have one of the specified roles

        Args:
            *roles: Role names (e.g., "org_admin", "agent")

        Raises:
            HTTPException: If user doesn't have required role
        """
        if not self.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )

        if self.user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role: {', '.join(roles)}"
            )


async def get_graphql_context(request: Request) -> GraphQLContext:
    """
    Create GraphQL context for each request

    Extracts JWT token, authenticates user, creates DB session

    Args:
        request: FastAPI request object

    Returns:
        GraphQLContext with authenticated user and DB session
    """
    # Get authorization header
    authorization: Optional[str] = request.headers.get("Authorization")

    user = None
    db = None

    # Create database session (NOT closed until query completes)
    db = async_session()

    try:
        # Try to authenticate if token provided
        if authorization:
            try:
                # Extract token from "Bearer <token>"
                if not authorization.startswith("Bearer "):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid authorization header format"
                    )

                token = authorization.split(" ")[1]

                # Decode JWT token
                payload = decode_token(token)
                user_id = payload.get("sub")

                if not user_id:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token payload"
                    )

                # Get user from database
                user_repo = UserRepository(db)
                user = await user_repo.get(UUID(user_id))

                if not user or user.deleted_at is not None:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="User not found or deleted"
                    )

                if not user.is_active:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="User account is inactive"
                    )

            except HTTPException:
                raise
            except Exception as e:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Authentication failed: {str(e)}"
                )

        # Return context
        return GraphQLContext(
            request=request,
            db=db,
            user=user
        )
    except HTTPException:
        raise
    except Exception:
        await db.close()
        raise
