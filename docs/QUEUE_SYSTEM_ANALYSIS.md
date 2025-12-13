# 🎯 ANÁLISE COMPLETA: SISTEMA DE FILAS QUANDO NÚMERO É ENVIADO ATRAVÉS DE FLUXO

**Data**: 2025-01-17  
**Autor**: Kayo Carvalho Fernandes  
**Contexto**: Análise de como as filas funcionam quando um número é roteado através de um fluxo  

---

## 📊 VISÃO GERAL DO FLUXO

Quando você envia um número através de um fluxo que contém um **Handoff Node**, aqui está o que acontece:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     FLUXO COM HANDOFF NODE (Fila)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┴────────────────┐
                    │                                 │
            ┌───────▼────────┐          ┌─────────────▼──────────┐
            │  Bot responde   │          │  Node: Handoff (Fila)  │
            │  perguntas      │          │  - Coloca em fila      │
            │  - Coleta dados │          │  - Com prioridade      │
            └───────┬────────┘          │  - Com contexto        │
                    │                   └─────────────┬──────────┘
                    └───────────────────────────────┬─┘
                                                    │
                            ┌───────────────────────▼──────────────────────┐
                            │   CONVERSA MUDA DE ESTADO: Bot → Fila       │
                            │   - is_bot_active = False                    │
                            │   - status = "queued"                        │
                            │   - queue_id = target_queue_id               │
                            │   - queued_at = datetime.utcnow()            │
                            │   - queue_priority = {low|normal|high}       │
                            └───────────────────────┬──────────────────────┘
                                                    │
                    ┌───────────────────────────────▼──────────────────────┐
                    │              OVERFLOW? (Fila cheia)                  │
                    │              max_queue_size vs queued_conversations  │
                    └───────────────────┬──────────────────┬───────────────┘
                                        │                  │
                        ┌───────────────▼──┐      ┌────────▼──────────┐
                        │ SIM: Overflow     │      │ NÃO: Mantém       │
                        │ - Redireciona para│      │ - Fica na fila    │
                        │   overflow_queue  │      │   original        │
                        │ - Log no histórico│      │                   │
                        └────────┬──────────┘      └────────┬──────────┘
                                 │                         │
                                 └─────────────┬───────────┘
                                               │
                ┌──────────────────────────────▼───────────────────────────┐
                │  CONVERSA AGORA ESTÁ NA FILA, AGUARDANDO AGENTE          │
                │  - Visível em: GET /api/v1/queue (ordenado por priority) │
                │  - Agentes fazem "pull" quando disponíveis               │
                │  - SLA monitorado (sla_minutes)                          │
                │  - Histórico de overflow disponível                      │
                └──────────────────────────────┬───────────────────────────┘
                                               │
                ┌──────────────────────────────▼───────────────────────────┐
                │  AGENTE PUXA CONVERSA DA FILA (Pull)                     │
                │  1. Agente chama: pull_from_queue(agent_id, queue_id)    │
                │  2. Sistema busca próxima conversa (next in queue)        │
                │  3. Filtra por: allowed_agent_ids, skills_required       │
                │  4. Verifica: business_hours, agent capacity             │
                │  5. Atualiza: assigned_agent_id, status = "active"       │
                │  6. Remove: queued_at, adiciona assigned_at              │
                └──────────────────────────────┬───────────────────────────┘
                                               │
                ┌──────────────────────────────▼───────────────────────────┐
                │  CONVERSA ATIVA COM AGENTE                               │
                │  - Agent pode responder direto (sem bot)                 │
                │  - SLA é monitorado para alertas                         │
                │  - Contexto do fluxo está disponível em extra_data       │
                └──────────────────────────────────────────────────────────┘
```

---

## 🔧 DETALHAMENTO TÉCNICO: 3 CAMINHOS POSSÍVEIS NO HANDOFF NODE

### Caminho 1: Handoff para FILA ESPECÍFICA

**Configuração do Node:**
```javascript
{
  "handoffType": "queue",           // Tipo de handoff
  "queueId": "uuid-da-fila",        // Fila específica
  "priority": "high",               // low | normal | high | urgent
  "contextMessage": "Cliente VIP",   // Msg para agente
  "sendTransferMessage": true,      // Avisar cliente?
  "transferMessage": "Transferindo..." // Msg ao cliente
}
```

**Código que executa:**
```python
# backend/app/services/whatsapp_service.py :: _execute_handoff() [linhas 985-1030]

