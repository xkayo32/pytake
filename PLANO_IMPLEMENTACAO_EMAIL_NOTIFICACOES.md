# 🚀 Plano de Implementação: Sistema de Email e Notificações

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Versão:** 1.0  
**Sprint Duration:** 4 semanas (1 semana por phase)

---

## 📋 Sumário Executivo

Este documento detalha a **implementação completa** do sistema de notificações do PyTake, seguindo regras arquiteturais:
- ✅ Multi-tenancy (organização_id em tudo)
- ✅ RBAC (roles definem canais)
- ✅ Container-first (Podman/Docker)
- ✅ Layer separation (API → Service → Repository)
- ✅ Async-first (Celery + Redis)

---

## 🗓️ PHASE 1: Foundation (Semana 1)

### Objetivo
Criar base de dados + configuração de SMTP + estrutura de serviços

### Tasks

#### 1.1 Criar Models de Banco de Dados
**Arquivo:** `backend/app/models/notification.py`

**O que fazer:**
```python
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Enum
from app.models.base import Base
import enum
from datetime import datetime

class NotificationChannel(str, enum.Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    WEBSOCKET = "websocket"
    IN_APP = "in_app"

class NotificationType(str, enum.Enum):
    CONVERSATION_ASSIGNED = "conversation_assigned"
    SLA_WARNING = "sla_warning"
    CAMPAIGN_FAILED = "campaign_failed"
    NEW_CONTACT = "new_contact"
    CONVERSATION_CLOSED = "conversation_closed"
    AGENT_OFFLINE = "agent_offline"
    CUSTOM = "custom"

class NotificationPreference(Base):
    """Preferências de notificação por usuário"""
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    
    # Canais habilitados
    email_enabled = Column(Boolean, default=True)
    sms_enabled = Column(Boolean, default=False)
    whatsapp_enabled = Column(Boolean, default=False)
    websocket_enabled = Column(Boolean, default=True)
    in_app_enabled = Column(Boolean, default=True)
    
    # Quiet hours (não perturbar)
    quiet_hours_start = Column(String, nullable=True)  # "18:00"
    quiet_hours_end = Column(String, nullable=True)    # "08:00"
    quiet_hours_enabled = Column(Boolean, default=False)
    
    # Frequency limiting
    max_emails_per_hour = Column(Integer, default=10)
    max_sms_per_hour = Column(Integer, default=5)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('user_id', 'organization_id', name='uq_user_org_notification'),
        Index('ix_notification_preferences_org_id', 'organization_id'),
    )

class NotificationLog(Base):
    """Log de todas notificações enviadas (audit trail)"""
    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True)
    organization_id = Column(String, ForeignKey("organizations.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    notification_type = Column(Enum(NotificationType), nullable=False)
    channel = Column(Enum(NotificationChannel), nullable=False)
    
    subject = Column(String(255), nullable=True)
    message = Column(Text, nullable=False)
    recipient = Column(String(255), nullable=False)  # email, phone, etc
    
    status = Column(String(50), default="pending")  # pending, sent, failed, bounced
    error_message = Column(Text, nullable=True)
    
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Metadata para tracking
    metadata = Column(JSON, nullable=True)  # {conversation_id, contact_id, etc}
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)

    __table_args__ = (
        Index('ix_notification_logs_org_id', 'organization_id'),
        Index('ix_notification_logs_user_id', 'user_id'),
        Index('ix_notification_logs_status', 'status'),
        Index('ix_notification_logs_created_at', 'created_at'),
    )
```

#### 1.2 Criar Schemas Pydantic
**Arquivo:** `backend/app/schemas/notification.py`

