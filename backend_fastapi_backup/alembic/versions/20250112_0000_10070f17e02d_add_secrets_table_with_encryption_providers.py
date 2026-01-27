"""add secrets table with encryption providers

Revision ID: 10070f17e02d
Revises: 5d5e0dd8f6de
Create Date: 2025-01-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '10070f17e02d'
down_revision: Union[str, None] = '5d5e0dd8f6de'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create SecretScope enum
    secret_scope_enum = postgresql.ENUM(
        'organization', 'chatbot',
        name='secretscope',
        create_type=False
    )
    secret_scope_enum.create(op.get_bind(), checkfirst=True)

    # Create EncryptionProvider enum
    encryption_provider_enum = postgresql.ENUM(
        'fernet', 'aws_kms', 'vault',
        name='encryptionprovider',
        create_type=False
    )
    encryption_provider_enum.create(op.get_bind(), checkfirst=True)

    # Create secrets table
    op.create_table(
        'secrets',
        sa.Column('id', postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('chatbot_id', postgresql.UUID(as_uuid=True), nullable=True),

        # Identification
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),

        # Encrypted value
        sa.Column('encrypted_value', sa.Text(), nullable=False),

        # Encryption configuration
        sa.Column('encryption_provider',
                  postgresql.ENUM('fernet', 'aws_kms', 'vault', name='encryptionprovider', create_type=False),
                  nullable=False,
                  server_default='fernet'),
        sa.Column('encryption_key_id', sa.String(255), nullable=True),  # For AWS KMS, Vault path
        sa.Column('encryption_metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # Scope and status
        sa.Column('scope',
                  postgresql.ENUM('organization', 'chatbot', name='secretscope', create_type=False),
                  nullable=False,
                  server_default='chatbot'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),

        # Metadata
        sa.Column('metadata', postgresql.JSONB(astext_type=sa.Text()), nullable=True),

        # Audit fields
        sa.Column('last_used_at', sa.DateTime(), nullable=True),
        sa.Column('usage_count', sa.Integer(), nullable=False, server_default='0'),

        # Timestamps
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),

        # Primary key
        sa.PrimaryKeyConstraint('id'),

        # Foreign keys
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['chatbot_id'], ['chatbots.id'], ondelete='CASCADE')
    )

    # Create indexes
    op.create_index('ix_secrets_organization_id', 'secrets', ['organization_id'])
    op.create_index('ix_secrets_chatbot_id', 'secrets', ['chatbot_id'])
    op.create_index('ix_secrets_name', 'secrets', ['name'])
    op.create_index('ix_secrets_is_active', 'secrets', ['is_active'])
    op.create_index('ix_secrets_encryption_provider', 'secrets', ['encryption_provider'])

    # Create unique constraint: name único por organização/chatbot
    # Se chatbot_id for NULL, considera apenas organization_id
    op.create_unique_constraint(
        'uq_secrets_org_chatbot_name',
        'secrets',
        ['organization_id', 'chatbot_id', 'name']
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_secrets_encryption_provider', table_name='secrets')
    op.drop_index('ix_secrets_is_active', table_name='secrets')
    op.drop_index('ix_secrets_name', table_name='secrets')
    op.drop_index('ix_secrets_chatbot_id', table_name='secrets')
    op.drop_index('ix_secrets_organization_id', table_name='secrets')

    # Drop unique constraint
    op.drop_constraint('uq_secrets_org_chatbot_name', 'secrets', type_='unique')

    # Drop table
    op.drop_table('secrets')

    # Drop enums
    sa.Enum(name='encryptionprovider').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='secretscope').drop(op.get_bind(), checkfirst=True)
