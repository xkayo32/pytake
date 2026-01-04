"""add_ai_analysis_to_templates

Adds AI analysis fields to whatsapp_templates table.

These fields store results from the TemplateAIAnalysisService which analyzes
templates before submitting to Meta's WhatsApp Business API.

Fields added:
- ai_analysis_result: JSONB - Full analysis result (validations, suggestions, issues)
- ai_analysis_score: Float - Overall quality score (0-100)
- ai_suggested_category: String - AI-suggested category
- ai_analyzed_at: DateTime - When analysis was performed

Revision ID: 8711ddbf29a4
Revises: ea84a37207e1
Create Date: 2025-12-28 21:52:11.909979

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8711ddbf29a4'
down_revision: Union[str, None] = 'ea84a37207e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add AI analysis fields to whatsapp_templates table."""
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'ai_analysis_result',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            comment='Resultado completo da análise de IA (validações, sugestões, problemas)'
        )
    )
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'ai_analysis_score',
            sa.Float(),
            nullable=True,
            comment='Score geral da análise de IA (0-100)'
        )
    )
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'ai_suggested_category',
            sa.String(length=50),
            nullable=True,
            comment='Categoria sugerida pela IA'
        )
    )
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'ai_analyzed_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Data/hora quando foi analisado pela IA'
        )
    )


def downgrade() -> None:
    """Remove AI analysis fields from whatsapp_templates table."""
    op.drop_column('whatsapp_templates', 'ai_analyzed_at')
    op.drop_column('whatsapp_templates', 'ai_suggested_category')
    op.drop_column('whatsapp_templates', 'ai_analysis_score')
    op.drop_column('whatsapp_templates', 'ai_analysis_result')
