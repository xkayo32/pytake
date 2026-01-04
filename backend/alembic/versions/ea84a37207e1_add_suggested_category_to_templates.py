"""add_suggested_category_to_templates

Revision ID: ea84a37207e1
Revises: d39b26779901
Create Date: 2025-12-28 19:46:07.308304

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ea84a37207e1'
down_revision: Union[str, None] = 'd39b26779901'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add suggested_category column
    op.add_column(
        'whatsapp_templates',
        sa.Column('suggested_category', sa.String(50), nullable=True)
    )


def downgrade() -> None:
    # Remove suggested_category column
    op.drop_column('whatsapp_templates', 'suggested_category')
