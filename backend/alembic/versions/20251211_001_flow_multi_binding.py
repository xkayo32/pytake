"""
Add multi-binding, fallback flow, and A/B testing support

Features:
- Multi-binding: Vincular um flow a múltiplos números WhatsApp
- Fallback flow: Usar como rota padrão para números não mapeados
- A/B testing: Distribuir mensagens entre múltiplos flows
- Linking history: Auditoria de todas as mudanças de vinculação

Revision ID: 20251211_001_flow_multi_binding
Revises: ad2cf0fe4121
Create Date: 2025-12-11 00:00:00.000000

Author: Kayo Carvalho Fernandes
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.sql import text

# revision identifiers, used by Alembic.
revision = "20251211_001_flow_multi_binding"
down_revision = "ad2cf0fe4121"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """Upgrade database schema"""
    
    # =====================================================
    # 1. Adicionar novos campos ao chatbots
    # =====================================================
    
    op.add_column(
        "chatbots",
        sa.Column(
            "is_fallback",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    
    op.add_column(
        "chatbots",
        sa.Column(
            "linked_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    
    op.add_column(
        "chatbots",
        sa.Column(
            "ab_test_enabled",
            sa.Boolean(),
            nullable=False,
            server_default="false",
        ),
    )
    
    op.add_column(
        "chatbots",
        sa.Column(
            "ab_test_flows",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=text("'[]'::jsonb"),
        ),
    )
    
    # =====================================================
    # 2. Criar tabela chatbot_number_links (N:N)
    # =====================================================
    
    op.create_table(
        "chatbot_number_links",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chatbot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("whatsapp_number_id", sa.String(50), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("linked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["chatbot_id"],
            ["chatbots.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "chatbot_id",
            "whatsapp_number_id",
            name="uq_chatbot_number_link",
        ),
    )
    
    # Índices para performance
    op.create_index(
        "ix_chatbot_number_links_chatbot_id",
        "chatbot_number_links",
        ["chatbot_id"],
    )
    op.create_index(
        "ix_chatbot_number_links_organization_id",
        "chatbot_number_links",
        ["organization_id"],
    )
    op.create_index(
        "ix_chatbot_number_links_whatsapp_number_id",
        "chatbot_number_links",
        ["whatsapp_number_id"],
    )
    op.create_index(
        "ix_chatbot_number_links_org_number",
        "chatbot_number_links",
        ["organization_id", "whatsapp_number_id"],
    )
    
    # =====================================================
    # 3. Criar tabela chatbot_linking_history (auditoria)
    # =====================================================
    
    op.create_table(
        "chatbot_linking_history",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("chatbot_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("action", sa.String(20), nullable=False),  # 'linked' ou 'unlinked'
        sa.Column("whatsapp_number_id", sa.String(50), nullable=False),
        sa.Column("changed_by", sa.String(255), nullable=False),  # Email do usuário
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(
            ["chatbot_id"],
            ["chatbots.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    
    # Índices para performance
    op.create_index(
        "ix_chatbot_linking_history_chatbot_id",
        "chatbot_linking_history",
        ["chatbot_id"],
    )
    op.create_index(
        "ix_chatbot_linking_history_organization_id",
        "chatbot_linking_history",
        ["organization_id"],
    )
    op.create_index(
        "ix_chatbot_linking_history_timestamp",
        "chatbot_linking_history",
        ["timestamp"],
    )
    op.create_index(
        "ix_chatbot_linking_history_chatbot_timestamp",
        "chatbot_linking_history",
        ["chatbot_id", sa.desc("timestamp")],
    )
    
    # =====================================================
    # 4. Adicionar constraint UNIQUE(organization_id, is_fallback=true)
    # =====================================================
    
    # PostgreSQL: usar partial unique index para is_fallback=true
    op.create_index(
        "ix_chatbots_org_fallback_unique",
        "chatbots",
        ["organization_id"],
        postgresql_where=sa.text("is_fallback = true AND deleted_at IS NULL"),
        unique=True,
    )


def downgrade() -> None:
    """Downgrade database schema"""
    
    # Remover índices e tabelas
    op.drop_index(
        "ix_chatbots_org_fallback_unique",
        table_name="chatbots",
    )
    
    op.drop_table("chatbot_linking_history")
    op.drop_table("chatbot_number_links")
    
    # Remover colunas do chatbots
    op.drop_column("chatbots", "ab_test_flows")
    op.drop_column("chatbots", "ab_test_enabled")
    op.drop_column("chatbots", "linked_at")
    op.drop_column("chatbots", "is_fallback")
