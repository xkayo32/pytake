"""add_ai_custom_models_table

Revision ID: ec3707951ca5
Revises: 10070f17e02d
Create Date: 2025-10-16 15:54:49.181438

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ec3707951ca5'
down_revision: Union[str, None] = '10070f17e02d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create ai_custom_models table
    op.create_table(
        'ai_custom_models',
        sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.UUID(), nullable=False),
        sa.Column('model_id', sa.String(255), nullable=False),
        sa.Column('provider', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('context_window', sa.Integer(), nullable=False),
        sa.Column('max_output_tokens', sa.Integer(), nullable=False),
        sa.Column('input_cost_per_million', sa.Float(), nullable=False),
        sa.Column('output_cost_per_million', sa.Float(), nullable=False),
        sa.Column('supports_vision', sa.Boolean(), server_default='false', nullable=False),
        sa.Column('supports_tools', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('release_date', sa.String(10), nullable=True),
        sa.Column('is_active', sa.Boolean(), server_default='true', nullable=False),
        sa.Column('usage_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('total_input_tokens', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('total_output_tokens', sa.BigInteger(), server_default='0', nullable=False),
        sa.Column('total_cost', sa.Float(), server_default='0.0', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_ai_custom_models_organization_id', 'ai_custom_models', ['organization_id'])
    op.create_index('ix_ai_custom_models_model_id', 'ai_custom_models', ['model_id'])
    op.create_index('ix_ai_custom_models_provider', 'ai_custom_models', ['provider'])
    op.create_index('ix_ai_custom_models_is_active', 'ai_custom_models', ['is_active'])

    # Create unique constraint for model_id per organization
    op.create_unique_constraint(
        'uq_ai_custom_models_org_model',
        'ai_custom_models',
        ['organization_id', 'model_id']
    )


def downgrade() -> None:
    op.drop_table('ai_custom_models')
