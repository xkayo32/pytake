-- Create whatsapp_configs table
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    provider VARCHAR(50) NOT NULL CHECK (provider IN ('official', 'evolution')),
    
    -- Official API fields
    phone_number_id VARCHAR(255),
    access_token TEXT,
    app_secret VARCHAR(255),
    business_account_id VARCHAR(255),
    
    -- Evolution API fields
    evolution_url VARCHAR(500),
    evolution_api_key VARCHAR(255),
    instance_name VARCHAR(255),
    
    -- Common fields
    webhook_verify_token VARCHAR(255) NOT NULL,
    webhook_url VARCHAR(500),
    
    -- Management fields
    is_active BOOLEAN DEFAULT TRUE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by VARCHAR(255) DEFAULT 'system',
    
    -- Health tracking
    last_health_check TIMESTAMPTZ,
    health_status VARCHAR(20) DEFAULT 'unknown' CHECK (health_status IN ('healthy', 'unhealthy', 'unknown', 'inactive')),
    error_message TEXT,
    
    -- Constraints
    UNIQUE(name),
    -- Only one default config allowed
    EXCLUDE (is_default WITH =) WHERE (is_default = true)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_active ON whatsapp_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_default ON whatsapp_configs(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_provider ON whatsapp_configs(provider);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_phone_id ON whatsapp_configs(phone_number_id) WHERE phone_number_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_instance ON whatsapp_configs(instance_name) WHERE instance_name IS NOT NULL;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_configs_updated_at 
    BEFORE UPDATE ON whatsapp_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- NOTE: Default configuration removed for security
-- Administrators must create WhatsApp configurations through the API after deployment
-- This prevents hardcoded credentials from being stored in migrations
-- Use POST /api/v1/whatsapp-configs to create configurations with proper credentials

-- Grant permissions
GRANT ALL PRIVILEGES ON whatsapp_configs TO pytake;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pytake;