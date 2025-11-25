# 📋 Contrato de API - PyTake v1

## Versão Atual: `v1`

Este documento define o contrato de API entre backend (FastAPI) e frontend (Next.js).

**⚠️ IMPORTANTE:**
- API versionada como `/api/v1/`
- Breaking changes exigem bump de versão
- Deprecation period mínimo: 2 semanas
- Todas as mudanças devem passar por PR review

---

## 🔐 Autenticação

Todas as requisições (exceto login/register) exigem header:
```
Authorization: Bearer <JWT_TOKEN>
```

### Endpoints de Auth

| Método | Endpoint | Descrição | Request | Response |
|--------|----------|-----------|---------|----------|
| POST | `/api/v1/auth/login` | Login de usuário | `{email, password}` | `{access_token, refresh_token, user}` |
| POST | `/api/v1/auth/register` | Registro de usuário | `{email, password, name, organization_name}` | `{access_token, user}` |
| POST | `/api/v1/auth/refresh` | Renovar token | `{refresh_token}` | `{access_token}` |
| POST | `/api/v1/auth/logout` | Logout | - | `204 No Content` |
| GET | `/api/v1/auth/me` | Dados do usuário autenticado | - | `{user}` |
| POST | `/api/v1/auth/forgot-password` | Solicitar reset de senha | `{email}` | `{message}` |
| POST | `/api/v1/auth/reset-password` | Resetar senha | `{token, new_password}` | `{message}` |

---

## 📱 WhatsApp

### Endpoints

| Método | Endpoint | Descrição | Request | Response |
|--------|----------|-----------|---------|----------|
| POST | `/api/v1/whatsapp/send` | Enviar mensagem | `{to, message, type?, template_id?}` | `{message_id, status}` |
| GET | `/api/v1/whatsapp/numbers` | Listar números WhatsApp | - | `Array<WhatsAppNumber>` |
| POST | `/api/v1/whatsapp/webhook` | Webhook do WhatsApp | `{...}` | `200 OK` |

**Schemas:**
```typescript
interface WhatsAppNumber {
  id: string;
  phone_number: string;
  display_name: string;
  status: 'active' | 'inactive' | 'pending';
  verified: boolean;
  organization_id: string;
}
```

---

## 🔄 Flows

### Endpoints

| Método | Endpoint | Descrição | Request | Response |
|--------|----------|-----------|---------|----------|
| GET | `/api/v1/flows` | Listar flows | `?limit=, ?offset=` | `Array<Flow>` |
| GET | `/api/v1/flows/{id}` | Buscar flow por ID | - | `Flow` |
| POST | `/api/v1/flows` | Criar novo flow | `{name, description, nodes, edges}` | `Flow` |
| PUT | `/api/v1/flows/{id}` | Atualizar flow | `{name?, description?, nodes?, edges?}` | `Flow` |
| DELETE | `/api/v1/flows/{id}` | Deletar flow | - | `204 No Content` |

**Schemas:**
```typescript
interface Flow {
  id: string;
  name: string;
  description?: string;
  status: 'active' | 'draft' | 'archived';
  nodes: FlowNode[];
  edges: FlowEdge[];
  stats?: {
    total_executions?: number;
    success_rate?: number;
    avg_duration_ms?: number;
  };
  organization_id: string;
  created_at: string;
  updated_at: string;
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}
```

---

## 🤖 Flow Automations

### Endpoints

| Método | Endpoint | Descrição | Request | Response |
|--------|----------|-----------|---------|----------|
| POST | `/api/v1/flow-automations` | Criar automação | `{flow_id, contacts, config}` | `FlowAutomation` |
| POST | `/api/v1/flow-automations/{id}/start` | Iniciar automação | - | `{status: 'started'}` |
| GET | `/api/v1/flow-automations/{id}/stats` | Estatísticas | - | `{...stats}` |

---

## 🔑 Secrets

### Endpoints

