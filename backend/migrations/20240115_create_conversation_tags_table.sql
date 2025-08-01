-- Create conversation_tags table
CREATE TABLE IF NOT EXISTS conversation_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Tag info
    name VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
    description TEXT,
    
    -- Usage stats
    usage_count INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS conversation_tag_assignments (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES conversation_tags(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    
    PRIMARY KEY (conversation_id, tag_id)
);

-- Indexes
CREATE INDEX idx_conversation_tags_name ON conversation_tags(name);
CREATE INDEX idx_tag_assignments_conversation ON conversation_tag_assignments(conversation_id);
CREATE INDEX idx_tag_assignments_tag ON conversation_tag_assignments(tag_id);

-- Add updated_at trigger
CREATE TRIGGER update_conversation_tags_updated_at BEFORE UPDATE ON conversation_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();