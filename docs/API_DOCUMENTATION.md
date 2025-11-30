# PyTake Backend API Documentation

## Visão Geral

Esta documentação mapeia todas as rotas da API FastAPI do PyTake, incluindo parâmetros, métodos HTTP, autenticação e respostas.

**Base URL:** `http://localhost:8000/api/v1`

**Autenticação:** JWT Bearer Token (exceto webhooks públicos)

**Formato de Resposta:** JSON

---

## 0. Geral (`/`)

### GET `/health`
**Descrição:** Health check simples

**Autenticação:** Não requerida

**Resposta (200):**
```json
{
  "status": "healthy"
}
```

---

## 1. Autenticação (`/auth`)

### POST `/auth/register`
**Descrição:** Registrar novo usuário e organização

**Autenticação:** Não requerida

**Rate Limit:** 3/hora por IP

**Parâmetros (Body):**
```json
{
  "email": "string",
  "password": "string",
  "full_name": "string",
  "organization_name": "string"
}
```

**Resposta (201):**
```json
{
  "user": {...},
  "token": {
    "access_token": "string",
    "refresh_token": "string",
    "token_type": "bearer",
    "expires_in": 3600
  },
  "message": "Registration successful. Please verify your email."
}
```

### POST `/auth/login`
**Descrição:** Autenticar usuário

**Autenticação:** Não requerida

**Rate Limit:** 5/minuto por IP

**Parâmetros (Body):**
```json
{
  "email": "string",
  "password": "string"
}
```

**Resposta (200):**
```json
{
  "user": {...},
  "token": {...},
  "message": "Login successful"
}
```

### POST `/auth/refresh`
**Descrição:** Renovar token de acesso

**Autenticação:** Não requerida

**Rate Limit:** 10/minuto

**Parâmetros (Body):**
```json
{
  "refresh_token": "string"
}
```

**Resposta (200):** Token object

### POST `/auth/logout`
**Descrição:** Logout do usuário

**Autenticação:** Bearer Token

**Parâmetros (Body):**
```json
{
  "refresh_token": "string"
}
```

**Resposta (200):** SuccessResponse

### GET `/auth/me`
**Descrição:** Obter perfil do usuário atual

**Autenticação:** Bearer Token

**Resposta (200):** UserProfile

### GET `/auth/verify-token`
**Descrição:** Verificar se token é válido

**Autenticação:** Bearer Token

**Resposta (200):**
```json
{
  "valid": true,
  "user_id": "uuid",
  "organization_id": "uuid",
  "role": "string"
}
```

---

## 2. Usuários (`/users`)

### GET `/users/`
**Descrição:** Listar usuários da organização

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 100)
- `role`: string (org_admin|agent|viewer)
- `is_active`: bool

**Resposta (200):** List[UserSchema]

### POST `/users/`
**Descrição:** Criar novo usuário

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Body):** UserCreate

**Resposta (201):** UserSchema

### GET `/users/me`
**Descrição:** Obter perfil do usuário atual

**Autenticação:** Bearer Token

**Resposta (200):** UserSchema

### GET `/users/me/stats`
**Descrição:** Obter estatísticas do usuário atual

**Autenticação:** Bearer Token

**Resposta (200):** dict

### PUT `/users/me`
**Descrição:** Atualizar perfil do usuário atual

**Autenticação:** Bearer Token

**Parâmetros (Body):** UserUpdate

**Resposta (200):** UserSchema

### GET `/users/{user_id}`
**Descrição:** Obter usuário por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** user_id: UUID

**Resposta (200):** UserSchema

### GET `/users/{user_id}/stats`
**Descrição:** Obter estatísticas do usuário

**Autenticação:** Bearer Token

**Parâmetros (Path):** user_id: UUID

**Resposta (200):** dict

### PUT `/users/{user_id}`
**Descrição:** Atualizar usuário

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Path):** user_id: UUID

**Parâmetros (Body):** UserUpdate

**Resposta (200):** UserSchema

### POST `/users/{user_id}/activate`
**Descrição:** Ativar usuário

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Path):** user_id: UUID

**Resposta (200):** UserSchema

### POST `/users/{user_id}/deactivate`
**Descrição:** Desativar usuário

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Path):** user_id: UUID

**Resposta (200):** UserSchema

### DELETE `/users/{user_id}`
**Descrição:** Deletar usuário (soft delete)

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Path):** user_id: UUID

**Resposta (204):** No Content

---

## 3. Contatos (`/contacts`)

