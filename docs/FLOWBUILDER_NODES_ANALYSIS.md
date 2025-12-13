# Node Types Analysis - Flow Builder Funcionalidade

**Data**: 13/12/2025 | **Status**: ✅ Análise Completa | **Total de Nodes**: 19 tipos

---

## 📊 Resumo Executivo

| Node Type | Status | Produção | Avisos | Reqs |
|-----------|--------|----------|--------|------|
| **start** | ✅ Implementado | ✅ Sim | Nenhum | - |
| **message** | ✅ Implementado | ✅ Sim | Nenhum | - |
| **question** | ✅ Implementado | ✅ Sim | Timeout 1h | - |
| **condition** | ✅ Implementado | ✅ Sim | Nenhum | - |
| **handoff** | ✅ Implementado | ✅ Sim | Nenhum | - |
| **delay** | ✅ Implementado | ✅ Sim | Max 60s | - |
| **jump** | ✅ Implementado | ✅ Sim | Nenhum | - |
| **action** | ✅ Implementado | ✅ Sim | Nenhum | - |
| **api_call** | ✅ Implementado | ✅ Sim | Timeout 30s | httpx |
| **ai_prompt** | ✅ Implementado | ⚠️ Parcial | Requer API key | OpenAI |
| **database_query** | ✅ Implementado | ⚠️ Parcial | SQL injection risk | SQLAlchemy |
| **script** | ✅ Implementado | ❌ Cuidado | Exec Python | Restrito |
| **set_variable** | ✅ Implementado | ✅ Sim | Nenhum | - |
| **random** | ✅ Implementado | ✅ Sim | A/B Testing | - |
| **datetime** | ✅ Implementado | ✅ Sim | TZ aware | - |
| **analytics** | ✅ Implementado | ✅ Sim | Event tracking | - |
| **whatsapp_template** | ✅ Implementado | ⚠️ Requer API | Meta Templates | Meta |
| **interactive_buttons** | ✅ Implementado | ⚠️ Requer API | Official only | Meta |
| **interactive_list** | ✅ Implementado | ⚠️ Requer API | Official only | Meta |

---

## ✅ NODES PRONTOS PARA PRODUÇÃO

### 1. **START** Node ✅

**O que faz**: Ponto inicial do flow

**Implementação**:
- Nenhuma lógica (apenas marcador de início)
- Flow começa sempre pelo start node
- Se existir start_node, começa por ele

**Code Location**: `models/chatbot.py` line 234
```python
@property
def start_node(self):
    return next((n for n in self.nodes if n.node_type == "start"), None)
```

**Configuração**: Nenhuma

**Em Produção?**: ✅ **SIM** - Totalmente estável

---

### 2. **MESSAGE** Node ✅

**O que faz**: Enviar mensagem de texto ou mídia para o cliente

**Tipos Suportados**:
- Text
- Image (com URL)
- Video (com URL)
- Document (com URL)
- Audio (com URL)

**Implementação**:
```python
# whatsapp_service.py line 295
elif node.node_type == "message":
    media_type = node_data.get("mediaType")
    if media_type in ["image", "video", "document", "audio"]:
        await self._send_media_message(conversation, node_data, media_type)
    else:
        content_text = node_data.get("messageText", "")
```

**Configuração**:
```json
{
  "messageText": "Olá! Como posso ajudar?",
  "mediaType": null
}
```

**Mídia**:
```json
{
  "messageText": "",
  "mediaType": "image",
  "mediaUrl": "https://example.com/image.jpg"
}
```

**Em Produção?**: ✅ **SIM** - Totalmente estável

---

### 3. **QUESTION** Node ✅

**O que faz**: Fazer pergunta e coletar resposta do usuário com timeout

**Implementação**:
- Armazena timestamp em context_variables
- Espera resposta do usuário
- Após 1h → Transfere para agente (timeout hardcoded)
- Validação de resposta por tipo (texto, número, email, etc)

**Validações Suportadas**:
- text: Texto livre
- number: Validar se é número
- email: Validar email
- phone: Validar telefone
- date: Validar formato data
- options: Validar contra lista de opções

**Code Location**: `whatsapp_service.py` lines 466-520

