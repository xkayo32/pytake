"""Create conversation_windows table for 24-hour message window tracking

Revision ID: 20251214_conversation_windows
Revises: 20251213_inactivity
Create Date: 2025-12-14 20:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251214_conversation_windows'
down_revision = '20251213_inactivity'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Create conversation_windows table and add columns to conversations table"""
    
    # Create conversation_windows table
    op.create_table(
        'conversation_windows',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('conversation_id', postgresql.UUID(as_uuid=True), nullable=False),
        
        # Window timing
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('ends_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text("NOW() + INTERVAL '24 hours'")),
        
        # Status
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('status', sa.String(50), nullable=False, server_default='active'),
        sa.Column('close_reason', sa.String(255), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        
        # Timestamps (soft delete)
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('NOW()')),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        
        # Primary and Foreign Keys
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('conversation_id', name='uq_conversation_window_unique'),
        
        # Indexes
        sa.Index('ix_conversation_windows_organization_id', 'organization_id'),
        sa.Index('ix_conversation_windows_conversation_id', 'conversation_id'),
        sa.Index('ix_conversation_windows_started_at', 'started_at'),
        sa.Index('ix_conversation_windows_ends_at', 'ends_at'),
        sa.Index('ix_conversation_windows_is_active', 'is_active'),
        sa.Index('ix_conversation_windows_status', 'status'),
    )


def downgrade() -> None:
    """Drop conversation_windows table"""
    op.drop_table('conversation_windows')
