# 📚 PyTake API Documentation

Documentação completa das APIs do PyTake - WhatsApp Automation Platform

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [APIs Disponíveis](#-apis-disponíveis)
3. [Autenticação](#-autenticação)
4. [REST API (OpenAPI)](#-rest-api-openapi)
5. [GraphQL API](#-graphql-api)
6. [WebSocket API](#-websocket-api)
7. [Exemplos Práticos](#-exemplos-práticos)
8. [Rate Limiting](#-rate-limiting)
9. [Erros e Tratamento](#-erros-e-tratamento)
10. [Ambientes](#-ambientes)

---

## 🌟 Visão Geral

PyTake oferece **3 tipos de APIs** para máxima flexibilidade:

| API | Endpoint | Uso Recomendado | Documentação |
|-----|----------|-----------------|--------------|
| **REST** | `/api/v1/*` | CRUD operations, integrações | Swagger `/api/v1/docs` |
| **GraphQL** | `/graphql` | Queries customizadas, performance | GraphiQL `/graphql` |
| **WebSocket** | `/socket.io` | Real-time, live updates | Socket.IO docs |

### Características Principais

- ✅ **Multi-tenancy** - Isolamento completo por organização
- ✅ **Type-safe** - Validação automática (Pydantic + Strawberry)
- ✅ **Auto-documentado** - Swagger, ReDoc, GraphiQL
- ✅ **Rate Limited** - Proteção contra abuso
- ✅ **Auditável** - Logs completos em MongoDB

---

## 🔌 APIs Disponíveis

### REST API (217 endpoints)

**Base URL**: `https://api.pytake.net/api/v1`

**Documentação Interativa**:
- Swagger UI: https://api.pytake.net/api/v1/docs
- ReDoc: https://api.pytake.net/api/v1/redoc
- OpenAPI JSON: https://api.pytake.net/api/v1/openapi.json

**Módulos**:
- Auth (6 endpoints)
- Organizations (8 endpoints)
- Users (12 endpoints)
- Departments (10 endpoints)
- Queues (15 endpoints)
- Contacts (18 endpoints)
- Conversations (25 endpoints)
- WhatsApp (20 endpoints)
- Chatbots (22 endpoints)
- Campaigns (15 endpoints)
- Analytics (12 endpoints)
- Flow Automations (18 endpoints)
- Secrets (10 endpoints)
- AI Assistant (15 endpoints)
- Notifications (11 endpoints)

### GraphQL API (15 módulos)

**Endpoint**: `https://api.pytake.net/graphql`

**GraphiQL IDE** (desenvolvimento): http://localhost:8000/graphql

**Documentação Completa**: Ver [GRAPHQL_API.md](./GRAPHQL_API.md)

**Módulos**:
1. Auth
2. Organizations
3. Users
4. Departments
5. Queues
6. Contacts
7. Conversations
8. WhatsApp
9. Chatbots
10. Campaigns
11. Analytics
12. Flow Automations
13. Secrets
14. AI Assistant
15. Notifications

### WebSocket API (Socket.IO)

**Endpoint**: `https://api.pytake.net/socket.io`

**Eventos**:
- `conversation:new` - Nova conversa criada
- `message:new` - Nova mensagem recebida
- `agent:status` - Status do agente mudou
- `conversation:assigned` - Conversa atribuída
- `typing` - Usuário digitando

---

## 🔐 Autenticação

Todas as APIs (exceto endpoints públicos) requerem **autenticação JWT**.

### Obter Token JWT

#### REST API

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@pytake.com",
  "password": "sua_senha"
}
```

**Resposta**:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "admin@pytake.com",
    "full_name": "Admin User",
    "role": "org_admin"
  }
}
```

#### GraphQL API

```graphql
mutation Login {
  login(email: "admin@pytake.com", password: "sua_senha") {
    access_token
    refresh_token
    token_type
    expires_in
    user {
      id
      email
      full_name
      role
    }
  }
}
```

### Usar Token nas Requisições

#### REST API

```http
GET /api/v1/contacts
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

#### GraphQL API

```http
POST /graphql
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "query": "{ me { id email full_name } }"
}
```

### Refresh Token

Quando o `access_token` expirar (padrão: 1 hora), use o `refresh_token`:

#### REST API

```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### GraphQL API

```graphql
mutation RefreshToken {
  refreshToken(refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") {
    access_token
    token_type
    expires_in
  }
}
```

---

## 🔄 REST API (OpenAPI)

### Estrutura de Endpoints

```
/api/v1/
├── auth/              # Autenticação
├── organizations/     # Organizações
├── users/            # Usuários
├── departments/      # Departamentos
├── queues/           # Filas de atendimento
├── contacts/         # Contatos
├── conversations/    # Conversas
├── whatsapp/         # WhatsApp Business
├── chatbots/         # Chatbots e Flows
├── campaigns/        # Campanhas
├── analytics/        # Analytics e Reports
├── flow-automations/ # Automações de Flows
├── secrets/          # Secrets Management
├── ai-assistant/     # AI Assistant
└── notifications/    # Notificações
```

### Exemplos de Uso

#### Listar Contatos

```http
GET /api/v1/contacts?skip=0&limit=50&search=João
Authorization: Bearer <token>
```

**Resposta**:
```json
{
  "items": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "João Silva",
      "phone_number": "+5511999999999",
      "email": "joao@example.com",
      "is_blocked": false,
      "tags": ["vip", "cliente"],
      "created_at": "2025-01-15T10:30:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 50,
  "total_pages": 3
}
```

#### Criar Conversa

```http
POST /api/v1/conversations
Authorization: Bearer <token>
Content-Type: application/json

{
  "contact_id": "550e8400-e29b-41d4-a716-446655440000",
  "queue_id": "660e8400-e29b-41d4-a716-446655440000",
  "initial_message": "Olá! Como posso ajudar?"
}
```

#### Enviar Mensagem

```http
POST /api/v1/conversations/{conversation_id}/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Sua solicitação foi processada com sucesso!",
  "message_type": "text"
}
```

### Filtros e Paginação

Todos os endpoints de listagem suportam:

- `skip` - Offset (padrão: 0)
- `limit` - Limite (padrão: 50, max: 100)
- `search` - Busca por texto
- `sort` - Ordenação (ex: `created_at:desc`)
- Filtros específicos por recurso

**Exemplo**:
```http
GET /api/v1/conversations?skip=0&limit=25&status=open&assigned_to=me&sort=created_at:desc
```

---

## 🚀 GraphQL API

### Vantagens do GraphQL

- ✅ **Requisite apenas o que precisa** - Sem over-fetching
- ✅ **Uma request, múltiplos recursos** - Reduz latência
- ✅ **Type-safe** - Validação automática
- ✅ **Introspection** - Auto-documentado
- ✅ **Queries customizadas** - Máxima flexibilidade

### Estrutura

```graphql
type Query {
  # Auth
  me: User

  # Organizations
  organization(id: ID!): Organization
  organizations: [Organization!]!

  # Users
  user(id: ID!): User
  users(skip: Int, limit: Int, role: String): [User!]!

  # Contacts
  contact(id: ID!): Contact
  contacts(skip: Int, limit: Int, search: String): [Contact!]!

  # Conversations
  conversation(id: ID!): Conversation
  conversations(skip: Int, limit: Int, status: String): [Conversation!]!

  # Analytics
  overview_metrics: OverviewMetrics
  conversation_metrics(start_date: DateTime, end_date: DateTime): ConversationMetrics

  # E mais 100+ queries...
}

type Mutation {
  # Auth
  login(email: String!, password: String!): LoginResponse!
  register(input: RegisterInput!): RegisterResponse!

  # Contacts
  createContact(input: ContactCreateInput!): Contact!
  updateContact(id: ID!, input: ContactUpdateInput!): Contact!
  deleteContact(id: ID!): SuccessResponse!

  # Conversations
  createConversation(input: ConversationCreateInput!): Conversation!
  sendMessage(conversation_id: ID!, content: String!): Message!
  assignConversation(conversation_id: ID!, agent_id: ID!): Conversation!

  # E mais 80+ mutations...
}
```

### Exemplos de Queries

#### Query Simples

```graphql
query GetMe {
  me {
    id
    email
    full_name
    role
    organization {
      id
      name
      settings
    }
  }
}
```

#### Query com Relacionamentos

```graphql
query GetConversationsWithDetails {
  conversations(skip: 0, limit: 10, status: "open") {
    id
    status
    unread_count
    created_at
    contact {
      id
      name
      phone_number
      email
    }
    current_agent {
      id
      full_name
      email
    }
    messages(limit: 5) {
      id
      content
      direction
      sent_at
    }
  }
}
```

#### Query com Filtros

```graphql
query SearchContacts {
  contacts(search: "João", skip: 0, limit: 20) {
    id
    name
    phone_number
    email
    tags
    total_conversations
    last_interaction_at
  }
}
```

### Exemplos de Mutations

#### Criar Contato

```graphql
mutation CreateContact {
  createContact(input: {
    name: "Maria Santos"
    phone_number: "+5511888888888"
    email: "maria@example.com"
    tags: ["lead", "interesse-produto-a"]
  }) {
    id
    name
    created_at
  }
}
```

#### Enviar Mensagem

```graphql
mutation SendMessage {
  sendMessage(
    conversation_id: "550e8400-e29b-41d4-a716-446655440000"
    content: "Olá! Seu pedido foi aprovado."
  ) {
    id
    content
    sent_at
    status
  }
}
```

#### Atribuir Conversa

```graphql
mutation AssignConversation {
  assignConversation(
    conversation_id: "550e8400-e29b-41d4-a716-446655440000"
    agent_id: "660e8400-e29b-41d4-a716-446655440000"
  ) {
    id
    status
    current_agent {
      id
      full_name
    }
  }
}
```

### GraphQL Variables

Use variáveis para queries dinâmicas:

```graphql
query GetConversation($id: ID!) {
  conversation(id: $id) {
    id
    status
    contact {
      name
      phone_number
    }
    messages(limit: 50) {
      id
      content
      direction
    }
  }
}
```

**Variables**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

## 🔌 WebSocket API

### Conexão

```javascript
import io from 'socket.io-client';

const socket = io('https://api.pytake.net', {
  path: '/socket.io',
  auth: {
    token: 'seu_jwt_token_aqui'
  }
});

socket.on('connect', () => {
  console.log('Conectado!', socket.id);
});
```

### Eventos Disponíveis

#### Receber Nova Mensagem

```javascript
socket.on('message:new', (data) => {
  console.log('Nova mensagem:', data);
  // {
  //   id: '...',
  //   conversation_id: '...',
  //   content: 'Olá!',
  //   direction: 'incoming',
  //   contact: { name: 'João' }
  // }
});
```

#### Receber Nova Conversa

```javascript
socket.on('conversation:new', (data) => {
  console.log('Nova conversa:', data);
});
```

#### Status de Digitação

```javascript
socket.on('typing', (data) => {
  console.log(`${data.contact_name} está digitando...`);
});
```

#### Atualização de Status

```javascript
socket.on('agent:status', (data) => {
  console.log(`Agente ${data.agent_name} agora está ${data.status}`);
});
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Fluxo Completo de Conversa (REST)

```bash
# 1. Login
curl -X POST https://api.pytake.net/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pytake.com","password":"senha123"}'

# Salve o token recebido

# 2. Criar contato
curl -X POST https://api.pytake.net/api/v1/contacts \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"João Silva","phone_number":"+5511999999999"}'

# Salve o contact_id

# 3. Criar conversa
curl -X POST https://api.pytake.net/api/v1/conversations \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"contact_id":"CONTACT_ID","queue_id":"QUEUE_ID"}'

# Salve o conversation_id

# 4. Enviar mensagem
curl -X POST https://api.pytake.net/api/v1/conversations/CONVERSATION_ID/messages \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Olá! Como posso ajudar?","message_type":"text"}'
```

### Exemplo 2: Analytics Completo (GraphQL)

```graphql
query AnalyticsDashboard {
  overview_metrics {
    total_contacts
    total_conversations
    active_conversations
    total_messages_sent
    total_messages_received
    agents_online
  }

  conversation_metrics(
    start_date: "2025-01-01T00:00:00Z"
    end_date: "2025-01-31T23:59:59Z"
  ) {
    total_conversations
    avg_response_time_seconds
    resolution_rate
    conversations_by_status
  }

  campaign_metrics(
    start_date: "2025-01-01T00:00:00Z"
    end_date: "2025-01-31T23:59:59Z"
  ) {
    total_campaigns
    total_messages_sent
    total_messages_delivered
    avg_delivery_rate
    avg_read_rate
  }
}
```

### Exemplo 3: Bulk Operations (GraphQL)

```graphql
mutation BulkCreateContacts {
  contact1: createContact(input: {
    name: "João Silva"
    phone_number: "+5511111111111"
  }) { id }

  contact2: createContact(input: {
    name: "Maria Santos"
    phone_number: "+5511222222222"
  }) { id }

  contact3: createContact(input: {
    name: "Pedro Oliveira"
    phone_number: "+5511333333333"
  }) { id }
}
```

---

## ⚡ Rate Limiting

Proteção contra abuso com limites por usuário:

| Endpoint | Limite | Janela |
|----------|--------|--------|
| Login | 5 requests | 1 minuto |
| Endpoints gerais | 100 requests | 1 minuto |
| Uploads | 10 requests | 1 minuto |
| GraphQL | 50 requests | 1 minuto |

**Headers de Resposta**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

**Erro 429 (Too Many Requests)**:
```json
{
  "error": {
    "code": 429,
    "message": "Rate limit exceeded. Try again in 45 seconds.",
    "type": "rate_limit_error"
  }
}
```

---

## ❌ Erros e Tratamento

### Códigos de Status HTTP

| Código | Significado | Quando Ocorre |
|--------|-------------|---------------|
| 200 | OK | Sucesso |
| 201 | Created | Recurso criado |
| 400 | Bad Request | Dados inválidos |
| 401 | Unauthorized | Token ausente/inválido |
| 403 | Forbidden | Sem permissão |
| 404 | Not Found | Recurso não encontrado |
| 422 | Validation Error | Erro de validação |
| 429 | Too Many Requests | Rate limit excedido |
| 500 | Internal Server Error | Erro no servidor |

### Formato de Erro

```json
{
  "error": {
    "code": 422,
    "message": "Validation error",
    "type": "validation_error",
    "details": [
      {
        "loc": ["body", "email"],
        "msg": "value is not a valid email address",
        "type": "value_error.email"
      }
    ]
  }
}
```

### Erros GraphQL

```json
{
  "data": null,
  "errors": [
    {
      "message": "Contact not found",
      "locations": [{"line": 2, "column": 3}],
      "path": ["contact"]
    }
  ]
}
```

---

## 🌍 Ambientes

### Desenvolvimento (Local)

- **REST**: http://localhost:8000/api/v1
- **GraphQL**: http://localhost:8000/graphql
- **GraphiQL IDE**: http://localhost:8000/graphql
- **Swagger**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc

### Staging

- **REST**: https://api-staging.pytake.net/api/v1
- **GraphQL**: https://api-staging.pytake.net/graphql
- **Swagger**: https://api-staging.pytake.net/api/v1/docs

### Production

- **REST**: https://api.pytake.net/api/v1
- **GraphQL**: https://api.pytake.net/graphql
- **Swagger**: Desabilitado em produção (segurança)

---

## 📞 Suporte

- **Documentação Completa**: `/.github/docs/INDEX.md`
- **GitHub**: https://github.com/pytake/pytake
- **Email**: support@pytake.com
- **Slack**: https://pytake.slack.com

---

**Última Atualização**: 2025-01-15
**Versão da API**: v1.0.0
