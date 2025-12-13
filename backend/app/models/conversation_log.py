"""
Conversation Log Model

Auditoria imutável de todas as mensagens trocadas em uma conversa.
Usado para histórico, analytics e debugging.

Author: Kayo Carvalho Fernandes
"""

from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, UUID, DateTime, ForeignKey, Index, Text
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base


class ConversationLog(Base):
    """
    Log imutável de conversas (audit trail).
    
    Attributes:
        id: UUID único do log
        organization_id: FK → organizations (multi-tenancy)
        phone_number: Número do usuário
        flow_id: FK → flows (qual fluxo estava em execução)
        user_message: Mensagem do usuário (texto completo)
        bot_response: Resposta do bot (pode ser múltiplas concatenadas)
        node_id: ID do nó que gerou a resposta
        timestamp: Quando aconteceu (índice para queries históricas)
        metadata: JSONB com dados extras (erros, tentativas, etc)
    """
    
    __tablename__ = "conversation_logs"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Foreign Keys (Multi-tenancy)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    flow_id = Column(UUID(as_uuid=True), ForeignKey("flows.id", ondelete="CASCADE"), nullable=False)
    
    # Conversation Identifiers
    phone_number = Column(String(20), nullable=False, index=True)
    
    # Message Content
    user_message = Column(Text, nullable=True)  # nullable se for bot iniciando
    bot_response = Column(Text, nullable=False)
    
    # Flow Context
    node_id = Column(String(255), nullable=True)  # qual nó gerou essa resposta
    
    # Timestamp
    timestamp = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Extra Data
    extra_data = Column(JSONB, default={}, nullable=False)
    
    # Indexes para queries históricas
    __table_args__ = (
        Index('idx_logs_org_flow_ts', 'organization_id', 'flow_id', 'timestamp'),
        Index('idx_logs_org_phone_ts', 'organization_id', 'phone_number', 'timestamp'),
    )
    
    def __repr__(self):
        return f"<ConversationLog(id={self.id}, org={self.organization_id}, phone={self.phone_number}, node={self.node_id}, ts={self.timestamp})>"
