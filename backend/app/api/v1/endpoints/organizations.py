"""
Organization Endpoints
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user, get_db, get_current_super_admin
from app.models.user import User
from app.schemas.organization import (
    Organization,
    OrganizationPlanUpdate,
    OrganizationSettingsUpdate,
    OrganizationUpdate,
    OrganizationWithStats,
)
from app.services.organization_service import OrganizationService
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.get(
    "/me",
    response_model=Organization,
    summary="Obter minha organização",
    description="Retorna os dados da organização do usuário atual.",
    responses={
        200: {"description": "Dados da organização"},
        401: {"description": "Não autenticado"}
    }
)
async def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's organization
    """
    service = OrganizationService(db)
    org = await service.get_by_id(current_user.organization_id)
    return org


@router.get(
    "/",
    response_model=List[Organization],
    summary="Listar organizações",
    description="Lista todas as organizações. Apenas Super Admin.",
    responses={
        200: {"description": "Lista de organizações"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"}
    }
)
async def list_organizations(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    List all organizations (Super Admin only)
    """
    service = OrganizationService(db)
    return await service.list_organizations(skip=skip, limit=limit, active_only=active_only)


@router.get(
    "/{org_id}",
    response_model=Organization,
    summary="Obter organização por ID",
    description="Retorna uma organização específica. Apenas Super Admin.",
    responses={
        200: {"description": "Dados da organização"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"},
        404: {"description": "Organização não encontrada"}
    }
)
async def get_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization by ID (Super Admin only)
    """
    service = OrganizationService(db)
    return await service.get_by_id(org_id)


@router.get(
    "/{org_id}/stats",
    response_model=dict,
    summary="Estatísticas da organização",
    description="Retorna estatísticas da organização (usuários, chatbots, mensagens). Apenas Super Admin.",
    responses={
        200: {"description": "Estatísticas da organização"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"},
        404: {"description": "Organização não encontrada"}
    }
)
async def get_organization_stats(
    org_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Get organization statistics (Super Admin only)
    """
    service = OrganizationService(db)
    return await service.get_stats(org_id)


@router.put(
    "/me",
    response_model=Organization,
    summary="Atualizar minha organização",
    description="Atualiza os dados da organização do usuário. Requer org_admin.",
    responses={
        200: {"description": "Organização atualizada"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas org_admin)"}
    }
)
async def update_my_organization(
    data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user's organization
    Requires: org_admin role
    """
    if current_user.role not in ["org_admin", "super_admin"]:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Only organization admins can update organization")

    service = OrganizationService(db)
    return await service.update_organization(current_user.organization_id, data)


@router.put(
    "/me/settings",
    response_model=Organization,
    summary="Atualizar configurações da organização",
    description="Atualiza as configurações da organização do usuário. Requer org_admin.",
    responses={
        200: {"description": "Configurações atualizadas"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas org_admin)"}
    }
)
async def update_my_organization_settings(
    settings: OrganizationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user's organization settings
    Requires: org_admin role
    """
    if current_user.role not in ["org_admin", "super_admin"]:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Only organization admins can update settings")

    service = OrganizationService(db)
    return await service.update_settings(current_user.organization_id, settings)


@router.put(
    "/{org_id}",
    response_model=Organization,
    summary="Atualizar organização",
    description="Atualiza uma organização específica. Apenas Super Admin.",
    responses={
        200: {"description": "Organização atualizada"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"},
        404: {"description": "Organização não encontrada"}
    }
)
async def update_organization(
    org_id: UUID,
    data: OrganizationUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update organization (Super Admin only)
    """
    service = OrganizationService(db)
    return await service.update_organization(org_id, data)


@router.put(
    "/{org_id}/plan",
    response_model=Organization,
    summary="Atualizar plano da organização",
    description="Atualiza o plano de uma organização (free, pro, enterprise). Apenas Super Admin.",
    responses={
        200: {"description": "Plano atualizado"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"},
        404: {"description": "Organização não encontrada"}
    }
)
async def update_organization_plan(
    org_id: UUID,
    plan_update: OrganizationPlanUpdate,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Update organization plan (Super Admin only)
    """
    service = OrganizationService(db)
    return await service.update_plan(org_id, plan_update)


@router.post(
    "/{org_id}/activate",
    response_model=Organization,
    summary="Ativar organização",
    description="Ativa uma organização desativada. Apenas Super Admin.",
    responses={
        200: {"description": "Organização ativada"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"},
        404: {"description": "Organização não encontrada"}
    }
)
async def activate_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate organization (Super Admin only)
    """
    service = OrganizationService(db)
    return await service.activate(org_id)


@router.post(
    "/{org_id}/deactivate",
    response_model=Organization,
    summary="Desativar organização",
    description="Desativa uma organização. Apenas Super Admin.",
    responses={
        200: {"description": "Organização desativada"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"},
        404: {"description": "Organização não encontrada"}
    }
)
async def deactivate_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate organization (Super Admin only)
    """
    service = OrganizationService(db)
    return await service.deactivate(org_id)


@router.delete(
    "/{org_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir organização",
    description="Exclui uma organização (soft delete). Apenas Super Admin.",
    responses={
        204: {"description": "Organização excluída"},
        401: {"description": "Não autenticado"},
        403: {"description": "Sem permissão (apenas super_admin)"},
        404: {"description": "Organização não encontrada"}
    }
)
async def delete_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Delete organization (Super Admin only)
    Soft delete - organization is marked as deleted but data is preserved
    """
    service = OrganizationService(db)
    await service.delete(org_id)
    return None