```python
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional
from enum import Enum

class NotificationChannelEnum(str, Enum):
    EMAIL = "email"
    SMS = "sms"
    WHATSAPP = "whatsapp"
    WEBSOCKET = "websocket"
    IN_APP = "in_app"

class NotificationPreferenceResponse(BaseModel):
    id: int
    user_id: str
    email_enabled: bool
    sms_enabled: bool
    whatsapp_enabled: bool
    websocket_enabled: bool
    in_app_enabled: bool
    quiet_hours_start: Optional[str]
    quiet_hours_end: Optional[str]
    quiet_hours_enabled: bool
    
    class Config:
        from_attributes = True

class NotificationPreferenceUpdate(BaseModel):
    email_enabled: Optional[bool] = None
    sms_enabled: Optional[bool] = None
    whatsapp_enabled: Optional[bool] = None
    websocket_enabled: Optional[bool] = None
    in_app_enabled: Optional[bool] = None
    quiet_hours_start: Optional[str] = None
    quiet_hours_end: Optional[str] = None
    quiet_hours_enabled: Optional[bool] = None
    max_emails_per_hour: Optional[int] = Field(None, ge=1, le=100)

class NotificationLogResponse(BaseModel):
    id: int
    notification_type: str
    channel: str
    subject: Optional[str]
    message: str
    status: str
    sent_at: Optional[datetime]
    created_at: datetime
    
    class Config:
        from_attributes = True
```

#### 1.3 Gerar Migration Alembic
**Comando:**
```bash
podman exec pytake-backend alembic revision --autogenerate -m "Add notification preferences and logs tables"
podman exec pytake-backend alembic upgrade head
```

**Verificar:**
```bash
podman exec pytake-postgres psql -U pytake_user -d pytake -c "\dt notification_*"
```

#### 1.4 Atualizar Configuração SMTP
**Arquivo:** `backend/app/core/config.py`

Adicionar após seção Redis:
```python
# SMTP Email Configuration
SMTP_HOST: str = Field(default="smtp.gmail.com")
SMTP_PORT: int = Field(default=587)
SMTP_USERNAME: str = Field(default="")
SMTP_PASSWORD: str = Field(default="")  # Should be env var!
SMTP_FROM_EMAIL: str = Field(default="noreply@pytake.com")
SMTP_FROM_NAME: str = Field(default="PyTake")
SMTP_USE_TLS: bool = Field(default=True)
SMTP_TIMEOUT: int = Field(default=10)

# Email Rate Limiting
EMAIL_RATE_LIMIT_PER_HOUR: int = Field(default=100)
EMAIL_BATCH_SIZE: int = Field(default=50)
```

**Em `.env.example` e `.env.podman`:**
```env
# SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your_email@gmail.com
SMTP_PASSWORD=your_app_password_here  # GitHub Secret!
SMTP_FROM_EMAIL=noreply@pytake.com
SMTP_FROM_NAME=PyTake
SMTP_USE_TLS=true
SMTP_TIMEOUT=10
```

#### 1.5 Criar Repositories
**Arquivo:** `backend/app/repositories/notification.py`

```python
from typing import Optional
from sqlalchemy import select
from app.models.notification import NotificationPreference, NotificationLog
from app.repositories.base import BaseRepository

class NotificationPreferenceRepository(BaseRepository[NotificationPreference]):
    async def get_by_user_org(self, user_id: str, org_id: str) -> Optional[NotificationPreference]:
        """Get preferences for user in organization"""
        result = await self.db.execute(
            select(NotificationPreference).where(
                (NotificationPreference.user_id == user_id) &
                (NotificationPreference.organization_id == org_id)
            )
        )
        return result.scalars().first()
    
    async def get_or_create(self, user_id: str, org_id: str) -> NotificationPreference:
        """Get preferences or create with defaults"""
        pref = await self.get_by_user_org(user_id, org_id)
        if pref:
            return pref
        
        pref = NotificationPreference(
            user_id=user_id,
            organization_id=org_id,
        )
        return await self.create(pref)

class NotificationLogRepository(BaseRepository[NotificationLog]):
    async def get_by_org(self, org_id: str, skip: int = 0, limit: int = 50):
        """Get notification logs for organization"""
        result = await self.db.execute(
            select(NotificationLog)
            .where(NotificationLog.organization_id == org_id)
            .order_by(NotificationLog.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()
```

---

