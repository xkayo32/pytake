"""
WhatsApp Template AI Analysis Schemas

Pydantic schemas for AI-powered template analysis results.
Used to validate templates before submitting to Meta's WhatsApp Business API.

Author: Kayo Carvalho Fernandes
Date: 28 de Dezembro de 2025
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from enum import Enum


# ============= Enums =============

class ValidationSeverity(str, Enum):
    """Severity levels for validation issues"""
    CRITICAL = "critical"  # Blocks submission
    WARNING = "warning"    # Allows submission with warning
    INFO = "info"          # Informational only


class ValidationCategory(str, Enum):
    """Categories of validation issues"""
    CONTENT = "content"      # Content quality/completeness
    FORMAT = "format"        # Formatting issues
    VARIABLES = "variables"  # Variable-related problems
    POLICY = "policy"        # WhatsApp policy violations


class IssueType(str, Enum):
    """Types of technical issues detected"""
    INVALID_VARIABLE = "invalid_variable"
    PROHIBITED_CONTENT = "prohibited_content"
    POLICY_VIOLATION = "policy_violation"
    FORMATTING_ERROR = "formatting_error"


class IssueLocation(str, Enum):
    """Location of detected issue in template"""
    HEADER = "header"
    BODY = "body"
    FOOTER = "footer"
    BUTTONS = "buttons"


class TemplateCategory(str, Enum):
    """WhatsApp template categories"""
    MARKETING = "MARKETING"
    UTILITY = "UTILITY"
    AUTHENTICATION = "AUTHENTICATION"


# ============= Schema Classes =============

class ValidationIssue(BaseModel):
    """
    Problema de validação detectado durante análise de IA.

    Representa um problema específico encontrado no template,
    com severidade, categoria, mensagem e sugestão de correção.
    """
    severity: ValidationSeverity = Field(
        ...,
        description="Severidade do problema (critical, warning, info)"
    )
    category: ValidationCategory = Field(
        ...,
        description="Categoria do problema (content, format, variables, policy)"
    )
    message: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Descrição do problema detectado"
    )
    suggestion: Optional[str] = Field(
        None,
        max_length=500,
        description="Sugestão de como corrigir o problema"
    )

    class Config:
        use_enum_values = True


class DetectedIssue(BaseModel):
    """
    Problema técnico detectado pela análise de IA.

    Representa problemas técnicos específicos como variáveis inválidas,
    conteúdo proibido, ou violações de política.
    """
    type: IssueType = Field(
        ...,
        description="Tipo do problema técnico"
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=500,
        description="Descrição detalhada do problema"
    )
    location: IssueLocation = Field(
        ...,
        description="Localização do problema no template"
    )
    suggested_fix: Optional[str] = Field(
        None,
        max_length=500,
        description="Sugestão específica de correção"
    )

    class Config:
        use_enum_values = True


class TemplateImprovements(BaseModel):
    """
    Sugestões de melhoria geradas pela IA.

    Contém sugestões específicas para melhorar cada componente
    do template (header, body, footer) com justificativa.
    """
    header_suggestion: Optional[str] = Field(
        None,
        max_length=1000,
        description="Sugestão de header melhorada"
    )
    body_suggestion: Optional[str] = Field(
        None,
        max_length=2000,
        description="Sugestão de body melhorado"
    )
    footer_suggestion: Optional[str] = Field(
        None,
        max_length=500,
        description="Sugestão de footer melhorada"
    )
    reasoning: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Justificativa das sugestões fornecidas"
    )


class TemplateAIAnalysisResult(BaseModel):
    """
    Resultado completo da análise de IA de um template WhatsApp.

    Contém:
    - Score geral de qualidade (0-100)
    - Indicação se pode ser submetido à Meta
    - Lista de problemas de validação
    - Sugestões de melhoria
    - Auto-categorização inteligente
    - Problemas técnicos detectados
    - Metadata da análise

    Usado para validar templates antes de envio à Meta WhatsApp Business API.
    """

    # Status Geral
    overall_score: float = Field(
        ...,
        ge=0,
        le=100,
        description="Score geral de qualidade do template (0-100). "
                    "< 60 = crítico, 60-80 = atenção, > 80 = bom"
    )
    can_submit: bool = Field(
        ...,
        description="Indica se o template pode ser enviado à Meta com segurança"
    )
    has_critical_issues: bool = Field(
        ...,
        description="Indica se há problemas críticos que bloqueiam o envio"
    )

    # Validações
    validations: List[ValidationIssue] = Field(
        default_factory=list,
        description="Lista de problemas de validação detectados"
    )

    # Sugestões de Melhoria
    improvements: TemplateImprovements = Field(
        ...,
        description="Sugestões de como melhorar o template"
    )

    # Auto-Categorização
    suggested_category: TemplateCategory = Field(
        ...,
        description="Categoria sugerida pela IA (MARKETING, UTILITY, AUTHENTICATION)"
    )
    category_confidence: float = Field(
        ...,
        ge=0,
        le=100,
        description="Confiança da IA na categorização (0-100)"
    )
    category_reasoning: str = Field(
        ...,
        min_length=1,
        max_length=1000,
        description="Explicação de por que a IA escolheu esta categoria"
    )

    # Problemas Técnicos Detectados
    detected_issues: List[DetectedIssue] = Field(
        default_factory=list,
        description="Lista de problemas técnicos específicos detectados"
    )

    # Metadata
    analyzed_at: datetime = Field(
        ...,
        description="Data/hora quando a análise foi realizada"
    )
    provider_used: str = Field(
        ...,
        description="Provider de IA utilizado (openai, anthropic, gemini, basic_rules)"
    )
    model_used: str = Field(
        ...,
        description="Modelo específico utilizado (ex: claude-3-5-haiku-20241022, gpt-4o-mini, gemini-2.0-flash-exp)"
    )

    @field_validator("provider_used")
    @classmethod
    def validate_provider(cls, v: str) -> str:
        """Valida que o provider é um dos suportados"""
        allowed = ["openai", "anthropic", "gemini", "basic_rules"]
        if v not in allowed:
            raise ValueError(f"provider_used must be one of {allowed}")
        return v

    @field_validator("overall_score", "category_confidence")
    @classmethod
    def validate_score_range(cls, v: float) -> float:
        """Valida que scores estão no range 0-100"""
        if not 0 <= v <= 100:
            raise ValueError("Score must be between 0 and 100")
        return v

    class Config:
        use_enum_values = True
        json_schema_extra = {
            "example": {
                "overall_score": 85.0,
                "can_submit": True,
                "has_critical_issues": False,
                "validations": [
                    {
                        "severity": "warning",
                        "category": "content",
                        "message": "Header poderia ser mais descritiva",
                        "suggestion": "Adicionar contexto específico da ação"
                    }
                ],
                "improvements": {
                    "header_suggestion": "Confirmação de Pedido #{{numero_pedido}}",
                    "body_suggestion": "Olá {{cliente}}, seu pedido foi confirmado...",
                    "footer_suggestion": "Loja XYZ - Compras Seguras",
                    "reasoning": "Template está bem estruturado mas pode ter mais contexto"
                },
                "suggested_category": "UTILITY",
                "category_confidence": 95.0,
                "category_reasoning": "Conteúdo é transacional (confirmação de pedido)",
                "detected_issues": [],
                "analyzed_at": "2025-12-28T10:00:00Z",
                "provider_used": "anthropic",
                "model_used": "claude-3-5-haiku-20241022"
            }
        }


class TemplateAnalysisRequest(BaseModel):
    """
    Request para análise manual de template (endpoint opcional).

    Permite solicitar análise de IA sem enviar o template à Meta.
    """
    force_reanalysis: bool = Field(
        False,
        description="Forçar nova análise mesmo se já houver análise recente"
    )


class TemplateCreateResponseWithAnalysis(BaseModel):
    """
    Response estendido quando template é criado com análise de IA.

    Usado quando submit_to_meta=true mas análise detecta problemas críticos.
    Retorna o template criado (em DRAFT) + análise + indicação de não-envio.
    """
    template_id: str = Field(
        ...,
        description="UUID do template criado"
    )
    status: str = Field(
        ...,
        description="Status do template (geralmente DRAFT)"
    )
    ai_analysis: TemplateAIAnalysisResult = Field(
        ...,
        description="Resultado completo da análise de IA"
    )
    submitted_to_meta: bool = Field(
        ...,
        description="Indica se o template foi enviado à Meta"
    )
    message: str = Field(
        ...,
        description="Mensagem explicativa sobre o resultado"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "template_id": "123e4567-e89b-12d3-a456-426614174000",
                "status": "DRAFT",
                "ai_analysis": {
                    "overall_score": 45.0,
                    "can_submit": False,
                    "has_critical_issues": True,
                    "validations": [],
                    "improvements": {},
                    "suggested_category": "UTILITY",
                    "category_confidence": 80.0,
                    "category_reasoning": "Análise baseada no conteúdo",
                    "detected_issues": [],
                    "analyzed_at": "2025-12-28T10:00:00Z",
                    "provider_used": "anthropic",
                    "model_used": "claude-3-5-sonnet-20241022"
                },
                "submitted_to_meta": False,
                "message": "Template não foi enviado à Meta devido a problemas detectados pela IA. Revise as sugestões."
            }
        }
