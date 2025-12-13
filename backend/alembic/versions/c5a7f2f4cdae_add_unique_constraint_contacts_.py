"""add_unique_constraint_contacts_organization_whatsapp_id

Revision ID: c5a7f2f4cdae
Revises: 20251213_inactivity
Create Date: 2025-12-13 23:30:47.608040

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c5a7f2f4cdae'
down_revision: Union[str, None] = '20251213_inactivity'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
