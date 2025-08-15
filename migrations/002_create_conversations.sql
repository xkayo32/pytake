-- Tabela de contatos/conversas
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    is_blocked BOOLEAN DEFAULT FALSE,
    is_favorite BOOLEAN DEFAULT FALSE,
    tags TEXT[],
    custom_fields JSONB DEFAULT '{}',
    last_message_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, phone)
);

-- Tabela de conversas
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'active', -- active, archived, closed
    unread_count INTEGER DEFAULT 0,
    last_message TEXT,
    last_message_time TIMESTAMP WITH TIME ZONE,
    assigned_to UUID, -- ID do usuário responsável
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, contact_id)
);

-- Tabela de mensagens
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    whatsapp_message_id VARCHAR(255) UNIQUE, -- ID da mensagem no WhatsApp
    content TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'text', -- text, image, audio, video, document, location
    media_url TEXT,
    media_mime_type VARCHAR(100),
    is_from_me BOOLEAN DEFAULT FALSE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, sent, delivered, read, failed
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX idx_contacts_tenant_phone ON contacts(tenant_id, phone);
CREATE INDEX idx_conversations_tenant_contact ON conversations(tenant_id, contact_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id, timestamp DESC);
CREATE INDEX idx_messages_whatsapp_id ON messages(whatsapp_message_id);

-- Triggers para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();