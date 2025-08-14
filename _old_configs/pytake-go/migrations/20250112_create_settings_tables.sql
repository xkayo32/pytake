-- Create settings tables for dynamic configuration management

-- System settings table
CREATE TABLE IF NOT EXISTS system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    value_type VARCHAR(50) NOT NULL DEFAULT 'string',
    category VARCHAR(100) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    is_sensitive BOOLEAN DEFAULT false,
    validation_rules JSONB,
    allowed_values JSONB,
    min_value NUMERIC,
    max_value NUMERIC,
    default_value JSONB,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tenant settings table
CREATE TABLE IF NOT EXISTS tenant_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    value_type VARCHAR(50) NOT NULL DEFAULT 'string',
    category VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, key)
);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    key VARCHAR(255) NOT NULL,
    value JSONB NOT NULL,
    value_type VARCHAR(50) NOT NULL DEFAULT 'string',
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, key)
);

-- Configuration templates table
CREATE TABLE IF NOT EXISTS configuration_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    settings JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT false,
    rollout INTEGER DEFAULT 0 CHECK (rollout >= 0 AND rollout <= 100),
    conditions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Setting audit logs table
CREATE TABLE IF NOT EXISTS setting_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(255) NOT NULL,
    setting_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    action VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB
);

-- Create indexes for better performance
CREATE INDEX idx_system_settings_key ON system_settings(key);
CREATE INDEX idx_system_settings_category ON system_settings(category);
CREATE INDEX idx_system_settings_is_public ON system_settings(is_public);

CREATE INDEX idx_tenant_settings_tenant_id ON tenant_settings(tenant_id);
CREATE INDEX idx_tenant_settings_key ON tenant_settings(key);
CREATE INDEX idx_tenant_settings_tenant_key ON tenant_settings(tenant_id, key);

CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);
CREATE INDEX idx_user_settings_key ON user_settings(key);
CREATE INDEX idx_user_settings_user_key ON user_settings(user_id, key);

CREATE INDEX idx_feature_flags_key ON feature_flags(key);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(is_enabled);

CREATE INDEX idx_setting_audit_logs_key ON setting_audit_logs(setting_key);
CREATE INDEX idx_setting_audit_logs_type ON setting_audit_logs(setting_type);
CREATE INDEX idx_setting_audit_logs_entity ON setting_audit_logs(entity_id);
CREATE INDEX idx_setting_audit_logs_changed_by ON setting_audit_logs(changed_by);
CREATE INDEX idx_setting_audit_logs_changed_at ON setting_audit_logs(changed_at);

-- Insert default system settings
INSERT INTO system_settings (key, value, value_type, category, description, is_public, default_value) VALUES
-- Application settings
('app.name', '"PyTake"', 'string', 'application', 'Application name', true, '"PyTake"'),
('app.url', '"http://localhost:3000"', 'string', 'application', 'Application URL', true, '"http://localhost:3000"'),
('app.timezone', '"UTC"', 'string', 'application', 'Default timezone', true, '"UTC"'),
('app.locale', '"pt-BR"', 'string', 'application', 'Default locale', true, '"pt-BR"'),
('app.max_upload_size', '10485760', 'integer', 'application', 'Maximum file upload size in bytes', true, '10485760'),

-- WhatsApp settings
('whatsapp.max_message_length', '4096', 'integer', 'whatsapp', 'Maximum message length', true, '4096'),
('whatsapp.media_max_size', '16777216', 'integer', 'whatsapp', 'Maximum media file size in bytes', true, '16777216'),
('whatsapp.session_timeout', '86400', 'integer', 'whatsapp', 'Session timeout in seconds', true, '86400'),
('whatsapp.retry_attempts', '3', 'integer', 'whatsapp', 'Number of retry attempts for failed messages', true, '3'),
('whatsapp.webhook_timeout', '30', 'integer', 'whatsapp', 'Webhook processing timeout in seconds', true, '30'),

-- AI settings
('ai.enabled', 'true', 'boolean', 'ai', 'Enable AI features', true, 'true'),
('ai.default_model', '"gpt-3.5-turbo"', 'string', 'ai', 'Default AI model', true, '"gpt-3.5-turbo"'),
('ai.max_tokens', '4096', 'integer', 'ai', 'Maximum tokens per request', true, '4096'),
('ai.temperature', '0.7', 'number', 'ai', 'AI temperature setting', true, '0.7'),
('ai.context_window', '10', 'integer', 'ai', 'Number of messages to keep in context', true, '10'),

