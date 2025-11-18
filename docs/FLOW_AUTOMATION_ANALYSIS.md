# 📊 Análise: Sistema de Disparo de Fluxos para Listas de Números

## 🎯 Visão Geral

O PyTake possui um sistema completo de **Flow Automations** que permite enviar disparos de fluxos para múltiplos contatos com variáveis personalizadas. É um sistema **proativo** (push) vs reativo (pull).

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW AUTOMATION SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Frontend: BulkDispatchModal                                     │
│  ├─ Entrada: Lista ou CSV com números                           │
│  ├─ Mapeamento: Variáveis (contact.name, constantes, etc)       │
│  └─ Agendamento: Imediato ou futuro                             │
│                     │                                             │
│                     ▼                                             │
│  1. Criar/Atualizar Contatos (POST /contacts)                   │
│  2. Criar Automação (POST /flow-automations)                    │
│  3. Iniciar Execução (POST /flow-automations/{id}/start)        │
│                     │                                             │
│                     ▼                                             │
│  Backend: FlowAutomationService                                 │
│  ├─ Resolver Audiência (contact_ids)                            │
│  ├─ Resolver Variáveis (template → valores reais)               │
│  ├─ Criar Execution + Recipients                                │
│  └─ Enfileirar Background Tasks (Celery)                        │
│                     │                                             │
│                     ▼                                             │
│  Database: FlowAutomation + Execution + Recipients              │
│  ├─ Rastrear status por automação                               │
│  ├─ Rastrear status por execução (batch)                        │
│  └─ Rastrear status por destinatário individual                 │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Componentes Principais

### 1️⃣ **Frontend: BulkDispatchModal** (`BulkDispatchModal.tsx`)

**Localização:** `/frontend/src/components/admin/builder/BulkDispatchModal.tsx`

**Responsabilidades:**
- Coleta lista de números (simples ou CSV)
- Mapeia colunas CSV → variáveis do fluxo
- Mapeia campos de contato → variáveis
- Define valores constantes
- Permite agendamento

**Fluxo de Entrada:**

```
┌─────────────────────────────────────────┐
│     BulkDispatchModal Component          │
├─────────────────────────────────────────┤
│                                           │
│  Mode: Lista simples                     │
│  └─ "5511999999999"                      │
│     "5511888888888"                      │
│                                           │
│  Mode: CSV                               │
│  └─ phone,name,email,company             │
│     5511999999999,Fulano,f@ex.com,ABC   │
│     5511888888888,Beltrano,b@ex.com,XYZ │
│                                           │
│  Variable Mapping                        │
│  ┌─ customer_name ← contact.name         │
│  ├─ email         ← CSV column: email    │
│  ├─ discount      ← Constante: "10%"     │
│  └─ timestamp     ← contact.created_at   │
│                                           │
│  Schedule                                │
│  └─ Agora ou [data/hora]                 │
│                                           │
└─────────────────────────────────────────┘
```

**Código-chave:**

```typescript
// 1. Parsear entrada
const parsedRows: RecipientRow[] = useMemo(() => {
  if (inputMode === "list") {
    return listText
      .split(/\r?\n/)
      .map((l) => normalizePhone(l))
      .filter(Boolean)
      .map((phone) => ({ phone }));
  }
  if (csvText.trim()) return parseCSV(csvText);
  return [];
}, [inputMode, listText, csvText]);

// 2. Garantir contatos criados
const contactIds = await ensureContacts(parsedRows);

// 3. Montar variable_mapping
const variable_mapping: Record<string, string> = {};
for (const m of mappings) {
  if (m.source === 'const') {
    variable_mapping[m.varName] = m.constValue ?? '';
  } else if (m.source === 'contact') {
    variable_mapping[m.varName] = `{{contact.${m.key}}}`;
  } else if (m.source === 'csv') {
    variable_mapping[m.varName] = `{{contact.${m.key}}}`;
  }
}

// 4. Criar automação
const payload = {
  name: `Disparo ${new Date().toLocaleString()}`,
  chatbot_id: chatbotId,
  flow_id: flow.id,
  whatsapp_number_id: selectedNumberId,
  trigger_type: scheduleEnabled ? "scheduled" : "manual",
  audience_type: "custom",
  audience_config: { contact_ids: contactIds },
  variable_mapping,
  rate_limit_per_hour: 500,
};
const created = await api.post('/flow-automations', payload);

// 5. Iniciar imediatamente (se não agendado)
if (!scheduleEnabled) {
  await api.post(`/flow-automations/${automationId}/start`);
}
```