**Configuração**:
```json
{
  "questionText": "Qual é seu email?",
  "variable": "user_email",
  "responseType": "email",
  "responseValidation": {
    "type": "email",
    "required": true,
    "minLength": null,
    "maxLength": null,
    "pattern": null
  }
}
```

**Timeout**: 
- ❌ HARDCODED em 1 hora (não configurável)
- ⚠️ **NOVO**: Com `inactivity_settings`, pode customizar timeout global
- Ação: Transfere para agente

**Em Produção?**: ✅ **SIM** - Estável (com novo timeout customizável)

---

### 4. **CONDITION** Node ✅

**O que faz**: Avaliar condições e decidir qual branch seguir

**Operadores Suportados**:
- `==` (igual)
- `!=` (diferente)
- `>` (maior que)
- `<` (menor que)
- `>=` (maior ou igual)
- `<=` (menor ou igual)
- `contains` (contém)
- `startsWith` (começa com)
- `endsWith` (termina com)
- `in` (está na lista)
- `notIn` (não está na lista)
- `isEmpty` (vazio)
- `isNotEmpty` (não vazio)

**Implementação**:
```python
# whatsapp_service.py line 194
if node.node_type == "condition":
    result = await self._evaluate_conditions(conversation, node_data)
    await self._advance_to_next_node(..., condition_result=result)
```

**Configuração**:
```json
{
  "variable": "user_age",
  "operator": ">",
  "value": "18",
  "branches": {
    "true": "node_id_for_adults",
    "false": "node_id_for_minors"
  }
}
```

**Em Produção?**: ✅ **SIM** - Muito estável

---

### 5. **HANDOFF** Node ✅

**O que faz**: Transferir conversa para agente humano

**Comportamento**:
- Envia mensagem de notificação
- Muda status de conversa para "queued" ou "active" (com agente)
- Atualiza `is_bot_active = false`
- Prioridade customizável

**Implementação**:
```python
# whatsapp_service.py line 202
if node.node_type == "handoff":
    await self._execute_handoff(conversation, node_data)
```

**Configuração**:
```json
{
  "transferMessage": "Um agente vai te atender em breve",
  "sendTransferMessage": true,
  "priority": "medium",
  "targetQueueId": null,
  "targetAgentId": null,
  "targetDepartmentId": null
}
```

**Em Produção?**: ✅ **SIM** - Altamente usado em produção

---

### 6. **DELAY** Node ✅

**O que faz**: Aguardar X segundos antes de avançar

**Comportamento**:
- Pausa execução
- ⚠️ **MAX 60 segundos** (proteção contra travamentos)
- Opcional: Envia mensagem de "aguarde"

**Implementação**:
```python
# whatsapp_service.py line 208
if node.node_type == "delay":
    delay_seconds = node_data.get("delaySeconds", 3)
    if delay_seconds > 60:
        delay_seconds = 60  # Máximo 60s
    await asyncio.sleep(delay_seconds)
```

**Configuração**:
```json
{
  "delaySeconds": 5,
  "delayMessage": "Um momento, buscando informações..."
}
```

**Em Produção?**: ✅ **SIM** - Seguro e testado

---

### 7. **JUMP** Node ✅

**O que faz**: Pular para outro node ou flow diferente

**Tipos de Jump**:
- Jump para outro node no mesmo flow
- Jump para outro flow no mesmo chatbot
- Jump para flow em outro chatbot (cross-chatbot)

**Implementação**:
```python
# whatsapp_service.py line 214
if node.node_type == "jump":
    await self._execute_jump(conversation, node_data, incoming_message)
```

**Configuração**:
```json
{
  "targetNodeId": "node-uuid",
  "targetFlowId": "flow-uuid",
  "clearContext": false
}
```

**Em Produção?**: ✅ **SIM** - Funciona bem

---

### 8. **ACTION** Node ✅

**O que faz**: Executar ações em batch (webhook, salvar contato, atualizar variável, etc)

**Ações Suportadas**:
1. **webhook**: Chamar URL externa
2. **save_contact**: Salvar/atualizar contato com dados coletados
3. **update_conversation**: Atualizar dados da conversa
4. **create_queue_item**: Adicionar à fila
5. **send_email**: Enviar email (futuro)

**Implementação**:
```python
# whatsapp_service.py line 220
if node.node_type == "action":
    await self._execute_action(conversation, node, flow, incoming_message, node_data)
```