### GET `/contacts/stats`
**Descrição:** Estatísticas organizacionais de contatos

**Autenticação:** Bearer Token

**Resposta (200):** dict

### GET `/contacts/`
**Descrição:** Listar contatos

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 100)
- `query`: string (busca por nome, email, telefone, empresa)
- `assigned_agent_id`: UUID
- `is_blocked`: bool

**Resposta (200):** List[Contact]

### POST `/contacts/`
**Descrição:** Criar novo contato

**Autenticação:** Bearer Token

**Parâmetros (Body):** ContactCreate

**Resposta (201):** Contact

### GET `/contacts/{contact_id}`
**Descrição:** Obter contato por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Resposta (200):** Contact

### GET `/contacts/{contact_id}/stats`
**Descrição:** Estatísticas do contato

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Resposta (200):** dict

### PUT `/contacts/{contact_id}`
**Descrição:** Atualizar contato

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Parâmetros (Body):** ContactUpdate

**Resposta (200):** Contact

### DELETE `/contacts/{contact_id}`
**Descrição:** Deletar contato (soft delete)

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Resposta (204):** No Content

### POST `/contacts/{contact_id}/block`
**Descrição:** Bloquear contato

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Parâmetros (Query):** reason: string (opcional)

**Resposta (200):** Contact

### POST `/contacts/{contact_id}/unblock`
**Descrição:** Desbloquear contato

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Resposta (200):** Contact

### POST `/contacts/{contact_id}/vip`
**Descrição:** Marcar contato como VIP

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Resposta (200):** Contact

### DELETE `/contacts/{contact_id}/vip`
**Descrição:** Remover status VIP

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Resposta (200):** Contact

### PUT `/contacts/{contact_id}/tags`
**Descrição:** Atualizar tags do contato (substitui todas)

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Parâmetros (Body):** List[string] (nomes das tags)

**Resposta (200):** Contact

### POST `/contacts/{contact_id}/tags`
**Descrição:** Adicionar tags ao contato

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Parâmetros (Body):** List[UUID] (IDs das tags)

**Resposta (200):** Contact

### DELETE `/contacts/{contact_id}/tags`
**Descrição:** Remover tags do contato

**Autenticação:** Bearer Token

**Parâmetros (Path):** contact_id: UUID

**Parâmetros (Body):** List[UUID] (IDs das tags)

**Resposta (200):** Contact

### GET `/contacts/tags/`
**Descrição:** Listar todas as tags

**Autenticação:** Bearer Token

**Resposta (200):** List[Tag]

### POST `/contacts/tags/`
**Descrição:** Criar nova tag

**Autenticação:** Bearer Token

**Parâmetros (Body):** TagCreate

**Resposta (201):** Tag

### GET `/contacts/tags/{tag_id}`
**Descrição:** Obter tag por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** tag_id: UUID

**Resposta (200):** Tag

### PUT `/contacts/tags/{tag_id}`
**Descrição:** Atualizar tag

**Autenticação:** Bearer Token

**Parâmetros (Path):** tag_id: UUID

**Parâmetros (Body):** TagUpdate

**Resposta (200):** Tag

### DELETE `/contacts/tags/{tag_id}`
**Descrição:** Deletar tag

**Autenticação:** Bearer Token

**Parâmetros (Path):** tag_id: UUID

**Resposta (204):** No Content

---

## 4. Conversas (`/conversations`)

### GET `/conversations/`
**Descrição:** Listar conversas

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 100)
- `status`: string (open|pending|resolved|closed)
- `assigned_to_me`: bool
- `department_id`: UUID
- `queue_id`: UUID

**Resposta (200):** List[Conversation]

### POST `/conversations/`
**Descrição:** Criar nova conversa

**Autenticação:** Bearer Token

**Parâmetros (Body):** ConversationCreate

**Resposta (201):** Conversation

### GET `/conversations/metrics`
**Descrição:** Métricas agregadas de conversas

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `department_id`: string
- `queue_id`: string
- `since`: string (ISO datetime)

**Resposta (200):** dict

### GET `/conversations/{conversation_id}`
**Descrição:** Obter conversa por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Resposta (200):** Conversation

### PUT `/conversations/{conversation_id}`
**Descrição:** Atualizar conversa

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Parâmetros (Body):** ConversationUpdate

**Resposta (200):** Conversation

### GET `/conversations/{conversation_id}/messages`
**Descrição:** Obter mensagens da conversa

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 100)

**Resposta (200):** List[MessageResponse]

