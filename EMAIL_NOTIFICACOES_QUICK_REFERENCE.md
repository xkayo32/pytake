# 🚀 Email & Notificações - Quick Reference Guide

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Propósito:** Guia rápido para desenvolvedores

---

## ⚡ Antes de Começar

### 1. Ler Documentação (15 min)
```
✅ EMAIL_NOTIFICACOES_RESUMO_EXECUTIVO.md (este arquivo)
✅ ANALISE_SISTEMA_EMAIL_NOTIFICACOES.md (detalhes arquitetura)
✅ PLANO_IMPLEMENTACAO_EMAIL_NOTIFICACOES.md (código + tasks)
```

### 2. Infraestrutura Local
```bash
# Verificar se Redis está rodando
podman compose ps | grep redis

# Verificar PostgreSQL
podman exec pytake-postgres psql -U pytake_user -c "SELECT version();"

# Verificar SMTP (se configurado localmente)
telnet smtp.gmail.com 587
```

### 3. Branches e Commits
```bash
# Criar branch
git checkout develop && git pull origin develop
git checkout -b feature/TICKET-XXX-email-notifications

# Commits
git commit -m "feat: Add notification preferences model | Author: Kayo Carvalho Fernandes"
git push origin feature/TICKET-XXX-email-notifications

# PR base: develop (NUNCA main)
gh pr create --base develop --title "feat: Email & Notifications System"
```

---

## 🗂️ Estrutura de Arquivos

```
backend/app/
├── models/
│   └── notification.py              ← Models (Phase 1)
├── services/
│   ├── email_service.py             ← SMTP client (Phase 2)
│   └── notification_service.py      ← Orchestrator (Phase 2)
├── repositories/
│   └── notification.py              ← Data access (Phase 1)
├── schemas/
│   └── notification.py              ← Pydantic models (Phase 1)
├── api/v1/endpoints/
│   └── notifications.py             ← API routes (Phase 3)
├── tasks/
│   ├── celery_app.py               ← Celery config (Phase 2)
│   └── email_tasks.py              ← @app.task decorators (Phase 2)
└── templates/emails/               ← HTML templates (Phase 2)
    ├── base.html
    ├── conversation_assigned.html
    └── sla_warning.html
```

---

## 📋 Phase 1: Models & Database (3-4 dias)

### Step 1.1: Create Model
```python
# backend/app/models/notification.py
from sqlalchemy import Column, String, Boolean, DateTime, Enum, Integer, JSON, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import Base
import enum
from datetime import datetime

class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    WEBSOCKET = "websocket"
    IN_APP = "in_app"

class NotificationPreference(Base):
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    websocket_enabled = Column(Boolean, default=True)
    quiet_hours_start = Column(String, nullable=True)  # "18:00"
    quiet_hours_end = Column(String, nullable=True)    # "08:00"
    quiet_hours_enabled = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NotificationLog(Base):
    __tablename__ = "notification_logs"
    
    id = Column(Integer, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    notification_type = Column(String, nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    message = Column(Text, nullable=False)
    recipient = Column(String(255), nullable=False)
    status = Column(String(50), default="pending")  # pending, sent, failed
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### Step 1.2: Create Pydantic Schema
```python
# backend/app/schemas/notification.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NotificationPreferenceResponse(BaseModel):
    id: int
    email_enabled: bool
    sms_enabled: bool
    websocket_enabled: bool
    quiet_hours_start: Optional[str]
    quiet_hours_end: Optional[str]
    quiet_hours_enabled: bool
    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_enabled: Optional[bool] = None
```

### Step 1.3: Create Repository
```python
# backend/app/repositories/notification.py
from sqlalchemy import select
from app.models.notification import NotificationPreference, NotificationLog
from app.repositories.base import BaseRepository
from typing import Optional

class NotificationPreferenceRepository(BaseRepository[NotificationPreference]):
    async def get_by_user_org(self, user_id: str, org_id: str) -> Optional[NotificationPreference]:
        result = await self.db.execute(
            select(NotificationPreference).where(
                (NotificationPreference.user_id == user_id) &
                (NotificationPreference.organization_id == org_id)
            )
        )
        return result.scalars().first()
    
    async def get_or_create(self, user_id: str, org_id: str) -> NotificationPreference:
        pref = await self.get_by_user_org(user_id, org_id)
        if pref:
            return pref
        pref = NotificationPreference(user_id=user_id, organization_id=org_id)
        self.db.add(pref)
        await self.db.flush()
        return pref