**Configuração (Webhook)**:
```json
{
  "actions": [
    {
      "type": "webhook",
      "url": "https://api.example.com/webhook",
      "method": "POST",
      "headers": {"Authorization": "Bearer token"},
      "body": {
        "customer_name": "{{customer_name}}",
        "email": "{{email}}"
      },
      "saveToVariable": "webhook_response"
    }
  ]
}
```

**Configuração (Save Contact)**:
```json
{
  "actions": [
    {
      "type": "save_contact",
      "name": "{{customer_name}}",
      "email": "{{email}}",
      "attributes": {
        "product_interest": "{{product}}",
        "lead_source": "whatsapp_bot"
      }
    }
  ]
}
```

**Em Produção?**: ✅ **SIM** - Muito usado

---

### 9. **SET VARIABLE** Node ✅

**O que faz**: Atualizar variáveis do contexto da conversa

**Tipos de Valor**:
- String literal
- Número
- Booleano
- Valor de outra variável
- Resultado de expressão

**Implementação**:
```python
# whatsapp_service.py line 250
if node.node_type == "set_variable":
    await self._execute_set_variable(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "variables": {
    "user_type": "premium",
    "discount_percent": 10,
    "has_purchased": true,
    "greeting": "{{user_name}}, bem-vindo!"
  }
}
```

**Em Produção?**: ✅ **SIM** - Estável

---

### 10. **RANDOM** Node ✅

**O que faz**: A/B Testing - Roteamento aleatório de conversas

**Tipos**:
- Random split (50/50, ou custom percentages)
- Random selection (escolher entre N caminhos)

**Implementação**:
```python
# whatsapp_service.py line 256
if node.node_type == "random":
    await self._execute_random(conversation, node, flow, incoming_message, node_data)
```

**Configuração (50/50 A/B)**:
```json
{
  "distribution": {
    "option_a": 50,
    "option_b": 50
  },
  "branches": {
    "option_a": "node_uuid_a",
    "option_b": "node_uuid_b"
  }
}
```

**Em Produção?**: ✅ **SIM** - Bom para testes

---

### 11. **DATETIME** Node ✅

**O que faz**: Manipulação de datas e horários

**Operações**:
- Adicionar/subtrair dias, horas, minutos
- Formatar data
- Validar horário comercial
- Calcular diferença entre datas

**Implementação**:
```python
# whatsapp_service.py line 262
if node.node_type == "datetime":
    await self._execute_datetime(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "operation": "add_days",
  "inputVariable": "order_date",
  "value": 7,
  "outputVariable": "estimated_delivery",
  "format": "DD/MM/YYYY"
}
```

**Em Produção?**: ✅ **SIM** - Útil para agendamentos

---

### 12. **ANALYTICS** Node ✅

**O que faz**: Rastrear eventos e métricas customizadas

**Implementação**:
```python
# whatsapp_service.py line 268
if node.node_type == "analytics":
    await self._execute_analytics(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "eventName": "user_viewed_product",
  "properties": {
    "product_id": "{{product_id}}",
    "category": "{{category}}",
    "price": "{{price}}"
  }
}
```

**Integração**: MongoDB (logs estruturados)

**Em Produção?**: ✅ **SIM** - Para análise de dados

---

## ⚠️ NODES FUNCIONAIS MAS COM RESTRIÇÕES

### 13. **API CALL** Node ⚠️

**O que faz**: Fazer chamada HTTP (GET, POST, etc) e salvar resposta

**Características**:
- Timeout: 30 segundos
- Suporta authentication (Bearer, Basic, Custom Headers)
- JSON response parsing
- Salva resposta em variável
- Error handling

**Implementação**:
```python
# whatsapp_service.py line 226
if node.node_type == "api_call":
    await self._execute_api_call(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "url": "https://api.example.com/products",
  "method": "GET",
  "headers": {
    "Authorization": "Bearer {{api_key}}",
    "Content-Type": "application/json"
  },
  "body": {
    "product_id": "{{product_id}}"
  },
  "timeout": 30,
  "responseVariable": "product_data",
  "errorHandling": {
    "onError": "continue",
    "fallbackValue": "{}",
    "retries": 3
  }
}
```