## 🗓️ PHASE 2: Email Backend (Semana 2)

### Objetivo
Implementar SMTP + Celery tasks + email templates

### Tasks

#### 2.1 Criar Email Service
**Arquivo:** `backend/app/services/email_service.py`

```python
from typing import Optional, List, Dict, Any
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import aiosmtplib
import smtplib
from jinja2 import Environment, FileSystemLoader, select_autoescape
import os
from app.core.config import settings
from app.models.notification import NotificationLog, NotificationChannel
import logging

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.smtp_host = settings.SMTP_HOST
        self.smtp_port = settings.SMTP_PORT
        self.smtp_username = settings.SMTP_USERNAME
        self.smtp_password = settings.SMTP_PASSWORD
        self.smtp_from = settings.SMTP_FROM_EMAIL
        self.smtp_from_name = settings.SMTP_FROM_NAME
        self.use_tls = settings.SMTP_USE_TLS
        self.timeout = settings.SMTP_TIMEOUT
        
        # Setup Jinja2 for templates
        template_dir = os.path.join(
            os.path.dirname(__file__),
            '../templates/emails'
        )
        self.jinja_env = Environment(
            loader=FileSystemLoader(template_dir),
            autoescape=select_autoescape(['html', 'xml'])
        )
    
    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Send email via SMTP
        
        Returns:
            {
                "success": bool,
                "message_id": str,
                "error": str (if failed)
            }
        """
        try:
            message = MIMEMultipart('alternative')
            message['Subject'] = subject
            message['From'] = f"{self.smtp_from_name} <{self.smtp_from}>"
            message['To'] = to_email
            
            if text_content:
                message.attach(MIMEText(text_content, 'plain'))
            message.attach(MIMEText(html_content, 'html'))
            
            # Send via synchronous SMTP (blocking, mas OK for Celery)
            with smtplib.SMTP(
                self.smtp_host,
                self.smtp_port,
                timeout=self.timeout
            ) as server:
                if self.use_tls:
                    server.starttls()
                
                if self.smtp_username and self.smtp_password:
                    server.login(self.smtp_username, self.smtp_password)
                
                server.send_message(message)
            
            logger.info(f"✅ Email enviado para {to_email}")
            return {
                "success": True,
                "message_id": message['Message-ID'],
            }
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar email: {e}")
            return {
                "success": False,
                "error": str(e),
            }
    
    def render_template(
        self,
        template_name: str,
        context: Dict[str, Any]
    ) -> str:
        """Render email template"""
        template = self.jinja_env.get_template(template_name)
        return template.render(**context)
    
    async def send_conversation_assigned(
        self,
        to_email: str,
        agent_name: str,
        contact_name: str,
        conversation_id: str
    ):
        """Send email when conversation is assigned"""
        html = self.render_template(
            'conversation_assigned.html',
            {
                'agent_name': agent_name,
                'contact_name': contact_name,
                'conversation_id': conversation_id,
                'dashboard_url': 'https://pytake.app/dashboard'
            }
        )
        
        return await self.send_email(
            to_email,
            subject=f"Nova conversa de {contact_name}",
            html_content=html
        )
    
    async def send_sla_warning(
        self,
        to_email: str,
        agent_name: str,
        contact_name: str,
        time_remaining: str,
        conversation_id: str
    ):
        """Send email when SLA is about to breach"""
        html = self.render_template(
            'sla_warning.html',
            {
                'agent_name': agent_name,
                'contact_name': contact_name,
                'time_remaining': time_remaining,
                'conversation_id': conversation_id,
            }
        )
        
        return await self.send_email(
            to_email,
            subject=f"⚠️ SLA próximo de vencer: {contact_name}",
            html_content=html
        )
```

