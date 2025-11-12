"""
Flow Automation models - Proactive flow dispatching to multiple recipients
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, Time
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from app.models.base import Base, SoftDeleteMixin, TimestampMixin


class FlowAutomation(Base, TimestampMixin, SoftDeleteMixin):
    """
    Flow Automation - Disparo ativo de flows para múltiplos destinatários
    
    Permite criar automações que executam flows proativamente para listas de
    contatos com variáveis personalizadas e diferentes tipos de triggers.
    """

    __tablename__ = "flow_automations"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Configuração Básica
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)

    # Flow Vinculado
    chatbot_id = Column(
        UUID(as_uuid=True),
        ForeignKey("chatbots.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    flow_id = Column(
        UUID(as_uuid=True),
        ForeignKey("flows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    whatsapp_number_id = Column(
        UUID(as_uuid=True),
        ForeignKey("whatsapp_numbers.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Tipo de Trigger
    # "manual", "scheduled", "cron", "webhook", "event"
    trigger_type = Column(String(50), nullable=False, default="manual")

    # Configuração de Trigger (JSONB flexível)
    trigger_config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # Exemplos:
    # {"type": "cron", "expression": "0 10 * * *"}  # Diário às 10h
    # {"type": "scheduled", "datetime": "2025-11-01T10:00:00Z"}
    # {"type": "webhook", "event": "payment.overdue"}
    # {"type": "event", "event_type": "conversation.closed"}

    # Audiência
    audience_type = Column(String(50), nullable=False, default="custom")
    # "all", "segment", "tags", "custom", "uploaded"
    
    audience_config = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # Exemplos:
    # {"type": "segment", "filters": {"last_purchase_days_ago": {"gt": 30}}}
    # {"type": "tags", "tag_ids": ["uuid1", "uuid2"]}
    # {"type": "custom", "contact_ids": ["uuid1", "uuid2"]}

    # Variáveis Dinâmicas (template)
    # Mapeamento de campos do contato para variáveis do flow
    variable_mapping = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # Exemplo:
    # {
    #   "customer_name": "{{contact.name}}",
    #   "points": "{{contact.custom_fields.loyalty_points}}",
    #   "discount": "{{function.generate_coupon()}}"
    # }

    # Status
    # "draft", "active", "paused", "completed", "archived"
    status = Column(String(50), nullable=False, default="draft")
    is_active = Column(Boolean, default=False, nullable=False)

    # Limitações e Controles
    max_concurrent_executions = Column(Integer, default=50)
    rate_limit_per_hour = Column(Integer, default=100)
    retry_failed = Column(Boolean, default=True, nullable=False)
    max_retries = Column(Integer, default=3)

    # Janela de Execução (horário comercial)
    execution_window_start = Column(Time, nullable=True)  # Ex: 09:00
    execution_window_end = Column(Time, nullable=True)    # Ex: 18:00
    execution_timezone = Column(String(50), default="America/Sao_Paulo")

    # Estatísticas (agregadas de todas as execuções)
    total_executions = Column(Integer, default=0, nullable=False)
    total_sent = Column(Integer, default=0, nullable=False)
    total_delivered = Column(Integer, default=0, nullable=False)
    total_read = Column(Integer, default=0, nullable=False)
    total_replied = Column(Integer, default=0, nullable=False)
    total_completed = Column(Integer, default=0, nullable=False)
    total_failed = Column(Integer, default=0, nullable=False)

    # Timestamps de Execução
    last_executed_at = Column(DateTime(timezone=True), nullable=True)
    next_scheduled_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    chatbot = relationship("Chatbot", foreign_keys=[chatbot_id])
    flow = relationship("Flow", foreign_keys=[flow_id])
    whatsapp_number = relationship("WhatsAppNumber", foreign_keys=[whatsapp_number_id])
    executions = relationship(
        "FlowAutomationExecution",
        back_populates="automation",
        cascade="all, delete-orphan",
    )


class FlowAutomationExecution(Base, TimestampMixin):
    """
    Flow Automation Execution - Uma execução da automação
    
    Representa um disparo agendado/manual da automação.
    Cada execução rastreia o progresso e status do batch de envios.
    """

    __tablename__ = "flow_automation_executions"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    automation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("flow_automations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Metadados da Execução
    execution_type = Column(String(50), nullable=False)
    # "manual", "scheduled", "trigger"
    
    triggered_by_user_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    triggered_by_event = Column(String(255), nullable=True)
    # "cron", "webhook:payment.overdue", "event:conversation.closed"

    # Status
    # "queued", "running", "paused", "completed", "failed", "cancelled"
    status = Column(String(50), nullable=False, default="queued")

    # Audiência Resolvida
    total_recipients = Column(Integer, default=0, nullable=False)

    # Progresso
    messages_sent = Column(Integer, default=0, nullable=False)
    messages_delivered = Column(Integer, default=0, nullable=False)
    messages_read = Column(Integer, default=0, nullable=False)
    messages_replied = Column(Integer, default=0, nullable=False)
    messages_completed = Column(Integer, default=0, nullable=False)
    messages_failed = Column(Integer, default=0, nullable=False)

    # Timestamps
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    paused_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    # Erros
    error_message = Column(Text, nullable=True)
    errors = Column(JSONB, nullable=False, server_default=text("'[]'::jsonb"))
    # Lista de erros detalhados

    # Relationships
    automation = relationship("FlowAutomation", back_populates="executions")
    recipients = relationship(
        "FlowAutomationRecipient",
        back_populates="execution",
        cascade="all, delete-orphan",
    )
    triggered_by_user = relationship("User", foreign_keys=[triggered_by_user_id])


class FlowAutomationRecipient(Base, TimestampMixin):
    """
    Flow Automation Recipient - Um destinatário individual numa execução
    
    Rastreia o status do flow para cada contato individualmente.
    Permite monitoramento granular e retry por destinatário.
    """

    __tablename__ = "flow_automation_recipients"

    # Primary Key
    id = Column(
        UUID(as_uuid=True),
        primary_key=True,
        server_default=text("gen_random_uuid()"),
    )

    # Foreign Keys
    execution_id = Column(
        UUID(as_uuid=True),
        ForeignKey("flow_automation_executions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    organization_id = Column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Destinatário
    contact_id = Column(
        UUID(as_uuid=True),
        ForeignKey("contacts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    phone_number = Column(String(20), nullable=False)

    # Variáveis Resolvidas (específicas deste destinatário)
    variables = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))
    # Exemplo:
    # {
    #   "customer_name": "João Silva",
    #   "points": 1500,
    #   "discount_code": "JOAO2025"
    # }

    # Status
    # "pending", "queued", "sent", "delivered", "read", "replied",
    # "completed", "failed", "skipped"
    status = Column(String(50), nullable=False, default="pending")

    # Conversation criada
    conversation_id = Column(
        UUID(as_uuid=True),
        ForeignKey("conversations.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Tentativas
    attempts = Column(Integer, default=0, nullable=False)
    last_attempt_at = Column(DateTime(timezone=True), nullable=True)

    # Resultado do Flow
    flow_completed = Column(Boolean, default=False, nullable=False)
    flow_current_node = Column(String(255), nullable=True)
    # ID do nó atual se flow pausado
    
    flow_outcome = Column(String(100), nullable=True)
    # "converted", "opted_out", "no_response", etc.

    # Timestamps
    sent_at = Column(DateTime(timezone=True), nullable=True)
    delivered_at = Column(DateTime(timezone=True), nullable=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    # Erro
    error_message = Column(Text, nullable=True)

    # Relationships
    execution = relationship("FlowAutomationExecution", back_populates="recipients")
    contact = relationship("Contact", foreign_keys=[contact_id])
    conversation = relationship("Conversation", foreign_keys=[conversation_id])
