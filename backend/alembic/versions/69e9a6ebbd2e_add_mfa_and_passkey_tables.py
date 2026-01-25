"""add_mfa_and_passkey_tables

Revision ID: 69e9a6ebbd2e
Revises: 20260125_1921_sso_oauth_tables
Create Date: 2026-01-25 20:23:32.777889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '69e9a6ebbd2e'
down_revision: Union[str, None] = '20260125_1921_sso_oauth_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create MFA Methods table
    op.create_table(
        'mfa_methods',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('method_type', sa.String(length=20), nullable=False),
        sa.Column('secret', sa.String(length=500), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('backup_codes_generated', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_mfa_methods_user_org', 'mfa_methods', ['user_id', 'organization_id'])
    op.create_index('idx_mfa_methods_org_type', 'mfa_methods', ['organization_id', 'method_type'])
    op.create_index('idx_mfa_methods_user_verified', 'mfa_methods', ['user_id', 'is_verified'])
    
    # Create MFA Challenges table
    op.create_table(
        'mfa_challenges',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('method_id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=255), nullable=True),
        sa.Column('challenge_token', sa.String(length=255), nullable=False),
        sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['method_id'], ['mfa_methods.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('challenge_token'),
    )
    op.create_index('idx_mfa_challenges_user_org', 'mfa_challenges', ['user_id', 'organization_id'])
    op.create_index('idx_mfa_challenges_token', 'mfa_challenges', ['challenge_token'])
    op.create_index('idx_mfa_challenges_expires', 'mfa_challenges', ['expires_at'])
    
    # Create MFA Backup Codes table
    op.create_table(
        'mfa_backup_codes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(length=255), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_mfa_backup_codes_user', 'mfa_backup_codes', ['user_id'])
    op.create_index('idx_mfa_backup_codes_org', 'mfa_backup_codes', ['organization_id'])
    
    # Create Passkey Credentials table
    op.create_table(
        'passkey_credentials',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('credential_id', sa.String(length=1000), nullable=False),
        sa.Column('public_key', sa.Text(), nullable=False),
        sa.Column('counter', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('transports', sa.String(length=255), nullable=True),
        sa.Column('device_name', sa.String(length=255), nullable=False),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('credential_id'),
    )
    op.create_index('idx_passkey_credentials_user_org', 'passkey_credentials', ['user_id', 'organization_id'])
    op.create_index('idx_passkey_credentials_credential_id', 'passkey_credentials', ['credential_id'])
    op.create_index('idx_passkey_credentials_primary', 'passkey_credentials', ['user_id', 'is_primary'])
    
    # Create Passkey Challenges table
    op.create_table(
        'passkey_challenges',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=True),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('challenge', sa.String(length=500), nullable=False),
        sa.Column('challenge_type', sa.String(length=20), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_passkey_challenges_user_org', 'passkey_challenges', ['user_id', 'organization_id'])
    op.create_index('idx_passkey_challenges_challenge', 'passkey_challenges', ['challenge'])
    op.create_index('idx_passkey_challenges_expires', 'passkey_challenges', ['expires_at'])


def downgrade() -> None:
    op.drop_index('idx_passkey_challenges_expires', table_name='passkey_challenges')
    op.drop_index('idx_passkey_challenges_challenge', table_name='passkey_challenges')
    op.drop_index('idx_passkey_challenges_user_org', table_name='passkey_challenges')
    op.drop_table('passkey_challenges')
    op.drop_index('idx_passkey_credentials_primary', table_name='passkey_credentials')
    op.drop_index('idx_passkey_credentials_credential_id', table_name='passkey_credentials')
    op.drop_index('idx_passkey_credentials_user_org', table_name='passkey_credentials')
    op.drop_table('passkey_credentials')
    op.drop_index('idx_mfa_backup_codes_org', table_name='mfa_backup_codes')
    op.drop_index('idx_mfa_backup_codes_user', table_name='mfa_backup_codes')
    op.drop_table('mfa_backup_codes')
    op.drop_index('idx_mfa_challenges_expires', table_name='mfa_challenges')
    op.drop_index('idx_mfa_challenges_token', table_name='mfa_challenges')
    op.drop_index('idx_mfa_challenges_user_org', table_name='mfa_challenges')
    op.drop_table('mfa_challenges')
    op.drop_index('idx_mfa_methods_user_verified', table_name='mfa_methods')
    op.drop_index('idx_mfa_methods_org_type', table_name='mfa_methods')
    op.drop_index('idx_mfa_methods_user_org', table_name='mfa_methods')
    op.drop_table('mfa_methods')
