# 🤖 Guia de Modelos de IA para Análise de Templates

**Autor:** Kayo Carvalho Fernandes
**Data:** 28 de Dezembro de 2025
**Versão:** 1.0

---

## 📋 Visão Geral

Este documento descreve os modelos de IA disponíveis para análise de templates WhatsApp no PyTake, incluindo características, custos e recomendações de uso.

---

## 🎯 Modelos Padrão (Recomendados)

Estes são os modelos configurados por padrão quando você não especifica um modelo customizado:

### 1. **Anthropic: Claude 3.5 Haiku** (Default)
- **Model ID:** `claude-3-5-haiku-20241022`
- **Velocidade:** ⚡⚡⚡ Muito Rápido
- **Custo:** 💰 Baixo
- **Qualidade:** ⭐⭐⭐⭐ Excelente
- **Input:** $0.80 / 1M tokens
- **Output:** $4.00 / 1M tokens

**Quando usar:**
- ✅ Análise de templates em produção (alto volume)
- ✅ Validações rápidas e precisas
- ✅ Melhor custo-benefício para uso diário

**Características:**
- Excelente para tarefas focadas como análise de templates
- Respostas rápidas e consistentes
- Bom entendimento de contexto e nuances
- Ideal para análises estruturadas em JSON

---

### 2. **Google Gemini: 2.0 Flash Experimental** (Default)
- **Model ID:** `gemini-2.0-flash-exp`
- **Velocidade:** ⚡⚡⚡ Muito Rápido
- **Custo:** 💰 Muito Baixo (Free durante preview)
- **Qualidade:** ⭐⭐⭐⭐ Excelente
- **Input:** FREE (durante experimental)
- **Output:** FREE (durante experimental)

**Quando usar:**
- ✅ Experimentação e testes
- ✅ Alto volume com orçamento limitado
- ✅ Análises rápidas em tempo real

**Características:**
- Modelo experimental mais recente do Google
- Performance competitiva com custos reduzidos
- Boa capacidade de seguir instruções complexas
- Ideal para ambientes de desenvolvimento/staging

---

### 3. **OpenAI: GPT-4o Mini** (Default)
- **Model ID:** `gpt-4o-mini`
- **Velocidade:** ⚡⚡ Rápido
- **Custo:** 💰 Baixo
- **Qualidade:** ⭐⭐⭐⭐ Excelente
- **Input:** $0.150 / 1M tokens
- **Output:** $0.600 / 1M tokens

**Quando usar:**
- ✅ Análise balanceada custo/qualidade
- ✅ Quando já tem infraestrutura OpenAI
- ✅ Análises que precisam de raciocínio moderado

**Características:**
- Versão otimizada do GPT-4o para eficiência
- Bom equilíbrio entre custo e performance
- Excelente para análises estruturadas
- Menor latência que GPT-4o completo

---

## 🔧 Modelos Alternativos Disponíveis

### Anthropic Claude 3.5 Sonnet
- **Model ID:** `claude-3-5-sonnet-20241022`
- **Custo:** 💰💰 Médio
- **Input:** $3.00 / 1M tokens
- **Output:** $15.00 / 1M tokens

**Quando usar:**
- Análises que requerem máxima precisão
- Templates complexos com muitas variáveis
- Quando qualidade é mais importante que custo

---

### Google Gemini 1.5 Pro
- **Model ID:** `gemini-1.5-pro`
- **Custo:** 💰💰 Médio
- **Input:** $1.25 / 1M tokens (até 128k tokens)
- **Output:** $5.00 / 1M tokens

**Quando usar:**
- Análises que precisam de contexto maior
- Templates muito longos ou complexos
- Quando precisa de raciocínio mais profundo

---

### Google Gemini 1.5 Flash
- **Model ID:** `gemini-1.5-flash`
- **Custo:** 💰 Muito Baixo
- **Input:** $0.075 / 1M tokens
- **Output:** $0.30 / 1M tokens

**Quando usar:**
- Volumes extremamente altos
- Prototipagem e testes
- Quando velocidade é prioridade máxima

---

### OpenAI GPT-4o
- **Model ID:** `gpt-4o`
- **Custo:** 💰💰💰 Alto
- **Input:** $2.50 / 1M tokens
- **Output:** $10.00 / 1M tokens

**Quando usar:**
- Análises críticas que requerem máxima qualidade
- Templates em idiomas complexos
- Quando custo não é limitante

---

## 💰 Comparativo de Custos (por 1000 análises)

Assumindo ~1200 tokens por análise (800 input + 400 output):

| Modelo | Custo/1k análises | Custo/10k análises | Custo/100k análises |
|--------|-------------------|--------------------|--------------------|
| **Gemini 2.0 Flash Exp** | **$0.00** | **$0.00** | **$0.00** |
| **Gemini 1.5 Flash** | **$0.18** | **$1.80** | **$18.00** |
| **GPT-4o Mini** | **$0.36** | **$3.60** | **$36.00** |
| **Claude 3.5 Haiku** | **$2.24** | **$22.40** | **$224.00** |
| **Gemini 1.5 Pro** | **$3.00** | **$30.00** | **$300.00** |
| **Claude 3.5 Sonnet** | **$8.40** | **$84.00** | **$840.00** |
| **GPT-4o** | **$6.00** | **$60.00** | **$600.00** |

