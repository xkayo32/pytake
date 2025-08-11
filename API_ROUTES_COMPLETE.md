# PyTake - Lista Completa de Rotas da API
## Todas as 150+ Rotas Documentadas

---

## 1. AUTENTICAÇÃO (8 rotas)

### Login
```
POST /api/v1/auth/login
Body: {
  "email": "user@example.com",
  "password": "password123"
}
Response: {
  "token": "jwt_token",
  "refresh_token": "refresh_token",
  "user": {...}
}
```

### Registro
```
POST /api/v1/auth/register
Body: {
  "email": "user@example.com",
  "password": "password123",
  "name": "João Silva",
  "tenant_name": "Empresa XYZ"
}
```

### Refresh Token
```
POST /api/v1/auth/refresh
Body: {
  "refresh_token": "refresh_token"
}
```

### Logout
```
POST /api/v1/auth/logout
Headers: Authorization: Bearer {token}
```

### Perfil do Usuário
```
GET /api/v1/auth/me
Headers: Authorization: Bearer {token}
```

### Esqueci a Senha
```
POST /api/v1/auth/forgot-password
Body: {
  "email": "user@example.com"
}
```

### Resetar Senha
```
POST /api/v1/auth/reset-password
Body: {
  "token": "reset_token",
  "new_password": "newpassword123"
}
```

### Verificar Email
```
POST /api/v1/auth/verify-email
Body: {
  "token": "verification_token"
}
```

---

## 2. WHATSAPP CONFIG (10 rotas)

### Listar Configurações
```
GET /api/v1/whatsapp-configs
Query: ?page=1&limit=10&status=active
```

### Criar Configuração
```
POST /api/v1/whatsapp-configs
Body: {
  "name": "WhatsApp Principal",
  "phone_number": "+5511999999999",
  "api_type": "official",
  "access_token": "token"
}
```

### Obter Configuração
```
GET /api/v1/whatsapp-configs/{id}
```

### Atualizar Configuração
```
PUT /api/v1/whatsapp-configs/{id}
Body: {
  "name": "WhatsApp Atualizado",
  "is_active": true
}
```

### Deletar Configuração
```
DELETE /api/v1/whatsapp-configs/{id}
```

### Testar Configuração
```
POST /api/v1/whatsapp-configs/{id}/test
```

### Ativar Configuração
```
POST /api/v1/whatsapp-configs/{id}/activate
```

### Desativar Configuração
```
POST /api/v1/whatsapp-configs/{id}/deactivate
```

### Obter QR Code (Evolution API)
```
GET /api/v1/whatsapp-configs/{id}/qrcode
```

### Verificar Status
```
GET /api/v1/whatsapp-configs/{id}/status
```

---

## 3. MENSAGENS WHATSAPP (15 rotas)

### Enviar Mensagem de Texto
```
POST /api/v1/whatsapp/send
Body: {
  "to": "+5511999999999",
  "message": "Olá, tudo bem?"
}
```

### Enviar Template
```
POST /api/v1/whatsapp/send-template
Body: {
  "to": "+5511999999999",
  "template_name": "welcome_message",
  "language": "pt_BR",
  "parameters": ["João", "10%"]
}
```

### Enviar Mídia
```
POST /api/v1/whatsapp/send-media
Body: {
  "to": "+5511999999999",
  "type": "image",
  "media_url": "https://example.com/image.jpg",
  "caption": "Legenda da imagem"
}
```

### Enviar Áudio
```
POST /api/v1/whatsapp/send-audio
Body: {
  "to": "+5511999999999",
  "audio_url": "https://example.com/audio.mp3"
}
```

### Enviar Documento
```
POST /api/v1/whatsapp/send-document
Body: {
  "to": "+5511999999999",
  "document_url": "https://example.com/file.pdf",
  "filename": "contrato.pdf"
}
```

### Enviar Localização
```
POST /api/v1/whatsapp/send-location
Body: {
  "to": "+5511999999999",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "name": "São Paulo",
  "address": "São Paulo, SP, Brasil"
}
```

### Enviar Contato
```
POST /api/v1/whatsapp/send-contact
Body: {
  "to": "+5511999999999",
  "contact": {
    "name": "João Silva",
    "phone": "+5511888888888"
  }
}
```

