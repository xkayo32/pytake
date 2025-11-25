# 🚀 Quick Start: Flow Automation com Agendamento

## 1️⃣ Ambiente Pronto?

```bash
cd /home/administrator/pytake

# Ver status dos containers
podman compose ps

# Se não estiverem rodando:
podman compose up -d

# Aplicar migrations
podman exec pytake-backend alembic upgrade head
```

## 2️⃣ Testar Criação Básica

### A. Criar um Flow Automation (sem agendamento)

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

# Salvar o ID da automação criada
export AUTOMATION_ID="uuid-returned"
```

### B. Iniciar Disparo Agora

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/start \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test_mode": false}'

# Response: Execution ID
export EXECUTION_ID="uuid-returned"
```

### C. Ver Estatísticas

```bash
curl -X GET http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/stats \
  -H "Authorization: Bearer $TOKEN" | jq '.'
```

---

## 3️⃣ Testar Agendamento Avançado

### A. Criar Schedule (Diário às 09:00)

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recurrence_type": "daily",
    "start_date": "2025-11-20T09:00:00Z",
    "start_time": "09:00:00",
    "recurrence_config": {
      "type": "daily",
      "interval": 1
    },
    "execution_window_start": "09:00:00",
    "execution_window_end": "18:00:00",
    "execution_timezone": "America/Sao_Paulo",
    "skip_weekends": true,
    "skip_holidays": true,
    "is_active": true
  }'

export SCHEDULE_ID="uuid-returned"
```

### B. Ver Preview de Próximas Execuções

```bash
curl -X GET "http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule/preview?num_executions=10&days_ahead=90" \
  -H "Authorization: Bearer $TOKEN" | jq '.next_executions[]'

# Output:
# [
#   {
#     "scheduled_at": "2025-11-20T09:00:00Z",
#     "recurrence_type": "daily",
#     ...
#   },
#   {
#     "scheduled_at": "2025-11-21T09:00:00Z",
#     ...
#   }
# ]
```

### C. Adicionar Exceção (Skip Black Friday)

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule/exceptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_id": "'$SCHEDULE_ID'",
    "exception_type": "skip",
    "start_date": "2025-11-25T00:00:00Z",
    "end_date": "2025-11-26T23:59:59Z",
    "reason": "Black Friday - Special campaign"
  }'

# Verificar preview novamente
# Notar que 25-26 serão puladas
```

### D. Modificar Schedule (Aumentar velocidade Black Friday)

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule/exceptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_id": "'$SCHEDULE_ID'",
    "exception_type": "modify",
    "start_date": "2025-11-28T00:00:00Z",
    "end_date": "2025-11-30T23:59:59Z",
    "reason": "Cyber Monday - 3x speed",
    "modified_config": {
      "rate_limit_per_hour": 300,
      "max_concurrent_executions": 150
    }
  }'
```

---

## 4️⃣ Testar Diferentes Recorrências

### Recorrência Semanal (Seg, Qua, Sex)

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recurrence_type": "weekly",
    "start_date": "2025-11-20T14:00:00Z",
    "start_time": "14:00:00",
    "recurrence_config": {
      "type": "weekly",
      "days": ["MON", "WED", "FRI"],
      "interval": 1
    }
  }'
```

### Recorrência Mensal (Dia 15)

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recurrence_type": "monthly",
    "start_date": "2025-11-15T10:00:00Z",
    "start_time": "10:00:00",
    "recurrence_config": {
      "type": "monthly",
      "day": 15,
      "interval": 1
    }
  }'
```

### Recorrência Cron (Segunda-Sexta 09:00)

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recurrence_type": "cron",
    "start_date": "2025-11-20T09:00:00Z",
    "recurrence_config": {
      "type": "cron",
      "expression": "0 9 * * MON-FRI"
    }
  }'
```

### Recorrência Customizada (Datas Específicas)

```bash
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recurrence_type": "custom",
    "start_date": "2025-11-20T09:00:00Z",
    "recurrence_config": {
      "type": "custom",
      "dates": [
        "2025-11-25T09:00:00Z",
        "2025-11-26T14:00:00Z",
        "2025-12-01T10:00:00Z"
      ]
    }
  }'
```

---

## 5️⃣ Próximos Passos (TODO)

### Backend:

```bash
# 1. Implementar Scheduler (Cron Job)
# Locaçao: backend/app/tasks/flow_automation_scheduler.py
# Função: Checar diariamente próximas execuções e enfileirar tasks

# 2. Iniciar Celery Workers
podman exec pytake-backend celery -A app.tasks.celery_app worker -l info

# 3. Iniciar Celery Beat (Scheduler)
podman exec pytake-backend celery -A app.tasks.celery_app beat -l info
```

### Frontend (UI Components):

```bash
# 1. Dashboard: /admin/flow-automations
# - Listar automações
# - Ver próxima execução
# - Status geral

# 2. Schedule Editor: /admin/flow-automations/{id}/schedule
# - Recurrence type selector
# - Config específica por tipo
# - Calendar preview
# - Add/edit/delete exceptions

# 3. Execution History: /admin/flow-automations/{id}/executions
# - Listar todas execuções
# - Status de cada recipient
# - Estatísticas agregadas
```

