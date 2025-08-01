-- Create message_media table for storing media files
CREATE TABLE IF NOT EXISTS message_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Message reference
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    
    -- WhatsApp media info
    whatsapp_media_id VARCHAR(255),
    
    -- File info
    file_name VARCHAR(255),
    file_path TEXT,
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Media type
    media_type VARCHAR(50) NOT NULL CHECK (media_type IN ('image', 'video', 'audio', 'document', 'sticker')),
    
    -- Thumbnail (for images/videos)
    thumbnail_path TEXT,
    thumbnail_size INTEGER,
    
    -- Download status
    download_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    downloaded_at TIMESTAMPTZ,
    download_error TEXT,
    
    -- Storage info
    storage_provider VARCHAR(50) DEFAULT 'local',
    storage_path TEXT,
    public_url TEXT,
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    duration INTEGER, -- For audio/video in seconds
    metadata JSONB DEFAULT '{}',
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_message_media_message_id ON message_media(message_id);
CREATE INDEX idx_message_media_whatsapp_id ON message_media(whatsapp_media_id);
CREATE INDEX idx_message_media_download_status ON message_media(download_status);

-- Add updated_at trigger
CREATE TRIGGER update_message_media_updated_at BEFORE UPDATE ON message_media
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();