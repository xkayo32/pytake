"""add whatsapp_number_id to chatbots

Revision ID: 5d5e0dd8f6de
Revises: ff4cba69ebb1
Create Date: 2025-10-12 22:53:45.662643

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5d5e0dd8f6de'
down_revision: Union[str, None] = 'ff4cba69ebb1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add whatsapp_number_id column to chatbots table
    op.add_column(
        'chatbots',
        sa.Column(
            'whatsapp_number_id',
            sa.UUID(),
            nullable=True
        )
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_chatbots_whatsapp_number_id',
        'chatbots',
        'whatsapp_numbers',
        ['whatsapp_number_id'],
        ['id'],
        ondelete='SET NULL'
    )

    # Add index for performance
    op.create_index(
        'ix_chatbots_whatsapp_number_id',
        'chatbots',
        ['whatsapp_number_id']
    )


def downgrade() -> None:
    # Remove index
    op.drop_index('ix_chatbots_whatsapp_number_id', table_name='chatbots')

    # Remove foreign key
    op.drop_constraint('fk_chatbots_whatsapp_number_id', 'chatbots', type_='foreignkey')

    # Remove column
    op.drop_column('chatbots', 'whatsapp_number_id')
