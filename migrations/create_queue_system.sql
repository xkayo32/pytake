-- Sistema de Filas de Atendimento

-- Tabela de filas
CREATE TABLE IF NOT EXISTS queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    department VARCHAR(100),
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    max_wait_time INTEGER DEFAULT 30, -- minutos
    max_queue_size INTEGER DEFAULT 100,
    working_hours JSONB DEFAULT '{"start": "09:00", "end": "18:00", "days": [1,2,3,4,5]}',
    welcome_message TEXT,
    waiting_message TEXT,
    offline_message TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de agentes
CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID,
    user_id UUID,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(50),
    avatar_url TEXT,
    status VARCHAR(50) DEFAULT 'offline', -- online, offline, busy, away, break
    max_simultaneous_chats INTEGER DEFAULT 3,
    current_chats INTEGER DEFAULT 0,
    skills JSONB DEFAULT '[]',
    departments JSONB DEFAULT '[]',
    last_activity_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de relação agente-fila
CREATE TABLE IF NOT EXISTS agent_queues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, queue_id)
);

-- Tabela de itens na fila
CREATE TABLE IF NOT EXISTS queue_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
    conversation_id UUID,
    contact_id UUID,
    phone_number VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    position INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'waiting', -- waiting, assigned, in_progress, completed, abandoned
    priority INTEGER DEFAULT 0, -- 0=normal, 1=high, 2=urgent
    wait_start_time TIMESTAMP DEFAULT NOW(),
    wait_end_time TIMESTAMP,
    assigned_agent_id UUID REFERENCES agents(id),
    assigned_at TIMESTAMP,
    completed_at TIMESTAMP,
    abandoned_at TIMESTAMP,
    wait_time_seconds INTEGER,
    handling_time_seconds INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de histórico de atendimentos
CREATE TABLE IF NOT EXISTS queue_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES queues(id),
    queue_item_id UUID REFERENCES queue_items(id),
    agent_id UUID REFERENCES agents(id),
    contact_id UUID,
    phone_number VARCHAR(50),
    action VARCHAR(50), -- entered_queue, assigned, transferred, completed, abandoned
    wait_time_seconds INTEGER,
    handling_time_seconds INTEGER,
    rating INTEGER,
    feedback TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de métricas de fila em tempo real
CREATE TABLE IF NOT EXISTS queue_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
    date DATE DEFAULT CURRENT_DATE,
    hour INTEGER DEFAULT EXTRACT(HOUR FROM NOW()),
    total_entered INTEGER DEFAULT 0,
    total_answered INTEGER DEFAULT 0,
    total_abandoned INTEGER DEFAULT 0,
    avg_wait_time_seconds INTEGER DEFAULT 0,
    avg_handling_time_seconds INTEGER DEFAULT 0,
    max_wait_time_seconds INTEGER DEFAULT 0,
    service_level_pct DECIMAL(5,2) DEFAULT 0, -- % atendidos em X segundos
    agents_online INTEGER DEFAULT 0,
    agents_busy INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(queue_id, date, hour)
);

-- Tabela de regras de roteamento
CREATE TABLE IF NOT EXISTS routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    queue_id UUID REFERENCES queues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50), -- skill_based, round_robin, least_busy, priority
    conditions JSONB DEFAULT '{}',
    priority INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de skills/habilidades
CREATE TABLE IF NOT EXISTS skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela de agent skills
CREATE TABLE IF NOT EXISTS agent_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
    skill_id UUID REFERENCES skills(id) ON DELETE CASCADE,
    proficiency_level INTEGER DEFAULT 1, -- 1-5
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(agent_id, skill_id)
);

-- Índices para otimização
CREATE INDEX IF NOT EXISTS idx_queue_items_status ON queue_items(status);
CREATE INDEX IF NOT EXISTS idx_queue_items_queue_id ON queue_items(queue_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_items_agent ON queue_items(assigned_agent_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_items_wait ON queue_items(queue_id, wait_start_time);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agent_queues_active ON agent_queues(queue_id, is_active);
CREATE INDEX IF NOT EXISTS idx_queue_history_date ON queue_history(created_at);
CREATE INDEX IF NOT EXISTS idx_queue_metrics_date ON queue_metrics(queue_id, date, hour);

-- Função para atualizar posição na fila
CREATE OR REPLACE FUNCTION update_queue_positions()
RETURNS TRIGGER AS $$
BEGIN
    -- Reordenar posições quando item é removido
    IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status != 'waiting') THEN
        UPDATE queue_items
        SET position = position - 1
        WHERE queue_id = OLD.queue_id 
        AND position > OLD.position
        AND status = 'waiting';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para manter posições atualizadas
CREATE TRIGGER trigger_update_queue_positions
AFTER DELETE OR UPDATE OF status ON queue_items
FOR EACH ROW
EXECUTE FUNCTION update_queue_positions();

-- Função para calcular próxima posição na fila
CREATE OR REPLACE FUNCTION get_next_queue_position(p_queue_id UUID)
RETURNS INTEGER AS $$
DECLARE
    next_position INTEGER;
BEGIN
    SELECT COALESCE(MAX(position), 0) + 1
    INTO next_position
    FROM queue_items
    WHERE queue_id = p_queue_id
    AND status = 'waiting';
    
    RETURN next_position;
END;
$$ LANGUAGE plpgsql;

-- Comentários
COMMENT ON TABLE queues IS 'Filas de atendimento do sistema';
COMMENT ON TABLE agents IS 'Agentes/atendentes do sistema';
COMMENT ON TABLE queue_items IS 'Itens aguardando ou sendo atendidos na fila';
COMMENT ON TABLE queue_history IS 'Histórico completo de atendimentos';
COMMENT ON TABLE queue_metrics IS 'Métricas agregadas por hora para dashboards';
COMMENT ON COLUMN agents.status IS 'online, offline, busy, away, break';
COMMENT ON COLUMN queue_items.status IS 'waiting, assigned, in_progress, completed, abandoned';
COMMENT ON COLUMN queue_items.priority IS '0=normal, 1=high, 2=urgent';