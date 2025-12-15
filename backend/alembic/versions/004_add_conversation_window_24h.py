"""
Add 24-hour conversation window tracking for Meta WhatsApp API compliance

This migration adds fields to track the 24-hour conversation window in Meta's
WhatsApp Business API. Free messages can only be sent within 24 hours of:
1. Last message from user (conversation initiated by customer)
2. Successful template message send (conversation initiated by business)

Revision ID: 004_window_24h
Revises: c5a7f2f4cdae
Create Date: 2025-12-15 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '004_window_24h'
down_revision = 'c5a7f2f4cdae'
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Add window_expires_at and last_user_message_at fields to conversations table."""
    
    # Add window_expires_at: Timestamp when 24h window expires
    # Window starts from:
    # - Last incoming message from user (highest priority), OR
    # - Last successful template message sent by us
    op.add_column(
        'conversations',
        sa.Column(
            'window_expires_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Timestamp when 24h conversation window expires. Updates on incoming user messages or template sends.'
        )
    )
    
    # Add last_user_message_at: Track when user last sent a message
    # This is used to calculate window expiration
    op.add_column(
        'conversations',
        sa.Column(
            'last_user_message_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Timestamp of last message received from user. Used to calculate 24h window.'
        )
    )
    
    # Add last_template_message_at: Track when we last sent a template message
    # Used as secondary window start point if no user messages received
    op.add_column(
        'conversations',
        sa.Column(
            'last_template_message_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Timestamp of last template message sent. Secondary window start point.'
        )
    )
    
    # Add is_window_open: Cached boolean for quick window status checks
    # Prevents repeated datetime calculations in hot paths
    op.add_column(
        'conversations',
        sa.Column(
            'is_window_open',
            sa.Boolean(),
            nullable=False,
            default=False,
            server_default='false',
            comment='Cached window open status. true = can send free messages, false = must use template.'
        )
    )
    
    # Add window_status_last_checked_at: Track when window status was last validated
    # Helps identify conversations where window might have expired silently
    op.add_column(
        'conversations',
        sa.Column(
            'window_status_last_checked_at',
            sa.DateTime(timezone=True),
            nullable=True,
            comment='Last timestamp when window status was checked/updated.'
        )
    )
    
    # Create indexes for efficient queries
    
    # Index for finding conversations with open windows
    op.create_index(
        'idx_conversations_is_window_open_org',
        'conversations',
        ['is_window_open', 'organization_id'],
        postgresql_where=sa.text('is_window_open = true'),
        comment='Find conversations with open windows in an organization'
    )
    
    # Index for finding conversations where window is about to expire
    op.create_index(
        'idx_conversations_window_expires_at_org',
        'conversations',
        ['window_expires_at', 'organization_id'],
        postgresql_where=sa.text('window_expires_at IS NOT NULL AND is_window_open = true'),
        comment='Find conversations where window is about to expire'
    )
    
    # Index for updating window status on incoming messages
    op.create_index(
        'idx_conversations_last_user_message_at',
        'conversations',
        ['last_user_message_at'],
        postgresql_where=sa.text('last_user_message_at IS NOT NULL'),
        comment='Quick lookup for conversations with recent user messages'
    )


def downgrade() -> None:
    """Remove window tracking fields from conversations table."""
    
    # Drop indexes first
    op.drop_index('idx_conversations_last_user_message_at', table_name='conversations')
    op.drop_index('idx_conversations_window_expires_at_org', table_name='conversations')
    op.drop_index('idx_conversations_is_window_open_org', table_name='conversations')
    
    # Drop columns
    op.drop_column('conversations', 'window_status_last_checked_at')
    op.drop_column('conversations', 'is_window_open')
    op.drop_column('conversations', 'last_template_message_at')
    op.drop_column('conversations', 'last_user_message_at')
    op.drop_column('conversations', 'window_expires_at')