### POST `/conversations/{conversation_id}/messages`
**Descrição:** Enviar mensagem via WhatsApp

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Parâmetros (Body):** MessageSendRequest

**Resposta (201):** MessageResponse

### POST `/conversations/{conversation_id}/read`
**Descrição:** Marcar conversa como lida

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Resposta (200):** Conversation

### POST `/conversations/{conversation_id}/assign`
**Descrição:** Atribuir conversa a um agente

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Parâmetros (Body):** ConversationAssign

**Resposta (200):** Conversation

### POST `/conversations/{conversation_id}/transfer`
**Descrição:** Transferir conversa para departamento

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Parâmetros (Body):** ConversationTransfer

**Resposta (200):** Conversation

### POST `/conversations/{conversation_id}/close`
**Descrição:** Fechar conversa

**Autenticação:** Bearer Token

**Parâmetros (Path):** conversation_id: UUID

**Parâmetros (Body):** ConversationClose

**Resposta (200):** Conversation

### GET `/conversations/sla-alerts`
**Descrição:** Listar alertas de SLA

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 200)
- `department_id`: UUID
- `queue_id`: UUID
- `nearing_threshold`: float (default: 0.8)

**Resposta (200):** List[SlaAlert]

---

## 5. WhatsApp (`/whatsapp`)

### GET `/whatsapp/`
**Descrição:** Listar números do WhatsApp

**Autenticação:** Bearer Token

**Resposta (200):** List[WhatsAppNumber]

### POST `/whatsapp/`
**Descrição:** Registrar novo número do WhatsApp

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Body):** WhatsAppNumberCreate

**Resposta (201):** WhatsAppNumber

### GET `/whatsapp/webhook`
**Descrição:** Verificação de webhook do Meta Cloud API

**Autenticação:** Não requerida (público)

**Parâmetros (Query):**
- `hub.mode`: string
- `hub.verify_token`: string
- `hub.challenge`: string

**Resposta (200):** string (challenge)

### POST `/whatsapp/webhook`
**Descrição:** Receber mensagens e eventos do WhatsApp

**Autenticação:** Não requerida (público)

**Parâmetros (Body):** Webhook payload do Meta

**Resposta (200):** {"status": "ok"}

### GET `/whatsapp/{number_id}`
**Descrição:** Obter número do WhatsApp por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** WhatsAppNumber

### PUT `/whatsapp/{number_id}`
**Descrição:** Atualizar número do WhatsApp

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Path):** number_id: UUID

**Parâmetros (Body):** WhatsAppNumberUpdate

**Resposta (200):** WhatsAppNumber

### POST `/whatsapp/{number_id}/test`
**Descrição:** Testar conexão do WhatsApp

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** dict

### DELETE `/whatsapp/{number_id}`
**Descrição:** Deletar número do WhatsApp

**Autenticação:** Bearer Token (org_admin/super_admin)

**Parâmetros (Path):** number_id: UUID

**Resposta (204):** No Content

### POST `/whatsapp/{number_id}/qrcode`
**Descrição:** Gerar QR code para Evolution API

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** QRCodeResponse

### GET `/whatsapp/{number_id}/qrcode/status`
**Descrição:** Verificar status do QR code

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** QRCodeResponse

### POST `/whatsapp/{number_id}/disconnect`
**Descrição:** Desconectar WhatsApp

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** dict

### GET `/whatsapp/{number_id}/templates`
**Descrição:** Listar templates do WhatsApp

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** List[dict]

### POST `/whatsapp/{number_id}/templates`
**Descrição:** Criar template do WhatsApp

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Parâmetros (Body):** TemplateCreateRequest

**Resposta (201):** TemplateResponse

### GET `/whatsapp/{number_id}/templates/local`
**Descrição:** Listar templates locais

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** List[TemplateResponse]

### GET `/whatsapp/{number_id}/templates/{template_id}`
**Descrição:** Obter template por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID, template_id: string

**Resposta (200):** TemplateResponse

### PUT `/whatsapp/{number_id}/templates/{template_id}`
**Descrição:** Atualizar template

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID, template_id: string

**Parâmetros (Body):** TemplateUpdateRequest

**Resposta (200):** TemplateResponse

### DELETE `/whatsapp/{number_id}/templates/{template_id}`
**Descrição:** Deletar template

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID, template_id: string

**Resposta (204):** No Content

### POST `/whatsapp/{number_id}/templates/sync`
**Descrição:** Sincronizar templates

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** TemplateSyncResponse