---

### 2️⃣ **Backend: Models** (`flow_automation.py`)

**Localização:** `/backend/app/models/flow_automation.py`

**3 Modelos Principais:**

#### **FlowAutomation** (Automação)
```python
class FlowAutomation(Base):
    """A automação em si"""
    name: str                           # "Disparo promo Black Friday"
    chatbot_id: UUID                    # Qual chatbot?
    flow_id: UUID                       # Qual fluxo executar?
    whatsapp_number_id: UUID            # Qual número WhatsApp?
    
    # Trigger
    trigger_type: str                   # "manual", "scheduled", "cron", "webhook"
    trigger_config: JSONB               # {"scheduled_at": "2025-11-20T10:00:00Z"}
    
    # Audiência
    audience_type: str                  # "custom", "all", "tags", "segment"
    audience_config: JSONB              # {"contact_ids": ["uuid1", "uuid2"]}
    
    # Variáveis
    variable_mapping: JSONB
    # {
    #   "customer_name": "{{contact.name}}",
    #   "points": "{{contact.custom_fields.loyalty_points}}",
    #   "discount": "10%"
    # }
    
    # Controles
    max_concurrent_executions: int = 50
    rate_limit_per_hour: int = 100
    retry_failed: bool = True
    execution_window_start: Time        # Horário comercial
    execution_window_end: Time
    
    # Estatísticas (agregadas)
    total_executions: int = 0
    total_sent: int = 0
    total_delivered: int = 0
    total_read: int = 0
    total_replied: int = 0
    total_completed: int = 0
    total_failed: int = 0
    
    last_executed_at: DateTime
    next_scheduled_at: DateTime
```

#### **FlowAutomationExecution** (Uma execução/batch)
```python
class FlowAutomationExecution(Base):
    """Um disparo da automação (um batch específico)"""
    automation_id: UUID                 # Referência à automação
    
    # Tipo de execução
    execution_type: str                 # "manual" ou "scheduled"
    triggered_by_user_id: UUID
    triggered_by_event: str             # "cron", "webhook:payment.overdue"
    
    # Status
    status: str                         # "queued", "running", "completed", "failed"
    total_recipients: int               # Quantos contatos?
    
    # Progresso
    messages_sent: int = 0
    messages_delivered: int = 0
    messages_read: int = 0
    messages_replied: int = 0
    messages_completed: int = 0
    messages_failed: int = 0
    
    # Timestamps
    started_at: DateTime
    completed_at: DateTime
    
    # Erros
    error_message: str
    errors: JSONB                       # Lista de erros detalhados
```

#### **FlowAutomationRecipient** (Um contato individual)
```python
class FlowAutomationRecipient(Base):
    """Um contato individual na execução"""
    execution_id: UUID                  # Qual execução?
    contact_id: UUID                    # Qual contato?
    phone_number: str                   # Número WhatsApp
    
    # Variáveis resolvidas para este contato
    variables: JSONB
    # {
    #   "customer_name": "João Silva",
    #   "points": "150",
    #   "discount": "10%"
    # }
    
    # Status individual
    status: str                         # "pending", "sent", "delivered", "read", "completed", "failed"
    
    # Rastreamento
    flow_execution_id: UUID             # Referência à conversa iniciada
    created_at: DateTime
    started_at: DateTime
    completed_at: DateTime
    
    # Retry
    retry_count: int = 0
    last_retry_at: DateTime
    
    # Erros
    error_message: str
```

---

### 3️⃣ **Backend: Service** (`flow_automation_service.py`)

**Localização:** `/backend/app/services/flow_automation_service.py`

**Responsabilidades Principais:**

#### **1. Create Automation**
```python
async def create_automation(
    data: FlowAutomationCreate,
    organization_id: UUID,
    user_id: UUID
) -> FlowAutomation:
    """
    1. Valida que chatbot, flow e whatsapp_number existem e pertencem à org
    2. Cria FlowAutomation com status="draft"
    """
```

