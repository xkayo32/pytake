"""add_parameter_format_and_named_variables_to_templates

Revision ID: 069b858ab150
Revises: c5a7f2f4cdae
Create Date: 2025-12-28 16:42:27.244295

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB


# revision identifiers, used by Alembic.
revision: str = '069b858ab150'
down_revision: Union[str, None] = 'c5a7f2f4cdae'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add parameter_format column
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'parameter_format',
            sa.String(20),
            nullable=False,
            server_default='POSITIONAL'
        )
    )

    # Add named_variables column
    op.add_column(
        'whatsapp_templates',
        sa.Column(
            'named_variables',
            JSONB,
            nullable=False,
            server_default=sa.text("'[]'::jsonb")
        )
    )


def downgrade() -> None:
    # Remove named_variables column
    op.drop_column('whatsapp_templates', 'named_variables')

    # Remove parameter_format column
    op.drop_column('whatsapp_templates', 'parameter_format')
