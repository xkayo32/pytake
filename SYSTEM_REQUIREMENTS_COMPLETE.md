# PyTake - Documentação Completa do Sistema
## Especificação para Reconstrução do Zero

---

## 1. VISÃO GERAL DO SISTEMA

### 1.1 Propósito
PyTake é uma plataforma de automação e gerenciamento de conversas do WhatsApp Business API, projetada para empresas que precisam gerenciar grandes volumes de mensagens, automatizar respostas, integrar com sistemas ERP e fornecer atendimento multicanal.

### 1.2 Objetivos Principais
- Gerenciamento centralizado de múltiplas contas WhatsApp Business
- Automação de conversas com fluxos inteligentes
- Integração com sistemas ERP (HubSoft, IxcSoft, MkSolutions, SisGP)
- Multi-tenancy para SaaS
- Campanhas de marketing via WhatsApp
- Analytics e dashboards em tempo real
- Conformidade com LGPD/GDPR

### 1.3 Stack Tecnológica Atual
- **Backend**: Rust com Actix-Web
- **Banco de Dados**: PostgreSQL 15+
- **Cache**: Redis 7+
- **ORM**: Sea-ORM
- **API**: REST + GraphQL
- **WebSocket**: Para comunicação em tempo real
- **Autenticação**: JWT
- **Deploy**: Docker + Docker Compose
- **Proxy Reverso**: Nginx
- **SSL**: Let's Encrypt

---

## 2. ARQUITETURA DO SISTEMA

### 2.1 Arquitetura de Microsserviços
```
┌─────────────────────────────────────────────────────────┐
│                    NGINX (SSL/TLS)                       │
│                   api.pytake.net:443                     │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────┴────────────────────────────────┐
│                   BACKEND API (Rust)                     │
│                      Port: 8080                          │
├──────────────────────────────────────────────────────────┤
│  - REST API          │  - GraphQL API                   │
│  - WebSocket         │  - Webhook Handler               │
│  - Auth Service      │  - WhatsApp Service              │
│  - Campaign Manager  │  - Flow Engine                   │
│  - ERP Connectors    │  - Multi-tenant Manager          │
└────────────┬──────────────────────┬─────────────────────┘
             │                      │
    ┌────────┴──────────┐  ┌───────┴──────────┐
    │   PostgreSQL       │  │     Redis        │
    │   Port: 5432       │  │   Port: 6379     │
    │                    │  │                  │
    │ - Users            │  │ - Session Cache  │
    │ - Messages         │  │ - Rate Limiting  │
    │ - Conversations    │  │ - Message Queue  │
    │ - Flows            │  │ - Config Cache   │
    │ - Campaigns        │  │                  │
    └────────────────────┘  └──────────────────┘
```

### 2.2 Estrutura de Módulos
```
backend/
├── simple_api/           # API principal
│   ├── src/
│   │   ├── main.rs              # Entry point
│   │   ├── auth.rs              # Autenticação JWT
│   │   ├── database.rs          # Conexão DB
│   │   ├── whatsapp/            # WhatsApp handlers
│   │   ├── flows/               # Flow engine
│   │   ├── campaign_manager.rs  # Campanhas
│   │   ├── multi_tenant.rs      # Multi-tenancy
│   │   ├── erp_connectors.rs    # Integrações ERP
│   │   ├── ai_assistant.rs      # IA/ChatGPT
│   │   ├── data_privacy.rs      # LGPD/GDPR
│   │   ├── graphql_api.rs       # GraphQL
│   │   └── websocket.rs         # WebSocket
│   └── Cargo.toml
├── pytake-core/         # Lógica de negócio
├── pytake-db/           # Entities e migrations
└── pytake-whatsapp/     # Cliente WhatsApp

```

---

## 3. REGRAS DE NEGÓCIO PRINCIPAIS

### 3.1 Autenticação e Autorização

#### Requisitos
- Login via email/senha
- Tokens JWT com expiração de 24 horas
- Refresh tokens com validade de 7 dias
- Roles: admin, user, agent, viewer
- Permissões granulares por recurso