if handoff_type == "queue" and queue_id:
    # Validar UUID
    final_queue_id = UUID(queue_id) if isinstance(queue_id, str) else queue_id
    
    # Chamar ConversationService
    conv_service = ConversationService(self.db)
    await conv_service.assign_to_queue_with_overflow(
        conversation_id=conversation.id,
        queue_id=final_queue_id,
        organization_id=conversation.organization_id,
    )
    
    # Atualizar prioridade e desativar bot
    await conv_repo.update(conversation.id, {
        "queue_priority": priority_map[priority],  # 10, 50, 80, 100
        "is_bot_active": False,  # 🔴 Bot desativado
        "extra_data": {"handoff_context": context_message}
    })
```

---

### Caminho 2: Handoff para DEPARTAMENTO

**Configuração do Node:**
```javascript
{
  "handoffType": "department",        // Tipo: departamento
  "departmentId": "uuid-do-depto",   // Dept específico
  "priority": "normal"
}
```

**Código que executa:**
```python
# backend/app/services/whatsapp_service.py :: _execute_handoff() [linhas 1010-1025]

elif handoff_type == "department" and department_id:
    dept_id_uuid = UUID(department_id) if isinstance(department_id, str) else department_id
    queue_repo = QueueRepository(self.db)
    
    # Buscar PRIMEIRA fila ativa do departamento (por prioridade)
    queues = await queue_repo.list_queues(
        organization_id=conversation.organization_id,
        department_id=dept_id_uuid,
        is_active=True,
        limit=1  # Só pega a primeira (mais prioritária)
    )
    
    if queues and len(queues) > 0:
        final_queue_id = queues[0].id  # Pega a fila principal
        # Continua igual ao Caminho 1...
```

---

### Caminho 3: Handoff DIRETO para AGENTE

**Configuração do Node:**
```javascript
{
  "handoffType": "agent",           // Direto para agente
  "agentId": "uuid-do-agente",      // Agente específico
  "priority": "high"
}
```

**Código que executa:**
```python
# backend/app/services/whatsapp_service.py :: _execute_handoff() [linhas 1115-1130]

if final_agent_id:
    # Atribuição DIRETA ao agente (sem fila)
    await conv_repo.update(conversation.id, {
        "is_bot_active": False,           # Bot desativado
        "status": "active",               # Status ativo imediatamente
        "current_agent_id": final_agent_id,  # Agente atribuído
        "queued_at": None,                # Não há espera em fila
        "queue_priority": priority_map[priority],
    })
```

---

## 📌 LÓGICA DE OVERFLOW (FILA CHEIA)

Quando a fila está cheia, o sistema redireciona para outra fila automaticamente:

### Fluxo de Verificação:

```python
# backend/app/services/conversation_service.py :: check_and_apply_overflow() [linhas 513-543]

async def check_and_apply_overflow(self, queue_id: UUID, organization_id: UUID) -> Optional[UUID]:
    """
    Verifica se fila está cheia e retorna queue_id para overflow
    """
    
    # 1️⃣ Buscar configurações da fila
    queue = await self.queue_repo.get(queue_id)
    if not queue or queue.organization_id != organization_id:
        return None
    
    # 2️⃣ Verificar se overflow está configurado
    if not queue.overflow_queue_id or not queue.max_queue_size:
        return None  # Sem overflow configurado
    
    # 3️⃣ Verificar capacidade atual
    if queue.queued_conversations >= queue.max_queue_size:
        # Fila está CHEIA, vai fazer overflow
        
        # 4️⃣ Validar fila de overflow
        overflow_queue = await self.queue_repo.get(queue.overflow_queue_id)
        if overflow_queue and overflow_queue.is_active:
            # 5️⃣ Prevenir loop infinito: verificar se overflow queue tem capacity
            if not overflow_queue.max_queue_size or \
               overflow_queue.queued_conversations < overflow_queue.max_queue_size:
                return queue.overflow_queue_id  # ✅ Retorna fila de overflow
    
    return None  # Fila não está cheia, mantém na original