#### 2.2 Criar Email Templates
**Arquivo:** `backend/app/templates/emails/base.html`

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        .footer {
            background-color: #f9f9f9;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #999;
            border-top: 1px solid #eee;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #5568d3;
        }
        .alert {
            background-color: #fff3cd;
            border: 1px solid #ffeaa7;
            color: #856404;
            padding: 12px;
            border-radius: 4px;
            margin: 20px 0;
        }
        h1, h2 {
            margin-top: 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>{% block header_title %}PyTake{% endblock %}</h1>
        </div>
        <div class="content">
            {% block content %}{% endblock %}
        </div>
        <div class="footer">
            <p>© 2025 PyTake - Seu assistente de automação WhatsApp</p>
            <p>
                <a href="https://pytake.app">Ir para Dashboard</a> | 
                <a href="https://pytake.app/preferences">Preferências</a> | 
                <a href="https://pytake.app/help">Ajuda</a>
            </p>
        </div>
    </div>
</body>
</html>
```

**Arquivo:** `backend/app/templates/emails/conversation_assigned.html`

```html
{% extends "base.html" %}

{% block header_title %}Nova Conversa Atribuída{% endblock %}

{% block content %}
<h2>Olá {{ agent_name }},</h2>

<p>Uma nova conversa foi atribuída a você.</p>

<div style="background-color: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><strong>Contato:</strong> {{ contact_name }}</p>
    <p><strong>ID da Conversa:</strong> {{ conversation_id }}</p>
    <p><strong>Horário:</strong> {{ now.strftime('%d/%m/%Y %H:%M') }}</p>
</div>

<p>Acesse o dashboard para visualizar a conversa completa e responder ao cliente.</p>

<center>
    <a href="{{ dashboard_url }}/conversations/{{ conversation_id }}" class="button">
        Ver Conversa
    </a>
</center>

<p>Obrigado,<br>Equipe PyTake</p>
{% endblock %}
```

**Arquivo:** `backend/app/templates/emails/sla_warning.html`

```html
{% extends "base.html" %}

{% block header_title %}⚠️ Aviso de SLA{% endblock %}

{% block content %}
<h2>Olá {{ agent_name }},</h2>

<div class="alert">
    <strong>⚠️ ATENÇÃO:</strong> O SLA para a seguinte conversa está próximo de vencer!
</div>

<div style="background-color: #f0f4ff; padding: 15px; border-radius: 5px; margin: 20px 0;">
    <p><strong>Contato:</strong> {{ contact_name }}</p>
    <p><strong>ID da Conversa:</strong> {{ conversation_id }}</p>
    <p><strong>Tempo Restante:</strong> <span style="color: red; font-weight: bold;">{{ time_remaining }}</span></p>
</div>

<p>Responda o cliente o quanto antes para não ultrapassar o SLA estabelecido.</p>

<center>
    <a href="{{ dashboard_url }}/conversations/{{ conversation_id }}" class="button">
        Responder Agora
    </a>
</center>

<p>Obrigado,<br>Equipe PyTake</p>
{% endblock %}
```

#### 2.3 Criar Celery App e Tasks
**Arquivo:** `backend/app/tasks/celery_app.py`

```python
from celery import Celery
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Initialize Celery
celery_app = Celery(
    'pytake',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=[
        'app.tasks.email_tasks',
    ]
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=1000,
)

@celery_app.on_after_finalize.connect
def setup_periodic_tasks(sender, **kwargs):
    """Setup periodic tasks"""
    # Example: Check for pending notifications every 5 minutes
    sender.add_periodic_task(
        300.0,
        retry_failed_notifications.s(),
        name='retry_failed_notifications_every_5min'
    )
```

**Arquivo:** `backend/app/tasks/email_tasks.py`

```python
from celery import shared_task, Task
from typing import Optional
from app.services.email_service import EmailService
from app.services.notification_service import NotificationService  # Will create
from app.repositories.notification import NotificationLogRepository, NotificationPreferenceRepository
from app.core.database import get_db
from app.models.notification import NotificationLog, NotificationChannel, NotificationType
from datetime import datetime
import logging
from sqlalchemy import select

logger = logging.getLogger(__name__)

email_service = EmailService()

class CallbackTask(Task):
    """Task class with callbacks"""
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(f'Task {task_id} retry: {exc}')
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f'Task {task_id} failed: {exc}')

