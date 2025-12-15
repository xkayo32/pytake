"""phase_2_1_allow_category_change

Revision ID: 006_phase_2_1_category
Revises: c5a7f2f4cdae
Create Date: 2025-12-15 23:30:00.000000

PHASE 2.1 - Template Category Change Flag
- Add allow_category_change flag to WhatsAppTemplate
- Track category change detection
- Support for category change alerts
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '006_phase_2_1_category'
down_revision = 'c5a7f2f4cdae'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add allow_category_change column to whatsapp_templates
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'allow_category_change',
            sa.Boolean(),
            nullable=False,
            server_default='false',
            comment='Allow template category to change without alerts'
        )
    )
    
    # Add category_change_detection column to track changes
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'category_change_detection',
            sa.Boolean(),
            nullable=False,
            server_default='true',
            comment='Enable automatic detection of category changes'
        )
    )
    
    # Add last_category_change_at timestamp
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'last_category_change_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Timestamp of last detected category change'
        )
    )
    
    # Add previous_category to track what changed
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'previous_category',
            sa.String(50),
            nullable=True,
            comment='Previous template category before change'
        )
    )
    
    # Add category_change_count counter
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'category_change_count',
            sa.Integer(),
            nullable=False,
            server_default='0',
            comment='Number of category changes detected'
        )
    )
    
    # Create index for category change queries
    op.create_index(
        'idx_whatsapp_templates_allow_category_change',
        'whatsapp_templates',
        ['organization_id', 'allow_category_change'],
        unique=False
    )
    
    op.create_index(
        'idx_whatsapp_templates_category_change_detection',
        'whatsapp_templates',
        ['organization_id', 'category_change_detection'],
        unique=False
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_whatsapp_templates_category_change_detection')
    op.drop_index('idx_whatsapp_templates_allow_category_change')
    
    # Drop columns
    op.drop_column('whatsapp_templates', 'category_change_count')
    op.drop_column('whatsapp_templates', 'previous_category')
    op.drop_column('whatsapp_templates', 'last_category_change_at')
    op.drop_column('whatsapp_templates', 'category_change_detection')
    op.drop_column('whatsapp_templates', 'allow_category_change')
