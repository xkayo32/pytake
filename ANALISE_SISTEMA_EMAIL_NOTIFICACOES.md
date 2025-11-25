# 📧 Análise Completa: Sistema de Email e Notificações do PyTake

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Versão:** 1.0  
**Status:** ✅ Análise Completa

---

## 📋 Sumário Executivo

O PyTake possui uma **arquitetura híbrida parcialmente implementada** para notificações e email:

| Componente | Status | Observações |
|-----------|--------|-------------|
| **Notificações (Frontend)** | ✅ Completo | Toast + Modal providers implementados |
| **Infrastructure Email** | ⚠️ Parcial | Celery + Redis configurados, mas sem serviço de email |
| **Backend Email Service** | ❌ Não Existe | Nenhum serviço de email implementado |
| **Database Schema** | ❌ Não Existe | Nenhuma tabela de notificações/preferências |
| **WebSocket Notifications** | ✅ Existe | Manager implementado para real-time |
| **Task Queue** | ✅ Configurado | Celery + Redis prontos, sem workers ativos |

---

## 🏗️ ARQUITETURA ATUAL

### 1. FRONTEND - Notificações (Implementado ✅)

#### Componentes Principais
```
frontend/src/
├── components/
│   ├── NotificationProvider.tsx    # Wrapper provedor
│   └── ui/
│       ├── toast.tsx              # UI Toast
│       └── modal.tsx              # UI Modal
├── contexts/
│   ├── ToastContext.tsx           # Estado Toast
│   └── ModalContext.tsx           # Estado Modal
└── hooks/
    └── useNotification.ts         # Hooks customizados
```

#### Funcionalidades
- **Toast Notifications**: success, error, info, warning
- **Modal Dialogs**: alert, confirm, dangerous, custom
- **Context API**: Gerenciamento de estado centralizado
- **Auto-dismiss**: Toasts com duração configurável
- **Actions**: Suporte a botões de ação em toasts

#### Código de Uso
```typescript
const { success, error } = useNotifications();
const { alert, confirm, dangerous } = useDialog();

// Toast
success('Operação concluída!');
error('Erro ao salvar');

// Modal
await confirm('Tem certeza?', 'Esta ação é irreversível', 
  () => handleDelete()
);
```

---

### 2. BACKEND - Infrastructure (Parcialmente Implementado ⚠️)

#### Configuração Disponível
**Arquivo:** `backend/app/core/config.py`

```python
# Redis Configuration
REDIS_HOST: str = "localhost"
REDIS_PORT: int = 6379
REDIS_DB: int = 0
REDIS_PASSWORD: Optional[str] = None
REDIS_URL: Optional[RedisDsn] = None

# Celery Task Queue (Built from Redis)
CELERY_BROKER_URL: Optional[str] = None      # redis://host:port/1
CELERY_RESULT_BACKEND: Optional[str] = None  # redis://host:port/2
```

#### Docker Compose
```yaml
redis:
  image: redis:7-alpine
  command: redis-server --requirepass {PASSWORD}
  ports:
    - "6379:6379"
  # ✅ Running
```

#### Dependências Instaladas
```
celery>=5.3.0          # Task queue framework
redis>=5.0.0           # Redis client
email-validator>=2.0.0 # Email validation
```

#### Status Atual
- ✅ Redis container rodando
- ✅ Celery configurado
- ❌ Sem workers Celery ativos
- ❌ Sem tarefas de email definidas

---

### 3. WEBSOCKET - Real-Time Notifications (✅ Existe)

**Arquivo:** `backend/app/core/websocket_manager.py`

```python
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def send_personal_message(self, message: str, websocket: WebSocket)
    async def broadcast(self, message: str)
```

**Uso:** Notificações real-time de eventos (conversas, assignments, etc)

---

### 4. EMAIL SYSTEM - Não Implementado ❌

**O que FALTA:**

1. ❌ **Email Service** (`backend/app/services/email_service.py`)
2. ❌ **Email Templates** (HTML/TXT templates)
3. ❌ **Email Models** (database schema)
4. ❌ **SMTP Configuration** (env vars)
5. ❌ **Email Routes/Endpoints** 
6. ❌ **Background Tasks** (Celery tasks)
7. ❌ **Notification Preferences** (user settings)

---

## 📊 ANÁLISE DETALHADA

### 1. Frontend - Notificações (✅ Implementado)

#### Arquitetura
```
User Action
    ↓
API Call (api.ts)
    ↓
Response Handler
    ↓
useNotifications() hook
    ↓
ToastContext / ModalContext
    ↓
UI Components (Toast/Modal)
    ↓
Rendered to Screen
```

#### Tipo de Toasts
| Tipo | Duração | Uso |
|------|---------|-----|
| success | 4s | Operações bem-sucedidas |
| error | 4s | Erros de validação/API |
| info | 4s | Informações gerais |
| warning | 4s | Avisos/confirmações |
| action | Custom | Com botão de ação |