**Riscos**:
- ❌ Timeout pode bloquear conversa
- ❌ API externa pode estar down
- ⚠️ Sem circuit breaker (risco de cascata de erros)

**Em Produção?**: ✅ **SIM** - Com monitoramento de timeouts

---

### 14. **WHATSAPP TEMPLATE** Node ⚠️

**O que faz**: Enviar template oficial do WhatsApp (pré-aprovado)

**Características**:
- Requer templates pré-aprovados no WhatsApp Business
- Suporta parâmetros dinâmicos
- Vínculo com 24h window
- Official connection type apenas

**Implementação**:
```python
# whatsapp_service.py line 274
if node.node_type == "whatsapp_template":
    await self._execute_whatsapp_template(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "templateName": "order_confirmation",
  "templateLanguage": "pt_BR",
  "parameters": [
    "{{order_id}}",
    "{{customer_name}}",
    "{{order_total}}"
  ]
}
```

**Requisitos**:
- ❌ Conexão **OFFICIAL ONLY** (Meta Cloud API)
- ❌ Templates aprovados pelo WhatsApp
- ⏰ Dentro de 24h window
- ⚠️ Aprovação pode demorar 24-48h

**Em Produção?**: ⚠️ **SIM** - Mas com setup complexo

---

### 15. **INTERACTIVE BUTTONS** Node ⚠️

**O que faz**: Enviar botões interativos para o cliente clicar

**Características**:
- Máximo 3 botões
- Cada botão pode ter callback
- Automático routing por clique
- Official connection type apenas

**Implementação**:
```python
# whatsapp_service.py line 280
if node.node_type == "interactive_buttons":
    await self._execute_interactive_buttons(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "message": "Escolha uma opção:",
  "buttons": [
    {
      "id": "btn_1",
      "title": "Opção 1",
      "targetNodeId": "node_uuid_1"
    },
    {
      "id": "btn_2",
      "title": "Opção 2",
      "targetNodeId": "node_uuid_2"
    },
    {
      "id": "btn_3",
      "title": "Opção 3",
      "targetNodeId": "node_uuid_3"
    }
  ]
}
```

**Requisitos**:
- ❌ Conexão **OFFICIAL ONLY**
- ❌ Meta Cloud API
- ⚠️ Cliente must have WhatsApp updated

**Em Produção?**: ⚠️ **SIM** - Com restrições

---

### 16. **INTERACTIVE LIST** Node ⚠️

**O que faz**: Enviar menu/lista interativa para escolher

**Características**:
- Múltiplas opções
- Organizado em seções
- Official connection type apenas
- Melhor UX que buttons

**Implementação**:
```python
# whatsapp_service.py line 286
if node.node_type == "interactive_list":
    await self._execute_interactive_list(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "message": "Selecione uma categoria:",
  "sections": [
    {
      "title": "Produtos",
      "rows": [
        {
          "id": "prod_1",
          "title": "Produto A",
          "description": "Descrição A",
          "targetNodeId": "node_a"
        }
      ]
    }
  ]
}
```

**Requisitos**:
- ❌ Conexão **OFFICIAL ONLY**
- ❌ Meta Cloud API

**Em Produção?**: ⚠️ **SIM** - Com restrições

---

## ❌ NODES COM RISCO - USE COM CUIDADO

### 17. **AI PROMPT** Node ⚠️⚠️

**O que faz**: Integração com OpenAI (GPT-3.5, GPT-4)

**Características**:
- Geração de conteúdo via IA
- Context-aware (usa variáveis)
- Customizável (temperature, tokens, etc)
- Salva resposta em variável

**Implementação**:
```python
# whatsapp_service.py line 232
if node.node_type == "ai_prompt":
    await self._execute_ai_prompt(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "prompt": "Responda como um atendente de suporte. Pergunta: {{user_question}}",
  "model": "gpt-4",
  "temperature": 0.7,
  "maxTokens": 500,
  "apiKey": "{{openai_api_key}}",
  "timeout": 60,
  "responseVariable": "ai_response"
}
```

