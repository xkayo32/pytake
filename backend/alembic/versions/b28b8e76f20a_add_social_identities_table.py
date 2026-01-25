"""add_social_identities_table

Revision ID: b28b8e76f20a
Revises: 69e9a6ebbd2e
Create Date: 2026-01-25 20:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b28b8e76f20a'
down_revision: Union[str, None] = '69e9a6ebbd2e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'social_identities',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('provider', sa.String(length=20), nullable=False),
        sa.Column('social_user_id', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('avatar_url', sa.String(length=2048), nullable=True),
        sa.Column('access_token', sa.Text(), nullable=False),
        sa.Column('refresh_token', sa.Text(), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('linked_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_login_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('idx_social_identity_user_provider', 'social_identities', ['user_id', 'provider'])
    op.create_index('idx_social_identity_org_provider', 'social_identities', ['organization_id', 'provider'])
    op.create_index('idx_social_identity_social_user', 'social_identities', ['social_user_id'])


def downgrade() -> None:
    op.drop_index('idx_social_identity_social_user', table_name='social_identities')
    op.drop_index('idx_social_identity_org_provider', table_name='social_identities')
    op.drop_index('idx_social_identity_user_provider', table_name='social_identities')
    op.drop_table('social_identities')