@shared_task(base=CallbackTask, bind=True, max_retries=3)
async def send_email_notification_task(
    self,
    org_id: str,
    user_id: str,
    to_email: str,
    notification_type: str,
    subject: str,
    html_content: str,
    metadata: Optional[dict] = None
):
    """
    Send email notification via Celery
    
    Retries 3 times on failure with exponential backoff
    """
    try:
        # Verify user preferences
        # This would require DB session setup
        logger.info(f"📧 Enviando email para {to_email} - {notification_type}")
        
        result = await email_service.send_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content
        )
        
        if result['success']:
            logger.info(f"✅ Email enviado com sucesso para {to_email}")
            return {
                'status': 'sent',
                'to_email': to_email,
                'message_id': result.get('message_id')
            }
        else:
            logger.error(f"❌ Erro ao enviar: {result['error']}")
            raise Exception(result['error'])
    
    except Exception as exc:
        logger.error(f"❌ Tentativa falhou: {exc}")
        # Retry with exponential backoff: 5s, 25s, 125s
        raise self.retry(exc=exc, countdown=5 ** self.request.retries)

@shared_task
def retry_failed_notifications_task():
    """
    Retry failed notifications (periodic task)
    Run every 5 minutes
    """
    logger.info("🔄 Verificando notificações falhadas...")
    # Implementation in next section
    pass

# Convenience functions to enqueue tasks
def send_conversation_assigned_email(
    org_id: str,
    agent_email: str,
    agent_name: str,
    contact_name: str,
    conversation_id: str
):
    """Enqueue conversation assigned email"""
    html = email_service.render_template(
        'conversation_assigned.html',
        {
            'agent_name': agent_name,
            'contact_name': contact_name,
            'conversation_id': conversation_id,
            'dashboard_url': 'https://pytake.app',
            'now': datetime.utcnow()
        }
    )
    
    return send_email_notification_task.delay(
        org_id=org_id,
        user_id='system',  # Will be set properly
        to_email=agent_email,
        notification_type='conversation_assigned',
        subject=f'Nova conversa: {contact_name}',
        html_content=html,
        metadata={
            'contact_name': contact_name,
            'conversation_id': conversation_id
        }
    )
```

#### 2.4 Criar Notification Service
**Arquivo:** `backend/app/services/notification_service.py` (parcial)

```python
from typing import Optional, List
from app.repositories.notification import NotificationPreferenceRepository
from app.models.notification import NotificationChannel, NotificationType
from app.tasks.email_tasks import send_conversation_assigned_email
from datetime import datetime, time
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    def __init__(self, pref_repo: NotificationPreferenceRepository):
        self.pref_repo = pref_repo
    
    async def should_notify(
        self,
        user_id: str,
        org_id: str,
        channel: NotificationChannel
    ) -> bool:
        """Check if user should be notified via this channel"""
        pref = await self.pref_repo.get_or_create(user_id, org_id)
        
        # Check channel enabled
        if channel == NotificationChannel.EMAIL and not pref.email_enabled:
            return False
        if channel == NotificationChannel.SMS and not pref.sms_enabled:
            return False
        if channel == NotificationChannel.WEBSOCKET and not pref.websocket_enabled:
            return False
        
        # Check quiet hours
        if pref.quiet_hours_enabled:
            now = datetime.utcnow().time()
            start = datetime.strptime(pref.quiet_hours_start, "%H:%M").time()
            end = datetime.strptime(pref.quiet_hours_end, "%H:%M").time()
            
            if start < end:
                if start <= now <= end:
                    return False
            else:  # Overnight quiet hours (e.g., 22:00 to 08:00)
                if now >= start or now <= end:
                    return False
        
        return True
    
    async def notify_conversation_assigned(
        self,
        org_id: str,
        user_id: str,
        user_email: str,
        user_name: str,
        contact_name: str,
        conversation_id: str
    ):
        """Notify agent of conversation assignment"""
        
        # Check if should send via email
        if await self.should_notify(user_id, org_id, NotificationChannel.EMAIL):
            send_conversation_assigned_email(
                org_id=org_id,
                agent_email=user_email,
                agent_name=user_name,
                contact_name=contact_name,
                conversation_id=conversation_id
            )
            logger.info(f"📧 Conversa atribuída enfileirada para {user_name}")