#### **2. Start Automation**
```python
async def start_automation(
    automation_id: UUID,
    organization_id: UUID,
    user_id: UUID,
    request: Optional[FlowAutomationStartRequest] = None
) -> FlowAutomationExecution:
    """
    1. Carrega automação
    2. Resolve audiência (contact_ids)
    3. Cria FlowAutomationExecution
    4. Cria FlowAutomationRecipient para cada contato
    5. Resolve variáveis individuais
    6. Enfileira background tasks
    """
    
    # Resolve audience
    contact_ids = await self.resolve_audience(automation)  # ["uuid1", "uuid2", ...]
    
    # Create execution
    execution = FlowAutomationExecution(
        automation_id=automation_id,
        total_recipients=len(contact_ids),
        status="queued"
    )
    
    # Create recipients (um por contato)
    for contact in contacts:
        variables = await self.resolve_variables_for_contact(automation, contact)
        recipient = FlowAutomationRecipient(
            execution_id=execution.id,
            contact_id=contact.id,
            variables=variables,
            status="pending"
        )
```

#### **3. Resolve Audience**
```python
async def resolve_audience(
    automation: FlowAutomation
) -> List[UUID]:
    """
    Baseado em audience_config:
    - "custom": Lista específica de contact_ids
    - "all": Todos os contatos ativos
    - "tags": Contatos com tags específicas (futuro)
    - "segment": Contatos que matcham filtros (futuro)
    """
    if automation.audience_type == "custom":
        return automation.audience_config.get("contact_ids", [])
    elif automation.audience_type == "all":
        # SELECT * FROM contacts WHERE org_id = X AND is_active = true
        ...
```

#### **4. Resolve Variables for Contact**
```python
async def resolve_variables_for_contact(
    automation: FlowAutomation,
    contact: Contact
) -> dict:
    """
    Transforma templates em valores reais:
    
    Template: "{{contact.name}}" + Contact: "João" → "João"
    Template: "{{contact.custom_fields.points}}" + Contact.attributes: {points: 150} → "150"
    Template: "10%" (static) → "10%"
    """
    variable_mapping = automation.variable_mapping
    # {
    #   "customer_name": "{{contact.name}}",
    #   "discount": "10%"
    # }
    
    resolved = {}
    for var_name, var_template in variable_mapping.items():
        resolved[var_name] = self._resolve_variable_template(var_template, contact)
    
    return resolved
    # {
    #   "customer_name": "João Silva",
    #   "discount": "10%"
    # }
```

**Pattern de Resolução:**

```
Template String     Contact Data        Resultado
──────────────────  ────────────────    ─────────────
"{{contact.name}}"  Contact.name="João" "João"
"{{contact.email}}" Contact.email="x@y" "x@y"
"10%"               (static)            "10%"
```

---

### 4️⃣ **Backend: API Endpoints** (`flow_automations.py`)

