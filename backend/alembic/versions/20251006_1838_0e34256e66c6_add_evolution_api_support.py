"""add_evolution_api_support

Revision ID: 0e34256e66c6
Revises: 0153cb050e63
Create Date: 2025-10-06 18:38:24.259746

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0e34256e66c6'
down_revision: Union[str, None] = '0153cb050e63'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add connection_type column
    op.add_column(
        'whatsapp_numbers',
        sa.Column('connection_type', sa.String(20), nullable=False, server_default='official')
    )

    # Add Evolution API fields
    op.add_column(
        'whatsapp_numbers',
        sa.Column('evolution_instance_name', sa.String(255), nullable=True)
    )
    op.add_column(
        'whatsapp_numbers',
        sa.Column('evolution_api_url', sa.Text(), nullable=True)
    )
    op.add_column(
        'whatsapp_numbers',
        sa.Column('evolution_api_key', sa.Text(), nullable=True)
    )

    # Make Meta Cloud API fields nullable (since they're only for official connections)
    op.alter_column('whatsapp_numbers', 'phone_number_id', nullable=True)
    op.alter_column('whatsapp_numbers', 'whatsapp_business_account_id', nullable=True)
    op.alter_column('whatsapp_numbers', 'access_token', nullable=True)

    # Create unique constraint on evolution_instance_name
    op.create_unique_constraint(
        'uq_whatsapp_numbers_evolution_instance_name',
        'whatsapp_numbers',
        ['evolution_instance_name']
    )


def downgrade() -> None:
    # Drop unique constraint
    op.drop_constraint('uq_whatsapp_numbers_evolution_instance_name', 'whatsapp_numbers', type_='unique')

    # Remove Evolution API fields
    op.drop_column('whatsapp_numbers', 'evolution_api_key')
    op.drop_column('whatsapp_numbers', 'evolution_api_url')
    op.drop_column('whatsapp_numbers', 'evolution_instance_name')

    # Remove connection_type
    op.drop_column('whatsapp_numbers', 'connection_type')

    # Revert Meta fields to non-nullable
    op.alter_column('whatsapp_numbers', 'access_token', nullable=False)
    op.alter_column('whatsapp_numbers', 'whatsapp_business_account_id', nullable=False)
    op.alter_column('whatsapp_numbers', 'phone_number_id', nullable=False)
