# 🎯 RESUMO EXECUTIVO: SISTEMA DE FILAS - PYTAKE

**Data**: 17 de Janeiro de 2025  
**Análise Realizada Por**: Kayo Carvalho Fernandes  
**Status**: ✅ COMPLETO

---

## 📋 O QUE FOI ANALISADO?

**Pergunta do Usuário**: *"Como está implementado o sistema de filas quando enviamos um número através de fluxo?"*

**Resposta**: Uma análise completa de como conversas são roteadas de um fluxo (bot) para uma fila (agente humano), incluindo overflow, roteamento e atribuição de agentes.

---

## 🔴 PONTO CRÍTICO ENCONTRADO

### Quando Handoff Node é Acionado

```python
# Arquivo: backend/app/services/whatsapp_service.py
# Linhas: 961-1160 (_execute_handoff method)

# O QUE ACONTECE:
1. ✅ Envia mensagem ao cliente: "Transferindo para agente..."
2. ✅ Determina fila/depto/agente alvo
3. ✅ Atualiza conversation com queue_id
4. ✅ CRÍTICO: is_bot_active = FALSE  ← BOT DESATIVADO
5. ✅ CRÍTICO: status = "queued"      ← ENTRA NA FILA
6. ✅ Verifica overflow automático
7. ✅ Registra histórico de mudanças
```

---

## 🎨 3 CAMINHOS POSSÍVEIS

### Caminho 1: Handoff → FILA ESPECÍFICA

```
Fluxo → Handoff Node
        ├─ handoffType: "queue"
        ├─ queueId: UUID
        └─ priority: "high"
                  ↓
        ConversationService.assign_to_queue_with_overflow()
                  ↓
        Check: Queue cheia? (max_queue_size)
        SIM → Redireciona para overflow_queue_id
        NÃO → Mantém na fila original
                  ↓
        Conversa agora: status="queued", queue_id=UUID
        is_bot_active=FALSE ← Bot desativado
```

### Caminho 2: Handoff → DEPARTAMENTO

```
Fluxo → Handoff Node
        ├─ handoffType: "department"
        ├─ departmentId: UUID
        └─ priority: "normal"
                  ↓
        Buscar primeira FILA ATIVA do departamento
                  ↓
        Segue igual ao Caminho 1
```

### Caminho 3: Handoff → AGENTE DIRETO

```
Fluxo → Handoff Node
        ├─ handoffType: "agent"
        ├─ agentId: UUID
        └─ priority: "urgent"
                  ↓
        Atribuição IMEDIATA ao agente
        (sem fila)
                  ↓
        Conversa agora: status="active"
        assigned_agent_id=UUID ← Agente designado
        is_bot_active=FALSE
```

---

## 🔄 FLUXO DE EXECUÇÃO COMPLETO

```
┌──────────────────────────────────────────────────────┐
│ 1. WEBHOOK CHEGA (Meta Cloud API)                    │
│    ├─ Mensagem do cliente                            │
│    └─ Validação HMAC-SHA256                          │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│ 2. CONVERSATION CRIADA COM FLOW                       │
│    ├─ flow_id setado                                 │
│    ├─ is_bot_active = TRUE                           │
│    └─ Status = "active"                              │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│ 3. FLUXO EXECUTA (Bot responde)                      │
│    ├─ Nós: greeting, question, condition, etc       │
│    └─ Enquanto houver nós → continua                │
└─────────────────────┬────────────────────────────────┘
                      │
┌─────────────────────▼────────────────────────────────┐
│ 4. HANDOFF NODE ACIONADO                             │
│    ├─ Tipo: queue | department | agent               │
│    └─ Extrair configurações                          │
└─────────────────────┬────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   QUEUE         DEPARTMENT        AGENT
        │             │             │
        ▼             ▼             ▼
      UUID      Busca 1ª        UUID direto
      direto      ativa
                    │
                    └─→ Mesma fila
                         │
                         ▼
            ┌────────────────────────┐
            │ assign_to_queue_       │
            │ with_overflow()        │
            │                        │
            │ Queue cheia?           │
            │ SIM → overflow         │
            │ NÃO → mantém           │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ CONVERSA NA FILA       │
            │                        │
            │ status: "queued"       │
            │ queue_id: UUID         │
            │ is_bot_active: FALSE   │
            │ queued_at: datetime    │
            │ queue_priority: 50|80  │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ AGENTE PUXA DA FILA    │
            │ pull_from_queue()      │
            │                        │
            │ Filtros:               │
            │ ├─ allowed_agent_ids   │
            │ ├─ skills_required     │
            │ ├─ business_hours      │
            │ └─ agent_capacity      │
            └────────────┬───────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │ AGENTE ATIVO           │
            │                        │
            │ status: "active"       │
            │ assigned_agent_id: UUID│
            │ queued_at: NULL        │
            │ Agent responde direto  │
            └────────────────────────┘
```