```

---

## 🗓️ PHASE 3: Integração com Eventos (Semana 3)

### Objetivo
Conectar notificações com eventos do sistema principal

### Tasks

#### 3.1 Atualizar Conversation Service
**Arquivo:** `backend/app/services/conversation_service.py`

Adicionar ao método que atribui conversa:

```python
async def assign_conversation_to_agent(
    self,
    conversation_id: str,
    agent_id: str,
    org_id: str
):
    """Assign conversation to agent and notify"""
    conversation = await self.repo.get(conversation_id)
    
    # Existing assignment logic...
    conversation.assigned_to_user_id = agent_id
    conversation.assigned_at = datetime.utcnow()
    await self.repo.update(conversation)
    
    # NEW: Send notification
    try:
        agent = await self.user_repo.get(agent_id)
        contact = await self.contact_repo.get(conversation.contact_id)
        
        # Import notification service
        from app.services.notification_service import NotificationService
        from app.repositories.notification import NotificationPreferenceRepository
        
        notification_svc = NotificationService(
            NotificationPreferenceRepository(self.db)
        )
        
        await notification_svc.notify_conversation_assigned(
            org_id=org_id,
            user_id=agent_id,
            user_email=agent.email,
            user_name=agent.full_name,
            contact_name=contact.name,
            conversation_id=conversation_id
        )
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")
        # Don't fail the main operation
```

#### 3.2 Criar Endpoints de Notificações
**Arquivo:** `backend/app/api/v1/endpoints/notifications.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from app.schemas.notification import NotificationPreferenceResponse, NotificationPreferenceUpdate
from app.services.notification_service import NotificationService
from app.repositories.notification import NotificationPreferenceRepository
from app.core.database import get_db
from app.core.security import get_current_user, get_organization_id
from app.models.user import User

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/preferences", response_model=NotificationPreferenceResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_organization_id),
    db = Depends(get_db)
):
    """Get current user's notification preferences"""
    repo = NotificationPreferenceRepository(db)
    pref = await repo.get_or_create(current_user.id, org_id)
    return pref

@router.put("/preferences", response_model=NotificationPreferenceResponse)
async def update_notification_preferences(
    data: NotificationPreferenceUpdate,
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_organization_id),
    db = Depends(get_db)
):
    """Update notification preferences"""
    repo = NotificationPreferenceRepository(db)
    pref = await repo.get_or_create(current_user.id, org_id)
    
    # Update only provided fields
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(pref, key, value)
    
    await repo.update(pref)
    return pref

@router.post("/test-email")
async def test_email_notification(
    current_user: User = Depends(get_current_user),
    org_id: str = Depends(get_organization_id)
):
    """Send test email to current user"""
    from app.tasks.email_tasks import send_email_notification_task
    from app.services.email_service import EmailService
    
    email_svc = EmailService()
    html = email_svc.render_template(
        'test_email.html',
        {'user_name': current_user.full_name}
    )
    
    # Enqueue task
    send_email_notification_task.delay(
        org_id=org_id,
        user_id=current_user.id,
        to_email=current_user.email,
        notification_type='test',
        subject='[TEST] PyTake - Teste de Email',
        html_content=html
    )
    
    return {"message": "Email de teste enfileirado"}
```

#### 3.3 Atualizar Router Principal
**Arquivo:** `backend/app/api/v1/router.py`

Adicionar:
```python
from app.api.v1.endpoints import notifications

api_router.include_router(notifications.router, prefix="/api/v1")
```

---

## 🗓️ PHASE 4: Polish & Testing (Semana 4)

### Tasks

#### 4.1 Implementar Rate Limiting
**Arquivo:** `backend/app/services/notification_service.py`

Adicionar ao serviço:
```python
from app.core.rate_limit import limiter

