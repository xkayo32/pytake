# 🚀 GraphQL API - PyTake

**Status**: ✅ **COMPLETO** (15/15 módulos implementados)
**Endpoint**: `/graphql`
**GraphiQL IDE**: `/graphql` (somente desenvolvimento)
**Versão**: 1.0.0
**Data**: 2025-12-05

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Por Que GraphQL?](#-por-que-graphql)
3. [Autenticação](#-autenticação)
4. [Módulos Implementados (15)](#-módulos-implementados)
5. [Queries Principais](#-queries-principais)
6. [Mutations Principais](#-mutations-principais)
7. [Exemplos Práticos](#-exemplos-práticos)
8. [GraphQL vs REST](#-graphql-vs-rest)
9. [Performance e Otimizações](#-performance-e-otimizações)
10. [Troubleshooting](#-troubleshooting)

---

## 🎯 Visão Geral

A API GraphQL do PyTake oferece uma **alternativa moderna e flexível** à API REST tradicional. Ela **coexiste** perfeitamente com a REST API (217 endpoints) e compartilha os mesmos serviços e repositórios.

### ✨ Características Principais

- ✅ **15 Módulos Completos** - Cobertura total da plataforma
- ✅ **Coexistência Pacífica** - REST + GraphQL funcionam simultaneamente
- ✅ **Multi-tenancy** - Isolamento completo por organização
- ✅ **Type-Safe** - Schemas Strawberry com type hints Python
- ✅ **Autenticação JWT** - Mesmos tokens da REST API
- ✅ **Role-Based Access** - Decoradores `@require_auth` e `@require_role`
- ✅ **Paginação** - Suporte a skip/limit em todas as listagens
- ✅ **Filtros Avançados** - Queries otimizadas por status, role, etc.
- ✅ **GraphiQL IDE** - Interface interativa em desenvolvimento
- ✅ **Introspection** - Schema auto-documentado

### 🏗️ Arquitetura

```
FastAPI Application
│
├── REST API (/api/v1/*)
│   └── 217 endpoints REST
│
├── GraphQL API (/graphql)
│   ├── 15 módulos
│   ├── 100+ queries
│   ├── 80+ mutations
│   └── GraphiQL IDE
│
└── WebSocket (/socket.io)
    └── Real-time events
```

**Zero Duplicação**: Todos os módulos GraphQL reutilizam os mesmos services e repositories da REST API.

---

## 💡 Por Que GraphQL?

### Vantagens sobre REST

| Recurso | REST | GraphQL |
|---------|------|---------|
| **Requisições** | Múltiplas (N+1 problem) | Uma única request |
| **Over-fetching** | Sim (dados desnecessários) | Não (apenas campos solicitados) |
| **Versionamento** | URLs diferentes (/v1, /v2) | Schema evolutivo |
| **Documentação** | Swagger/ReDoc separado | Auto-introspection |
| **Type Safety** | Pydantic (backend) | Pydantic + Strawberry |
| **Queries Customizadas** | Limitado | Ilimitado |

### Quando Usar GraphQL?

✅ **Use GraphQL quando**:
- Precisa de queries customizadas complexas
- Quer reduzir número de requests (mobile, latência)
- Precisa de relacionamentos profundos (conversas + contatos + mensagens)
- Quer type-safety end-to-end

⚠️ **Use REST quando**:
- CRUD simples e direto
- Upload de arquivos grandes
- Cache HTTP tradicional
- Ferramentas que só entendem REST

---

## 🔐 Autenticação

A autenticação funciona via **JWT tokens** no header `Authorization`:

```http
Authorization: Bearer <access_token>
```

### Obter Token (Mutation)

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
      organization {
        id
        name
      }
    }
  }
}
```

**Resposta**:
```json
{
  "data": {
    "login": {
      "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "token_type": "bearer",
      "expires_in": 3600,
      "user": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "email": "admin@pytake.com",
        "full_name": "Admin User",
        "role": "org_admin",
        "organization": {
          "id": "660e8400-e29b-41d4-a716-446655440000",
          "name": "Minha Empresa"
        }
      }
    }
  }
}
```

### Refresh Token

```graphql
mutation RefreshToken {
  refreshToken(refresh_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...") {
    access_token
    token_type
    expires_in
  }
}
```

### Verificar Autenticação

```graphql
query GetMe {
  me {
    id
    email
    full_name
    role
    is_online
    organization {
      id
      name
      plan
    }
  }
}
```

---

## 📦 Módulos Implementados

### ✅ **15 Módulos Completos (100%)**

| # | Módulo | Queries | Mutations | Descrição |
|---|--------|---------|-----------|-----------|
| 1 | **Auth** | `me` | `login`, `register`, `refreshToken`, `logout` | Autenticação JWT |
| 2 | **Organizations** | `organization`, `organizations`, `organization_stats` | `createOrganization`, `updateOrganization`, `deleteOrganization` | Gerenciamento de organizações |
| 3 | **Users** | `user`, `users`, `user_stats` | `createUser`, `updateUser`, `deleteUser`, `updateUserRole` | Usuários e equipes |
| 4 | **Departments** | `department`, `departments`, `department_stats` | `createDepartment`, `updateDepartment`, `deleteDepartment` | Departamentos |
| 5 | **Queues** | `queue`, `queues`, `queue_stats` | `createQueue`, `updateQueue`, `deleteQueue` | Filas de atendimento |
| 6 | **Contacts** | `contact`, `contacts`, `contact_stats` | `createContact`, `updateContact`, `deleteContact`, `blockContact`, `mergeContacts` | Gerenciamento de contatos |
| 7 | **Conversations** | `conversation`, `conversations` | `sendMessage`, `assignConversation`, `closeConversation`, `reopenConversation`, `activateFlowInConversation`, `deactivateFlowInConversation`, `executeJumpToFlow` | Conversas, mensagens e controle de flows |
| 8 | **WhatsApp** | `whatsapp_connection`, `whatsapp_connections`, `whatsapp_qr_code`, `whatsapp_templates` | `createWhatsAppConnection`, `updateWhatsAppConnection`, `deleteWhatsAppConnection`, `disconnectWhatsApp` | Integração WhatsApp |
| 9 | **Chatbots** | `chatbot`, `chatbots` | `createChatbot`, `updateChatbot`, `deleteChatbot`, `activateChatbot`, `deactivateChatbot` | Chatbots e Flows |
| 10 | **Campaigns** | `campaign`, `campaigns` | `createCampaign`, `updateCampaign`, `deleteCampaign`, `startCampaign`, `cancelCampaign` | Campanhas de mensagens |
| 11 | **Analytics** | `overview_metrics`, `conversation_metrics`, `agent_metrics`, `campaign_metrics`, `full_report` | - | Métricas e relatórios |
| 12 | **Flow Automations** | `flow_automation`, `flow_automations`, `flow_automation_stats` | `createFlowAutomation`, `updateFlowAutomation`, `deleteFlowAutomation`, `startFlowAutomation`, `activateFlowAutomation` | Automações de flows |
| 13 | **Secrets** | `secret`, `secrets`, `secret_with_value` | `createSecret`, `updateSecret`, `deleteSecret`, `deactivateSecret` | Gerenciamento seguro de credenciais |
| 14 | **AI Assistant** | `ai_settings`, `ai_models` | `updateAISettings`, `generateFlow` | Assistente de IA |
| 15 | **Notifications** | `notification_preferences`, `notification_logs` | `updateNotificationPreferences` | Preferências de notificações |

---

## 🔍 Queries Principais

### 1. Auth Module

```graphql
# Obter informações do usuário atual
query {
  me {
    id
    email
    full_name
    role
    is_online
    organization {
      id
      name
      plan
      settings
    }
  }
}
```

### 2. Contacts Module

```graphql
# Listar contatos com paginação e busca
query SearchContacts {
  contacts(skip: 0, limit: 25, search: "João") {
    id
    name
    phone_number
    email
    tags
    is_blocked
    total_conversations
    total_messages_sent
    total_messages_received
    last_interaction_at
    created_at
  }
}
```

### 3. Conversations Module

```graphql
# Listar conversas abertas com relacionamentos
query OpenConversations {
  conversations(skip: 0, limit: 10, status: "open") {
    id
    status
    unread_count
    created_at
    updated_at
    contact {
      id
      name
      phone_number
    }
    current_agent {
      id
      full_name
      email
    }
    queue {
      id
      name
      color
    }
  }
}
```

### 3.1 Flow Management Module (NEW)

```graphql
# Mutations para controle de flows em conversas
mutation ManageFlows {
  # Ativar um flow manualmente
  activateFlow: activateFlowInConversation(
    conversation_id: "conv-id-123"
    flow_id: "flow-id-456"
  ) {
    id
    active_flow_id
    current_node_id
    context_variables
  }

  # Executar transição jump_to_flow
  jumpFlow: executeJumpToFlow(
    conversation_id: "conv-id-123"
    node_id: "jump-node-789"
  ) {
    id
    active_flow_id
    current_node_id
  }

  # Desativar flow (entregar para agente)
  deactivateFlow: deactivateFlowInConversation(
    conversation_id: "conv-id-123"
  ) {
    id
    is_bot_active
    active_flow_id
  }
}

# Query para verificar status do flow
query FlowStatus {
  conversation(id: "conv-id-123") {
    id
    active_flow_id
    current_node_id
    context_variables
    is_bot_active
    whatsapp_number {
      id
      default_flow_id
    }
  }
}
```

**Recursos**:
- ✅ Auto-inicialização de flows ao receber mensagem (via `default_flow_id`)
- ✅ Transições manuais entre flows
- ✅ Transições automáticas via `jump_to_flow` nodes
- ✅ Passagem de variáveis entre flows
- ✅ Contexto de execução (`context_variables`)

---

### 5. Analytics Module

```graphql
# Dashboard de métricas completo
query AnalyticsDashboard {
  overview_metrics {
    total_contacts
    new_contacts_today
    total_conversations
    active_conversations
    avg_response_time_seconds
    total_messages_sent
    total_messages_received
    agents_online
    total_campaigns
  }

  conversation_metrics(
    start_date: "2025-01-01T00:00:00Z"
    end_date: "2025-01-31T23:59:59Z"
  ) {
    total_conversations
    active_conversations
    closed_conversations
    avg_response_time_seconds
    resolution_rate
    conversations_by_status
  }

  agent_metrics(
    start_date: "2025-01-01T00:00:00Z"
    end_date: "2025-01-31T23:59:59Z"
  ) {
    total_agents
    agents_online
    top_performers {
      agent_id
      agent_name
      total_conversations
      avg_response_time_seconds
    }
  }
}
```

### 6. WhatsApp Module

```graphql
# Listar números WhatsApp com flows configurados
query WhatsAppWithFlows {
  whatsappNumbers {
    id
    phoneNumber
    displayName
    status
    defaultFlowId
    defaultChatbotId
    isActive
  }
}
```

**Mutations - WhatsApp Flow Linking** (NEW):

```graphql
mutation ManageWhatsAppFlows {
  # Vincular um flow a um número WhatsApp
  linkFlow: linkFlowToWhatsapp(
    whatsappNumberId: "wa-number-id"
    flowId: "flow-id-123"
  ) {
    id
    phoneNumber
    defaultFlowId
  }

  # Desvinculer flow de um número
  unlinkFlow: unlinkFlowFromWhatsapp(
    whatsappNumberId: "wa-number-id"
  ) {
    id
    phoneNumber
    defaultFlowId
  }
}
```

**Use Case**: Quando um cliente envia mensagem para este número WhatsApp, o `defaultFlowId` será automaticamente iniciado em uma nova conversa.

---

## ✏️ Mutations Principais

### 1. Criar Contato

```graphql
mutation CreateContact {
  createContact(input: {
    name: "João Silva"
    phone_number: "+5511999999999"
    email: "joao@example.com"
    tags: ["lead", "interesse-produto-a"]
  }) {
    id
    name
    phone_number
    email
    created_at
  }
}
```

### 2. Criar e Enviar Mensagem

```graphql
mutation SendMessage {
  # Primeiro: criar conversa
  conversation: createConversation(input: {
    contact_id: "550e8400-e29b-41d4-a716-446655440000"
    queue_id: "660e8400-e29b-41d4-a716-446655440000"
  }) {
    id
  }

  # Depois: enviar mensagem
  message: sendMessage(
    conversation_id: "770e8400-e29b-41d4-a716-446655440000"
    content: "Olá! Como posso ajudar?"
  ) {
    id
    content
    sent_at
    status
  }
}
```

### 3. Atribuir Conversa a Agente

```graphql
mutation AssignConversation {
  assignConversation(
    conversation_id: "770e8400-e29b-41d4-a716-446655440000"
    agent_id: "880e8400-e29b-41d4-a716-446655440000"
  ) {
    id
    status
    current_agent {
      id
      full_name
      email
    }
    assigned_at
  }
}
```

### 4. Criar e Iniciar Campanha

```graphql
mutation CreateAndStartCampaign {
  # Criar campanha
  campaign: createCampaign(input: {
    name: "Promoção Black Friday"
    description: "Campanha de descontos especiais"
    message_template: "Olá {{name}}! Aproveite 50% OFF em todos os produtos!"
    scheduled_at: "2025-11-29T10:00:00Z"
  }) {
    id
    name
    status
  }

  # Iniciar campanha
  started: startCampaign(id: "990e8400-e29b-41d4-a716-446655440000") {
    id
    status
    started_at
    target_count
  }
}
```

### 5. Criar Secret (Seguro)

```graphql
mutation CreateAPISecret {
  createSecret(input: {
    name: "openai_api_key"
    display_name: "OpenAI Production Key"
    description: "API key for OpenAI GPT-4"
    value: "sk-proj-..."  # Será criptografado
    scope: ORGANIZATION
    encryption_provider: FERNET
  }) {
    id
    name
    display_name
    scope
    is_active
    created_at
  }
}
```

---

## 💡 Exemplos Práticos

### Exemplo 1: Workflow Completo de Atendimento

```graphql
mutation CompleteWorkflow {
  # 1. Criar contato
  contact: createContact(input: {
    name: "Maria Santos"
    phone_number: "+5511888888888"
    email: "maria@example.com"
  }) {
    id
  }

  # 2. Criar conversa
  conversation: createConversation(input: {
    contact_id: "CONTACT_ID_AQUI"
    queue_id: "QUEUE_ID_AQUI"
  }) {
    id
  }

  # 3. Enviar mensagem inicial
  message: sendMessage(
    conversation_id: "CONVERSATION_ID_AQUI"
    content: "Olá Maria! Bem-vinda ao nosso atendimento."
  ) {
    id
  }

  # 4. Atribuir a agente
  assigned: assignConversation(
    conversation_id: "CONVERSATION_ID_AQUI"
    agent_id: "AGENT_ID_AQUI"
  ) {
    id
    current_agent {
      full_name
    }
  }
}
```

### Exemplo 2: Dashboard Analytics Completo

```graphql
query CompleteDashboard {
  # Métricas gerais
  overview: overview_metrics {
    total_contacts
    total_conversations
    active_conversations
    agents_online
    total_campaigns
  }

  # Conversas por status
  conversations: conversation_metrics {
    total_conversations
    conversations_by_status
  }

  # Top agentes
  agents: agent_metrics {
    top_performers {
      agent_name
      total_conversations
      avg_response_time_seconds
    }
  }

  # Performance de campanhas
  campaigns: campaign_metrics {
    total_campaigns
    total_messages_sent
    avg_delivery_rate
    avg_read_rate
  }
}
```

### Exemplo 3: Busca Avançada Multi-Recurso

```graphql
query AdvancedSearch($search: String!) {
  # Buscar contatos
  contacts(search: $search, limit: 10) {
    id
    name
    phone_number
  }

  # Buscar conversas
  conversations(search: $search, limit: 10) {
    id
    contact {
      name
    }
    status
  }

  # Buscar usuários
  users(search: $search, limit: 10) {
    id
    full_name
    email
  }
}
```

**Variables**:
```json
{
  "search": "João"
}
```

### Exemplo 4: Flow Routing e Transições (NEW)

```graphql
mutation FlowTransition {
  # 1. Ativar um flow em uma conversa (manual transition)
  activateFlow: activateFlowInConversation(
    conversation_id: "CONVERSATION_ID"
    flow_id: "FLOW_ID"
  ) {
    id
    active_flow_id
    current_node_id
    status
  }

  # 2. Executar uma transição jump_to_flow
  jumpFlow: executeJumpToFlow(
    conversation_id: "CONVERSATION_ID"
    node_id: "JUMP_NODE_ID"
  ) {
    id
    active_flow_id
    current_node_id
    context_variables
  }

  # 3. Desativar flow (entregar para humano)
  deactivateFlow: deactivateFlowInConversation(
    conversation_id: "CONVERSATION_ID"
  ) {
    id
    active_flow_id
    is_bot_active
    status
  }
}
```

**Casos de Uso**:
- `activateFlowInConversation`: Iniciar um flow específico manualmente
- `executeJumpToFlow`: Transição automática entre flows (dentro do flow engine)
- `deactivateFlowInConversation`: Pausar bot e passar para atendente humano

---

## ⚖️ GraphQL vs REST

### Comparação Prática

#### Cenário: Obter conversas com contatos e mensagens

**REST API** (3 requests):
```bash
# Request 1: Listar conversas
GET /api/v1/conversations

# Request 2: Para cada conversa, buscar contato
GET /api/v1/contacts/{contact_id}

# Request 3: Para cada conversa, buscar mensagens
GET /api/v1/conversations/{conversation_id}/messages
```

**GraphQL API** (1 request):
```graphql
query {
  conversations(limit: 10) {
    id
    status
    contact {
      id
      name
      phone_number
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

### Performance

| Métrica | REST | GraphQL |
|---------|------|---------|
| **Requests** | 3+ | 1 |
| **Latência** | ~300ms (3x100ms) | ~120ms |
| **Dados Transferidos** | ~50KB (over-fetching) | ~15KB (exact data) |
| **Complexidade Client** | Alta (múltiplas calls) | Baixa (uma query) |

---

## ⚡ Performance e Otimizações

### Paginação

Todas as queries de listagem suportam paginação:

```graphql
query PaginatedContacts {
  contacts(skip: 0, limit: 50) {
    id
    name
  }
}
```

### Filtros

Queries otimizadas com filtros específicos:

```graphql
query FilteredData {
  # Conversas abertas
  conversations(status: "open", skip: 0, limit: 25) {
    id
  }

  # Usuários agentes
  users(role: "agent") {
    id
    full_name
  }

  # Campanhas ativas
  campaigns(status: "running") {
    id
    name
  }
}
```

### Seletividade de Campos

Requisite **apenas** os campos necessários:

```graphql
# ❌ Ruim: Busca tudo
query {
  contacts {
    id
    name
    phone_number
    email
    tags
    custom_fields
    total_conversations
    total_messages_sent
    # ... muitos campos
  }
}

# ✅ Bom: Somente necessário
query {
  contacts {
    id
    name
    phone_number
  }
}
```

---

## 🐛 Troubleshooting

### Erro: "Authentication required"

**Causa**: Token JWT ausente ou inválido

**Solução**:
```http
Authorization: Bearer SEU_TOKEN_JWT_AQUI
```

### Erro: "Organization access denied"

**Causa**: Tentativa de acessar recurso de outra organização

**Solução**: Verifique que o token pertence à organização correta

### Erro: "Field 'xyz' doesn't exist on type 'ABC'"

**Causa**: Campo não existe no schema

**Solução**: Use introspection no GraphiQL para verificar campos disponíveis

### Performance Lenta

**Causa**: Query muito complexa ou sem paginação

**Solução**:
- Adicione `limit` em queries de listagem
- Evite queries muito profundas (max 5 níveis)
- Use filtros para reduzir dados

### Erro: "Secret not found" ao buscar secret_with_value

**Causa**: Apenas `org_admin` pode acessar valores descriptografados

**Solução**: Verifique permissões do usuário

---

## 📚 Recursos Adicionais

### Ferramentas Recomendadas

- **GraphiQL**: Interface web integrada (`/graphql` em dev)
- **Insomnia**: Cliente GraphQL desktop
- **Apollo Client**: Client JavaScript
- **graphql-request**: Client leve para Node.js
- **strawberry.rocks**: Documentação do Strawberry GraphQL

### Links Úteis

- **Documentação REST**: [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Documentação Geral**: [/.github/docs/INDEX.md](/.github/docs/INDEX.md)
- **Strawberry GraphQL**: https://strawberry.rocks
- **GraphQL Spec**: https://spec.graphql.org

---

**Implementação**: 100% Completa ✅
**Módulos**: 15/15
**Última Atualização**: 2025-12-05
**Mantenedor**: Kayo Carvalho Fernandes
