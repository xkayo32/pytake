"""add_is_vip_to_contacts

Revision ID: add_is_vip_contacts
Revises: 20251021_1705_7a2c1b8a9a3f
Create Date: 2025-10-21 20:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_is_vip_contacts'
down_revision: Union[str, None] = '7a2c1b8a9a3f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add is_vip column to contacts table
    op.add_column('contacts', sa.Column('is_vip', sa.Boolean(), server_default='false', nullable=False))
    
    # Create index on is_vip for faster VIP filtering
    op.execute('CREATE INDEX IF NOT EXISTS ix_contacts_is_vip ON contacts (is_vip)')


def downgrade() -> None:
    # Drop index
    op.execute('DROP INDEX IF EXISTS ix_contacts_is_vip')
    
    # Drop column
    op.drop_column('contacts', 'is_vip')