@limiter.limit("100/hour")
async def send_email_batch(
    self,
    org_id: str,
    emails: List[dict]
):
    """Send batch of emails with rate limiting"""
    for email in emails:
        send_email_notification_task.delay(**email)
```

#### 4.2 Criar Testes
**Arquivo:** `backend/tests/test_notification_service.py`

```python
import pytest
from app.services.notification_service import NotificationService
from app.repositories.notification import NotificationPreferenceRepository
from app.models.notification import NotificationChannel, NotificationPreference

@pytest.mark.asyncio
async def test_should_notify_respects_enabled_flag():
    """Test that notification respects enabled/disabled flag"""
    # Setup
    repo = NotificationPreferenceRepository(db_session)
    service = NotificationService(repo)
    
    # Create preference with email disabled
    pref = NotificationPreference(
        user_id="test-user",
        organization_id="test-org",
        email_enabled=False
    )
    
    # Should not notify
    can_notify = await service.should_notify(
        "test-user", "test-org", NotificationChannel.EMAIL
    )
    assert can_notify is False

@pytest.mark.asyncio
async def test_should_notify_respects_quiet_hours():
    """Test that quiet hours are respected"""
    # Create preference with quiet hours 22:00-08:00
    pref = NotificationPreference(
        user_id="test-user",
        organization_id="test-org",
        quiet_hours_enabled=True,
        quiet_hours_start="22:00",
        quiet_hours_end="08:00"
    )
    
    # Mock time to 23:00 (inside quiet hours)
    # Should not notify
    # ...

@pytest.mark.asyncio
async def test_celery_task_retry_on_failure():
    """Test that email task retries on SMTP failure"""
    # Mock SMTP to fail
    # Verify task retries
    # Verify backoff timing
    # ...

@pytest.mark.asyncio
async def test_multi_tenant_isolation():
    """Test that notifications only go to correct org"""
    # Create user in org A
    # Create same user_id in org B
    # Send notification for org A
    # Verify org B user not notified
    # ...
```

#### 4.3 Criar Frontend UI para Preferências
**Arquivo:** `frontend/src/app/admin/settings/notifications.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotification';
import { getApiUrl, getAuthHeaders } from '@/lib/api';