-- Campaign settings
('campaign.batch_size', '100', 'integer', 'campaign', 'Number of messages to send per batch', true, '100'),
('campaign.delay_between_messages', '1000', 'integer', 'campaign', 'Delay between messages in milliseconds', true, '1000'),
('campaign.max_retries', '3', 'integer', 'campaign', 'Maximum retry attempts for failed messages', true, '3'),
('campaign.default_timezone', '"America/Sao_Paulo"', 'string', 'campaign', 'Default timezone for campaigns', true, '"America/Sao_Paulo"'),

-- Email settings
('email.enabled', 'true', 'boolean', 'email', 'Enable email notifications', true, 'true'),
('email.from_name', '"PyTake"', 'string', 'email', 'Default sender name', true, '"PyTake"'),
('email.from_address', '"noreply@pytake.com"', 'string', 'email', 'Default sender email', true, '"noreply@pytake.com"'),
('email.footer_text', '"© PyTake - All rights reserved"', 'string', 'email', 'Email footer text', true, '"© PyTake - All rights reserved"'),

-- Security settings
('security.password_min_length', '8', 'integer', 'security', 'Minimum password length', true, '8'),
('security.password_require_uppercase', 'true', 'boolean', 'security', 'Require uppercase in password', true, 'true'),
('security.password_require_numbers', 'true', 'boolean', 'security', 'Require numbers in password', true, 'true'),
('security.password_require_special', 'true', 'boolean', 'security', 'Require special characters in password', true, 'true'),
('security.session_lifetime', '86400', 'integer', 'security', 'Session lifetime in seconds', true, '86400'),
('security.max_login_attempts', '5', 'integer', 'security', 'Maximum login attempts before lockout', true, '5'),
('security.lockout_duration', '1800', 'integer', 'security', 'Account lockout duration in seconds', true, '1800'),

-- Rate limiting settings
('rate_limit.enabled', 'true', 'boolean', 'rate_limit', 'Enable rate limiting', true, 'true'),
('rate_limit.requests_per_second', '10', 'integer', 'rate_limit', 'Requests per second per IP', true, '10'),
('rate_limit.burst_size', '20', 'integer', 'rate_limit', 'Burst size for rate limiting', true, '20'),

-- Monitoring settings
('monitoring.metrics_enabled', 'true', 'boolean', 'monitoring', 'Enable metrics collection', true, 'true'),
('monitoring.log_level', '"info"', 'string', 'monitoring', 'Default log level', true, '"info"'),
('monitoring.retention_days', '30', 'integer', 'monitoring', 'Log retention in days', true, '30'),

-- Billing settings
('billing.currency', '"BRL"', 'string', 'billing', 'Default currency', true, '"BRL"'),
('billing.tax_rate', '0.05', 'number', 'billing', 'Default tax rate', true, '0.05'),
('billing.trial_days', '14', 'integer', 'billing', 'Trial period in days', true, '14')
ON CONFLICT (key) DO NOTHING;

-- Insert default feature flags
INSERT INTO feature_flags (key, name, description, is_enabled, rollout) VALUES
('ai_chat', 'AI Chat', 'Enable AI-powered chat responses', true, 100),
('campaign_analytics', 'Campaign Analytics', 'Advanced campaign analytics', true, 100),
('multi_channel', 'Multi-Channel Support', 'Support for multiple messaging channels', false, 0),
('advanced_flows', 'Advanced Flows', 'Advanced flow builder features', true, 100),
('voice_messages', 'Voice Messages', 'Support for voice message processing', false, 0),
('video_calls', 'Video Calls', 'Enable video call support', false, 0),
('custom_integrations', 'Custom Integrations', 'Allow custom third-party integrations', true, 50),
('bulk_import', 'Bulk Import', 'Enable bulk contact import', true, 100),
('export_data', 'Export Data', 'Allow data export functionality', true, 100),
('api_v2', 'API Version 2', 'New API version with enhanced features', false, 10)
ON CONFLICT (key) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenant_settings_updated_at BEFORE UPDATE ON tenant_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuration_templates_updated_at BEFORE UPDATE ON configuration_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_flags_updated_at BEFORE UPDATE ON feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();