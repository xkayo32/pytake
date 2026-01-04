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


@router.get("/me", response_model=Organization)
async def get_my_organization(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Get current user's organization
    
    **Description:** Retrieves the organization details for the currently authenticated user.
    
    **Returns:** Organization object with all configuration
    
    **Permissions Required:** Any authenticated user
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `404`: Organization not found
    - `500`: Database error
    """
    service = OrganizationService(db)
    org = await service.get_by_id(current_user.organization_id)
    return org


@router.get("/", response_model=List[Organization])
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


@router.get("/{org_id}", response_model=Organization)
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


@router.get("/{org_id}/stats", response_model=dict)
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


@router.put("/me", response_model=Organization)
async def update_my_organization(
    data: OrganizationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user's organization
    
    **Description:** Updates organization name, settings, billing info, and other configurations.
    
    **Request Body (all optional):**
    - `name` (string): New organization name
    - `domain` (string): Custom domain
    - `settings` (object): Organization settings
    
    **Returns:** Updated Organization object
    
    **Permissions Required:** org_admin or super_admin role
    
    **Possible Errors:**
    - `400`: Invalid update data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Organization not found
    - `409`: Domain already in use
    - `500`: Database error
    """
    if current_user.role not in ["org_admin", "super_admin"]:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Only organization admins can update organization")

    service = OrganizationService(db)
    return await service.update_organization(current_user.organization_id, data)


@router.put("/me/settings", response_model=Organization)
async def update_my_organization_settings(
    settings: OrganizationSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Update current user's organization settings

    **Description:** Updates organization-wide settings including WhatsApp window expiry,
    inactivity timeout, timezone, language, and notifications.

    **Request Body (all optional):**

    **WhatsApp & Flow Settings:**
    - `window_expiry` (object): Configuração global de janela 24h WhatsApp
      - `action`: "transfer" | "send_template" | "wait_customer"
      - `template_name`: Nome do template aprovado pela Meta
      - `send_warning`: bool - enviar aviso antes de expirar
      - `warning_at_hours`: 1-23 horas antes de expirar
      - `warning_template_name`: template para aviso

    - `inactivity` (object): Configuração global de timeout de inatividade
      - `enabled`: bool - habilitar timeout
      - `timeout_minutes`: minutos de inatividade
      - `action`: "transfer" | "close" | "send_reminder" | "fallback_flow"
      - `send_warning_at_minutes`: minutos antes do timeout
      - `warning_message`: mensagem de aviso

    **General Settings:**
    - `timezone` (string): Timezone (e.g., "America/Sao_Paulo")
    - `language` (string): Language (e.g., "pt-BR", "en-US")
    - `currency` (string): Currency (e.g., "BRL", "USD")
    - `business_hours` (object): Business hours configuration
    - `notification_settings` (object): Notification preferences
    - `security_settings` (object): Security configuration

    **Hierarchy:** Organization settings → Flow settings (flows can override)

    **Returns:** Updated Organization object

    **Permissions Required:** org_admin or super_admin role

    **Possible Errors:**
    - `400`: Invalid settings data
    - `401`: User not authenticated
    - `403`: Insufficient permissions
    - `404`: Organization not found
    - `500`: Database error

    **Example Request:**
    ```json
    {
      "window_expiry": {
        "action": "send_template",
        "template_name": "janela_expirada",
        "send_warning": true,
        "warning_at_hours": 22,
        "warning_template_name": "aviso_janela"
      },
      "inactivity": {
        "enabled": true,
        "timeout_minutes": 60,
        "action": "transfer"
      },
      "timezone": "America/Sao_Paulo",
      "language": "pt-BR"
    }
    ```
    """
    if current_user.role not in ["org_admin", "super_admin"]:
        from app.core.exceptions import ForbiddenException
        raise ForbiddenException("Only organization admins can update settings")

    service = OrganizationService(db)
    return await service.update_settings(current_user.organization_id, settings)


@router.put("/{org_id}", response_model=Organization)
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


@router.put("/{org_id}/plan", response_model=Organization)
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


@router.post("/{org_id}/activate", response_model=Organization)
async def activate_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Activate organization
    
    **Description:** Enables a previously deactivated organization and restores access for all users.
    
    **Path Parameters:**
    - `org_id` (UUID, required): Unique organization identifier
    
    **Returns:** Activated Organization object
    
    **Permissions Required:** super_admin role only
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `403`: Insufficient permissions (must be super_admin)
    - `404`: Organization not found
    - `409`: Organization already active
    - `500`: Database error
    """
    service = OrganizationService(db)
    return await service.activate(org_id)


@router.post("/{org_id}/deactivate", response_model=Organization)
async def deactivate_organization(
    org_id: UUID,
    current_user: User = Depends(get_current_super_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Deactivate organization
    
    **Description:** Disables an organization, restricting access for all users while preserving data.
    
    **Path Parameters:**
    - `org_id` (UUID, required): Unique organization identifier
    
    **Returns:** Deactivated Organization object
    
    **Permissions Required:** super_admin role only
    
    **Possible Errors:**
    - `401`: User not authenticated
    - `403`: Insufficient permissions (must be super_admin)
    - `404`: Organization not found
    - `409`: Organization already inactive
    - `500`: Database error
    """
    service = OrganizationService(db)
    return await service.deactivate(org_id)


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
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
