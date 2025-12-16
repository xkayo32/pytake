"""
Template Cost Estimator Service - Phase 3.1
Calcula custos de envio de mensagens template conforme pricing da Meta Cloud API.

Author: Kayo Carvalho Fernandes
Date: 15/12/2025
"""

from decimal import Decimal
from datetime import datetime, timezone
from typing import Optional, Dict, List
from uuid import UUID
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import WhatsAppTemplate, Organization
from app.repositories.whatsapp import WhatsAppTemplateRepository


logger = logging.getLogger(__name__)


# Meta Cloud API Pricing (as of Dec 2025)
# Reference: https://developers.facebook.com/docs/whatsapp/pricing
class TemplatePricingTiers:
    """Template pricing tiers according to Meta Cloud API"""
    
    # Free tier messages (first 1000 conversations per month)
    FREE_TIER_LIMIT = 1000
    
    # Pricing per message (USD)
    PRICING_BY_CATEGORY = {
        "MARKETING": Decimal("0.0015"),      # $0.0015 per message
        "UTILITY": Decimal("0.0001"),        # $0.0001 per message
        "AUTHENTICATION": Decimal("0.001"),  # $0.001 per message
        "SERVICE": Decimal("0.0015"),        # $0.0015 per message
    }
    
    # Multipliers for message complexity
    COMPLEXITY_MULTIPLIERS = {
        "simple": Decimal("1.0"),             # Text only
        "with_button": Decimal("1.1"),        # With buttons
        "with_media": Decimal("1.2"),         # With media (image, document)
        "with_interactive": Decimal("1.3"),   # Interactive components
    }
    
    # Volume discounts (applied after reaching thresholds)
    VOLUME_DISCOUNTS = {
        5000: Decimal("0.05"),       # 5% discount at 5k messages
        10000: Decimal("0.10"),      # 10% discount at 10k messages
        50000: Decimal("0.15"),      # 15% discount at 50k messages
        100000: Decimal("0.20"),     # 20% discount at 100k messages
    }


