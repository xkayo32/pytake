# 📧 Email & Notificações - Resumo Executivo

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Status:** ✅ Análise Completa - Pronto para Planning  
**Documentos Relacionados:**
- `ANALISE_SISTEMA_EMAIL_NOTIFICACOES.md` (análise detalhada)
- `PLANO_IMPLEMENTACAO_EMAIL_NOTIFICACOES.md` (implementação 4 fases)

---

## 🎯 Situação Atual

| Aspecto | Status | O que Existe | O que Falta |
|--------|--------|-------------|-----------|
| **Frontend** | ✅ 80% | Toast + Modal providers | Tela de preferências |
| **Backend Email** | ❌ 0% | Celery + Redis | EmailService, SMTP, templates |
| **Persistência** | ❌ 0% | Nada | NotificationPreference, NotificationLog |
| **WebSocket** | ✅ 100% | Manager implementado | Melhor integração |
| **Documentação** | ❌ 0% | Nada | Email service docs |

---

## 🏗️ Arquitetura Proposta

```
┌──────────────────────────────────────────────────────────────┐
│                    SISTEMA DE NOTIFICAÇÕES                  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  EVENTO BACKEND  →  NOTIFICATION SERVICE  →  TASK QUEUE    │
│  (conversa,         (valida preferências)     (Celery +    │
│   sla, etc)         (respeita quiet hours)     Redis)      │
│                                                              │
│  ↓ ↓ ↓ ↓                                                    │
│  EMAIL  |  SMS  |  WHATSAPP  |  WEBSOCKET  |  IN_APP      │
│                                                              │
│  ↓                                                           │
│  PERSISTÊNCIA (NotificationLog - audit trail)              │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 📊 Implementação: 4 Fases

### Phase 1: Foundation (1 semana)
```
Banco de Dados + Config SMTP
├── NotificationPreference model
├── NotificationLog model
├── Migration Alembic
├── SMTP environment vars
└── Repositories
```

### Phase 2: Email Backend (1 semana)
```
SMTP + Celery + Templates
├── EmailService (SMTP client)
├── Email templates (Jinja2)
├── Celery app setup
├── Email tasks (@app.task)
└── NotificationService base
```

### Phase 3: Integração (1 semana)
```
Conectar com Sistema Principal
├── Atualizar Conversation Service
├── Endpoints de notificação
├── Atualizar Router API
└── Integration tests
```

### Phase 4: Polish & Testing (1 semana)
```
Qualidade & Deploy
├── Rate limiting
├── Unit tests (+80% coverage)
├── Frontend UI (preferências)
├── Deployment docs
└── Code review
```

---

## 💰 Esforço Estimado

| Phase | Tarefas | Horas | Dev-dias |
|-------|---------|-------|----------|
| Phase 1 | 5 | 8-10 | 1-1.5 |
| Phase 2 | 5 | 12-15 | 1.5-2 |
| Phase 3 | 4 | 10-12 | 1.5-2 |
| Phase 4 | 5 | 12-16 | 1.5-2 |
| **TOTAL** | **19** | **42-53** | **6-7.5** |

---

## 🔐 Arquitetura Seguindo PyTake Rules

### ✅ Multi-Tenancy
- **Regra:** Sempre filtrar por `organization_id`
- **Implementação:** NotificationPreference.organization_id em todas queries

### ✅ RBAC
- **Regra:** Diferentes roles, diferentes canais
- **Implementação:**
  - `super_admin`: email + sms + websocket
  - `org_admin`: email + websocket
  - `agent`: websocket apenas (real-time)
  - `viewer`: nada

### ✅ Backend Layering
- **Regra:** API → Service → Repository
- **Estrutura:**
  ```
  endpoints/notifications.py
  ↓
  services/notification_service.py
  ↓
  repositories/notification.py
  ↓
  models/notification.py
  ```

### ✅ Async-First
- **Regra:** Usar Celery para heavy operations
- **Implementação:** Email via background tasks

### ✅ Container-First
- **Regra:** Desenvolvimento via Podman
- **Comandos:**
  ```bash
  podman compose up -d
  podman exec pytake-backend alembic upgrade head
  podman exec pytake-backend celery -A app.tasks.celery_app worker
  ```

### ✅ Secrets Management
- **Regra:** NUNCA em código, sempre env vars + GitHub Secrets
- **Vars:**
  - `SMTP_HOST`, `SMTP_PORT`
  - `SMTP_USERNAME`, `SMTP_PASSWORD`
  - `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`

---

## 📋 Casos de Uso Prioritários

### Crítico (Sprint 1-2)
1. **Conversa Atribuída** → Email ao agent
2. **SLA Warning** → Email 15min antes de vencer
3. **Preferências** → UI para ativar/desativar canais

### Alto (Sprint 3)
4. **Quiet Hours** → Não perturbar 22h-8h
5. **Rate Limiting** → Máx 5 emails/hora por usuário
6. **Retry Logic** → Retentar 3x com backoff

### Médio (Sprint 4+)
7. **SMS Notifications** → Integração com provider
8. **WhatsApp Notifications** → Usar API existente
9. **In-App Persistence** → Histórico de notificações
10. **Analytics** → Dashboard de notificações enviadas

---

## 🧪 Estratégia de Testes

### Testes Unitários
```python
# test_notification_service.py
- should_notify_respects_enabled_flag()
- should_notify_respects_quiet_hours()
- should_notify_respects_role_based_channels()
```

### Testes de Integração
```python
# test_celery_tasks.py
- celery_task_retry_on_failure()
- celery_task_respects_multi_tenancy()
```

### Testes End-to-End
```typescript
# e2e/notifications.spec.ts
- should_see_preferences_page()
- should_toggle_email_notifications()
- should_send_test_email()
```

---

## 📝 Deliverables por Phase

### Phase 1 ✅
- [ ] Models + Schemas
- [ ] Migration
- [ ] Repositories
- [ ] SMTP config docs

### Phase 2 ✅
- [ ] EmailService class
- [ ] Email templates (5+)
- [ ] Celery app + tasks
- [ ] NotificationService base

### Phase 3 ✅
- [ ] Conversation Service atualizado
- [ ] Endpoints de notificação (GET, PUT, POST)
- [ ] Integration com router
- [ ] 5+ integration tests

### Phase 4 ✅
- [ ] Rate limiting middleware
- [ ] 15+ unit tests
- [ ] Frontend UI (settings page)
- [ ] Deployment guide
- [ ] Code review aprovado

---

## 🚀 Comandos de Referência

### Setup Local
```bash
# Start services
podman compose up -d

