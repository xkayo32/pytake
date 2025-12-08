"""
Secrets Management Endpoints
Handles encrypted storage for API keys, passwords, and sensitive data
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db, get_current_admin
from app.models.user import User
from app.models.secret import SecretScope
from app.schemas.secret import (
    Secret as SecretSchema,
    SecretCreate,
    SecretUpdate,
    SecretInDB,
    SecretWithValue,
)
from app.services.secret_service import SecretService

router = APIRouter()


@router.get("/", response_model=List[SecretInDB])
async def list_secrets(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    scope: Optional[SecretScope] = None,
    chatbot_id: Optional[UUID] = None,
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List all secrets in organization
    
    **Description:** Retrieves encrypted secrets without decrypted values for security. Use GET /secrets/{id}/value to retrieve decrypted value.
    
    **Query Parameters:**
    - `skip` (int, default: 0): Offset for pagination
    - `limit` (int, default: 100, max: 100): Records per page
    - `scope` (SecretScope, optional): Filter by scope (global, chatbot, contact, etc.)
    - `chatbot_id` (UUID, optional): Filter by chatbot association
    - `is_active` (boolean, optional): Filter by active status
    
    **Returns:** Array of SecretInDB objects (encrypted values not included)
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `500`: Database error
    """
    service = SecretService(db)
    
    # Build filters
    filters = {"organization_id": current_user.organization_id}
    if scope:
        filters["scope"] = scope
    if chatbot_id:
        filters["chatbot_id"] = chatbot_id
    if is_active is not None:
        filters["is_active"] = is_active
    
    return await service.list_secrets(
        filters=filters,
        skip=skip,
        limit=limit,
    )


@router.post("/", response_model=SecretInDB, status_code=status.HTTP_201_CREATED)
async def create_secret(
    data: SecretCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new encrypted secret
    
    **Description:** Creates an encrypted secret for storing API keys, passwords, and sensitive data. Values are encrypted using Fernet or specified provider.
    
    **Request Body:**
    - `name` (string, required): Internal identifier (no spaces)
    - `display_name` (string, required): Human-readable name
    - `value` (string, required): Plaintext value (will be encrypted)
    - `scope` (SecretScope, required): Scope (global, chatbot, contact, etc.)
    - `chatbot_id` (UUID, optional): Associated chatbot ID if scope is chatbot
    - `description` (string, optional): Purpose/notes
    - `encryption_provider` (string, default: "fernet"): Encryption algorithm
    
    **Returns:** Created SecretInDB (encrypted)
    
    **Permissions Required:** org_admin or super_admin role
    
    **Possible Errors:**
    - `400`: Invalid secret data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `500`: Encryption error
    """
    service = SecretService(db)
    
    try:
        return await service.create_secret(
            organization_id=current_user.organization_id,
            name=data.name,
            display_name=data.display_name,
            value=data.value,
            scope=data.scope,
            chatbot_id=data.chatbot_id,
            description=data.description,
            metadata=data.secret_metadata,
            encryption_provider=data.encryption_provider,
            encryption_key_id=data.encryption_key_id,
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create secret: {str(e)}",
        )


@router.get("/{secret_id}", response_model=SecretInDB)
async def get_secret(
    secret_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get secret by ID (without decrypted value)
    
    **Description:** Retrieves secret metadata without exposing encrypted value. Use GET /secrets/{id}/value to retrieve the decrypted value.
    
    **Path Parameters:**
    - `secret_id` (UUID, required): Unique secret identifier
    
    **Returns:** SecretInDB object (without decrypted value)
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Secret not found
    - `500`: Database error
    """
    service = SecretService(db)
    
    secret = await service.get_secret(
        secret_id=secret_id,
        organization_id=current_user.organization_id,
    )
    
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found",
        )
    
    return secret


@router.get("/{secret_id}/value", response_model=SecretWithValue)
async def get_secret_value(
    secret_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get secret with decrypted value
    
    Requires: org_admin or super_admin role
    
    ⚠️ SECURITY WARNING: This endpoint returns the decrypted value.
    Use with caution and ensure proper access controls.
    """
    service = SecretService(db)
    
    try:
        secret_with_value = await service.get_secret_with_value(
            secret_id=secret_id,
            organization_id=current_user.organization_id,
        )
        
        if not secret_with_value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )
        
        return secret_with_value
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to decrypt secret: {str(e)}",
        )


@router.put("/{secret_id}", response_model=SecretInDB)
async def update_secret(
    secret_id: UUID,
    data: SecretUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update secret
    
    **Description:** Updates secret metadata and/or value. If value is provided, it will be re-encrypted.
    
    **Path Parameters:**
    - `secret_id` (UUID, required): Unique secret identifier
    
    **Request Body (all optional):**
    - `display_name` (string): New display name
    - `description` (string): Updated description
    - `value` (string): New plaintext value (will be re-encrypted)
    - `is_active` (boolean): Active status
    
    **Returns:** Updated SecretInDB
    
    **Permissions Required:** org_admin or super_admin role
    
    **Possible Errors:**
    - `400`: Invalid update data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Secret not found
    - `500`: Encryption error
    """
    service = SecretService(db)
    
    try:
        updated = await service.update_secret(
            secret_id=secret_id,
            organization_id=current_user.organization_id,
            display_name=data.display_name,
            description=data.description,
            value=data.value,
            is_active=data.is_active,
            metadata=data.secret_metadata,
        )
        
        if not updated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )
        
        return updated
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update secret: {str(e)}",
        )


@router.delete("/{secret_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_secret(
    secret_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete secret permanently
    
    **Description:** Permanently removes an encrypted secret. ⚠️ WARNING: This is a hard delete and cannot be reversed.
    
    **Path Parameters:**
    - `secret_id` (UUID, required): Unique secret identifier
    
    **Returns:** 204 No Content on success
    
    **Permissions Required:** org_admin or super_admin role
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Secret not found
    - `500`: Database error
    """
    service = SecretService(db)
    
    deleted = await service.delete_secret(
        secret_id=secret_id,
        organization_id=current_user.organization_id,
    )
    
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Secret not found",
        )
    
    return None


@router.post("/{secret_id}/rotate", response_model=SecretInDB)
async def rotate_secret(
    secret_id: UUID,
    new_value: str = Query(..., min_length=1, description="New plaintext value"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Rotate secret value (update with new encrypted value)
    
    **Description:** Specialized endpoint for rotating credentials without changing metadata. Encrypts new value and preserves all other secret properties.
    
    **Path Parameters:**
    - `secret_id` (UUID, required): Unique secret identifier
    
    **Query Parameters:**
    - `new_value` (string, required): New plaintext value to encrypt
    
    **Returns:** Updated SecretInDB with new encrypted value
    
    **Permissions Required:** org_admin or super_admin role
    
    **Possible Errors:**
    - `400`: Empty new_value
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Secret not found
    - `500`: Encryption error
    """
    service = SecretService(db)
    
    try:
        rotated = await service.rotate_secret(
            secret_id=secret_id,
            organization_id=current_user.organization_id,
            new_value=new_value,
        )
        
        if not rotated:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Secret not found",
            )
        
        return rotated
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to rotate secret: {str(e)}",
        )


@router.get("/stats", response_model=dict)
async def get_secrets_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get secrets statistics for organization
    """
    service = SecretService(db)
    
    return await service.get_stats(
        organization_id=current_user.organization_id,
    )