---

## 📝 Exemplo Completo: Black Friday Campaign

### Cenário:
- Enviar disparo diariamente às 09:00
- **Mas:** Black Friday (25-26 Nov) → 3x mais rápido
- **E:** Cyber Monday (28 Nov) → reschedule para 14:00

### Passo-a-Passo:

```bash
# 1. Criar automação base
curl -X POST http://localhost:8000/api/v1/flow-automations \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Black Friday Campaign",
    "chatbot_id": "uuid-chatbot",
    "flow_id": "uuid-flow",
    "whatsapp_number_id": "uuid-wa",
    "audience_type": "all",
    "variable_mapping": {
      "campaign": "Black Friday 2025"
    },
    "rate_limit_per_hour": 1000
  }' > automation.json

export AUTOMATION_ID=$(jq -r '.id' automation.json)

# 2. Criar schedule diário às 09:00
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recurrence_type": "daily",
    "start_date": "2025-11-01T09:00:00Z",
    "start_time": "09:00:00",
    "recurrence_config": {"type": "daily", "interval": 1},
    "execution_window_start": "09:00:00",
    "execution_window_end": "18:00:00",
    "skip_weekends": false,
    "skip_holidays": false
  }' > schedule.json

export SCHEDULE_ID=$(jq -r '.id' schedule.json)

# 3. Exception 1: Black Friday - 3x velocidade
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule/exceptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_id": "'$SCHEDULE_ID'",
    "exception_type": "modify",
    "start_date": "2025-11-25T00:00:00Z",
    "end_date": "2025-11-26T23:59:59Z",
    "reason": "Black Friday - 3x speed",
    "modified_config": {
      "rate_limit_per_hour": 3000,
      "max_concurrent_executions": 150
    }
  }'

# 4. Exception 2: Cyber Monday - reschedule 09:00 → 14:00
curl -X POST http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule/exceptions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "schedule_id": "'$SCHEDULE_ID'",
    "exception_type": "reschedule",
    "start_date": "2025-11-28T09:00:00Z",
    "reason": "Cyber Monday - moved to 14:00",
    "rescheduled_to": "2025-11-28T14:00:00Z"
  }'

# 5. Ver preview final
curl -X GET "http://localhost:8000/api/v1/flow-automations/$AUTOMATION_ID/schedule/preview?num_executions=10" \
  -H "Authorization: Bearer $TOKEN" | jq '.next_executions[] | {scheduled_at, reason}'

# Output esperado:
# 2025-11-20 09:00 - Normal
# 2025-11-21 09:00 - Normal
# 2025-11-24 09:00 - Normal
# [2025-11-25/26] - MODIFIED (3x speed)
# [2025-11-27] - SKIP (se configurado)
# 2025-11-28 14:00 - RESCHEDULED (14:00 em vez de 09:00)
# 2025-11-29 09:00 - Normal
# ...
```

---

## 🐛 Debugging

### Ver logs de tasks
```bash
podman logs -f pytake-backend | grep -E "flow_automation|process_flow"
```

### Verificar banco de dados
```bash
# Entrar no psql
podman exec -it pytake-postgres psql -U pytake -d pytake

# Ver automations
SELECT id, name, status, total_executions FROM flow_automations LIMIT 5;

# Ver schedules
SELECT id, automation_id, recurrence_type, next_scheduled_at FROM flow_automation_schedules;

# Ver executions
SELECT id, automation_id, status, total_recipients FROM flow_automation_executions ORDER BY created_at DESC LIMIT 5;

# Ver recipients
SELECT id, execution_id, phone_number, status FROM flow_automation_recipients ORDER BY created_at DESC LIMIT 10;
```

### Testar calculo de próxima execução
```python
# Python repl no backend
from app.services.flow_automation_schedule_service import FlowAutomationScheduleService
from datetime import datetime

# Criar service
service = FlowAutomationScheduleService(db)

# Testar cálculo
schedule = ...  # carregar do DB
next_exec = await service.calculate_next_execution(schedule)
print(f"Próxima execução: {next_exec}")
```

---

## ✅ Checklist de Verificação

- [ ] Database migrations aplicadas
- [ ] Flow Automation criado com sucesso
- [ ] Schedule criado e próxima execução calculada
- [ ] Exception adicionada e preview atualizado
- [ ] Celery tasks configuradas
- [ ] Workers rodando
- [ ] Scheduler (beat) rodando
- [ ] Primeiro disparo executado

---

## 📚 Referências

- `FLOW_AUTOMATION_ANALYSIS.md` - Análise geral do sistema
- `FLOW_AUTOMATION_IMPLEMENTATION.md` - Implementação completa
- API Swagger: http://localhost:8000/api/v1/docs

---

**Você pronto para começar? 🚀**
