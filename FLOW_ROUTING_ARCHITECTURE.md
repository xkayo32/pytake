# Arquitetura de Roteamento de Flows - PyTake

**Data:** 11 de Dezembro de 2025  
**Autor:** Kayo Carvalho Fernandes  
**Versão:** 1.0

---

## 📋 Visão Geral

Sistema de flows com dois modos de operação:

### 1. **Flow Padrão (PASSIVO)**
- Ativado automaticamente quando cliente envia mensagem
- Vinculado ao número de WhatsApp via `WhatsAppNumber.default_flow_id`
- Reativo: espera por mensagens do cliente
- **Trigger:** Webhook/API recebe mensagem → cria/busca Conversation → inicia default_flow

### 2. **Flows Ativos (PROATIVO)**
- Disparados via campaña, automação, webhook
- Reconhecem o número de origem via `Conversation.whatsapp_number_id`
- Podem fazer transições para outros flows
- **Trigger:** API/Automação → cria Conversation → inicia flow específico

---

## 🏗️ Componentes Necessários

### **1. Database Schema** ✅

```python
# WhatsAppNumber
- default_flow_id: UUID (FK → flows) # Flow padrão passivo

# Conversation
- active_flow_id: UUID (FK → flows)  # Flow ativo atual
- whatsapp_number_id: UUID (FK → whatsapp_numbers) # De qual número veio
- current_node_id: UUID (FK → nodes) # Node atual na execução
- is_bot_active: bool # Distingue bot vs humano
```

### **2. Node Types**

```jsonschema
{
  "type": "jump_to_flow",
  "data": {
    "target_flow_id": "uuid-do-flow-destino",
    "pass_variables": true,
    "preserve_context": true,
    "comment": "Transição para próximo flow"
  }
}
```

### **3. Flow Lifecycle**

```
┌─────────────────┐
│  Cliente envia  │
│    mensagem     │
└────────┬────────┘
         │
         ▼
┌──────────────────────────────────────┐
│ Webhook recebe + identifica número   │
│ GET whatsapp_number by phone_number  │
│ GET default_flow_id                  │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Cria/Busca Conversation             │
│  - whatsapp_number_id (X número)     │
│  - active_flow_id = default_flow_id  │
│  - current_node_id = start_node      │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│  Executa Flow A                      │
│  - Processa nodes sequencialmente    │
│  - Aguarda por inputs do cliente     │
└────────┬─────────────────────────────┘
         │
    ┌────┴────┐
    │ Jump?   │
    └────┬────┘
         │
    ┌────▼─────┐
    │Sim       │ Não
    │          │
    ▼          ▼
Atualize   Continua
active_flow em A
em Conversation
```

---

## 🔄 Exemplo: Transição Entre Flows

### **Cenário:**
- Cliente envia msg → Flow A iniciado (default_flow)
- Após colher dados, Flow A tem Node de transição
- Envia para Flow B (ativo)
- Flow B reconhece que veio de número X

### **Implementação:**

```python
# Node Jump em Flow A
{
  "type": "jump_to_flow",
  "data": {
    "target_flow_id": "uuid-flow-b",
    "pass_variables": {
      "customer_name": "{{variables.name}}",
      "customer_phone": "{{variables.phone}}"
    }
  }
}

# Ao executar jump:
# 1. Salvar variáveis locais
# 2. UPDATE conversation.active_flow_id = "uuid-flow-b"
# 3. UPDATE conversation.current_node_id = start_node_b
# 4. CONTINUE execução em Flow B
# 5. Flow B acessa whatsapp_number_id para contexto
```

---

## 📊 Schema Refinado

### **flows table** (já existe)
```sql
- id (PK)
- organization_id (FK)
- chatbot_id (FK)
- name
- description
- status: "draft" | "published" | "archived"
```