**⚠️ AVISOS CRÍTICOS**:
1. **Custo**: Cada call custa dinheiro (centavos)
2. **Latência**: Pode levar 5-30 segundos
3. **API Key**: Precisa guardar seguro (não hardcodar)
4. **Rate Limit**: OpenAI tem limites de requisição
5. **Qualidade**: Pode gerar respostas inadequadas
6. **Compliance**: GDPR/LGPD considerações

**Em Produção?**: ⚠️ **CUIDADO** - Funciona mas com custo

---

### 18. **DATABASE QUERY** Node ⚠️⚠️

**O que faz**: Executar queries SQL customizadas no banco

**Características**:
- Suporta SELECT, INSERT, UPDATE (não DELETE)
- Context-aware (substitui {{variables}})
- Salva resultado em variável
- Multi-database (Postgres, MySQL)

**Implementação**:
```python
# whatsapp_service.py line 238
if node.node_type == "database_query":
    await self._execute_database_query(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "database": "postgres",
  "query": "SELECT * FROM products WHERE id = {{product_id}}",
  "timeout": 10,
  "resultVariable": "product_details",
  "allowedTables": ["products", "orders"],
  "maxRows": 100
}
```

**⚠️ AVISOS CRÍTICOS**:
1. **SQL Injection**: {{variable}} substitution pode ser perigoso
   - Mitigação: Use parameterized queries (não está implementado!)
2. **Performance**: Query lenta bloqueia conversa
3. **Acesso**: Pode acessar qualquer tabela se não restringido
4. **Segurança**: Variáveis não são escapadas corretamente
5. **Dados Sensíveis**: Cuidado com PII (CPF, email, etc)

**Em Produção?**: ❌ **NÃO RECOMENDADO** - Risk de SQL injection

---

### 19. **SCRIPT** Node ❌❌

**O que faz**: Executar código Python customizado

**Características**:
- Acesso a variáveis do flow
- Pode executar qualquer código Python
- Timeout: Sem proteção contra infinite loops
- Acesso ao contexto da conversa

**Implementação**:
```python
# whatsapp_service.py line 244
if node.node_type == "script":
    await self._execute_script(conversation, node, flow, incoming_message, node_data)
```

**Configuração**:
```json
{
  "code": "
result = len(customer_name) > 5
discount = float(price) * 0.1
  ",
  "timeout": 30,
  "outputVariable": "script_result"
}
```

**❌ AVISOS CRÍTICOS - NÃO USE EM PRODUÇÃO**:
1. **Code Injection**: Admin pode executar código arbitrário
2. **No Timeout Enforcement**: Pode travar conversa
3. **Resource Exhaustion**: Pode consumir 100% CPU
4. **Security**: Sem sandbox (acesso total ao sistema)
5. **Maintenance**: Código customizado é debt técnico

**Em Produção?**: ❌ **NÃO RECOMENDADO** - Risco de segurança

---

## 📋 Matriz de Compatibilidade

### Por Tipo de Conexão WhatsApp

| Node | Official API | Business | WhatsApp Web |
|------|-----------|----------|---|
| message | ✅ | ✅ | ✅ |
| question | ✅ | ✅ | ✅ |
| condition | ✅ | ✅ | ✅ |
| handoff | ✅ | ✅ | ✅ |
| delay | ✅ | ✅ | ✅ |
| jump | ✅ | ✅ | ✅ |
| action | ✅ | ✅ | ✅ |
| set_variable | ✅ | ✅ | ✅ |
| random | ✅ | ✅ | ✅ |
| datetime | ✅ | ✅ | ✅ |
| analytics | ✅ | ✅ | ✅ |
| api_call | ✅ | ✅ | ✅ |
| ai_prompt | ✅ | ✅ | ✅ |
| database_query | ✅ | ✅ | ✅ |
| script | ✅ | ✅ | ✅ |
| **whatsapp_template** | **✅ Official** | ❌ | ❌ |
| **interactive_buttons** | **✅ Official** | ❌ | ❌ |
| **interactive_list** | **✅ Official** | ❌ | ❌ |

---

## 🧪 Checklist Antes de Implementar em Produção

### Para Todos os Flows

- [ ] Start node definido
- [ ] End node definido (ou handoff final)
- [ ] Todas as variáveis usadas estão coletadas
- [ ] Condições têm branches true E false
- [ ] Sem loops infinitos
- [ ] Mensagens têm conteúdo
- [ ] Variáveis são substituídas com {{}}

