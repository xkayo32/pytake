"""Create expenses tracking tables - Phase 3.3

Revision ID: 015
Revises: 014
Create Date: 2025-12-16 00:20:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '015'
down_revision = '014'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create expenses table for tracking template costs
    op.create_table(
        'expenses',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('template_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('message_count', sa.Integer, nullable=False, server_default='0'),
        sa.Column('cost_usd', sa.Numeric(precision=12, scale=4), nullable=False),
        sa.Column('category', sa.String(50), nullable=False),
        sa.Column('complexity_level', sa.String(50), nullable=True),
        sa.Column('period_start', sa.DateTime(timezone=True), nullable=False),
        sa.Column('period_end', sa.DateTime(timezone=True), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['template_id'], ['whatsapp_templates.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    # Index for quick lookups by organization and date
    op.create_index('idx_expenses_organization_date', 'expenses', ['organization_id', 'created_at'])
    op.create_index('idx_expenses_template_organization', 'expenses', ['template_id', 'organization_id'])

    # Create organization_cost_limits table
    op.create_table(
        'organization_cost_limits',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('monthly_limit_usd', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('alert_threshold_percentage', sa.Integer, nullable=False, server_default='80'),
        sa.Column('is_active', sa.Boolean, nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('organization_id')
    )
    op.create_index('idx_cost_limits_organization', 'organization_cost_limits', ['organization_id'])

    # Create expense_alerts table for tracking alert notifications
    op.create_table(
        'expense_alerts',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('alert_type', sa.String(50), nullable=False),  # 'threshold_exceeded', 'limit_reached', 'anomaly'
        sa.Column('current_cost_usd', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('limit_cost_usd', sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column('percentage_of_limit', sa.Integer, nullable=False),
        sa.Column('period_month', sa.Integer, nullable=False),
        sa.Column('period_year', sa.Integer, nullable=False),
        sa.Column('is_acknowledged', sa.Boolean, nullable=False, server_default='false'),
        sa.Column('acknowledged_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_expense_alerts_organization', 'expense_alerts', ['organization_id', 'created_at'])


def downgrade() -> None:
    op.drop_index('idx_expense_alerts_organization')
    op.drop_table('expense_alerts')
    op.drop_index('idx_cost_limits_organization')
    op.drop_table('organization_cost_limits')
    op.drop_index('idx_expenses_template_organization')
    op.drop_index('idx_expenses_organization_date')
    op.drop_table('expenses')
