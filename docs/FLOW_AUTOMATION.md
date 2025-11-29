# 🚀 Flow Automation - Sistema Completo

**Data:** 17 de Novembro de 2025
**Status:** ✅ **PRODUCTION READY**
**Autor:** Kayo Carvalho Fernandes

---

## 🎯 Visão Geral

O PyTake possui um sistema completo de **Flow Automations** que permite enviar disparos de fluxos para múltiplos contatos com variáveis personalizadas. É um sistema **proativo** (push) vs reativo (pull).

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLOW AUTOMATION SYSTEM                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  API: Flow Automation Endpoints                                  │
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

### 1️⃣ **API Endpoints**

**Localização:** `/backend/app/services/flow_automation_service.py`

**Responsabilidades:**
- Resolver audiência (contact_ids)
- Resolver variáveis (template → valores reais)
- Criar Execution + Recipients
- Enfileirar background tasks (Celery)

### 3️⃣ **Celery Tasks** (`flow_automation_tasks.py`)

**Localização:** `/backend/app/tasks/flow_automation_tasks.py`

- ✅ `process_flow_automation_execution` - Processa execução completa
- ✅ `process_flow_recipient` - Executa flow para um contato
- ✅ `retry_process_flow_recipient` - Retry com exponential backoff
- ✅ `finalize_flow_automation_execution` - Finaliza e calcula stats

**Características:**
- Processamento paralelo com Celery Chord
- Rate limiting por batch
- Retry automático com backoff
- Rastreamento em 3 níveis (automation, execution, recipient)

### 4️⃣ **Database Models** (`flow_automation.py`)

**Localização:** `/backend/app/models/flow_automation.py`

```
✅ FlowAutomationSchedule
   ├─ Recurrence types: once, daily, weekly, monthly, cron, custom
   ├─ Execution window (horário comercial)
   ├─ Blackout dates (feriados/bloqueios)
   ├─ Timezone support
   └─ Auto-calculates next_scheduled_at

✅ FlowAutomationScheduleException
   ├─ Skip (não executar no período)
   ├─ Reschedule (agendar para outra data)
   └─ Modify (mudar config temporariamente)
```

---

## 🚀 Quick Start

### 1️⃣ Ambiente Pronto?

```bash
cd /home/administrator/pytake

# Ver status dos containers
podman compose ps

# Se não estiverem rodando:
podman compose up -d

# Aplicar migrations
podman exec pytake-backend alembic upgrade head
```

### 2️⃣ Testar Criação Básica

```bash
# 1. Obter IDs necessários
# - chatbot_id: ID de um chatbot existente
# - flow_id: ID de um flow desse chatbot
# - whatsapp_number_id: ID de um número WhatsApp

# 2. Listar chatbots
curl -X GET http://localhost:8000/api/v1/chatbots \
  -H "Authorization: Bearer $TOKEN" | jq '.items[0].id'

# 3. Criar automation (disparo único, agora)
curl -X POST http://localhost:8000/api/v1/flow-automations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Automation",
    "chatbot_id": "UUID_CHATBOT",
    "flow_id": "UUID_FLOW",
    "whatsapp_number_id": "UUID_WA_NUMBER",
    "audience_type": "custom",
    "audience_config": {
      "contact_ids": ["UUID_CONTACT_1", "UUID_CONTACT_2"]
    },
    "variable_mapping": {
      "customer_name": "{{contact.name}}",
      "discount": "10%"
    },
    "rate_limit_per_hour": 100
  }'
```

### 3️⃣ Iniciar Execução

```bash
# Iniciar a automação
curl -X POST http://localhost:8000/api/v1/flow-automations/{AUTOMATION_ID}/start \
  -H "Authorization: Bearer $TOKEN"
```

### 4️⃣ Verificar Status

```bash
# Ver status da automação
curl -X GET http://localhost:8000/api/v1/flow-automations/{AUTOMATION_ID} \
  -H "Authorization: Bearer $TOKEN"

# Ver execuções
curl -X GET http://localhost:8000/api/v1/flow-automations/{AUTOMATION_ID}/executions \
  -H "Authorization: Bearer $TOKEN"
```

---

## 📋 API Endpoints

### Flow Automations
- `POST /flow-automations` - Criar automação
- `GET /flow-automations` - Listar automações
- `GET /flow-automations/{id}` - Detalhes da automação
- `PUT /flow-automations/{id}` - Atualizar automação
- `DELETE /flow-automations/{id}` - Deletar automação

### Execuções
- `POST /flow-automations/{id}/start` - Iniciar execução
- `GET /flow-automations/{id}/executions` - Listar execuções
- `GET /executions/{id}` - Detalhes da execução

### Agendamento
- `POST /flow-automations/{id}/schedule` - Criar agendamento
- `GET /flow-automations/{id}/schedule` - Ver agendamento
- `PUT /flow-automations/{id}/schedule` - Atualizar agendamento
- `DELETE /flow-automations/{id}/schedule` - Remover agendamento

---

## ⚙️ Configurações Avançadas

### Rate Limiting
- `rate_limit_per_hour`: Limite de mensagens por hora
- `batch_delay_seconds`: Delay entre batches
- `execution_window_start/end`: Janela de execução (horário comercial)

### Agendamento
- `recurrence_type`: once, daily, weekly, monthly, cron, custom
- `execution_window`: Respeita horário comercial
- `blackout_dates`: Pula datas bloqueadas
- `timezone`: Suporte a diferentes timezones

### Variáveis
- `{{contact.name}}`: Nome do contato
- `{{contact.phone}}`: Telefone do contato
- `{{contact.email}}`: Email do contato
- Valores constantes: "10%", "Olá!", etc.

---

## 🔍 Monitoramento

### Status Tracking
- **Automation Level**: Status geral da automação
- **Execution Level**: Status de cada execução (batch)
- **Recipient Level**: Status por destinatário individual

### Métricas Disponíveis
- Total de destinatários
- Enviados/Delivered/Read/Completed
- Taxa de falha
- Tempo médio de processamento

---

## 🐛 Troubleshooting

### Problemas Comuns

1. **Rate Limiting**: Verificar `rate_limit_per_hour`
2. **Horário Comercial**: Verificar `execution_window`
3. **Variáveis**: Verificar mapeamento de variáveis
4. **Celery**: Verificar se workers estão rodando

### Logs
```bash
# Ver logs do Celery
podman logs pytake-celery

# Ver logs do backend
podman logs pytake-backend
```

---

## 📚 Referências

- [Documentação da API WhatsApp Business](https://developers.facebook.com/docs/whatsapp/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [SQLAlchemy Models](https://sqlalchemy.org/)

---
**Implementado por:** Kayo Carvalho Fernandes
**Data:** 17 de Novembro de 2025
**Versão:** 1.0</content>
<parameter name="filePath">/home/administrator/pytake/docs/FLOW_AUTOMATION.md