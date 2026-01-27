"""
Common GraphQL Types - Shared types used across multiple modules
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

import strawberry


@strawberry.type
class SuccessResponse:
    """Generic success response"""
    success: bool
    message: Optional[str] = None


@strawberry.type
class PaginationInfo:
    """Pagination metadata"""
    total: int
    skip: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool


@strawberry.input
class PaginationInput:
    """Pagination parameters"""
    skip: int = 0
    limit: int = 10


@strawberry.type
class TimestampFields:
    """Common timestamp fields for all models"""
    created_at: datetime
    updated_at: datetime


@strawberry.type
class SoftDeleteFields:
    """Soft delete field"""
    deleted_at: Optional[datetime] = None


@strawberry.input
class FilterInput:
    """Generic filter input"""
    query: Optional[str] = None
    is_active: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
