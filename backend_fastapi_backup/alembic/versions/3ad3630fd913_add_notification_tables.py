"""Add notification tables

Revision ID: 3ad3630fd913
Revises: ba3dfadb685d
Create Date: 2025-11-25 03:52:02.604886

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '3ad3630fd913'
down_revision: Union[str, None] = 'ba3dfadb685d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create notification_preferences table
    op.create_table('notification_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', postgresql.UUID(), nullable=False),
        sa.Column('organization_id', postgresql.UUID(), nullable=False),
        sa.Column('email_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('sms_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('whatsapp_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('websocket_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('in_app_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('quiet_hours_start', sa.String(), nullable=True),
        sa.Column('quiet_hours_end', sa.String(), nullable=True),
        sa.Column('quiet_hours_enabled', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('max_emails_per_hour', sa.Integer(), server_default='10', nullable=False),
        sa.Column('max_sms_per_hour', sa.Integer(), server_default='5', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'organization_id', name='uq_user_org_notification')
    )
    op.create_index('ix_notification_preferences_org_id', 'notification_preferences', ['organization_id'])
    op.create_index('ix_notification_preferences_user_id', 'notification_preferences', ['user_id'])
    
    # Create notification_logs table
    op.create_table('notification_logs',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organization_id', postgresql.UUID(), nullable=False),  # Use UUID type
        sa.Column('user_id', postgresql.UUID(), nullable=False),
        sa.Column('notification_type', postgresql.ENUM('CONVERSATION_ASSIGNED', 'SLA_WARNING', 'CAMPAIGN_FAILED', 'NEW_CONTACT', 'CONVERSATION_CLOSED', 'AGENT_OFFLINE', 'CUSTOM', name='notificationtype'), nullable=False),
        sa.Column('channel', postgresql.ENUM('EMAIL', 'SMS', 'WHATSAPP', 'WEBSOCKET', 'IN_APP', name='notificationchannel'), nullable=False),
        sa.Column('subject', sa.String(255), nullable=True),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('recipient', sa.String(255), nullable=False),
        sa.Column('status', sa.String(50), server_default='pending', nullable=False),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('sent_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('notification_metadata', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('retry_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('max_retries', sa.Integer(), server_default='3', nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_notification_logs_org_id', 'notification_logs', ['organization_id'])
    op.create_index('ix_notification_logs_user_id', 'notification_logs', ['user_id'])
    op.create_index('ix_notification_logs_status', 'notification_logs', ['status'])
    op.create_index('ix_notification_logs_created_at', 'notification_logs', ['created_at'])
    op.create_index('ix_notification_logs_channel', 'notification_logs', ['channel'])


def downgrade() -> None:
    op.drop_index('ix_notification_logs_channel', table_name='notification_logs')
    op.drop_index('ix_notification_logs_created_at', table_name='notification_logs')
    op.drop_index('ix_notification_logs_status', table_name='notification_logs')
    op.drop_index('ix_notification_logs_user_id', table_name='notification_logs')
    op.drop_index('ix_notification_logs_org_id', table_name='notification_logs')
    op.drop_table('notification_logs')
    
    op.drop_index('ix_notification_preferences_user_id', table_name='notification_preferences')
    op.drop_index('ix_notification_preferences_org_id', table_name='notification_preferences')
    op.drop_table('notification_preferences')
    
    # Drop enums
    op.execute('DROP TYPE IF EXISTS notificationtype;')
    op.execute('DROP TYPE IF EXISTS notificationchannel;')


