"""Add flow automation scheduling with advanced recurrence and exceptions

Revision ID: flow_automation_schedule_001
Revises: ab19c0306fef
Create Date: 2025-11-17 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'flow_automation_schedule_001'
down_revision = 'ab19c0306fef'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create flow_automation_schedules table
    op.create_table(
        'flow_automation_schedules',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('automation_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('recurrence_type', sa.String(50), nullable=False, server_default='once'),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('recurrence_config', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='{}'),
        sa.Column('execution_window_start', sa.Time(), nullable=True),
        sa.Column('execution_window_end', sa.Time(), nullable=True),
        sa.Column('execution_timezone', sa.String(50), nullable=False, server_default='America/Sao_Paulo'),
        sa.Column('blackout_dates', postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default='[]'),
        sa.Column('skip_weekends', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('skip_holidays', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('is_paused', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('last_executed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('next_scheduled_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('execution_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['automation_id'], ['flow_automations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_flow_automation_schedules_automation_id', 'automation_id'),
        sa.Index('ix_flow_automation_schedules_organization_id', 'organization_id'),
    )

    # Create flow_automation_schedule_exceptions table
    op.create_table(
        'flow_automation_schedule_exceptions',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('schedule_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('exception_type', sa.String(50), nullable=False),
        sa.Column('start_date', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_date', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('rescheduled_to', sa.DateTime(timezone=True), nullable=True),
        sa.Column('modified_config', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.ForeignKeyConstraint(['schedule_id'], ['flow_automation_schedules.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.Index('ix_flow_automation_schedule_exceptions_schedule_id', 'schedule_id'),
    )


def downgrade() -> None:
    op.drop_table('flow_automation_schedule_exceptions')
    op.drop_table('flow_automation_schedules')
