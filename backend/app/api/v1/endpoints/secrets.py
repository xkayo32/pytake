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


@router.get(
    "/",
    response_model=List[SecretInDB],
    summary="Listar secrets",
    description="Lista todos os secrets da organização. Valores não são descriptografados.",
    responses={
        200: {"description": "Lista de secrets"},
        401: {"description": "Não autenticado"}
    }
)
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
    
    Note: Returns secrets without decrypted values for security.
    Use GET /secrets/{id}/value to retrieve decrypted value.
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


@router.post(
    "/",
    response_model=SecretInDB,
    status_code=status.HTTP_201_CREATED,
    summary="Criar secret",
    description="Cria um novo secret criptografado. Requer org_admin ou super_admin.",
    responses={
        201: {"description": "Secret criado"},
        400: {"description": "Dados inválidos"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"}
    }
)
async def create_secret(
    data: SecretCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create a new encrypted secret
    
    Requires: org_admin or super_admin role
    
    The `value` field will be encrypted using the specified encryption provider
    (defaults to Fernet) and never stored in plaintext.
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


@router.get(
    "/{secret_id}",
    response_model=SecretInDB,
    summary="Obter secret por ID",
    description="Retorna um secret sem o valor descriptografado.",
    responses={
        200: {"description": "Dados do secret"},
        401: {"description": "Não autenticado"},
        404: {"description": "Secret não encontrado"}
    }
)
async def get_secret(
    secret_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get secret by ID (without decrypted value)
    
    Use GET /secrets/{id}/value to retrieve the decrypted value.
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


@router.get(
    "/{secret_id}/value",
    response_model=SecretWithValue,
    summary="Obter valor do secret",
    description="Retorna o secret com valor descriptografado. Requer org_admin ou super_admin. ⚠️ USE COM CUIDADO.",
    responses={
        200: {"description": "Secret com valor"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Secret não encontrado"}
    }
)
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


@router.put(
    "/{secret_id}",
    response_model=SecretInDB,
    summary="Atualizar secret",
    description="Atualiza um secret. Se value for fornecido, será re-criptografado. Requer org_admin.",
    responses={
        200: {"description": "Secret atualizado"},
        400: {"description": "Dados inválidos"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Secret não encontrado"}
    }
)
async def update_secret(
    secret_id: UUID,
    data: SecretUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update secret
    
    Requires: org_admin or super_admin role
    
    If `value` is provided, it will be re-encrypted with the current encryption provider.
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


@router.delete(
    "/{secret_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir secret",
    description="Exclui permanentemente um secret. ⚠️ Hard delete - valor será removido. Requer org_admin.",
    responses={
        204: {"description": "Secret excluído"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Secret não encontrado"}
    }
)
async def delete_secret(
    secret_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete secret permanently
    
    Requires: org_admin or super_admin role
    
    ⚠️ WARNING: This is a hard delete. The encrypted value will be permanently removed.
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


@router.post(
    "/{secret_id}/rotate",
    response_model=SecretInDB,
    summary="Rotacionar secret",
    description="Rotaciona o valor de um secret (atualiza com novo valor criptografado). Requer org_admin.",
    responses={
        200: {"description": "Secret rotacionado"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Secret não encontrado"}
    }
)
async def rotate_secret(
    secret_id: UUID,
    new_value: str = Query(..., min_length=1, description="New plaintext value"),
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Rotate secret value (update with new encrypted value)
    
    Requires: org_admin or super_admin role
    
    This is a specialized endpoint for rotating credentials without changing metadata.
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


@router.get(
    "/stats",
    response_model=dict,
    summary="Estatísticas de secrets",
    description="Retorna estatísticas de secrets da organização.",
    responses={
        200: {"description": "Estatísticas"},
        401: {"description": "Não autenticado"}
    }
)
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
