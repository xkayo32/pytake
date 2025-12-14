"""enhance_soft_delete_mixin_add_audit_fields

Revision ID: 4d00f6511842
Revises: 7ecd873a7f44
Create Date: 2025-12-14 20:01:45.546096

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4d00f6511842'
down_revision: Union[str, None] = '7ecd873a7f44'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add audit fields to all tables using SoftDeleteMixin:
    - deleted_by_user_id: UUID FK to users(id)
    - deleted_reason: VARCHAR(50) for deletion reason enum
    - deleted_data_snapshot: JSONB for data backup before deletion
    
    These fields enable comprehensive audit trails for all soft deletions.
    """
    # Tables that use SoftDeleteMixin
    tables_with_soft_delete = [
        'users',
        'contacts',
        'conversations',
        'messages',
        'campaigns',
        'departments',
        'organizations',
        'whatsapp_numbers',
        'whatsapp_templates',
        'flows',
        'chatbots',
        'queues',
        'roles',
        'secrets',
        'tags',
    ]

    for table in tables_with_soft_delete:
        # Add deleted_by_user_id column with FK to users
        op.add_column(
            table,
            sa.Column(
                'deleted_by_user_id',
                sa.dialects.postgresql.UUID(as_uuid=True),
                nullable=True,
            )
        )

        # Create FK constraint (SET NULL if user deleted)
        op.create_foreign_key(
            f'fk_{table}_deleted_by_user_id',
            table,
            'users',
            ['deleted_by_user_id'],
            ['id'],
            ondelete='SET NULL'
        )

        # Create index for queries filtering by deleted_by_user_id
        op.create_index(
            f'ix_{table}_deleted_by_user_id',
            table,
            ['deleted_by_user_id']
        )

        # Add deleted_reason column (enum stored as string)
        # Valid values: user_request, duplicate, expired, compliance, error, abuse, policy, unknown
        op.add_column(
            table,
            sa.Column(
                'deleted_reason',
                sa.String(50),
                nullable=True,
                server_default='unknown',
            )
        )

        # Create index for queries filtering by deletion reason
        op.create_index(
            f'ix_{table}_deleted_reason',
            table,
            ['deleted_reason']
        )

        # Add deleted_data_snapshot column for data backup
        op.add_column(
            table,
            sa.Column(
                'deleted_data_snapshot',
                sa.dialects.postgresql.JSONB(astext_type=sa.Text()),
                nullable=True,
            )
        )

        # Create index for JSONB queries
        op.create_index(
            f'ix_{table}_deleted_data_snapshot_gin',
            table,
            ['deleted_data_snapshot'],
            postgresql_using='gin'
        )

        # Create composite index for common audit queries
        # (organization_id + deleted_at) for filtering deletions by org and date
        if table not in ['users', 'organizations']:  # users/org don't have org_id
            op.create_index(
                f'ix_{table}_org_deleted_at_composite',
                table,
                ['organization_id', 'deleted_at']
            )


def downgrade() -> None:
    """
    Remove all audit fields added to SoftDeleteMixin tables.
    Also removes all indexes and FK constraints.
    """
    tables_with_soft_delete = [
        'users',
        'contacts',
        'conversations',
        'messages',
        'campaigns',
        'departments',
        'organizations',
        'whatsapp_numbers',
        'whatsapp_templates',
        'flows',
        'chatbots',
        'queues',
        'roles',
        'secrets',
        'tags',
    ]

    for table in tables_with_soft_delete:
        # Drop JSONB GIN index
        op.drop_index(
            f'ix_{table}_deleted_data_snapshot_gin',
            table=table,
            postgresql_using='gin'
        )

        # Drop deleted_data_snapshot column
        op.drop_column(table, 'deleted_data_snapshot')

        # Drop deleted_reason index
        op.drop_index(
            f'ix_{table}_deleted_reason',
            table=table
        )

        # Drop deleted_reason column
        op.drop_column(table, 'deleted_reason')

        # Drop composite index if exists (not for user/org tables)
        if table not in ['users', 'organizations']:
            try:
                op.drop_index(
                    f'ix_{table}_org_deleted_at_composite',
                    table=table
                )
            except:
                pass

        # Drop FK and index for deleted_by_user_id
        op.drop_index(
            f'ix_{table}_deleted_by_user_id',
            table=table
        )

        op.drop_constraint(
            f'fk_{table}_deleted_by_user_id',
            table,
            type_='foreignkey'
        )

        op.drop_column(table, 'deleted_by_user_id')