# Apply migrations
podman exec pytake-backend alembic upgrade head

# Start Celery worker
podman exec pytake-backend celery -A app.tasks.celery_app worker --loglevel=info

# Start Flower (monitoring)
podman exec pytake-backend pip install flower
podman exec pytake-backend celery -A app.tasks.celery_app flower --port=5555
# Access: http://localhost:5555

# Run tests
podman exec pytake-backend pytest tests/test_notification_service.py -v
```

### Troubleshooting
```bash
# Check Redis connection
podman exec pytake-redis redis-cli ping

# View task queue
podman exec pytake-redis redis-cli LRANGE celery 0 -1

# View Celery logs
podman logs pytake-backend | grep celery

# Reset Redis
podman exec pytake-redis redis-cli FLUSHALL
```

---

## ⚠️ Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| SMTP não configurado | 🔴 Crítico | Usar teste via CLI primeiro |
| Celery worker cai | 🟠 Alto | Rate limit na enfileiragem |
| Multi-tenant leak | 🔴 Crítico | Filter org_id em todos queries |
| Email spam | 🟠 Alto | Rate limit + quiet hours |
| DB notifications overflow | 🟡 Médio | Arquivamento após 90 dias |

---

## 🎓 Conhecimento Necessário

### Backend Developer
- [ ] FastAPI + dependency injection
- [ ] SQLAlchemy + async
- [ ] Celery + Redis
- [ ] SMTP protocol basics
- [ ] Jinja2 templates
- [ ] PyTest

### Frontend Developer
- [ ] React hooks + context
- [ ] API integration via fetch
- [ ] Form handling + validation
- [ ] localStorage para preferências

### DevOps/SRE
- [ ] Podman/Docker compose
- [ ] SMTP provider setup (Gmail, SendGrid, etc)
- [ ] Celery monitoring (Flower)
- [ ] Redis persistence

---

## 📞 Perguntas para Stakeholders

**Antes de começar implementação:**

- [ ] **Prioridade de Canais:** Email é crítico ou WebSocket suficiente?
- [ ] **SMTP Provider:** Gmail (fácil), SendGrid (robusto), AWS SES (scalable)?
- [ ] **SMS/WhatsApp:** Necessário de início ou posterior?
- [ ] **Retenção:** Por quanto tempo manter histórico? (30d, 90d, indefinido?)
- [ ] **Quiet Hours:** Respeitar fuso horário de cada usuário ou global?
- [ ] **Escalabilidade:** Quantas notificações/dia esperadas?
- [ ] **Analytics:** Precisa rastrear entrega + abertura (como email marketing)?
- [ ] **Assinatura:** Todos emails devem ser assinados com footer padrão?

---

## 🎬 Próximas Ações (Imediato)

### Esta Semana
1. [ ] Revisar análise (`ANALISE_SISTEMA_EMAIL_NOTIFICACOES.md`)
2. [ ] Revisar plano (`PLANO_IMPLEMENTACAO_EMAIL_NOTIFICACOES.md`)
3. [ ] Responder perguntas de stakeholders
4. [ ] Definir Sprint 1 (Phase 1: Foundation)

### Próxima Semana
5. [ ] Iniciar implementação Phase 1 (Models + DB)
6. [ ] Create feature branch: `feature/TICKET-XXX-notification-system`
7. [ ] Commit com author attribution: "Author: Kayo Carvalho Fernandes"

### Sprint Planning
- [ ] Quebrar Phase 1 em user stories
- [ ] Estimar story points
- [ ] Atribuir para dev sprint

---

## 📚 Referências

| Recurso | Link | Uso |
|---------|------|-----|
| FastAPI Docs | https://fastapi.tiangolo.com | Backend framework |
| Celery Docs | https://docs.celeryproject.io | Task queue |
| Redis Docs | https://redis.io/docs | Message broker |
| SMTP RFC | https://tools.ietf.org/html/rfc5321 | Email protocol |
| Jinja2 Docs | https://jinja.palletsprojects.com | Template rendering |
| PyTest Docs | https://docs.pytest.org | Testing |

---

## 🎯 KPIs de Sucesso

- ✅ 100% migration uptime
- ✅ 99% email delivery rate
- ✅ <5s email enqueue time
- ✅ +80% test coverage
- ✅ 0 multi-tenant leaks
- ✅ <10% failed notifications
- ✅ All preferences respected (quiet hours, channels)

---

## 📊 Comparação com Concorrentes

| Funcionalidade | Intercom | Zendesk | PyTake (Proposto) |
|---|---|---|---|
| Email Notifications | ✅ | ✅ | ✅ |
| SMS | ✅ | ✅ | 🔜 Phase 3+ |
| Quiet Hours | ✅ | ✅ | ✅ |
| RBAC | ✅ | ✅ | ✅ |
| Multi-tenancy | ✅ | ✅ | ✅ |
| In-App | ✅ | ✅ | 🔜 Phase 4+ |
| Analytics | ✅ | ✅ | 🔜 Future |

---

**Conclusão:** O PyTake terá um **sistema de notificações robusto, multi-tenant e escalável**, seguindo as melhores práticas arquiteturais. A implementação em 4 phases permite entregar valor incrementalmente.

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Status:** Pronto para Sprint Planning  
**Próximo Milestone:** Phase 1 - Foundation (1 semana)
