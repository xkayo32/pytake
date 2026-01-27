"""
WhatsApp Template AI Analysis Service

Service for analyzing WhatsApp templates with AI before submitting to Meta.
Provides validation, suggestions, auto-categorization, and issue detection.

Author: Kayo Carvalho Fernandes
Date: 28 de Dezembro de 2025
"""

import json
import re
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.repositories.organization_repository import OrganizationRepository
from app.schemas.template_ai_analysis import (
    TemplateAIAnalysisResult,
    ValidationIssue,
    ValidationSeverity,
    ValidationCategory,
    TemplateImprovements,
    DetectedIssue,
    IssueType,
    IssueLocation,
    TemplateCategory,
)

logger = logging.getLogger(__name__)


class TemplateAIAnalysisService:
    """
    Service para análise de templates WhatsApp com IA.

    Analisa templates antes de enviar à Meta, fornecendo:
    - Validações de qualidade
    - Sugestões de melhoria
    - Auto-categorização inteligente
    - Detecção de problemas técnicos

    Suporta múltiplos providers de IA (OpenAI, Anthropic) com fallback
    para análise baseada em regras quando IA não está disponível.
    """

    def __init__(self, db: AsyncSession):
        """
        Inicializa o service de análise.

        Args:
            db: Sessão assíncrona do banco de dados
        """
        self.db = db
        self.org_repo = OrganizationRepository(db)

    async def analyze_template(
        self,
        template: Any,  # WhatsAppTemplate model instance
        organization_id: UUID
    ) -> TemplateAIAnalysisResult:
        """
        Analisa template com IA antes de enviar para Meta.

        Args:
            template: Instância do modelo WhatsAppTemplate
            organization_id: UUID da organização

        Returns:
            TemplateAIAnalysisResult com análise completa

        Raises:
            Exception: Em caso de erro crítico (mas geralmente retorna análise básica)
        """
        logger.info(f"Starting AI analysis for template '{template.name}' (org: {organization_id})")

        # 1. Verificar se IA está habilitada para esta organização
        ai_settings = await self._get_ai_settings(organization_id)
        if not ai_settings:
            logger.info(f"AI not configured for org {organization_id}, using basic analysis")
            return self._basic_analysis(template)

        # 2. Verificar se análise de templates está habilitada
        template_analysis_enabled = ai_settings.get("template_analysis_enabled", True)
        if not template_analysis_enabled:
            logger.info(f"Template analysis disabled for org {organization_id}, using basic analysis")
            return self._basic_analysis(template)

        # 3. Construir prompts para IA
        system_prompt = self._build_system_prompt()
        user_prompt = self._build_user_prompt(template)

        # 4. Chamar IA (OpenAI, Anthropic ou Gemini)
        provider = ai_settings.get("default_provider", "openai")

        try:
            if provider == "anthropic":
                logger.info(f"Calling Anthropic API for template analysis")
                # Default: Claude 3.5 Haiku (rápido + econômico, ideal para análise de templates)
                ai_response = await self._call_anthropic(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.get("anthropic_api_key"),
                    model=ai_settings.get("model", "claude-3-5-haiku-20241022"),
                    max_tokens=4096,
                    temperature=0.3  # Baixa temperatura = mais consistente
                )
                provider_used = "anthropic"
                model_used = ai_settings.get("model", "claude-3-5-haiku-20241022")
            elif provider == "gemini":
                logger.info(f"Calling Google Gemini API for template analysis")
                # Default: Gemini 2.5 Flash (recomendado, balanceado custo/qualidade)
                ai_response = await self._call_gemini(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.get("gemini_api_key"),
                    model=ai_settings.get("model", "gemini-2.5-flash"),
                    max_tokens=4096,
                    temperature=0.3
                )
                provider_used = "gemini"
                model_used = ai_settings.get("model", "gemini-2.5-flash")
            else:  # openai
                logger.info(f"Calling OpenAI API for template analysis")
                # Default: GPT-4o mini (balanceado custo/qualidade para análise)
                ai_response = await self._call_openai(
                    system_prompt=system_prompt,
                    user_prompt=user_prompt,
                    api_key=ai_settings.get("openai_api_key"),
                    model=ai_settings.get("model", "gpt-4o-mini"),
                    max_tokens=4096,
                    temperature=0.3
                )
                provider_used = "openai"
                model_used = ai_settings.get("model", "gpt-4o-mini")

        except Exception as e:
            logger.error(f"AI analysis failed: {e}", exc_info=True)
            # Fallback para análise básica
            return self._basic_analysis(template)

        # 5. Parse resposta da IA
        try:
            parsed = self._parse_ai_response(ai_response)

            # Adicionar metadata
            parsed["analyzed_at"] = datetime.utcnow()
            parsed["provider_used"] = provider_used
            parsed["model_used"] = model_used

            result = TemplateAIAnalysisResult(**parsed)

            logger.info(
                f"AI analysis completed for template '{template.name}': "
                f"score={result.overall_score}, can_submit={result.can_submit}"
            )

            return result

        except Exception as e:
            logger.error(f"Failed to parse AI response: {e}", exc_info=True)
            return self._basic_analysis(template)

    async def _get_ai_settings(self, organization_id: UUID) -> Optional[Dict[str, Any]]:
        """
        Obtém configurações de IA da organização.

        Args:
            organization_id: UUID da organização

        Returns:
            Dict com configurações de IA ou None se não configurado
        """
        try:
            org = await self.org_repo.get_by_id(organization_id)
            if not org or not org.settings:
                return None

            ai_settings = org.settings.get("ai_assistant", {})
            if not ai_settings.get("enabled", False):
                return None

            return ai_settings

        except Exception as e:
            logger.error(f"Error getting AI settings: {e}")
            return None

    def _build_system_prompt(self) -> str:
        """
        Constrói system prompt para análise de templates WhatsApp.

        Returns:
            String com system prompt completo
        """
        return """Você é um especialista em templates WhatsApp Business API e políticas da Meta.

Sua tarefa é analisar templates WhatsApp ANTES de serem enviados à Meta, identificando:

1. **VALIDAÇÕES** - Problemas que causariam rejeição:
   - Header muito curta (< 10 caracteres)
   - Body muito simples ou genérico (< 20 caracteres)
   - Footer muito longa (> 60 caracteres)
   - Formatação excessiva (quebras de linha excessivas)
   - Conteúdo proibido (spam, enganoso, violações de política)

2. **SUGESTÕES DE MELHORIA**:
   - Header mais descritiva e contextualizada
   - Body mais clara e completa
   - Footer mais específica da empresa
   - Uso adequado de variáveis

3. **AUTO-CATEGORIZAÇÃO**:
   - MARKETING: Promocional, ofertas, novos produtos, CTAs comerciais
   - UTILITY: Transacional, atualizações, lembretes, confirmações, informações de conta
   - AUTHENTICATION: Apenas códigos OTP/verificação (uso muito específico)

   Critérios de decisão:
   - Se tem qualquer elemento promocional ou CTA comercial → MARKETING
   - Se é confirmação, atualização, lembrete, informação transacional → UTILITY
   - Se é APENAS código de verificação OTP → AUTHENTICATION

4. **DETECÇÃO DE PROBLEMAS TÉCNICOS**:
   - Variáveis inválidas (mistura de formatos {{1}} e {{nome}})
   - Variáveis não sequenciais
   - Conteúdo que viola políticas WhatsApp
   - URLs suspeitas ou encurtadores não autorizados

**IMPORTANTE**:
- Seja rigoroso mas construtivo
- Forneça sugestões específicas e acionáveis
- Score geral: 0-100 onde:
  * < 60 = crítico (não recomendado enviar)
  * 60-80 = atenção (pode enviar mas com melhorias)
  * > 80 = bom (aprovação provável)

**SEMPRE retorne JSON válido neste formato EXATO**:
```json
{
  "overall_score": 75,
  "can_submit": true,
  "has_critical_issues": false,
  "validations": [
    {
      "severity": "warning",
      "category": "content",
      "message": "Header poderia ser mais descritiva",
      "suggestion": "Adicionar contexto específico da ação"
    }
  ],
  "improvements": {
    "header_suggestion": "Confirmação de Pedido #{{numero}}",
    "body_suggestion": "Olá {{cliente}}, seu pedido foi confirmado com sucesso...",
    "footer_suggestion": "Loja XYZ - Compras Seguras",
    "reasoning": "Template está funcional mas pode ser mais específico e profissional"
  },
  "suggested_category": "UTILITY",
  "category_confidence": 95,
  "category_reasoning": "Conteúdo é claramente transacional (confirmação de pedido)",
  "detected_issues": []
}
```

Se houver problemas técnicos, adicione em detected_issues:
```json
"detected_issues": [
  {
    "type": "invalid_variable",
    "description": "Mistura de formatos de variável",
    "location": "body",
    "suggested_fix": "Use apenas um formato: {{1}}, {{2}} OU {{nome}}, {{email}}"
  }
]
```"""

    def _build_user_prompt(self, template: Any) -> str:
        """
        Constrói user prompt com dados do template.

        Args:
            template: Instância do modelo WhatsAppTemplate

        Returns:
            String com prompt formatado
        """
        # Construir texto completo do template
        parts = []

        if template.header_text:
            header_type = template.header_type or "TEXT"
            parts.append(f"HEADER ({header_type}): {template.header_text}")

        parts.append(f"BODY: {template.body_text}")

        if template.footer_text:
            parts.append(f"FOOTER: {template.footer_text}")

        if template.buttons:
            buttons_json = json.dumps(template.buttons, indent=2, ensure_ascii=False)
            parts.append(f"BUTTONS:\n{buttons_json}")

        template_text = "\n\n".join(parts)

        # Metadata
        metadata_parts = [
            f"- Nome: {template.name}",
            f"- Idioma: {template.language}",
            f"- Categoria submetida: {template.category}",
        ]

        if hasattr(template, "parameter_format") and template.parameter_format:
            metadata_parts.append(f"- Formato de variáveis: {template.parameter_format}")

        if hasattr(template, "named_variables") and template.named_variables:
            metadata_parts.append(f"- Variáveis nomeadas: {', '.join(template.named_variables)}")

        metadata = "METADATA:\n" + "\n".join(metadata_parts)

        prompt = f"""Analise este template WhatsApp:

{metadata}

CONTEÚDO DO TEMPLATE:
{template_text}

Forneça análise completa em JSON conforme especificado no system prompt."""

        return prompt

    async def _call_anthropic(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """
        Chama Anthropic API para análise.

        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            api_key: Anthropic API key
            model: Nome do modelo (ex: claude-3-5-haiku-20241022, claude-3-5-sonnet-20241022)
            max_tokens: Máximo de tokens de resposta
            temperature: Temperatura (0-1)

        Returns:
            Resposta da IA como string

        Raises:
            Exception: Em caso de erro na API
        """
        try:
            # Lazy import to avoid loading if not needed
            from anthropic import AsyncAnthropic
        except ImportError:
            raise Exception("anthropic package not installed. Run: pip install anthropic")

        if not api_key:
            raise Exception("Anthropic API key not configured")

        client = AsyncAnthropic(api_key=api_key)

        try:
            response = await client.messages.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            )

            # Extract text from response
            if response.content and len(response.content) > 0:
                return response.content[0].text
            else:
                raise Exception("Empty response from Anthropic API")

        except Exception as e:
            logger.error(f"Anthropic API call failed: {e}")
            raise

    async def _call_openai(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """
        Chama OpenAI API para análise.

        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            api_key: OpenAI API key
            model: Nome do modelo (ex: gpt-4o-mini, gpt-4o)
            max_tokens: Máximo de tokens de resposta
            temperature: Temperatura (0-1)

        Returns:
            Resposta da IA como string

        Raises:
            Exception: Em caso de erro na API
        """
        try:
            # Lazy import to avoid loading if not needed
            from openai import AsyncOpenAI
        except ImportError:
            raise Exception("openai package not installed. Run: pip install openai")

        if not api_key:
            raise Exception("OpenAI API key not configured")

        client = AsyncOpenAI(api_key=api_key)

        try:
            response = await client.chat.completions.create(
                model=model,
                max_tokens=max_tokens,
                temperature=temperature,
                messages=[
                    {
                        "role": "system",
                        "content": system_prompt
                    },
                    {
                        "role": "user",
                        "content": user_prompt
                    }
                ]
            )

            # Extract text from response
            if response.choices and len(response.choices) > 0:
                return response.choices[0].message.content
            else:
                raise Exception("Empty response from OpenAI API")

        except Exception as e:
            logger.error(f"OpenAI API call failed: {e}")
            raise

    async def _call_gemini(
        self,
        system_prompt: str,
        user_prompt: str,
        api_key: str,
        model: str,
        max_tokens: int,
        temperature: float
    ) -> str:
        """
        Chama Google Gemini API usando o SDK unificado novo.

        Args:
            system_prompt: System prompt
            user_prompt: User prompt
            api_key: Google Gemini API key
            model: Nome do modelo (ex: gemini-2.5-flash, gemini-2.5-pro)
            max_tokens: Máximo de tokens de resposta
            temperature: Temperatura (0-1)

        Returns:
            Resposta da IA como string

        Raises:
            Exception: Em caso de erro na API
        """
        try:
            # Lazy import to avoid loading if not needed
            from google import genai
            from google.genai import types
        except ImportError:
            raise Exception("google-genai package not installed. Run: pip install google-genai")

        if not api_key:
            raise Exception("Google Gemini API key not configured")

        # Create client
        client = genai.Client(api_key=api_key)

        try:
            # Generate content with system instruction
            response = await client.aio.models.generate_content(
                model=model,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_prompt,
                    temperature=temperature,
                    max_output_tokens=max_tokens,
                )
            )

            # Extract text from response
            if response.text:
                return response.text
            else:
                raise Exception("Empty response from Google Gemini API")

        except Exception as e:
            logger.error(f"Google Gemini API call failed: {e}")
            raise

    def _parse_ai_response(self, ai_response: str) -> Dict[str, Any]:
        """
        Parse resposta da IA para extrair JSON.

        Suporta JSON puro ou JSON dentro de markdown code blocks.

        Args:
            ai_response: Resposta da IA como string

        Returns:
            Dict com dados parseados

        Raises:
            Exception: Se não conseguir parsear JSON válido
        """
        # Tentar extrair JSON de markdown code block
        json_pattern = r"```(?:json)?\s*\n?(.*?)\n?```"
        matches = re.findall(json_pattern, ai_response, re.DOTALL)

        if matches:
            # Usar o primeiro bloco JSON encontrado
            json_str = matches[0].strip()
        else:
            # Tentar usar resposta inteira como JSON
            json_str = ai_response.strip()

        try:
            parsed = json.loads(json_str)
            return parsed
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse AI response as JSON: {e}")
            logger.error(f"Response was: {ai_response[:500]}...")
            raise Exception(f"Invalid JSON in AI response: {e}")

    def _basic_analysis(self, template: Any) -> TemplateAIAnalysisResult:
        """
        Análise básica sem IA (fallback quando IA não está disponível).

        Validações simples baseadas em regras fixas.

        Args:
            template: Instância do modelo WhatsAppTemplate

        Returns:
            TemplateAIAnalysisResult com análise básica
        """
        logger.info(f"Performing basic rule-based analysis for template '{template.name}'")

        validations: List[ValidationIssue] = []
        score = 100

        # Validação 1: Header length
        if template.header_text:
            if len(template.header_text) < 10:
                validations.append(ValidationIssue(
                    severity=ValidationSeverity.WARNING,
                    category=ValidationCategory.CONTENT,
                    message="Header muito curta (< 10 caracteres)",
                    suggestion="Headers mais descritivas têm maior chance de aprovação pela Meta"
                ))
                score -= 10

        # Validação 2: Body length
        if len(template.body_text) < 20:
            validations.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                category=ValidationCategory.CONTENT,
                message="Body muito simples (< 20 caracteres)",
                suggestion="Adicione mais contexto e informações relevantes ao body"
            ))
            score -= 30

        # Validação 3: Footer length
        if template.footer_text and len(template.footer_text) > 60:
            validations.append(ValidationIssue(
                severity=ValidationSeverity.CRITICAL,
                category=ValidationCategory.FORMAT,
                message="Footer muito longa (> 60 caracteres)",
                suggestion="Meta limita footers a 60 caracteres. Reduza o texto."
            ))
            score -= 20

        # Validação 4: Quebras de linha excessivas
        newline_count = template.body_text.count('\n')
        if newline_count > 3:
            validations.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category=ValidationCategory.FORMAT,
                message=f"Muitas quebras de linha no body ({newline_count} encontradas)",
                suggestion="Reduza quebras de linha para evitar rejeição por formatação excessiva"
            ))
            score -= 5

        # Validação 5: Body muito genérico
        generic_words = ["código", "confirmando", "aqui", "oi", "olá"]
        body_lower = template.body_text.lower()
        if any(word in body_lower for word in generic_words) and len(template.body_text) < 50:
            validations.append(ValidationIssue(
                severity=ValidationSeverity.WARNING,
                category=ValidationCategory.CONTENT,
                message="Body parece muito genérico",
                suggestion="Adicione mais contexto específico sobre o propósito da mensagem"
            ))
            score -= 10

        # Determinar categoria sugerida (heurística básica)
        body_lower = template.body_text.lower()
        suggested_category = template.category  # Default: manter categoria original
        category_confidence = 50.0
        category_reasoning = "Análise básica sem IA - baseado na categoria submetida"

        # Heurística: palavras-chave para MARKETING
        marketing_keywords = ["promoção", "desconto", "oferta", "compre", "aproveite", "black friday"]
        if any(kw in body_lower for kw in marketing_keywords):
            suggested_category = TemplateCategory.MARKETING
            category_confidence = 70.0
            category_reasoning = "Conteúdo contém palavras-chave promocionais"

        # Heurística: palavras-chave para AUTHENTICATION
        auth_keywords = ["código", "verificação", "otp", "senha"]
        if any(kw in body_lower for kw in auth_keywords) and len(template.body_text) < 100:
            suggested_category = TemplateCategory.AUTHENTICATION
            category_confidence = 65.0
            category_reasoning = "Conteúdo parece ser código de verificação"

        # Score final e decisões
        final_score = max(0, score)
        can_submit = final_score >= 50
        has_critical = any(v.severity == ValidationSeverity.CRITICAL for v in validations)

        return TemplateAIAnalysisResult(
            overall_score=final_score,
            can_submit=can_submit,
            has_critical_issues=has_critical,
            validations=validations,
            improvements=TemplateImprovements(
                reasoning="Análise básica por regras (IA não disponível). "
                         "Configure IA para obter sugestões específicas e detalhadas."
            ),
            suggested_category=suggested_category,
            category_confidence=category_confidence,
            category_reasoning=category_reasoning,
            detected_issues=[],
            analyzed_at=datetime.utcnow(),
            provider_used="basic_rules",
            model_used="rule_based_v1"
        )
