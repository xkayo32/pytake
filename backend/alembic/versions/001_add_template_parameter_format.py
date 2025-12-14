"""
Alembic migration: Add template parameter format support

This migration adds support for Named Parameters ({{name}}) in addition to
Positional Parameters ({{1}}, {{2}}) for WhatsApp templates.

Migration adds:
- parameter_format: POSITIONAL or NAMED
- named_variables: JSONB array to store mapping of variable names
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


def upgrade() -> None:
    """Add parameter format columns to whatsapp_templates table"""
    
    # Add parameter_format column with CHECK constraint
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'parameter_format',
            sa.String(20),
            nullable=False,
            server_default='POSITIONAL'
        )
    )
    
    # Add named_variables JSONB column for Named Parameters mapping
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'named_variables',
            postgresql.JSONB(),
            nullable=False,
            server_default='[]'
        )
    )
    
    # Create CHECK constraint for parameter_format
    op.create_check_constraint(
        'ck_whatsapp_templates_parameter_format',
        'whatsapp_templates',
        "parameter_format IN ('POSITIONAL', 'NAMED')"
    )
    
    # Create index for queries filtering by parameter_format
    op.create_index(
        'idx_templates_parameter_format',
        'whatsapp_templates',
        ['parameter_format'],
        postgresql_where=sa.text("deleted_at IS NULL")
    )


def downgrade() -> None:
    """Remove parameter format columns from whatsapp_templates table"""
    
    # Drop index
    op.drop_index('idx_templates_parameter_format', table_name='whatsapp_templates')
    
    # Drop CHECK constraint
    op.drop_constraint('ck_whatsapp_templates_parameter_format', 'whatsapp_templates', type_='check')
    
    # Drop columns
    op.drop_column('whatsapp_templates', 'named_variables')
    op.drop_column('whatsapp_templates', 'parameter_format')
