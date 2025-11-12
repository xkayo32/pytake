"""add_queue_overflow_settings

Revision ID: 60aed40af817
Revises: 3f9622b72418
Create Date: 2025-10-21 15:03:14.060634

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '60aed40af817'
down_revision: Union[str, None] = '3f9622b72418'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add overflow settings columns to queues table
    op.add_column('queues', sa.Column('max_queue_size', sa.Integer(), nullable=True))
    op.add_column('queues', sa.Column('overflow_queue_id', postgresql.UUID(as_uuid=True), nullable=True))
    
    # Add foreign key constraint for overflow_queue_id
    op.create_foreign_key(
        'fk_queues_overflow_queue_id',
        'queues',
        'queues',
        ['overflow_queue_id'],
        ['id'],
        ondelete='SET NULL'
    )
    
    # Add index for overflow_queue_id
    op.create_index(
        'ix_queues_overflow_queue_id',
        'queues',
        ['overflow_queue_id'],
        unique=False
    )


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_queues_overflow_queue_id', table_name='queues')
    
    # Remove foreign key
    op.drop_constraint('fk_queues_overflow_queue_id', 'queues', type_='foreignkey')
    
    # Remove columns
    op.drop_column('queues', 'overflow_queue_id')
    op.drop_column('queues', 'max_queue_size')
