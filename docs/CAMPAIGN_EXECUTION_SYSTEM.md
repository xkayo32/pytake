# 🚀 Sistema de Execução de Campanhas - PyTake

**Documento Completo sobre o Fluxo de Disparo de Campanhas**

**Data**: Dezembro 14, 2025  
**Versão**: 1.0  
**Status**: ✅ Documentado

---

## 📑 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura](#arquitetura)
3. [Fluxo End-to-End](#fluxo-end-to-end)
4. [Componentes Principais](#componentes-principais)
5. [Retry Logic](#retry-logic)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks e Atualização de Status](#webhooks-e-atualização-de-status)
8. [Estrutura de Dados](#estrutura-de-dados)
9. [Estados da Campanha](#estados-da-campanha)
10. [Monitoramento e Métricas](#monitoramento-e-métricas)

---

## 🎯 Visão Geral

O sistema de execução de campanhas no PyTake permite o disparo em **massa de mensagens WhatsApp** com:

- ✅ **Processamento em Batch**: Divide contatos em lotes de 100
- ✅ **Execução Paralela**: Celery workers processam múltiplos batches simultaneamente
- ✅ **Retry Automático**: Exponential backoff com até 3 tentativas
- ✅ **Rate Limiting**: Respeita limites da Meta Cloud API (500/dia)
- ✅ **Tracking em Tempo Real**: Webhooks atualizam status instantaneamente
- ✅ **Multi-Tenancy**: Isolamento completo por organização

### Casos de Uso

| Tipo | Descrição | Exemplo |
|------|-----------|---------|
| **Broadcast** | Mensagem única para múltiplos contatos | Newsletter, Anúncio |
| **Drip** | Série de mensagens automáticas | Onboarding, Nurturing |
| **Trigger** | Acionada por evento/regra | Birthday, Abandono de carrinho |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    FastAPI (REST API)                           │
│  POST /api/v1/campaigns/{id}/start                              │
│  POST /api/v1/campaigns/{id}/schedule                           │
│  GET  /api/v1/campaigns/{id}/progress                           │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              CampaignService (Camada de Negócio)                │
│  • create_campaign()      • schedule_campaign()                 │
│  • update_campaign()      • start_campaign()                    │
│  • get_campaign_stats()   • pause_campaign()                    │
│  • _calculate_recipients()                                      │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│            CampaignRepository (Acesso a Dados)                  │
│  • get_by_id()            • get_by_organization()               │
│  • create()               • update()                            │
│  • get_scheduled_campaigns()  • start_campaign()                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│           Celery Tasks (Processamento Assíncrono)               │
│  • execute_campaign()     (Orchestrator)                        │
│  • process_batch()        (Batch Processing)                    │
│  • finalize_campaign()    (Finalização)                         │
└─────────────────────────────────────────────────────────────────┘
                            │
                    ┌───────┴───────┐
                    ▼               ▼
        ┌──────────────────┐  ┌──────────────────┐
        │ CampaignRetry    │  │ WhatsAppRate     │
        │ Manager          │  │ Limiter          │
        │ (Retry Logic)    │  │ (Rate Control)   │
        └──────────────────┘  └──────────────────┘
                    │               │
                    └───────┬───────┘
                            ▼
        ┌──────────────────────────────────┐
        │  Meta Cloud API / Evolution API  │
        │  (Envio Real de Mensagens)       │
        └──────────────────────────────────┘
                            │
                            ▼
        ┌──────────────────────────────────┐
        │  Webhooks da Meta                │
        │  (Atualização de Status)         │
        └──────────────────────────────────┘
```

---

## 🔄 Fluxo End-to-End

### **Fase 1: Inicialização (FastAPI)**

```
POST /api/v1/campaigns/{campaign_id}/start
├─ Autenticação & RBAC
├─ CampaignService.start_campaign(campaign_id, organization_id)
│  ├─ Valida status ∈ [draft, scheduled, paused]
│  ├─ Valida total_recipients > 0
│  ├─ Valida WhatsApp number ativo
│  ├─ Atualiza campaign.status = "running"
│  ├─ Atualiza campaign.started_at = now()
│  └─ Enfileira Celery task: execute_campaign.delay(campaign_id)
└─ Resposta: CampaignStartResponse {campaign_id, status, started_at, task_id}
   │
   └─→ CELERY QUEUE (Redis)
```

### **Fase 2: Orquestração (Celery - execute_campaign)**

```
execute_campaign(campaign_id)
│
├─ 1. CARREGA CAMPANHA DO DB
│  ├─ SELECT * FROM campaigns WHERE id = campaign_id
│  ├─ Valida status, WhatsApp number
│  └─ Log: "🚀 Starting campaign execution: {campaign_id}"
│
├─ 2. BUSCA CONTATOS-ALVO
│  ├─ Baseado em campaign.audience_type:
│  │  ├─ "all_contacts" → todos da organização
│  │  ├─ "tags" → contatos com tags específicas
│  │  ├─ "segment" → filtros JSONB customizados
│  │  └─ "custom_list" → contatos específicos
│  ├─ Aplica filtros adicionais:
│  │  ├─ Não deletados (deleted_at IS NULL)
│  │  ├─ Respeita opt-out (se enabled)
│  │  └─ Apenas com WhatsApp (whatsapp_id NOT NULL)
│  └─ Retorna lista de contatos filtrados
│
├─ 3. DIVIDE EM BATCHES (100 contatos por batch)
│  ├─ contacts[0:100]   → batch[0]
│  ├─ contacts[100:200] → batch[1]
│  ├─ contacts[200:300] → batch[2]
│  └─ ...
│  └─ Log: "📦 Campaign {id}: {N} batches created"
│
├─ 4. CRIA CHORD (Parallel Execution)
│  ├─ Batches (parallel):
│  │  ├─ process_batch(campaign_id, [contact_ids], batch_index=0)
│  │  ├─ process_batch(campaign_id, [contact_ids], batch_index=1)
│  │  └─ process_batch(campaign_id, [contact_ids], batch_index=N)
│  │
│  └─ Callback (após TODOS completarem):
│     └─ finalize_campaign(campaign_id)
│
├─ 5. ATUALIZA CAMPAIGN
│  ├─ campaign.status = "running"
│  ├─ campaign.started_at = now()
│  ├─ campaign.total_recipients = len(contacts)
│  ├─ campaign.messages_pending = len(contacts)
│  └─ campaign.messages_sent = 0
│
└─ RETORNA: {campaign_id, task_id, total_contacts, batches, ...}
   └─→ WORKERS PROCESSAM BATCHES EM PARALELO
```

### **Fase 3: Processamento de Batch (Celery - process_batch)**

Executado **N vezes em paralelo** (um por batch).

```
process_batch(campaign_id, contact_ids, batch_index)
│
├─ 1. VALIDA PRÉ-REQUISITOS
│  ├─ Carrega campaign
│  ├─ Verifica se foi pausada/cancelada
│  │  └─ Se sim: Retorna {skipped: N}
│  └─ Carrega WhatsApp number
│
├─ 2. INICIALIZA RATE LIMITER
│  ├─ Meta Cloud API:
│  │  ├─ Daily limit: 500 msgs/dia
│  │  ├─ Hourly limit: 100 msgs/hora
│  │  └─ Per-minute limit: 20 msgs/min
│  └─ Evolution API (QR):
│     ├─ Delay: 500ms entre msgs
│     └─ Soft limit: 1000 msgs/hora
│
├─ 3. PARA CADA CONTATO NO BATCH:
│  │
│  ├─→ VERIFICA RATE LIMIT
│  │  ├─ can_send_message() → true/false
│  │  ├─ Se false:
│  │  │  ├─ wait_time = await wait_if_needed()
│  │  │  ├─ Se wait_time > 5 min:
│  │  │  │  └─ PAUSA campaign (status="paused")
│  │  │  └─ Senão: await asyncio.sleep(wait_time)
│  │  └─ Log: "📊 WhatsApp {id} usage: {usage}%"
│  │
│  ├─→ ENVIA MENSAGEM COM RETRY
│  │  └─ retry_manager.send_message_with_retry(contact)
│  │     │
│  │     ├─ TENTATIVA 1 (attempt=0):
│  │     │  ├─ _send_single_message(contact)
│  │     │  │  ├─ message_text = campaign.message_content["text"]
│  │     │  │  ├─ Substitui variáveis: {{contact.name}}, etc
│  │     │  │  ├─ Se connection="official":
│  │     │  │  │  └─ MetaCloudAPI.send_text_message(to, text)
│  │     │  │  └─ Se connection="qr_code":
│  │     │  │     └─ EvolutionAPIClient.send_text(instance, number, text)
│  │     │  │
│  │     │  ├─ Response: {messages: [{id: "wamid.xxx"}]}
│  │     │  ├─ Salva Message no DB:
│  │     │  │  ├─ direction="outbound"
│  │     │  │  ├─ status="sent"
│  │     │  │  ├─ whatsapp_message_id=msg_id
│  │     │  │  └─ metadata={campaign_id, campaign_name}
│  │     │  │
│  │     │  └─► SUCCESS? Retorna (true, message_id) ✅
│  │     │
│  │     ├─ TENTATIVA 2 (se falhou attempt=1):
│  │     │  ├─ delay = 60 * (2 ^ 1) = 120 segundos
│  │     │  ├─ record_attempt(attempt=0, success=false, error=str)
│  │     │  ├─ await asyncio.sleep(120)
│  │     │  └─ Tenta novamente (voltar ao início)
│  │     │
│  │     └─ TENTATIVA 3 (se falhou attempt=2):
│  │        ├─ delay = 60 * (2 ^ 2) = 240 segundos
│  │        ├─ record_attempt(attempt=1, success=false, error=str)
│  │        ├─ await asyncio.sleep(240)
│  │        ├─ Tenta novamente
│  │        ├─ record_attempt(attempt=2, success=success, error=error)
│  │        │
│  │        └─► MAX RETRIES ATINGIDO
│  │           ├─ Se success: campaign.messages_sent++
│  │           └─ Se fail: campaign.messages_failed++
│  │
│  └─→ RATE LIMITING (delay entre mensagens)
│     └─ await asyncio.sleep(campaign.delay_between_messages_seconds)
│        └─ Padrão: 2 segundos (configurable: 0-60s)
│
├─ 4. ATUALIZA ESTATÍSTICAS DA CAMPANHA
│  ├─ messages_sent += count_successful
│  ├─ messages_failed += count_failed
│  ├─ messages_pending -= count_processed
│  ├─ error_count += count_errors
│  └─ last_error_message = last_error_str
│
└─ RETORNA: {
     campaign_id, batch_index, total, sent, failed, skipped,
     status, rate_limit_paused
   }
   └─→ CHORD AGUARDA TODOS OS BATCHES COMPLETAREM
```

### **Fase 4: Finalização (Celery - finalize_campaign)**

Executado **após todos os batches completarem**.

```
finalize_campaign(campaign_id, batch_results)
│
├─ 1. AGREGA RESULTADOS
│  ├─ total_sent = sum(batch.sent for batch in results)
│  ├─ total_failed = sum(batch.failed for batch in results)
│  ├─ total_skipped = sum(batch.skipped for batch in results)
│  └─ Log: "✅ All batches completed"
│
├─ 2. CALCULA TAXAS (rates)
│  ├─ delivery_rate = (messages_delivered / messages_sent) * 100
│  │  └─ Nota: Baseado em webhooks (pode ser 0 inicialmente)
│  ├─ read_rate = (messages_read / messages_delivered) * 100
│  └─ reply_rate = (unique_replies / messages_sent) * 100
│
├─ 3. DEFINE STATUS FINAL
│  ├─ Se total_failed == 0: status = "completed" ✅
│  ├─ Se total_failed > 0: status = "completed_with_errors" ⚠️
│  └─ Se rate_limit_paused: status = "paused" ⏸️
│
├─ 4. ATUALIZA CAMPAIGN NO DB
│  ├─ campaign.status = status_final
│  ├─ campaign.completed_at = now()
│  ├─ campaign.messages_pending = 0 (idealmente)
│  ├─ delivery_rate = calculated_rate
│  ├─ read_rate = calculated_rate
│  ├─ reply_rate = calculated_rate
│  └─ last_error_message = null (se sucesso)
│
└─ RETORNA: {campaign_id, status, completed_at, ...}
```

### **Fase 5: Atualização de Status (Webhooks)**

Contínua - Executada **quando Meta envia webhooks**.

```
POST /api/v1/webhooks/meta
│
├─ Webhook Event:
│  ├─ messages: Novo incoming/outgoing message
│  ├─ message_status: Status update (sent, delivered, read, failed)
│  └─ message_template_status: Template sync status
│
├─ Para cada status update:
│  ├─ Extrai: message_id, status, recipient_id, timestamp
│  ├─ Busca campaign pelo message_id
│  │
│  └─ CampaignRetryManager.update_message_status():
│     ├─ campaign.message_statuses[contact_id]["status"] = new_status
│     ├─ Incrementa counters:
│     │  ├─ messages_delivered++ (se status="delivered")
│     │  └─ messages_read++ (se status="read")
│     ├─ flag_modified() para JSONB update
│     └─ await db.commit()
│
└─ Log: "📝 Updated status: {contact_id} → {new_status}"
```

---

## 🔧 Componentes Principais

### **1. CampaignService**

**Arquivo**: `app/services/campaign_service.py`

```python
class CampaignService:
    # CRUD Operations
    async def create_campaign(data, org_id, user_id)
    async def get_campaign(campaign_id, org_id)
    async def list_campaigns(org_id, skip, limit, status)
    async def update_campaign(campaign_id, org_id, data)
    async def delete_campaign(campaign_id, org_id)
    
    # Campaign Actions
    async def schedule_campaign(campaign_id, org_id, scheduled_at)
    async def start_campaign(campaign_id, org_id)
    async def pause_campaign(campaign_id, org_id)
    async def resume_campaign(campaign_id, org_id)
    async def cancel_campaign(campaign_id, org_id)
    
    # Statistics
    async def get_campaign_stats(campaign_id, org_id)
    async def get_campaign_progress(campaign_id, org_id)
    
    # Helpers
    async def _calculate_recipients(org_id, audience_type, ...)
```

### **2. CampaignRepository**

**Arquivo**: `app/repositories/campaign.py`

```python
class CampaignRepository(BaseRepository[Campaign]):
    # Read Operations
    async def get_by_id(id, org_id)
    async def get_by_organization(org_id, skip, limit, status)
    async def count_by_organization(org_id, status)
    async def get_scheduled_campaigns(org_id, before_time)
    
    # Write Operations
    async def create(data)
    async def update(id, data)
    async def delete(id)
    async def soft_delete(id)
    
    # Campaign Specific
    async def start_campaign(id)
    async def pause_campaign(id)
    async def resume_campaign(id)
    async def cancel_campaign(id)
    async def update_progress(id, stats_dict)
```

### **3. Celery Tasks**

**Arquivo**: `app/tasks/campaign_tasks.py`

```python
# Main orchestrator
@celery_app.task(name="execute_campaign")
def execute_campaign(campaign_id) -> Dict[str, Any]:
    """Orquestra execução da campanha"""
    
# Batch processor (executado N vezes em paralelo)
@celery_app.task(name="process_batch")
def process_batch(campaign_id, contact_ids, batch_index) -> Dict[str, Any]:
    """Processa um batch de contatos"""
    
# Finalization callback
@celery_app.task(name="finalize_campaign")
def finalize_campaign(campaign_id, batch_results) -> Dict[str, Any]:
    """Finaliza execução após todos os batches"""
```

### **4. CampaignRetryManager**

**Arquivo**: `app/tasks/campaign_retry.py`

```python
class CampaignRetryManager:
    # Retry Logic
    def calculate_retry_delay(attempt: int) -> float
    async def send_message_with_retry(contact, whatsapp_number) -> (bool, str)
    
    # Status Tracking
    async def record_attempt(contact, attempt, success, error, message_id)
    async def update_message_status(contact_id, new_status, message_id)
    
    # Helpers
    def get_contact_status(contact_id) -> Dict
    def get_contact_attempts(contact_id) -> int
    def can_retry(contact_id) -> bool
    
    # Statistics
    def get_retry_statistics() -> Dict[str, Any]
```

### **5. WhatsAppRateLimiter**

**Arquivo**: `app/core/whatsapp_rate_limit.py`

```python
class WhatsAppRateLimiter:
    # Checking
    async def can_send_message() -> (bool, Optional[str])
    async def wait_if_needed() -> float
    async def get_current_usage() -> Dict
    
    # Recording
    async def record_message_sent()
    
    # Internal
    async def _check_meta_limits() -> (bool, Optional[str])
    async def _check_evolution_limits() -> (bool, Optional[str])
    async def _get_counter(redis_key) -> int
```

---

## 🔁 Retry Logic

### **Exponential Backoff Formula**

```
delay = min(base_delay * (2 ^ attempt), max_delay)

Defaults:
├─ base_delay: 60 segundos
├─ max_delay: 3600 segundos (1 hora)
└─ max_attempts: 3

Exemplo (3 tentativas):
├─ Tentativa 0: Falha
├─ Delay 1: 60 * (2^0) = 60 segundos
├─ Tentativa 1: Falha
├─ Delay 2: 60 * (2^1) = 120 segundos
├─ Tentativa 2: Falha
├─ Delay 3: 60 * (2^2) = 240 segundos
└─ Tentativa 3: FALHA FINAL ❌
```

### **Implementação**

```python
async def send_message_with_retry(contact, whatsapp_number):
    attempts = get_contact_attempts(contact.id)
    
    while attempts < campaign.retry_max_attempts:
        try:
            success, message_id, error = await _send_single_message(...)
            
            if success:
                await record_attempt(success=true, message_id=msg_id)
                return True, message_id
            
            # Failed - retry
            attempts += 1
            if attempts < campaign.retry_max_attempts:
                delay = calculate_retry_delay(attempts)
                await asyncio.sleep(delay)
                continue
            else:
                await record_attempt(success=false, error=error)
                return False, None
                
        except Exception as e:
            await record_attempt(success=false, error=str(e))
            attempts += 1
            if attempts < campaign.retry_max_attempts:
                delay = calculate_retry_delay(attempts)
                await asyncio.sleep(delay)
            else:
                return False, None
    
    return False, None
```

---

## 📊 Rate Limiting

### **Meta Cloud API (Official)**

```
Limites:
├─ Daily: 500 mensagens/dia
├─ Hourly: 100 mensagens/hora
└─ Per-minute: 20 mensagens/minuto

Strategy: Hard limits (pausa se atingir)

Tracking:
└─ Redis keys:
   ├─ whatsapp:ratelimit:{id}:daily
   ├─ whatsapp:ratelimit:{id}:hourly
   └─ whatsapp:ratelimit:{id}:minute
```

### **Evolution API (QR Code)**

```
Limites:
├─ Delay: 500ms (0.5 segundos) entre mensagens
└─ Soft limit: 1000 mensagens/hora (avoidance)

Strategy: Graceful delay (espera e continua)

Implementation:
└─ await asyncio.sleep(0.5)
```

### **Behavior When Rate Limit Hit**

```python
if not can_send_message():
    wait_time = await rate_limiter.wait_if_needed()
    
    if wait_time > 300:  # Mais de 5 minutos
        # Pausa campanha
        campaign.pause()
        campaign.last_error_message = (
            f"Rate limit exceeded: {reason}. "
            f"Campaign paused. Wait {wait_time/60:.1f} minutes."
        )
        break  # Para este batch
    else:
        # Espera o tempo necessário
        await asyncio.sleep(wait_time)
        continue  # Tenta novamente
```

---

## 🔔 Webhooks e Atualização de Status

### **Meta Webhook Events**

```python
POST /api/v1/webhooks/meta

Body:
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "123...",
    "changes": [{
      "value": {
        "metadata": {...},
        "messages": [{...}],           # Incoming messages
        "statuses": [{                 # Status updates
          "id": "wamid.HBE...",        # Message ID
          "status": "delivered",       # sent|delivered|read|failed
          "timestamp": 1702563615,
          "recipient_id": "5585988887777"
        }],
        "message_template_statuses": [{...}]
      },
      "field": "messages"
    }]
  }]
}
```

### **Status Update Flow**

```
Webhook received
├─ Extract: message_id, status, recipient_id, timestamp
├─ Find campaign by message_id
│
└─ CampaignRetryManager.update_message_status(contact_id, status):
   ├─ campaign.message_statuses[contact_id]["status"] = new_status
   ├─ Update counters:
   │  ├─ messages_delivered++ (se status="delivered")
   │  ├─ messages_read++ (se status="read")
   │  └─ messages_failed++ (se status="failed")
   ├─ flag_modified() para JSONB
   └─ await db.commit()
```

### **Status Flow por Mensagem**

```
pending
  ├─→ sent (após envio bem-sucedido)
  │    ├─→ delivered (webhook da Meta)
  │    │    └─→ read (usuário leu)
  │    └─→ failed (erro na entrega)
  └─→ retrying (retry em progresso)
```

---

## 📋 Estrutura de Dados

### **Campaign Model**

```python
campaigns (tabela PostgreSQL)
├── id: UUID (primary key)
├── organization_id: UUID (FK) [MULTI-TENANCY]
├── created_by_user_id: UUID (FK)
├── whatsapp_number_id: UUID (FK)
├── template_id: UUID (FK)
│
├── INFORMAÇÕES
├── name: String(255)
├── description: Text
├── campaign_type: Enum (broadcast, drip, trigger)
├── status: Enum (draft, scheduled, running, paused, completed, ...)
│
├── TIMING
├── scheduled_at: DateTime
├── started_at: DateTime
├── completed_at: DateTime
├── paused_at: DateTime
├── cancelled_at: DateTime
│
├── CONTEÚDO
├── message_type: String (text, image, ...)
├── message_content: JSONB {text, url, caption, ...}
├── template_variables: JSONB {var1: value1, ...}
│
├── PÚBLICO-ALVO
├── audience_type: Enum (all_contacts, tags, segment, custom_list)
├── target_tag_ids: UUID[] (array)
├── target_contact_ids: UUID[] (array)
├── segment_filters: JSONB (query filters)
│
├── CONFIGURAÇÃO DE ENVIO
├── messages_per_hour: Integer (default: 100, 1-1000)
├── delay_between_messages_seconds: Integer (default: 2, 0-60)
├── respect_opt_out: Boolean (default: true)
├── skip_active_conversations: Boolean (default: false)
│
├── RETRY CONFIGURATION
├── retry_max_attempts: Integer (default: 3, 1-10)
├── retry_base_delay: Integer (default: 60s, 10-600s)
├── retry_max_delay: Integer (default: 3600s, 60-7200s)
│
├── ESTATÍSTICAS
├── total_recipients: Integer
├── messages_sent: Integer
├── messages_delivered: Integer
├── messages_read: Integer
├── messages_failed: Integer
├── messages_pending: Integer
├── replies_count: Integer
├── unique_replies_count: Integer
├── opt_outs_count: Integer
├── error_count: Integer
│
├── TAXAS
├── delivery_rate: Float (%)
├── read_rate: Float (%)
├── reply_rate: Float (%)
├── estimated_cost: Float
├── actual_cost: Float
│
├── TRACKING
├── message_statuses: JSONB {contact_id: status_obj, ...}
├── errors: JSONB Array [{contact_id, error, timestamp, ...}, ...]
├── last_error_message: Text
│
├── AUDITORIA
├── created_at: DateTime (auto)
├── updated_at: DateTime (auto)
└── deleted_at: DateTime (soft delete)
```

### **message_statuses (JSONB Structure)**

```json
{
  "550e8400-e29b-41d4-a716-446655440000": {
    "contact_id": "550e8400-e29b-41d4-a716-446655440000",
    "contact_name": "João Silva",
    "contact_phone": "5585988887777",
    "status": "delivered",
    "message_id": "wamid.HBE...",
    "created_at": "2024-12-14T10:00:00Z",
    "last_update": "2024-12-14T10:00:15Z",
    "attempts": [
      {
        "attempt": 0,
        "timestamp": "2024-12-14T10:00:00Z",
        "success": true,
        "error": null,
        "message_id": "wamid.HBE..."
      }
    ]
  },
  "660e8400-e29b-41d4-a716-446655440001": {
    "contact_id": "660e8400-e29b-41d4-a716-446655440001",
    "contact_name": "Maria Santos",
    "contact_phone": "5585988887778",
    "status": "failed",
    "message_id": null,
    "created_at": "2024-12-14T10:01:00Z",
    "last_update": "2024-12-14T10:02:40Z",
    "attempts": [
      {
        "attempt": 0,
        "timestamp": "2024-12-14T10:01:00Z",
        "success": false,
        "error": "Invalid phone number",
        "message_id": null
      },
      {
        "attempt": 1,
        "timestamp": "2024-12-14T10:02:00Z",
        "success": false,
        "error": "Invalid phone number",
        "message_id": null
      },
      {
        "attempt": 2,
        "timestamp": "2024-12-14T10:02:40Z",
        "success": false,
        "error": "Invalid phone number",
        "message_id": null
      }
    ]
  }
}
```

---

## 🎯 Estados da Campanha

```
┌──────────┐
│  DRAFT   │ (Inicial - editável)
└────┬─────┘
     │
     ├──────────────┬──────────────────┐
     ▼              ▼                   ▼
┌──────────┐  ┌────────────┐     ┌──────────┐
│SCHEDULED │  │ START IMMED │     │ DELETED  │
└────┬─────┘  └─────┬──────┘     └──────────┘
     │              │
     ├──────────────┤
     ▼
┌──────────┐
│ RUNNING  │ (Em execução)
└────┬─────┘
     │
     ├──────┬────────┬──────────────────────┐
     ▼      ▼        ▼                      ▼
┌─────┐ ┌──────┐ ┌──────────┐     ┌────────────────┐
│PAUSE│ │CANCEL│ │COMPLETED │     │COMPLETED_ERRORS│
└─────┘ └──────┘ └──────────┘     └────────────────┘
  ▲
  │ (pode retomar)
  └─ RUNNING
```

**Transições Válidas**:
- `draft` → `scheduled`, `running`, `deleted`
- `scheduled` → `running`, `deleted`
- `running` → `paused`, `cancelled`, `completed`
- `paused` → `running`, `cancelled`, `deleted`
- `cancelled` → (final, sem retorno)
- `completed` → (final, sem retorno)

---

## 📈 Monitoramento e Métricas

### **Endpoints de Status**

```
GET /api/v1/campaigns/{id}/stats
└─ CampaignStats:
   ├─ total_recipients
   ├─ messages_sent, delivered, read, failed, pending
   ├─ delivery_rate, read_rate, reply_rate
   ├─ error_count
   └─ estimated_cost, actual_cost

GET /api/v1/campaigns/{id}/progress
└─ CampaignProgress:
   ├─ progress_percentage
   ├─ messages_processed
   ├─ estimated_remaining_time
   ├─ current_status
   └─ last_update

GET /api/v1/campaigns/{id}/retry-stats
└─ RetryStatistics:
   ├─ total_contacts
   ├─ successful_on_first
   ├─ required_retries
   ├─ retry_rate (%)
   ├─ error_breakdown
   └─ detailed_error_logs
```

### **Cálculos de Taxa**

```python
# Delivery Rate
delivery_rate = (messages_delivered / messages_sent) * 100

# Read Rate
read_rate = (messages_read / messages_delivered) * 100

# Reply Rate
reply_rate = (unique_replies / messages_sent) * 100

# Success Rate
success_rate = (messages_delivered / total_recipients) * 100

# Error Rate
error_rate = (messages_failed / total_recipients) * 100
```

### **Exemplo de Cálculo**

```
Total Recipients: 1000
├─ Sent: 950 (95%)
│  ├─ Delivered: 900 (94.7% of sent)
│  ├─ Read: 450 (50% of delivered)
│  ├─ Failed: 5 (0.5% of total)
│  └─ Pending: 45 (ainda aguardando webhook)
│
└─ Responses:
   ├─ Total Replies: 120
   ├─ Unique Contacts: 110
   └─ Reply Rate: 12.6% (120/950)

TAXAS:
├─ Delivery Rate: 94.7%
├─ Read Rate: 50%
├─ Reply Rate: 12.6%
└─ Success Rate: 90% (900/1000)
```

### **Logging e Debugging**

```
📊 Campaign Execution Logs:

✅ 2024-12-14 10:00:00 🚀 Starting campaign: abc-123
✅ 2024-12-14 10:00:01 📊 Fetched 1000 contacts
✅ 2024-12-14 10:00:02 📦 Created 10 batches
✅ 2024-12-14 10:00:05 📦 Processing batch 0 (100 contacts)
⚠️  2024-12-14 10:01:23 📊 WhatsApp usage: 5% (Meta API)
✅ 2024-12-14 10:02:45 ✅ Batch 0 completed: 98/100 sent
✅ 2024-12-14 10:02:46 📦 Processing batch 1 (100 contacts)
❌ 2024-12-14 10:05:10 ❌ Failed to send to 5585988887779: Invalid phone
⚠️  2024-12-14 10:12:30 ⚠️ Rate limit hit: Daily limit exceeded
⚠️  2024-12-14 10:12:31 ⏸️  Campaign paused. Wait 15.3 minutes.
✅ 2024-12-14 10:28:00 🎉 Campaign completed: 950/1000 sent
```

---

## 🛠️ Troubleshooting

### **Campaign Stuck in Running**

```
Causas:
├─ Worker Celery morreu
├─ Batch task falhou sem callback
└─ Database deadlock

Solução:
├─ Verificar status do Celery: docker-compose logs celery
├─ Verificar banco: SELECT * FROM campaigns WHERE status='running'
├─ Pausar e resumir: POST /campaigns/{id}/pause → POST /campaigns/{id}/resume
└─ Se bloqueado: UPDATE campaigns SET status='paused' WHERE id='...'
```

### **Rate Limit Paused Campaign**

```
Log: "Rate limit exceeded: Daily limit reached (500/day)"

Solução:
├─ Esperar até meia-noite (reset diário)
├─ Ou resumir amanhã: POST /campaigns/{id}/resume
└─ Monitor: GET /campaigns/{id}/progress
```

### **Retry Failed Permanently**

```
Log: "❌ All 3 attempts failed for contact: Invalid phone number"

Causas:
├─ Número inválido
├─ Contato bloqueado/opt-out
├─ WhatsApp API erro temporário

Solução:
├─ Revisar número: SELECT * FROM contacts WHERE id='...'
├─ Marcar como invalid: UPDATE contacts SET whatsapp_id=NULL
├─ Verificar logs de erro: campaign.message_statuses[contact_id]
└─ Reenviar manualmente se necessário
```

---

## 📚 Referências

| Arquivo | Descrição |
|---------|-----------|
| `app/services/campaign_service.py` | Camada de negócio |
| `app/repositories/campaign.py` | Acesso a dados |
| `app/tasks/campaign_tasks.py` | Celery tasks |
| `app/tasks/campaign_retry.py` | Retry logic |
| `app/core/whatsapp_rate_limit.py` | Rate limiting |
| `app/api/v1/endpoints/campaigns.py` | REST endpoints |
| `app/models/campaign.py` | ORM model |
| `app/schemas/campaign.py` | Pydantic schemas |

---

## ✅ Checklist de Validação

- [x] Documentação do fluxo completo
- [x] Componentes mapeados
- [x] Retry logic explicado
- [x] Rate limiting documentado
- [x] Webhooks descritos
- [x] Estrutura de dados detalhada
- [x] Estados documentados
- [x] Métricas explicadas
- [x] Troubleshooting incluído

**Status**: ✅ Documentação Completa  
**Data**: Dezembro 14, 2025  
**Versão**: 1.0
