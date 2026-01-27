"""
Conversation State Model

Responsável por armazenar o estado atual de uma conversa WhatsApp.
Mantém track do nó atual, variáveis coletadas e histórico de execução.

Author: Kayo Carvalho Fernandes
"""

from datetime import datetime, timedelta
from uuid import uuid4
from sqlalchemy import Column, String, UUID, Boolean, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from app.core.database import Base


class ConversationState(Base):
    """
    Armazena estado da conversa entre usuário e chatbot.
    
    Attributes:
        id: UUID único do estado
        organization_id: FK → organizations (multi-tenancy)
        phone_number: Número do usuário ("+55 11 99999-9999")
        flow_id: FK → flows (qual fluxo está em execução)
        current_node_id: ID do nó atual no fluxo (nullable = conversa não iniciada)
        variables: JSONB com variáveis coletadas {"nome": "João", "produto": "2"}
        execution_path: JSONB array de nós visitados ["start", "greeting", ...]
        is_active: Se conversa está ativa ou finalizada
        last_message_at: Timestamp da última mensagem
        session_expires_at: TTL - quando a conversa expira (cleanup automático)
        created_at: Timestamp de criação
        updated_at: Timestamp da última atualização
    """
    
    __tablename__ = "conversation_states"
    
    # Primary Key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    
    # Foreign Keys (Multi-tenancy)
    organization_id = Column(UUID(as_uuid=True), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    flow_id = Column(UUID(as_uuid=True), ForeignKey("flows.id", ondelete="CASCADE"), nullable=False)
    
    # Conversation Identifiers
    phone_number = Column(String(20), nullable=False, index=True)
    
    # State Management
    current_node_id = Column(String(255), nullable=True)
    variables = Column(JSONB, default={}, nullable=False)
    execution_path = Column(JSONB, default=[], nullable=False)
    
    # Status
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    
    # Timestamps
    last_message_at = Column(DateTime, nullable=True)
    session_expires_at = Column(DateTime, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    
    # Composite Indexes (Multi-tenancy)
    __table_args__ = (
        Index('idx_conv_org_phone', 'organization_id', 'phone_number'),
        Index('idx_conv_org_flow_active', 'organization_id', 'flow_id', 'is_active'),
        Index('idx_conv_expires', 'session_expires_at'),
        # Garantir unicidade: uma conversa ativa por org/phone/flow
        # (permita múltiplas se não-ativas para histórico)
    )
    
    def __repr__(self):
        return f"<ConversationState(id={self.id}, org={self.organization_id}, phone={self.phone_number}, flow={self.flow_id}, active={self.is_active})>"
    
    def is_expired(self) -> bool:
        """Verifica se a conversa expirou"""
        if not self.session_expires_at:
            return False
        return datetime.utcnow() > self.session_expires_at
    
    def update_session_ttl(self, hours: int = 24) -> None:
        """Atualiza TTL da sessão (mantém ativa por mais X horas)"""
        self.session_expires_at = datetime.utcnow() + timedelta(hours=hours)
        self.last_message_at = datetime.utcnow()
