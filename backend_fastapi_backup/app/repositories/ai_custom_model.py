"""
AI Custom Model Repository
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ai_custom_model import AICustomModel
from app.repositories.base import BaseRepository


class AICustomModelRepository(BaseRepository[AICustomModel]):
    """Repository for AICustomModel"""

    def __init__(self, db: AsyncSession):
        super().__init__(AICustomModel, db)

    async def get_by_organization(
        self,
        organization_id: UUID,
        provider: Optional[str] = None,
        is_active: bool = True
    ) -> List[AICustomModel]:
        """
        Get all custom models for an organization

        Args:
            organization_id: Organization ID
            provider: Filter by provider (openai, anthropic)
            is_active: Filter by active status

        Returns:
            List of custom models
        """
        query = select(AICustomModel).where(
            and_(
                AICustomModel.organization_id == organization_id,
                AICustomModel.deleted_at.is_(None)
            )
        )

        if provider:
            query = query.where(AICustomModel.provider == provider)

        if is_active is not None:
            query = query.where(AICustomModel.is_active == is_active)

        query = query.order_by(AICustomModel.created_at.desc())

        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_model_id(
        self,
        organization_id: UUID,
        model_id: str
    ) -> Optional[AICustomModel]:
        """
        Get custom model by model_id within organization

        Args:
            organization_id: Organization ID
            model_id: Model identifier

        Returns:
            Custom model or None
        """
        result = await self.db.execute(
            select(AICustomModel).where(
                and_(
                    AICustomModel.organization_id == organization_id,
                    AICustomModel.model_id == model_id,
                    AICustomModel.deleted_at.is_(None)
                )
            )
        )
        return result.scalar_one_or_none()

    async def model_exists(
        self,
        organization_id: UUID,
        model_id: str,
        exclude_id: Optional[UUID] = None
    ) -> bool:
        """
        Check if model_id already exists in organization

        Args:
            organization_id: Organization ID
            model_id: Model identifier to check
            exclude_id: Model ID to exclude from check (for updates)

        Returns:
            True if exists, False otherwise
        """
        query = select(AICustomModel).where(
            and_(
                AICustomModel.organization_id == organization_id,
                AICustomModel.model_id == model_id,
                AICustomModel.deleted_at.is_(None)
            )
        )

        if exclude_id:
            query = query.where(AICustomModel.id != exclude_id)

        result = await self.db.execute(query)
        return result.scalar_one_or_none() is not None

    async def get_usage_stats(self, organization_id: UUID) -> dict:
        """
        Get aggregated usage statistics for organization's custom models

        Args:
            organization_id: Organization ID

        Returns:
            Dictionary with usage statistics
        """
        models = await self.get_by_organization(organization_id)

        total_usage = sum(m.usage_count for m in models)
        total_cost = sum(m.total_cost for m in models)
        total_input_tokens = sum(m.total_input_tokens for m in models)
        total_output_tokens = sum(m.total_output_tokens for m in models)

        return {
            "total_models": len(models),
            "active_models": len([m for m in models if m.is_active]),
            "total_usage_count": total_usage,
            "total_cost": round(total_cost, 2),
            "total_input_tokens": total_input_tokens,
            "total_output_tokens": total_output_tokens,
            "total_tokens": total_input_tokens + total_output_tokens,
        }

    async def increment_usage(
        self,
        model_id: UUID,
        input_tokens: int,
        output_tokens: int
    ) -> Optional[AICustomModel]:
        """
        Increment usage statistics for a model

        Args:
            model_id: Model ID
            input_tokens: Number of input tokens used
            output_tokens: Number of output tokens generated

        Returns:
            Updated model or None if not found
        """
        model = await self.get(model_id)
        if not model:
            return None

        model.increment_usage(input_tokens, output_tokens)
        await self.db.commit()
        await self.db.refresh(model)

        return model
