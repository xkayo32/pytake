# Timeout & Inatividade de Conversas em Fluxos

**Pergunta Original**: Temos configuração para cliente ficar sem interação por tempo X, receber mensagem de timeout e se demorar responder finalizar conversa automaticamente?

**Status**: ✅ **PARCIALMENTE IMPLEMENTADO**
- ✅ Question Timeout (1 hora) implementado
- ❌ Inatividade de conversa automática NÃO está implementada
- ❌ Auto-close por inatividade NÃO está configurável

---

## 📊 O Que Existe

### 1. Question Node Timeout (1 Hora)

**Localização**: `whatsapp_service.py` linhas 466-510

**Funcionamento**:
```
Cliente recebe Question Node
  ↓
Bot armazena timestamp da pergunta em context_variables[_question_timestamp_{node_id}]
  ↓
Cliente envia resposta 1 hora depois
  ↓
Sistema detecta elapsed > 1 hora
  ↓
Bot envia: "O tempo para resposta expirou. Vou encaminhar você para um agente humano."
  ↓
Transferência automática para agente humano
  ↓
Conversa muda para handoff
```

**Código Relevante**:
```python
# whatsapp_service.py linha 466
# 🛡️ PROTEÇÃO: Timeout de resposta (1 hora)
context_vars = conversation.context_variables or {}
timeout_key = f"_question_timestamp_{current_node.node_id}"
question_timestamp = context_vars.get(timeout_key)

if not question_timestamp:
    # Primeira mensagem deste question node - salvar timestamp
    context_vars[timeout_key] = datetime.utcnow().isoformat()
else:
    # Verificar se passou mais de 1 hora
    question_time = datetime.fromisoformat(question_timestamp)
    elapsed = datetime.utcnow() - question_time

    if elapsed > timedelta(hours=1):
        logger.warning(f"⏰ Timeout de resposta! Passou {elapsed.total_seconds()//60:.0f} minutos")
        
        # Enviar mensagem de timeout
        timeout_msg = "O tempo para resposta expirou. Vou encaminhar você para um agente humano."
        await self._send_error_message(conversation, timeout_msg)
        
        # Transferir para agente humano
        await self._execute_handoff(conversation, handoff_data)
```

**Limitações**:
- ❌ Tempo **HARDCODED** em 1 hora (não configurável)
- ❌ Aplica-se apenas a **Question Nodes** específicos
- ❌ Quando client fica 1h, ele transfere para agente (não fecha conversa)

### 2. Campos Disponíveis para Rastrear Inatividade

**Modelo Conversation** tem campos para rastreamento:

| Campo | Tipo | Propósito |
|-------|------|----------|
| `last_message_at` | DateTime | Última mensagem (inbound/outbound) |
| `last_inbound_message_at` | DateTime | Última mensagem do cliente |
| `last_message_from_contact_at` | DateTime | Última mensagem recebida do cliente |
| `last_message_from_agent_at` | DateTime | Última mensagem do agente |
| `window_expires_at` | DateTime | 24h window do WhatsApp |
| `context_variables` | JSONB | Pode armazenar timestamps customizados |

**Exemplo de rastreamento**:
```python
# Ao receber mensagem do cliente
conversation.last_inbound_message_at = datetime.utcnow()

# Ao enviar mensagem do bot
conversation.last_message_at = datetime.utcnow()

# Diferença = tempo de inatividade do cliente
time_since_last_contact = datetime.utcnow() - conversation.last_inbound_message_at
```

---

## ❌ O Que NÃO Existe

### 1. Auto-Timeout Configurável no Flow

**NÃO HÁ** configuração na interface Flow Editor para:
- Timeout de resposta customizável
- Ações automáticas por inatividade (mensagens de retenção, escalação, etc)
- TTL de conversa

### 2. Tarefa Automática de Inatividade

**NÃO HÁ** tarefa background/cron que:
- Monitora conversas inativas por tempo X
- Envia reminder messages
- Fecha conversas automaticamente
- Escalona para agent

