"""
User Management Endpoints
"""

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user, get_db, get_current_admin
from app.models.user import User
from app.schemas.user import User as UserSchema, UserCreate, UserUpdate
from app.services.user_service import UserService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get(
    "/",
    response_model=List[UserSchema],
    summary="Listar usuários",
    description="Lista os usuários da organização com filtros opcionais por role e status.",
    responses={
        200: {"description": "Lista de usuários"},
        401: {"description": "Não autenticado"}
    }
)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    role: Optional[str] = Query(None, regex="^(org_admin|agent|viewer)$"),
    is_active: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List users in organization
    """
    service = UserService(db)
    return await service.list_users(
        organization_id=current_user.organization_id,
        skip=skip,
        limit=limit,
        role=role,
        is_active=is_active,
    )


@router.post(
    "/",
    response_model=UserSchema,
    status_code=status.HTTP_201_CREATED,
    summary="Criar usuário",
    description="Cria um novo usuário na organização. Requer org_admin ou super_admin.",
    responses={
        201: {"description": "Usuário criado"},
        400: {"description": "Email já existe"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"}
    }
)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Create new user in organization
    Requires: org_admin or super_admin role
    """
    service = UserService(db)
    return await service.create_user(
        data=data,
        organization_id=current_user.organization_id,
        created_by=current_user,
    )


@router.get(
    "/me",
    response_model=UserSchema,
    summary="Obter meu perfil",
    description="Retorna os dados do usuário atual autenticado.",
    responses={
        200: {"description": "Dados do usuário"},
        401: {"description": "Não autenticado"}
    }
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """
    Get current user profile
    """
    return current_user


@router.get(
    "/me/stats",
    response_model=dict,
    summary="Minhas estatísticas",
    description="Retorna estatísticas do usuário atual (atendimentos, mensagens, etc).",
    responses={
        200: {"description": "Estatísticas do usuário"},
        401: {"description": "Não autenticado"}
    }
)
async def get_my_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user statistics
    """
    service = UserService(db)
    return await service.get_user_stats(
        user_id=current_user.id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/me",
    response_model=UserSchema,
    summary="Atualizar meu perfil",
    description="Atualiza os dados do usuário atual. Não permite alterar o próprio role.",
    responses={
        200: {"description": "Perfil atualizado"},
        401: {"description": "Não autenticado"}
    }
)
async def update_my_profile(
    data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user profile
    Note: Cannot change own role
    """
    # Remove role from update if present
    update_data = data.model_copy()
    if hasattr(update_data, 'role'):
        update_data.role = None

    service = UserService(db)
    return await service.update_user(
        user_id=current_user.id,
        data=update_data,
        organization_id=current_user.organization_id,
        updated_by=current_user,
    )


@router.get(
    "/{user_id}",
    response_model=UserSchema,
    summary="Obter usuário por ID",
    description="Retorna os dados de um usuário específico da organização.",
    responses={
        200: {"description": "Dados do usuário"},
        401: {"description": "Não autenticado"},
        404: {"description": "Usuário não encontrado"}
    }
)
async def get_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user by ID
    """
    service = UserService(db)
    return await service.get_by_id(
        user_id=user_id,
        organization_id=current_user.organization_id,
    )


@router.get(
    "/{user_id}/stats",
    response_model=dict,
    summary="Estatísticas do usuário",
    description="Retorna estatísticas de um usuário específico.",
    responses={
        200: {"description": "Estatísticas do usuário"},
        401: {"description": "Não autenticado"},
        404: {"description": "Usuário não encontrado"}
    }
)
async def get_user_stats(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get user statistics
    """
    service = UserService(db)
    return await service.get_user_stats(
        user_id=user_id,
        organization_id=current_user.organization_id,
    )


@router.put(
    "/{user_id}",
    response_model=UserSchema,
    summary="Atualizar usuário",
    description="Atualiza os dados de um usuário. Requer org_admin ou super_admin.",
    responses={
        200: {"description": "Usuário atualizado"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Usuário não encontrado"}
    }
)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update user
    Requires: org_admin or super_admin role
    """
    service = UserService(db)
    return await service.update_user(
        user_id=user_id,
        data=data,
        organization_id=current_user.organization_id,
        updated_by=current_user,
    )


@router.post(
    "/{user_id}/activate",
    response_model=UserSchema,
    summary="Ativar usuário",
    description="Ativa um usuário desativado. Requer org_admin ou super_admin.",
    responses={
        200: {"description": "Usuário ativado"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Usuário não encontrado"}
    }
)
async def activate_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate user
    Requires: org_admin or super_admin role
    """
    service = UserService(db)
    return await service.activate_user(
        user_id=user_id,
        organization_id=current_user.organization_id,
        activated_by=current_user,
    )


@router.post(
    "/{user_id}/deactivate",
    response_model=UserSchema,
    summary="Desativar usuário",
    description="Desativa um usuário. Requer org_admin ou super_admin.",
    responses={
        200: {"description": "Usuário desativado"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Usuário não encontrado"}
    }
)
async def deactivate_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate user
    Requires: org_admin or super_admin role
    """
    service = UserService(db)
    return await service.deactivate_user(
        user_id=user_id,
        organization_id=current_user.organization_id,
        deactivated_by=current_user,
    )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir usuário",
    description="Exclui um usuário (soft delete). Requer org_admin ou super_admin.",
    responses={
        204: {"description": "Usuário excluído"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão"},
        404: {"description": "Usuário não encontrado"}
    }
)
async def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete user (soft delete)
    Requires: org_admin or super_admin role
    """
    service = UserService(db)
    await service.delete_user(
        user_id=user_id,
        organization_id=current_user.organization_id,
        deleted_by=current_user,
    )
    return None
