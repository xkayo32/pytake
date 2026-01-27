"""add assigned_at to conversations

Revision ID: 2b7d9f_add_assigned_at
Revises: 20251023_1441_79d54cf2c247_add_advanced_retry_tracking_to_campaigns
Create Date: 2025-10-25 01:12:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2b7d9f_add_assigned_at'
# down_revision previously referenced the filename-like id; adjust to the actual revision id
down_revision = '79d54cf2c247'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add nullable assigned_at timestamp to conversations
    op.add_column('conversations', sa.Column('assigned_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('conversations', 'assigned_at')
