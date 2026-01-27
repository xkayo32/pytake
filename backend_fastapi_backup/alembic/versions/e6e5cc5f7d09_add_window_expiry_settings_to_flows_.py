"""add_window_expiry_settings_to_flows_clean

Revision ID: e6e5cc5f7d09
Revises: ea84a37207e1
Create Date: 2026-01-04 19:51:54.725274

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'e6e5cc5f7d09'
down_revision: Union[str, None] = '8711ddbf29a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar coluna window_expiry_settings na tabela flows
    op.add_column('flows', sa.Column('window_expiry_settings', postgresql.JSONB(astext_type=sa.Text()), nullable=True))


def downgrade() -> None:
    # Remover coluna window_expiry_settings da tabela flows
    op.drop_column('flows', 'window_expiry_settings')
