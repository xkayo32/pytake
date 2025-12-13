# 🧠 QUEUE SYSTEM - KNOWLEDGE PARA BRAIN (MCP Agent Brain)

**Tipo**: Architecture Pattern + Data Models  
**Reutilizabilidade**: Alta (padrão genérico)  
**Tags**: queue, handoff, routing, multi-tenant, overflow, agent-assignment  

---

## 📌 PADRÃO 1: HANDOFF - 3 CAMINHOS

**Contexto**: Quando conversa em fluxo precisa sair do bot para agente humano.

**3 Caminhos**:

### Path A: Handoff para QUEUE (Fila Específica)
```
Config: {handoffType: "queue", queueId: UUID, priority: int}
Result: Conversa fica status="queued", aguarda agente puxar
Use Case: Fila genérica, sem depto pré-definido
```

### Path B: Handoff para DEPARTMENT
```
Config: {handoffType: "department", departmentId: UUID}
Result: Sistema busca 1ª fila ativa do depto, coloca lá
Use Case: Roteamento automático por departamento
```

### Path C: Handoff para AGENT (Direto)
```
Config: {handoffType: "agent", agentId: UUID}
Result: Conversa status="active" já com agente atribuído
Use Case: VIP/Escalação, sem fila
```

---

## 📌 PADRÃO 2: CONVERSATION STATE TRANSITIONS

**Estados Críticos**:

```
INITIAL (Bot Executando)
├─ status: "active"
├─ is_bot_active: TRUE
└─ queue_id: NULL

APÓS HANDOFF (Esperando Agente)
├─ status: "queued"
├─ is_bot_active: FALSE ← CRÍTICO
├─ queue_id: UUID
├─ queue_priority: int (10|50|80|100)
└─ queued_at: datetime

APÓS AGENTE PUXAR (Ativo com Agente)
├─ status: "active"
├─ assigned_agent_id: UUID
├─ assigned_at: datetime
└─ queued_at: NULL
```

---

## 📌 PADRÃO 3: OVERFLOW AUTOMÁTICO

**Quando**: Conversa entra em fila que está cheia

**Verificação**:
```
IF queue.queued_conversations >= queue.max_queue_size:
   IF queue.overflow_queue_id EXISTS AND has_capacity:
      REDIRECT to overflow_queue_id
      RECORD in extra_data["overflow_history"]
   ELSE:
      KEEP in original queue
```

**Proteção**: Evita loop infinito verificando capacidade da overflow queue também.

---

## 📌 PADRÃO 4: PULL FROM QUEUE - 5 FILTROS

**Ordem**:
```
1. Ordenar: priority DESC, queued_at ASC
2. Para cada conversa, verificar:
   ├─ Filtro 1: allowed_agent_ids (agent está na whitelist?)
   ├─ Filtro 2: skills_required (agent tem TODAS skills?)
   ├─ Filtro 3: business_hours (queue está aberta?)
   ├─ Filtro 4: agent_capacity (agent < max_conversations?)
   └─ Return: primeira que PASSOU em TODOS
3. Se nenhuma: return NULL
```

**Padrão**: Cascata de AND filters, não OR.

---

## 📌 PADRÃO 5: ROUTING MODES

| Mode | Distribuição | Implementação |
|------|--------------|---------------|
| **Round-Robin** | Sequencial por agente | Simples, cycling |
| **Load-Balance** | Agente menos carregado | Count active convs |
| **Manual** | Agente escolhe | Cliente selecta queue |
| **Skills-Based** | Só com skills requeridas | Filtro em pull |

---

## 📊 DATA MODELS

### QUEUE
```
{
  id: UUID
  organization_id: UUID (multi-tenant)
  department_id: UUID
  
  name: string
  routing_mode: "round_robin" | "load_balance" | "manual" | "skills_based"
  max_queue_size: int? (NULL = sem limite)
  overflow_queue_id: UUID? (para quando cheia)
  max_conversations_per_agent: int
  sla_minutes: int?
  
  settings: JSONB {
    allowed_agent_ids?: [UUID],
    skills_required?: [string],
    business_hours?: {
      timezone: string,
      schedule: {
        monday: {enabled: bool, start: "HH:MM", end: "HH:MM"}
        // ...
      }
    }
  }
  
  // Stats
  queued_conversations: int
  average_wait_time_seconds: int?
}
```