#### Exemplo Completo Frontend
```typescript
// pages/admin/campaigns.tsx
import { useNotifications } from '@hooks/useNotification';

export default function CampaignsPage() {
  const { success, error } = useNotifications();

  const handleCreate = async (data: CampaignData) => {
    try {
      const response = await fetch(getApiUrl('/campaigns'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Erro ao criar campanha');
      
      success('Campanha criada com sucesso!');
      // Refresh list...
    } catch (err) {
      error((err as Error).message);
    }
  };

  return (
    // JSX
  );
}
```

#### Multi-Tenancy & RBAC
- ✅ NotificationProvider envolve toda a app
- ✅ Sem dependência de organização
- ✅ Uso em qualquer role

---

### 2. Backend - Notificações (Parcialmente Implementado)

#### O que Existe
```python
# backend/app/api/v1/endpoints/websocket.py
await websocket_manager.send_personal_message(
    json.dumps({
        "type": "conversation_assigned",
        "data": conversation_data
    }),
    websocket
)

# Casos de uso:
# - Conversa atribuída a agente
# - Mensagem recebida
# - Fila atualizada
# - Campanha iniciada
```

#### Limitações
- ✅ Apenas WebSocket (real-time)
- ❌ Sem persistência (se desconectar, perde)
- ❌ Sem notificações por email
- ❌ Sem notificações por SMS/WhatsApp
- ❌ Sem histórico

---

### 3. Task Queue - Celery (Configurado, Não Ativo)

#### Configuração
```python
# backend/app/core/config.py
CELERY_BROKER_URL = "redis://default:password@redis:6379/1"
CELERY_RESULT_BACKEND = "redis://default:password@redis:6379/2"
```

#### Status
- ✅ Redis rodando
- ❌ Sem arquivo `celery_app.py`
- ❌ Sem workers inicializados
- ❌ Sem tasks definidas

#### Para Ativar (Será coberto em próximas seções)
```bash
# Seria necessário:
podman exec pytake-backend celery -A app.celery_app worker --loglevel=info
```

---

## 🎯 CASOS DE USO IDENTIFICADOS

### 1. Notificações de Usuário
```
Evento Backend → Celery Task → Múltiplos Canais:
  ├── WebSocket (real-time)
  ├── Email (background)
  ├── SMS (via integração)
  └── In-App (persistente)
```

### 2. Notificações de Sistema
```
- Nova conversa recebida
- Conversa atribuída
- SLA próximo de vencer
- Falha em campanha
- Novo ticket criado
```

### 3. Preferences Usuário
```
user_notification_preferences (tabela):
  - user_id
  - organization_id
  - notification_type (email, sms, push, websocket)
  - channel (whatsapp, email, sms, in_app)
  - enabled (bool)
  - quiet_hours (start_time, end_time)
```

---

## 📈 DIAGRAMA DE FLUXO - RECOMENDADO

```
┌─────────────────────────────────────────────────────────────────┐
│                      EVENTO BACKEND                             │
│            (nova conversa, sla, etc)                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────┐
        │   Conversa Service / Business      │
        │   (Identifica necessidade notif)   │
        └────────────┬───────────────────────┘
                     │
        ┌────────────▼───────────────────────┐
        │  Notification Service              │
        │  - Valida preferências usuário    │
        │  - Filtra por organização         │
        │  - Respeita quiet hours           │
        └────────────┬───────────────────────┘
                     │
        ┌────────────▼───────────────────────┐
        │  Task Dispatcher (Celery)          │
        │  - Enfileira tarefa async         │
        └────────────┬───────────────────────┘
                     │
         ┌───────────┼───────────┬──────────────┐
         │           │           │              │
         ▼           ▼           ▼              ▼
    ┌────────┐  ┌────────┐  ┌─────────┐   ┌────────┐
    │WebSocket│  │ Email  │  │WhatsApp │   │In-App  │
    │(Real-   │  │(Async) │  │(Async)  │   │Persist │
    │ time)   │  │        │  │         │   │        │
    └────────┘  └────────┘  └─────────┘   └────────┘
         │           │           │              │
         └───────────┴───────────┴──────────────┘
                     │
                     ▼
         Frontend Recebe Notificação
```

---

## ⚠️ PROBLEMAS IDENTIFICADOS

### Crítico 🔴
1. **Sem persistência de notificações**: Se WebSocket cair, usuário perde tudo
2. **Sem email backend**: Nenhuma forma de notificar via email
3. **Sem banco de dados**: Nenhuma tabela para preferências

### Alto 🟠
4. **Sem workers Celery**: Tasks enfieiradas mas não processadas
5. **Sem validação de email**: Nem rota para testar
6. **Sem throttling**: Risco de spam

### Médio 🟡
7. **Sem templates**: HTML/TXT para emails
8. **Sem audit log**: Sem registro de notificações enviadas
9. **Sem retry logic**: Tarefas falham sem retry

---

## ✅ RECOMENDAÇÕES - ROADMAP

### Phase 1: Foundation (Semana 1)
- [ ] Criar `NotificationPreference` model (database)
- [ ] Criar `NotificationLog` model (audit)
- [ ] Gerar migrations Alembic
- [ ] Criar `/backend/app/services/email_service.py`