### GET `/whatsapp/{number_id}/rate-limit/usage`
**Descrição:** Verificar uso de rate limit

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** dict

### POST `/whatsapp/{number_id}/rate-limit/reset`
**Descrição:** Resetar rate limit

**Autenticação:** Bearer Token

**Parâmetros (Path):** number_id: UUID

**Resposta (200):** dict

---

## 6. Chatbots (`/chatbots`)

### POST `/chatbots/`
**Descrição:** Criar novo chatbot

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Body):** ChatbotCreate

**Resposta (201):** ChatbotInDB

### GET `/chatbots/`
**Descrição:** Listar chatbots da organização

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 500)

**Resposta (200):** ChatbotListResponse

### GET `/chatbots/{chatbot_id}`
**Descrição:** Obter chatbot por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** chatbot_id: UUID

**Resposta (200):** ChatbotInDB

### GET `/chatbots/{chatbot_id}/full`
**Descrição:** Obter chatbot com todos os flows

**Autenticação:** Bearer Token

**Parâmetros (Path):** chatbot_id: UUID

**Resposta (200):** ChatbotWithFlows

### GET `/chatbots/{chatbot_id}/stats`
**Descrição:** Estatísticas do chatbot

**Autenticação:** Bearer Token

**Parâmetros (Path):** chatbot_id: UUID

**Resposta (200):** ChatbotStats

### PATCH `/chatbots/{chatbot_id}`
**Descrição:** Atualizar chatbot

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** chatbot_id: UUID

**Parâmetros (Body):** ChatbotUpdate

**Resposta (200):** ChatbotInDB

### POST `/chatbots/{chatbot_id}/activate`
**Descrição:** Ativar chatbot

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** chatbot_id: UUID

**Resposta (200):** ChatbotInDB

### POST `/chatbots/{chatbot_id}/deactivate`
**Descrição:** Desativar chatbot

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** chatbot_id: UUID

**Resposta (200):** ChatbotInDB

### DELETE `/chatbots/{chatbot_id}`
**Descrição:** Deletar chatbot

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** chatbot_id: UUID

**Resposta (204):** No Content

### POST `/chatbots/{chatbot_id}/duplicate`
**Descrição:** Duplicar chatbot

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** chatbot_id: UUID

**Resposta (201):** ChatbotInDB

### GET `/chatbots/{chatbot_id}/flows`
**Descrição:** Listar flows do chatbot

**Autenticação:** Bearer Token

**Parâmetros (Path):** chatbot_id: UUID

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 500)

**Resposta (200):** FlowListResponse

### GET `/chatbots/flows/{flow_id}`
**Descrição:** Obter flow por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** flow_id: UUID

**Resposta (200):** FlowInDB

### GET `/chatbots/flows/{flow_id}/full`
**Descrição:** Obter flow com todos os nodes

**Autenticação:** Bearer Token

**Parâmetros (Path):** flow_id: UUID

**Resposta (200):** FlowWithNodes

### PATCH `/chatbots/flows/{flow_id}`
**Descrição:** Atualizar flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** flow_id: UUID

**Parâmetros (Body):** FlowUpdate

**Resposta (200):** FlowInDB

### DELETE `/chatbots/flows/{flow_id}`
**Descrição:** Deletar flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** flow_id: UUID

**Resposta (204):** No Content

### POST `/chatbots/flows/{flow_id}/duplicate`
**Descrição:** Duplicar flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** flow_id: UUID

**Resposta (201):** FlowInDB

### GET `/chatbots/flows/{flow_id}/nodes`
**Descrição:** Listar nodes do flow

**Autenticação:** Bearer Token

**Parâmetros (Path):** flow_id: UUID

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 500)

**Resposta (200):** NodeListResponse

### PATCH `/chatbots/flows/{flow_id}/nodes`
**Descrição:** Atualizar nodes do flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** flow_id: UUID

**Parâmetros (Body):** List[NodeUpdate]

**Resposta (200):** NodeListResponse

### DELETE `/chatbots/flows/{flow_id}/nodes`
**Descrição:** Deletar nodes do flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** flow_id: UUID

**Parâmetros (Body):** List[UUID] (node IDs)

**Resposta (204):** No Content

### POST `/chatbots/flows/{flow_id}/nodes`
**Descrição:** Criar node no flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** flow_id: UUID

**Parâmetros (Body):** NodeCreate

**Resposta (201):** NodeInDB

### GET `/chatbots/flows/{flow_id}/export`
**Descrição:** Exportar flow

