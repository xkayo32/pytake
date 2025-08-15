-- Create whatsapp_configs table
CREATE TABLE IF NOT EXISTS whatsapp_configs (
    id SERIAL PRIMARY KEY,
    tenant_id UUID DEFAULT gen_random_uuid(),
    phone_number_id VARCHAR(255),
    access_token TEXT,
    business_account_id VARCHAR(255),
    app_id VARCHAR(255),
    app_secret VARCHAR(255),
    webhook_verify_token VARCHAR(255),
    webhook_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'disconnected',
    last_test TIMESTAMP,
    phone_display_number VARCHAR(50),
    verified_name VARCHAR(255),
    quality_rating VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_tenant_id ON whatsapp_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_status ON whatsapp_configs(status);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_whatsapp_configs_updated_at 
    BEFORE UPDATE ON whatsapp_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default config if not exists
INSERT INTO whatsapp_configs (
    tenant_id,
    webhook_url,
    status
) 
SELECT 
    '223e4567-e89b-12d3-a456-426614174003'::UUID,
    'https://api.pytake.net/api/v1/whatsapp/webhook',
    'disconnected'
WHERE NOT EXISTS (
    SELECT 1 FROM whatsapp_configs LIMIT 1
);