```

### Registro de Overflow:

```python
# backend/app/services/conversation_service.py :: assign_to_queue_with_overflow() [linhas 670-680]

async def assign_to_queue_with_overflow(self, conversation_id: UUID, queue_id: UUID, organization_id: UUID):
    # Verifica overflow
    overflow_queue_id = await self.check_and_apply_overflow(queue_id, organization_id)
    final_queue_id = overflow_queue_id if overflow_queue_id else queue_id
    
    # Atualiza conversa
    update_data = {
        "queue_id": final_queue_id,
        "status": "queued",
        "queued_at": datetime.utcnow(),
    }
    
    # 🔴 IMPORTANTE: Log do overflow no histórico
    if overflow_queue_id:
        conversation = await self.get_by_id(conversation_id, organization_id)
        extra_data = conversation.extra_data or {}
        
        if "overflow_history" not in extra_data:
            extra_data["overflow_history"] = []
        
        extra_data["overflow_history"].append({
            "original_queue_id": str(queue_id),
            "overflow_queue_id": str(overflow_queue_id),
            "overflowed_at": datetime.utcnow().isoformat(),
        })
        update_data["extra_data"] = extra_data
    
    updated = await self.repo.update(conversation_id, update_data)
    return updated
```

**Exemplo de histórico:**
```json
{
  "overflow_history": [
    {
      "original_queue_id": "550e8400-e29b-41d4-a716-446655440000",
      "overflow_queue_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "overflowed_at": "2025-01-17T14:30:45.123456"
    }
  ]
}
```

---

## 👥 COMO AGENTES PUXAM CONVERSAS DA FILA

### Fluxo de Pull (Atribuição):

```python
# backend/app/services/conversation_service.py :: pull_from_queue() [linhas 279-330]

async def pull_from_queue(
    self,
    organization_id: UUID,
    agent_id: UUID,
    department_id: Optional[UUID] = None,
    queue_id: Optional[UUID] = None,
) -> Optional[Conversation]:
    """
    Agente "puxa" próxima conversa disponível
    
    Ordem de seleção:
    1. Conversas na fila (ordenadas por priority DESC, queued_at ASC)
    2. Filtro: allowed_agent_ids (restrição da fila)
    3. Filtro: skills_required (agent deve ter todas as skills)
    4. Filtro: business_hours (fila está em horário comercial?)
    5. Filtro: agent_capacity (agente não ultrapassou max_conversations_per_agent)
    """
    
    # Construir query base
    query = select(Conversation).where(
        Conversation.organization_id == organization_id,
        Conversation.status == "queued",
        Conversation.deleted_at.is_(None),
    )
    
    # Ordem: prioridade DESC (alta primeiro), depois data ASC (mais antiga primeiro)
    query = query.order_by(
        Conversation.queue_priority.desc(),
        Conversation.queued_at.asc()
    )
    
    # Aplicar filtros opcionais
    if department_id:
        query = query.where(Conversation.assigned_department_id == department_id)
    if queue_id:
        query = query.where(Conversation.queue_id == queue_id)
    
    result = await self.db.execute(query)
    conversations = result.scalars().all()
    
    # 🔴 CRÍTICO: Filtrar por restrições
    for conversation in conversations:
        if conversation.queue_id:
            queue = await self.queue_repo.get(conversation.queue_id)
            
            if queue and queue.settings:
                # Filtro 1: Agentes permitidos
                allowed_agent_ids = queue.settings.get("allowed_agent_ids", [])
                if allowed_agent_ids and str(agent_id) not in allowed_agent_ids:
                    continue  # ⏭️ Pula esta conversa
                
                # Filtro 2: Skills requeridas
                skills_required = queue.settings.get("skills_required", [])
                if skills_required:
                    # Buscar skills do agente
                    stmt = select(AgentSkill.skill_name).where(
                        AgentSkill.user_id == agent_id,
                        AgentSkill.organization_id == organization_id,
                        AgentSkill.deleted_at.is_(None),
                    )
                    res = await self.db.execute(stmt)
                    agent_skill_names = {row[0].lower() for row in res.fetchall()}
                    
                    req = {str(s).lower() for s in skills_required}
                    
                    if not req.issubset(agent_skill_names):
                        continue  # ⏭️ Pula, agente não tem todas as skills
                
                # Filtro 3: Horário comercial
                if not self._is_within_business_hours(queue):
                    continue  # ⏭️ Pula, fila está fechada
        
        # ✅ Conversa passou em TODOS os filtros
        conversation.assign_to_agent(agent_id, department_id)
        await self.db.commit()
        await self.db.refresh(conversation)
        return conversation  # 🎯 RETORNA PRIMEIRA VÁLIDA
    
    return None  # Nenhuma conversa disponível
