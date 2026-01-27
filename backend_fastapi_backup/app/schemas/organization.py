"""
Organization Schemas
"""

from datetime import datetime
from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, Field, field_validator


# ============================================
# ORGANIZATION GLOBAL SETTINGS SCHEMAS
# ============================================

class OrganizationWindowExpirySettings(BaseModel):
    """
    Configuração global de janela 24h WhatsApp (nível organização)

    Esta configuração é aplicada a TODOS os fluxos da organização,
    a menos que um fluxo específico tenha configuração própria.
    """

    action: Literal["transfer", "send_template", "wait_customer"] = Field(
        default="transfer",
        description=(
            "Ação padrão quando janela 24h expirar:\n"
            "- 'transfer': Transfere para agente humano silenciosamente\n"
            "- 'send_template': Envia template aprovado + transfere para humano\n"
            "- 'wait_customer': Apenas finaliza fluxo, aguarda cliente reabrir janela"
        )
    )

    template_name: Optional[str] = Field(
        default=None,
        description="Template padrão para enviar quando janela expirar"
    )

    send_warning: bool = Field(
        default=False,
        description="Enviar aviso antes da janela expirar?"
    )

    warning_at_hours: int = Field(
        default=22,
        ge=1,
        le=23,
        description="Horas antes do vencimento para enviar aviso"
    )

    warning_template_name: Optional[str] = Field(
        default=None,
        description="Template para aviso de vencimento"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "action": "send_template",
                "template_name": "janela_expirada",
                "send_warning": True,
                "warning_at_hours": 22,
                "warning_template_name": "aviso_janela_expirando"
            }
        }


class OrganizationInactivitySettings(BaseModel):
    """
    Configuração global de inatividade (nível organização)

    Esta configuração é aplicada a TODOS os fluxos da organização,
    a menos que um fluxo específico tenha configuração própria.
    """

    enabled: bool = Field(
        default=True,
        description="Habilitar timeout de inatividade globalmente?"
    )

    timeout_minutes: int = Field(
        default=60,
        ge=1,
        description="Tempo padrão de inatividade em minutos"
    )

    action: Literal["transfer", "close", "send_reminder", "fallback_flow"] = Field(
        default="transfer",
        description="Ação padrão quando timeout de inatividade"
    )

    send_warning_at_minutes: Optional[int] = Field(
        default=None,
        ge=1,
        description="Minutos antes do timeout para enviar aviso"
    )

    warning_message: Optional[str] = Field(
        default=None,
        description="Mensagem padrão de aviso de inatividade"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "enabled": True,
                "timeout_minutes": 60,
                "action": "transfer",
                "send_warning_at_minutes": 50,
                "warning_message": "Você ainda está aí? Posso ajudar em algo mais?"
            }
        }


# Base Organization Schema
class OrganizationBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Organization name")
    slug: Optional[str] = Field(None, pattern="^[a-z0-9-]+$", description="URL-friendly slug")
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


# Organization Create
class OrganizationCreate(OrganizationBase):
    pass


# Organization Update
class OrganizationUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


# Organization in DB
class OrganizationInDB(OrganizationBase):
    id: UUID
    is_active: bool
    plan_type: str
    plan_limits: Optional[dict] = None
    plan_usage: Optional[dict] = None
    trial_ends_at: Optional[datetime] = None
    subscription_starts_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    settings: Optional[dict] = Field(
        default_factory=dict,
        description=(
            "Configurações flexíveis da organização (JSONB). Campos principais:\n"
            "- window_expiry: Configuração global de janela 24h WhatsApp\n"
            "- inactivity: Configuração global de timeout de inatividade\n"
            "- business_hours: Horário de funcionamento\n"
            "- timezone: Fuso horário\n"
            "- language: Idioma padrão\n"
            "- currency: Moeda padrão"
        )
    )

    model_config = {"from_attributes": True}


# Organization Response
class Organization(OrganizationInDB):
    pass


# Organization with Stats
class OrganizationWithStats(Organization):
    stats: dict = Field(default_factory=dict)

    @field_validator("stats", mode="before")
    @classmethod
    def set_default_stats(cls, v):
        if v is None:
            return {
                "total_users": 0,
                "total_contacts": 0,
                "total_conversations": 0,
                "total_messages": 0,
                "total_whatsapp_numbers": 0,
                "total_chatbots": 0,
            }
        return v


# Organization Settings Update
class OrganizationSettingsUpdate(BaseModel):
    """
    Atualização das configurações da organização

    O campo 'settings' no banco de dados é um JSONB flexível que contém:
    - window_expiry: Configuração global de janela 24h WhatsApp
    - inactivity: Configuração global de timeout de inatividade
    - business_hours: Horário de funcionamento
    - timezone: Fuso horário
    - language: Idioma padrão
    - currency: Moeda padrão
    - notification_settings: Configurações de notificação
    - security_settings: Configurações de segurança
    """

    window_expiry: Optional[OrganizationWindowExpirySettings] = Field(
        default=None,
        description="Configuração global de janela 24h WhatsApp (aplicada a todos os fluxos por padrão)"
    )

    inactivity: Optional[OrganizationInactivitySettings] = Field(
        default=None,
        description="Configuração global de timeout de inatividade (aplicada a todos os fluxos por padrão)"
    )

    business_hours: Optional[dict] = Field(
        default=None,
        description="Horário de funcionamento da organização"
    )

    timezone: Optional[str] = Field(
        default=None,
        description="Fuso horário da organização (ex: America/Sao_Paulo)"
    )

    language: Optional[str] = Field(
        default=None,
        description="Idioma padrão (ex: pt-BR, en-US)"
    )

    currency: Optional[str] = Field(
        default=None,
        description="Moeda padrão (ex: BRL, USD)"
    )

    notification_settings: Optional[dict] = Field(
        default=None,
        description="Configurações de notificações"
    )

    security_settings: Optional[dict] = Field(
        default=None,
        description="Configurações de segurança"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "window_expiry": {
                    "action": "send_template",
                    "template_name": "janela_expirada",
                    "send_warning": True,
                    "warning_at_hours": 22,
                    "warning_template_name": "aviso_janela_expirando"
                },
                "inactivity": {
                    "enabled": True,
                    "timeout_minutes": 60,
                    "action": "transfer",
                    "send_warning_at_minutes": 50,
                    "warning_message": "Você ainda está aí?"
                },
                "timezone": "America/Sao_Paulo",
                "language": "pt-BR"
            }
        }


# Organization Plan Update
class OrganizationPlanUpdate(BaseModel):
    plan_type: str = Field(..., pattern="^(free|starter|professional|enterprise)$")
    subscription_starts_at: Optional[datetime] = None
    subscription_ends_at: Optional[datetime] = None
