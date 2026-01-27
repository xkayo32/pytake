"""add_quality_tracking_columns_to_templates

Revision ID: d39b26779901
Revises: 069b858ab150
Create Date: 2025-12-28 16:48:35.804591

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd39b26779901'
down_revision: Union[str, None] = '069b858ab150'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add quality_score column
    op.add_column(
        'whatsapp_templates',
        sa.Column('quality_score', sa.String(20), nullable=True)
    )

    # Add paused_at column
    op.add_column(
        'whatsapp_templates',
        sa.Column('paused_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Add disabled_at column
    op.add_column(
        'whatsapp_templates',
        sa.Column('disabled_at', sa.DateTime(timezone=True), nullable=True)
    )

    # Add disabled_reason column
    op.add_column(
        'whatsapp_templates',
        sa.Column('disabled_reason', sa.Text(), nullable=True)
    )

    # Add last_status_update column
    op.add_column(
        'whatsapp_templates',
        sa.Column('last_status_update', sa.DateTime(timezone=True), nullable=True)
    )


def downgrade() -> None:
    # Remove columns in reverse order
    op.drop_column('whatsapp_templates', 'last_status_update')
    op.drop_column('whatsapp_templates', 'disabled_reason')
    op.drop_column('whatsapp_templates', 'disabled_at')
    op.drop_column('whatsapp_templates', 'paused_at')
    op.drop_column('whatsapp_templates', 'quality_score')
