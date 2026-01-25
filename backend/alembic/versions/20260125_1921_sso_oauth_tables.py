"""add oauth_provider, user_identity, audit_log tables for SSO/HIPAA

Revision ID: 20260125_1921_sso_oauth_tables
Revises: e6e5cc5f7d09
Create Date: 2026-01-25 19:21:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260125_1921_sso_oauth_tables'
down_revision = 'e6e5cc5f7d09'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create oauth_providers table
    op.create_table(
        'oauth_providers',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider_type', sa.String(50), nullable=False, comment='saml2.0, oidc, custom'),
        sa.Column('name', sa.String(255), nullable=False, comment='Display name (e.g., "Okta", "Auth0")'),
        sa.Column('client_id', sa.String(255), nullable=False, comment='OAuth client ID or SAML entity ID'),
        sa.Column('client_secret', sa.Text(), nullable=True, comment='OAuth client secret (encrypted)'),
        sa.Column('metadata_url', sa.String(500), nullable=True, comment='SAML IdP metadata URL or OIDC .well-known endpoint'),
        sa.Column('entity_id', sa.String(500), nullable=True, comment='SAML IdP entity ID'),
        sa.Column('acs_url', sa.String(500), nullable=True, comment='SAML Assertion Consumer Service URL'),
        sa.Column('logout_url', sa.String(500), nullable=True, comment='SAML logout URL for SLO'),
        sa.Column('sso_url', sa.String(500), nullable=True, comment='SAML SSO URL for IdP login'),
        sa.Column('config', postgresql.JSONB(astext_type=sa.Text()), nullable=True, comment='Additional provider config'),
        sa.Column('is_enabled', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('is_primary', sa.Boolean(), server_default='false', nullable=False, comment='Primary provider for this organization'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_oauth_providers_org_type', 'oauth_providers', ['organization_id', 'provider_type'])
    op.create_index('idx_oauth_providers_org_enabled', 'oauth_providers', ['organization_id', 'is_enabled'])

    # Create user_identities table
    op.create_table(
        'user_identities',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('oauth_provider_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('external_id', sa.String(500), nullable=False, comment='SAML NameID or OIDC sub (unique per provider)'),
        sa.Column('external_email', sa.String(255), nullable=True, comment='Email from OAuth provider'),
        sa.Column('is_primary', sa.Boolean(), server_default='false', nullable=False, comment='Primary SSO method'),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True, comment='Last successful OAuth login'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['oauth_provider_id'], ['oauth_providers.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_user_identity_external', 'user_identities', ['oauth_provider_id', 'external_id'])
    op.create_index('idx_user_identity_user', 'user_identities', ['user_id'])


def downgrade() -> None:
    op.drop_index('idx_user_identity_user')
    op.drop_index('idx_user_identity_external')
    op.drop_table('user_identities')

    # Drop oauth_providers table
    op.drop_index('idx_oauth_providers_org_enabled')
    op.drop_index('idx_oauth_providers_org_type')
    op.drop_table('oauth_providers')