**Localização:** `/backend/app/api/v1/endpoints/flow_automations.py`

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/flow-automations` | POST | Criar nova automação (draft) |
| `/flow-automations` | GET | Listar automações (com filtros) |
| `/flow-automations/{id}` | GET | Obter detalhes |
| `/flow-automations/{id}` | PUT | Atualizar (apenas draft/paused) |
| `/flow-automations/{id}` | DELETE | Soft delete |
| `/flow-automations/{id}/start` | POST | Iniciar execução |
| `/flow-automations/{id}/stats` | GET | Estatísticas agregadas |

**Exemplo POST /flow-automations:**

```json
{
  "name": "Disparo Black Friday",
  "description": "Enviar oferta especial",
  "chatbot_id": "uuid-chatbot",
  "flow_id": "uuid-flow",
  "whatsapp_number_id": "uuid-wa-number",
  "trigger_type": "manual",
  "trigger_config": {},
  "audience_type": "custom",
  "audience_config": {
    "contact_ids": [
      "uuid-contact-1",
      "uuid-contact-2"
    ]
  },
  "variable_mapping": {
    "customer_name": "{{contact.name}}",
    "discount": "10%"
  },
  "max_concurrent_executions": 50,
  "rate_limit_per_hour": 500
}
```

**Exemplo POST /flow-automations/{id}/start:**

```json
{
  "test_mode": false,
  "test_contact_ids": []
}
```

Resposta:
```json
{
  "id": "uuid-execution",
  "automation_id": "uuid-automation",
  "execution_type": "manual",
  "status": "queued",
  "total_recipients": 2,
  "started_at": "2025-11-20T10:00:00Z"
}
```

---

## 📈 Fluxo Completo (do Início ao Fim)

```
┌─────────────────────────────────────────────────────────────────────┐
│ PASSO 1: USUÁRIO ABRE MODAL DE DISPARO                              │
├─────────────────────────────────────────────────────────────────────┤
│ Frontend carrega números WhatsApp disponíveis                        │
│ User seleciona o número a usar                                       │
│ User escolhe modo de entrada (lista ou CSV)                          │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PASSO 2: COLAR DADOS                                                │
├─────────────────────────────────────────────────────────────────────┤
│ Modo Lista:                                                          │
│   5511999999999                                                      │
│   5511888888888                                                      │
│                                                                       │
│ Modo CSV:                                                            │
│   phone,name,email,company                                           │
│   5511999999999,João,joao@ex.com,ABC Corp                           │
│   5511888888888,Maria,maria@ex.com,XYZ Inc                          │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PASSO 3: MAPEAR VARIÁVEIS                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Criar mapeamentos entre fonte e variáveis do fluxo:                 │
│                                                                       │
│ customer_name ← CSV column: name                                     │
│ email         ← CSV column: email                                    │
│ discount      ← Constante: "10%"                                     │
│                                                                       │
│ O sistema monta templates:                                          │
│   variable_mapping = {                                              │
│     "customer_name": "{{contact.name}}",                             │
│     "email": "{{contact.email}}",                                    │
│     "discount": "10%"                                                │
│   }                                                                  │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PASSO 4: CRIAR/VERIFICAR CONTATOS                                   │
├─────────────────────────────────────────────────────────────────────┤
│ Frontend faz POST /contacts para cada linha                          │
│                                                                       │
│ Para cada telefone:                                                  │
│   POST /contacts {                                                   │
│     "whatsapp_id": "5511999999999",                                  │
│     "name": "João",                                                  │
│     "email": "joao@ex.com"                                           │
│   }                                                                  │
│                                                                       │
│ Backend retorna contact_id (criado ou existente)                     │
│ Frontend coleta todos os IDs → contactIds = [uuid1, uuid2, ...]     │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PASSO 5: CRIAR AUTOMAÇÃO (Draft)                                    │
├─────────────────────────────────────────────────────────────────────┤
│ Frontend: POST /flow-automations                                     │
│                                                                       │
│ Payload:                                                             │
│   name: "Disparo 2025-11-20 10:30",                                  │
│   chatbot_id: "...",                                                 │
│   flow_id: "...",                                                    │
│   whatsapp_number_id: "...",                                         │
│   trigger_type: "manual",                                            │
│   audience_type: "custom",                                           │
│   audience_config: { contact_ids: [uuid1, uuid2] },                 │
│   variable_mapping: { ... },                                         │
│   rate_limit_per_hour: 500                                           │
│                                                                       │
│ Backend: FlowAutomationService.create_automation()                   │
│   1. Valida chatbot, flow, whatsapp_number                           │
│   2. Cria FlowAutomation com status="draft"                          │
│   3. Retorna automação                                               │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PASSO 6: INICIAR EXECUÇÃO                                           │
├─────────────────────────────────────────────────────────────────────┤
│ Frontend: POST /flow-automations/{automationId}/start                │
│                                                                       │
│ Backend: FlowAutomationService.start_automation()                    │
│   1. Valida que automação não está archived                          │
│   2. Resolve audiência                                               │
│      → contact_ids = [uuid1, uuid2, ...]                             │
│   3. Cria FlowAutomationExecution                                    │
│      status: "queued"                                                │
│      total_recipients: 2                                             │
│   4. Cria FlowAutomationRecipient para cada contato                 │
│      Para cada contact:                                              │
│        - Resolve variáveis individuais                               │
│        - Cria recipient com variables resolvidas                     │
│        - status: "pending"                                           │
│   5. Enfileira background tasks (Celery)                             │
└─────────────────────────────────────────────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ PASSO 7: PROCESSAMENTO DE BACKGROUND                                │
├─────────────────────────────────────────────────────────────────────┤
│ [FUTURO - não totalmente implementado ainda]                         │
│                                                                       │
│ Celery task recebe execution_id                                      │
│   1. Carrega execution com recipients                                │
│   2. Para cada recipient:                                            │
│      a. Inicia nova Conversation com contact                         │
│      b. Injeta variáveis resolvidas em context_variables             │
│      c. Executa flow (começa no node START)                          │
│      d. Rastreia status (sent, delivered, read, completed)           │
│      e. Atualiza recipient.status                                    │
│   3. Atualiza execution.progress                                     │
│   4. Atualiza automation.total_* (agregadas)                         │
│   5. Finaliza execution quando todos os recipients terminam          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔑 Fluxo Detalhado de Variáveis

### Como as Variáveis Viajam

