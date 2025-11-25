-- Create whatsapp_phone_numbers table if not exists
CREATE TABLE IF NOT EXISTS whatsapp_phone_numbers (
    id VARCHAR(255) PRIMARY KEY,
    display_phone_number VARCHAR(50) NOT NULL,
    verified_name VARCHAR(255),
    quality_rating VARCHAR(50),
    platform_type VARCHAR(50),
    business_account_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add status column to flows table if not exists
ALTER TABLE flows 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- Add whatsapp_numbers column to flows table if not exists
ALTER TABLE flows 
ADD COLUMN IF NOT EXISTS whatsapp_numbers JSONB DEFAULT '[]';

-- Update existing flows to have status
UPDATE flows 
SET status = CASE 
    WHEN is_active = true THEN 'active'
    ELSE 'draft'
END
WHERE status IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_phone_numbers_id ON whatsapp_phone_numbers(id);
CREATE INDEX IF NOT EXISTS idx_flows_status ON flows(status);