---

## 📊 Matriz de Decisão

| Cenário | Modelo Recomendado | Motivo |
|---------|-------------------|---------|
| **Produção (custo controlado)** | Claude 3.5 Haiku | Melhor qualidade/custo |
| **Produção (orçamento ilimitado)** | Claude 3.5 Sonnet | Máxima qualidade |
| **Desenvolvimento/Testes** | Gemini 2.0 Flash Exp | Gratuito |
| **Alto Volume (>10k/dia)** | Gemini 1.5 Flash | Custo muito baixo |
| **Infraestrutura OpenAI** | GPT-4o Mini | Integração existente |
| **Templates Complexos** | Claude 3.5 Sonnet | Melhor raciocínio |
| **Baixa Latência** | Gemini 2.0 Flash Exp | Mais rápido |

---

## ⚙️ Como Configurar

### Via Settings da Organização

```json
{
  "ai_assistant": {
    "enabled": true,
    "default_provider": "anthropic",  // ou "gemini", "openai"

    // API Keys (configure apenas o necessário)
    "anthropic_api_key": "sk-ant-...",
    "gemini_api_key": "AIzaSy...",
    "openai_api_key": "sk-...",

    // Modelo (opcional, usa defaults se não especificado)
    "model": "claude-3-5-haiku-20241022",

    // Configurações
    "max_tokens": 8192,
    "temperature": 0.7,
    "template_analysis_enabled": true
  }
}
```

### Modelos por Provider (Defaults)

Se você **não especificar** o campo `"model"`, serão usados estes defaults:

```json
{
  "default_provider": "anthropic"  → usa "claude-3-5-haiku-20241022"
  "default_provider": "gemini"     → usa "gemini-2.0-flash-exp"
  "default_provider": "openai"     → usa "gpt-4o-mini"
}
```

---

## 🧪 Como Testar Diferentes Modelos

### 1. Testar com Claude Haiku (Default)

```sql
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{ai_assistant}',
  '{
    "enabled": true,
    "default_provider": "anthropic",
    "anthropic_api_key": "sk-ant-...",
    "template_analysis_enabled": true
  }'::jsonb
)
WHERE id = 'your-org-id';
```

### 2. Testar com Gemini Flash (Mais Barato)

```sql
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{ai_assistant}',
  '{
    "enabled": true,
    "default_provider": "gemini",
    "gemini_api_key": "AIzaSy...",
    "model": "gemini-1.5-flash",
    "template_analysis_enabled": true
  }'::jsonb
)
WHERE id = 'your-org-id';
```

### 3. Testar com Claude Sonnet (Máxima Qualidade)

```sql
UPDATE organizations
SET settings = jsonb_set(
  settings,
  '{ai_assistant}',
  '{
    "enabled": true,
    "default_provider": "anthropic",
    "anthropic_api_key": "sk-ant-...",
    "model": "claude-3-5-sonnet-20241022",
    "template_analysis_enabled": true
  }'::jsonb
)
WHERE id = 'your-org-id';
```

---

## 📈 Métricas de Performance (Estimadas)

| Modelo | Latência Média | Tokens/Segundo | Qualidade Score |
|--------|---------------|----------------|-----------------|
| Gemini 2.0 Flash Exp | ~800ms | ~60 | 92/100 |
| Gemini 1.5 Flash | ~600ms | ~80 | 90/100 |
| Claude 3.5 Haiku | ~1200ms | ~50 | 95/100 |
| GPT-4o Mini | ~1000ms | ~55 | 93/100 |
| Claude 3.5 Sonnet | ~2000ms | ~40 | 98/100 |
| Gemini 1.5 Pro | ~1800ms | ~45 | 96/100 |
| GPT-4o | ~2500ms | ~35 | 97/100 |

---

## 🔍 Fallback Automático

Se a análise de IA falhar (API indisponível, erro, etc.), o sistema automaticamente usa **análise básica por regras**:

- Provider: `basic_rules`
- Custo: $0.00
- Qualidade: ~70/100
- Latência: <10ms

Isso garante que templates sempre sejam analisados, mesmo com problemas de IA.

---

## 📚 Referências

- [Anthropic Pricing](https://www.anthropic.com/pricing)
- [Google Gemini Pricing](https://ai.google.dev/pricing)
- [OpenAI Pricing](https://openai.com/pricing)

---

## 📝 Histórico de Mudanças

| Data | Versão | Mudanças |
|------|--------|----------|
| 28/12/2025 | 1.0 | Criação do guia com modelos padrão atualizados (Haiku, Gemini 2.0 Flash, GPT-4o mini) |

---

**Última atualização:** 28 de Dezembro de 2025
**Manutenido por:** Kayo Carvalho Fernandes