```

---

## 🎯 ROUTING MODES (Modos de Roteamento)

As filas suportam 4 modos diferentes de distribuição:

### 1️⃣ Round-Robin (Distribuição Cíclica)

```
Agent A ├─ Conversa 1
        ├─ Conversa 2
        └─ Conversa 3

Agent B ├─ Conversa 4
        ├─ Conversa 5
        └─ Conversa 6

Agent C ├─ Conversa 7
        ├─ Conversa 8
        └─ Conversa 9
```

**Implementação**: Cada pull retorna a próxima conversa na fila, independente de quantas o agente já tem. **Requer verificação manual de capacidade:**

```python
# Se agente A já tem 3 conversas e max_conversations_per_agent = 5
# Pode puxar mais 2 conversas
```

---

### 2️⃣ Load-Balance (Balanceamento de Carga)

```
Agent A: 8 conversas
Agent B: 3 conversas  ← Próxima vai para B (menos ocupado)
Agent C: 5 conversas
```

**Implementação**: O sistema automaticamente escolhe o agente menos carregado.

⚠️ **NOTA**: Implementação atual é via `pull_from_queue()` que o cliente chama. Não há auto-assignment baseado em load-balance ainda.

---

### 3️⃣ Manual (Manual Routing)

Agente escolhe manualmente qual conversa puxar da fila.

**Implementação**: API permite filtrar por queue_id específica:
```python
await pull_from_queue(
    organization_id=org_id,
    agent_id=agent_id,
    queue_id=specific_queue_id  # Agente escolhe qual fila
)
```

---

### 4️⃣ Skills-Based (Baseado em Habilidades)

```
Queue "Billing":
  - Requer skills: ["billing", "payment_systems"]
  
Agent A: ["billing", "payment_systems", "billing_disputes"] ✅ Pode puxar
Agent B: ["support", "technical"] ❌ Não pode
Agent C: ["billing", "English"] ❌ Incompleto
```

**Implementação**: No `pull_from_queue()`, verifica `queue.settings["skills_required"]`:

```python
skills_required = queue.settings.get("skills_required", [])
if skills_required:
    # Buscar skills do agente
    agent_skills = get_agent_skills(agent_id)
    
    # Verificar se agente tem TODAS as skills requeridas
    if not required_skills.issubset(agent_skills):
        continue  # Pula, agente não é qualificado
```

---

## 💾 ESTRUTURA DE DADOS: QUEUE MODEL

```python
# backend/app/models/queue.py

