"""Add webhook_token to WhatsAppNumber for tenant isolation

Revision ID: 001_webhook_token_isolation
Revises: 20260125_1921_sso_oauth_tables
Create Date: 2026-01-26 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
import uuid


# revision identifiers, used by Alembic.
revision = '001_webhook_token_isolation'
down_revision = '20260125_1921_sso_oauth_tables'
branch_labels = None
depends_on = None


def upgrade():
    """Add webhook_token column for tenant-isolated webhooks"""
    # Add webhook_token column
    op.add_column(
        'whatsapp_numbers',
        sa.Column(
            'webhook_token',
            postgresql.UUID(as_uuid=True),
            nullable=True,  # Temporarily nullable
            server_default=sa.text('gen_random_uuid()'),
        )
    )
    
    # Create index on webhook_token
    op.create_index(
        op.f('ix_whatsapp_numbers_webhook_token'),
        'whatsapp_numbers',
        ['webhook_token'],
        unique=True,
    )
    
    # Set not null constraint after populating
    op.alter_column('whatsapp_numbers', 'webhook_token', nullable=False)


def downgrade():
    """Remove webhook_token column"""
    # Drop index
    op.drop_index(
        op.f('ix_whatsapp_numbers_webhook_token'),
        table_name='whatsapp_numbers',
    )
    
    # Drop column
    op.drop_column('whatsapp_numbers', 'webhook_token')