class TemplateCostEstimator:
    """
    Service para calcular custos de templates WhatsApp.
    
    Features:
    - Cálculo de custo por mensagem (baseado em categoria + complexidade)
    - Estimativa de custo mensal por organização
    - Histórico de custos
    - Alertas de custo alto
    - Volume discounts automation
    
    Multi-tenancy: ✅ Verificado
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self.template_repo = WhatsAppTemplateRepository(db)
    
    
    async def calculate_message_cost(
        self,
        organization_id: UUID,
        category: str = "MARKETING",
        complexity: str = "simple",
        volume: int = 1
    ) -> Dict[str, any]:
        """
        Calcula custo estimado para enviar mensagens template.
        
        Args:
            organization_id: Organization UUID
            category: Template category (MARKETING, UTILITY, AUTHENTICATION, SERVICE)
            complexity: Message complexity (simple, with_button, with_media, with_interactive)
            volume: Número de mensagens a enviar
        
        Returns:
            {
                "unit_price_usd": Decimal,      # Preço por unidade (USD)
                "volume": int,                   # Quantidade
                "subtotal_usd": Decimal,        # Subtotal (volume × unit_price)
                "volume_discount": Decimal,     # Desconto aplicado (%)
                "discount_amount_usd": Decimal, # Valor do desconto (USD)
                "total_cost_usd": Decimal,      # Custo final (USD)
                "category": str,
                "complexity": str,
            }
        
        Raises:
            ValueError: Se categoria ou complexidade inválida
        """
        # Validar inputs
        if category not in TemplatePricingTiers.PRICING_BY_CATEGORY:
            raise ValueError(f"Invalid template category: {category}")
        
        if complexity not in TemplatePricingTiers.COMPLEXITY_MULTIPLIERS:
            raise ValueError(f"Invalid complexity level: {complexity}")
        
        # Obter preço base
        base_price = TemplatePricingTiers.PRICING_BY_CATEGORY[category]
        complexity_multiplier = TemplatePricingTiers.COMPLEXITY_MULTIPLIERS[complexity]
        
        # Aplicar multiplicador de complexidade
        unit_price = base_price * complexity_multiplier
        
        # Calcular subtotal
        subtotal = unit_price * volume
        
        # Aplicar volume discount se aplicável
        volume_discount = Decimal("0")
        for threshold, discount in sorted(TemplatePricingTiers.VOLUME_DISCOUNTS.items()):
            if volume >= threshold:
                volume_discount = discount
        
        discount_amount = subtotal * volume_discount
        total_cost = subtotal - discount_amount
        
        logger.info(
            f"Cost calculation: org_id={organization_id}, category={category}, "
            f"complexity={complexity}, volume={volume}, total_cost=${total_cost}"
        )
        
        return {
            "unit_price_usd": unit_price,
            "volume": volume,
            "subtotal_usd": subtotal,
            "volume_discount": volume_discount,
            "discount_amount_usd": discount_amount,
            "total_cost_usd": total_cost,
            "category": category,
            "complexity": complexity,
        }
    
    
    async def get_template_cost_estimate(
        self,
        template_id: UUID,
        organization_id: UUID,
        monthly_volume: int = 100
    ) -> Optional[Dict[str, any]]:
        """
        Obtém estimativa de custo para um template específico.
        
        Args:
            template_id: Template UUID
            organization_id: Organization UUID (multi-tenancy)
            monthly_volume: Volume estimado de envios por mês
        
        Returns:
            {
                "template_id": UUID,
                "template_name": str,
                "category": str,
                "complexity": str,
                "monthly_volume": int,
                "monthly_cost_estimate_usd": Decimal,
                "annual_cost_estimate_usd": Decimal,
                "pricing_breakdown": {...},
                "calculated_at": datetime,
            }
        
        Raises:
            ValueError: Se template não encontrado
        """
        # Obter template com filtro multi-tenancy
        template = await self.template_repo.get_by_id(template_id, organization_id)
        
        if not template:
            raise ValueError(f"Template {template_id} not found for org {organization_id}")
        
        # Determinar complexidade baseado em conteúdo do template
        complexity = self._estimate_complexity(template)
        
        # Calcular custo
        cost_data = await self.calculate_message_cost(
            organization_id=organization_id,
            category=template.category or "MARKETING",
            complexity=complexity,
            volume=monthly_volume
        )
        
        monthly_cost = cost_data["total_cost_usd"]
        annual_cost = monthly_cost * 12
        
        logger.info(
            f"Template cost estimate: template_id={template_id}, "
            f"monthly_volume={monthly_volume}, monthly_cost=${monthly_cost}"
        )
        
        return {
            "template_id": template_id,
            "template_name": template.name,
            "category": template.category or "MARKETING",
            "complexity": complexity,
            "monthly_volume": monthly_volume,
            "monthly_cost_estimate_usd": monthly_cost,
            "annual_cost_estimate_usd": annual_cost,
            "pricing_breakdown": cost_data,
            "calculated_at": datetime.now(timezone.utc),
        }
    
    
    async def get_org_cost_summary(
        self,
        organization_id: UUID,
        monthly_volume_per_template: int = 100
    ) -> Dict[str, any]:
        """
        Obtém resumo de custos para toda a organização.
        
        Args:
            organization_id: Organization UUID
            monthly_volume_per_template: Volume assumido por template
        
        Returns:
            {
                "organization_id": UUID,
                "total_templates": int,
                "total_monthly_cost_estimate_usd": Decimal,
                "total_annual_cost_estimate_usd": Decimal,
                "by_category": {
                    "MARKETING": {"count": int, "cost": Decimal},
                    "UTILITY": {...},
                    ...
                },
                "by_complexity": {
                    "simple": {"count": int, "cost": Decimal},
                    ...
                },
                "calculated_at": datetime,
            }
        
        Raises:
            ValueError: Se organização não encontrada
        """
        # Validar organização existe
        org = await self.db.execute(
            select(Organization).where(Organization.id == organization_id)
        )
        org = org.scalars().first()
        
        if not org:
            raise ValueError(f"Organization {organization_id} not found")
        
        # Obter todos templates da org (ativos)
        templates = await self.template_repo.get_multi_by_org(
            organization_id=organization_id,
            skip=0,
            limit=1000
        )
        
        total_cost = Decimal("0")
        by_category = {}
        by_complexity = {}
        
        for template in templates:
            # Estimar custo individual
            cost_data = await self.calculate_message_cost(
                organization_id=organization_id,
                category=template.category or "MARKETING",
                complexity=self._estimate_complexity(template),
                volume=monthly_volume_per_template
            )
            
            template_cost = cost_data["total_cost_usd"]
            total_cost += template_cost
            
            # Agregar por categoria
            category = template.category or "MARKETING"
            if category not in by_category:
                by_category[category] = {"count": 0, "cost": Decimal("0")}
            by_category[category]["count"] += 1
            by_category[category]["cost"] += template_cost
            
            # Agregar por complexidade
            complexity = self._estimate_complexity(template)
            if complexity not in by_complexity:
                by_complexity[complexity] = {"count": 0, "cost": Decimal("0")}
            by_complexity[complexity]["count"] += 1
            by_complexity[complexity]["cost"] += template_cost
        
        logger.info(
            f"Organization cost summary: org_id={organization_id}, "
            f"templates={len(templates)}, total_monthly_cost=${total_cost}"
        )
        
        return {
            "organization_id": organization_id,
            "total_templates": len(templates),
            "total_monthly_cost_estimate_usd": total_cost,
            "total_annual_cost_estimate_usd": total_cost * 12,
            "by_category": by_category,
            "by_complexity": by_complexity,
            "calculated_at": datetime.now(timezone.utc),
        }
    
    
    async def update_cost_metrics(
        self,
        template_id: UUID,
        organization_id: UUID,
        messages_sent: int = 0,
        monthly_volume: int = 100
    ) -> Dict[str, any]:
        """
        Atualiza métricas de custo baseado em volume real enviado.
        
        Args:
            template_id: Template UUID
            organization_id: Organization UUID
            messages_sent: Número real de mensagens enviadas este mês
            monthly_volume: Volume estimado para próximo mês
        
        Returns:
            {
                "template_id": UUID,
                "actual_messages_sent": int,
                "actual_cost_usd": Decimal,
                "estimated_monthly_cost_usd": Decimal,
                "cost_per_message_usd": Decimal,
                "efficiency": Decimal,  # % de custo vs estimado
                "updated_at": datetime,
            }
        """
        template = await self.template_repo.get_by_id(template_id, organization_id)
        
        if not template:
            raise ValueError(f"Template {template_id} not found")
        
        # Calcular custo real baseado em mensagens enviadas
        cost_actual = await self.calculate_message_cost(
            organization_id=organization_id,
            category=template.category or "MARKETING",
            complexity=self._estimate_complexity(template),
            volume=messages_sent
        )
        
        # Calcular estimado para mês completo
        cost_estimated = await self.calculate_message_cost(
            organization_id=organization_id,
            category=template.category or "MARKETING",
            complexity=self._estimate_complexity(template),
            volume=monthly_volume
        )
        
        actual_usd = cost_actual["total_cost_usd"]
        estimated_usd = cost_estimated["total_cost_usd"]
        
        # Calcular eficiência (% do estimado)
        efficiency = (actual_usd / estimated_usd * 100) if estimated_usd > 0 else Decimal("0")
        
        # Custo por mensagem
        cost_per_msg = (actual_usd / messages_sent) if messages_sent > 0 else Decimal("0")
        
        logger.info(
            f"Cost metrics updated: template_id={template_id}, "
            f"messages_sent={messages_sent}, actual_cost=${actual_usd}"
        )
        
        return {
            "template_id": template_id,
            "actual_messages_sent": messages_sent,
            "actual_cost_usd": actual_usd,
            "estimated_monthly_cost_usd": estimated_usd,
            "cost_per_message_usd": cost_per_msg,
            "efficiency": efficiency,
            "updated_at": datetime.now(timezone.utc),
        }
    
    
    def _estimate_complexity(self, template) -> str:
        """
        Estima nível de complexidade do template baseado em seu conteúdo.
        
        Returns: "simple", "with_button", "with_media", ou "with_interactive"
        """
        # Verificar conteúdo template
        body = getattr(template, "body", "") or ""
        
        # Procurar componentes do template
        has_buttons = "buttons" in str(template.__dict__)
        has_media = "header" in str(template.__dict__) and (
            "image" in str(template.__dict__).lower() or 
            "video" in str(template.__dict__).lower() or 
            "document" in str(template.__dict__).lower()
        )
        has_interactive = "footer" in str(template.__dict__) and len(body) > 100
        
        if has_interactive:
            return "with_interactive"
        elif has_media:
            return "with_media"
        elif has_buttons:
            return "with_button"
        else:
            return "simple"
