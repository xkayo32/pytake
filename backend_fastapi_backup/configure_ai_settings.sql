-- Script para configurar AI Assistant no PyTake
-- Este script configura o Gemini como provedor padrão de IA

-- 1. Verificar organizações disponíveis
SELECT id, name, settings->'ai_assistant' as ai_settings
FROM organizations
ORDER BY created_at DESC
LIMIT 5;

-- 2. Configurar AI Assistant para a primeira organização
-- IMPORTANTE: Substitua 'YOUR_GEMINI_API_KEY_HERE' pela sua API key real do Google
-- Você pode obter uma API key em: https://ai.google.dev/

UPDATE organizations
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{ai_assistant}',
    '{
        "enabled": true,
        "default_provider": "gemini",
        "gemini_api_key": "YOUR_GEMINI_API_KEY_HERE",
        "model": "gemini-2.5-flash",
        "max_tokens": 4096,
        "temperature": 0.7,
        "template_analysis_enabled": true
    }'::jsonb
)
WHERE id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1);

-- 3. Verificar se foi configurado corretamente
SELECT
    id,
    name,
    settings->'ai_assistant'->>'enabled' as ai_enabled,
    settings->'ai_assistant'->>'default_provider' as provider,
    settings->'ai_assistant'->>'model' as model,
    CASE
        WHEN settings->'ai_assistant'->>'gemini_api_key' IS NOT NULL
        THEN 'Configurada (***' || RIGHT(settings->'ai_assistant'->>'gemini_api_key', 4) || ')'
        ELSE 'Não configurada'
    END as api_key_status
FROM organizations
ORDER BY created_at
LIMIT 5;
