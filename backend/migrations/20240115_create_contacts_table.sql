-- Create contacts table
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Phone number (unique identifier)
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    
    -- WhatsApp info
    whatsapp_id VARCHAR(50),
    has_whatsapp BOOLEAN NOT NULL DEFAULT false,
    whatsapp_verified_at TIMESTAMPTZ,
    
    -- Profile info
    name VARCHAR(255),
    profile_picture_url TEXT,
    status_message TEXT,
    
    -- Business info (if business account)
    is_business BOOLEAN NOT NULL DEFAULT false,
    business_name VARCHAR(255),
    business_description TEXT,
    business_category VARCHAR(100),
    business_verified BOOLEAN DEFAULT false,
    
    -- Contact metadata
    tags TEXT[],
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Sync info
    last_synced_at TIMESTAMPTZ,
    sync_status VARCHAR(50) DEFAULT 'pending',
    sync_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_contacts_phone ON contacts(phone_number);
CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id) WHERE whatsapp_id IS NOT NULL;
CREATE INDEX idx_contacts_has_whatsapp ON contacts(has_whatsapp) WHERE has_whatsapp = true;
CREATE INDEX idx_contacts_sync_status ON contacts(sync_status);
CREATE INDEX idx_contacts_last_synced ON contacts(last_synced_at DESC);

-- Add updated_at trigger
CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();