class Queue(Base, TimestampMixin, SoftDeleteMixin):
    id: UUID                                    # PK
    organization_id: UUID                       # Multi-tenant
    department_id: UUID                         # FK Department
    
    # Identifiers
    name: str                                   # "Suporte"
    slug: str                                   # "suporte"
    description: Optional[str]
    color: str = "#10B981"                     # UI color
    icon: Optional[str]                         # UI icon
    
    # Status
    is_active: bool = True
    priority: int = 50                         # Prioridade da fila (0-100)
    
    # SLA (Service Level Agreement)
    sla_minutes: Optional[int]                 # Max wait time (e.g., 15 min)
    
    # Routing Configuration
    routing_mode: str = "round_robin"          # round_robin|load_balance|manual|skills_based
    auto_assign_conversations: bool = True     # Auto-assign quando agente fica livre?
    max_conversations_per_agent: int = 10      # Limite de conversas por agente
    
    # Overflow
    max_queue_size: Optional[int]               # Max conversas na fila antes de overflow
    overflow_queue_id: Optional[UUID]           # Fila para redirecionar quando cheia
    
    # Statistics (atualizadas periodicamente)
    total_conversations: int = 0
    active_conversations: int = 0
    queued_conversations: int = 0               # 🔴 IMPORTANTE para overflow check
    completed_conversations: int = 0
    
    # Metrics
    average_wait_time_seconds: Optional[int]
    average_response_time_seconds: Optional[int]
    average_resolution_time_seconds: Optional[int]
    customer_satisfaction_score: Optional[int]  # 0-100
    
    # Advanced Settings (JSONB)
    settings: dict = {}
    # Exemplos:
    # {
    #   "allowed_agent_ids": ["uuid1", "uuid2"],      # Restrição de agentes
    #   "skills_required": ["billing", "english"],    # Skills obrigatórias
    #   "business_hours": {                           # Horário comercial
    #     "timezone": "America/Sao_Paulo",
    #     "schedule": {
    #       "monday": {"enabled": true, "start": "09:00", "end": "18:00"},
    #       ...
    #     }
    #   }
    # }
```

---

## 🔄 ESTRUTURA DE DADOS: CONVERSATION QUANDO ENTRA NA FILA

```python
# backend/app/models/conversation.py

conversation = Conversation(
    id: UUID,
    organization_id: UUID,
    contact_id: UUID,
    whatsapp_number_id: UUID,
    flow_id: UUID,                    # Que fluxo iniciou?
    
    # Estado quando em fila
    status: str = "queued",           # ← MUDA DE ACTIVE PARA QUEUED
    is_bot_active: bool = False,      # ← DESATIVADO APÓS HANDOFF
    
    # Fila
    queue_id: UUID,                   # Qual fila está?
    queue_priority: int,              # Prioridade (10|50|80|100)
    queued_at: datetime,              # Quando entrou na fila
    
    # Agente (vazio enquanto na fila)
    assigned_agent_id: Optional[UUID] = None,
    assigned_at: Optional[datetime],
    current_agent_id: Optional[UUID] = None,
    
    # Contexto
    extra_data: dict = {},            # Histórico de overflow, contexto, etc
    
    # Timestamps
    created_at: datetime,
    updated_at: datetime,
)
```

**Exemplo com overflow:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "queue_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "queue_priority": 80,
  "queued_at": "2025-01-17T14:30:00",
  "status": "queued",
  "is_bot_active": false,
  "extra_data": {
    "handoff_context": "Cliente VIP, problema com pagamento",
    "overflow_history": [
      {
        "original_queue_id": "queue-1",
        "overflow_queue_id": "queue-2",
        "overflowed_at": "2025-01-17T14:30:45"
      }
    ]
  }
}
```

---

## 📊 ENDPOINTS PRINCIPAIS

### 1. Get Queue (Listar conversas na fila)
```http
GET /api/v1/queue?department_id=uuid&queue_id=uuid
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "...",
    "contact_id": "...",
    "contact_name": "João Silva",
    "queue_priority": 80,
    "queued_at": "2025-01-17T14:30:00",
    "time_in_queue_seconds": 300,
    "sla_violation": false
  }
]
```

---

### 2. Pull from Queue (Agente puxar conversa)
```http
POST /api/v1/queue/pull
Authorization: Bearer <token>
Content-Type: application/json

{
  "queue_id": "uuid-opcional",
  "department_id": "uuid-opcional"
}
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "contact_name": "João Silva",
  "status": "active",
  "assigned_agent_id": "agent-uuid",
  "assigned_at": "2025-01-17T14:35:00",
  "extra_data": {
    "handoff_context": "Cliente VIP..."
  }
}
```

---

### 3. Assign Conversation (Admin atribuir manualmente)
```http
POST /api/v1/conversations/{conversation_id}/assign
Authorization: Bearer <token>
Content-Type: application/json

{
  "agent_id": "agent-uuid"
}
```

