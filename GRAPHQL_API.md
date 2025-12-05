# GraphQL API - PyTake

**Status**: ✅ Implementação Parcial (7/15 módulos completos)
**Endpoint**: `/graphql`
**GraphiQL IDE**: `/graphql` (development only)
**Versão**: 1.0.0
**Data**: 2025-12-05

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Autenticação](#autenticação)
- [Módulos Implementados](#módulos-implementados)
- [Exemplos de Uso](#exemplos-de-uso)
- [Módulos Pendentes](#módulos-pendentes)
- [Roadmap](#roadmap)

---

## 🎯 Visão Geral

A API GraphQL do PyTake oferece uma alternativa moderna e flexível à API REST. Ela **coexiste** com a REST API e compartilha os mesmos services e repositories.

### Características:

- ✅ **Coexistência REST + GraphQL**: Ambas APIs funcionam simultaneamente
- ✅ **Multi-tenancy**: Isolamento total por organização
- ✅ **Autenticação JWT**: Mesmos tokens da REST API
- ✅ **Type-safe**: Schemas Strawberry com type hints Python
- ✅ **Paginação**: Suporte a skip/limit em todas listagens
- ✅ **Filtros**: Queries otimizadas com filtros customizados
- ✅ **Role-based Access**: Decoradores `@require_auth` e `@require_role`
- ✅ **GraphiQL IDE**: Interface interativa em desenvolvimento

---

## 🔐 Autenticação

A autenticação funciona via JWT tokens no header `Authorization`:

```
Authorization: Bearer <access_token>
```

### Obter Token:

```graphql
mutation {
  login(input: {
    email: "admin@example.com"
    password: "SecurePass123"
  }) {
    accessToken
    refreshToken
    expiresIn
    user {
      id
      email
      name
      role
      organizationId
    }
  }
}
```

### Refresh Token:

```graphql
mutation {
  refreshToken(input: {
    refreshToken: "<refresh_token>"
  }) {
    accessToken
    refreshToken
    user {
      id
      name
    }
  }
}
```

---

## ✅ Módulos Implementados

### 1. **Auth** (Autenticação)

**Mutations:**
- `login(email, password)` → TokenResponse
- `register(email, password, name, organizationName)` → TokenResponse
- `refreshToken(refreshToken)` → TokenResponse
- `logout()` → AuthPayload

**Queries:**
- `me()` → UserType (usuário autenticado)

---

### 2. **Organizations** (Organizações)

**Queries:**
- `myOrganization()` → OrganizationType
- `organizationStats()` → OrganizationStats

**Mutations:**
- `updateOrganization(input)` → OrganizationType [@require_role org_admin]
- `updateOrganizationSettings(input)` → OrganizationType
- `deactivateOrganization()` → SuccessResponse

**Stats Incluem:**
- Total de usuários, contatos, conversas
- Números WhatsApp conectados
- Conversas do mês atual

---

### 3. **Users** (Usuários)

**Queries:**
- `user(id)` → UserType
- `users(skip, limit, filter)` → UserListResponse
- `userStats(userId)` → UserStats

**Mutations:**
- `createUser(input)` → UserType [@require_role org_admin]
- `updateUser(userId, input)` → UserType
- `deleteUser(userId)` → SuccessResponse [@require_role org_admin]
- `activateUser(userId)` → UserType [@require_role org_admin]
- `deactivateUser(userId)` → UserType [@require_role org_admin]

**Filtros:**
- `query`: Busca por nome ou email
- `role`: Filtrar por role (org_admin, agent, etc.)
- `departmentId`: Filtrar por departamento
- `isActive`: Ativo/inativo

**Permissões:**
- Usuários podem atualizar próprio perfil
- Apenas org_admin pode criar/deletar/ativar/desativar
- Org_admin pode mudar roles, usuários comuns não

---

### 4. **Departments** (Departamentos)

**Queries:**
- `department(id)` → DepartmentType
- `departments(isActive)` → [DepartmentType]
- `departmentStats(departmentId)` → DepartmentStats

**Mutations:**
- `createDepartment(input)` → DepartmentType [@require_role org_admin]
- `updateDepartment(id, input)` → DepartmentType [@require_role org_admin]
- `deleteDepartment(id)` → SuccessResponse [@require_role org_admin]

**Stats:**
- Total de agentes
- Total de filas
- Conversas ativas/completadas

---

### 5. **Queues** (Filas)

**Queries:**
- `queue(id)` → QueueType
- `queues(departmentId, isActive)` → [QueueType]
- `queueStats(queueId)` → QueueStats

**Mutations:**
- `createQueue(input)` → QueueType [@require_role org_admin]
- `updateQueue(id, input)` → QueueType [@require_role org_admin]
- `deleteQueue(id)` → SuccessResponse [@require_role org_admin]

**Configurações de Fila:**
- `priority`: Prioridade (0-100)
- `slaMinutes`: SLA em minutos
- `routingMode`: round_robin, load_balance, manual, skills_based
- `autoAssignConversations`: Auto-atribuir conversas
- `maxConversationsPerAgent`: Limite de conversas por agente

**Stats:**
- Total/ativas/enfileiradas/completadas
- Tempo médio de espera

---

### 6. **Contacts** (Contatos)

**Queries:**
- `contact(id)` → ContactType
- `contacts(skip, limit, filter)` → ContactListResponse

**Mutations:**
- `createContact(input)` → ContactType
- `updateContact(id, input)` → ContactType
- `blockContact(id)` → ContactType
- `unblockContact(id)` → ContactType
- `deleteContact(id)` → SuccessResponse

**Filtros:**
- `query`: Busca por nome, telefone ou email
- `isBlocked`: Bloqueados/desbloqueados

---

### 7. **Conversations** (Conversas)

**Queries:**
- `conversation(id)` → ConversationType
- `conversations(skip, limit, filter)` → ConversationListResponse
- `conversationMessages(conversationId, skip, limit)` → [MessageType]

**Mutations:**
- `sendMessage(input)` → MessageType
- `assignConversation(input)` → ConversationType
- `closeConversation(conversationId)` → ConversationType
- `reopenConversation(conversationId)` → ConversationType

**Filtros:**
- `status`: active, waiting, closed
- `queueId`: Fila específica
- `assignedAgentId`: Agente específico
- `contactId`: Contato específico

**Send Message:**
- Envia como agente autenticado
- Suporte a texto e mídia
- `mediaUrl` e `mediaType` opcionais

---

## 📚 Exemplos de Uso

### Criar Usuário

```graphql
mutation {
  createUser(input: {
    email: "agent@example.com"
    password: "AgentPass123"
    name: "João Silva"
    role: "agent"
    departmentId: "uuid-do-departamento"
  }) {
    id
    email
    name
    role
    isActive
  }
}
```

### Listar Conversas Ativas

```graphql
query {
  conversations(
    skip: 0
    limit: 20
    filter: { status: "active", queueId: "uuid-da-fila" }
  ) {
    total
    conversations {
      id
      status
      lastMessageAt
      contact {
        name
        phone
      }
      assignedAgent {
        name
      }
    }
  }
}
```

### Enviar Mensagem

```graphql
mutation {
  sendMessage(input: {
    conversationId: "uuid-da-conversa"
    content: "Olá! Como posso ajudar?"
  }) {
    id
    content
    createdAt
    senderType
  }
}
```

### Estatísticas da Organização

```graphql
query {
  myOrganization {
    name
    planTier
    maxUsers
  }

  organizationStats {
    totalUsers
    activeUsers
    totalContacts
    totalConversations
    conversationsThisMonth
  }
}
```

### Atribuir Conversa para Agente

```graphql
mutation {
  assignConversation(input: {
    conversationId: "uuid-da-conversa"
    agentId: "uuid-do-agente"
    queueId: "uuid-da-fila"
  }) {
    id
    status
    assignedAgent {
      name
    }
    queue {
      name
    }
  }
}
```

---

## ⏳ Módulos Pendentes

### 8. **WhatsApp** (em desenvolvimento)
- Conexões WhatsApp
- Templates
- Webhooks

### 9. **Chatbots** (em desenvolvimento)
- CRUD de chatbots
- Flows visuais
- Nodes

### 10. **Campaigns** (em desenvolvimento)
- Campanhas de mensagens em massa
- Agendamento
- Estatísticas

### 11. **Analytics** (em desenvolvimento)
- Métricas
- Relatórios
- Performance

### 12. **Dashboard** (em desenvolvimento)
- Resumos agregados
- KPIs

### 13. **Flow Automations** (em desenvolvimento)
- Automações programadas
- Execuções
- Scheduling

### 14. **Secrets** (em desenvolvimento)
- Gestão de credenciais
- Criptografia

### 15. **AI Assistant** (em desenvolvimento)
- Modelos de IA
- Configurações OpenAI/Anthropic
- Testes de conexão

### 16. **Agent Skills** (em desenvolvimento)
- Habilidades dos agentes
- Proficiência

### 17. **Notifications** (em desenvolvimento)
- Preferências
- Histórico

---

## 🔄 Features Avançadas (Futuro)

### DataLoaders (N+1 Query Optimization)
- Batch loading de relacionamentos
- Cache por request
- Redução de queries ao banco

### Subscriptions (Real-time)
- WebSocket para atualizações em tempo real
- `onNewMessage`
- `onConversationAssigned`
- `onQueueUpdate`

---

## 🚀 Roadmap

### Fase 1: Core Modules ✅ (Concluída)
- [x] Auth
- [x] Organizations
- [x] Users
- [x] Departments
- [x] Queues
- [x] Contacts
- [x] Conversations

### Fase 2: Business Modules 🔄 (Em Andamento)
- [ ] WhatsApp
- [ ] Chatbots
- [ ] Campaigns
- [ ] Analytics
- [ ] Dashboard

### Fase 3: Advanced Features ⏳ (Planejada)
- [ ] Flow Automations
- [ ] Secrets
- [ ] AI Assistant
- [ ] Agent Skills
- [ ] Notifications

### Fase 4: Optimization ⏳ (Planejada)
- [ ] DataLoaders
- [ ] Subscriptions
- [ ] Testes automatizados
- [ ] Performance tuning

---

## 📖 Documentação Adicional

- **REST API**: `API_CONTRACT.md`
- **Arquitetura**: `ARCHITECTURE_DECISIONS.md`
- **Multi-tenancy**: Ver `CLAUDE.md`
- **Testes**: Ver `PROGRESS_SUMMARY.md`

---

## 🎯 Comparação REST vs GraphQL

| Feature | REST API | GraphQL API |
|---------|----------|-------------|
| **Endpoints** | 217 rotas fixas | 1 endpoint flexível |
| **Over-fetching** | Sim | Não |
| **Under-fetching** | Sim | Não |
| **Versionamento** | /api/v1, /api/v2 | Nenhum |
| **Documentação** | Swagger/OpenAPI | Introspection |
| **Type Safety** | Pydantic schemas | Strawberry types |
| **IDE** | Swagger UI | GraphiQL |
| **Real-time** | Socket.IO separado | Subscriptions nativas |

**Recomendação**: Use GraphQL para frontends modernos, REST para integrações legadas.

---

## 💡 Dicas de Performance

1. **Use Paginação**: Sempre especifique `skip` e `limit` em listagens
2. **Filtros**: Use filtros para reduzir dados retornados
3. **Campos Seletivos**: Peça apenas os campos necessários
4. **Batch Requests**: Combine múltiplas queries em uma só requisição
5. **Cache**: GraphQL responses são facilmente cacheáveis

---

**Desenvolvido por**: Kayo Carvalho Fernandes
**🤖 Generated with [Claude Code](https://claude.com/claude-code)**
