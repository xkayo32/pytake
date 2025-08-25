-- Migration: Fix trigger_keyword nodes missing keywords field
-- Date: 2025-08-24
-- Description: Add default keywords field to trigger_keyword nodes that don't have it

-- Update all trigger_keyword nodes to have keywords field if missing
UPDATE flows 
SET nodes = (
    SELECT jsonb_agg(
        CASE 
            WHEN node->>'type' = 'trigger_keyword' 
                AND (node->'data'->>'nodeType' = 'trigger_keyword' OR node->'data'->>'nodeType' IS NULL)
                AND (node->'data'->'config'->>'keywords' IS NULL OR node->'data'->'config'->>'keywords' = '')
            THEN 
                jsonb_set(
                    node,
                    '{data,config,keywords}',
                    '"oi\nolá\najuda\nstart"'::jsonb,
                    true
                )
            ELSE 
                node
        END
    )
    FROM jsonb_array_elements(nodes) AS node
)
WHERE nodes IS NOT NULL 
  AND EXISTS (
    SELECT 1 
    FROM jsonb_array_elements(nodes) AS node 
    WHERE node->>'type' = 'trigger_keyword'
      AND (node->'data'->'config'->>'keywords' IS NULL OR node->'data'->'config'->>'keywords' = '')
  );

-- Log the update
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    IF updated_count > 0 THEN
        RAISE NOTICE 'Updated % flows with trigger_keyword nodes', updated_count;
    END IF;
END $$;