### Enviar Botões
```
POST /api/v1/whatsapp/send-buttons
Body: {
  "to": "+5511999999999",
  "message": "Escolha uma opção:",
  "buttons": [
    {"id": "1", "title": "Opção 1"},
    {"id": "2", "title": "Opção 2"}
  ]
}
```

### Enviar Lista
```
POST /api/v1/whatsapp/send-list
Body: {
  "to": "+5511999999999",
  "title": "Menu",
  "body": "Escolha uma opção do menu",
  "button_text": "Ver opções",
  "sections": [...]
}
```

### Webhook Recebimento
```
POST /api/v1/whatsapp/webhook
GET /api/v1/whatsapp/webhook (verificação)
```

### Marcar como Lida
```
PUT /api/v1/whatsapp/messages/{id}/read
```

### Obter Histórico
```
GET /api/v1/whatsapp/messages?conversation_id={id}&page=1&limit=20
```

### Buscar Mensagens
```
GET /api/v1/whatsapp/messages/search?q=texto&from=2024-01-01
```

### Status da Mensagem
```
GET /api/v1/whatsapp/messages/{id}/status
```

### Reenviar Mensagem
```
POST /api/v1/whatsapp/messages/{id}/resend
```

---

## 4. CONVERSAS (12 rotas)

### Listar Conversas
```
GET /api/v1/conversations
Query: ?status=active&assigned_to=user_id&page=1&limit=20
```

### Obter Conversa
```
GET /api/v1/conversations/{id}
```

### Criar Conversa
```
POST /api/v1/conversations
Body: {
  "contact_phone": "+5511999999999",
  "contact_name": "João Silva"
}
```

### Atualizar Conversa
```
PUT /api/v1/conversations/{id}
Body: {
  "status": "resolved",
  "tags": ["vip", "suporte"]
}
```

### Arquivar Conversa
```
POST /api/v1/conversations/{id}/archive
```

### Reabrir Conversa
```
POST /api/v1/conversations/{id}/reopen
```

### Atribuir Agente
```
POST /api/v1/conversations/{id}/assign
Body: {
  "agent_id": "user_uuid"
}
```

### Transferir Conversa
```
POST /api/v1/conversations/{id}/transfer
Body: {
  "to_agent_id": "user_uuid",
  "reason": "Especialista técnico"
}
```

### Adicionar Tags
```
POST /api/v1/conversations/{id}/tags
Body: {
  "tags": ["urgente", "financeiro"]
}
```

### Adicionar Nota
```
POST /api/v1/conversations/{id}/notes
Body: {
  "note": "Cliente solicitou desconto"
}
```

### Exportar Conversa
```
GET /api/v1/conversations/{id}/export?format=pdf
```

### Estatísticas
```
GET /api/v1/conversations/stats?period=today
```

---

## 5. FLUXOS (15 rotas)

### Listar Fluxos
```
GET /api/v1/flows
Query: ?status=active&page=1&limit=10
```

### Criar Fluxo
```
POST /api/v1/flows
Body: {
  "name": "Atendimento Inicial",
  "trigger": "keyword",
  "trigger_value": "oi",
  "nodes": [...],
  "edges": [...]
}
```

### Obter Fluxo
```
GET /api/v1/flows/{id}
```

### Atualizar Fluxo
```
PUT /api/v1/flows/{id}
Body: {
  "name": "Fluxo Atualizado",
  "nodes": [...],
  "edges": [...]
}
```

### Deletar Fluxo
```
DELETE /api/v1/flows/{id}
```

### Publicar Fluxo
```
POST /api/v1/flows/{id}/publish
```

### Despublicar Fluxo
```
POST /api/v1/flows/{id}/unpublish
```

### Duplicar Fluxo
```
POST /api/v1/flows/{id}/duplicate
```

### Testar Fluxo
```
POST /api/v1/flows/{id}/test
Body: {
  "phone": "+5511999999999",
  "initial_message": "oi"
}
```

### Templates de Fluxo
```
GET /api/v1/flows/templates
```

### Importar Fluxo
```
POST /api/v1/flows/import
Body: {
  "flow_json": {...}
}
```

### Exportar Fluxo
```
GET /api/v1/flows/{id}/export
```

### Analytics do Fluxo
```
GET /api/v1/flows/{id}/analytics?period=month
```

### Sessões do Fluxo
```
GET /api/v1/flows/{id}/sessions
```

