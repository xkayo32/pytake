"""add app_secret to whatsapp_numbers

Revision ID: ff4cba69ebb1
Revises: 0e34256e66c6
Create Date: 2025-10-09 23:57:55.098435

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ff4cba69ebb1'
down_revision: Union[str, None] = '0e34256e66c6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add app_secret column to whatsapp_numbers table
    op.add_column(
        'whatsapp_numbers',
        sa.Column('app_secret', sa.Text(), nullable=True)
    )


def downgrade() -> None:
    # Remove app_secret column from whatsapp_numbers table
    op.drop_column('whatsapp_numbers', 'app_secret')