### CONVERSATION (após handoff)
```
{
  id: UUID
  organization_id: UUID (multi-tenant)
  flow_id: UUID
  
  status: "queued" | "active"
  is_bot_active: boolean (FALSE após handoff)
  
  queue_id: UUID?
  queue_priority: int (10|50|80|100)
  queued_at: datetime?
  
  assigned_agent_id: UUID?
  assigned_at: datetime?
  
  extra_data: {
    handoff_context?: string,
    overflow_history?: [
      {
        original_queue_id: UUID,
        overflow_queue_id: UUID,
        overflowed_at: ISO8601
      }
    ]
  }
}
```

---

## 🔑 KEY METHODS (Padrões de Código)

### Padrão: assign_to_queue_with_overflow()
```python
async def assign_to_queue_with_overflow(
    conversation_id: UUID,
    queue_id: UUID,
    organization_id: UUID
) -> Conversation:
    # 1. Check overflow
    overflow_target = await check_and_apply_overflow(queue_id, org_id)
    final_queue_id = overflow_target or queue_id
    
    # 2. Update conversation
    return await repo.update(conversation_id, {
        "queue_id": final_queue_id,
        "status": "queued",
        "is_bot_active": False,
        "queued_at": datetime.utcnow(),
        "extra_data": {
            ...existing,
            "overflow_history": [...] if overflow_target else [...]
        }
    })
```

### Padrão: pull_from_queue() com Filtros
```python
async def pull_from_queue(
    agent_id: UUID,
    queue_id: UUID
) -> Optional[Conversation]:
    # 1. Query com ordem
    convs = select(Conversation)
        .where(status=="queued", queue_id==queue_id)
        .order_by(queue_priority.desc(), queued_at.asc())
    
    # 2. Cascata de filtros
    for conv in convs:
        queue = get_queue(conv.queue_id)
        
        # Filtro 1: allowed_agent_ids
        if queue.settings.allowed_agent_ids:
            if str(agent_id) not in allowed_agent_ids:
                continue
        
        # Filtro 2: skills_required
        if queue.settings.skills_required:
            agent_skills = get_agent_skills(agent_id)
            if not required_skills.issubset(agent_skills):
                continue
        
        # Filtro 3: business_hours
        if not is_within_business_hours(queue):
            continue
        
        # Filtro 4: agent_capacity
        if count_agent_conversations(agent_id) >= max_per_agent:
            continue
        
        # PASSOU: Retornar e atribuir
        return assign_to_agent(conv, agent_id)
    
    # Nenhuma passou
    return None
```

---

## 💡 DECISÃO DE DESIGN

**Por que 3 caminhos diferentes?**
- **Queue**: Máxima flexibilidade (depto dinamicamente roteável)
- **Department**: Padrão mais comum (pre-configured dept routing)
- **Agent**: Casos especiais (VIP, escalação, especialista específico)

**Por que Overflow é automático?**
- Protege contra sobrecarga silenciosa
- Cascading queue é padrão em call centers
- Fallback transparente para usuário/agent

**Por que 5 filtros no Pull?**
- Garante qualidade do match (right person, right skills)
- Respeita restrições (horário, capacidade, qualificação)
- Evita mismatch de skills

---

## 🔄 CONTEXTO DE REUSO

**Este padrão é aplicável a:**
- Contact Center Systems
- Customer Service Platforms
- Routing Engines
- Omnichannel Communication
- Support Ticketing Systems
- Appointment Scheduling (queues)

**Variações possíveis:**
- Add: Priority boosting (VIP escalation)
- Add: SLA escalation (if waited too long)
- Add: Auto-assignment (vs. manual pull)
- Add: Distribution weighting (agent skill level affects priority)

---

## 📚 Referência para Próximos Projetos

Ao implementar sistema de filas similar:
1. Sempre ter 3 modos de handoff (queue, dept, agent)
2. Implementar overflow automático (multi-level)
3. Use cascata de AND filters no pull (não OR)
4. Sempre track: is_bot_active, status transitions
5. Store contexto em extra_data (handoff_context, overflow_history)
6. Support 4 routing modes (pelo menos round_robin + manual)
7. Make business_hours configurable
8. Monitor SLA via sla_minutes

---

**PRONTO PARA BRAIN** ✅
