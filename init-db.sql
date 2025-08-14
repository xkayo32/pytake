-- PyTake Database Initialization Script
-- Development Environment

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tenants table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) UNIQUE,
    plan VARCHAR(50) DEFAULT 'starter',
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{"users": 10, "messages_per_month": 10000, "whatsapp_numbers": 3}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create whatsapp_configs table
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    phone_number_id VARCHAR(255),
    business_account_id VARCHAR(255),
    access_token TEXT,
    webhook_verify_token VARCHAR(255),
    api_type VARCHAR(50) NOT NULL DEFAULT 'official',
    evolution_instance VARCHAR(255),
    evolution_api_key TEXT,
    is_active BOOLEAN DEFAULT true,
    daily_limit INTEGER DEFAULT 1000,
    rate_limit_per_minute INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    whatsapp_config_id UUID REFERENCES whatsapp_configs(id) ON DELETE CASCADE,
    contact_phone VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    assigned_to UUID REFERENCES users(id),
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
    type VARCHAR(50) NOT NULL,
    content TEXT,
    media_url TEXT,
    status VARCHAR(50),
    whatsapp_message_id VARCHAR(255),
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create flows table
CREATE TABLE IF NOT EXISTS flows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_value TEXT,
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    schedule JSONB DEFAULT '{}',
    targeting JSONB DEFAULT '{}',
    message JSONB DEFAULT '{}',
    limits JSONB DEFAULT '{}',
    metrics JSONB DEFAULT '{}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    phone VARCHAR(50) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    tags TEXT[],
    attributes JSONB DEFAULT '{}',
    opted_in BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(tenant_id, phone)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_phone ON conversations(contact_phone);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flows_tenant_active ON flows(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);

-- Insert default tenant for development
INSERT INTO tenants (name, domain, plan) 
VALUES ('Development Tenant', 'localhost', 'enterprise')
ON CONFLICT (domain) DO NOTHING
RETURNING id;

-- Insert default admin user (password: admin123)
-- Password hash is for 'admin123' using bcrypt
INSERT INTO users (
    tenant_id,
    email,
    password_hash,
    name,
    role
) 
SELECT 
    t.id,
    'admin@pytake.com',
    '$2b$12$LQjU8K5I0pTnR2W0aP1qG.FdJbR1rTQkPzQlB3XKfPqDp.UYzqWlW',
    'Admin User',
    'admin'
FROM tenants t
WHERE t.domain = 'localhost'
ON CONFLICT (email) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO pytake_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO pytake_admin;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO pytake_admin;