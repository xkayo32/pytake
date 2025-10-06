# 🏗️ Arquitetura do Sistema PyTake

## 📋 Índice
- [Visão Geral](#visão-geral)
- [Arquitetura de Alto Nível](#arquitetura-de-alto-nível)
- [Componentes do Backend](#componentes-do-backend)
- [Componentes do Frontend](#componentes-do-frontend)
- [Fluxo de Dados](#fluxo-de-dados)
- [Infraestrutura](#infraestrutura)
- [Segurança](#segurança)
- [Escalabilidade](#escalabilidade)

---

## 🎯 Visão Geral

O **PyTake** é uma plataforma SaaS completa para automação de atendimento via WhatsApp, construída com arquitetura moderna de microsserviços e seguindo princípios de Clean Architecture e Domain-Driven Design (DDD).

### Tecnologias Core

**Backend:**
- Python 3.11+
- FastAPI (Framework web assíncrono)
- SQLAlchemy 2.0 (ORM)
- Pydantic v2 (Validação de dados)
- Celery (Processamento assíncrono)
- Redis (Cache e message broker)
- PostgreSQL 15+ (Banco principal)
- MongoDB 7+ (Logs e analytics)

**Frontend:**
- Next.js 14+ (App Router)
- React 18
- TypeScript 5+
- Tailwind CSS + Shadcn/UI
- Zustand (State management)
- React Query (Server state)
- Socket.io Client (WebSocket)

---

## 🏛️ Arquitetura de Alto Nível

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│  Next.js App    │   Mobile App (Future)   │   External APIs     │
└────────┬─────────────────────┬────────────────────────┬─────────┘
         │                     │                        │
         │                     │                        │
┌────────▼─────────────────────▼────────────────────────▼─────────┐
│                      API GATEWAY / NGINX                         │
│                   (Load Balancer + SSL/TLS)                      │
└────────┬─────────────────────────────────────────────────────────┘
         │
         │
┌────────▼─────────────────────────────────────────────────────────┐
│                    BACKEND API (FastAPI)                          │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │  Auth Service   │  │  Chat Service    │  │  Bot Service   │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │ Contact Service │  │ Campaign Service │  │  Analytics     │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                   │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────────┐ │
│  │WhatsApp Service │  │  Webhook Service │  │  Integration   │ │
│  └─────────────────┘  └──────────────────┘  └────────────────┘ │
│                                                                   │
└────┬──────────────────────────┬──────────────────────────┬───────┘
     │                          │                          │
     │                          │                          │
┌────▼────────┐      ┌─────────▼────────┐      ┌─────────▼────────┐
│ PostgreSQL  │      │     Redis        │      │    MongoDB       │
│  (Primary)  │      │ (Cache + Queue)  │      │  (Logs + Docs)   │
└─────────────┘      └──────────────────┘      └──────────────────┘
                              │
                              │
                     ┌────────▼────────┐
                     │  Celery Workers │
                     │  (Background)   │
                     └─────────────────┘
                              │
                     ┌────────▼────────┐
                     │  WhatsApp API   │
                     │  (Meta Cloud)   │
                     └─────────────────┘
```

---

## 🔧 Componentes do Backend

### 1. Camada de Apresentação (API Layer)

#### FastAPI Routers
```
app/api/v1/
├── auth.py           # Autenticação e autorização
├── users.py          # Gerenciamento de usuários
├── organizations.py  # Multi-tenancy
├── chatbots.py       # CRUD de chatbots
├── conversations.py  # Conversas e mensagens
├── contacts.py       # Gerenciamento de contatos
├── campaigns.py      # Campanhas de mensagem
├── analytics.py      # Relatórios e métricas
├── integrations.py   # Integrações externas
├── webhooks.py       # Webhooks entrada/saída
└── websocket.py      # WebSocket para chat real-time
```

#### Middlewares
- **CORS Middleware**: Controle de origens
- **Authentication Middleware**: Validação JWT
- **Rate Limiting Middleware**: Proteção contra abuso
- **Request Logging Middleware**: Auditoria
- **Error Handler Middleware**: Tratamento global de erros

### 2. Camada de Domínio (Business Logic)

#### Services (Lógica de Negócio)
```python
app/services/
├── auth_service.py           # Autenticação, JWT, refresh tokens
├── chatbot_service.py        # Lógica de criação e execução de bots
├── conversation_service.py   # Gerenciamento de conversas
├── contact_service.py        # CRM e segmentação
├── campaign_service.py       # Envio em massa
├── whatsapp_service.py       # Integração WhatsApp API
├── ai_service.py             # Integração com LLMs (GPT, Claude)
├── analytics_service.py      # Processamento de métricas
├── notification_service.py   # Notificações sistema
└── webhook_service.py        # Processamento de webhooks
```

#### Domain Models (Entidades de Negócio)
- Separação clara entre entidades de domínio e modelos de persistência
- Value Objects para conceitos imutáveis
- Aggregates para consistência transacional

### 3. Camada de Dados (Data Layer)

#### SQLAlchemy Models
```python
app/models/
├── user.py               # Usuários do sistema
├── organization.py       # Multi-tenancy
├── chatbot.py           # Definição de chatbots
├── flow.py              # Fluxos conversacionais
├── node.py              # Nós do fluxo
├── conversation.py      # Conversas
├── message.py           # Mensagens
├── contact.py           # Contatos/leads
├── tag.py               # Tags de organização
├── campaign.py          # Campanhas
├── template.py          # Templates WhatsApp
├── integration.py       # Integrações
├── webhook.py           # Configurações webhook
└── audit_log.py         # Logs de auditoria
```

#### Repositories Pattern
```python
app/repositories/
├── base_repository.py
├── user_repository.py
├── chatbot_repository.py
├── conversation_repository.py
└── ...
```

### 4. Camada de Tarefas Assíncronas

#### Celery Tasks
```python
app/tasks/
├── whatsapp_tasks.py      # Envio de mensagens
├── campaign_tasks.py      # Processamento de campanhas
├── analytics_tasks.py     # Agregação de dados
├── export_tasks.py        # Exportações (CSV, PDF)
└── cleanup_tasks.py       # Limpeza de dados antigos
```

#### Configuração de Filas
- **high_priority**: Mensagens em tempo real
- **default**: Operações normais
- **low_priority**: Relatórios e exports
- **scheduled**: Tarefas agendadas

### 5. Integração WhatsApp

#### WhatsApp Cloud API Client
```python
app/integrations/whatsapp/
├── client.py              # Cliente HTTP para API
├── webhook_handler.py     # Processamento de webhooks
├── message_builder.py     # Construção de mensagens
├── media_handler.py       # Upload/download de mídia
└── template_manager.py    # Gerenciamento de templates
```

#### Tipos de Mensagens Suportadas
- Texto simples
- Imagens, vídeos, documentos, áudio
- Botões interativos (reply buttons)
- Listas (list messages)
- Templates aprovados
- Localização
- Contatos

---

## 🎨 Componentes do Frontend

### Estrutura Next.js (App Router)

```
frontend/app/
├── (auth)/
│   ├── login/
│   ├── register/
│   └── forgot-password/
│
├── (dashboard)/
│   ├── layout.tsx           # Layout principal
│   ├── page.tsx             # Dashboard home
│   ├── chatbots/
│   │   ├── page.tsx         # Lista de chatbots
│   │   ├── [id]/
│   │   │   ├── edit/        # Editor visual
│   │   │   └── analytics/   # Métricas do bot
│   │   └── new/
│   ├── conversations/
│   │   ├── page.tsx         # Inbox
│   │   └── [id]/            # Chat individual
│   ├── contacts/
│   │   ├── page.tsx         # CRM
│   │   └── [id]/            # Detalhes do contato
│   ├── campaigns/
│   │   ├── page.tsx
│   │   └── new/
│   ├── analytics/
│   │   └── page.tsx
│   ├── integrations/
│   │   └── page.tsx
│   └── settings/
│       ├── profile/
│       ├── team/
│       ├── billing/
│       └── api/
│
└── api/                     # API Routes (se necessário)
```

### Componentes Reutilizáveis

```
frontend/components/
├── ui/                      # Shadcn/UI components
├── layout/
│   ├── Navbar.tsx
│   ├── Sidebar.tsx
│   └── Footer.tsx
├── chatbot/
│   ├── FlowEditor/          # Editor drag-and-drop
│   │   ├── Canvas.tsx
│   │   ├── NodeTypes/
│   │   ├── Sidebar.tsx
│   │   └── Toolbar.tsx
│   └── FlowPreview/
├── chat/
│   ├── ChatWindow.tsx
│   ├── MessageList.tsx
│   ├── MessageInput.tsx
│   └── ContactInfo.tsx
├── contacts/
│   ├── ContactTable.tsx
│   ├── ContactForm.tsx
│   └── SegmentBuilder.tsx
├── campaigns/
│   ├── CampaignWizard.tsx
│   ├── TemplateSelector.tsx
│   └── AudienceSelector.tsx
└── analytics/
    ├── Dashboard.tsx
    ├── Charts/
    └── ReportBuilder.tsx
```

### Gerenciamento de Estado

#### Zustand Stores
```typescript
frontend/stores/
├── authStore.ts           // Autenticação
├── chatStore.ts           // Estado do chat
├── flowEditorStore.ts     // Editor de fluxos
├── contactsStore.ts       // Contatos selecionados
└── uiStore.ts             // Estado da UI (modals, etc)
```

#### React Query
- Cache automático de dados da API
- Refetch em foco/reconexão
- Mutações otimistas
- Infinite scroll para listas

### WebSocket para Real-time

```typescript
frontend/services/websocket.ts
```

**Eventos:**
- `message:new` - Nova mensagem recebida
- `message:status` - Status de mensagem (enviada, entregue, lida)
- `conversation:updated` - Atualização em conversa
- `agent:typing` - Indicador de digitação
- `notification` - Notificações sistema

---

## 🔄 Fluxo de Dados

### Fluxo de Mensagem Recebida (WhatsApp → Sistema)

```
┌──────────────┐
│   WhatsApp   │
│     User     │
└──────┬───────┘
       │
       │ 1. Mensagem enviada
       ▼
┌──────────────┐
│  WhatsApp    │
│  Cloud API   │
└──────┬───────┘
       │
       │ 2. Webhook POST
       ▼
┌──────────────────┐
│  FastAPI Server  │
│  /webhooks/wa    │
└──────┬───────────┘
       │
       │ 3. Valida e processa
       ▼
┌──────────────────┐
│ Webhook Service  │
│  + Redis Queue   │
└──────┬───────────┘
       │
       │ 4. Task assíncrona
       ▼
┌──────────────────┐
│  Celery Worker   │
│ process_message  │
└──────┬───────────┘
       │
       ├─────────────────┐
       │                 │
       ▼                 ▼
┌──────────────┐  ┌─────────────┐
│  Bot Engine  │  │  Save DB    │
│  (se ativo)  │  │  + MongoDB  │
└──────┬───────┘  └─────────────┘
       │
       │ 5. Resposta gerada
       ▼
┌──────────────────┐
│ WhatsApp Service │
│  Send Message    │
└──────┬───────────┘
       │
       │ 6. POST /messages
       ▼
┌──────────────┐
│  WhatsApp    │
│  Cloud API   │
└──────┬───────┘
       │
       │ 7. Entrega
       ▼
┌──────────────┐
│   WhatsApp   │
│     User     │
└──────────────┘
       │
       │ 8. WebSocket para frontend
       ▼
┌──────────────┐
│  Dashboard   │
│   (Inbox)    │
└──────────────┘
```

### Fluxo de Mensagem Enviada (Agente → WhatsApp)

```
┌──────────────┐
│   Agente     │
│  (Frontend)  │
└──────┬───────┘
       │
       │ 1. Envia mensagem
       ▼
┌──────────────────┐
│  API /messages   │
│  POST request    │
└──────┬───────────┘
       │
       │ 2. Valida + Salva DB
       ▼
┌──────────────────┐
│ Message Service  │
└──────┬───────────┘
       │
       │ 3. Queue para envio
       ▼
┌──────────────────┐
│  Redis + Celery  │
└──────┬───────────┘
       │
       │ 4. Worker processa
       ▼
┌──────────────────┐
│ WhatsApp Service │
│  Send to API     │
└──────┬───────────┘
       │
       │ 5. POST /messages
       ▼
┌──────────────┐
│  WhatsApp    │
│  Cloud API   │
└──────┬───────┘
       │
       │ 6. Status webhook
       ▼
┌──────────────────┐
│  /webhooks/wa    │
│  Status update   │
└──────┬───────────┘
       │
       │ 7. Atualiza DB + WebSocket
       ▼
┌──────────────┐
│  Frontend    │
│  (atualiza)  │
└──────────────┘
```

---

## 🖥️ Infraestrutura

### Ambiente de Desenvolvimento

```yaml
# docker-compose.yml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    depends_on: [db, redis, mongo]

  frontend:
    build: ./frontend
    ports: ["3000:3000"]

  db:
    image: postgres:15-alpine
    ports: ["5432:5432"]

  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]

  mongo:
    image: mongo:7
    ports: ["27017:27017"]

  celery:
    build: ./backend
    command: celery -A app.tasks worker
    depends_on: [redis, db]

  celery-beat:
    build: ./backend
    command: celery -A app.tasks beat
```

### Ambiente de Produção

**Infraestrutura Recomendada:**

1. **Servidor de Aplicação**
   - AWS EC2 / DigitalOcean Droplets / GCP Compute
   - Mínimo: 2 vCPU, 4GB RAM
   - Nginx como reverse proxy

2. **Banco de Dados**
   - RDS PostgreSQL (AWS) ou managed PostgreSQL
   - Backup automático diário
   - Read replicas para analytics

3. **Cache & Queue**
   - ElastiCache Redis (AWS) ou Redis Cloud
   - Persistência habilitada

4. **Storage de Mídia**
   - S3 (AWS) ou equivalente
   - CloudFront como CDN

5. **Logs & Monitoring**
   - MongoDB Atlas para logs
   - CloudWatch / DataDog para métricas
   - Sentry para error tracking

6. **CI/CD**
   - GitHub Actions
   - Docker Hub para imagens
   - Deploy automático

### Escalabilidade Horizontal

```
              ┌─────────────┐
              │ Load Balancer│
              │   (Nginx)    │
              └──────┬───────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐
   │ Backend │ │ Backend │ │ Backend │
   │Instance1│ │Instance2│ │Instance3│
   └────┬────┘ └────┬────┘ └────┬────┘
        │           │           │
        └───────────┼───────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
        ▼                       ▼
   ┌─────────┐           ┌──────────┐
   │  Redis  │           │PostgreSQL│
   │ Cluster │           │  Primary │
   └─────────┘           │  +Replicas│
                         └──────────┘
```

---

## 🔐 Segurança

### Autenticação e Autorização

**JWT (JSON Web Tokens):**
```python
# Access Token: 15 minutos
# Refresh Token: 7 dias
# Armazenado: httpOnly cookies (frontend) + Redis blacklist
```

**RBAC (Role-Based Access Control):**
```python
ROLES = {
    "SUPER_ADMIN": ["*"],
    "ORG_ADMIN": ["org:*", "users:manage", "chatbots:*"],
    "AGENT": ["conversations:read", "conversations:write", "contacts:read"],
    "VIEWER": ["conversations:read", "analytics:read"]
}
```

### Proteções Implementadas

1. **Rate Limiting**
   - Por IP: 100 req/min
   - Por usuário: 1000 req/min
   - Por endpoint sensível: 10 req/min

2. **Validação de Entrada**
   - Pydantic schemas em todos os endpoints
   - Sanitização de HTML/SQL
   - Validação de webhooks (HMAC SHA256)

3. **Criptografia**
   - HTTPS obrigatório (TLS 1.3)
   - Senhas: bcrypt (cost factor 12)
   - Dados sensíveis: AES-256-GCM
   - Tokens API: argon2

4. **CORS**
   - Whitelist de origens permitidas
   - Credentials: true apenas para domínio próprio

5. **Proteção WhatsApp**
   - Validação de assinatura em webhooks
   - Token de verificação seguro
   - Rate limiting específico

### Compliance

**LGPD/GDPR:**
- Direito ao esquecimento (delete account)
- Exportação de dados pessoais
- Consentimento explícito
- Logs de acesso a dados sensíveis
- DPO contact information

---

## ⚡ Escalabilidade

### Estratégias de Performance

1. **Caching Multi-Layer**
   ```
   Browser Cache → CDN → Redis → Database
   ```

2. **Database Optimizations**
   - Índices em campos de busca frequente
   - Particionamento de tabelas grandes (messages, logs)
   - Connection pooling (SQLAlchemy)
   - Query optimization (N+1 prevention)

3. **Async Processing**
   - Mensagens: async via Celery
   - Webhooks: queue immediate, process async
   - Reports: gerados em background

4. **Frontend Optimizations**
   - Server Components (Next.js)
   - Image optimization automática
   - Code splitting
   - Lazy loading de componentes pesados
   - Virtual scrolling para listas grandes

### Monitoramento

**Métricas Essenciais:**
- Latência de API (p50, p95, p99)
- Taxa de erro (4xx, 5xx)
- Throughput de mensagens/segundo
- CPU/RAM usage
- Database connections pool
- Queue size (Celery)
- WebSocket connections ativas

**Alertas:**
- Error rate > 1%
- Latência p95 > 1s
- Queue size > 10000
- CPU > 80% por 5min
- Disco > 85%

---

## 🔮 Arquitetura Futura

### Microserviços (Fase 2)

Quando escalar para 100k+ usuários, considerar split:

```
├── auth-service       # Autenticação
├── chat-service       # Conversas
├── bot-service        # Execução de bots
├── campaign-service   # Campanhas
├── analytics-service  # Analytics
└── integration-service # Integrações
```

### Event-Driven Architecture

- Apache Kafka para event streaming
- Event sourcing para auditoria completa
- CQRS para separação read/write

### Multi-Region

- Deploy em múltiplas regiões AWS
- Database replication cross-region
- CDN global para frontend

---

**Versão:** 1.0.0
**Última atualização:** 2025-10-03