### **nodes table** (já existe)
```sql
- id (PK)
- flow_id (FK)
- node_id (string - React Flow ID)
- node_type: "start" | "message" | "question" | "condition" | "action" | "api_call" | "ai_prompt" | "jump_to_flow" | "end" | "handoff"
- data (JSONB) - Flexível por tipo
- position_x, position_y
- label
```

### **conversations table** (já existe)
```sql
- id (PK)
- organization_id (FK)
- contact_id (FK)
- whatsapp_number_id (FK) ✅ # Qual número recebeu/enviou
- active_flow_id (FK) ✅ # Flow ativo
- current_node_id (FK) ✅ # Node atual
- active_chatbot_id (FK)
- status: "open" | "active" | "queued" | "closed"
- is_bot_active (bool)
```

---

## 🚀 Implementação Necessária

### **Phase 1: Core (✅ COMPLETO)**
- ✅ WhatsAppNumber.default_flow_id
- ✅ Mutation: linkFlowToWhatsapp + unlinkFlowFromWhatsapp
- ✅ GraphQL: WhatsAppNumberType com defaultFlowId
- ✅ Migration: adicionado campo default_flow_id à tabela whatsapp_numbers
- **Commit:** 3a701a8

### **Phase 2: Webhook Handler (✅ COMPLETO)**
- ✅ Endpoint: `POST /api/v1/whatsapp/webhook` recebe mensagem
- ✅ Lógica: Identifica número → carrega default_flow → cria Conversation
- ✅ Inicia execução de Flow A (set current_node_id ao start node)
- ✅ Erro handling: non-blocking (flow init failure não quebra conversation)
- **Mudanças:**
  - `whatsapp_service.py`: `_process_incoming_message()` inicializa flow
  - Adiciona `active_flow_id` na criação de Conversation
  - Busca start node e seta `current_node_id`
- **Commit:** 6c22fac (mutations) + anteriores (webhook logic)

### **Phase 3: Flow Engine (✅ COMPLETO)**
- ✅ Node executor: Processa node_type "jump_to_flow"
- ✅ Transição: Atualiza active_flow_id em Conversation
- ✅ Context: Passa variáveis entre flows (com variable_mapping support)
- ✅ Implementação:
  - `flow_engine.py`: FlowEngineService com `execute_jump_to_flow()`
  - `node.py`: NodeRepository para acesso a nós
  - GraphQL mutation: `executeJumpToFlow(conversationId, nodeId)`
- ✅ Suporte a variable mapping com template expressions `{{var_name}}`
- **Commit:** d9c7026

### **Phase 4: GraphQL Mutations (✅ COMPLETO)**
- ✅ `activateFlowInConversation(conversationId, flowId)` - transição manual com auto-start node
- ✅ `deactivateFlowInConversation(conversationId)` - pausar/desativar flow (handoff para humano)
- ✅ `reopenConversation(conversationId)` - reabrir conversa fechada
- **Commit:** 6c22fac

---

## 📝 Observações Importantes

1. **Multi-tenancy:** Sempre filtrar por `organization_id`
2. **Isolamento:** Um flow não pode ser executado em outra organização
3. **Segurança:** Validar que `target_flow_id` pertence à mesma organização
4. **Performance:** Usar índices em `whatsapp_number_id`, `active_flow_id`, `current_node_id`

---

## ✅ Checklist de Validação

- [ ] WhatsAppNumber.default_flow_id existente
- [ ] Conversation.active_flow_id existente
- [ ] Conversation.whatsapp_number_id existente
- [ ] Webhook handler identifica número corretamente
- [ ] Node type "jump_to_flow" funcional
- [ ] Variáveis passam entre flows
- [ ] GraphQL mutations testadas
- [ ] REST endpoints testados
- [ ] Multi-tenancy validado

---

**Status:** Phase 3 ✅ Completo | Todas as Phases Implementadas 🎉  
**Próximo Passo:** REST Endpoints (opcional) ou testing & validação integrada
