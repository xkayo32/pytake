-- Tabela de templates do WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    
    -- Identificadores Meta
    meta_template_id VARCHAR(255), -- ID do template no Meta (quando aprovado)
    name VARCHAR(100) NOT NULL, -- Nome único do template
    
    -- Status e categoria
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, PENDING, APPROVED, REJECTED, PAUSED
    category VARCHAR(50) DEFAULT 'UTILITY', -- UTILITY, MARKETING, AUTHENTICATION
    language VARCHAR(10) DEFAULT 'pt_BR', -- pt_BR, en_US, es_ES, etc.
    
    -- Conteúdo do template
    header_type VARCHAR(20), -- TEXT, IMAGE, VIDEO, DOCUMENT
    header_text TEXT,
    header_media_url TEXT,
    
    body_text TEXT NOT NULL, -- Texto principal (obrigatório)
    footer_text TEXT, -- Texto do rodapé (opcional)
    
    -- Botões (JSON array)
    buttons JSONB DEFAULT '[]', -- [{"type": "QUICK_REPLY", "text": "Sim"}, {"type": "URL", "text": "Site", "url": "https://..."}]
    
    -- Variáveis e metadados
    variables JSONB DEFAULT '[]', -- ["nome", "empresa", "data"] - variáveis no template
    components JSONB DEFAULT '[]', -- Estrutura completa dos componentes (Meta format)
    
    -- Estatísticas
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMP WITH TIME ZONE,
    
    -- Aprovação e qualidade
    quality_score VARCHAR(20), -- HIGH, MEDIUM, LOW
    rejection_reason TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    
    -- Metadata para desenvolvimento
    is_custom BOOLEAN DEFAULT FALSE, -- Template criado internamente
    tags TEXT[], -- Tags para organização
    description TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, name)
);

-- Tabela de histórico de envios de templates
CREATE TABLE IF NOT EXISTS template_sends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    template_id UUID NOT NULL REFERENCES whatsapp_templates(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- Dados do envio
    whatsapp_message_id VARCHAR(255),
    template_name VARCHAR(100) NOT NULL,
    language VARCHAR(10) NOT NULL,
    variables_used JSONB DEFAULT '{}', -- {"nome": "João", "empresa": "PyTake"}
    
    -- Status do envio
    status VARCHAR(50) DEFAULT 'SENT', -- SENT, DELIVERED, READ, FAILED
    delivery_status VARCHAR(50),
    error_message TEXT,
    
    -- Métricas
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    -- Custos (para análise)
    cost_usd DECIMAL(10, 6), -- Custo em USD do template
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_templates_tenant ON whatsapp_templates(tenant_id);
CREATE INDEX idx_templates_status ON whatsapp_templates(status);
CREATE INDEX idx_templates_name ON whatsapp_templates(tenant_id, name);
CREATE INDEX idx_templates_meta_id ON whatsapp_templates(meta_template_id);
CREATE INDEX idx_template_sends_template ON template_sends(template_id);
CREATE INDEX idx_template_sends_contact ON template_sends(contact_id);
CREATE INDEX idx_template_sends_date ON template_sends(sent_at DESC);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON whatsapp_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();