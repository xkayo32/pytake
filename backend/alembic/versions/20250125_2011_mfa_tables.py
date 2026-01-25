"""Create MFA tables (TOTP, SMS, backup codes)

Revision ID: 20250125_2011
Revises: e6d9f68
Create Date: 2026-01-25 20:11:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20250125_2011'
down_revision = 'e6d9f68'
branch_labels = None
depends_on = None


def upgrade():
    # Create mfa_methods table
    op.create_table(
        'mfa_methods',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('method_type', sa.String(20), nullable=False),
        sa.Column('secret', sa.String(500), nullable=False),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('is_primary', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('backup_codes_generated', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for mfa_methods
    op.create_index('idx_mfa_methods_user_org', 'mfa_methods', ['user_id', 'organization_id'])
    op.create_index('idx_mfa_methods_org_method', 'mfa_methods', ['organization_id', 'method_type'])
    op.create_index('idx_mfa_methods_verified', 'mfa_methods', ['user_id', 'is_verified'])
    
    # Create mfa_challenges table
    op.create_table(
        'mfa_challenges',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('mfa_method_id', sa.UUID(), nullable=False),
        sa.Column('challenge_token', sa.String(255), nullable=False, unique=True),
        sa.Column('code', sa.String(255), nullable=False),
        sa.Column('method_type', sa.String(20), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('attempt_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('max_attempts', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['mfa_method_id'], ['mfa_methods.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for mfa_challenges
    op.create_index('idx_mfa_challenges_user_org', 'mfa_challenges', ['user_id', 'organization_id'])
    op.create_index('idx_mfa_challenges_token', 'mfa_challenges', ['challenge_token'])
    op.create_index('idx_mfa_challenges_expires', 'mfa_challenges', ['expires_at'])
    
    # Create mfa_backup_codes table
    op.create_table(
        'mfa_backup_codes',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('code', sa.String(255), nullable=False),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('used_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['user.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for mfa_backup_codes
    op.create_index('idx_mfa_backup_codes_user', 'mfa_backup_codes', ['user_id'])
    op.create_index('idx_mfa_backup_codes_org', 'mfa_backup_codes', ['organization_id'])


def downgrade():
    op.drop_index('idx_mfa_backup_codes_org', 'mfa_backup_codes')
    op.drop_index('idx_mfa_backup_codes_user', 'mfa_backup_codes')
    op.drop_table('mfa_backup_codes')
    
    op.drop_index('idx_mfa_challenges_expires', 'mfa_challenges')
    op.drop_index('idx_mfa_challenges_token', 'mfa_challenges')
    op.drop_index('idx_mfa_challenges_user_org', 'mfa_challenges')
    op.drop_table('mfa_challenges')
    
    op.drop_index('idx_mfa_methods_verified', 'mfa_methods')
    op.drop_index('idx_mfa_methods_org_method', 'mfa_methods')
    op.drop_index('idx_mfa_methods_user_org', 'mfa_methods')
    op.drop_table('mfa_methods')