export default function NotificationSettingsPage() {
  const { success, error } = useNotifications();
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await fetch(
        getApiUrl('/api/v1/notifications/preferences'),
        { headers: getAuthHeaders() }
      );
      if (!response.ok) throw new Error('Erro ao carregar preferências');
      const data = await response.json();
      setPreferences(data);
    } catch (err) {
      error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (updated: any) => {
    try {
      const response = await fetch(
        getApiUrl('/api/v1/notifications/preferences'),
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(updated)
        }
      );
      if (!response.ok) throw new Error('Erro ao salvar');
      success('Preferências atualizadas!');
      fetchPreferences();
    } catch (err) {
      error((err as Error).message);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Preferências de Notificação</h1>
      
      {/* Email Settings */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow">
        <h2 className="text-xl font-semibold mb-4">📧 Email</h2>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={preferences?.email_enabled}
            onChange={(e) => {
              const updated = { ...preferences, email_enabled: e.target.checked };
              setPreferences(updated);
              handleSave(updated);
            }}
            className="w-5 h-5"
          />
          <span>Receber notificações por email</span>
        </label>
      </div>

      {/* Quiet Hours */}
      <div className="bg-white rounded-lg p-6 mb-6 shadow">
        <h2 className="text-xl font-semibold mb-4">🌙 Horário de Não Perturbar</h2>
        <label className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            checked={preferences?.quiet_hours_enabled}
            onChange={(e) => {
              const updated = { ...preferences, quiet_hours_enabled: e.target.checked };
              setPreferences(updated);
              handleSave(updated);
            }}
            className="w-5 h-5"
          />
          <span>Ativar horário de não perturbar</span>
        </label>

        {preferences?.quiet_hours_enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">De:</label>
              <input
                type="time"
                value={preferences?.quiet_hours_start}
                onChange={(e) => {
                  const updated = { ...preferences, quiet_hours_start: e.target.value };
                  setPreferences(updated);
                  handleSave(updated);
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Até:</label>
              <input
                type="time"
                value={preferences?.quiet_hours_end}
                onChange={(e) => {
                  const updated = { ...preferences, quiet_hours_end: e.target.value };
                  setPreferences(updated);
                  handleSave(updated);
                }}
                className="w-full border rounded px-3 py-2"
              />
            </div>
          </div>
        )}
      </div>

      {/* Test Email */}
      <button
        onClick={async () => {
          try {
            const response = await fetch(
              getApiUrl('/api/v1/notifications/test-email'),
              {
                method: 'POST',
                headers: getAuthHeaders()
              }
            );
            if (!response.ok) throw new Error('Erro ao enviar');
            success('Email de teste enfileirado!');
          } catch (err) {
            error((err as Error).message);
          }
        }}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Enviar Email de Teste
      </button>
    </div>
  );
}
```

#### 4.4 Documentação de Deployment
**Arquivo:** `DEPLOYMENT_EMAIL_NOTIFICATIONS.md`

```markdown
# Deployment: Sistema de Notificações

## Pre-requisitos

- SMTP configurado (Gmail, SendGrid, etc)
- Redis rodando
- PostgreSQL com migrations aplicadas

## Environment Variables

```bash
# SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=app_password_here  # GitHub Secret!
SMTP_FROM_EMAIL=noreply@pytake.com
SMTP_FROM_NAME=PyTake

# Celery
CELERY_BROKER_URL=redis://default:password@redis:6379/1
CELERY_RESULT_BACKEND=redis://default:password@redis:6379/2
```

## Iniciar Celery Worker

```bash
# Local development
podman exec pytake-backend celery -A app.tasks.celery_app worker \
  --loglevel=info \
  --concurrency=4

# Production (systemd)
# [Unit]
# Description=PyTake Celery Worker
# After=network.target redis.service
#
# [Service]
# Type=forking
# ExecStart=/path/to/venv/bin/celery -A app.tasks.celery_app worker
# Restart=always
```

## Monitoramento

```bash
# Via Flower (web interface)
podman exec pytake-backend pip install flower
podman exec pytake-backend celery -A app.tasks.celery_app flower --port=5555
# Acesse: http://localhost:5555
```

## Troubleshooting

```bash
# Ver logs
podman logs pytake-backend

# Verificar tasks enfileiradas
podman exec pytake-redis redis-cli LRANGE celery 0 -1

# Limpar queue
podman exec pytake-redis redis-cli FLUSHDB
```
```

---

## 📊 Checklist de Implementação

- [ ] **Phase 1**
  - [ ] Models criados
  - [ ] Schemas Pydantic
  - [ ] Migration Alembic
  - [ ] SMTP config atualizada
  - [ ] Repositories implementadas

- [ ] **Phase 2**
  - [ ] EmailService implementado
  - [ ] Templates criados
  - [ ] Celery app configurado
  - [ ] Email tasks criadas
  - [ ] NotificationService base

- [ ] **Phase 3**
  - [ ] Conversation Service atualizado
  - [ ] Endpoints de notificação
  - [ ] Router atualizado
  - [ ] Integration tests

- [ ] **Phase 4**
  - [ ] Rate limiting
  - [ ] Unit tests completos
  - [ ] Frontend UI
  - [ ] Deployment docs
  - [ ] Code review

---

## 🎯 Definições de Pronto

- ✅ Migrations rodam sem erro
- ✅ SMTP conecta corretamente
- ✅ Emails enviados via Celery
- ✅ Multi-tenancy respeitada
- ✅ RBAC validado
- ✅ Tests cobrindo +80%
- ✅ Documentação completa
- ✅ Deployment testado

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 25 de Novembro de 2025  
**Próximo Passo:** Iniciar Phase 1 de Implementação
