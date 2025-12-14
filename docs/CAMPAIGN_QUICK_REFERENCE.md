# 🚀 Campaign Execution - Quick Reference

## 📌 Resumo Executivo

O sistema de campanhas do PyTake permite disparar **mensagens WhatsApp em massa** com:
- ✅ Processamento paralelo em batches de 100 contatos
- ✅ Retry automático com exponential backoff (até 3 tentativas)
- ✅ Rate limiting respeitando limites da Meta (500/dia)
- ✅ Atualização de status em tempo real via webhooks
- ✅ Isolamento completo por organização (multi-tenancy)

---

## 🎯 Quick Start

### **1. Criar Campanha**
```bash
POST /api/v1/campaigns/
Content-Type: application/json
Authorization: Bearer {token}

{
  "name": "Black Friday 2024",
  "description": "Promo especial",
  "campaign_type": "broadcast",
  "whatsapp_number_id": "uuid-xxx",
  "message_type": "text",
  "message_content": {
    "text": "Olá {{contact.name}}, aproveite nossa promoção!"
  },
  "audience_type": "all_contacts",
  "messages_per_hour": 100,
  "delay_between_messages_seconds": 2,
  "retry_max_attempts": 3,
  "retry_base_delay": 60
}

Response: 201 Created
{
  "id": "campaign-uuid",
  "status": "draft",
  "total_recipients": 0,
  ...
}
```

### **2. Iniciar Campanha**
```bash
POST /api/v1/campaigns/{campaign_id}/start
Authorization: Bearer {token}

Response: 200 OK
{
  "campaign_id": "campaign-uuid",
  "status": "running",
  "started_at": "2024-12-14T10:00:00Z",
  "total_recipients": 1000,
  "message": "Campaign started. Task ID: celery-task-xxx"
}
```

### **3. Monitorar Progresso**
```bash
GET /api/v1/campaigns/{campaign_id}/progress
Authorization: Bearer {token}

Response: 200 OK
{
  "campaign_id": "campaign-uuid",
  "progress_percentage": 45.5,
  "messages_processed": 455,
  "messages_pending": 545,
  "estimated_remaining_time": "00:15:30",
  "current_status": "running",
  "last_update": "2024-12-14T10:15:00Z"
}
```

### **4. Obter Estatísticas**
```bash
GET /api/v1/campaigns/{campaign_id}/stats
Authorization: Bearer {token}

Response: 200 OK
{
  "total_recipients": 1000,
  "messages_sent": 950,
  "messages_delivered": 900,
  "messages_read": 450,
  "messages_failed": 50,
  "messages_pending": 0,
  "delivery_rate": 94.7,
  "read_rate": 50.0,
  "reply_rate": 12.6,
  "error_count": 5,
  "last_error_message": "Invalid phone number"
}
```

---

## 🔄 Fluxo Visual

```
┌─────────────────────┐
│  POST /campaigns    │
│    DRAFT            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  POST /start        │
│    RUNNING          │
└──────────┬──────────┘
           │
    ┌──────┴──────┐
    ▼             ▼
 CELERY        CELERY
execute_campaign (1x)
    │
    ├─ Busca contatos (ex: 1000)
    ├─ Divide em batches (ex: 10 batches de 100)
    └─ Cria CHORD (parallel + callback)
       │
       ├─ process_batch[0] ─┐
       ├─ process_batch[1] ─┤
       ├─ process_batch[2] ─┤
       └─ process_batch[9] ─┴─► finalize_campaign
                                    │
                                    ▼
                            ┌─────────────────┐
                            │  COMPLETED      │
                            │  (ou PAUSED)    │
                            └─────────────────┘
                                    │
                                    ▼
                            Meta Webhooks
                            (status updates)
                                    │
                            ┌───────┴───────┐
                            ▼               ▼
                        delivered        read
                        (campaign.
                         messages_
                         delivered++)
```

---

## 📋 Configuração Padrão

```python
# Em CampaignCreate schema:

retry_max_attempts: 3          # 1-10 tentativas
retry_base_delay: 60           # segundos (10-600)
retry_max_delay: 3600          # segundos (60-7200)

messages_per_hour: 100         # rate limit (1-1000)
delay_between_messages_seconds: 2  # entre msgs (0-60)

respect_opt_out: true          # skip opt-out contacts
skip_active_conversations: false  # skip contatos em conversa
```

---

## ⏱️ Timings Esperados

| Métrica | Valor |
|---------|-------|
| Envio por contato | ~500ms-2s |
| Delay configurável | 0-60s |
| Batch (100 contatos) | ~2-10 minutos |
| Campaign (1000 contatos) | ~20-100 minutos |
| Webhook status update | ~1-5 minutos |
| Retry delay total | ~6 minutos (60 + 120 + 240) |

---

## 🔍 Debugging

