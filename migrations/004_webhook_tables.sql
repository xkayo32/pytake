-- Create webhook_logs table for debugging
CREATE TABLE IF NOT EXISTS webhook_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create whatsapp_messages table for storing incoming messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
    id VARCHAR(255) PRIMARY KEY,
    from_number VARCHAR(50) NOT NULL,
    to_number VARCHAR(50),
    type VARCHAR(50) NOT NULL,
    content TEXT,
    media_url TEXT,
    status VARCHAR(50) DEFAULT 'received',
    status_timestamp VARCHAR(50),
    timestamp VARCHAR(50),
    raw_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_webhook_logs_timestamp ON webhook_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON whatsapp_messages(status);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created ON whatsapp_messages(created_at DESC);

-- Add webhook status column to whatsapp_configs if not exists
ALTER TABLE whatsapp_configs 
ADD COLUMN IF NOT EXISTS webhook_status VARCHAR(50) DEFAULT 'not_configured',
ADD COLUMN IF NOT EXISTS webhook_url TEXT,
ADD COLUMN IF NOT EXISTS webhook_last_verified TIMESTAMP;