**Arquivos de tarefas existentes**:
- `tasks/campaign_tasks.py` - Campanhas
- `tasks/campaign_retry.py` - Retry de campanhas
- `tasks/flow_automation_tasks.py` - Execução automática de flows
- ❌ **NÃO tem**: `tasks/conversation_timeout_tasks.py` ou similar

### 3. Configuração no Modelo Flow

**Modelo Flow** (`models/chatbot.py` linhas 133-200) NÃO tem campos para:
```python
# Não existem:
inactivity_timeout_minutes: int  # Timeout de inatividade
inactivity_actions: List[str]    # Ações antes de fechar
auto_close_after_hours: int      # Fechar conversa após X horas
warning_message: str             # Mensagem de aviso antes de fechar
```

### 4. Configuração no WhatsAppNumber

**WhatsAppNumber** (`models/whatsapp_number.py` linhas 74-130) NÃO tem:
```python
# Não existem:
default_inactivity_timeout_minutes: int
auto_close_inactive: bool
```

---

## 🔄 Pipeline Atual para Timeouts

```
┌─────────────────────────────────────────────────────────────────┐
│                   Message Arrives                               │
│                  (Customer → Bot)                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              _process_incoming_message()                        │
│           whatsapp_service.py:4254-4440                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Load Active Flow                                   │
│         (if conversation.active_flow_id set)                    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Is Current Node a Question?                             │
│    (current_node.node_type == "question")                       │
└─────────────────────────────────────────────────────────────────┘
                   │                      │
          YES      ▼                      ▼      NO
      ┌───────────────────────┐   ┌──────────────────┐
      │  Check Question       │   │  Continue Flow   │
      │  Timeout (1 hour)     │   │  Normally        │
      │                       │   │                  │
      │ elapsed > 1h?         │   └──────────────────┘
      └───────────────────────┘
         │              │
      YES │              │ NO
         ▼              ▼
    ┌──────────────┐ ┌──────────────────┐
    │ TIMEOUT!     │ │ Process Response │
    │ Transfer to  │ │ Advance to       │
    │ Agent        │ │ Next Node        │
    └──────────────┘ └──────────────────┘
```

---

## 🛠️ Como Implementar Timeout por Inatividade

### Opção 1: Simples (Sem BD)

**Usar apenas `context_variables` para rastrear**:

```python
# Ao executar Question Node
node_data = {
    "question": "Qual é seu nome?",
    "inactivity_timeout_minutes": 15,  # ✨ NOVO
    "inactivity_reminder_message": "Ainda estou aqui, sua resposta é importante!",
    "inactivity_action": "transfer"  # transfer, close, fallback
}

# Em _process_user_response_and_advance()
timeout_key = f"_question_inactivity_{current_node.node_id}"
if not context_vars.get(timeout_key):
    context_vars[timeout_key] = datetime.utcnow().isoformat()
    # Salvar
else:
    # Checar timeout
    last_question_time = datetime.fromisoformat(context_vars[timeout_key])
    timeout_minutes = node_data.get("inactivity_timeout_minutes", 60)
    
    if (datetime.utcnow() - last_question_time).total_seconds() > timeout_minutes * 60:
        # TIMEOUT! Executar ação
        if node_data.get("inactivity_action") == "transfer":
            await self._execute_handoff(conversation, {...})
        elif node_data.get("inactivity_action") == "close":
            conversation.status = "closed"
            await db.commit()
```

### Opção 2: Moderada (Com DB + Settings)

**Adicionar campos ao Flow**:

```python
# models/chatbot.py - classe Flow
class Flow(Base, ...):
    # ... campos existentes ...
    
    # ✨ NOVOS CAMPOS
    default_inactivity_timeout_minutes = Column(
        Integer, 
        default=60,  # 1 hora padrão
        nullable=False
    )
    
    inactivity_settings = Column(
        JSONB,
        nullable=False,
        default={
            "enabled": True,
            "timeout_minutes": 60,
            "send_reminder": True,
            "reminder_message": "Ainda estou aqui, sua resposta é importante!",
            "auto_action": "transfer",  # transfer, close, fallback_flow
            "fallback_flow_id": None  # Se auto_action = fallback_flow
        },
        server_default=text("'{\"enabled\": true, \"timeout_minutes\": 60}'::jsonb")
    )
```

