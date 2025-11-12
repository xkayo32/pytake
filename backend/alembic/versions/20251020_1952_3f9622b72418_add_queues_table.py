"""add_queues_table

Revision ID: 3f9622b72418
Revises: ec3707951ca5
Create Date: 2025-10-20 19:52:19.305787

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3f9622b72418'
down_revision: Union[str, None] = 'ec3707951ca5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create queues table
    op.create_table(
        'queues',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('department_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=7), server_default='#10B981', nullable=True),
        sa.Column('icon', sa.String(length=50), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('priority', sa.Integer(), server_default='50', nullable=False),
        sa.Column('sla_minutes', sa.Integer(), nullable=True),
        sa.Column('routing_mode', sa.String(length=50), server_default='round_robin', nullable=False),
        sa.Column('auto_assign_conversations', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('max_conversations_per_agent', sa.Integer(), server_default='10', nullable=True),
        sa.Column('total_conversations', sa.Integer(), server_default='0', nullable=True),
        sa.Column('active_conversations', sa.Integer(), server_default='0', nullable=True),
        sa.Column('queued_conversations', sa.Integer(), server_default='0', nullable=True),
        sa.Column('completed_conversations', sa.Integer(), server_default='0', nullable=True),
        sa.Column('average_wait_time_seconds', sa.Integer(), nullable=True),
        sa.Column('average_response_time_seconds', sa.Integer(), nullable=True),
        sa.Column('average_resolution_time_seconds', sa.Integer(), nullable=True),
        sa.Column('customer_satisfaction_score', sa.Integer(), nullable=True),
        sa.Column('settings', postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'{}'::jsonb"), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_queues_organization_id', 'queues', ['organization_id'])
    op.create_index('ix_queues_department_id', 'queues', ['department_id'])
    op.create_index('ix_queues_name', 'queues', ['name'])
    op.create_index('ix_queues_slug', 'queues', ['slug'])

    # Add queue_id to conversations table
    op.add_column('conversations',
        sa.Column('queue_id', postgresql.UUID(as_uuid=True), nullable=True)
    )
    op.create_foreign_key(
        'fk_conversations_queue_id',
        'conversations', 'queues',
        ['queue_id'], ['id'],
        ondelete='SET NULL'
    )
    op.create_index('ix_conversations_queue_id', 'conversations', ['queue_id'])


def downgrade() -> None:
    # Remove queue_id from conversations
    op.drop_index('ix_conversations_queue_id', table_name='conversations')
    op.drop_constraint('fk_conversations_queue_id', 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'queue_id')

    # Drop indexes
    op.drop_index('ix_queues_slug', table_name='queues')
    op.drop_index('ix_queues_name', table_name='queues')
    op.drop_index('ix_queues_department_id', table_name='queues')
    op.drop_index('ix_queues_organization_id', table_name='queues')

    # Drop queues table
    op.drop_table('queues')
