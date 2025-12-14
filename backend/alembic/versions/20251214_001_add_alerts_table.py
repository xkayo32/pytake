"""add alerts table for template status monitoring

Revision ID: 20251214_alerts
Revises: 20251213_inactivity
Create Date: 2025-12-14 19:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251214_alerts'
down_revision = '20251213_inactivity'
branch_labels = None
depends_on = None


def upgrade():
    # Create alerts table
    op.create_table(
        'alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('whatsapp_template_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('alert_type', sa.String(50), nullable=False),
        sa.Column('severity', sa.String(50), nullable=False, server_default='warning'),
        sa.Column('status', sa.String(50), nullable=False, server_default='open'),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('acknowledged_by_user_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledgment_notes', sa.Text(), nullable=True),
        sa.Column('escalation_level', sa.Integer(), server_default='1', nullable=False),
        sa.Column('escalated_to_admin', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('escalated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_resolved', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('auto_resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('auto_resolved_reason', sa.Text(), nullable=True),
        sa.Column('alert_metadata', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column('notification_sent', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('notification_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['acknowledged_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['whatsapp_template_id'], ['whatsapp_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_alert_org_status', 'alerts', ['organization_id', 'status'])
    op.create_index('ix_alert_template_status', 'alerts', ['whatsapp_template_id', 'status'])
    op.create_index('ix_alert_severity', 'alerts', ['severity'])
    op.create_index('ix_alert_created_at', 'alerts', ['created_at'])
    op.create_index('ix_alert_escalation', 'alerts', ['escalation_level', 'status'])
    op.create_index('ix_alert_type', 'alerts', ['alert_type'])


def downgrade():
    # Drop indexes
    op.drop_index('ix_alert_type', table_name='alerts')
    op.drop_index('ix_alert_escalation', table_name='alerts')
    op.drop_index('ix_alert_created_at', table_name='alerts')
    op.drop_index('ix_alert_severity', table_name='alerts')
    op.drop_index('ix_alert_template_status', table_name='alerts')
    op.drop_index('ix_alert_org_status', table_name='alerts')
    
    # Drop table
    op.drop_table('alerts')
