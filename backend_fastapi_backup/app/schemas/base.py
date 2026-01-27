"""
Base Pydantic schemas with common fields
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class BaseSchema(BaseModel):
    """Base schema with common config"""

    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
        use_enum_values=True,
    )


class TimestampSchema(BaseSchema):
    """Schema with timestamp fields"""

    created_at: datetime
    updated_at: datetime


class IDSchema(BaseSchema):
    """Schema with ID field"""

    id: UUID


class IDTimestampSchema(IDSchema, TimestampSchema):
    """Schema with ID and timestamps"""

    pass


class SoftDeleteSchema(BaseSchema):
    """Schema with soft delete field"""

    deleted_at: Optional[datetime] = None


class PaginationParams(BaseModel):
    """Pagination query parameters"""

    skip: int = 0
    limit: int = 100

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "skip": 0,
                "limit": 100,
            }
        }
    )


class PaginatedResponse(BaseModel):
    """Paginated response wrapper"""

    items: list
    total: int
    skip: int
    limit: int
    has_more: bool

    @staticmethod
    def create(items: list, total: int, skip: int, limit: int):
        """Create paginated response"""
        return PaginatedResponse(
            items=items,
            total=total,
            skip=skip,
            limit=limit,
            has_more=(skip + limit) < total,
        )


class SuccessResponse(BaseModel):
    """Generic success response"""

    success: bool = True
    message: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": True,
                "message": "Operation completed successfully",
            }
        }
    )


class ErrorResponse(BaseModel):
    """Generic error response"""

    success: bool = False
    error: str
    details: Optional[dict] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "success": False,
                "error": "An error occurred",
                "details": {"field": "error message"},
            }
        }
    )
