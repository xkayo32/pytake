# Guia de Configuração do AI Assistant - PyTake

## 🎯 O que foi feito

✅ **Código modificado** para SEMPRE executar análise de IA nos templates (mesmo com `submit=false`)
✅ **3 provedores de IA** disponíveis:
   - **Google Gemini** (5 modelos, incluindo 2.5 Flash e 3.0 Preview)
   - OpenAI (8 modelos, incluindo GPT-4o e GPT-5)
   - Anthropic (8 modelos, incluindo Claude Sonnet 4.5)

✅ **Análise automática** que agora retorna:
   - `ai_analysis_score`: Score de 0-100
   - `ai_suggested_category`: Categoria sugerida (MARKETING, UTILITY, AUTHENTICATION)
   - `ai_analyzed_at`: Timestamp da análise
   - `ai_analysis_result`: Resultado completo com sugestões

## 📋 Pré-requisitos

Você precisa de uma API key de um dos provedores:

1. **Google Gemini** (Recomendado - mais barato)
   - Acesse: https://ai.google.dev/
   - Crie um projeto e ative a API
   - Gere uma API key
   - Custo: $0.30/$2.50 por milhão de tokens (Flash 2.5)

2. **OpenAI** (Alternativa)
   - Acesse: https://platform.openai.com/api-keys
   - Crie uma API key
   - Custo: $2.50/$10 por milhão de tokens (GPT-4o)

3. **Anthropic** (Alternativa)
   - Acesse: https://console.anthropic.com/
   - Crie uma API key
   - Custo: $3/$15 por milhão de tokens (Claude Sonnet 4.5)

## 🔧 Opção 1: Configurar via SQL (Rápido)

### Passo 1: Conectar ao banco de dados
```bash
docker exec -it pytake-postgres-dev psql -U pytake_user -d pytake
```

### Passo 2: Configurar Gemini (Recomendado)
```sql
-- Substitua 'YOUR_API_KEY_HERE' pela sua API key real

UPDATE organizations
SET settings = jsonb_set(
    COALESCE(settings, '{}'::jsonb),
    '{ai_assistant}',
    '{
        "enabled": true,
        "default_provider": "gemini",
        "gemini_api_key": "YOUR_API_KEY_HERE",
        "model": "gemini-2.5-flash",
        "max_tokens": 4096,
        "temperature": 0.7,
        "template_analysis_enabled": true
    }'::jsonb
)
WHERE id = (SELECT id FROM organizations ORDER BY created_at LIMIT 1);
```

### Passo 3: Verificar configuração
```sql
SELECT
    id,
    name,
    settings->'ai_assistant'->>'enabled' as ai_enabled,
    settings->'ai_assistant'->>'default_provider' as provider,
    settings->'ai_assistant'->>'model' as model
FROM organizations;
```

Deve retornar:
```
 id | name | ai_enabled | provider | model
----+------+------------+----------+------------------
 .. | ...  | true       | gemini   | gemini-2.5-flash
```

## 🔧 Opção 2: Configurar via API GraphQL

### Passo 1: Obter token de autenticação
Faça login via REST API ou use um token existente.

### Passo 2: Executar mutation GraphQL
```graphql
mutation {
  updateAISettings(input: {
    enabled: true
    default_provider: GEMINI
    gemini_api_key: "YOUR_API_KEY_HERE"
    model: "gemini-2.5-flash"
    max_tokens: 4096
    temperature: 0.7
  }) {
    enabled
    default_provider
    model
    max_tokens
    temperature
  }
}
```

## 🧪 Testar a Configuração

### Teste 1: Criar um template via API
```bash
# Com submit=false para testar apenas a análise
curl -X POST "http://localhost:8002/api/v1/whatsapp/WABA_ID/templates?submit=false" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "teste_ai_analysis",
    "category": "UTILITY",
    "language": "pt_BR",
    "header_text": "Confirmação de Pedido",
    "body_text": "Olá {{nome}}, seu pedido #{{numero}} foi confirmado com sucesso!",
    "footer_text": "Loja XYZ"
  }'
```

### Teste 2: Verificar análise nos logs
```bash
docker logs pytake-backend-dev --tail 50 | grep "AI analysis"
```

Deve mostrar algo como:
```
Running AI analysis for template 'teste_ai_analysis'
AI analysis completed for template 'teste_ai_analysis': score=85, can_submit=True, critical_issues=False
```

