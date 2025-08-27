-- Remove duplicated templates keeping the most recent one
-- First, identify and keep only the most recent template for each name/tenant combination
WITH ranked_templates AS (
  SELECT 
    id,
    name,
    tenant_id,
    whatsapp_config_id,
    created_at,
    ROW_NUMBER() OVER (PARTITION BY tenant_id, name, language ORDER BY 
      CASE WHEN whatsapp_config_id IS NOT NULL THEN 0 ELSE 1 END,
      created_at DESC
    ) as rn
  FROM whatsapp_templates
)
DELETE FROM whatsapp_templates
WHERE id IN (
  SELECT id FROM ranked_templates WHERE rn > 1
);

-- Create unique constraint to prevent future duplicates
-- This ensures each tenant can only have one template with the same name and language
ALTER TABLE whatsapp_templates 
ADD CONSTRAINT unique_template_name_per_tenant_language 
UNIQUE (tenant_id, name, language);

-- Also ensure we don't have duplicates by name alone for the same config
ALTER TABLE whatsapp_templates 
ADD CONSTRAINT unique_template_name_per_config 
UNIQUE (whatsapp_config_id, name, language);