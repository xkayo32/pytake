# 📚 GUIA PRÁTICO: IMPLEMENTANDO FILAS EM FLUXOS

---

## 1. EXEMPLO REAL: FLOW AUTOMATION COM HANDOFF PARA FILA

### Cenário
Uma empresa de telecom quer:
1. Enviar mensagem automática para 100 clientes
2. Coletar feedback com um fluxo
3. Se positivo: termina
4. Se negativo: coloca em fila de suporte

### Fluxo Canvas (React Flow JSON)

```json
{
  "nodes": [
    {
      "id": "start",
      "type": "start",
      "position": { "x": 0, "y": 0 },
      "data": { "label": "START" }
    },
    {
      "id": "greeting",
      "type": "text",
      "position": { "x": 200, "y": 0 },
      "data": {
        "text": "Olá! Como foi sua experiência com nosso serviço?",
        "delay": 1000
      }
    },
    {
      "id": "feedback_question",
      "type": "question",
      "position": { "x": 400, "y": 0 },
      "data": {
        "question": "Você está satisfeito?",
        "responseType": "options",
        "options": [
          { "value": "sim", "label": "Sim, tudo ótimo! 😊" },
          { "value": "nao", "label": "Não, tive problemas 😞" }
        ]
      }
    },
    {
      "id": "condition_satisfaction",
      "type": "condition",
      "position": { "x": 600, "y": 0 },
      "data": {
        "condition": "response == 'sim'",
        "trueNodeId": "end_satisfied",
        "falseNodeId": "handoff_queue"
      }
    },
    {
      "id": "handoff_queue",
      "type": "handoff",
      "position": { "x": 600, "y": 150 },
      "data": {
        "handoffType": "queue",                          // ← TIPO: FILA
        "queueId": "550e8400-e29b-41d4-a716-446655440000",
        "priority": "high",                              // ← CLIENTE INSATISFEITO = ALTA PRIORIDADE
        "contextMessage": "Cliente insatisfeito com serviço. Precisa de atendimento imediato.",
        "sendTransferMessage": true,
        "transferMessage": "Desculpe ouvir isso! Vou conectar você com um agente especializado para resolver seu problema. Por favor, aguarde..."
      }
    },
    {
      "id": "end_satisfied",
      "type": "end",
      "position": { "x": 800, "y": 0 },
      "data": { "label": "END - Satisfeito" }
    }
  ],
  "edges": [
    { "source": "start", "target": "greeting" },
    { "source": "greeting", "target": "feedback_question" },
    { "source": "feedback_question", "target": "condition_satisfaction" },
    { "source": "condition_satisfaction", "target": "end_satisfied", "label": "true" },
    { "source": "condition_satisfaction", "target": "handoff_queue", "label": "false" }
  ]
}
```

### Fluxo de Execução