---

## 🎯 FLUXO COMPLETO: PASSO A PASSO

### Cenário: Flow Automation envia 100 números para fila "Suporte"

```
PASSO 1: Flow Automation é acionado
├─ Inicia processo_flow_automation_execution()
├─ Carrega 100 recipients
└─ Cria 100 tarefas paralelas (Celery)

PASSO 2: Para cada recipient (paralelo)
├─ Carrega contact
├─ Cria/atualiza Conversation
├─ Injeta variáveis de contexto
├─ Executa fluxo (Bot responde perguntas)
└─ Quando chega no HANDOFF NODE → continua...

PASSO 3: Handoff Node executa
├─ Extrai configuração: handoffType="queue", queueId="suporte"
├─ Chama: _execute_handoff(conversation, node_data)
├─ WhatsAppService envia mensagem: "Transferindo para agente..."
└─ Continua...

PASSO 4: ConversationService.assign_to_queue_with_overflow()
├─ Verifica: Queue.max_queue_size (e.g., 50)
├─ Verifica: Queue.queued_conversations (e.g., 45)
├─ Decisão: 45 < 50? → Mantém na fila "Suporte"
├─              Não → Redireciona para overflow_queue_id
└─ Atualiza conversa: status="queued", queue_id="suporte"

PASSO 5: 100 conversas estão na fila "Suporte"
├─ GET /api/v1/queue retorna todas ordenadas
├─ queue_priority DESC (altas primeiro)
├─ queued_at ASC (mais antigas primeiro)
└─ Exemplo:
   [
     {contact: "João", priority: 100, queued_at: "14:30:00"},
     {contact: "Maria", priority: 80, queued_at: "14:31:00"},
     ...
   ]

PASSO 6: Agentes puxam da fila
├─ Agente A: pull_from_queue(agent_id="A", queue_id="suporte")
├─ Sistema filtra:
│  ├─ Status == "queued"
│  ├─ Queue.settings["allowed_agent_ids"]? Agent A está nela?
│  ├─ Queue.settings["skills_required"]? Agent A tem todas?
│  ├─ Business hours? Fila está aberta?
│  └─ Agent capacity? Agent A tem menos de 10 conversas?
├─ Se PASSOU em todos → Retorna primeira da fila (João)
├─ Atualiza: assigned_agent_id="A", status="active", queued_at=null
└─ Agente A começa a conversar com João

PASSO 7: Outros agentes continuam puxando
├─ Agente B: pull_from_queue(...) → Retorna Maria
├─ Agente C: pull_from_queue(...) → Retorna próxima
└─ ... Até que a fila esvazia
```

---

## ⚠️ CONDIÇÕES DE ERRO & EDGE CASES

### 1. Queue não existe
```python
# Handoff aponta para queue_id inválido
if not queue or queue.organization_id != organization_id:
    logger.error(f"Queue {queue_id} not found")
    # Conversa fica em "queued" mas sem queue_id válido
```

### 2. Overflow recursivo infinito
```python
# Queue A → Overflow Queue B → Overflow Queue C → Overflow Queue A (loop!)
# Proteção:
if not overflow_queue.max_queue_size or \
   overflow_queue.queued_conversations < overflow_queue.max_queue_size:
    # Seguro para overflow
```

### 3. Agente sem skills na fila skills-based
```python
# Agente A tem skills ["suporte"]
# Fila requer ["suporte", "billing"]
# → Agente A NÃO consegue puxar dessa fila
# → Conversa fica aguardando agente qualificado
```

### 4. Fila fora do horário comercial
```python
# Queue está configurada para 09:00-18:00 (São Paulo)
# Agente tenta pull às 22:00
# → pull_from_queue() retorna None (sem conversas disponíveis)
# → Conversas aguardam até próximo dia útil
```

### 5. Agent capacity alcançada
```python
# Agente A tem: max_conversations_per_agent = 10
# Agente A já tem: 10 conversas ativas
# → pull_from_queue() não consegue atribuir nada ao A
# → Sistema deve ir para próximo agente ou retornar None
```

---