**Autenticação:** Bearer Token

**Parâmetros (Path):** flow_id: UUID

**Resposta (200):** dict

### POST `/chatbots/flows/{flow_id}/import`
**Descrição:** Importar flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** flow_id: UUID

**Parâmetros (Body):** dict

**Resposta (200):** FlowInDB

---

## 7. Flow Automations (`/flow-automations`)

### POST `/flow-automations/`
**Descrição:** Criar nova automação de flow

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Body):** FlowAutomationCreate

**Resposta (201):** FlowAutomationResponse

### GET `/flow-automations/`
**Descrição:** Listar automações de flow

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 500)
- `status`: string
- `automation_type`: string

**Resposta (200):** FlowAutomationList

### GET `/flow-automations/{automation_id}`
**Descrição:** Obter automação por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** automation_id: UUID

**Resposta (200):** FlowAutomationResponse

### PUT `/flow-automations/{automation_id}`
**Descrição:** Atualizar automação

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** automation_id: UUID

**Parâmetros (Body):** FlowAutomationUpdate

**Resposta (200):** FlowAutomationResponse

### DELETE `/flow-automations/{automation_id}`
**Descrição:** Deletar automação

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** automation_id: UUID

**Resposta (204):** No Content

### POST `/flow-automations/{automation_id}/start`
**Descrição:** Iniciar execução da automação

**Autenticação:** Bearer Token

**Parâmetros (Path):** automation_id: UUID

**Resposta (200):** FlowAutomationExecutionResponse

### GET `/flow-automations/{automation_id}/stats`
**Descrição:** Estatísticas da automação

**Autenticação:** Bearer Token

**Parâmetros (Path):** automation_id: UUID

**Resposta (200):** FlowAutomationStats

### POST `/flow-automations/{automation_id}/schedule`
**Descrição:** Criar agendamento para automação

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** automation_id: UUID

**Parâmetros (Body):** FlowAutomationScheduleCreate

**Resposta (201):** FlowAutomationScheduleResponse

### GET `/flow-automations/{automation_id}/schedule`
**Descrição:** Obter agendamento da automação

**Autenticação:** Bearer Token

**Parâmetros (Path):** automation_id: UUID

**Resposta (200):** FlowAutomationScheduleResponse

### PUT `/flow-automations/{automation_id}/schedule`
**Descrição:** Atualizar agendamento

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** automation_id: UUID

**Parâmetros (Body):** FlowAutomationScheduleUpdate

**Resposta (200):** FlowAutomationScheduleResponse

### DELETE `/flow-automations/{automation_id}/schedule`
**Descrição:** Deletar agendamento

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** automation_id: UUID

**Resposta (204):** No Content

### POST `/flow-automations/{automation_id}/schedule/exceptions`
**Descrição:** Criar exceção de agendamento

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** automation_id: UUID

**Parâmetros (Body):** ScheduleExceptionCreate

**Resposta (201):** ScheduleException

### DELETE `/flow-automations/{automation_id}/schedule/exceptions/{exception_id}`
**Descrição:** Deletar exceção de agendamento

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** automation_id: UUID, exception_id: UUID

**Resposta (204):** No Content

### GET `/flow-automations/{automation_id}/schedule/preview`
**Descrição:** Preview do agendamento

**Autenticação:** Bearer Token

**Parâmetros (Path):** automation_id: UUID

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)

**Resposta (200):** SchedulePreview

---

## 8. Organizations (`/organizations`)

### GET `/organizations/me`
**Descrição:** Obter organização atual do usuário

**Autenticação:** Bearer Token

**Resposta (200):** Organization

### GET `/organizations/`
**Descrição:** Listar organizações (super_admin only)

**Autenticação:** Bearer Token (super_admin)

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 500)

**Resposta (200):** List[Organization]

### GET `/organizations/{org_id}`
**Descrição:** Obter organização por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** org_id: UUID

**Resposta (200):** Organization

### GET `/organizations/{org_id}/stats`
**Descrição:** Estatísticas da organização

**Autenticação:** Bearer Token

**Parâmetros (Path):** org_id: UUID

**Resposta (200):** dict

### PUT `/organizations/me`
**Descrição:** Atualizar organização atual

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Body):** OrganizationUpdate

**Resposta (200):** Organization

### PUT `/organizations/me/settings`
**Descrição:** Atualizar configurações da organização

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Body):** OrganizationSettingsUpdate

**Resposta (200):** Organization