---

## 📊 ESTRUTURA DE DADOS

### Queue (Fila)

```python
Queue {
    id: UUID
    organization_id: UUID
    department_id: UUID
    
    # Identidade
    name: str              # "Suporte"
    slug: str              # "suporte"
    is_active: bool
    priority: int          # 0-100
    
    # Capacidade
    max_queue_size: int    # Max conversas na fila
    overflow_queue_id: UUID  # Para quando cheia
    max_conversations_per_agent: int  # Limite por agente
    
    # Roteamento
    routing_mode: str      # round_robin|load_balance|manual|skills_based
    auto_assign_conversations: bool
    
    # SLA
    sla_minutes: int       # Max tempo de espera
    
    # Estatísticas
    queued_conversations: int
    average_wait_time_seconds: int
    customer_satisfaction_score: int
    
    # Advanced
    settings: dict         # {"allowed_agent_ids": [...], "skills_required": [...]}
}
```

### Conversation (em Fila)

```python
Conversation {
    id: UUID
    contact_id: UUID
    flow_id: UUID
    
    # Estado
    status: str            # "queued" ou "active"
    is_bot_active: bool    # FALSE após handoff
    
    # Fila
    queue_id: UUID         # Qual fila?
    queue_priority: int    # 10|50|80|100
    queued_at: datetime    # Quando entrou
    
    # Agente
    assigned_agent_id: UUID  # Quem vai atender?
    assigned_at: datetime    # Quando foi atribuída
    
    # Contexto
    extra_data: dict {
        "handoff_context": "Cliente VIP...",
        "overflow_history": [
            {
                "original_queue_id": "uuid",
                "overflow_queue_id": "uuid",
                "overflowed_at": "2025-01-17T14:30:00"
            }
        ]
    }
}
```

---

## 🎯 ROUTING MODES (Modos de Distribuição)

| Mode | Descrição | Como Funciona |
|------|-----------|---------------|
| **Round-Robin** | Cíclico | Cada agente recebe conversas sequencialmente |
| **Load-Balance** | Menos carregado | Sistema escolhe agente com menos conversas |
| **Manual** | Manual | Agente escolhe qual conversa puxar |
| **Skills-Based** | Por habilidades | Só agentes com skills requeridas conseguem puxar |

---

## 🔄 LÓGICA DE OVERFLOW (Proteção contra Fila Cheia)

```
Queue tem 50 conversas, max_queue_size = 50
Nova conversa chega

┌─ Checa: queue.queued_conversations (50) >= max_size (50)?
│  ├─ SIM: Fila está CHEIA
│  │        Checa: overflow_queue_id configurado?
│  │        ├─ SIM: overflow_queue tem espaço?
│  │        │       ├─ SIM: REDIRECIONA para overflow
│  │        │       └─ NÃO: Coloca na fila original (exceção)
│  │        └─ NÃO: Coloca na fila original (sem overflow)
│  │
│  └─ NÃO: Espaço disponível → Coloca na fila
│
└─ Record: Se overflow → Log em extra_data["overflow_history"]
```

---

## 🎭 PULL FROM QUEUE (Como Agente Pega Conversa)

**Ordem de Processamento:**

```
1. Ordenar por: priority DESC, queued_at ASC
   (altas prioridades e mais antigas primeiro)

2. Para cada conversa:
   ├─ Filtro 1: allowed_agent_ids (agente está permitido?)
   ├─ Filtro 2: skills_required (agente tem skills?)
   ├─ Filtro 3: business_hours (fila está aberta?)
   ├─ Filtro 4: agent_capacity (agente não está cheio?)
   │
   └─ Se PASSOU em todos → Retorna esta conversa
                            (remove da fila, atribui agente)

3. Se nenhuma passou → Retorna NULL (sem conversa disponível)
```

---

## 📈 MÉTRICAS & MONITORAMENTO

