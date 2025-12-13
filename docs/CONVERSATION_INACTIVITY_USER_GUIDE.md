# Conversation Inactivity Timeout - Guia de Uso

**Implementado em**: 13/12/2025 | **Commit**: 69adcca | **Status**: ✅ Production Ready

---

## 🎯 O que isso faz?

Monitora conversas inativas (cliente não responde) e executa ações automáticas:
- ✅ Enviar mensagem de aviso (15 min antes)
- ✅ Transferir para agente (após timeout)
- ✅ Fechar conversa (após timeout)
- ✅ Rotear para flow diferente (FAQ, escalação, etc)

**Exemplo Real**:
```
Customer vai ao chatbot → Faz uma pergunta sobre produto
Bot responde com Question Node: "Qual é o seu email?"
Customer sai da conversa...

[50 min depois] → Bot envia: "Ainda estou aqui! Qual é seu email?"
[60 min depois] → Bot transfere para agente humano
[Agente vê conversa na fila com status "queued"]
```

---

## ⚙️ Configuração Global (Padrão para Todos os Flows)

**Arquivo**: `.env`

```bash
# Tempo máximo sem resposta (minutos)
CONVERSATION_INACTIVITY_TIMEOUT_MINUTES=60

# Com que frequência verificar conversas inativas
CONVERSATION_INACTIVITY_CHECK_INTERVAL_MINUTES=5

# Ação padrão (transfer|close|send_reminder|fallback_flow)
CONVERSATION_INACTIVITY_DEFAULT_ACTION=transfer
```

**Exemplo com valores custom**:
```bash
# 30 minutos de timeout
CONVERSATION_INACTIVITY_TIMEOUT_MINUTES=30

# Verificar a cada 2 minutos
CONVERSATION_INACTIVITY_CHECK_INTERVAL_MINUTES=2

# Padrão é fechar conversa
CONVERSATION_INACTIVITY_DEFAULT_ACTION=close
```

---

## 🎛️ Configuração por Flow (Override)

Cada Flow pode ter suas próprias configurações via `inactivity_settings`:

### Via API (PUT /flows/{flow_id})

```bash
curl -X PUT http://localhost:8000/api/v1/flows/{flow_id} \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Flow",
    "inactivity_settings": {
      "enabled": true,
      "timeout_minutes": 30,
      "send_warning_at_minutes": 25,
      "warning_message": "Vou desconectar em 5 minutos se não responder",
      "action": "transfer",
      "fallback_flow_id": null
    }
  }'
```

### Via Database (Admin)

```sql
UPDATE flows 
SET inactivity_settings = '{
  "enabled": true,
  "timeout_minutes": 45,
  "send_warning_at_minutes": 40,
  "warning_message": "Última chance de responder!",
  "action": "close",
  "fallback_flow_id": null
}'::jsonb
WHERE id = 'flow-uuid-here' 
AND deleted_at IS NULL;
```

---

## 📋 Configuração Detalhada

### Campo: `inactivity_settings` (JSONB)

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `enabled` | Boolean | `true` | Ativa/desativa monitoramento para este flow |
| `timeout_minutes` | Integer | 60 (global) | Minutos sem mensagem antes de ação |
| `send_warning_at_minutes` | Integer \| null | `null` | Enviar aviso X minutos antes (opcional) |
| `warning_message` | String \| null | `null` | Texto customizado do aviso |
| `action` | String | "transfer" | O que fazer ao timeout: `transfer`, `close`, `send_reminder`, `fallback_flow` |
| `fallback_flow_id` | UUID \| null | `null` | UUID do flow para rotear (se action=fallback_flow) |

### Exemplos de Configuração

#### 1️⃣ **Quick Support** (30 min com aviso)

```json
{
  "enabled": true,
  "timeout_minutes": 30,
  "send_warning_at_minutes": 25,
  "warning_message": "Estou aqui! Sua resposta é importante. Em 5 minutos encerrarei.",
  "action": "close",
  "fallback_flow_id": null
}
```

**Resultado**:
- T=25min → Envia aviso
- T=30min → Fecha conversa