| Método | Endpoint | Descrição | Request | Response |
|--------|----------|-----------|---------|----------|
| GET | `/api/v1/secrets/` | Listar secrets | `?environment=, ?service=` | `Array<Secret>` |
| GET | `/api/v1/secrets/{id}` | Buscar secret | - | `Secret` |
| GET | `/api/v1/secrets/{id}/value` | Obter valor (criptografado) | - | `{value: string}` |
| POST | `/api/v1/secrets/` | Criar secret | `{key, value, environment?, service?}` | `Secret` |
| PUT | `/api/v1/secrets/{id}` | Atualizar secret | `{value?, environment?, service?}` | `Secret` |
| DELETE | `/api/v1/secrets/{id}` | Deletar secret | - | `204 No Content` |
| POST | `/api/v1/secrets/{id}/rotate` | Rotacionar chave | - | `Secret` |
| POST | `/api/v1/secrets/{id}/activate` | Ativar secret | - | `Secret` |
| POST | `/api/v1/secrets/{id}/deactivate` | Desativar secret | - | `Secret` |
| POST | `/api/v1/secrets/{id}/test` | Testar secret | `{test_type?}` | `{valid: boolean, message?}` |
| GET | `/api/v1/secrets/{id}/usage` | Estatísticas de uso | - | `SecretUsageStats` |
| GET | `/api/v1/secrets/usage/organization` | Uso por organização | - | `Array<SecretUsageStats>` |

**Schemas:**
```typescript
interface Secret {
  id: string;
  key: string;
  environment: 'development' | 'staging' | 'production';
  service?: string;
  status: 'active' | 'inactive' | 'rotated';
  organization_id: string;
  created_at: string;
  updated_at: string;
  last_rotated_at?: string;
}

interface SecretUsageStats {
  secret_id: string;
  total_requests: number;
  last_used_at: string;
  success_rate: number;
}
```

---

## 👥 Contacts

### Endpoints

| Método | Endpoint | Descrição | Request | Response |
|--------|----------|-----------|---------|----------|
| GET | `/api/v1/contacts` | Listar contatos | `?query=, ?limit=, ?offset=` | `Array<Contact>` |
| POST | `/api/v1/contacts` | Criar contato | `{whatsapp_id, name?, email?}` | `Contact` |

**Schemas:**
```typescript
interface Contact {
  id: string;
  whatsapp_id: string;
  name?: string;
  email?: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
}
```

---

## 🔒 Multi-tenancy & RBAC

**Todas as requisições são escopadas por `organization_id`:**
- Extraído automaticamente do token JWT
- Backend filtra automaticamente em queries
- Usuários não podem acessar dados de outras organizações

**Roles disponíveis:**
- `super_admin`: Acesso total ao sistema
- `org_admin`: Acesso total à organização
- `agent`: Acesso a conversas e atendimento
- `viewer`: Apenas leitura

---

## 📊 Respostas de Erro

```typescript
interface ErrorResponse {
  detail: string;
  status_code: number;
  error_code?: string;
}
```

**Códigos HTTP comuns:**
- `200` OK
- `201` Created
- `204` No Content
- `400` Bad Request (validação falhou)
- `401` Unauthorized (token inválido/expirado)
- `403` Forbidden (sem permissão)
- `404` Not Found
- `422` Unprocessable Entity (erro de validação Pydantic)
- `500` Internal Server Error

---

## 🚀 Deprecation Policy

**Quando deprecar um endpoint:**
1. Adicionar header `Deprecated: true` na resposta
2. Documentar em changelog
3. Notificar time frontend com 2 semanas de antecedência
4. Manter endpoint funcional por pelo menos 4 semanas
5. Após período, remover na próxima versão maior (v2)

**Exemplo de mudança breaking:**
```typescript
// ❌ Breaking change (proibido em v1)
interface Flow {
  id: string;
  flowName: string; // Antes era 'name'
}

// ✅ Non-breaking change (permitido)
interface Flow {
  id: string;
  name: string;
  display_name?: string; // Novo campo opcional
}
```

---

## 📝 OpenAPI/Swagger

**Documentação interativa:**
- Local: `http://localhost:8000/api/v1/docs`
- Staging: `https://staging-api.pytake.net/api/v1/docs`
- Produção: `https://api.pytake.net/api/v1/docs`

**Baixar schema OpenAPI:**
```bash
curl http://localhost:8000/api/v1/openapi.json > openapi.json
```

---

## 🔄 Changelog

### v1.0.0 (2025-11-12)
- Versão inicial da API
- Endpoints de auth, flows, secrets, contacts, whatsapp
- Multi-tenancy e RBAC implementados