### PUT `/organizations/{org_id}`
**Descrição:** Atualizar organização (super_admin)

**Autenticação:** Bearer Token (super_admin)

**Parâmetros (Path):** org_id: UUID

**Parâmetros (Body):** OrganizationUpdate

**Resposta (200):** Organization

### PUT `/organizations/{org_id}/plan`
**Descrição:** Atualizar plano da organização

**Autenticação:** Bearer Token (super_admin)

**Parâmetros (Path):** org_id: UUID

**Parâmetros (Body):** OrganizationPlanUpdate

**Resposta (200):** Organization

### POST `/organizations/{org_id}/activate`
**Descrição:** Ativar organização

**Autenticação:** Bearer Token (super_admin)

**Parâmetros (Path):** org_id: UUID

**Resposta (200):** Organization

### POST `/organizations/{org_id}/deactivate`
**Descrição:** Desativar organização

**Autenticação:** Bearer Token (super_admin)

**Parâmetros (Path):** org_id: UUID

**Resposta (200):** Organization

### DELETE `/organizations/{org_id}`
**Descrição:** Deletar organização

**Autenticação:** Bearer Token (super_admin)

**Parâmetros (Path):** org_id: UUID

**Resposta (204):** No Content

---

## 9. Analytics (`/analytics`)

### GET `/analytics/overview`
**Descrição:** Métricas gerais da organização

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)

**Resposta (200):** OverviewMetrics

### GET `/analytics/conversations`
**Descrição:** Métricas de conversas

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)
- `department_id`: UUID
- `queue_id`: UUID

**Resposta (200):** ConversationMetrics

### GET `/analytics/agents`
**Descrição:** Métricas de agentes

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)
- `agent_id`: UUID

**Resposta (200):** AgentMetrics

### GET `/analytics/campaigns`
**Descrição:** Métricas de campanhas

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)
- `campaign_id`: UUID

**Resposta (200):** CampaignMetrics

### GET `/analytics/contacts`
**Descrição:** Métricas de contatos

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)

**Resposta (200):** ContactMetrics

### GET `/analytics/chatbots`
**Descrição:** Métricas de chatbots

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)
- `chatbot_id`: UUID

**Resposta (200):** ChatbotMetrics

### GET `/analytics/messages`
**Descrição:** Métricas de mensagens

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)
- `message_type`: string

**Resposta (200):** MessageMetrics

### GET `/analytics/time-series/messages`
**Descrição:** Dados de série temporal de mensagens

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)
- `interval`: string (hour|day|week|month)
- `message_type`: string

**Resposta (200):** TimeSeriesData

### GET `/analytics/reports/full`
**Descrição:** Relatório completo

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)

**Resposta (200):** FullReport

---

## 10. Dashboard (`/dashboard`)

### GET `/dashboard/summary`
**Descrição:** Resumo do dashboard

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `start_date`: string (ISO date)
- `end_date`: string (ISO date)

**Resposta (200):** OverviewMetrics

---

## 11. Campaigns (`/campaigns`)

### POST `/campaigns/`
**Descrição:** Criar nova campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Body):** CampaignCreate

**Resposta (201):** CampaignInDB

### GET `/campaigns/`
**Descrição:** Listar campanhas

**Autenticação:** Bearer Token

**Parâmetros (Query):**
- `skip`: int (default: 0)
- `limit`: int (default: 100, max: 500)
- `status`: string

**Resposta (200):** CampaignListResponse

### GET `/campaigns/{campaign_id}`
**Descrição:** Obter campanha por ID

**Autenticação:** Bearer Token

**Parâmetros (Path):** campaign_id: UUID

**Resposta (200):** CampaignInDB

### GET `/campaigns/{campaign_id}/stats`
**Descrição:** Estatísticas da campanha

**Autenticação:** Bearer Token

**Parâmetros (Path):** campaign_id: UUID

**Resposta (200):** CampaignStats

### GET `/campaigns/{campaign_id}/progress`
**Descrição:** Progresso da campanha

**Autenticação:** Bearer Token

**Parâmetros (Path):** campaign_id: UUID

**Resposta (200):** CampaignProgress

### GET `/campaigns/{campaign_id}/audience/preview`
**Descrição:** Preview da audiência

**Autenticação:** Bearer Token

**Parâmetros (Path):** campaign_id: UUID

**Parâmetros (Query):**
- `limit`: int (default: 10)

**Resposta (200):** AudiencePreview

### PATCH `/campaigns/{campaign_id}`
**Descrição:** Atualizar campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** campaign_id: UUID