```python
# 1. Flow Automation é disparada
execution = FlowAutomationExecution(
    automation_id="automation-123",
    recipients=[
        FlowAutomationRecipient(contact_id="contact-1", variables={}),
        FlowAutomationRecipient(contact_id="contact-2", variables={}),
        # ... 100 recipients
    ],
    status="queued"
)

# 2. Para cada recipient, processo paralelo
async def _process_recipient_async(execution_id, recipient_id, ...):
    # Pega contact
    contact = Contact(whatsapp_id="+5511987654321")
    
    # Cria conversa
    conversation = Conversation(
        contact_id=contact.id,
        flow_id="flow-feedback",  # Nosso fluxo de feedback
        status="active",
        is_bot_active=True,
        initiated_by="automation"
    )
    
    # Executa fluxo
    await whatsapp_service.execute_flow(
        conversation=conversation,
        flow=flow,
        current_node=start_node
    )
    
    # 3. Bot executa: greeting → question → condition
    # Cliente responde "Não, tive problemas"
    
    # 4. Condição é FALSE, vai para handoff_queue
    # _execute_node(handoff_node) é acionado
    await whatsapp_service._execute_handoff(
        conversation=conversation,
        node_data={
            "handoffType": "queue",
            "queueId": "550e8400-e29b-41d4-a716-446655440000",  # Suporte
            "priority": "high",
            "contextMessage": "Cliente insatisfeito...",
            "sendTransferMessage": True,
            "transferMessage": "Desculpe ouvir isso!..."
        }
    )

# 5. _execute_handoff faz:
# ├─ Envia mensagem: "Desculpe ouvir isso!..."
# ├─ Chamada: ConversationService.assign_to_queue_with_overflow()
# │  ├─ Checa: Queue.queued_conversations (10) < max_queue_size (50)? ✓
# │  ├─ Sem overflow
# │  └─ final_queue_id = "550e8400-e29b-41d4-a716-446655440000"
# │
# └─ Atualiza Conversation:
#    ├─ status = "queued"
#    ├─ queue_id = "550e8400-e29b-41d4-a716-446655440000"
#    ├─ queue_priority = 80  (high)
#    ├─ is_bot_active = FALSE  ← Bot desativado
#    └─ extra_data.handoff_context = "Cliente insatisfeito..."

# 6. Conversa agora está NA FILA DE SUPORTE
# Status no banco: queue_id = "suporte", status = "queued"

# 7. Agentes veem a fila:
agents_queue = await conversation_service.get_queue(
    organization_id=org_id,
    queue_id="550e8400-e29b-41d4-a716-446655440000"
)
# Retorna: [
#   {contact: "João Silva", priority: 80, queued_at: "2025-01-17T14:30:00", ...},
#   {contact: "Maria Santos", priority: 50, queued_at: "2025-01-17T14:31:00", ...},
#   ...
# ]

# 8. Agente de suporte puxa da fila
conversation = await conversation_service.pull_from_queue(
    organization_id=org_id,
    agent_id="agentA_uuid",
    queue_id="550e8400-e29b-41d4-a716-446655440000"
)

# Conversa agora: assigned_agent_id = "agentA_uuid", status = "active"
# Agente vê contexto: extra_data.handoff_context = "Cliente insatisfeito..."
# Agente responde ao cliente (direto, sem bot)
```

---

## 2. EXEMPLO: HANDOFF PARA DEPARTAMENTO

Você tem departamentos e quer rotear para o primeiro agente disponível:

### Configuração da Fila

```json
// Backend: POST /api/v1/queues

{
  "department_id": "dept-support-uuid",
  "name": "Atendimento - Fila Principal",
  "slug": "atendimento-principal",
  "description": "Fila padrão do departamento de suporte",
  "priority": 50,
  "routing_mode": "round_robin",
  "max_conversations_per_agent": 10,
  "max_queue_size": 100,
  "overflow_queue_id": "overflow-queue-uuid",
  "sla_minutes": 15,
  "is_active": true,
  "settings": {
    "business_hours": {
      "timezone": "America/Sao_Paulo",
      "schedule": {
        "monday": {
          "enabled": true,
          "start": "09:00",
          "end": "18:00"
        },
        "tuesday": {
          "enabled": true,
          "start": "09:00",
          "end": "18:00"
        },
        // ... rest of week
        "saturday": { "enabled": false },
        "sunday": { "enabled": false }
      }
    }
  }
}
```

### Fluxo com Handoff para Departamento

```json
{
  "nodes": [
    // ... (outros nós)
    {
      "id": "need_human",
      "type": "condition",
      "data": {
        "condition": "user_wants_human",
        "trueNodeId": "handoff_dept",
        "falseNodeId": "bot_help"
      }
    },
    {
      "id": "handoff_dept",
      "type": "handoff",
      "data": {
        "handoffType": "department",  // ← PARA DEPARTAMENTO
        "departmentId": "dept-support-uuid",
        "priority": "normal",
        "contextMessage": "Cliente solicitou conversa com agente",
        "sendTransferMessage": true,
        "transferMessage": "Vou conectar você com um agente da nossa equipe de suporte..."
      }
    }
  ]
}
```

### Código de Execução

