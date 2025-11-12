"""add_advanced_retry_tracking_to_campaigns

Revision ID: 79d54cf2c247
Revises: add_is_vip_contacts
Create Date: 2025-10-23 14:41:04.436164

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision: str = '79d54cf2c247'
down_revision: Union[str, None] = 'add_is_vip_contacts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add advanced retry tracking fields to campaigns table
    
    New fields:
    - errors: Array of all retry attempts with full details
    - message_statuses: Real-time status tracking per contact
    - retry_max_attempts: Max retry attempts per message (default 3)
    - retry_base_delay: Base delay in seconds for exponential backoff (default 60)
    - retry_max_delay: Max delay in seconds for exponential backoff (default 3600)
    """
    
    # Add errors JSONB array - stores all retry attempts
    op.add_column(
        'campaigns',
        sa.Column(
            'errors',
            JSONB,
            nullable=False,
            server_default=text("'[]'::jsonb")
        )
    )
    
    # Add message_statuses JSONB dict - stores current status per contact
    op.add_column(
        'campaigns',
        sa.Column(
            'message_statuses',
            JSONB,
            nullable=False,
            server_default=text("'{}'::jsonb")
        )
    )
    
    # Add retry configuration fields
    op.add_column(
        'campaigns',
        sa.Column(
            'retry_max_attempts',
            sa.Integer,
            nullable=False,
            server_default='3'
        )
    )
    
    op.add_column(
        'campaigns',
        sa.Column(
            'retry_base_delay',
            sa.Integer,
            nullable=False,
            server_default='60'
        )
    )
    
    op.add_column(
        'campaigns',
        sa.Column(
            'retry_max_delay',
            sa.Integer,
            nullable=False,
            server_default='3600'
        )
    )


def downgrade() -> None:
    """
    Remove advanced retry tracking fields from campaigns table
    """
    op.drop_column('campaigns', 'retry_max_delay')
    op.drop_column('campaigns', 'retry_base_delay')
    op.drop_column('campaigns', 'retry_max_attempts')
    op.drop_column('campaigns', 'message_statuses')
    op.drop_column('campaigns', 'errors')