### Validar Fluxo
```
POST /api/v1/flows/validate
Body: {
  "nodes": [...],
  "edges": [...]
}
```

---

## 6. CAMPANHAS (12 rotas)

### Listar Campanhas
```
GET /api/v1/campaigns
Query: ?status=running&page=1&limit=10
```

### Criar Campanha
```
POST /api/v1/campaigns
Body: {
  "name": "Black Friday 2024",
  "type": "broadcast",
  "schedule": {...},
  "targeting": {...},
  "message": {...}
}
```

### Obter Campanha
```
GET /api/v1/campaigns/{id}
```

### Atualizar Campanha
```
PUT /api/v1/campaigns/{id}
```

### Deletar Campanha
```
DELETE /api/v1/campaigns/{id}
```

### Iniciar Campanha
```
POST /api/v1/campaigns/{id}/start
```

### Pausar Campanha
```
POST /api/v1/campaigns/{id}/pause
```

### Parar Campanha
```
POST /api/v1/campaigns/{id}/stop
```

### Testar Campanha
```
POST /api/v1/campaigns/{id}/test
Body: {
  "test_phones": ["+5511999999999"]
}
```

### Analytics da Campanha
```
GET /api/v1/campaigns/{id}/analytics
```

### Exportar Resultados
```
GET /api/v1/campaigns/{id}/export?format=csv
```

### Duplicar Campanha
```
POST /api/v1/campaigns/{id}/duplicate
```

---

## 7. CONTATOS (10 rotas)

### Listar Contatos
```
GET /api/v1/contacts
Query: ?tags=vip&page=1&limit=50
```

### Criar Contato
```
POST /api/v1/contacts
Body: {
  "phone": "+5511999999999",
  "name": "João Silva",
  "email": "joao@example.com",
  "tags": ["cliente", "vip"]
}
```

### Obter Contato
```
GET /api/v1/contacts/{id}
```

### Atualizar Contato
```
PUT /api/v1/contacts/{id}
```

### Deletar Contato
```
DELETE /api/v1/contacts/{id}
```

### Importar Contatos
```
POST /api/v1/contacts/import
Body: FormData com arquivo CSV/Excel
```

### Exportar Contatos
```
GET /api/v1/contacts/export?format=csv&tags=vip
```

### Adicionar Tags
```
POST /api/v1/contacts/{id}/tags
Body: {
  "tags": ["novo", "importante"]
}
```

### Remover Tags
```
DELETE /api/v1/contacts/{id}/tags
Body: {
  "tags": ["remover"]
}
```

### Buscar Contatos
```
GET /api/v1/contacts/search?q=joão&tags=vip
```

---

## 8. MULTI-TENANCY (8 rotas)

### Listar Tenants (Admin)
```
GET /api/v1/tenants
```

### Criar Tenant (Admin)
```
POST /api/v1/tenants
Body: {
  "name": "Empresa ABC",
  "domain": "abc.pytake.net",
  "plan": "growth"
}
```

### Obter Tenant
```
GET /api/v1/tenants/{id}
```

### Atualizar Tenant
```
PUT /api/v1/tenants/{id}
Body: {
  "name": "Empresa ABC Ltda",
  "settings": {...}
}
```

### Upgrade de Plano
```
POST /api/v1/tenants/{id}/upgrade
Body: {
  "plan": "enterprise"
}
```

### Suspender Tenant
```
POST /api/v1/tenants/{id}/suspend
Body: {
  "reason": "Pagamento pendente"
}
```

### Reativar Tenant
```
POST /api/v1/tenants/{id}/reactivate
```

### Deletar Tenant
```
DELETE /api/v1/tenants/{id}
```

---

## 9. ERP INTEGRATIONS (20 rotas)

### Conectar ERP
```
POST /api/v1/erp/connect/{erp_type}
Body: {
  "api_url": "https://erp.company.com",
  "api_key": "key",
  "api_secret": "secret"
}
```

### Status da Conexão
```
GET /api/v1/erp/{erp_type}/status
```

### Buscar Cliente
```
GET /api/v1/erp/{erp_type}/customers/{document}
```

### Listar Faturas
```
GET /api/v1/erp/{erp_type}/invoices?customer_id={id}
```

### Segunda Via Boleto
```
POST /api/v1/erp/{erp_type}/invoices/{id}/duplicate
```