```python
# Quando handoff é acionado:

async def _execute_handoff(self, conversation, node_data):
    handoff_type = node_data.get("handoffType")  # "department"
    department_id = node_data.get("departmentId")  # "dept-support-uuid"
    
    if handoff_type == "department" and department_id:
        # 1. Buscar primeira FILA ATIVA do departamento
        queue_repo = QueueRepository(self.db)
        queues = await queue_repo.list_queues(
            organization_id=conversation.organization_id,
            department_id=UUID(department_id),
            is_active=True,
            limit=1  # Só a primeira (mais prioritária)
        )
        
        if queues and len(queues) > 0:
            final_queue_id = queues[0].id  # Pega a fila principal
            # Continua igual a handoff para queue...
            await conv_service.assign_to_queue_with_overflow(
                conversation_id=conversation.id,
                queue_id=final_queue_id,
                organization_id=conversation.organization_id
            )
        else:
            logger.warning(f"Nenhuma fila ativa em depto {department_id}")
            # Coloca em queued genérico ou retorna erro
```

**Resultado**: Conversa é automaticamente colocada na fila principal do departamento de suporte!

---

## 3. EXEMPLO: HANDOFF DIRETO PARA AGENTE ESPECÍFICO

Para casos onde você quer pré-designar um agente (e.g., agente VIP):

### Fluxo

```json
{
  "id": "handoff_vip_agent",
  "type": "handoff",
  "data": {
    "handoffType": "agent",        // ← DIRETO PARA AGENTE
    "agentId": "agent-vip-uuid",   // UUID específico do agente
    "priority": "urgent",
    "contextMessage": "Cliente VIP - Tratamento especial",
    "sendTransferMessage": true,
    "transferMessage": "Vou conectar você com nosso especialista em VIP..."
  }
}
```

### Código

```python
# Execução:

if handoff_type == "agent" and agent_id:
    # Atribuição DIRETA (sem fila)
    final_agent_id = UUID(agent_id) if isinstance(agent_id, str) else agent_id
    
    await conv_repo.update(conversation.id, {
        "is_bot_active": False,           # Bot off
        "status": "active",               # Status ativo imediatamente
        "current_agent_id": final_agent_id,  # Agente designado
        "queued_at": None,                # Sem espera em fila
        "queue_priority": priority_map[priority]
    })

# Resultado:
# - Conversa NÃO vai para fila
# - Agente recebe imediatamente (se online)
# - Se agente offline, fica "aguardando agente online"
```

---

## 4. CENÁRIO: TRATAMENTO DE OVERFLOW

Sua empresa pode estar sobrecarregada. Como o sistema se comporta?

### Configuração

```python
# Queue Suporte Nível 1
queue_1 = Queue(
    name="Suporte - Nível 1",
    department_id="dept-support",
    max_queue_size=50,          # Limite: 50 conversas
    overflow_queue_id="queue_2_uuid",  # Overflow para Nível 2
    routing_mode="round_robin"
)

# Queue Suporte Nível 2 (Especialistas)
queue_2 = Queue(
    name="Suporte - Nível 2",
    department_id="dept-support",
    max_queue_size=30,          # Limite: 30 conversas
    overflow_queue_id=None,     # Fim da linha (última fila)
    routing_mode="round_robin"
)
```

### Simulação de 100 entradas

```python
# Momento 1: Conversas 1-50 entram
# Queue 1 tem capacity (0 + 1-50 = 50 < max 50) ✓
# Todas vão para Queue 1

# Momento 2: Conversa 51 chega
# Queue 1 está CHEIA (50 >= 50) ← Overflow acionado!
# Check overflow_queue: Queue 2 tem 0 < max 30 ✓
# Conversa 51 vai para Queue 2 (overflow)

# Momento 3: Conversas 52-80 chegam
# Queue 1 ainda CHEIA → Verificar Queue 2
# Queue 2 tem capacity (1 + 52-80 = 29 < max 30) ✓
# Vão para Queue 2

# Momento 4: Conversa 81 chega
# Queue 1: CHEIA (50 >= 50) → overflow para Queue 2? 
# Queue 2: CHEIA (30 >= 30) → Ambas cheias!
# Proteção contra loop infinito:
#   if not overflow_queue.max_queue_size or \
#      overflow_queue.queued_conversations < overflow_queue.max_queue_size:
#       return overflow_queue_id
#   → Retorna None
# Conversa 81 vai para Queue 1 mesmo (overflow inválido)

# Resultado FINAL:
# Queue 1: 50 + conversas 51+ que não couberam em Queue 2 = 51 conversas
# Queue 2: 30 conversas (cheia)
# Total: 81 conversas na fila, ambas acima do limite!

# Registro no extra_data:
conversation_81.extra_data = {
    "overflow_history": [
        {
            "original_queue_id": "queue_1_uuid",
            "overflow_queue_id": "queue_2_uuid",
            "overflowed_at": "2025-01-17T15:00:00",
            "status": "overflow_attempted_but_target_full"
        }
    ]
}
```