### Se Usar API Call

- [ ] URL está validada
- [ ] Timeout é realista (não muito curto)
- [ ] Error handling definido
- [ ] Retries configurado
- [ ] API key guardada seguro (env var, não hardcoded)

### Se Usar WhatsApp Template

- [ ] Template aprovado pelo WhatsApp
- [ ] Conexão é Official API
- [ ] Parâmetros estão na ordem correta
- [ ] Dentro de 24h window

### Se Usar AI Prompt

- [ ] OpenAI API key está em .env
- [ ] Budget/quota definido
- [ ] Temperature apropriado (0.7 padrão)
- [ ] Max tokens não é muito alto
- [ ] Prompt está bem estruturado

### Se Usar Database Query

- [ ] ❌ **EVITAR** se possível (SQL injection risk)
- [ ] Usar parameterized queries (se usar)
- [ ] Tables whitelisted
- [ ] Query testada no DB
- [ ] Timeout configurado
- [ ] Sem DELETE statements

### Se Usar Script

- [ ] ❌ **EVITAR** (security risk)
- [ ] Se usar, revisar código cuidadosamente
- [ ] Sem imports de módulos externos
- [ ] Sem file system access
- [ ] Timeout implementado

---

## 🚀 Recomendações para Produção

### ✅ Safe Combination (Recomendado)

```
Start → Message → Question → Condition 
  ├─ True → Message → Handoff
  └─ False → Message → Action (webhook) → End
```

**Por quê?**: Todos os nodes são estáveis e testados

---

### ⚠️ Medium Risk (Com Cuidado)

```
Start → Question → API Call → Condition 
  ├─ Success → Message → End
  └─ Error → Message → Handoff
```

**Risco**: API Call pode timeout

---

### ❌ High Risk (Evitar)

```
Start → Script Node → Database Query → Message → End
```

**Riscos**:
- Script pode travar
- Database Query com SQL injection
- Sem error handling

---

## 📊 Node Stability Score

| Node | Score | Notas |
|------|-------|-------|
| message | 10/10 | Super estável |
| question | 9/10 | Timeout hardcoded |
| condition | 10/10 | Muito confiável |
| handoff | 9/10 | Funciona bem |
| delay | 9/10 | Max 60s é proteção boa |
| jump | 9/10 | Simples e eficiente |
| action | 9/10 | Muito usado |
| set_variable | 10/10 | Trivial, sem riscos |
| random | 10/10 | Simples e confiável |
| datetime | 9/10 | Bom para agendamentos |
| analytics | 9/10 | Rastreamento básico |
| api_call | 7/10 | Timeout é risco |
| whatsapp_template | 8/10 | Official API, complexo |
| interactive_buttons | 8/10 | Official API, bom UX |
| interactive_list | 8/10 | Official API, bom UX |
| ai_prompt | 6/10 | Custo + latência |
| database_query | 4/10 | SQL injection risk ⚠️ |
| script | 2/10 | Security risk ❌ |

---

## 🎓 Quick Reference

```python
# Safe nodes (use livremente)
safe_nodes = [
    "start", "message", "question", "condition",
    "handoff", "delay", "jump", "action",
    "set_variable", "random", "datetime", "analytics"
]

# Caution nodes (use com validação)
caution_nodes = [
    "api_call",  # Timeout risk
    "whatsapp_template",  # Setup complexo
    "interactive_buttons",  # Official only
    "interactive_list",  # Official only
    "ai_prompt"  # Custo + latência
]

# Avoid nodes (não use em produção)
avoid_nodes = [
    "database_query",  # SQL injection
    "script"  # Code execution
]
```

---

## ✅ Resumo Final

**Pergunta**: "Se eu implementar um chat real agora, vão funcionar?"

**Resposta**: 
- ✅ **12 nodes estão prontos** (message, question, condition, handoff, delay, jump, action, set_variable, random, datetime, analytics, start)
- ⚠️ **5 nodes funcionam mas com restrições** (api_call, whatsapp_template, interactive_buttons, interactive_list, ai_prompt)
- ❌ **2 nodes têm risco de segurança** (database_query, script)

**Recomendação**: Use os 12 "safe nodes" para 99% dos casos. Evite database_query e script em produção.

