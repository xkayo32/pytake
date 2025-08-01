-- Create quick_replies table for canned responses
CREATE TABLE IF NOT EXISTS quick_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Quick reply info
    title VARCHAR(100) NOT NULL,
    content TEXT NOT NULL,
    category VARCHAR(100),
    
    -- Shortcut
    shortcut VARCHAR(50) UNIQUE,
    
    -- Permissions
    is_global BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id),
    
    -- Usage stats
    usage_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_quick_replies_shortcut ON quick_replies(shortcut) WHERE shortcut IS NOT NULL;
CREATE INDEX idx_quick_replies_category ON quick_replies(category);
CREATE INDEX idx_quick_replies_created_by ON quick_replies(created_by);
CREATE INDEX idx_quick_replies_global ON quick_replies(is_global) WHERE is_global = true;

-- Add updated_at trigger
CREATE TRIGGER update_quick_replies_updated_at BEFORE UPDATE ON quick_replies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();