---

## 5. CÓDIGO REAL: CRIAR FLOW COM HANDOFF

### Endpoint: POST /api/v1/flows

```bash
curl -X POST http://localhost:8000/api/v1/flows \
  -H "Authorization: Bearer <seu_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Feedback com Handoff",
    "chatbot_id": "chatbot-uuid",
    "description": "Coleta feedback e roteia para suporte se negativo",
    "flow_data": {
      "nodes": [
        {
          "id": "start",
          "type": "start",
          "position": { "x": 0, "y": 0 },
          "data": { "label": "START" }
        },
        {
          "id": "greeting",
          "type": "text",
          "position": { "x": 200, "y": 0 },
          "data": {
            "text": "Qual sua avaliação?"
          }
        },
        {
          "id": "question",
          "type": "question",
          "position": { "x": 400, "y": 0 },
          "data": {
            "question": "Você recomendaria nosso serviço?",
            "responseType": "options",
            "options": [
              {"value": "sim", "label": "Sim"},
              {"value": "nao", "label": "Não"}
            ]
          }
        },
        {
          "id": "condition",
          "type": "condition",
          "position": { "x": 600, "y": 0 },
          "data": {
            "condition": "response == '\''sim'\''",
            "trueNodeId": "end",
            "falseNodeId": "handoff"
          }
        },
        {
          "id": "handoff",
          "type": "handoff",
          "position": { "x": 600, "y": 150 },
          "data": {
            "handoffType": "queue",
            "queueId": "550e8400-e29b-41d4-a716-446655440000",
            "priority": "high",
            "contextMessage": "Cliente insatisfeito",
            "sendTransferMessage": true,
            "transferMessage": "Conectando com agente especializado..."
          }
        },
        {
          "id": "end",
          "type": "end",
          "position": { "x": 800, "y": 0 },
          "data": { "label": "END" }
        }
      ],
      "edges": [
        {"source": "start", "target": "greeting"},
        {"source": "greeting", "target": "question"},
        {"source": "question", "target": "condition"},
        {"source": "condition", "target": "end", "label": "true"},
        {"source": "condition", "target": "handoff", "label": "false"}
      ]
    }
  }'
```

### Response

```json
{
  "id": "flow-uuid-123",
  "name": "Feedback com Handoff",
  "status": "active",
  "created_at": "2025-01-17T14:00:00",
  "flow_data": { ... }
}
```

---

## 6. TESTAR LOCALMENTE

### 1. Criar Queue

```bash
curl -X POST http://localhost:8000/api/v1/queues \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "department_id": "dept-uuid",
    "name": "Teste Queue",
    "slug": "teste-queue",
    "routing_mode": "round_robin",
    "max_conversations_per_agent": 5,
    "max_queue_size": 20
  }'
```

**Response:**
```json
{
  "id": "queue-uuid-456",
  "name": "Teste Queue",
  "max_queue_size": 20,
  "queued_conversations": 0
}
```

### 2. Criar Flow com Handoff

(Use o endpoint acima)

### 3. Enviar mensagem (webhook mock)

```bash
curl -X POST http://localhost:8000/api/v1/webhooks/meta \
  -H "X-Hub-Signature-256: sha256=xxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "entry-id",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "5511987654321",
            "phone_number_id": "phone-uuid"
          },
          "messages": [{
            "from": "5511987654322",
            "id": "msg-id",
            "timestamp": "1234567890",
            "text": { "body": "Sim" },
            "type": "text"
          }]
        }
      }]
    }]
  }'
```

### 4. Verificar Conversa na Fila

```bash
curl http://localhost:8000/api/v1/queue?queue_id=queue-uuid-456 \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "conversation-uuid",
    "contact_name": "Cliente Teste",
    "contact_whatsapp_id": "5511987654322",
    "status": "queued",
    "queue_priority": 80,
    "queued_at": "2025-01-17T15:30:00",
    "time_in_queue_seconds": 120,
    "extra_data": {
      "handoff_context": "Cliente insatisfeito"
    }
  }
]
```