#### Implementação
```rust
// Estrutura do JWT Claims
{
  "sub": "user_id_uuid",
  "email": "user@example.com",
  "role": "admin",
  "tenant_id": "tenant_uuid",
  "exp": 1234567890,
  "iat": 1234567890
}
```

#### Endpoints Necessários
- POST /api/v1/auth/register
- POST /api/v1/auth/login
- POST /api/v1/auth/refresh
- POST /api/v1/auth/logout
- GET /api/v1/auth/me
- POST /api/v1/auth/forgot-password
- POST /api/v1/auth/reset-password

### 3.2 Gestão de Configurações WhatsApp

#### Requisitos
- Múltiplas contas WhatsApp por tenant
- Suporte para WhatsApp Business API oficial
- Suporte para Evolution API
- Webhook para recebimento de mensagens
- Rate limiting por número

#### Dados da Configuração
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "name": "Config Principal",
  "phone_number": "+5511999999999",
  "phone_number_id": "whatsapp_id",
  "business_account_id": "business_id",
  "access_token": "encrypted_token",
  "webhook_verify_token": "verify_token",
  "api_type": "official|evolution",
  "evolution_instance": "instance_name",
  "evolution_api_key": "api_key",
  "is_active": true,
  "daily_limit": 1000,
  "rate_limit_per_minute": 60
}
```

#### Endpoints Necessários
- GET /api/v1/whatsapp-configs
- POST /api/v1/whatsapp-configs
- PUT /api/v1/whatsapp-configs/{id}
- DELETE /api/v1/whatsapp-configs/{id}
- POST /api/v1/whatsapp-configs/{id}/test
- POST /api/v1/whatsapp-configs/{id}/activate

### 3.3 Envio e Recebimento de Mensagens

#### Tipos de Mensagem Suportados
- Texto simples
- Imagens
- Documentos
- Áudio
- Vídeo
- Localização
- Contatos
- Templates
- Botões interativos
- Listas

#### Fluxo de Envio
1. Validar destinatário
2. Verificar rate limiting
3. Escolher configuração WhatsApp ativa
4. Formatar mensagem conforme API
5. Enviar via API escolhida
6. Salvar no banco de dados
7. Atualizar status via webhook
8. Notificar via WebSocket

#### Fluxo de Recebimento (Webhook)
1. Receber POST do WhatsApp
2. Validar assinatura (se API oficial)
3. Processar tipo de mensagem
4. Salvar no banco de dados
5. Disparar triggers de automação
6. Notificar agentes via WebSocket
7. Retornar 200 OK

#### Endpoints Necessários
- POST /api/v1/whatsapp/send
- POST /api/v1/whatsapp/send-template
- POST /api/v1/whatsapp/send-media
- POST /api/v1/whatsapp/webhook (GET para verificação, POST para mensagens)
- GET /api/v1/whatsapp/messages/{conversation_id}
- PUT /api/v1/whatsapp/messages/{id}/status

### 3.4 Sistema de Fluxos (Flow Builder)

#### Conceitos
- **Flow**: Sequência de nós conectados
- **Node**: Ação ou condição
- **Edge**: Conexão entre nós
- **Session**: Instância de execução do fluxo
- **Context**: Variáveis da sessão

#### Tipos de Nós
1. **Start**: Ponto de entrada
2. **Message**: Enviar mensagem
3. **Wait**: Aguardar resposta
4. **Condition**: Decisão if/else
5. **API Call**: Chamar API externa
6. **Set Variable**: Definir variável
7. **End**: Finalizar fluxo
8. **Transfer**: Transferir para humano
9. **Jump**: Ir para outro fluxo

#### Estrutura do Flow
```json
{
  "id": "uuid",
  "name": "Atendimento Inicial",
  "trigger": "message_received|keyword|schedule",
  "nodes": [
    {
      "id": "node1",
      "type": "message",
      "data": {
        "text": "Olá! Como posso ajudar?",
        "buttons": ["Suporte", "Vendas", "Financeiro"]
      },
      "position": {"x": 100, "y": 100}
    }
  ],
  "edges": [
    {
      "id": "edge1",
      "source": "node1",
      "target": "node2",
      "condition": "response == 'Suporte'"
    }
  ]
}
```

#### Endpoints Necessários
- GET /api/v1/flows
- POST /api/v1/flows
- PUT /api/v1/flows/{id}
- DELETE /api/v1/flows/{id}
- POST /api/v1/flows/{id}/publish
- POST /api/v1/flows/{id}/test
- GET /api/v1/flows/{id}/analytics
- GET /api/v1/flows/templates

### 3.5 Campanhas de Marketing

#### Funcionalidades
- Importação de contatos (CSV, Excel)
- Segmentação por tags e atributos
- Agendamento de envios
- Templates personalizáveis com variáveis
- Throttling automático
- Analytics de campanhas
- A/B testing

#### Estrutura da Campanha
```json
{
  "id": "uuid",
  "name": "Black Friday 2024",
  "type": "broadcast|drip|trigger",
  "status": "draft|scheduled|running|paused|completed",
  "schedule": {
    "start_date": "2024-11-24T00:00:00Z",
    "end_date": "2024-11-30T23:59:59Z",
    "time_zone": "America/Sao_Paulo",
    "send_times": ["09:00", "14:00", "19:00"]
  },
  "targeting": {
    "segments": ["vip_customers"],
    "tags": ["interested_electronics"],
    "conditions": [
      {"field": "last_purchase", "operator": ">", "value": "30_days_ago"}
    ]
  },
  "message": {
    "template_id": "template_uuid",
    "variables": {
      "name": "{{contact.name}}",
      "discount": "{{campaign.discount_percent}}"
    }
  },
  "limits": {
    "daily_limit": 500,
    "hourly_limit": 50,
    "per_contact_limit": 1
  }
}
```

#### Endpoints Necessários
- GET /api/v1/campaigns
- POST /api/v1/campaigns
- PUT /api/v1/campaigns/{id}
- DELETE /api/v1/campaigns/{id}
- POST /api/v1/campaigns/{id}/start
- POST /api/v1/campaigns/{id}/pause
- POST /api/v1/campaigns/{id}/stop
- GET /api/v1/campaigns/{id}/analytics
- POST /api/v1/campaigns/{id}/test

### 3.6 Multi-Tenancy

#### Isolamento de Dados
- Cada tenant tem UUID único
- Filtro automático em todas queries
- Schemas separados no PostgreSQL
- Cache isolado no Redis

#### Estrutura do Tenant
```json
{
  "id": "uuid",
  "name": "Empresa XYZ",
  "domain": "xyz.pytake.net",
  "plan": "starter|growth|enterprise",
  "limits": {
    "users": 10,
    "messages_per_month": 10000,
    "whatsapp_numbers": 3,
    "flows": 50,
    "campaigns": 20
  },
  "settings": {
    "timezone": "America/Sao_Paulo",
    "language": "pt-BR",
    "currency": "BRL"
  },
  "billing": {
    "status": "active|suspended|cancelled",
    "next_payment": "2024-02-01"
  }
}
```

#### Endpoints Necessários
- GET /api/v1/tenants (admin only)
- POST /api/v1/tenants (admin only)
- GET /api/v1/tenants/{id}
- PUT /api/v1/tenants/{id}
- POST /api/v1/tenants/{id}/upgrade
- POST /api/v1/tenants/{id}/suspend
- DELETE /api/v1/tenants/{id}

### 3.7 Integrações ERP

#### ERPs Suportados
1. **HubSoft**: ISP management
2. **IxcSoft**: Telecom billing
3. **MkSolutions**: Network management
4. **SisGP**: General business

#### Funcionalidades Comuns
- Buscar cliente por CPF/CNPJ
- Consultar faturas
- Gerar segunda via de boleto
- Verificar status de conexão
- Abrir chamado técnico
- Consultar planos disponíveis

#### Estrutura de Integração
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "erp_type": "hubsoft|ixcsoft|mksolutions|sisgp",
  "name": "ERP Principal",
  "api_url": "https://erp.company.com/api",
  "api_key": "encrypted_key",
  "api_secret": "encrypted_secret",
  "sync_enabled": true,
  "sync_interval": 3600,
  "field_mapping": {
    "customer_id": "codigo_cliente",
    "name": "nome_completo",
    "document": "cpf_cnpj"
  }
}
```