**Parâmetros (Body):** CampaignUpdate

**Resposta (200):** CampaignInDB

### DELETE `/campaigns/{campaign_id}`
**Descrição:** Deletar campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** campaign_id: UUID

**Resposta (204):** No Content

### POST `/campaigns/{campaign_id}/start`
**Descrição:** Iniciar campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** campaign_id: UUID

**Resposta (200):** CampaignInDB

### POST `/campaigns/{campaign_id}/pause`
**Descrição:** Pausar campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** campaign_id: UUID

**Resposta (200):** CampaignInDB

### POST `/campaigns/{campaign_id}/resume`
**Descrição:** Retomar campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** campaign_id: UUID

**Resposta (200):** CampaignInDB

### POST `/campaigns/{campaign_id}/cancel`
**Descrição:** Cancelar campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** campaign_id: UUID

**Resposta (200):** CampaignInDB

### POST `/campaigns/{campaign_id}/duplicate`
**Descrição:** Duplicar campanha

**Autenticação:** Bearer Token (org_admin)

**Parâmetros (Path):** campaign_id: UUID

**Resposta (201):** CampaignInDB

---

## Endpoints Adicionais

A API também inclui os seguintes módulos com endpoints similares (CRUD completo):

- **Departments** (`/departments`) - Gerenciamento de departamentos
- **Queues** (`/queues`) - Gerenciamento de filas
- **AI Assistant** (`/ai-assistant`) - Assistente de IA (OpenAI, Anthropic e AnythingLLM)
- **Agent Skills** (`/agent-skills`) - Habilidades de agentes
- **Secrets** (`/secrets`) - Gerenciamento de secrets
- **Database** (`/database`) - Operações de banco de dados
- **Debug** (`/debug`) - Endpoints de debug
- **Websocket** (`/websocket`) - Conexões WebSocket

Cada módulo segue padrões similares de CRUD com autenticação baseada em roles.

---

## AI Assistant (`/ai-assistant`)

O módulo AI Assistant permite gerar flows de automação e sugerir melhorias usando provedores de IA.

### Provedores Suportados

| Provider | Enum | Descrição |
|----------|------|-----------|
| OpenAI | `openai` | GPT-4, GPT-4o, GPT-3.5, etc. |
| Anthropic | `anthropic` | Claude 3.5 Sonnet/Opus |
| AnythingLLM | `anythingllm` | Instância auto-hospedada AnythingLLM |

### Configurações (`AIAssistantSettings`)

Armazenadas em `organization.settings.ai_assistant`:

```json
{
  "enabled": true,
  "default_provider": "anythingllm",
  "openai_api_key": "sk-openai-...",
  "anthropic_api_key": "sk-anthropic-...",
  "anythingllm_base_url": "https://llm.example.com/api/v1",
  "anythingllm_api_key": "sk-any-...",
  "anythingllm_workspace_slug": "org-workspace",
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 8192,
  "temperature": 0.7
}
```

### GET `/ai-assistant/settings`
**Descrição:** Obter configurações do AI Assistant

**Resposta (200):** AIAssistantSettings

### POST `/ai-assistant/settings`
**Descrição:** Atualizar configurações (org_admin)

**Body (AIAssistantSettingsUpdate):** Campos opcionais para atualização.

**Resposta (200):** AIAssistantSettings

### POST `/ai-assistant/test`
**Descrição:** Testar conexão com o provedor de IA configurado

**Resposta (200):**
```json
{
  "success": true,
  "provider": "anythingllm",
  "message": "Connection successful!"
}
```

### POST `/ai-assistant/generate-flow`
**Descrição:** Gerar flow automaticamente a partir de descrição

**Body:** GenerateFlowRequest
```json
{
  "description": "Flow de atendimento imobiliário",
  "industry": "real estate",
  "language": "pt-BR",
  "chatbot_id": "uuid"
}
```

**Resposta (200):** GenerateFlowResponse (flow_data ou clarification_questions)

### POST `/ai-assistant/suggest-improvements`
**Descrição:** Sugerir melhorias para um flow existente

**Body:** SuggestImprovementsRequest
```json
{
  "flow_id": "uuid",
  "focus_areas": ["ux", "conversion"]
}
```

**Resposta (200):** SuggestImprovementsResponse

---

## Códigos de Status HTTP