### 5. Agente Puxa da Fila

```bash
curl -X POST http://localhost:8000/api/v1/queue/pull \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"queue_id": "queue-uuid-456"}'
```

**Response:**
```json
{
  "id": "conversation-uuid",
  "status": "active",
  "assigned_agent_id": "agent-uuid",
  "assigned_at": "2025-01-17T15:32:00",
  "extra_data": {
    "handoff_context": "Cliente insatisfeito"
  }
}
```

### 6. Agente Envia Mensagem

```bash
curl -X POST http://localhost:8000/api/v1/conversations/conversation-uuid/messages \
  -H "Authorization: Bearer $AGENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Olá! Sinto muito pelo inconveniente. Como posso ajudar?",
    "direction": "outbound"
  }'
```

---

## 7. MONITORAR FILAS

### Obter Métricas

```bash
curl http://localhost:8000/api/v1/queues/queue-uuid/metrics \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "queue_id": "queue-uuid",
  "queue_name": "Teste Queue",
  "total_conversations_30d": 150,
  "queued_conversations": 5,
  "active_conversations": 8,
  "average_wait_time_seconds": 420,
  "sla_violations": 2,
  "overflow_events": 1,
  "overflow_rate": 0.67,
  "customer_satisfaction_score": 4.3,
  "volume_by_hour": [
    {"hour": 9, "count": 15},
    {"hour": 10, "count": 22},
    {"hour": 11, "count": 18}
  ]
}
```

---

## 8. TROUBLESHOOTING

### Problema 1: Conversa não aparece em fila

**Possíveis causas:**
```python
# 1. is_bot_active ainda é TRUE
conversation.is_bot_active = True  # ❌ Bot não foi desativado!

# Solução: Verificar se _execute_handoff() foi chamado realmente
# No log: "👤 Executando handoff para conversa {conversation.id}"?

# 2. queue_id é NULL
conversation.queue_id = None  # ❌ Não foi assignada à fila

# Solução: Verificar se queue UUID é válido
# Endpoint: GET /api/v1/queues/{queue_id}

# 3. status não é "queued"
conversation.status = "active"  # ❌ Status errado

# Solução: Deve ser "queued" após handoff
# Check em: ConversationRepository.update()
```

### Problema 2: Agente não consegue puxar

**Possíveis causas:**
```python
# 1. Agent não tem skill requerida
queue.settings["skills_required"] = ["billing", "english"]
agent.skills = ["suporte"]  # ❌ Incompleto

# Solução: Adicionar skill ao agente
# POST /api/v1/agents/{agent_id}/skills

# 2. Agent não está na whitelist
queue.settings["allowed_agent_ids"] = ["agentB", "agentC"]
agent_id = "agentA"  # ❌ Não está na lista

# Solução: Adicionar agente à fila
# PUT /api/v1/queues/{queue_id} com allowed_agent_ids atualizada

# 3. Fila está fora do horário comercial
queue.settings["business_hours"]["schedule"]["friday"]["enabled"] = False
current_time = "14:00 friday"  # ❌ Fila fechada na sexta

# Solução: Ajustar business_hours ou criar fila sem restrição

# 4. Agent atingiu capacidade máxima
max_conversations_per_agent = 10
agent.current_conversations = 10  # ❌ Agent cheio

# Solução: Aguardar agente fechar conversas ou aumentar limite
```

### Problema 3: Overflow não está funcionando

**Possíveis causas:**
```python
# 1. overflow_queue_id não configurado
queue.overflow_queue_id = None  # ❌ Sem overflow

# Solução: Configurar overflow_queue_id na queue
# PUT /api/v1/queues/{queue_id} {"overflow_queue_id": "uuid"}

# 2. max_queue_size não definido
queue.max_queue_size = None  # ❌ Sem limite, sem overflow

# Solução: Definir max_queue_size
# PUT /api/v1/queues/{queue_id} {"max_queue_size": 50}

# 3. Overflow queue também está cheia
overflow_queue.queued_conversations >= overflow_queue.max_queue_size

# Solução: Aumentar max_queue_size da overflow queue
#        ou criar mais níveis de overflow
```

---

**Guia prático completo!** 🚀