```

### Step 1.4: Generate Migration
```bash
# Inside container
podman exec pytake-backend alembic revision --autogenerate -m "Add notification tables"

# Verify
podman exec pytake-backend ls alembic/versions/ | tail -1

# Apply
podman exec pytake-backend alembic upgrade head

# Verify tables
podman exec pytake-postgres psql -U pytake_user -d pytake -c "\dt notification_*"
```

### ✅ Phase 1 Complete When:
- [ ] Models compile without errors
- [ ] Pydantic schemas validate
- [ ] Migration applies successfully
- [ ] Tables exist in PostgreSQL
- [ ] Repository methods callable

---

## 📧 Phase 2: Email & Celery (4-5 dias)

### Step 2.1: Update Config
```python
# backend/app/core/config.py - add to Settings class
SMTP_HOST: str = Field(default="smtp.gmail.com")
SMTP_PORT: int = Field(default=587)
SMTP_USERNAME: str = Field(default="")
SMTP_PASSWORD: str = Field(default="")  # ← GitHub Secret!
SMTP_FROM_EMAIL: str = Field(default="noreply@pytake.com")
SMTP_FROM_NAME: str = Field(default="PyTake")
SMTP_USE_TLS: bool = Field(default=True)

CELERY_BROKER_URL: Optional[str] = None
CELERY_RESULT_BACKEND: Optional[str] = None
```

### Step 2.2: Add Env Vars
```env
# .env.podman (ADD THESE)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=app_password_from_google  # ← GITHUB SECRET!
SMTP_FROM_EMAIL=noreply@pytake.com
SMTP_FROM_NAME=PyTake
SMTP_USE_TLS=true

# OR for testing locally
SMTP_HOST=localhost
SMTP_PORT=1025  # MailHog dev server
```

### Step 2.3: Create Email Service
```python
# backend/app/services/email_service.py
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM_EMAIL
        
        # Setup Jinja2
        template_dir = os.path.join(
            os.path.dirname(__file__), '../templates/emails'
        )
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html'])
        )
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: str = None
    ) -> dict:
        """Send email"""
        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = f"{settings.SMTP_FROM_NAME} <{self.smtp_from}>"
            message['To'] = to_email
            
            if text_content:
                message.attach(MIMEText(text_content, 'plain'))
            message.attach(MIMEText(html_content, 'html'))
            
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=10) as server:
                if settings.SMTP_USE_TLS:
                    server.starttls()
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                server.send_message(message)
            
            logger.info(f"✅ Email sent to {to_email}")
            return {"success": True}
        except Exception as e:
            logger.error(f"❌ Email failed: {e}")
            return {"success": False, "error": str(e)}
    
    def render_template(self, template_name: str, context: dict) -> str:
        template = self.jinja_env.get_template(template_name)
        return template.render(**context)
```

### Step 2.4: Create Email Templates
```html
<!-- backend/app/templates/emails/base.html -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; color: #333; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: #667eea; color: white; padding: 20px; }
        .content { padding: 20px; }
        .button { display: inline-block; padding: 10px 20px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header"><h1>{% block header %}PyTake{% endblock %}</h1></div>
        <div class="content">{% block content %}{% endblock %}</div>
    </div>
</body>
</html>
```

```html
<!-- backend/app/templates/emails/conversation_assigned.html -->
{% extends "base.html" %}
{% block content %}
<h2>Olá {{ agent_name }},</h2>
<p>Uma nova conversa foi atribuída: <strong>{{ contact_name }}</strong></p>
<a href="https://pytake.app/conversations/{{ conversation_id }}" class="button">Ver Conversa</a>
{% endblock %}
```

### Step 2.5: Setup Celery
```python
# backend/app/tasks/celery_app.py
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    'pytake',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=['app.tasks.email_tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    task_track_started=True,
    task_time_limit=30 * 60,
)
```

### Step 2.6: Create Email Tasks
```python
# backend/app/tasks/email_tasks.py
from celery import shared_task
from app.services.email_service import EmailService
import logging

logger = logging.getLogger(__name__)
email_service = EmailService()

@shared_task(bind=True, max_retries=3)
def send_email_notification_task(
    self,
    to_email: str,
    subject: str,
    html_content: str
):
    """Send email with retry logic"""
    try:
        result = await email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content
        )
        if not result['success']:
            raise Exception(result['error'])
        return {'status': 'sent', 'to': to_email}
    except Exception as exc:
        logger.error(f"Email task failed: {exc}")
        raise self.retry(exc=exc, countdown=5 ** self.request.retries)