#### Endpoints Necessários
- POST /api/v1/erp/connect/{erp_type}
- GET /api/v1/erp/{erp_type}/customers/{document}
- GET /api/v1/erp/{erp_type}/invoices/{customer_id}
- POST /api/v1/erp/{erp_type}/invoice/{id}/duplicate
- GET /api/v1/erp/{erp_type}/connection-status/{customer_id}
- POST /api/v1/erp/{erp_type}/tickets
- GET /api/v1/erp/{erp_type}/plans

### 3.8 Dashboard e Analytics

#### Métricas em Tempo Real
- Mensagens enviadas/recebidas
- Taxa de resposta
- Tempo médio de resposta
- Conversas ativas
- Agentes online
- Taxa de resolução

#### Estrutura de Métricas
```json
{
  "period": "today|week|month|custom",
  "metrics": {
    "messages": {
      "sent": 1500,
      "received": 1200,
      "failed": 5
    },
    "conversations": {
      "total": 450,
      "active": 23,
      "resolved": 400,
      "abandoned": 27
    },
    "response_time": {
      "average": 120,
      "median": 90,
      "p95": 300
    },
    "agents": {
      "online": 5,
      "busy": 3,
      "available": 2
    }
  }
}
```

#### Endpoints Necessários
- GET /api/v1/dashboard/overview
- GET /api/v1/dashboard/metrics
- GET /api/v1/dashboard/charts/{metric}
- GET /api/v1/dashboard/agents
- GET /api/v1/dashboard/conversations
- POST /api/v1/dashboard/export