### Status de Conexão Internet
```
GET /api/v1/erp/{erp_type}/connection-status/{customer_id}
```

### Criar Chamado
```
POST /api/v1/erp/{erp_type}/tickets
Body: {
  "customer_id": "123",
  "type": "technical",
  "description": "Internet lenta"
}
```

### Listar Chamados
```
GET /api/v1/erp/{erp_type}/tickets?customer_id={id}
```

### Atualizar Chamado
```
PUT /api/v1/erp/{erp_type}/tickets/{id}
```

### Listar Planos
```
GET /api/v1/erp/{erp_type}/plans
```

### Mudar Plano
```
POST /api/v1/erp/{erp_type}/customers/{id}/change-plan
Body: {
  "plan_id": "plan_100mb"
}
```

### Desbloquear Cliente
```
POST /api/v1/erp/{erp_type}/customers/{id}/unblock
```

### Sincronizar Dados
```
POST /api/v1/erp/{erp_type}/sync
```

### Webhook ERP
```
POST /api/v1/erp/{erp_type}/webhook
```

### Logs de Integração
```
GET /api/v1/erp/{erp_type}/logs
```

### Configurações ERP
```
GET /api/v1/erp/{erp_type}/settings
PUT /api/v1/erp/{erp_type}/settings
```

### Testar Conexão
```
POST /api/v1/erp/{erp_type}/test
```

### Desconectar ERP
```
DELETE /api/v1/erp/{erp_type}/disconnect
```

### Métricas ERP
```
GET /api/v1/erp/metrics
```

---

## 10. AI ASSISTANT (10 rotas)

### Chat com IA
```
POST /api/v1/ai/chat
Body: {
  "message": "Como posso ajudar?",
  "context": {...},
  "model": "gpt-4"
}
```

### Analisar Sentimento
```
POST /api/v1/ai/analyze-sentiment
Body: {
  "text": "Estou muito satisfeito com o atendimento"
}
```

### Classificar Intenção
```
POST /api/v1/ai/classify-intent
Body: {
  "message": "Quero cancelar minha assinatura"
}
```

### Resumir Conversa
```
POST /api/v1/ai/summarize
Body: {
  "conversation_id": "uuid"
}
```

### Sugerir Resposta
```
POST /api/v1/ai/suggest-response
Body: {
  "conversation_id": "uuid",
  "last_message": "Qual o status do meu pedido?"
}
```

### Traduzir Mensagem
```
POST /api/v1/ai/translate
Body: {
  "text": "Hello, how are you?",
  "target_language": "pt"
}
```

### Extrair Entidades
```
POST /api/v1/ai/extract-entities
Body: {
  "text": "Meu CPF é 123.456.789-00 e meu email é joao@example.com"
}
```

### Gerar Template
```
POST /api/v1/ai/generate-template
Body: {
  "purpose": "welcome_message",
  "tone": "formal"
}
```

### Configurações AI
```
GET /api/v1/ai/settings
PUT /api/v1/ai/settings
```

### Prompts Customizados
```
GET /api/v1/ai/prompts
POST /api/v1/ai/prompts
PUT /api/v1/ai/prompts/{id}
DELETE /api/v1/ai/prompts/{id}
```

---

## 11. DASHBOARD (10 rotas)

### Overview
```
GET /api/v1/dashboard/overview
Query: ?period=today
```

### Métricas
```
GET /api/v1/dashboard/metrics
Query: ?metrics=messages,conversations&period=week
```

### Gráficos
```
GET /api/v1/dashboard/charts/{metric}
Query: ?period=month&interval=daily
```

### Agentes Online
```
GET /api/v1/dashboard/agents
```

### Conversas Ativas
```
GET /api/v1/dashboard/conversations/active
```

### Fila de Atendimento
```
GET /api/v1/dashboard/queue
```

### Alertas
```
GET /api/v1/dashboard/alerts
```

### Widgets
```
GET /api/v1/dashboard/widgets
POST /api/v1/dashboard/widgets
PUT /api/v1/dashboard/widgets/{id}
DELETE /api/v1/dashboard/widgets/{id}
```

### Exportar Dashboard
```
POST /api/v1/dashboard/export
Body: {
  "format": "pdf",
  "period": "month"
}
```

### KPIs
```
GET /api/v1/dashboard/kpis
```

---

## 12. WEBHOOKS (8 rotas)