# Enqueue helper
def send_conversation_assigned_email(agent_email, agent_name, contact_name, conv_id):
    html = email_service.render_template(
        'conversation_assigned.html',
        {
            'agent_name': agent_name,
            'contact_name': contact_name,
            'conversation_id': conv_id
        }
    )
    return send_email_notification_task.delay(
        to_email=agent_email,
        subject=f"Nova conversa: {contact_name}",
        html_content=html
    )
```

### ✅ Phase 2 Complete When:
- [ ] EmailService sends test email successfully
- [ ] Celery tasks enqueued in Redis
- [ ] Templates render correctly
- [ ] No SMTP auth errors
- [ ] Worker can process tasks

---

## 🔗 Phase 3: Integration (2-3 dias)

### Step 3.1: Update Conversation Service
```python
# backend/app/services/conversation_service.py - in assign method
async def assign_conversation_to_agent(self, conv_id: str, agent_id: str, org_id: str):
    # ... existing logic ...
    
    # NEW: Send notification
    try:
        from app.tasks.email_tasks import send_conversation_assigned_email
        
        agent = await self.user_repo.get(agent_id)
        contact = await self.contact_repo.get(conversation.contact_id)
        
        send_conversation_assigned_email(
            agent_email=agent.email,
            agent_name=agent.full_name,
            contact_name=contact.name,
            conv_id=conv_id
        )
        logger.info(f"📧 Notification queued for {agent.email}")
    except Exception as e:
        logger.error(f"Failed to queue notification: {e}")
        # Don't fail the assignment
```

### Step 3.2: Create Notification Endpoint
```python
# backend/app/api/v1/endpoints/notifications.py
from fastapi import APIRouter, Depends
from app.schemas.notification import NotificationPreferenceResponse, NotificationPreferenceUpdate
from app.repositories.notification import NotificationPreferenceRepository
from app.core.database import get_db
from app.core.security import get_current_user, get_organization_id

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_preferences(
    current_user = Depends(get_current_user),
    org_id: str = Depends(get_organization_id),
    db = Depends(get_db)
):
    repo = NotificationPreferenceRepository(db)
    pref = await repo.get_or_create(current_user.id, org_id)
    return pref

@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_preferences(
    data: NotificationPreferenceUpdate,
    current_user = Depends(get_current_user),
    org_id: str = Depends(get_organization_id),
    db = Depends(get_db)
):
    repo = NotificationPreferenceRepository(db)
    pref = await repo.get_or_create(current_user.id, org_id)
    
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pref, key, value)
    
    await repo.update(pref)
    return pref
```

### Step 3.3: Register Router
```python
# backend/app/api/v1/router.py
from app.api.v1.endpoints import notifications

api_router.include_router(notifications.router, prefix="/api/v1")
```

### ✅ Phase 3 Complete When:
- [ ] Endpoints accessible via Swagger
- [ ] Preferences saved to database
- [ ] Email sends on conversation assignment
- [ ] Integration tests passing
- [ ] No 500 errors in logs

---

## 🧪 Phase 4: Testing & Polish (2-3 dias)

### Step 4.1: Write Tests
```python
# backend/tests/test_notification_service.py
import pytest
from app.services.notification_service import NotificationService
from app.models.notification import NotificationChannel, NotificationPreference

@pytest.mark.asyncio
async def test_should_notify_respects_enabled():
    pref = NotificationPreference(
        user_id="test", organization_id="test-org", 
        email_enabled=False
    )
    repo = MockRepo(pref)
    service = NotificationService(repo)
    
    can_notify = await service.should_notify(
        "test", "test-org", NotificationChannel.EMAIL
    )
    assert can_notify is False

@pytest.mark.asyncio
async def test_multi_tenant_isolation():
    """Verify org_id filtering works"""
    service = NotificationService(repo)
    # Verify user in org A can't see org B notifications
    # ...
```

### Step 4.2: Frontend Preferences Page
```typescript
// frontend/src/app/admin/settings/notifications.tsx
'use client';
import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotification';
import { getApiUrl, getAuthHeaders } from '@/lib/api';