### 3.9 WebSocket para Tempo Real

#### Eventos Suportados
```javascript
// Cliente -> Servidor
{
  "type": "subscribe",
  "channels": ["messages", "conversations", "metrics"]
}

// Servidor -> Cliente
{
  "type": "message_received",
  "data": {
    "conversation_id": "uuid",
    "message": {...}
  }
}

{
  "type": "conversation_updated",
  "data": {
    "id": "uuid",
    "status": "active|waiting|resolved"
  }
}

{
  "type": "metrics_updated",
  "data": {
    "messages_sent": 100,
    "active_conversations": 5
  }
}
```

#### Endpoint
- WS /ws (com autenticação JWT)

### 3.10 LGPD/GDPR Compliance

#### Funcionalidades
- Consentimento explícito
- Direito ao esquecimento
- Exportação de dados
- Auditoria de acesso
- Criptografia de dados sensíveis

#### Estrutura de Consentimento
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "purpose": "marketing|support|billing",
  "granted": true,
  "granted_at": "2024-01-01T00:00:00Z",
  "expires_at": "2025-01-01T00:00:00Z",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0..."
}
```

#### Endpoints Necessários
- POST /api/v1/privacy/consent
- GET /api/v1/privacy/consent/{user_id}
- DELETE /api/v1/privacy/consent/{id}
- POST /api/v1/privacy/data/{user_id}/export
- DELETE /api/v1/privacy/data/{user_id}
- GET /api/v1/privacy/audit/{user_id}

---

## 4. BANCO DE DADOS

### 4.1 Tabelas Principais

#### users
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### whatsapp_configs
```sql
CREATE TABLE whatsapp_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    phone_number_id VARCHAR(255),
    business_account_id VARCHAR(255),
    access_token TEXT,
    webhook_verify_token VARCHAR(255),
    api_type VARCHAR(50) NOT NULL,
    evolution_instance VARCHAR(255),
    evolution_api_key TEXT,
    is_active BOOLEAN DEFAULT true,
    daily_limit INTEGER DEFAULT 1000,
    rate_limit_per_minute INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### conversations
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    whatsapp_config_id UUID NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    contact_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    assigned_to UUID,
    tags TEXT[],
    metadata JSONB,
    last_message_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### messages
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id),
    direction VARCHAR(20) NOT NULL, -- 'inbound' | 'outbound'
    type VARCHAR(50) NOT NULL, -- 'text' | 'image' | 'document' | etc
    content TEXT,
    media_url TEXT,
    status VARCHAR(50), -- 'sent' | 'delivered' | 'read' | 'failed'
    whatsapp_message_id VARCHAR(255),
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### flows
```sql
CREATE TABLE flows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(50) NOT NULL,
    trigger_value TEXT,
    nodes JSONB NOT NULL,
    edges JSONB NOT NULL,
    is_active BOOLEAN DEFAULT false,
    version INTEGER DEFAULT 1,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### flow_sessions
```sql
CREATE TABLE flow_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flow_id UUID NOT NULL REFERENCES flows(id),
    conversation_id UUID NOT NULL,
    current_node_id VARCHAR(255),
    context JSONB,
    status VARCHAR(50) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