```
FRONTEND (BulkDispatchModal)
  ↓
  Mapping User Input → Templates
    {
      "customer_name": "{{contact.name}}",
      "discount": "10%"
    }
  ↓
  POST /flow-automations
    (envia variable_mapping)
  ↓
BACKEND (FlowAutomation)
  ├─ Armazena variable_mapping em JSONB
  ├─ Quando inicia execução:
  │   Para cada contact_id:
  │     → resolve_variables_for_contact(automation, contact)
  │     → Transforma templates em valores
  │     → Cria FlowAutomationRecipient.variables = {
  │         "customer_name": "João Silva",
  │         "discount": "10%"
  │       }
  │
  ├─ Quando executa flow (background task):
  │   → Carrega recipient.variables
  │   → Injeta em conversation.context_variables
  │   → Flow nodes acessam via {{customer_name}}, {{discount}}
  │
  └─ Resultado:
      WhatsApp message: "Olá João Silva, aproveite desconto de 10%!"
```

### Exemplo Prático

```
INPUT (Frontend):
┌─────────────────────┐
│ phone,name,email    │
│ 5511999999999,João  │
│ 5511888888888,Maria │
└─────────────────────┘

MAPPING (User configures):
┌──────────────────────────────────┐
│ customer_name ← CSV: name        │
│ discount      ← Constant: "20%"  │
│ email         ← CSV: email       │
└──────────────────────────────────┘

TEMPLATES (Frontend sends):
┌────────────────────────────────────┐
│ {                                  │
│   "customer_name": "{{contact.name}}", │
│   "discount": "20%",               │
│   "email": "{{contact.email}}"     │
│ }                                  │
└────────────────────────────────────┘

RESOLUTION (Backend):

Contact 1 (João, 5511999999999, joao@...)
  customer_name: "João Silva"
  discount: "20%"
  email: "joao@email.com"

Contact 2 (Maria, 5511888888888, maria@...)
  customer_name: "Maria Santos"
  discount: "20%"
  email: "maria@email.com"

EXECUTION (WhatsApp):

Olá João Silva, você tem um desconto de 20%!
Confirme seu email: joao@email.com

---

Olá Maria Santos, você tem um desconto de 20%!
Confirme seu email: maria@email.com
```

---

## 📊 Database Schema

```
┌──────────────────────────────┐
│ flow_automations             │
├──────────────────────────────┤
│ id (PK)                      │
│ organization_id (FK)         │
│ chatbot_id (FK)              │
│ flow_id (FK)                 │
│ whatsapp_number_id (FK)      │
│ name                         │
│ description                  │
│ trigger_type                 │
│ trigger_config (JSONB)       │
│ audience_type                │
│ audience_config (JSONB)      │◄───┐
│ variable_mapping (JSONB)     │◄──┐│
│ status                       │   ││
│ total_executions             │   ││
│ total_sent / delivered / ... │   ││
│ last_executed_at             │   ││
│ created_at / updated_at      │   ││
└──────────────────────────────┘   ││
         │                          ││
         │ 1:N                      ││
         │                          ││
┌────────┴────────────────────────┐ ││
│ flow_automation_executions      │ ││
├─────────────────────────────────┤ ││
│ id (PK)                         │ ││
│ automation_id (FK) ────────────► ││
│ organization_id (FK)            │ ││
│ execution_type                  │ ││
│ triggered_by_user_id (FK)       │ ││
│ status                          │ ││
│ total_recipients                │ ││
│ messages_sent / delivered / ... │ ││
│ started_at / completed_at       │ ││
│ errors (JSONB)                  │ ││
│ created_at / updated_at         │ ││
└────────────────────────────────┘  ││
         │                           ││
         │ 1:N                       ││
         │                           ││
┌────────┴──────────────────────────┐│
│ flow_automation_recipients        ││
├───────────────────────────────────┤│
│ id (PK)                           ││
│ execution_id (FK)                 ││
│ organization_id (FK)              ││
│ contact_id (FK)                   ││
│ phone_number                      ││
│ variables (JSONB) ◄───────────────┼┘
│ status                            │
│ flow_execution_id (FK) [Conversation]
│ retry_count                       │
│ error_message                     │
│ created_at / started_at / ...     │
└───────────────────────────────────┘
```

---

## 🔄 Status Flow

### FlowAutomation Status
```
draft ──► active/running ──► completed/failed/cancelled
   ▲                              │
   │◄─────── paused ◄─────────────┘
   │
   └── (pode voltar a draft se não foi iniciado)
```