### Teste 3: Verificar resposta da API
A resposta deve incluir:
```json
{
  "id": "...",
  "name": "teste_ai_analysis",
  "ai_analysis_score": 85,
  "ai_suggested_category": "UTILITY",
  "ai_analyzed_at": "2025-12-29T02:00:00",
  "ai_analysis_result": {
    "overall_score": 85,
    "can_submit": true,
    "has_critical_issues": false,
    "validations": [...],
    "improvements": {
      "header_suggestion": "...",
      "body_suggestion": "...",
      ...
    },
    "suggested_category": "UTILITY",
    "category_confidence": 95,
    "provider_used": "gemini",
    "model_used": "gemini-2.5-flash"
  }
}
```

## 🔍 Solução de Problemas

### Problema: ai_analysis_score ainda é null

**Causa 1**: API key não configurada
```sql
-- Verificar
SELECT settings->'ai_assistant'->>'gemini_api_key' FROM organizations;

-- Se retornar null, configure novamente
```

**Causa 2**: IA desabilitada
```sql
-- Verificar
SELECT settings->'ai_assistant'->>'enabled' FROM organizations;

-- Se retornar 'false' ou null, habilite:
UPDATE organizations
SET settings = jsonb_set(
    settings,
    '{ai_assistant,enabled}',
    'true'::jsonb
)
WHERE id = (SELECT id FROM organizations LIMIT 1);
```

**Causa 3**: Erro na API key
```bash
# Verificar logs de erro
docker logs pytake-backend-dev 2>&1 | grep -i "gemini\|api key\|error"
```

### Problema: Erro "API key not configured"

Verifique se a chave está correta:
```sql
SELECT
    CASE
        WHEN settings->'ai_assistant'->>'gemini_api_key' IS NOT NULL
        THEN 'Configurada (***' || RIGHT(settings->'ai_assistant'->>'gemini_api_key', 4) || ')'
        ELSE 'NÃO CONFIGURADA'
    END as api_key_status
FROM organizations;
```

### Problema: Análise muito lenta

Troque para um modelo mais rápido:
```sql
UPDATE organizations
SET settings = jsonb_set(
    settings,
    '{ai_assistant,model}',
    '"gemini-2.5-flash-lite"'::jsonb
)
WHERE id = (SELECT id FROM organizations LIMIT 1);
```

## 📊 Comparação de Modelos

| Modelo | Custo (Input/Output) | Velocidade | Qualidade | Recomendado Para |
|--------|---------------------|-----------|-----------|------------------|
| **gemini-2.5-flash** | $0.30/$2.50 | ⚡⚡⚡ Rápido | ⭐⭐⭐⭐ Muito bom | **Uso geral** ✅ |
| gemini-2.5-flash-lite | $0.10/$0.40 | ⚡⚡⚡⚡ Muito rápido | ⭐⭐⭐ Bom | Alta volumetria |
| gemini-2.5-pro | $1.25/$10 | ⚡⚡ Médio | ⭐⭐⭐⭐⭐ Excelente | Análises complexas |
| gpt-4o-mini | $0.15/$0.60 | ⚡⚡⚡ Rápido | ⭐⭐⭐⭐ Muito bom | Alternativa OpenAI |
| claude-3-5-haiku | $0.80/$4 | ⚡⚡⚡ Rápido | ⭐⭐⭐⭐ Muito bom | Alternativa Anthropic |

## 🎉 Próximos Passos

1. ✅ Configure a API key
2. ✅ Teste criando um template
3. ✅ Verifique o `ai_analysis_score` na resposta
4. 📊 Analise as sugestões em `ai_analysis_result.improvements`
5. 🚀 Use o score para validar templates antes de submeter à Meta

## 💡 Dicas

- **Score > 80**: Template de alta qualidade, pode submeter à Meta
- **Score 60-80**: Template ok, mas pode melhorar com as sugestões
- **Score < 60**: Template com problemas, revise antes de submeter
- **has_critical_issues: true**: NÃO submeta à Meta, corrija os problemas primeiro

## 🔐 Segurança

As API keys são armazenadas no banco de dados PostgreSQL no campo `settings` (JSONB) da tabela `organizations`. Recomendações:

1. Use variáveis de ambiente para API keys sensíveis (futuro)
2. Não commite API keys no código
3. Rotacione API keys periodicamente
4. Monitore uso e custos nos dashboards dos provedores

## 📚 Documentação Adicional

- [Google Gemini Pricing](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini Models](https://ai.google.dev/gemini-api/docs/models)
- [OpenAI Pricing](https://openai.com/api/pricing/)
- [Anthropic Pricing](https://www.anthropic.com/pricing)
