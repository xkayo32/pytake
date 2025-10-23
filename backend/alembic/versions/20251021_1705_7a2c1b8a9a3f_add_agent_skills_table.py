"""add agent_skills table

Revision ID: 7a2c1b8a9a3f
Revises: 60aed40af817
Create Date: 2025-10-21 17:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = '7a2c1b8a9a3f'
down_revision = '60aed40af817'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'agent_skills',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, server_default=sa.text('gen_random_uuid()')),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('skill_name', sa.String(length=100), nullable=False),
        sa.Column('proficiency_level', sa.Integer(), nullable=False, server_default='3'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    # Use IF NOT EXISTS to be idempotent in case of partial previous runs
    op.execute('CREATE INDEX IF NOT EXISTS ix_agent_skills_org_id ON agent_skills (organization_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_agent_skills_user_id ON agent_skills (user_id)')
    op.execute('CREATE INDEX IF NOT EXISTS ix_agent_skills_skill_name ON agent_skills (skill_name)')


def downgrade() -> None:
    op.drop_index('ix_agent_skills_skill_name', table_name='agent_skills')
    op.drop_index('ix_agent_skills_user_id', table_name='agent_skills')
    op.drop_index('ix_agent_skills_org_id', table_name='agent_skills')
    op.drop_table('agent_skills')