```json
{
  "queue_id": "uuid",
  "queue_name": "Suporte",
  
  // Volume
  "total_conversations_30d": 350,
  "queued_conversations": 12,
  "active_conversations": 8,
  
  // Performance
  "average_wait_time_seconds": 450,
  "average_response_time_seconds": 120,
  "average_resolution_time_seconds": 1800,
  
  // SLA
  "sla_violations": 5,
  "sla_violation_rate": 1.4,
  
  // Overflow
  "overflow_events": 3,
  "overflow_rate": 0.9,
  
  // Satisfação
  "customer_satisfaction_score": 4.5
}
```

---

## 🔧 ARQUIVOS-CHAVE DO CÓDIGO

| Arquivo | Função |
|---------|--------|
| `backend/app/services/whatsapp_service.py` | Executar handoff, gerenciar estados |
| `backend/app/services/conversation_service.py` | Atribuir à fila, pull, overflow |
| `backend/app/repositories/queue.py` | Queries de fila (read/write) |
| `backend/app/models/queue.py` | Modelo Queue (schema) |
| `backend/app/models/conversation.py` | Modelo Conversation (schema) |

**Linhas Principais:**
- `_execute_handoff()`: 961-1160 em whatsapp_service.py
- `assign_to_queue_with_overflow()`: 647-685 em conversation_service.py
- `pull_from_queue()`: 279-330 em conversation_service.py
- `check_and_apply_overflow()`: 513-543 em conversation_service.py

---

## ✅ CHECKLIST: COMO USAR

- [ ] **Criar Queue**: `POST /api/v1/queues` com configurações (routing_mode, max_size, etc)
- [ ] **Criar Flow**: Com Handoff Node configurado para a queue
- [ ] **Disparar Flow**: Via webhook ou Flow Automation
- [ ] **Agente puxa**: `POST /api/v1/queue/pull` para receber conversa
- [ ] **Monitorar**: `GET /api/v1/queues/{queue_id}/metrics` para métricas
- [ ] **Testar Overflow**: Enviar mais de max_queue_size conversas

---

## 🚀 PRÓXIMOS PASSOS

1. **Implementar Skills-Based Routing Automático**
   - Atualmente manual, poderia ser automático
   - Arquivo: conversation_service.py

2. **Auto-Assignment com Load Balancing**
   - Sistema poderia automaticamente distribuir quando agente fica livre
   - Implementação via Celery task

3. **Métricas em Tempo Real**
   - WebSocket para atualizações live de fila
   - Dashboard mostrando agentes e conversas

4. **Escalation Automática**
   - Se conversa no SLA há muito tempo → escalate
   - File: conversation_service.py (novo método)

---

## 📚 DOCUMENTAÇÃO GERADA

3 documentos criados durante análise:

1. **QUEUE_SYSTEM_ANALYSIS.md** (este repo root)
   - Análise técnica completa de 600+ linhas
   - 3 caminhos do handoff (queue, dept, agent)
   - Lógica de overflow detalhada
   - Estrutura de dados completa

2. **docs/QUEUE_SYSTEM_DIAGRAMS.md**
   - 7 diagramas ASCII visuais
   - Flow completo webhook → fila → agente
   - Decisão de overflow passo-a-passo
   - Estados da conversa

3. **docs/QUEUE_SYSTEM_PRACTICAL_GUIDE.md**
   - 8 exemplos práticos de código
   - Cenários reais de implementação
   - Testes com curl
   - Troubleshooting

---

## 🎓 RESUMO

| Aspecto | Resposta |
|--------|----------|
| **Como número entra na fila?** | Handoff Node → assign_to_queue_with_overflow() |
| **Bot é desativado?** | Sim, `is_bot_active = False` após handoff |
| **E se fila está cheia?** | Overflow automático para overflow_queue_id |
| **Como agente pega conversa?** | pull_from_queue() com filtros de skills/capacidade |
| **Contexto do fluxo fica?** | Sim, em `extra_data["handoff_context"]` |
| **SLA é monitorado?** | Sim, sla_minutes define limite |
| **Suporta múltiplos roteamentos?** | Sim, 4 modes (round_robin, load_balance, manual, skills_based) |

---

**Análise Completa!** 🎉

Todos os documentos salvos em:
- `/home/administrator/pytake/QUEUE_SYSTEM_ANALYSIS.md` (root)
- `/home/administrator/pytake/docs/QUEUE_SYSTEM_DIAGRAMS.md`
- `/home/administrator/pytake/docs/QUEUE_SYSTEM_PRACTICAL_GUIDE.md`
