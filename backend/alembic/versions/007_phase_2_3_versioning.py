"""phase_2_3_template_versioning

Revision ID: 007_phase_2_3_versioning
Revises: 006_phase_2_1_category
Create Date: 2025-12-15 23:45:00.000000

PHASE 2.3 - Template Versioning System
- Add versioning fields to WhatsAppTemplate
- Track content changes and version history
- Support for version rollback
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '007_phase_2_3_versioning'
down_revision = '006_phase_2_1_category'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add version number to track template versions
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'version_number',
            sa.Integer(),
            nullable=False,
            server_default='1',
            comment='Current version number of template'
        )
    )
    
    # Add versioning enabled flag
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'versioning_enabled',
            sa.Boolean(),
            nullable=False,
            server_default='true',
            comment='Enable version tracking for this template'
        )
    )
    
    # Track when version was created
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'version_created_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Timestamp of current version creation'
        )
    )
    
    # Store previous version content (JSONB)
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'previous_version_content',
            sa.JSON(),
            nullable=True,
            comment='Content of previous template version'
        )
    )
    
    # Create version history table
    op.create_table(
        'whatsapp_template_versions',
        sa.Column('id', sa.UUID(), nullable=False, comment='Version ID'),
        sa.Column('template_id', sa.UUID(), nullable=False, comment='Template ID'),
        sa.Column('organization_id', sa.UUID(), nullable=False, comment='Organization ID'),
        sa.Column('version_number', sa.Integer(), nullable=False, comment='Version number'),
        sa.Column('content', sa.JSON(), nullable=False, comment='Template content (body, variables, etc)'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, comment='Version creation timestamp'),
        sa.Column('created_by', sa.UUID(), nullable=True, comment='User who created this version'),
        sa.Column('change_summary', sa.String(255), nullable=True, comment='Summary of changes in this version'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='false', comment='Is this the active version'),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True, comment='Soft delete timestamp'),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['template_id'], ['whatsapp_templates.id']),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id']),
    )
    
    # Create indexes for version queries
    op.create_index(
        'idx_whatsapp_template_versions_template_org',
        'whatsapp_template_versions',
        ['template_id', 'organization_id'],
        unique=False
    )
    
    op.create_index(
        'idx_whatsapp_template_versions_version_number',
        'whatsapp_template_versions',
        ['template_id', 'version_number'],
        unique=True
    )
    
    op.create_index(
        'idx_whatsapp_template_versions_created_at',
        'whatsapp_template_versions',
        ['template_id', 'created_at'],
        unique=False
    )
    
    op.create_index(
        'idx_whatsapp_templates_version_number',
        'whatsapp_templates',
        ['organization_id', 'version_number'],
        unique=False
    )
    
    op.create_index(
        'idx_whatsapp_templates_versioning_enabled',
        'whatsapp_templates',
        ['organization_id', 'versioning_enabled'],
        unique=False
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('idx_whatsapp_templates_versioning_enabled')
    op.drop_index('idx_whatsapp_templates_version_number')
    op.drop_index('idx_whatsapp_template_versions_created_at')
    op.drop_index('idx_whatsapp_template_versions_version_number')
    op.drop_index('idx_whatsapp_template_versions_template_org')
    
    # Drop version history table
    op.drop_table('whatsapp_template_versions')
    
    # Drop columns from main table
    op.drop_column('whatsapp_templates', 'previous_version_content')
    op.drop_column('whatsapp_templates', 'version_created_at')
    op.drop_column('whatsapp_templates', 'versioning_enabled')
    op.drop_column('whatsapp_templates', 'version_number')
