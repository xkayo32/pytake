# 🤖 AI Flow Assistant - Documentação Completa

**Versão:** 1.0.0
**Última atualização:** Outubro 2025
**Status:** ✅ Implementado e em produção

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Arquitetura](#-arquitetura)
3. [Guia do Usuário](#-guia-do-usuário)
4. [Referência da API](#-referência-da-api)
5. [Configuração](#️-configuração)
6. [Casos de Uso](#-casos-de-uso)
7. [Solução de Problemas](#-solução-de-problemas)
8. [Melhorias Futuras](#-melhorias-futuras)

---

## 🎯 Visão Geral

### O que é o AI Flow Assistant?

O **AI Flow Assistant** é um assistente inteligente integrado ao Chatbot Builder do PyTake que permite criar fluxos de chatbot completos usando linguagem natural. Em vez de criar nós e conexões manualmente, o usuário simplesmente descreve o que deseja e a IA gera automaticamente toda a estrutura do fluxo.

### Principais Benefícios

✅ **Produtividade:** Crie fluxos complexos em minutos (vs. horas manualmente)
✅ **Facilidade:** Não precisa conhecer estrutura técnica de fluxos
✅ **Inteligência:** IA entende contexto e sugere melhores práticas
✅ **Flexibilidade:** Suporta múltiplos modelos de IA (GPT-4, Claude, Gemini)
✅ **Iterativo:** Refina fluxos através de perguntas de clarificação

### Quando Usar?

- **Prototipagem rápida**: Testar ideias de fluxo rapidamente
- **Aprendizado**: Entender como estruturar fluxos complexos
- **Base inicial**: Criar estrutura e customizar depois
- **Padrões comuns**: Vendas, suporte, qualificação de leads, agendamento

---

## 🏗️ Arquitetura

### Visão Geral Técnica

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │          AIFlowAssistant.tsx (Container)           │   │
│  │  • Gerencia estado da conversa                     │   │
│  │  • Controla fluxo de interação                     │   │
│  │  • Integra com API backend                         │   │
│  └─────────────┬───────────────┬──────────────────────┘   │
│                │               │                            │
│       ┌────────▼─────┐  ┌─────▼────────┐                  │
│       │ ChatMessage  │  │ Clarification│                   │
│       │    .tsx      │  │   Form.tsx   │                   │
│       │ • Markdown   │  │ • Questions  │                   │
│       │ • Avatars    │  │ • Validation │                   │
│       └──────────────┘  └──────────────┘                   │
│                                                             │
│       ┌──────────────────────────────────────────┐         │
│       │         FlowPreview.tsx                  │         │
│       │  • React Flow preview                    │         │
│       │  • Visual validation                     │         │
│       │  • Import to canvas                      │         │
│       └──────────────────────────────────────────┘         │
│                                                             │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            │ HTTP POST /api/v1/ai-assistant/generate-flow
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  /api/v1/endpoints/ai_assistant.py (Route Handler)  │ │
│  │  • Validação de input                                │ │
│  │  • Autenticação/Autorização                          │ │
│  │  • Rate limiting                                     │ │
│  └─────────────────────────┬────────────────────────────┘ │
│                            │                               │
│  ┌─────────────────────────▼────────────────────────────┐ │
│  │  AIFlowAssistantService (Business Logic)            │ │
│  │  • Detecta tipo de conexão WhatsApp                 │ │
│  │  • Monta contexto para LLM                          │ │
│  │  • Valida e sanitiza resposta                       │ │
│  │  • Gera estrutura de nós/edges                      │ │
│  └─────────────────────────┬────────────────────────────┘ │
│                            │                               │
│  ┌─────────────────────────▼────────────────────────────┐ │
│  │         LLMIntegration (AI Providers)               │ │
│  │  ┌──────────────┬──────────────┬──────────────┐    │ │
│  │  │   OpenAI     │  Anthropic   │   Google     │    │ │
│  │  │  (GPT-4/3.5) │   (Claude)   │  (Gemini)    │    │ │
│  │  └──────────────┴──────────────┴──────────────┘    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Componentes Principais

#### Frontend

**1. AIFlowAssistant.tsx** (Container Principal)
- **Responsabilidades:**
  - Gerenciar histórico de mensagens
  - Controlar estados de interação (idle, generating, clarification, generated, error)
  - Integrar com API backend via `aiFlowAssistantAPI.generateFlow()`
  - Importar fluxo gerado para o canvas do React Flow
- **Estados:**
  - `messages`: Array de mensagens (user/assistant)
  - `isGenerating`: Boolean de loading
  - `clarificationQuestions`: Array de perguntas pendentes
  - `lastDescription`: String da última descrição (para clarificações)
  - `generatedFlow`: Objeto com o fluxo gerado
- **Props:**
  - `chatbotId`: UUID do chatbot atual
  - `onImportFlow`: Callback para importar nós/edges ao canvas

**2. ChatMessage.tsx** (Mensagem Individual)
- **Responsabilidades:**
  - Renderizar mensagem do usuário ou assistente
  - Formatar conteúdo com Markdown (apenas assistente)
  - Exibir avatar e timestamp
- **Props:**
  - `type`: 'user' | 'assistant'
  - `content`: String da mensagem
  - `timestamp`: Date do envio
- **Features:**
  - ReactMarkdown com componentes customizados
  - Sintaxe highlight para código
  - Listas e negrito

**3. ClarificationForm.tsx** (Formulário de Perguntas)
- **Responsabilidades:**
  - Renderizar perguntas de clarificação
  - Validar respostas (todas obrigatórias)
  - Submeter respostas ao backend
- **Props:**
  - `questions`: Array de objetos `{ question, options?, field }`
  - `onSubmit`: Callback com respostas `Record<string, string>`
  - `isLoading`: Boolean
- **Features:**
  - Radio buttons para múltipla escolha
  - Text inputs para texto livre
  - Validação inline

**4. FlowPreview.tsx** (Preview do Fluxo)
- **Responsabilidades:**
  - Exibir informações do fluxo gerado
  - Mostrar preview visual com React Flow
  - Permitir renomear antes de importar
- **Props:**
  - `flowData`: Objeto `{ name, description, canvas_data: { nodes, edges } }`
  - `onImport`: Callback para importar com nome customizado
  - `onRetry`: Callback para tentar novamente
- **Features:**
  - Estatísticas (nós, edges)
  - Tags de tipos de nós
  - Toggle de preview visual (200px altura)
  - React Flow em modo read-only

#### Backend

**1. AIFlowAssistantService** (Serviço Principal)
- **Localização:** `backend/app/services/ai_flow_assistant_service.py`
- **Métodos principais:**
  - `generate_flow()`: Orquestra geração do fluxo
  - `detect_whatsapp_type()`: Detecta tipo de conexão WhatsApp
  - `build_context()`: Monta contexto para LLM
  - `parse_llm_response()`: Valida e sanitiza resposta
  - `generate_nodes_and_edges()`: Cria estrutura de nós/edges
- **Dependências:**
  - `WhatsAppNumberRepository`: Buscar configuração WhatsApp
  - `TemplateRepository`: Buscar templates disponíveis (oficial)
  - `LLMIntegration`: Chamar modelo de IA
  - `OrganizationRepository`: Buscar configurações AI

**2. LLMIntegration** (Integração com LLMs)
- **Localização:** `backend/app/integrations/llm_integration.py`
- **Providers suportados:**
  - OpenAI (GPT-4, GPT-3.5-turbo)
  - Anthropic (Claude 3 Opus, Sonnet)
  - Google (Gemini Pro)
- **Métodos:**
  - `call_llm()`: Chama modelo com prompt
  - `validate_response()`: Valida formato da resposta
  - `handle_rate_limit()`: Gerencia rate limits

**3. Endpoint** (`/api/v1/ai-assistant/generate-flow`)
- **Localização:** `backend/app/api/v1/endpoints/ai_assistant.py`
- **Método:** POST
- **Request Body:**
  ```python
  {
    "description": str,        # Descrição do fluxo (max 2000 chars)
    "chatbot_id": UUID,        # ID do chatbot
    "industry": str | None,    # Setor da organização
    "language": str,           # Idioma (pt-BR, en-US, etc)
    "clarifications": dict | None  # Respostas de clarificação
  }
  ```
- **Response:**
  ```python
  {
    "status": "success" | "needs_clarification" | "error",
    "flow": {
      "name": str,
      "description": str,
      "canvas_data": {
        "nodes": [...],
        "edges": [...]
      }
    } | None,
    "clarification_questions": [
      {
        "question": str,
        "options": [str] | None,
        "field": str
      }
    ] | None,
    "message": str
  }
  ```

### Fluxo de Dados

```
1. Usuário digita descrição → AIFlowAssistant.tsx
2. Submit → POST /api/v1/ai-assistant/generate-flow
3. Backend:
   a. Valida input (max 2000 chars, not empty)
   b. Busca configuração WhatsApp do chatbot
   c. Detecta tipo (oficial ou qrcode)
   d. Busca templates (se oficial)
   e. Monta contexto com descrição + tipo + templates
   f. Chama LLM com contexto
   g. LLM retorna JSON com fluxo OU perguntas de clarificação
   h. Backend valida resposta
   i. Retorna para frontend
4. Frontend:
   - Se "needs_clarification": exibe ClarificationForm
   - Se "success": exibe FlowPreview
   - Se "error": exibe mensagem de erro
5. Usuário responde clarificações → repete processo (passo 2)
6. Usuário clica "Importar Flow" → callback onImportFlow
7. Canvas recebe nós e edges → renderiza novo fluxo
```

---

## 📖 Guia do Usuário

### Como Usar (Passo a Passo)

#### 1. Acessar o AI Flow Assistant

1. Faça login no PyTake como **org_admin**
2. Navegue para **Admin → Chatbots**
3. Clique em um chatbot existente OU crie um novo
4. Acesse a aba **"Builder"**
5. No lado direito da tela, você verá o painel **"AI Flow Assistant"** com ícone ✨

#### 2. Descrever o Fluxo Desejado

No campo de input, descreva em linguagem natural o que você deseja:

**Exemplos de descrições eficazes:**

✅ **BOA**: "Crie um fluxo de vendas para imóveis que captura nome, telefone, tipo de imóvel desejado (casa/apartamento) e orçamento. Ao final, transferir para um corretor."

✅ **BOA**: "Preciso de um chatbot de suporte que apresenta menu com 3 opções: Problemas Técnicos, Falar com Atendente, Cancelar Conta. Se escolher Problemas Técnicos, mostrar FAQ e depois perguntar se resolveu."

✅ **BOA**: "Quero um fluxo de agendamento de consultas que pergunta nome, especialidade médica desejada, e disponibilidade (manhã/tarde). Depois confirma o agendamento."

❌ **RUIM (muito vaga)**: "Faça um chatbot de vendas"

❌ **RUIM (muito longa)**: [Descrição com mais de 2000 caracteres]

**Dicas para boas descrições:**
- Seja específico sobre os dados que deseja capturar
- Mencione as opções/escolhas do usuário
- Indique o que fazer ao final (transferir, enviar email, etc)
- Inclua o contexto do negócio se relevante

#### 3. Aguardar Geração

Após clicar **"Gerar Flow"**:
- Loading spinner aparece
- Tempo médio: **5-10 segundos**
- Mensagem do assistente surge no chat

#### 4. Cenário A - Fluxo Gerado Diretamente

Se a descrição for clara, a IA gera o fluxo imediatamente:

1. **Card de Preview** aparece com:
   - Nome do fluxo (editável)
   - Descrição
   - Estatísticas (X nós, Y conexões)
   - Tags dos tipos de nós usados

2. Clique em **"Ver Preview Visual"** (opcional):
   - Canvas interativo com visualização do grafo
   - Verifique estrutura antes de importar

3. **Renomear** (opcional):
   - Clique no nome do fluxo
   - Digite novo nome
   - Pressione Enter ou clique fora

4. Clique **"Importar Flow"**:
   - Nós e conexões são adicionados ao canvas
   - Auto-save automático
   - Agora você pode editar manualmente

#### 5. Cenário B - Clarificação Necessária

Se a descrição for vaga, a IA faz perguntas:

**Exemplo:**
```
Descrição: "Crie um fluxo de vendas"

AI: "Preciso de mais informações. Responda as perguntas abaixo:

1. Qual produto ou serviço você vende?
   [ ] Cursos online
   [ ] Imóveis
   [ ] Consultorias
   [ ] Outro: _______

2. Quantos passos você quer no fluxo?
   ( ) 3-5 passos (simples)
   ( ) 6-10 passos (médio)
   ( ) 10+ passos (complexo)

3. Ao final do fluxo, o que deve acontecer?
   ( ) Transferir para vendedor humano
   ( ) Enviar formulário por email
   ( ) Finalizar e agradecer"
```

**Como responder:**
1. Preencha **todas** as perguntas
2. Clique **"Enviar Respostas"**
3. IA processa e gera fluxo refinado
4. Voltar ao Cenário A (preview + importar)

#### 6. Refinar e Tentar Novamente

Se o fluxo gerado não atender:

1. Clique **"Tentar novamente"** (ícone de refresh)
2. Digite uma nova descrição mais específica
3. IA gera nova versão

**Ou:**
1. Importe o fluxo
2. Edite manualmente no canvas
3. Adicione/remova nós conforme necessário

### Atalhos de Teclado

| Atalho | Ação |
|--------|------|
| `Enter` (no input) | Enviar descrição |
| `Shift + Enter` | Quebra de linha (não implementado) |
| `Esc` | Limpar input (não implementado) |

---

## 🔌 Referência da API

### POST `/api/v1/ai-assistant/generate-flow`

Gera um fluxo de chatbot baseado em descrição em linguagem natural.

#### Request

**Headers:**
```http
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Body:**
```json
{
  "description": "Crie um fluxo de vendas para imóveis...",
  "chatbot_id": "123e4567-e89b-12d3-a456-426614174000",
  "industry": "real_estate",
  "language": "pt-BR",
  "clarifications": {
    "product": "imóveis",
    "steps": "6-10 passos",
    "action": "transferir"
  }
}
```

**Campos:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `description` | string | ✅ | Descrição do fluxo (max 2000 chars) |
| `chatbot_id` | UUID | ✅ | ID do chatbot |
| `industry` | string | ❌ | Setor da organização |
| `language` | string | ✅ | Idioma (pt-BR, en-US, es-ES) |
| `clarifications` | object | ❌ | Respostas de clarificação |

#### Response - Sucesso (200)

**Status:** `"success"`

```json
{
  "status": "success",
  "flow": {
    "name": "Fluxo de Vendas de Imóveis",
    "description": "Fluxo completo para qualificação de leads interessados em comprar imóveis",
    "canvas_data": {
      "nodes": [
        {
          "id": "node-start-uuid",
          "type": "customNode",
          "position": { "x": 400, "y": 0 },
          "data": {
            "nodeType": "start",
            "label": "Início",
            "config": {}
          }
        },
        {
          "id": "node-message-uuid",
          "type": "customNode",
          "position": { "x": 400, "y": 150 },
          "data": {
            "nodeType": "message",
            "label": "Mensagem de Boas-vindas",
            "config": {
              "text": "Olá! 👋 Bem-vindo à nossa imobiliária..."
            }
          }
        }
        // ... mais nós
      ],
      "edges": [
        {
          "id": "edge-uuid",
          "source": "node-start-uuid",
          "target": "node-message-uuid",
          "type": "smoothstep"
        }
        // ... mais conexões
      ]
    }
  },
  "message": "Fluxo gerado com sucesso! Clique em 'Importar' para adicionar ao canvas."
}
```

#### Response - Clarificação Necessária (200)

**Status:** `"needs_clarification"`

```json
{
  "status": "needs_clarification",
  "clarification_questions": [
    {
      "question": "Qual tipo de imóvel você vende?",
      "options": ["Casas", "Apartamentos", "Terrenos", "Comercial"],
      "field": "property_type"
    },
    {
      "question": "Você possui integração com CRM?",
      "options": null,
      "field": "crm_integration"
    }
  ],
  "message": "Preciso de mais informações para gerar o fluxo ideal."
}
```

#### Response - Erro (400/500)

```json
{
  "status": "error",
  "message": "Descrição muito vaga. Por favor, forneça mais detalhes.",
  "error_code": "VAGUE_DESCRIPTION"
}
```

**Códigos de Erro:**

| Código | Descrição |
|--------|-----------|
| `VAGUE_DESCRIPTION` | Descrição muito vaga |
| `INVALID_CHATBOT` | Chatbot não encontrado |
| `LLM_ERROR` | Erro ao chamar modelo de IA |
| `RATE_LIMIT` | Rate limit excedido |
| `VALIDATION_ERROR` | Erro de validação no JSON gerado |

---

## ⚙️ Configuração

### Configuração de Modelos AI (Por Organização)

**Rota:** `/admin/settings/ai-models`

#### 1. Adicionar API Key de Provider

**OpenAI:**
```python
# Configuração
provider = "openai"
api_key = "sk-proj-..."  # Sua chave OpenAI
model = "gpt-4"  # ou "gpt-3.5-turbo"
temperature = 0.7  # Criatividade (0.0 - 1.0)
```

**Anthropic (Claude):**
```python
provider = "anthropic"
api_key = "sk-ant-..."
model = "claude-3-opus-20240229"  # ou "claude-3-sonnet-20240229"
temperature = 0.7
```

**Google (Gemini):**
```python
provider = "google"
api_key = "AIza..."
model = "gemini-pro"
temperature = 0.8
```

#### 2. Configuração no Banco de Dados

Tabela: `ai_settings`

```sql
CREATE TABLE ai_settings (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    provider VARCHAR(50) NOT NULL,  -- 'openai', 'anthropic', 'google'
    model VARCHAR(100) NOT NULL,
    api_key_encrypted TEXT NOT NULL,  -- Criptografada com AES-256
    temperature FLOAT DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2000,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. Criptografia de API Keys

As chaves são criptografadas antes de salvar:

```python
from app.core.encryption import encrypt_value, decrypt_value

# Ao salvar
encrypted_key = encrypt_value(api_key)
ai_setting.api_key_encrypted = encrypted_key

# Ao usar
decrypted_key = decrypt_value(ai_setting.api_key_encrypted)
```

#### 4. Rate Limiting

**Por Organização:**
- 10 requests/min para geração de fluxos
- 100 requests/dia (plano Starter)
- Ilimitado (plano Enterprise)

**Configuração no Redis:**
```python
key = f"ai_assistant_rate_limit:{organization_id}"
redis.incr(key, ttl=60)  # 1 minuto
```

---

## 💡 Casos de Uso

### 1. Fluxo de Vendas Simples

**Descrição:**
```
Crie um fluxo para vender cursos online. Pergunte o nome, interesse (Marketing Digital, Programação, Design), e orçamento (até R$ 500, R$ 500-1000, acima de R$ 1000). Depois, envie informações sobre o curso e transfira para vendedor.
```

**Fluxo Gerado:**
```
Start
  ↓
Message: "Olá! Vamos encontrar o curso ideal para você 🎓"
  ↓
Question: "Qual seu nome?" → salvar em {{nome}}
  ↓
Interactive List: "Qual área te interessa?"
  - Marketing Digital
  - Programação
  - Design
  → salvar em {{area}}
  ↓
Interactive Buttons: "Qual seu orçamento?"
  - Até R$ 500
  - R$ 500-1000
  - Acima de R$ 1000
  → salvar em {{orcamento}}
  ↓
Condition: Se {{area}} == "Marketing Digital"
  → Message: "Temos 3 cursos incríveis de Marketing..."
Condition: Se {{area}} == "Programação"
  → Message: "Confira nossos cursos de Dev..."
Condition: Se {{area}} == "Design"
  → Message: "Nossos cursos de Design são..."
  ↓
Message: "Obrigado pelo interesse, {{nome}}! Vou te conectar com um consultor."
  ↓
Handoff: Transferir para departamento "Vendas"
  ↓
End
```

### 2. Suporte Técnico com FAQ

**Descrição:**
```
Chatbot de suporte técnico. Menu com 3 opções: 1) Problema de Login, 2) Erro de Pagamento, 3) Falar com Atendente. Se escolher opção 1 ou 2, mostrar FAQ. Depois perguntar se resolveu. Se não, transferir.
```

**Fluxo Gerado:**
```
Start
  ↓
Message: "Olá! Sou o assistente de suporte 🛠️"
  ↓
Interactive Buttons: "Como posso ajudar?"
  - 🔐 Problema de Login
  - 💳 Erro de Pagamento
  - 👤 Falar com Atendente
  → salvar em {{opcao}}
  ↓
Condition: Se {{opcao}} == "Problema de Login"
  → Message: "Para resolver problemas de login:\n1. Verifique seu email...\n2. Clique em 'Esqueci a senha'..."
Condition: Se {{opcao}} == "Erro de Pagamento"
  → Message: "Para erros de pagamento:\n1. Verifique dados do cartão...\n2. Entre em contato com banco..."
Condition: Se {{opcao}} == "Falar com Atendente"
  → Handoff: Transferir para departamento "Suporte"
  ↓
Question: "Isso resolveu seu problema?" (Sim/Não)
  → salvar em {{resolvido}}
  ↓
Condition: Se {{resolvido}} == "Sim"
  → Message: "Ótimo! Fico feliz em ajudar 😊"
  → End
Condition: Se {{resolvido}} == "Não"
  → Message: "Vou te conectar com um atendente humano."
  → Handoff: Transferir para departamento "Suporte"
  → End
```

### 3. Qualificação de Leads

**Descrição:**
```
Fluxo de qualificação de leads para empresa de software B2B. Pergunte nome da empresa, setor, tamanho (Pequena/Média/Grande), desafio principal, e urgência. Calcule score e, se alto, transfira para vendas. Se baixo, agende follow-up.
```

**Fluxo Gerado:**
```
Start
  ↓
Message: "Olá! Vamos entender como podemos ajudar sua empresa 🚀"
  ↓
Question: "Qual o nome da sua empresa?"
  → salvar em {{empresa}}
  ↓
Interactive List: "Qual o setor?"
  - Varejo
  - Saúde
  - Educação
  - Tecnologia
  - Outro
  → salvar em {{setor}}
  ↓
Interactive Buttons: "Tamanho da empresa?"
  - Pequena (1-50 funcionários)
  - Média (51-250)
  - Grande (250+)
  → salvar em {{tamanho}}
  ↓
Question: "Qual o principal desafio da {{empresa}}?"
  → salvar em {{desafio}}
  ↓
Interactive Buttons: "Qual a urgência?"
  - Imediata (este mês)
  - Curto prazo (3 meses)
  - Longo prazo (6+ meses)
  → salvar em {{urgencia}}
  ↓
Script: Calcular lead score
  ```javascript
  let score = 0;
  if (tamanho === 'Grande') score += 30;
  else if (tamanho === 'Média') score += 20;
  else score += 10;

  if (urgencia === 'Imediata') score += 40;
  else if (urgencia === 'Curto prazo') score += 20;

  return score;  // salvar em {{score}}
  ```
  ↓
Condition: Se {{score}} >= 50 (Lead Quente)
  → Message: "Ótimo! Vou te conectar com nosso especialista."
  → Action: Adicionar tag "Lead Quente"
  → Handoff: Transferir para "Vendas"
Condition: Se {{score}} < 50 (Lead Frio)
  → Message: "Obrigado pelas informações! Vou agendar um follow-up."
  → Action: Agendar follow-up em 7 dias
  → Message: "Entraremos em contato em breve. Tenha um ótimo dia!"
  ↓
End
```

---

## 🛠️ Solução de Problemas

### Erros Comuns e Soluções

#### 1. "Falha na conexão com AI"

**Causa:** API key inválida ou expirada

**Solução:**
1. Vá em `/admin/settings/ai-models`
2. Verifique se a API key está correta
3. Teste a conexão clicando em "Testar"
4. Se necessário, gere nova key no painel do provider (OpenAI, Anthropic, Google)

#### 2. "Rate limit excedido"

**Causa:** Muitas requisições em curto período

**Solução:**
- Aguarde 1 minuto e tente novamente
- Se persistir, verifique seu plano (Starter: 100/dia, Enterprise: ilimitado)
- Considere fazer upgrade do plano

#### 3. "Descrição muito vaga"

**Causa:** Descrição não forneceu informações suficientes

**Solução:**
- Seja mais específico:
  - ❌ "Crie um chatbot"
  - ✅ "Crie um chatbot de vendas que captura nome, interesse e orçamento"
- Inclua: objetivo, dados a capturar, ação final
- Ou aguarde perguntas de clarificação da IA

#### 4. "Modelo não disponível"

**Causa:** Modelo selecionado não está configurado ou provider fora do ar

**Solução:**
1. Verifique status do provider: [OpenAI Status](https://status.openai.com/), [Anthropic Status](https://status.anthropic.com/)
2. Tente outro modelo temporariamente
3. Verifique se há saldo na conta do provider

#### 5. Fluxo Gerado Não Faz Sentido

**Causa:** Descrição ambígua ou temperatura muito alta

**Solução:**
1. Clique em "Tentar novamente"
2. Reescreva descrição com mais clareza
3. Reduza temperatura nas configurações (ex: de 0.8 para 0.5)
4. Use clarificações para refinar

#### 6. Import Não Funciona

**Causa:** Conflito de IDs ou canvas cheio

**Solução:**
- Limpe o canvas antes de importar (se necessário)
- Verifique logs do navegador (F12 → Console)
- Tente criar novo fluxo vazio e importar lá

---

## 🚀 Melhorias Futuras

### Roadmap

#### v1.1 - Histórico e Refinamento (Q4 2025)
- [ ] Histórico de conversas salvo localmente
- [ ] Exportar/importar conversas com AI
- [ ] Botão "Refinar este fluxo" (edição iterativa)
- [ ] Sugestões baseadas em fluxos similares existentes

#### v1.2 - Templates e Categorização (Q1 2026)
- [ ] Templates de prompts pré-definidos por indústria
- [ ] Categorização automática de exemplos
- [ ] Biblioteca de fluxos gerados pela comunidade
- [ ] Rating de fluxos (útil/não útil)

#### v1.3 - Analytics e Insights (Q2 2026)
- [ ] Analytics de uso do assistente
- [ ] Métricas: tempo médio de geração, taxa de sucesso
- [ ] Insights: "80% dos fluxos de vendas incluem X"
- [ ] Sugestões proativas: "Adicionar nó de handoff?"

#### v1.4 - Multimodalidade (Q3 2026)
- [ ] Upload de imagens (esboços de fluxo)
- [ ] AI interpreta imagem e gera fluxo
- [ ] Suporte a áudio (descrever por voz)
- [ ] Geração de variações (A/B testing)

#### v2.0 - Autonomia Avançada (Q4 2026)
- [ ] AI sugere otimizações em fluxos existentes
- [ ] Análise de performance: "Este nó tem 60% de abandono, tente X"
- [ ] Geração de testes automatizados
- [ ] Integração com analytics para insights

### Contribuindo com Ideias

Se você tem sugestões de melhorias:
1. Acesse nosso [GitHub Issues](https://github.com/pytake/pytake/issues)
2. Crie issue com label `ai-assistant`
3. Descreva caso de uso e benefício esperado

---

## 📚 Recursos Adicionais

### Links Úteis

- [Documentação Geral do PyTake](../README.md)
- [Guia do Chatbot Builder](./CHATBOT_BUILDER.md)
- [API Reference Completa](./API_DOCUMENTATION.md)
- [FAQ](./FAQ.md)

### Tutoriais em Vídeo (Futuro)

- [ ] "Primeiros Passos com AI Flow Assistant" (5min)
- [ ] "Criando Fluxos Complexos em Minutos" (10min)
- [ ] "Boas Práticas para Descrições Eficazes" (7min)
- [ ] "Integrando IA nos Seus Fluxos" (15min)

### Suporte

**Precisa de ajuda?**
- 📧 Email: support@pytake.com
- 💬 Chat: [chat.pytake.com](https://chat.pytake.com)
- 📖 Docs: [docs.pytake.com](https://docs.pytake.com)
- 🐛 Bugs: [GitHub Issues](https://github.com/pytake/pytake/issues)

---

**Última atualização:** Outubro 2025
**Versão:** 1.0.0
**Mantido por:** Time de Produto PyTake