```

#### campaigns
```sql
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    schedule JSONB,
    targeting JSONB,
    message JSONB,
    limits JSONB,
    metrics JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### contacts
```sql
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    phone VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    tags TEXT[],
    attributes JSONB,
    opted_in BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4.2 Índices Importantes
```sql
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_conversations_tenant ON conversations(tenant_id);
CREATE INDEX idx_conversations_status ON conversations(status);
CREATE INDEX idx_conversations_phone ON conversations(contact_phone);
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_flows_tenant_active ON flows(tenant_id, is_active);
```

---

## 5. SEGURANÇA

### 5.1 Requisitos de Segurança
- Todas as senhas com Argon2id
- Tokens JWT assinados com RS256
- Rate limiting por IP e por usuário
- Validação de entrada em todos endpoints
- Sanitização de dados para prevenir XSS
- Prepared statements para prevenir SQL Injection
- CORS configurado restritivamente
- Headers de segurança (CSP, HSTS, etc)
- Criptografia de dados sensíveis no banco
- Logs de auditoria para ações críticas
- Backup automático diário
- SSL/TLS obrigatório em produção

### 5.2 Variáveis de Ambiente
```env
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/pytake
DATABASE_MAX_CONNECTIONS=100
DATABASE_MIN_CONNECTIONS=5

# Redis
REDIS_URL=redis://default:pass@localhost:6379
REDIS_MAX_CONNECTIONS=50

# JWT
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRATION=86400
JWT_REFRESH_EXPIRATION=604800

# WhatsApp
WHATSAPP_WEBHOOK_VERIFY_TOKEN=verify-token
WHATSAPP_WEBHOOK_SECRET=webhook-secret

# API
API_HOST=0.0.0.0
API_PORT=8080
API_WORKERS=4
API_MAX_CONNECTIONS=10000
API_TIMEOUT=30

# Security
RATE_LIMIT_PER_SECOND=10
RATE_LIMIT_BURST=100
BCRYPT_COST=12
ENCRYPTION_KEY=32-byte-encryption-key

# Observability
RUST_LOG=info
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4317
METRICS_ENABLED=true
TRACING_ENABLED=true