### FlowAutomationExecution Status
```
queued ──► running ──► completed
             │
             ├─► paused
             └─► failed/cancelled
```

### FlowAutomationRecipient Status
```
pending ──► sent ──► delivered ──► read ──► completed
             │
             ├─► failed (retry)
             └─► (waiting for user response)
```

---

## 🛠 O Que Ainda Falta (TODO)

### Backend:
- [ ] Implementar background tasks (Celery) para processar executions
- [ ] Implementar retry logic com exponential backoff
- [ ] Suportar audience types: `tags`, `segment`, `uploaded`
- [ ] Suportar triggers: `cron`, `webhook`, `event`
- [ ] Implementar execution window (horário comercial)
- [ ] Criar endpoint para pausar/retomar execução
- [ ] Criar endpoint para listar executions e recipients
- [ ] Implementar websocket para real-time progress updates

### Frontend:
- [ ] Dashboard de automações (listagem, criação, edição)
- [ ] Executions page com histórico e progresso
- [ ] Recipients page com status individual
- [ ] Real-time status updates (WebSocket)
- [ ] Suportar triggers: scheduled, cron, webhook
- [ ] Suportar audience types: tags, segment, uploaded file

### Melhorias:
- [ ] Permitir custom fields do contato (attributes) no mapping
- [ ] Suportar variáveis dinâmicas (gerador de cupons, etc)
- [ ] Rate limiting mais sofisticado
- [ ] Webhook callbacks para eventos (sent, delivered, read)
- [ ] Exportar relatórios de execução

---

## 🎓 Resumo Visual

```
┌─ COMPONENTE ─┬─ RESPONSABILIDADE ─────────────────────────────┐
│ BulkDispatch │ UI para coleta, mapeamento e agendamento       │
├──────────────┼──────────────────────────────────────────────────┤
│ Models       │ FlowAutomation, Execution, Recipient            │
├──────────────┼──────────────────────────────────────────────────┤
│ Service      │ CRUD, start execution, resolve audience/vars    │
├──────────────┼──────────────────────────────────────────────────┤
│ API          │ POST/GET/PUT/DELETE automations e executions    │
├──────────────┼──────────────────────────────────────────────────┤
│ Background   │ [TODO] Celery: processa recipients em paralelo  │
├──────────────┼──────────────────────────────────────────────────┤
│ Database     │ Persiste automação, execução e rastreamento     │
└──────────────┴──────────────────────────────────────────────────┘
```

---

## 🚀 Como Usar Hoje

### Teste Pelo Frontend:

1. Abra um Flow no builder
2. Clique no botão "Disparar para lista" (abre BulkDispatchModal)
3. Cole números:
   ```
   5511999999999
   5511888888888
   ```
4. Mapeie variáveis (ex: `customer_name` ← contact.name)
5. Clique "Iniciar agora" ou agende
6. O disparo é criado e fila começa

### Teste Pelo cURL:

```bash
# 1. Criar contatos
curl -X POST http://localhost:8000/api/v1/contacts \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"whatsapp_id": "5511999999999", "name": "João"}'

# 2. Criar automação
curl -X POST http://localhost:8000/api/v1/flow-automations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Flow Dispatch",
    "chatbot_id": "uuid-chatbot",
    "flow_id": "uuid-flow",
    "whatsapp_number_id": "uuid-wa",
    "audience_type": "custom",
    "audience_config": {"contact_ids": ["uuid-contact"]},
    "variable_mapping": {"name": "{{contact.name}}"},
    "rate_limit_per_hour": 500
  }'

# 3. Iniciar execução
curl -X POST http://localhost:8000/api/v1/flow-automations/uuid-automation/start \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📝 Fichário de Arquivos

| Arquivo | Função |
|---------|--------|
| `/frontend/src/components/admin/builder/BulkDispatchModal.tsx` | UI modal |
| `/backend/app/models/flow_automation.py` | Models |
| `/backend/app/services/flow_automation_service.py` | Business logic |
| `/backend/app/api/v1/endpoints/flow_automations.py` | API routes |
| `/backend/app/schemas/flow_automation.py` | Pydantic schemas |
| `/backend/app/tasks/campaign_tasks.py` | [Referência] Similar pattern |

---

**Status:** ✅ Arquitetura implementada e funcional (API + DB + UI)
**Falta:** ⏳ Background processing (Celery) - TODO
