"""Add conversation inactivity settings to flows

Revision ID: 20251213_inactivity
Revises: 9f8e3d7c2b1a
Create Date: 2025-12-13 17:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251213_inactivity'
down_revision = '9f8e3d7c2b1a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add inactivity_settings column to flows table"""
    op.add_column(
        'flows',
        sa.Column(
            'inactivity_settings',
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text(
                "'{\"enabled\": true, \"timeout_minutes\": 60, \"action\": \"transfer\", \"send_warning_at_minutes\": null, \"warning_message\": null, \"fallback_flow_id\": null}'::jsonb"
            )
        )
    )


def downgrade() -> None:
    """Remove inactivity_settings column from flows table"""
    op.drop_column('flows', 'inactivity_settings')
