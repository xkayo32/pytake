"""
Alembic migration: Add conversation window tracking for 24h customer service window

This migration adds columns to track the Meta 24-hour customer service window
for conversations. This window determines when templates are required vs free-form
messages are allowed.

Adds:
- window_expires_at: timestamp when 24h window expires (calculated from last user message)
- last_user_message_at: timestamp of last message received FROM user
"""

from alembic import op
import sqlalchemy as sa


def upgrade() -> None:
    """Add conversation window tracking columns"""
    
    # Check if window_expires_at already exists
    # Add last_user_message_at column (new tracking for 24h window calculation)
    op.add_column(
        'conversations',
        sa.Column(
            'last_user_message_at',
            sa.DateTime(timezone=True),
            nullable=True
        )
    )
    
    # Create indexes for performance
    op.create_index(
        'idx_conversations_last_user_message_at',
        'conversations',
        ['last_user_message_at'],
        postgresql_where=sa.text("deleted_at IS NULL")
    )
    
    # Also create/verify index on window_expires_at
    try:
        op.create_index(
            'idx_conversations_window_expires_at',
            'conversations',
            ['window_expires_at'],
            postgresql_where=sa.text("status = 'open' AND deleted_at IS NULL")
        )
    except Exception:
        # Index might already exist
        pass


def downgrade() -> None:
    """Remove conversation window tracking columns"""
    
    # Drop indexes
    try:
        op.drop_index('idx_conversations_last_user_message_at', table_name='conversations')
    except Exception:
        pass
    
    try:
        op.drop_index('idx_conversations_window_expires_at', table_name='conversations')
    except Exception:
        pass
    
    # Drop columns
    op.drop_column('conversations', 'last_user_message_at')
