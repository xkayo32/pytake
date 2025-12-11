"""
RBAC Schemas - Pydantic models for role and permission endpoints
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


# ============================================
# PERMISSION SCHEMAS
# ============================================


class PermissionBase(BaseModel):
    """Base schema for Permission"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    category: str = Field(default="general", min_length=1, max_length=50)


class PermissionCreate(PermissionBase):
    """Schema for creating a permission"""

    pass


class PermissionInDB(PermissionBase):
    """Schema for permission in database"""

    id: UUID
    organization_id: Optional[UUID]
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PermissionListResponse(BaseModel):
    """Response for permission list"""

    total: int
    items: List[PermissionInDB]


# ============================================
# ROLE SCHEMAS
# ============================================


class RoleBase(BaseModel):
    """Base schema for Role"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class RoleCreate(RoleBase):
    """Schema for creating a role"""

    pass


class RoleUpdate(BaseModel):
    """Schema for updating a role"""

    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = None


class RoleInDB(RoleBase):
    """Schema for role in database"""

    id: UUID
    organization_id: Optional[UUID]
    is_system: bool
    is_custom: bool
    is_active: bool
    permissions: List[PermissionInDB] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RoleListResponse(BaseModel):
    """Response for role list"""

    total: int
    items: List[RoleInDB]


# ============================================
# ROLE PERMISSION ASSIGNMENT
# ============================================


class RolePermissionAssign(BaseModel):
    """Schema for assigning permissions to role"""

    permission_ids: List[UUID] = Field(..., min_items=0, description="List of permission IDs to assign")
