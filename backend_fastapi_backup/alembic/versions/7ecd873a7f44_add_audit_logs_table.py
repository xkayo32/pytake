"""add_audit_logs_table

Revision ID: 7ecd873a7f44
Revises: 20251224_001_create_expenses
Create Date: 2025-12-14 19:59:18.858122

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7ecd873a7f44'
down_revision: Union[str, None] = '20251224_001_create_expenses'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create audit_logs table
    op.create_table(
        'audit_logs',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), server_default=sa.text('gen_random_uuid()'), nullable=False),
        sa.Column('organization_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('deleted_by_user_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('deleted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('model_type', sa.String(100), nullable=False),
        sa.Column('record_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('record_name', sa.String(255), nullable=True),
        sa.Column('deletion_reason', sa.String(50), nullable=True),
        sa.Column('custom_reason', sa.Text(), nullable=True),
        sa.Column('deleted_data_snapshot', sa.dialects.postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('ip_address', sa.dialects.postgresql.INET(), nullable=True),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('extra_data', sa.dialects.postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('deleted_at_audit', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['organization_id'], ['organizations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['deleted_by_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for common queries
    op.create_index('ix_audit_logs_organization_id', 'audit_logs', ['organization_id'])
    op.create_index('ix_audit_logs_deleted_at', 'audit_logs', ['deleted_at'])
    op.create_index('ix_audit_logs_deleted_by_user_id', 'audit_logs', ['deleted_by_user_id'])
    op.create_index('ix_audit_logs_model_type', 'audit_logs', ['model_type'])
    op.create_index('ix_audit_logs_record_id', 'audit_logs', ['record_id'])
    op.create_index('ix_audit_logs_deletion_reason', 'audit_logs', ['deletion_reason'])
    
    # Composite indexes for common queries
    op.create_index('ix_audit_logs_org_deleted_at', 'audit_logs', ['organization_id', 'deleted_at'])
    op.create_index('ix_audit_logs_record_model', 'audit_logs', ['record_id', 'model_type'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_audit_logs_record_model')
    op.drop_index('ix_audit_logs_org_deleted_at')
    op.drop_index('ix_audit_logs_deletion_reason')
    op.drop_index('ix_audit_logs_record_id')
    op.drop_index('ix_audit_logs_model_type')
    op.drop_index('ix_audit_logs_deleted_by_user_id')
    op.drop_index('ix_audit_logs_deleted_at')
    op.drop_index('ix_audit_logs_organization_id')
    
    # Drop table
    op.drop_table('audit_logs')