### Listar Webhooks
```
GET /api/v1/webhooks
```

### Criar Webhook
```
POST /api/v1/webhooks
Body: {
  "url": "https://example.com/webhook",
  "events": ["message.received", "message.sent"],
  "secret": "webhook_secret"
}
```

### Obter Webhook
```
GET /api/v1/webhooks/{id}
```

### Atualizar Webhook
```
PUT /api/v1/webhooks/{id}
```

### Deletar Webhook
```
DELETE /api/v1/webhooks/{id}
```

### Testar Webhook
```
POST /api/v1/webhooks/{id}/test
```

### Logs de Webhook
```
GET /api/v1/webhooks/{id}/logs
```

### Reenviar Evento
```
POST /api/v1/webhooks/{id}/retry
Body: {
  "event_id": "event_uuid"
}
```

---

## 13. USUÁRIOS E PERMISSÕES (10 rotas)

### Listar Usuários
```
GET /api/v1/users
```

### Criar Usuário
```
POST /api/v1/users
Body: {
  "email": "novo@example.com",
  "name": "Novo Usuário",
  "role": "agent"
}
```

### Obter Usuário
```
GET /api/v1/users/{id}
```

### Atualizar Usuário
```
PUT /api/v1/users/{id}
```

### Deletar Usuário
```
DELETE /api/v1/users/{id}
```

### Alterar Senha
```
POST /api/v1/users/{id}/change-password
Body: {
  "current_password": "old",
  "new_password": "new"
}
```

### Listar Roles
```
GET /api/v1/roles
```

### Permissões do Usuário
```
GET /api/v1/users/{id}/permissions
```

### Atualizar Permissões
```
PUT /api/v1/users/{id}/permissions
Body: {
  "permissions": ["read:messages", "write:messages"]
}
```

### Atividade do Usuário
```
GET /api/v1/users/{id}/activity
```

---

## 14. LGPD/GDPR (8 rotas)

### Registrar Consentimento
```
POST /api/v1/privacy/consent
Body: {
  "user_id": "uuid",
  "purpose": "marketing",
  "granted": true
}
```

### Obter Consentimentos
```
GET /api/v1/privacy/consent/{user_id}
```

### Revogar Consentimento
```
DELETE /api/v1/privacy/consent/{id}
```

### Exportar Dados
```
POST /api/v1/privacy/data/{user_id}/export
```

### Deletar Dados
```
DELETE /api/v1/privacy/data/{user_id}
```

### Anonimizar Dados
```
POST /api/v1/privacy/data/{user_id}/anonymize
```

### Logs de Auditoria
```
GET /api/v1/privacy/audit/{user_id}
```

### Status de Compliance
```
GET /api/v1/privacy/compliance/status
```

---

## 15. OBSERVABILITY (6 rotas)

### Métricas Prometheus
```
GET /observability/metrics
```

### Health Check
```
GET /observability/health
```

### Readiness Probe
```
GET /observability/ready
```

### Liveness Probe
```
GET /observability/live
```

### Traces
```
GET /observability/traces
```

### Logs
```
GET /observability/logs?level=error&service=backend
```

---

## 16. GRAPHQL (2 endpoints principais)

### GraphQL Endpoint
```
POST /graphql
Body: {
  "query": "{ users { id name email } }",
  "variables": {}
}
```

### GraphQL Playground
```
GET /graphql/playground
```

---

## 17. WEBSOCKET (1 endpoint)

### WebSocket Connection
```
WS /ws
Headers: Authorization: Bearer {token}

Mensagens:
// Subscribe
{
  "type": "subscribe",
  "channels": ["messages", "conversations"]
}

// Unsubscribe
{
  "type": "unsubscribe",
  "channels": ["messages"]
}

// Ping
{
  "type": "ping"
}
```

---

## TOTAL: 150+ ROTAS

Esta documentação contém todas as rotas necessárias para o sistema PyTake completo. Cada rota deve ser implementada com:
- Validação de entrada
- Autenticação/Autorização
- Rate limiting
- Logs de auditoria
- Tratamento de erros
- Documentação OpenAPI

**Prioridade de Implementação:**
1. Core: Auth, WhatsApp básico, Mensagens
2. Essencial: Conversas, Contatos, Dashboard
3. Avançado: Flows, Campanhas, AI
4. Enterprise: Multi-tenancy, ERP, LGPD