-- Add fields for better template synchronization with Meta
ALTER TABLE whatsapp_templates 
ADD COLUMN IF NOT EXISTS meta_template_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS sync_status VARCHAR(50) DEFAULT 'synced',
ADD COLUMN IF NOT EXISTS meta_last_modified_at TIMESTAMP;

-- Create index for faster sync queries
CREATE INDEX IF NOT EXISTS idx_template_sync_status ON whatsapp_templates(sync_status, last_synced_at);
CREATE INDEX IF NOT EXISTS idx_template_meta_id ON whatsapp_templates(meta_template_id);

-- Add comment for clarity
COMMENT ON COLUMN whatsapp_templates.meta_template_hash IS 'Hash of template content from Meta to detect changes';
COMMENT ON COLUMN whatsapp_templates.sync_status IS 'synced, pending_sync, error, deleted_from_meta';
COMMENT ON COLUMN whatsapp_templates.last_synced_at IS 'Last time this template was validated against Meta API';