## 📈 ESTATÍSTICAS & MONITORAMENTO

### Métricas da Queue

```python
# backend/app/services/queue_service.py :: get_queue_metrics()

metrics = {
    "queue_id": "uuid",
    "queue_name": "Suporte",
    
    # Volume
    "total_conversations_30d": 350,
    "queued_conversations": 12,
    "active_conversations": 8,
    "completed_conversations": 330,
    
    # Performance
    "average_wait_time_seconds": 450,    # 7.5 minutos
    "average_response_time_seconds": 120,
    "average_resolution_time_seconds": 1800,
    
    # SLA
    "sla_violations": 5,                 # 5 conversas excederam SLA
    "sla_violation_rate": 1.4,          # 1.4% de violação
    
    # Overflow
    "overflow_events": 3,                # Ficou cheia 3x
    "overflow_rate": 0.9,               # 0.9% das conversas fizeram overflow
    
    # Satisfação
    "customer_satisfaction_score": 4.5, # 4.5/5.0
    
    # Trends
    "volume_by_hour": [
        {"hour": 9, "count": 45},
        {"hour": 10, "count": 52},
        ...
    ],
    "occupancy_trend": [
        {"day": "2025-01-10", "occupancy": 0.65},
        {"day": "2025-01-11", "occupancy": 0.72},
        ...
    ]
}
```

---

## 🔴 RESUMO: O QUE ACONTECE QUANDO ENVIAM NÚMERO ATRAVÉS DE FLUXO

| Etapa | O Que Acontece | Código |
|-------|---|---|
| **1. Webhook chega** | Meta Cloud API envia mensagem | `process_webhook()` |
| **2. Conversa criada** | Nova Conversation com flow_id | `_process_incoming_message()` |
| **3. Bot executa** | Fluxo responde perguntas | `_trigger_chatbot()` → `_execute_node()` |
| **4. Chega em Handoff** | Node tipo "handoff" é acionado | `_execute_node()` dispatcher |
| **5. Tipo de handoff** | Determine: queue vs department vs agent | `_execute_handoff()` |
| **6. Resolve fila** | Encontra queue_id final (pode fazer overflow) | `check_and_apply_overflow()` |
| **7. Atualiza status** | `is_bot_active=False`, `status="queued"`, `queue_id=...` | `ConversationRepository.update()` |
| **8. Envia mensagem** | Avisa cliente: "Transferindo para agente..." | Meta Cloud API ou Evolution API |
| **9. Conversa na fila** | Visível em `GET /api/v1/queue`, pronta para agente puxar | Database query |
| **10. Agente puxa** | Agente chama `pull_from_queue()`, sistema retorna próxima válida | `pull_from_queue()` com filtros |
| **11. Atribuição** | Conversa agora tem `assigned_agent_id`, passa a estar `active` | `assign_to_agent()` |
| **12. Conversa ativa** | Agent responde direto (bot desativado), contexto disponível | Direct message exchange |

---

## 🚀 NEXT STEPS

Para testar o sistema de filas:

1. **Create Queue** via API:
   ```bash
   curl -X POST http://localhost:8000/api/v1/queues \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Suporte",
       "slug": "suporte",
       "department_id": "uuid",
       "routing_mode": "round_robin",
       "max_conversations_per_agent": 10,
       "max_queue_size": 50,
       "overflow_queue_id": "uuid-overflow-queue"
     }'
   ```

2. **Create Flow com Handoff Node**:
   - Node type: `handoff`
   - handoffType: `queue`
   - queueId: (UUID da fila criada)
   - priority: `high`

3. **Enviar número através do Flow**:
   - Flow automation ou manual trigger
   - Bot responde perguntas
   - Quando chega em Handoff → conversa vai para fila

4. **Verificar fila**:
   ```bash
   curl http://localhost:8000/api/v1/queue?queue_id=<uuid> \
     -H "Authorization: Bearer <token>"
   ```

5. **Agente pulando da fila**:
   ```bash
   curl -X POST http://localhost:8000/api/v1/queue/pull \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"queue_id": "uuid"}'
   ```

---

**Documento completo!** 🎉
