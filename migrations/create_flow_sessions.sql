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
    context JSONB DEFAULT '{}'
);

-- Criar índice único parcial para garantir apenas uma sessão ativa por flow/telefone
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_session_idx 
ON flow_sessions(flow_id, phone_number) 
WHERE status = 'active';

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_flow_sessions_status ON flow_sessions(status, last_activity_at);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_phone ON flow_sessions(phone_number, status);
CREATE INDEX IF NOT EXISTS idx_flow_sessions_flow ON flow_sessions(flow_id, status);