export default function NotificationSettings() {
  const { success, error } = useNotifications();
  const [prefs, setPrefs] = useState(null);

  useEffect(() => {
    fetch(getApiUrl('/api/v1/notifications/preferences'), {
      headers: getAuthHeaders()
    })
      .then(r => r.json())
      .then(setPrefs)
      .catch(err => error(err.message));
  }, []);

  const handleSave = async (updated) => {
    try {
      const r = await fetch(
        getApiUrl('/api/v1/notifications/preferences'),
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updated)
        }
      );
      if (!r.ok) throw new Error();
      success('Preferências salvas!');
      setPrefs(updated);
    } catch {
      error('Erro ao salvar');
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Notificações</h1>
      
      <div className="bg-white rounded-lg p-6 mb-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={prefs?.email_enabled || false}
            onChange={(e) => {
              const updated = { ...prefs, email_enabled: e.target.checked };
              setPrefs(updated);
              handleSave(updated);
            }}
          />
          <span>Receber emails</span>
        </label>
      </div>
    </div>
  );
}
```

### Step 4.3: Deploy Checklist
```bash
# Pre-deployment
podman exec pytake-backend pytest -v
podman exec pytake-backend alembic current
podman logs pytake-backend | tail -50

# Test endpoints
curl -X GET http://localhost:8000/api/v1/notifications/preferences \
  -H "Authorization: Bearer $TOKEN"

# Monitor
podman compose logs -f backend redis

# Rollback if needed
podman exec pytake-backend alembic downgrade -1
```

### ✅ Phase 4 Complete When:
- [ ] Tests pass (+80% coverage)
- [ ] Frontend UI works
- [ ] Email delivers reliably
- [ ] No memory leaks
- [ ] Code review approved
- [ ] Documentation complete

---

## 🔧 Troubleshooting

### Email not sending
```bash
# 1. Check SMTP config
podman exec pytake-backend python3 -c "from app.core.config import settings; print(settings.SMTP_HOST)"

# 2. Test SMTP connection
telnet smtp.gmail.com 587

# 3. Check Celery logs
podman logs pytake-backend | grep celery

# 4. View task queue
podman exec pytake-redis redis-cli LRANGE celery 0 -1
```

### Database migration failed
```bash
# 1. Check migration status
podman exec pytake-backend alembic current

# 2. Rollback
podman exec pytake-backend alembic downgrade -1

# 3. Delete migration file and retry
rm backend/alembic/versions/*.py
podman exec pytake-backend alembic revision --autogenerate -m "..."
```

### Redis connection error
```bash
# 1. Check Redis status
podman exec pytake-redis redis-cli ping

# 2. Check password
podman exec pytake-redis redis-cli -a $PASSWORD ping

# 3. Restart Redis
podman restart pytake-redis
```

---

## 📚 Quick Links

| Documento | Propósito |
|-----------|-----------|
| `ANALISE_SISTEMA_EMAIL_NOTIFICACOES.md` | Análise completa + problemas |
| `PLANO_IMPLEMENTACAO_EMAIL_NOTIFICACOES.md` | Código detalhado por phase |
| `EMAIL_NOTIFICACOES_RESUMO_EXECUTIVO.md` | Visão executiva + KPIs |
| **Este arquivo** | Quick reference |

---

## ✅ Definition of Done

- [ ] Code compiles/runs without errors
- [ ] Tests pass (pytest -v)
- [ ] Multi-tenancy respected (org_id filters)
- [ ] RBAC validated (roles get right channels)
- [ ] Migrations applied successfully
- [ ] Endpoints respond on Swagger
- [ ] Emails send via Celery
- [ ] Frontend UI works
- [ ] Documentation updated
- [ ] Code review approved
- [ ] Deployed to staging
- [ ] QA sign-off

---

## 🎯 Key Commands

```bash
# Development
podman compose up -d
podman exec pytake-backend alembic upgrade head
podman exec pytake-backend celery -A app.tasks.celery_app worker --loglevel=info

# Testing
podman exec pytake-backend pytest -v tests/
podman exec pytake-backend pytest -v tests/test_notification_service.py

# Monitoring
podman exec pytake-backend celery -A app.tasks.celery_app flower --port=5555  # http://localhost:5555

# Debugging
podman logs -f pytake-backend
podman exec pytake-redis redis-cli MONITOR
```

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Status:** Ready for Development  
**Próximo Passo:** Iniciar Phase 1