---

#### 2️⃣ **VIP Support** (2 horas, transferência silenciosa)

```json
{
  "enabled": true,
  "timeout_minutes": 120,
  "send_warning_at_minutes": null,
  "warning_message": null,
  "action": "transfer",
  "fallback_flow_id": null
}
```

**Resultado**:
- T=120min → Silenciosamente transfere para agente
- Sem aviso prévio

---

#### 3️⃣ **FAQ Escalation** (20 min, depois FAQ, depois fechar)

```json
{
  "enabled": true,
  "timeout_minutes": 20,
  "send_warning_at_minutes": 18,
  "warning_message": "Vou conectar você com nossa FAQ automatizada",
  "action": "fallback_flow",
  "fallback_flow_id": "12345678-1234-1234-1234-123456789abc"
}
```

**Resultado**:
- T=18min → Aviso + redireciona para FAQ Flow
- T=20min+ → Se ainda inativo, encerra FAQ

---

#### 4️⃣ **Keep-Alive** (Apenas relembretes, nunca fecha)

```json
{
  "enabled": true,
  "timeout_minutes": 999999,
  "send_warning_at_minutes": 15,
  "warning_message": "Ainda aguardando sua resposta!",
  "action": "send_reminder",
  "fallback_flow_id": null
}
```

**Resultado**:
- A cada 15 minutos → Envia lembrete
- Nunca fecha ou transfere (timeout impossível)

---

#### 5️⃣ **Desabilitar Completamente**

```json
{
  "enabled": false,
  "timeout_minutes": 60,
  "send_warning_at_minutes": null,
  "warning_message": null,
  "action": "transfer",
  "fallback_flow_id": null
}
```

**Resultado**:
- Nenhuma ação de inatividade
- Flow sempre espera resposta indefinidamente

---

## 🔄 Actions (O que acontece no timeout)

### 1. `transfer` - Transferir para Agente

```
Before:
├─ is_bot_active = true
├─ status = open
└─ no queue

After:
├─ is_bot_active = false
├─ status = queued
├─ queue_id = {department_queue}
└─ queued_at = now
```

**Mensagem enviada**:
> "Você será atendido por um agente em breve. Obrigado pela paciência!"

---

### 2. `close` - Fechar Conversa

```
Before:
├─ status = open
└─ closed_at = null

After:
├─ status = closed
└─ closed_at = now
```

**Mensagem enviada**:
> "Sua conversa foi encerrada por inatividade. Entre em contato conosco novamente se precisar!"

---

### 3. `send_reminder` - Apenas Lembrete

```
Before:
├─ status = open
└─ context_variables = {...}

After:
├─ status = open (sem mudança)
└─ context_variables["_inactivity_warning_sent_..."] = now
```

**Mensagem enviada**: Custom ou padrão
> "Ainda estou aqui! Qual seria sua próxima pergunta?"

⚠️ **Nota**: Enviada APENAS UMA VEZ (evita spam)

---

### 4. `fallback_flow` - Rotear para Outro Flow

```
Before:
├─ active_flow_id = {current_flow}
├─ current_node_id = {node}
└─ context_variables = {...large...}

After:
├─ active_flow_id = {fallback_flow_id}
├─ current_node_id = null
└─ context_variables = {} (limpo!)
```

**Uso**: FAQ automatizado, escalação inteligente, etc

---

## 📊 Como Funciona Internamente

### Celery Task: `check_conversation_inactivity`

**Rodada a cada**: 5 minutos (configurável)

**Lógica**:

```
1. Encontra conversas ativas (status: open|active, is_bot_active=true)

2. Para cada conversa:
   a) Pega last_inbound_message_at (últimas mensagem do cliente)
   b) Calcula: tempo_inativo = agora - last_inbound_message_at
   c) Carrega flow.inactivity_settings (ou usa global)
   
3. Se inativo > timeout_minutes:
   → Executa action (transfer|close|send_reminder|fallback_flow)
   
4. Se inativo > send_warning_at_minutes (e < timeout):
   → Envia warning_message
   → Marca como enviado (evita duplicatas)
```