# Storage
UPLOAD_MAX_SIZE=10485760
UPLOAD_PATH=/app/uploads
```

---

## 6. PERFORMANCE E ESCALABILIDADE

### 6.1 Requisitos de Performance
- Resposta da API < 200ms (P95)
- Throughput: 1000 req/s por instância
- WebSocket: 10.000 conexões simultâneas
- Processamento de webhook < 100ms
- Taxa de entrega de mensagens > 99%

### 6.2 Estratégias de Otimização
- Connection pooling para PostgreSQL
- Cache Redis para configs e sessões
- Índices otimizados no banco
- Paginação em todas listagens
- Lazy loading de dados
- Compressão gzip
- CDN para assets estáticos
- Queue para processamento assíncrono

### 6.3 Monitoramento
- Prometheus para métricas
- Grafana para dashboards
- Jaeger para tracing distribuído
- ELK Stack para logs
- Alertas via PagerDuty/Slack
- Health checks em todos serviços
- Testes de carga regulares

---

## 7. TESTES

### 7.1 Tipos de Testes Necessários
- **Unitários**: Cobertura > 80%
- **Integração**: APIs e banco de dados
- **E2E**: Fluxos principais
- **Performance**: Load testing
- **Segurança**: Penetration testing

### 7.2 Casos de Teste Críticos
1. Autenticação e autorização
2. Envio de mensagens WhatsApp
3. Recebimento de webhooks
4. Execução de flows
5. Campanhas com throttling
6. Multi-tenancy isolation
7. Rate limiting
8. Backup e recovery
9. Failover de serviços
10. LGPD compliance

---

## 8. DEPLOY E INFRAESTRUTURA

### 8.1 Ambiente de Produção
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: pytake
      POSTGRES_USER: pytake
      POSTGRES_PASSWORD: secure-password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass secure-password
    ports:
      - "6379:6379"

  backend:
    build: .
    environment:
      DATABASE_URL: postgres://pytake:secure-password@postgres:5432/pytake
      REDIS_URL: redis://default:secure-password@redis:6379
    ports:
      - "8080:8080"
    depends_on:
      - postgres
      - redis

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - backend

volumes:
  postgres_data:
```

### 8.2 CI/CD Pipeline
1. **Build**: Compilar Rust
2. **Test**: Rodar testes
3. **Security**: Scan de vulnerabilidades
4. **Docker**: Build da imagem
5. **Deploy**: Push para registry
6. **Release**: Deploy em produção
7. **Smoke Test**: Verificar endpoints
8. **Rollback**: Se falhar

---

## 9. DOCUMENTAÇÃO DA API

### 9.1 Padrões REST
- Versionamento: /api/v1/
- Formato: JSON
- Paginação: ?page=1&limit=20
- Ordenação: ?sort=created_at&order=desc
- Filtros: ?status=active&tag=vip
- Expansão: ?expand=messages,contact

### 9.2 Códigos de Status
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Unprocessable Entity
- 429: Too Many Requests
- 500: Internal Server Error

### 9.3 Formato de Erro
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ],
    "request_id": "req_123456"
  }
}
```

---

## 10. ROADMAP FUTURO

### Fase 1: MVP (Atual)
- ✅ Autenticação básica
- ✅ Envio/recebimento WhatsApp
- ✅ Flows simples
- ✅ Dashboard básico
- ✅ Multi-tenancy

### Fase 2: Growth
- [ ] IA com ChatGPT/Claude
- [ ] Voice messages
- [ ] Video calls
- [ ] Marketplace de templates
- [ ] API pública

### Fase 3: Enterprise
- [ ] SSO/SAML
- [ ] Audit logs avançados
- [ ] Disaster recovery
- [ ] SLA 99.99%
- [ ] Suporte 24/7

---

## 11. CONCLUSÃO

Este documento contém todas as especificações necessárias para reconstruir o sistema PyTake do zero. Recomenda-se:

1. **Começar pelo core**: Auth, Database, WhatsApp básico
2. **Adicionar features incrementalmente**: Flows, Campaigns, etc
3. **Manter testes desde o início**: TDD é essencial
4. **Documentar conforme desenvolve**: OpenAPI/Swagger
5. **Fazer deploys frequentes**: CI/CD desde o dia 1

Para dúvidas ou esclarecimentos adicionais, este documento deve ser tratado como a fonte única de verdade (SSOT) para o desenvolvimento do sistema.

---

**Documento criado em**: 2025-08-11
**Versão**: 1.0.0
**Status**: Completo para reconstrução