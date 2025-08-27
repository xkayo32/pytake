-- Adicionar campos de expiração e timeout para flows
ALTER TABLE flows 
ADD COLUMN IF NOT EXISTS expiration_minutes INTEGER DEFAULT 10,
ADD COLUMN IF NOT EXISTS inactivity_warning_message TEXT DEFAULT 'Você ainda está aí? Digite qualquer coisa para continuar.',
ADD COLUMN IF NOT EXISTS expiration_message TEXT DEFAULT 'Atendimento finalizado por inatividade. Digite oi para iniciar um novo atendimento.',
ADD COLUMN IF NOT EXISTS redirect_flow_id UUID REFERENCES flows(id),
ADD COLUMN IF NOT EXISTS send_warning_after_minutes INTEGER DEFAULT 7;

-- Adicionar índice para otimizar busca de flows com redirecionamento
CREATE INDEX IF NOT EXISTS idx_flows_redirect ON flows(redirect_flow_id) WHERE redirect_flow_id IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN flows.expiration_minutes IS 'Tempo em minutos para expiração do flow por inatividade';
COMMENT ON COLUMN flows.inactivity_warning_message IS 'Mensagem enviada antes da expiração para avisar sobre inatividade';
COMMENT ON COLUMN flows.expiration_message IS 'Mensagem enviada quando o flow expira por inatividade';
COMMENT ON COLUMN flows.redirect_flow_id IS 'ID do flow para redirecionar após expiração (opcional)';
COMMENT ON COLUMN flows.send_warning_after_minutes IS 'Tempo em minutos para enviar aviso de inatividade';

-- Criar tabela para rastrear sessões ativas de flows
CREATE TABLE IF NOT EXISTS flow_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
    phone_number VARCHAR(50) NOT NULL,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMP NOT NULL DEFAULT NOW(),
    warned_at TIMESTAMP,
    expired_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- active, warned, expired, completed
    current_node_id VARCHAR(255),
    context JSONB DEFAULT '{}',
    CONSTRAINT unique_active_session UNIQUE (flow_id, phone_number, status) WHERE status = 'active'
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_flow_sessions_status ON flow_sessions(status, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_phone ON flow_sessions(phone_number, status);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_flow ON flow_sessions(flow_id, status);