### Logs de Execução

```
[INFO] 🕐 Starting conversation inactivity check task...
[INFO] Found 42 active conversations to check for inactivity
[INFO] ⏰ Conversation abc-123 inactive for 45.3 minutes (timeout: 60 minutes)
[INFO] ↔️ Transferring conversation abc-123 to agent due to inactivity
[INFO] ✅ Conversation abc-123 assigned to queue
[INFO] 📊 Inactivity check completed: 42 conversations checked, 5 actions executed
```

---

## 🧪 Testando a Feature

### 1. Verificar que Celery está Rodando

```bash
# Ver workers
docker compose logs celery-worker | grep "ready to accept"

# Ver beat scheduler
docker compose logs celery-beat | grep "Scheduler:"
```

### 2. Trigger Manual da Task

```bash
docker compose exec backend celery -A app.tasks.celery_app \
  call app.tasks.conversation_timeout_tasks.check_conversation_inactivity
```

### 3. Simular Conversa Inativa

```bash
# 1. Criar conversation com last_inbound_message_at antigo
psql -U pytake -d pytake_dev -c "
UPDATE conversations 
SET last_inbound_message_at = NOW() - INTERVAL '61 minutes'
WHERE id = 'conversation-uuid';
"

# 2. Rodar task
docker compose exec backend celery -A app.tasks.celery_app \
  call app.tasks.conversation_timeout_tasks.check_conversation_inactivity

# 3. Verificar resultado
psql -U pytake -d pytake_dev -c "
SELECT id, status, is_bot_active, queue_id 
FROM conversations 
WHERE id = 'conversation-uuid';
"
```

### 4. Verificar Banco de Dados

```bash
# Ver inactivity_settings do flow
psql -U pytake -d pytake_dev -c "
SELECT name, inactivity_settings 
FROM flows 
WHERE deleted_at IS NULL 
LIMIT 3;
"
```

---

## 🔐 Segurança & Multi-Tenancy

✅ **Multi-tenancy**: Task filtra por `organization_id`
✅ **RBAC**: Transfer apenas para queues da mesma organização
✅ **Soft Delete**: Respeita conversas deletadas
✅ **Context Isolation**: Cada org vê apenas suas conversas

---

## 📈 Monitoring & Alertas (Futuro)

Métricas que podem ser adicionadas:

```python
# Por Flow
- Total timeouts
- Avg time to timeout
- % transferred vs closed
- Most common inactivity reason

# Por Organization
- Inactivity rate (%)
- Avg conversation duration
- Agent workload (transferred conversations)

# By Action
- Transfer success rate
- Close acceptance rate
- Fallback flow bounce rate
```

---

## 🚀 Próximas Melhorias

1. **UI Flow Editor**: Adicionar aba "Inactivity Settings" no designer
2. **Webhooks**: Chamar externa API ao timeout
3. **Metrics Dashboard**: Gráficos de inatividade
4. **Smart Routing**: Transferir para melhor agente baseado em skills
5. **Custom Actions**: Suportar scripts customizados
6. **WebSocket**: Notificação real-time ao agente

---

## ❓ FAQ

**P: E se a conversa for com agente, não bot?**
A: Task ignora (is_bot_active=false). Agente responsável.

**P: Posso desabilitar por flow específico?**
A: Sim, `"enabled": false` no inactivity_settings.

**P: E se não responder o aviso?**
A: Executa action normalmente no timeout_minutes.

**P: Mensagem de warning é enviada mais de uma vez?**
A: Não, flag `_inactivity_warning_sent_...` previne spam.

**P: Qual o máximo de timeout?**
A: 999999 minutos (~694 anos) é efectivamente infinito.

**P: Funciona offline?**
A: Não, precisa de Celery worker rodando.

---

## 📞 Suporte

**Logs**: `docker compose logs celery-beat | grep conversation_inactivity`
**Migration Status**: `docker compose exec backend alembic current`
**Database**: Schema adicionado em `20251213_inactivity`