### **Ver Status da Campanha**
```bash
# No banco
psql $DATABASE_URL -c "SELECT id, status, total_recipients, messages_sent, messages_failed FROM campaigns WHERE id='uuid'"

# Via API
GET /api/v1/campaigns/{id}
GET /api/v1/campaigns/{id}/stats
GET /api/v1/campaigns/{id}/retry-stats
```

### **Ver Logs da Execução**
```bash
# Logs do Celery
docker compose logs celery -f

# Logs do Backend
docker compose logs backend -f | grep campaign

# Logs do Banco (se enabled)
# SELECT * FROM campaigns WHERE id='uuid' AND status='running'
# SELECT * FROM messages WHERE metadata->>'campaign_id'='uuid'
```

### **Pausar/Retomar Campanha**
```bash
# Pausar
POST /api/v1/campaigns/{campaign_id}/pause

# Retomar
POST /api/v1/campaigns/{campaign_id}/resume

# Cancelar (irreversível)
POST /api/v1/campaigns/{campaign_id}/cancel
```

---

## 🚨 Rate Limiting

### **Meta Cloud API**
- Daily: 500 msgs/dia
- Hourly: 100 msgs/hora
- Per-minute: 20 msgs/min

Se atingir: **Campaign pausa automaticamente** ⏸️

### **Evolution API (QR Code)**
- Delay: 500ms entre msgs
- Soft limit: 1000 msgs/hora (avoidance)

Se exceder: **Espera gracefully** (sem pausa)

---

## 📊 Estrutura de Retorno

### **Campaign Status**
```json
{
  "id": "uuid",
  "status": "running|paused|completed|failed",
  "total_recipients": 1000,
  "messages_sent": 950,
  "messages_delivered": 900,
  "messages_read": 450,
  "messages_failed": 50,
  "messages_pending": 0,
  "delivery_rate": 94.7,
  "read_rate": 50.0,
  "reply_rate": 12.6,
  "started_at": "2024-12-14T10:00:00Z",
  "completed_at": "2024-12-14T11:30:00Z",
  "last_error_message": null
}
```

### **Message Status per Contact**
```json
{
  "550e8400-e29b-41d4-a716-446655440000": {
    "contact_name": "João Silva",
    "contact_phone": "5585988887777",
    "status": "delivered",
    "message_id": "wamid.HBE...",
    "attempts": [
      {
        "attempt": 0,
        "success": true,
        "timestamp": "2024-12-14T10:00:00Z"
      }
    ]
  }
}
```

---

## 🔐 Permissões Requeridas

| Operação | Role(s) |
|----------|---------|
| CREATE | org_admin, agent |
| READ | authenticated |
| UPDATE | org_admin, agent |
| DELETE | org_admin |
| START/PAUSE | org_admin, agent |
| SCHEDULE | org_admin, agent |

---

## 🐛 Erros Comuns

### **"Campaign not found"**
- Verifique campaign_id
- Verifique organization_id (multi-tenancy)

### **"Cannot edit running campaign"**
- Pause antes de editar: POST /campaigns/{id}/pause
- Ou cancele: POST /campaigns/{id}/cancel

### **"Rate limit exceeded"**
- Campaign pausa automaticamente
- Aguarde (Daily limit reseta meia-noite)
- Ou retome após tempo: POST /campaigns/{id}/resume

### **"Invalid phone number" (retry failures)**
- Verifique número: SELECT * FROM contacts WHERE id='...'
- Marque como invalid: UPDATE contacts SET whatsapp_id=NULL
- Re-execute campanha sem esse contato

---

## 📚 Referências Rápidas

**Código**:
- Serviço: `app/services/campaign_service.py`
- Repositório: `app/repositories/campaign.py`
- Tasks: `app/tasks/campaign_tasks.py`
- Retry: `app/tasks/campaign_retry.py`
- Endpoints: `app/api/v1/endpoints/campaigns.py`

**Documentação**:
- Completa: `docs/CAMPAIGN_EXECUTION_SYSTEM.md`
- API: `/api/v1/docs` (Swagger)

**Banco**:
- Tabela: `campaigns`
- Indexes: `organization_id`, `status`, `created_at`
- JSONB: `message_statuses`, `message_content`, `template_variables`

---

## ✅ Checklist Pré-Disparo

- [ ] Campanha em estado "draft" ou "scheduled"
- [ ] Contatos-alvo validados (whatsapp_id not null)
- [ ] WhatsApp number ativo e com token válido
- [ ] Message content preenchido
- [ ] Rate limit não atingido
- [ ] Celery workers running (`celery -A app.tasks.celery_app worker`)
- [ ] Redis conectado (rate limiting)
- [ ] Webhooks da Meta configurados

---

**Última atualização**: Dezembro 14, 2025  
**Versão**: 1.0 (Completa)