- **200:** OK - Requisição bem-sucedida
- **201:** Created - Recurso criado com sucesso
- **204:** No Content - Sucesso, sem conteúdo de resposta
- **400:** Bad Request - Parâmetros inválidos
- **401:** Unauthorized - Token inválido ou ausente
- **403:** Forbidden - Permissões insuficientes
- **404:** Not Found - Recurso não encontrado
- **422:** Unprocessable Entity - Dados inválidos
- **429:** Too Many Requests - Rate limit excedido
- **500:** Internal Server Error - Erro interno do servidor

## Rate Limiting

- **Registro:** 3 por hora por IP
- **Login:** 5 por minuto por IP
- **Refresh Token:** 10 por minuto
- **Outros endpoints:** Geralmente ilimitados (exceto webhooks)

## Autenticação

Todos os endpoints (exceto webhooks) requerem:
```
Authorization: Bearer <access_token>
```

Tokens expiram em 1 hora. Use `/auth/refresh` para renovar.

## Multi-tenancy

Todos os dados são escopados por `organization_id`. Usuários só acessam dados de sua organização.

## Roles e Permissões

- **super_admin:** Acesso total
- **org_admin:** Gerenciamento da organização
- **agent:** Acesso a conversas e contatos
- **viewer:** Acesso somente leitura

---

## Acesso à Documentação Interativa

### Swagger UI
**URL:** `https://app-dev.pytake.net/api/v1/docs` ou `https://api-dev.pytake.net/api/v1/docs`

Interface interativa para testar todos os endpoints da API com documentação completa, exemplos de requests/responses e possibilidade de executar chamadas diretamente do navegador.

### ReDoc
**URL:** `https://app-dev.pytake.net/api/v1/redoc` ou `https://api-dev.pytake.net/api/v1/redoc`

Documentação alternativa em formato ReDoc com layout mais limpo e focado em leitura.

### OpenAPI JSON
**URL:** `https://app-dev.pytake.net/api/v1/openapi.json` ou `https://api-dev.pytake.net/api/v1/openapi.json`

Especificação OpenAPI 3.0 em formato JSON, utilizada pelo Swagger UI e outros clientes API.

---

## Resumo da API

- **Total de Endpoints:** 145+ rotas documentadas
- **Módulos Principais:** 20 módulos de endpoints
- **Arquitetura:** Backend-only (FastAPI + PostgreSQL + Redis + MongoDB)
- **Autenticação:** JWT Bearer Token
- **Multi-tenancy:** Dados escopados por organização
- **Rate Limiting:** Implementado em endpoints críticos
- **Webhooks:** Suporte para WhatsApp Meta Cloud API
- **WebSockets:** Conexões em tempo real
- **Documentação:** Auto-gerada via FastAPI + OpenAPI 3.0

### Principais Funcionalidades

1. **Autenticação e Autorização** - Registro, login, refresh tokens, RBAC
2. **Gerenciamento de Usuários** - CRUD completo com roles e permissões
3. **Contatos** - Gerenciamento com tags, bloqueio/desbloqueio, VIP
4. **Conversas** - Sistema completo de chat com SLA e atribuição
5. **WhatsApp** - Integração completa com Meta Cloud API e Evolution API
6. **Chatbots** - Construtor visual de flows e automações
7. **Campanhas** - Marketing automation com segmentação
8. **Analytics** - Métricas e relatórios abrangentes
9. **Flow Automations** - Automação de processos com agendamento
10. **Organizações** - Multi-tenancy com configurações por org

---

## Validação da Documentação

✅ **Backend Status:** Rodando (porta 8002)  
✅ **Nginx Status:** Configurado para backend-only  
✅ **Health Check:** Funcionando via nginx (https://app-dev.pytake.net/api/v1/health)  
✅ **Swagger UI:** Disponível via nginx (https://app-dev.pytake.net/api/v1/docs)  
✅ **OpenAPI JSON:** 145+ endpoints documentados  
✅ **Documentação Automática:** Gerada corretamente pelo FastAPI  

### URLs de Acesso:
- **API Base:** `https://app-dev.pytake.net` ou `https://api-dev.pytake.net`
- **Health Check:** `https://app-dev.pytake.net/api/v1/health`
- **Swagger UI:** `https://app-dev.pytake.net/api/v1/docs`
- **ReDoc:** `https://app-dev.pytake.net/api/v1/redoc`
- **OpenAPI JSON:** `https://app-dev.pytake.net/api/v1/openapi.json`

---

*Documentação gerada automaticamente baseada no código da API FastAPI*
*Última atualização: $(date)*
*Status: ✅ Validada e funcional*