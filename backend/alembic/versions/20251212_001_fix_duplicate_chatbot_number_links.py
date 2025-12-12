"""
Fix duplicate chatbot_number_links entries
Remove duplicate (chatbot_id, whatsapp_number_id) pairs, keeping the oldest one

Revision ID: ec7c4d8b9e1f
Revises: 5d648988529a
Create Date: 2025-12-12 03:00:00.000000

Author: Kayo Carvalho Fernandes
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = "ec7c4d8b9e1f"
down_revision = "5d648988529a"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade database schema - Remove duplicate links keeping oldest"""
    
    # Delete duplicate entries, keeping only the oldest (smallest id in uuid order)
    # This subquery identifies all duplicates except the first created one
    op.execute(text("""
        DELETE FROM chatbot_number_links cnl
        WHERE ctid NOT IN (
            SELECT MIN(ctid)
            FROM chatbot_number_links
            GROUP BY chatbot_id, whatsapp_number_id, organization_id
        );
    """))


def downgrade() -> None:
    """Downgrade - Nothing to do as duplicates are removed"""
    pass
