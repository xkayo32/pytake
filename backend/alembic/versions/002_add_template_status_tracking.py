"""
Alembic migration: Add template status tracking columns

This migration adds columns for tracking template quality scores and status changes
required by the Meta Cloud API template lifecycle management.

Adds:
- quality_score: GREEN, YELLOW, RED, UNKNOWN
- paused_at: timestamp when template was paused by Meta
- disabled_at: timestamp when template was disabled
- disabled_reason: reason for disabling
- last_status_update: last time status was updated
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


def upgrade() -> None:
    """Add template status tracking columns"""
    
    # Add quality_score column
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'quality_score',
            sa.String(20),
            nullable=True
        )
    )
    
    # Add paused_at column
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'paused_at',
            sa.DateTime(timezone=True),
            nullable=True
        )
    )
    
    # Add disabled_at column
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'disabled_at',
            sa.DateTime(timezone=True),
            nullable=True
        )
    )
    
    # Add disabled_reason column
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'disabled_reason',
            sa.Text(),
            nullable=True
        )
    )
    
    # Add last_status_update column
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'last_status_update',
            sa.DateTime(timezone=True),
            nullable=True
        )
    )
    
    # Create CHECK constraint for quality_score
    op.create_check_constraint(
        'ck_whatsapp_templates_quality_score',
        'whatsapp_templates',
        "quality_score IS NULL OR quality_score IN ('UNKNOWN', 'GREEN', 'YELLOW', 'RED')"
    )
    
    # Create indexes for performance
    op.create_index(
        'idx_templates_quality_score',
        'whatsapp_templates',
        ['quality_score'],
        postgresql_where=sa.text("deleted_at IS NULL")
    )
    
    op.create_index(
        'idx_templates_paused_at',
        'whatsapp_templates',
        ['paused_at'],
        postgresql_where=sa.text("paused_at IS NOT NULL AND deleted_at IS NULL")
    )
    
    op.create_index(
        'idx_templates_disabled_at',
        'whatsapp_templates',
        ['disabled_at'],
        postgresql_where=sa.text("disabled_at IS NOT NULL AND deleted_at IS NULL")
    )


def downgrade() -> None:
    """Remove template status tracking columns"""
    
    # Drop indexes
    op.drop_index('idx_templates_disabled_at', table_name='whatsapp_templates')
    op.drop_index('idx_templates_paused_at', table_name='whatsapp_templates')
    op.drop_index('idx_templates_quality_score', table_name='whatsapp_templates')
    
    # Drop CHECK constraint
    op.drop_constraint('ck_whatsapp_templates_quality_score', 'whatsapp_templates', type_='check')
    
    # Drop columns
    op.drop_column('whatsapp_templates', 'last_status_update')
    op.drop_column('whatsapp_templates', 'disabled_reason')
    op.drop_column('whatsapp_templates', 'disabled_at')
    op.drop_column('whatsapp_templates', 'paused_at')
    op.drop_column('whatsapp_templates', 'quality_score')