### Phase 2: Email Backend (Semana 2)
- [ ] Configurar SMTP (env vars)
- [ ] Criar email templates (Jinja2)
- [ ] Implementar Celery tasks
- [ ] Criar endpoints para testes

### Phase 3: Integração (Semana 3)
- [ ] Notificar em eventos principais
- [ ] Adicionar preferências UI (frontend)
- [ ] Implementar quiet hours
- [ ] Retry logic + error handling

### Phase 4: Polish (Semana 4)
- [ ] Rate limiting
- [ ] Throttling anti-spam
- [ ] Analytics de notificações
- [ ] Testes + documentação

---

## 🔐 CONSIDERAÇÕES DE ARQUITETURA

### 1. Multi-Tenancy
```python
# SEMPRE filtrar por organization_id
notifications = await notification_repo.find_by_org(org_id)
```

### 2. RBAC
```python
# Diferentes roles têm diferentes preferências
if user.role == "super_admin":
    notify_channels = ["email", "sms", "websocket"]
elif user.role == "org_admin":
    notify_channels = ["email", "websocket"]
elif user.role == "agent":
    notify_channels = ["websocket"]  # Real-time only
```

### 3. Secrets
```python
# NUNCA em código
SMTP_HOST = os.getenv("SMTP_HOST")      # GitHub Secret
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
```

### 4. Rate Limiting
```python
# Máximo 5 emails por usuário por hora
from slowapi import Limiter
limiter = Limiter(key_func=get_user_id)

@limiter.limit("5/hour")
async def send_email_notification():
    pass
```

---

## 📁 ESTRUTURA PROPOSTA

```
backend/app/
├── models/
│   ├── notification.py          # NotificationLog, NotificationPreference
│   └── __init__.py
├── services/
│   ├── notification_service.py  # Orquestra todas notificações
│   ├── email_service.py         # SMTP + templates
│   └── __init__.py
├── api/v1/endpoints/
│   └── notifications.py         # GET preferences, PUT preferences, test send
├── schemas/
│   ├── notification.py          # Pydantic models
│   └── __init__.py
├── templates/
│   ├── emails/
│   │   ├── conversation_assigned.html
│   │   ├── sla_warning.html
│   │   ├── campaign_failed.html
│   │   └── base.html
│   └── __init__.py
└── tasks/
    ├── celery_app.py           # Configuração Celery
    ├── email_tasks.py          # @app.task para emails
    └── __init__.py
```

---

## 🧪 TESTES PROPOSTOS

### Backend
```python
# tests/test_notification_service.py
async def test_send_email_notification():
    """Verifica se email é enfileirado corretamente"""
    
async def test_respect_quiet_hours():
    """Verifica se quiet hours são respeitadas"""

async def test_multi_tenant_isolation():
    """Verifica isolamento por organização"""

async def test_role_based_channels():
    """Verifica se apenas role aprovados recebem"""
```

### Frontend
```typescript
// tests/useNotification.test.tsx
describe('useNotification', () => {
  it('should show success toast', () => {
    const { success } = useNotifications();
    success('Test');
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should auto-dismiss after duration', async () => {
    jest.useFakeTimers();
    const { success } = useNotifications();
    success('Test', 1000);
    jest.advanceTimersByTime(1000);
    // Toast should be removed
  });
});
```

---

## 🚀 PRÓXIMAS AÇÕES

### Imediato
1. **Definir prioridades**: Qual canal é mais crítico? (Email? SMS? WebSocket?)
2. **Coletar requirements**: Quais eventos devem gerar notificações?
3. **Design UI**: Como mostrar preferências no frontend?

### Curto Prazo (1-2 sprints)
4. Implementar Phase 1 (Models + Database)
5. Implementar Phase 2 (Email Backend)

### Médio Prazo (3-4 sprints)
6. Integrar com eventos principais
7. Testes + documentação

---

## 📞 PERGUNTAS PARA STAKEHOLDERS

- [ ] Email é crítico ou WebSocket suficiente?
- [ ] Qual SMTP provider? (SendGrid, AWS SES, etc)
- [ ] SMS/WhatsApp necessário?
- [ ] Quiet hours (não-perturbar)?
- [ ] Retenção de histórico (30d, 90d, permanente)?
- [ ] Analytics de notificações (rastreio)?
- [ ] Notificações push web (service workers)?

---

## 📚 REFERÊNCIAS

- **Celery Docs:** https://docs.celeryproject.io/
- **FastAPI Background Tasks:** https://fastapi.tiangolo.com/tutorial/background-tasks/
- **Email Validation (Pydantic):** https://docs.pydantic.dev/2.0/usage/types/#emails
- **SMTP Protocol:** RFC 5321
- **WebSocket Notifications:** MDN WebSocket API

---

## 🎓 CONCLUSÃO

O PyTake possui **fundação sólida para notificações** (Frontend UI + Infrastructure Celery), mas **falta implementação de persistência e email**. 

A próxima etapa é executar o **Roadmap em 4 phases** para criar um sistema robusto, escalável e multi-tenant de notificações.

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Pronto para:** Planning & Implementation  
**Versão do PyTake:** 1.0-dev