**Migração Alembic**:
```python
# alembic/versions/XXXXXX_add_inactivity_settings_to_flows.py

def upgrade() -> None:
    op.add_column('flows', sa.Column(
        'inactivity_settings',
        sa.JSON(),
        nullable=False,
        server_default='{"enabled": true, "timeout_minutes": 60}'
    ))

def downgrade() -> None:
    op.drop_column('flows', 'inactivity_settings')
```

### Opção 3: Completa (Com Celery Task)

**Adicionar tarefa background**:

```python
# tasks/conversation_timeout_tasks.py

from celery import shared_task
from datetime import datetime, timedelta

@shared_task(bind=True)
def check_conversation_inactivity():
    """
    Task que roda a cada X minutos e:
    1. Encontra conversas inativas por > timeout configurado
    2. Envia reminder ou escalação
    3. Fecha automaticamente se configurado
    """
    from app.repositories.conversation import ConversationRepository
    
    async def run():
        # 1. Encontrar conversas ativas com bot
        conversations = await conversation_repo.get_inactive_conversations(
            hours=1,  # Inativo por > 1 hora
            organization_id=org_id
        )
        
        # 2. Para cada uma, verificar configuração do flow
        for conv in conversations:
            flow = await flow_repo.get_by_id(conv.active_flow_id)
            settings = flow.inactivity_settings
            
            if settings.get("enabled"):
                # 3. Executar ação
                if settings.get("auto_action") == "transfer":
                    # Transferir para agente
                    await conversation_service.assign_to_queue(conv.id)
                
                elif settings.get("auto_action") == "close":
                    # Fechar conversa
                    await conversation_repo.update(conv.id, {
                        "status": "closed",
                        "closed_at": datetime.utcnow()
                    })
                
                elif settings.get("auto_action") == "send_reminder":
                    # Enviar mensagem de retenção
                    reminder_msg = settings.get("reminder_message", "...")
                    await whatsapp_service._send_message(conv, reminder_msg)
```

**Registrar em Celery Beat**:
```python
# core/celery_config.py
app.conf.beat_schedule = {
    'check-conversation-inactivity': {
        'task': 'app.tasks.conversation_timeout_tasks.check_conversation_inactivity',
        'schedule': crontab(minute='*/5'),  # A cada 5 minutos
    },
}
```

---

## 📋 Resumo de Decisões

| Aspecto | Status | Detalhes |
|--------|--------|----------|
| **Question Timeout** | ✅ Existe | 1 hora (hardcoded), transfere para agente |
| **Inatividade de Conversa** | ❌ Não existe | Sem auto-close por inatividade |
| **Configuração em Flow** | ❌ Não existe | Não há UI/API para isso |
| **Tarefa Background** | ❌ Não existe | Sem cron/celery para monitorar |
| **Campos no Banco** | ✅ Parcial | Tem `last_inbound_message_at`, faltam settings |

---

## 💡 Recomendação

**Se você quer implementar agora**:

1. **Comece com Opção 1** (simples, sem DB):
   - Adiciona parâmetros ao Question Node (UI)
   - Implanta timeout na lógica de resposta existente
   - Tempo: ~2-3 horas
   - Esforço: Baixo

2. **Próximo passo: Opção 2** (com settings no Flow):
   - Adiciona campos ao modelo Flow
   - Tarefa de migração Alembic
   - Tempo: ~4-5 horas
   - Esforço: Médio

3. **Avançado: Opção 3** (com Celery Task):
   - Monitora conversas em background
   - Múltiplas ações automáticas
   - Tempo: ~6-8 horas
   - Esforço: Alto (requer Celery expertise)

---

## 🔗 Arquivos Relacionados

- `backend/app/services/whatsapp_service.py` (linhas 466-510) - Question Timeout atual
- `backend/app/models/chatbot.py` (linhas 133-200) - Flow model
- `backend/app/models/conversation.py` (linhas 100-200) - Conversation model com timestamps
- `backend/app/tasks/` - Arquivos de tarefas background
- `backend/alembic/versions/` - Migrações

