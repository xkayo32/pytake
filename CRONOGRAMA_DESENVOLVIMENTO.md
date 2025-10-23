# Cronograma de Desenvolvimento PyTake
## Planejamento Completo - Outubro a Março 2026

**Data de Criação:** 23 de Outubro de 2025
**Versão:** v1.0
**Status Atual:** 75% completo
**Meta:** 95% completo em 6 meses

---

## 📊 Resumo Executivo

### Estado Atual
- ✅ Backend: 75% completo (13/15 endpoints)
- ✅ Frontend Admin: 90% completo (19/22 páginas)
- ⚠️ Frontend Agent: 50% completo (4/8 páginas)
- ❌ Testes: 0% coverage
- ⚠️ Mobile: Navegação não funcional

### Esforço Total Estimado
- **Total:** ~120 dias de desenvolvimento
- **Timeline:** 6 meses (com equipe de 2-3 devs)
- **Sprints:** 12 sprints de 2 semanas

---

## 🎯 FASE 1: CRÍTICO (Semanas 1-4) 🔴

### Sprint 1 - Hotfixes Backend (Semana 1)

**Objetivo:** Habilitar endpoints desabilitados e corrigir gaps críticos

#### Segunda-feira (Dia 1)
**Tarefa 1.1: Habilitar Secrets Endpoint** ⚡ RÁPIDO
- [ ] Descomentar linha 169 em `backend/app/api/v1/router.py`
- [ ] Testar CRUD via Postman/Thunder Client
- [ ] Validar encryption (Fernet + AES-256)
- [ ] Testar integração com frontend `/admin/secrets`
- **Tempo:** 2 horas
- **Commit:** `fix: habilita Secrets endpoint para gerenciamento de API keys`

**Tarefa 1.2: Habilitar Database Query Endpoint** ⚡ RÁPIDO
- [ ] Descomentar linha 170 em `backend/app/api/v1/router.py`
- [ ] Revisar `DatabaseService` para SQL injection protection
- [ ] Adicionar validação: whitelist de queries perigosas
- [ ] Testar com PostgreSQL, MySQL, MongoDB, SQLite
- [ ] Validar Database Query Node no chatbot builder
- **Tempo:** 3 horas
- **Commit:** `fix: habilita Database Query endpoint com proteção SQL injection`

**Tarefa 1.3: Rate Limiting Global** 🔒
- [ ] Instalar `slowapi`: `pip install slowapi`
- [ ] Configurar limiter em `backend/app/main.py`
- [ ] Aplicar rate limits:
  - `/auth/login`: 5 tentativas/minuto
  - `/auth/register`: 3 tentativas/hora
  - WhatsApp send: 100 msg/min/org
  - Chatbot execution: 50 exec/min/bot
  - API global: 1000 req/min/org
- [ ] Armazenar counters no Redis
- [ ] Adicionar headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`
- [ ] Testar com `ab` (Apache Bench)
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona rate limiting com Redis em endpoints críticos`

#### Terça-feira a Sexta-feira (Dias 2-5)
**Tarefa 1.4: Campaign Execution Engine** 🚀 COMPLEXO
- [ ] **Dia 2:** Criar Celery task `backend/app/tasks/campaign_tasks.py`
  - [ ] `execute_campaign(campaign_id)` - Main task
  - [ ] `process_batch(campaign_id, contact_ids)` - Batch processor
  - [ ] `send_campaign_message(campaign_id, contact_id)` - Individual send
- [ ] **Dia 3:** Batch Processing Logic
  - [ ] Dividir contatos em lotes de 100
  - [ ] Implementar rate limiting por WhatsApp number
    - API Oficial: 500 mensagens/dia
    - QR Code: Ilimitado (com delay 500ms entre envios)
  - [ ] Progress tracking: atualizar `campaign.sent_count`
- [ ] **Dia 4:** Retry Logic
  - [ ] 3 tentativas com exponential backoff (1s, 4s, 16s)
  - [ ] Salvar erros em `campaign.errors` (JSONB)
  - [ ] Status por mensagem: sent, delivered, read, failed
- [ ] **Dia 5:** Webhook Integration
  - [ ] Processar Meta webhooks: `message_status`
  - [ ] Atualizar estatísticas em tempo real
  - [ ] Frontend: progress bar ao vivo
  - [ ] Testar campanha real (100 contatos de teste)
- **Tempo:** 4 dias
- **Commits:**
  - `feat: adiciona Celery task para execução de campanhas`
  - `feat: implementa batch processing com rate limiting`
  - `feat: adiciona retry logic e tracking de erros`
  - `feat: integra webhooks para status de campanha em tempo real`

**Esforço Total Sprint 1:** 5 dias
**Prioridade:** 🔴 Crítico
**Impacto:** Resolve 3 gaps críticos do backend

---

### Sprint 2 - Mobile & UX (Semana 2)

**Objetivo:** Tornar sistema usável em mobile

#### Segunda-feira a Terça-feira (Dias 1-2)
**Tarefa 2.1: Mobile Navigation** 📱
- [ ] **Dia 1 Manhã:** Criar `MobileNav` component
  - [ ] Hamburger icon (três linhas)
  - [ ] Drawer lateral (slide from left)
  - [ ] Close on outside click
  - [ ] Close on navigation
  - [ ] Usar Radix UI Dialog
- [ ] **Dia 1 Tarde:** Adaptar AdminSidebar
  - [ ] Desktop: sidebar fixa (lg:block)
  - [ ] Mobile: drawer com MobileNav (lg:hidden)
  - [ ] Toggle state com Zustand
- [ ] **Dia 2 Manhã:** Adaptar AgentSidebar
  - [ ] Mesma lógica do AdminSidebar
  - [ ] Tema verde mantido
- [ ] **Dia 2 Tarde:** Responsive Tables
  - [ ] Wrap tables em `<div className="overflow-x-auto">`
  - [ ] Scroll horizontal em mobile
  - [ ] Cards alternativos para telas < 640px
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona MobileNav component com drawer lateral`
  - `feat: torna sidebars responsivas com hamburger menu`
  - `feat: adiciona scroll horizontal em tabelas mobile`

#### Quarta-feira (Dia 3)
**Tarefa 2.2: Notification Toasts** 🔔
- [ ] Instalar `sonner`: `npm install sonner`
- [ ] Configurar `<Toaster />` em `app/layout.tsx`
- [ ] Criar `lib/toast.ts` com wrappers:
  - `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`
- [ ] Substituir `alert()` por toasts em:
  - Formulários (sucesso/erro)
  - Actions (assign, transfer, close)
  - Campaign start/pause
  - WhatsApp connect/disconnect
- [ ] Adicionar actions inline:
  - Erro de rede → "Retry" button
  - Sucesso → "View" link
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona sistema de notificações toast com Sonner`

#### Quinta-feira a Sexta-feira (Dias 4-5)
**Tarefa 2.3: Loading States Avançados** ⏳
- [ ] **Dia 4:** Skeleton Screens
  - [ ] Criar `SkeletonCard`, `SkeletonTable`, `SkeletonList`
  - [ ] Aplicar em todas as páginas com loading
  - [ ] Usar `react-loading-skeleton`
- [ ] **Dia 5:** Progress Indicators
  - [ ] Upload de arquivos: progress bar
  - [ ] Campaigns: progress bar ao vivo
  - [ ] Bulk operations: spinner + percentage
  - [ ] Optimistic updates: instant feedback (reverter on error)
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona skeleton screens para loading states`
  - `feat: implementa progress indicators para operações longas`

**Esforço Total Sprint 2:** 5 dias
**Prioridade:** 🔴 Crítico
**Impacto:** Sistema usável em mobile + UX profissional

---

### Sprint 3 - Agent Panel Completo (Semana 3)

**Objetivo:** Completar todas as páginas do Agent Panel

#### Segunda-feira (Dia 1)
**Tarefa 3.1: Agent History Page** 📜
- [ ] Criar `frontend/src/app/agent/history/page.tsx`
- [ ] Lista de conversas encerradas (status: closed)
- [ ] Filtros:
  - Data range (hoje, 7d, 30d, 90d)
  - Minhas conversas / Todas
  - Busca por nome/telefone
- [ ] Ordenação: closed_at DESC
- [ ] Link para detalhes (read-only)
- [ ] Paginação (20 por página)
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona Agent History page com conversas encerradas`

#### Terça-feira (Dia 2)
**Tarefa 3.2: Agent Completed Page** ✅
- [ ] Criar `frontend/src/app/agent/completed/page.tsx`
- [ ] Similar ao History, mas apenas conversas resolvidas pelo agente
- [ ] Filtro extra: `assigned_agent_id = current_user.id`
- [ ] Stats card: total completadas, média de tempo, rating médio
- [ ] Badge: "Resolvido" vs "Transferido"
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona Agent Completed page para conversas finalizadas`

#### Quarta-feira a Quinta-feira (Dias 3-4)
**Tarefa 3.3: Agent Profile Page** 👤
- [ ] **Dia 3:** Criar `frontend/src/app/agent/profile/page.tsx`
  - [ ] Seção: Informações Pessoais
    - Nome, email, telefone
    - Avatar upload (opcional)
    - Edit inline
  - [ ] Seção: Senha
    - Formulário: senha atual, nova senha, confirmar
    - Validação: min 8 chars, uppercase, number
  - [ ] Seção: Skills
    - SkillsEditor component (já existe)
    - Adicionar/remover skills
    - Badge visual por skill
- [ ] **Dia 4:** Backend Integration
  - [ ] Endpoint: `PUT /api/v1/users/me` (atualizar próprio perfil)
  - [ ] Endpoint: `PUT /api/v1/users/me/password` (trocar senha)
  - [ ] Upload avatar: salvar em S3 ou filesystem
  - [ ] Validações server-side
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona Agent Profile page com edição de dados`
  - `feat: permite agente trocar senha e atualizar skills`

#### Sexta-feira (Dia 5)
**Tarefa 3.4: Agent Stats Page** 📊
- [ ] Criar `frontend/src/app/agent/stats/page.tsx`
- [ ] Métricas principais (cards):
  - Total de conversas atendidas
  - Tempo médio de resposta
  - Tempo médio de resolução
  - Taxa de resolução (%)
  - CSAT médio
- [ ] Gráficos (Recharts):
  - Conversas por dia (últimos 30 dias) - Line chart
  - Performance semanal - Bar chart
  - Distribuição por status - Pie chart
- [ ] PeriodSelector: 7d, 30d, 90d
- [ ] Comparação com média da equipe
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona Agent Stats page com métricas detalhadas`

**Esforço Total Sprint 3:** 5 dias
**Prioridade:** 🔴 Crítico
**Impacto:** Agent Panel 100% funcional (8/8 páginas)

---

### Sprint 4 - WhatsApp Templates Sync (Semana 4)

**Objetivo:** Sincronizar templates com Meta Cloud API

#### Segunda-feira a Terça-feira (Dias 1-2)
**Tarefa 4.1: Meta API Template Sync** 📝
- [ ] **Dia 1:** Implementar `meta_api.py` methods
  - [ ] `create_template()` - POST /message_templates
  - [ ] `get_template_status()` - GET /message_templates/{id}
  - [ ] `delete_template()` - DELETE /message_templates/{id}
  - [ ] Payload format: name, language, category, components
- [ ] **Dia 2:** Atualizar `TemplateService`
  - [ ] `sync_to_meta()` - envia template para aprovação
  - [ ] `update_status()` - atualiza status local
  - [ ] Status enum: PENDING, APPROVED, REJECTED, DISABLED
  - [ ] Salvar rejection_reason se rejeitado
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona sync de templates com Meta Cloud API`
  - `feat: implementa tracking de status de aprovação`

#### Quarta-feira (Dia 3)
**Tarefa 4.2: Webhook Template Status** 🔔
- [ ] Endpoint: `POST /api/v1/whatsapp/webhooks/template_status`
- [ ] Processar evento: `message_template_status_update`
- [ ] Atualizar status no banco de dados
- [ ] Notificar admin via toast (WebSocket)
- [ ] Log no MongoDB
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona webhook para status de template`

#### Quinta-feira a Sexta-feira (Dias 4-5)
**Tarefa 4.3: Frontend Template Manager** 🎨
- [ ] **Dia 4:** Atualizar `/admin/whatsapp/templates`
  - [ ] Status badges: PENDING (amarelo), APPROVED (verde), REJECTED (vermelho)
  - [ ] Botão "Enviar para Aprovação" (apenas draft)
  - [ ] Modal com rejection reason (se rejeitado)
  - [ ] Filtro por status
- [ ] **Dia 5:** Template Gallery
  - [ ] Pré-visualização de templates aprovados
  - [ ] Usar em Campaign creation
  - [ ] Usar em Chatbot WhatsApp Template Node
  - [ ] Auto-refresh status a cada 30s
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona status tracking de templates no frontend`
  - `feat: implementa template gallery com pré-visualização`

**Esforço Total Sprint 4:** 5 dias
**Prioridade:** 🟡 Importante
**Impacto:** Templates totalmente funcionais com Meta API

---

## 🎯 FASE 2: IMPORTANTE (Semanas 5-8) 🟡

### Sprint 5 - Performance Backend (Semanas 5-6)

**Objetivo:** Otimizar queries e adicionar caching

#### Semana 5

**Tarefa 5.1: Database Query Optimization** ⚡
- [ ] **Dia 1-2:** Identificar N+1 queries
  - [ ] Usar SQL logging: `echo=True` em engine
  - [ ] Listar todos os N+1 encontrados
  - [ ] Priorizar por frequência de uso
- [ ] **Dia 3-4:** Aplicar joinedload/selectinload
  - [ ] ConversationService: `joinedload(Conversation.contact)`
  - [ ] ConversationService: `joinedload(Conversation.assigned_agent)`
  - [ ] QueueService: `selectinload(Queue.conversations)`
  - [ ] UserService: `selectinload(User.skills)`
- [ ] **Dia 5:** Adicionar indexes
  ```sql
  CREATE INDEX idx_conversations_assigned_agent_id ON conversations(assigned_agent_id);
  CREATE INDEX idx_conversations_queue_id ON conversations(queue_id);
  CREATE INDEX idx_conversations_organization_id_status ON conversations(organization_id, status);
  CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
  CREATE INDEX idx_contacts_organization_id ON contacts(organization_id);
  CREATE INDEX idx_contacts_whatsapp_id ON contacts(whatsapp_id);
  ```
- [ ] Criar migration: `alembic revision -m "add_performance_indexes"`
- [ ] Testar com `EXPLAIN ANALYZE`
- **Tempo:** 5 dias
- **Commits:**
  - `perf: corrige N+1 queries com joinedload/selectinload`
  - `perf: adiciona indexes para foreign keys e filtros frequentes`

#### Semana 6

**Tarefa 5.2: Redis Caching** 🗄️
- [ ] **Dia 1:** Setup cache infrastructure
  - [ ] Criar `backend/app/core/cache.py`
  - [ ] Wrapper para `aioredis`
  - [ ] Decorador `@cached(ttl=300)`
- [ ] **Dia 2-3:** Implementar cache em services
  - [ ] User sessions: TTL 15min
  - [ ] Organization settings: TTL 1h
  - [ ] WhatsApp numbers: TTL 30min
  - [ ] Queue stats: TTL 1min
  - [ ] Chatbot flows: TTL 5min
- [ ] **Dia 4:** Cache invalidation
  - [ ] Pattern: `org:{org_id}:entity:{entity_id}`
  - [ ] Invalidar on update/delete
  - [ ] Flush on organization changes
- [ ] **Dia 5:** Testar performance
  - [ ] Benchmark com `locust`
  - [ ] Comparar antes/depois
  - [ ] Target: 80% redução em queries repetidas
- **Tempo:** 5 dias
- **Commits:**
  - `feat: adiciona Redis caching infrastructure`
  - `feat: implementa cache em services críticos`
  - `feat: adiciona cache invalidation automática`

**Esforço Total Sprint 5:** 10 dias
**Prioridade:** 🟡 Importante
**Impacto:** 50-70% redução no tempo de resposta

---

### Sprint 6 - Analytics Avançado (Semana 7)

**Objetivo:** Implementar analytics completo com gráficos

#### Segunda-feira a Quarta-feira (Dias 1-3)
**Tarefa 6.1: MongoDB Aggregations** 📊
- [ ] **Dia 1:** Criar indexes MongoDB
  ```javascript
  db.messages.createIndex({ organization_id: 1, created_at: -1 })
  db.messages.createIndex({ conversation_id: 1, timestamp: 1 })
  db.analytics_events.createIndex({ agent_id: 1, date: -1 })
  ```
- [ ] **Dia 2:** Implementar aggregation pipelines
  - [ ] Conversas por dia: `$match → $group → $sort`
  - [ ] Performance por agente: `$lookup → $group`
  - [ ] Distribuição por status: `$group → $count`
  - [ ] Tempo médio por fila: `$group → $avg`
- [ ] **Dia 3:** Pre-compute métricas diárias
  - [ ] Celery task: `compute_daily_analytics`
  - [ ] Salvar em collection: `daily_stats`
  - [ ] Rodar diariamente às 00:00 UTC
- **Tempo:** 3 dias
- **Commits:**
  - `perf: adiciona indexes MongoDB para analytics`
  - `feat: implementa aggregation pipelines otimizadas`
  - `feat: adiciona pre-compute de métricas diárias`

#### Quinta-feira a Sexta-feira (Dias 4-5)
**Tarefa 6.2: Frontend Analytics Dashboard** 📈
- [ ] **Dia 4:** Instalar Recharts
  - [ ] `npm install recharts`
  - [ ] Criar components base:
    - `LineChartCard.tsx` - Tendências temporais
    - `BarChartCard.tsx` - Comparações
    - `PieChartCard.tsx` - Distribuições
    - `AreaChartCard.tsx` - Volume over time
- [ ] **Dia 5:** Atualizar `/admin/analytics`
  - [ ] Seção: Overview (4 KPIs principais)
  - [ ] Seção: Conversas (LineChart - últimos 30 dias)
  - [ ] Seção: Agentes (BarChart - comparação)
  - [ ] Seção: Filas (PieChart - distribuição)
  - [ ] Seção: Chatbots (AreaChart - execuções)
  - [ ] PeriodSelector: 7d, 30d, 90d, 6m, 1y
  - [ ] ExportButton: PDF, Excel, CSV
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona componentes Recharts para gráficos`
  - `feat: implementa Analytics Dashboard completo com visualizações`

**Esforço Total Sprint 6:** 5 dias
**Prioridade:** 🟡 Importante
**Impacto:** Analytics profissional e visual

---

### Sprint 7 - Segurança (Semana 8)

**Objetivo:** Hardening de segurança

#### Segunda-feira a Terça-feira (Dias 1-2)
**Tarefa 7.1: Input Validation Avançada** 🔒
- [ ] **Dia 1:** SQL Injection Protection
  - [ ] Sanitize inputs em Database Query Node
  - [ ] Whitelist de queries perigosas: DROP, DELETE, TRUNCATE
  - [ ] Usar parameterized queries sempre
  - [ ] Adicionar testes de SQL injection
- [ ] **Dia 2:** XSS Protection
  - [ ] Instalar `bleach`: `pip install bleach`
  - [ ] Sanitizar HTML em mensagens
  - [ ] Content Security Policy headers
  - [ ] Escape user-generated content
- **Tempo:** 2 dias
- **Commits:**
  - `security: adiciona proteção SQL injection em Database Query Node`
  - `security: implementa XSS protection e CSP headers`

#### Quarta-feira (Dia 3)
**Tarefa 7.2: File Upload Security** 📎
- [ ] Validação de MIME types
  - Whitelist: `image/*`, `video/mp4`, `audio/*`, `application/pdf`
- [ ] Max file size:
  - Imagens: 10MB
  - Vídeos: 50MB
  - Documentos: 20MB
- [ ] Scan for malware (ClamAV optional)
- [ ] Rename files: UUID + extension
- [ ] Salvar metadata em DB
- **Tempo:** 1 dia
- **Commit:** `security: adiciona validação robusta de uploads`

#### Quinta-feira a Sexta-feira (Dias 4-5)
**Tarefa 7.3: HTTPS & Headers** 🔐
- [ ] **Dia 4:** Nginx SSL
  - [ ] Certificado Let's Encrypt (certbot)
  - [ ] HSTS header: `max-age=31536000`
  - [ ] Redirect HTTP → HTTPS
  - [ ] Fix mixed content warnings
- [ ] **Dia 5:** Security Headers
  ```nginx
  add_header X-Frame-Options "SAMEORIGIN";
  add_header X-Content-Type-Options "nosniff";
  add_header X-XSS-Protection "1; mode=block";
  add_header Referrer-Policy "strict-origin-when-cross-origin";
  ```
- [ ] Testar com: securityheaders.com
- **Tempo:** 2 dias
- **Commits:**
  - `security: configura SSL/TLS com Let's Encrypt`
  - `security: adiciona security headers no Nginx`

**Esforço Total Sprint 7:** 5 dias
**Prioridade:** 🟡 Importante
**Impacto:** Sistema hardened e seguro

---

## 🎯 FASE 3: QUALIDADE (Semanas 9-12) 🧪

### Sprint 8-9 - Testes Backend (Semanas 9-10)

**Objetivo:** 80% coverage backend

#### Semana 9 - Unit Tests

**Tarefa 8.1: Setup Testing Infrastructure** 🧪
- [ ] **Dia 1:** Setup pytest
  - [ ] Criar `backend/tests/conftest.py`
  - [ ] Fixtures: `db_session`, `client`, `auth_headers`
  - [ ] Test database: SQLite in-memory
  - [ ] Criar `pytest.ini`
  ```ini
  [pytest]
  testpaths = tests
  python_files = test_*.py
  python_classes = Test*
  python_functions = test_*
  asyncio_mode = auto
  ```
- [ ] Instalar deps: `pytest-asyncio`, `pytest-cov`, `httpx`
- **Tempo:** 1 dia
- **Commit:** `test: configura infraestrutura de testes com pytest`

**Tarefa 8.2: Service Layer Tests** 🧪
- [ ] **Dia 2:** ConversationService (20 tests)
  - [ ] `test_create_conversation`
  - [ ] `test_assign_to_agent`
  - [ ] `test_transfer_to_department`
  - [ ] `test_close_conversation`
  - [ ] `test_pull_from_queue`
  - [ ] `test_overflow_to_secondary_queue`
  - [ ] `test_agent_restrictions`
- [ ] **Dia 3:** QueueService (15 tests)
  - [ ] `test_create_queue`
  - [ ] `test_get_metrics`
  - [ ] `test_overflow_logic`
  - [ ] `test_allowed_agents_filter`
- [ ] **Dia 4:** WhatsAppService (15 tests)
  - [ ] `test_send_text_message`
  - [ ] `test_send_media`
  - [ ] `test_webhook_validation`
  - [ ] `test_flow_executor`
- [ ] **Dia 5:** ChatbotService (15 tests)
  - [ ] `test_create_flow`
  - [ ] `test_validate_flow`
  - [ ] `test_execute_node_message`
  - [ ] `test_execute_node_condition`
- **Tempo:** 4 dias
- **Commits:** 1 por dia
  - `test: adiciona unit tests para ConversationService (20 tests)`
  - `test: adiciona unit tests para QueueService (15 tests)`
  - `test: adiciona unit tests para WhatsAppService (15 tests)`
  - `test: adiciona unit tests para ChatbotService (15 tests)`

**Esforço Semana 9:** 5 dias (65 tests)

#### Semana 10 - Integration Tests

**Tarefa 8.3: API Endpoint Tests** 🧪
- [ ] **Dia 1:** Auth endpoints (8 tests)
  - [ ] `test_login_success`
  - [ ] `test_login_invalid_credentials`
  - [ ] `test_register`
  - [ ] `test_refresh_token`
- [ ] **Dia 2:** Conversations (12 tests)
  - [ ] `test_list_conversations`
  - [ ] `test_create_conversation`
  - [ ] `test_send_message`
  - [ ] `test_assign_conversation`
- [ ] **Dia 3:** Queues (10 tests)
  - [ ] `test_create_queue`
  - [ ] `test_pull_from_queue`
  - [ ] `test_get_metrics`
- [ ] **Dia 4:** Chatbots (12 tests)
  - [ ] `test_create_chatbot`
  - [ ] `test_create_flow`
  - [ ] `test_export_import_flow`
- [ ] **Dia 5:** Campaigns (8 tests)
  - [ ] `test_create_campaign`
  - [ ] `test_start_campaign`
  - [ ] `test_pause_resume`
- **Tempo:** 5 dias
- **Commits:** 1 por dia (50 tests)

**Esforço Semana 10:** 5 dias (50 tests)

**Esforço Total Sprint 8-9:** 10 dias (115 tests)
**Target Coverage:** 80%
**Prioridade:** 🔴 Crítico
**Impacto:** Confiabilidade e regressão prevention

---

### Sprint 10 - Testes Frontend (Semana 11)

**Objetivo:** Testar componentes críticos

#### Segunda-feira (Dia 1)
**Tarefa 10.1: Setup Jest + RTL** 🧪
- [ ] Instalar deps:
  ```bash
  npm install -D jest @testing-library/react @testing-library/jest-dom @testing-library/user-event jest-environment-jsdom
  ```
- [ ] Criar `jest.config.js`
- [ ] Criar `jest.setup.js`
- [ ] Configurar Next.js para Jest
- **Tempo:** 1 dia
- **Commit:** `test: configura Jest e React Testing Library`

#### Terça-feira a Sexta-feira (Dias 2-5)
**Tarefa 10.2: Component Tests** 🧪
- [ ] **Dia 2:** Chat components (8 tests)
  - [ ] `MessageInput.test.tsx`
  - [ ] `MessageList.test.tsx`
  - [ ] `ConversationItem.test.tsx`
- [ ] **Dia 3:** Admin components (8 tests)
  - [ ] `StatsCard.test.tsx`
  - [ ] `EmptyState.test.tsx`
  - [ ] `QueueMetricsCard.test.tsx`
- [ ] **Dia 4:** Forms (6 tests)
  - [ ] `DepartmentModal.test.tsx`
  - [ ] `QueueModal.test.tsx`
- [ ] **Dia 5:** Hooks (6 tests)
  - [ ] `useAuth.test.tsx`
  - [ ] `useWebSocket.test.tsx`
- **Tempo:** 4 dias
- **Commits:** 1 por dia (28 tests)

**Esforço Total Sprint 10:** 5 dias (28 tests)
**Prioridade:** 🟡 Importante
**Impacto:** Componentes críticos testados

---

### Sprint 11 - E2E Tests (Semana 12)

**Objetivo:** Fluxos principais testados end-to-end

#### Segunda-feira (Dia 1)
**Tarefa 11.1: Setup Playwright** 🎭
- [ ] Instalar: `npm install -D @playwright/test`
- [ ] Criar `playwright.config.ts`
- [ ] Setup browsers: chromium, firefox, webkit
- [ ] Criar fixtures: `login`, `createChatbot`
- **Tempo:** 1 dia
- **Commit:** `test: configura Playwright para E2E tests`

#### Terça-feira a Sexta-feira (Dias 2-5)
**Tarefa 11.2: E2E Test Suites** 🧪
- [ ] **Dia 2:** Admin flows (4 tests)
  - [ ] Login → Dashboard → Logout
  - [ ] Criar chatbot → Builder → Save
  - [ ] Criar campanha → Executar
  - [ ] Configurar fila → Overflow
- [ ] **Dia 3:** Agent flows (4 tests)
  - [ ] Login agente → Queue → Pull conversation
  - [ ] Chat → Send message → Close
  - [ ] Profile → Update skills
  - [ ] Stats → View metrics
- [ ] **Dia 4:** Chatbot execution (3 tests)
  - [ ] Flow simples: Start → Message → End
  - [ ] Flow condicional: Start → Question → Condition → 2 branches
  - [ ] Flow handoff: Start → Message → Handoff → Agent pickup
- [ ] **Dia 5:** Edge cases (3 tests)
  - [ ] Queue overflow
  - [ ] Agent restrictions
  - [ ] Campaign retry
- **Tempo:** 4 dias
- **Commits:** 1 por dia (14 tests)

**Esforço Total Sprint 11:** 5 dias (14 tests)
**Prioridade:** 🟡 Importante
**Impacto:** Fluxos críticos validados

---

## 🎯 FASE 4: FEATURES AVANÇADAS (Semanas 13-20) 🚀

### Sprint 12-14 - CRM Integrations (Semanas 13-15)

**Objetivo:** Integrar com Salesforce, HubSpot, Pipedrive

#### Semana 13 - Salesforce

**Tarefa 12.1: Salesforce OAuth 2.0** 🔐
- [ ] **Dia 1-2:** Setup OAuth flow
  - [ ] Criar Connected App no Salesforce
  - [ ] Implementar `salesforce.py` em `integrations/crm/`
  - [ ] OAuth 2.0 Web Server Flow
  - [ ] Armazenar tokens em `secrets` table
- [ ] **Dia 3:** CRUD operations
  - [ ] Leads: create, update, get
  - [ ] Contacts: create, update, get
  - [ ] Opportunities: create, update, get
- [ ] **Dia 4-5:** Bidirectional sync
  - [ ] Webhook receiver: `/api/v1/webhooks/salesforce`
  - [ ] Sync on conversation close → Create Lead
  - [ ] Sync on contact update → Update Contact
  - [ ] Background job: sync a cada 15 minutos
- **Tempo:** 5 dias
- **Commits:**
  - `feat: adiciona integração Salesforce com OAuth 2.0`
  - `feat: implementa CRUD operations Salesforce`
  - `feat: adiciona bidirectional sync Salesforce`

#### Semana 14 - HubSpot

**Tarefa 13.1: HubSpot API** 🔐
- [ ] **Dia 1-2:** Setup API Key auth
  - [ ] Criar Private App no HubSpot
  - [ ] Implementar `hubspot.py`
  - [ ] Armazenar API key em `secrets`
- [ ] **Dia 3:** CRUD operations
  - [ ] Contacts: create, update, get
  - [ ] Deals: create, update, get
  - [ ] Tickets: create, update, get
- [ ] **Dia 4-5:** Webhooks
  - [ ] Webhook receiver: `/api/v1/webhooks/hubspot`
  - [ ] Events: contact.created, deal.updated
  - [ ] Sync conversation → Create Ticket
- **Tempo:** 5 dias
- **Commits similares ao Salesforce**

#### Semana 15 - Pipedrive

**Tarefa 14.1: Pipedrive API** 🔐
- [ ] **Dia 1-2:** Setup Personal Access Token
  - [ ] Implementar `pipedrive.py`
  - [ ] Armazenar token em `secrets`
- [ ] **Dia 3:** CRUD operations
  - [ ] Persons: create, update, get
  - [ ] Deals: create, update, get
  - [ ] Activities: create, update, get
- [ ] **Dia 4-5:** WebSocket events
  - [ ] Webhook receiver: `/api/v1/webhooks/pipedrive`
  - [ ] Sync conversation → Create Activity
- **Tempo:** 5 dias

**Tarefa 14.2: CRM Settings Frontend** 🎨
- [ ] Criar `/admin/settings/integrations`
- [ ] Cards para cada CRM (Salesforce, HubSpot, Pipedrive)
- [ ] Connect/Disconnect buttons
- [ ] Sync settings:
  - Auto-sync on/off
  - Sync interval (15min, 30min, 1h)
  - Field mapping (WhatsApp → CRM)
- **Tempo:** Incluído na semana 15

**Esforço Total Sprint 12-14:** 15 dias
**Prioridade:** 🟢 Nice-to-have
**Impacto:** Diferencial competitivo forte

---

### Sprint 15 - Notification System (Semana 16)

**Objetivo:** Email, Push, WhatsApp notifications

#### Segunda-feira a Quarta-feira (Dias 1-3)
**Tarefa 15.1: Email Notifications** 📧
- [ ] **Dia 1:** Setup SendGrid/AWS SES
  - [ ] Configurar SMTP credentials
  - [ ] Criar `notification_service.py`
  - [ ] Templates HTML (Jinja2)
- [ ] **Dia 2:** Email types
  - [ ] Welcome email (novo agente)
  - [ ] Reset password
  - [ ] Daily reports (admins)
  - [ ] SLA alerts
- [ ] **Dia 3:** Celery tasks
  - [ ] `send_email.delay()`
  - [ ] Retry logic (3 tentativas)
  - [ ] Track delivery status
- **Tempo:** 3 dias
- **Commits:**
  - `feat: adiciona sistema de email notifications`
  - `feat: implementa templates HTML para emails`
  - `feat: adiciona Celery tasks para envio assíncrono`

#### Quinta-feira (Dia 4)
**Tarefa 15.2: Push Notifications** 📱
- [ ] Setup Firebase Cloud Messaging (FCM)
- [ ] Frontend: service worker registration
- [ ] Backend: enviar push via FCM API
- [ ] Notification types:
  - Nova mensagem
  - Conversa atribuída
  - SLA em risco
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona push notifications com FCM`

#### Sexta-feira (Dia 5)
**Tarefa 15.3: WhatsApp Notifications (Admin)** 💬
- [ ] Configurar número WhatsApp para alertas
- [ ] Notification types:
  - Alertas críticos (sistema down)
  - Métricas diárias (resumo)
  - Conversas sem agente (>30min)
- [ ] Settings: enable/disable por tipo
- **Tempo:** 1 dia
- **Commit:** `feat: adiciona WhatsApp notifications para admins`

**Esforço Total Sprint 15:** 5 dias
**Prioridade:** 🟡 Importante
**Impacto:** Engagement e alertas proativos

---

### Sprint 16 - File Storage S3 (Semana 17)

**Objetivo:** Migrar media files para S3

#### Segunda-feira (Dia 1)
**Tarefa 16.1: Setup AWS S3** ☁️
- [ ] Criar bucket: `pytake-media-prod`
- [ ] Configurar CORS
- [ ] Lifecycle rules: delete after 90 days
- [ ] IAM policy: read/write
- **Tempo:** 1 dia
- **Commit:** `feat: configura AWS S3 bucket para media storage`

#### Terça-feira a Quarta-feira (Dias 2-3)
**Tarefa 16.2: S3 Service** 📦
- [ ] **Dia 2:** Implementar `s3_service.py`
  - [ ] Upload: `boto3.upload_fileobj()`
  - [ ] Generate presigned URL (24h TTL)
  - [ ] Delete file
  - [ ] List files
- [ ] **Dia 3:** Integrar com WhatsAppService
  - [ ] Upload media to S3
  - [ ] Return presigned URL
  - [ ] Send to WhatsApp with URL
- **Tempo:** 2 dias
- **Commits:**
  - `feat: implementa S3Service para upload de media`
  - `feat: integra S3 com WhatsAppService`

#### Quinta-feira a Sexta-feira (Dias 4-5)
**Tarefa 16.3: Cleanup Jobs** 🗑️
- [ ] **Dia 4:** Celery task: `cleanup_old_media`
  - [ ] Deletar arquivos com >90 dias
  - [ ] Rodar diariamente às 03:00 UTC
  - [ ] Log deletions
- [ ] **Dia 5:** Migração de arquivos existentes
  - [ ] Script: migrate filesystem → S3
  - [ ] Update URLs no banco de dados
  - [ ] Testar downloads
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona cleanup job para arquivos antigos`
  - `chore: migra arquivos existentes para S3`

**Esforço Total Sprint 16:** 5 dias
**Prioridade:** 🟡 Importante
**Impacto:** Escalabilidade (múltiplas instâncias)

---

### Sprint 17 - Frontend Polish (Semana 18)

**Objetivo:** Melhorias UI/UX finais

#### Segunda-feira a Terça-feira (Dias 1-2)
**Tarefa 17.1: Accessibility (a11y)** ♿
- [ ] **Dia 1:** Keyboard navigation
  - [ ] Tab index correto
  - [ ] Focus visible styles
  - [ ] Skip links
  - [ ] Escape to close modals
- [ ] **Dia 2:** Screen readers
  - [ ] ARIA labels completos
  - [ ] Alt text em imagens
  - [ ] Semantic HTML
  - [ ] role attributes
- [ ] Testar com axe DevTools
- [ ] Target: WCAG AA compliance
- **Tempo:** 2 dias
- **Commits:**
  - `a11y: adiciona keyboard navigation completo`
  - `a11y: implementa ARIA labels e semantic HTML`

#### Quarta-feira (Dia 3)
**Tarefa 17.2: Dark Mode Refinements** 🌙
- [ ] Audit todos os componentes
- [ ] Fixar contraste baixo
- [ ] Theme toggle (sun/moon icon)
- [ ] Persistir em localStorage
- [ ] Invert images quando necessário
- **Tempo:** 1 dia
- **Commit:** `feat: refina dark mode com melhor contraste`

#### Quinta-feira a Sexta-feira (Dias 4-5)
**Tarefa 17.3: Animations & Micro-interactions** ✨
- [ ] **Dia 4:** Hover states
  - [ ] Cards: lift + shadow
  - [ ] Buttons: scale + brightness
  - [ ] Links: underline animation
- [ ] **Dia 5:** Transitions
  - [ ] Modal open/close: fade + scale
  - [ ] Toast: slide in from right
  - [ ] Sidebar: slide from left
  - [ ] Dropdown: fade + slide down
- [ ] Usar Framer Motion onde faz sentido
- **Tempo:** 2 dias
- **Commits:**
  - `feat: adiciona hover states animados`
  - `feat: implementa transitions suaves com Framer Motion`

**Esforço Total Sprint 17:** 5 dias
**Prioridade:** 🟢 Nice-to-have
**Impacto:** Experiência polida e profissional

---

## 🎯 FASE 5: DEVOPS & MONITORING (Semanas 21-24) 📊

### Sprint 18-19 - Monitoring (Semanas 19-20)

**Objetivo:** Observability completa

#### Semana 19 - Logging & Metrics

**Tarefa 18.1: Structured Logging** 📝
- [ ] **Dia 1-2:** Setup structlog
  - [ ] Instalar: `pip install structlog`
  - [ ] Configurar em `core/logging.py`
  - [ ] JSON format
  - [ ] Correlation IDs (trace requests)
- [ ] **Dia 3:** Log levels corretos
  - [ ] DEBUG: detalhes técnicos
  - [ ] INFO: eventos importantes
  - [ ] WARNING: issues não críticos
  - [ ] ERROR: erros que precisam atenção
- [ ] **Dia 4-5:** Log aggregation
  - [ ] Setup Elasticsearch/Loki
  - [ ] Ship logs com Fluentd/Promtail
  - [ ] Criar dashboards Grafana
- **Tempo:** 5 dias
- **Commits:**
  - `feat: adiciona structured logging com structlog`
  - `feat: configura log aggregation com Loki`

#### Semana 20 - Prometheus & Grafana

**Tarefa 19.1: Prometheus Metrics** 📊
- [ ] **Dia 1-2:** Setup Prometheus
  - [ ] Instalar: `pip install prometheus-fastapi-instrumentator`
  - [ ] Instrumentar FastAPI app
  - [ ] Metrics: HTTP duration, DB queries, queue size
- [ ] **Dia 3:** Custom metrics
  - [ ] Active websockets (Gauge)
  - [ ] Messages sent (Counter)
  - [ ] Conversations created (Counter)
  - [ ] Queue pull time (Histogram)
- [ ] **Dia 4-5:** Grafana dashboards
  - [ ] System overview
  - [ ] API performance
  - [ ] Business metrics
  - [ ] Queue metrics
- **Tempo:** 5 dias
- **Commits:**
  - `feat: adiciona Prometheus metrics`
  - `feat: cria Grafana dashboards`

**Esforço Total Sprint 18-19:** 10 dias
**Prioridade:** 🟡 Importante
**Impacto:** Observability e debugging

---

### Sprint 20 - Alerting (Semana 21)

**Objetivo:** Alerts proativos

#### Segunda-feira a Terça-feira (Dias 1-2)
**Tarefa 20.1: AlertManager Setup** 🚨
- [ ] **Dia 1:** Configurar AlertManager
  - [ ] Definir alerting rules
  - [ ] Receivers: email, Slack, PagerDuty
- [ ] **Dia 2:** Alert rules
  - [ ] API error rate > 5% (5min)
  - [ ] Database connections > 80%
  - [ ] Queue size > 1000
  - [ ] Disk usage > 85%
  - [ ] Memory usage > 90%
  - [ ] Response time p95 > 1s
- **Tempo:** 2 dias
- **Commits:**
  - `feat: configura AlertManager`
  - `feat: define alerting rules para métricas críticas`

#### Quarta-feira a Sexta-feira (Dias 3-5)
**Tarefa 20.2: Health Checks** ❤️
- [ ] **Dia 3:** Endpoints
  ```python
  GET /health/live   # Liveness probe (k8s)
  GET /health/ready  # Readiness probe (k8s)
  ```
- [ ] **Dia 4:** Health checks
  - [ ] Database connection
  - [ ] Redis connection
  - [ ] MongoDB connection
  - [ ] Disk space
  - [ ] Memory usage
- [ ] **Dia 5:** Integrar com k8s
  - [ ] Definir probes no deployment
  - [ ] Testar restart on failure
- **Tempo:** 3 dias
- **Commits:**
  - `feat: adiciona health check endpoints`
  - `feat: integra health checks com Kubernetes`

**Esforço Total Sprint 20:** 5 dias
**Prioridade:** 🟡 Importante
**Impacto:** Uptime e SRE best practices

---

### Sprint 21 - CI/CD (Semana 22)

**Objetivo:** Pipeline completo

#### Segunda-feira a Quarta-feira (Dias 1-3)
**Tarefa 21.1: GitHub Actions** 🤖
- [ ] **Dia 1:** Workflow: Backend
  ```yaml
  - Run tests (pytest)
  - Lint (black, isort, flake8)
  - Type check (mypy)
  - Build Docker image
  - Push to registry
  ```
- [ ] **Dia 2:** Workflow: Frontend
  ```yaml
  - Run tests (jest)
  - Lint (eslint)
  - Type check (tsc)
  - Build Next.js
  - Build Docker image
  ```
- [ ] **Dia 3:** Deploy workflow
  ```yaml
  - Deploy to staging (auto)
  - Deploy to production (manual approval)
  - Rollback on failure
  ```
- **Tempo:** 3 dias
- **Commits:**
  - `ci: adiciona GitHub Actions workflow para backend`
  - `ci: adiciona GitHub Actions workflow para frontend`
  - `cd: implementa deploy automático para staging`

#### Quinta-feira a Sexta-feira (Dias 4-5)
**Tarefa 21.2: Pre-commit Hooks** 🪝
- [ ] **Dia 4:** Setup pre-commit
  - [ ] Instalar: `pip install pre-commit`
  - [ ] Criar `.pre-commit-config.yaml`
  - [ ] Hooks: black, isort, flake8, mypy, prettier
- [ ] **Dia 5:** Docker multi-stage builds
  - [ ] Otimizar Dockerfiles
  - [ ] Builder stage + runtime stage
  - [ ] Reduzir image size 50%+
- **Tempo:** 2 dias
- **Commits:**
  - `ci: adiciona pre-commit hooks`
  - `docker: otimiza Dockerfiles com multi-stage builds`

**Esforço Total Sprint 21:** 5 dias
**Prioridade:** 🟡 Importante
**Impacto:** Qualidade de código e deploy rápido

---

### Sprint 22 - Billing (Stripe) (Semanas 23-24)

**Objetivo:** Sistema de pagamento

#### Semana 23 - Stripe Setup

**Tarefa 22.1: Stripe Integration** 💳
- [ ] **Dia 1-2:** Setup Stripe
  - [ ] Criar conta Stripe
  - [ ] Instalar: `pip install stripe`
  - [ ] Configurar webhook secret
- [ ] **Dia 3:** Plans
  - [ ] Basic: R$ 99/mês (1.000 mensagens)
  - [ ] Pro: R$ 299/mês (10.000 mensagens)
  - [ ] Enterprise: Custom pricing
- [ ] **Dia 4-5:** Subscription API
  - [ ] `billing_service.py`
  - [ ] Create subscription
  - [ ] Update subscription
  - [ ] Cancel subscription
  - [ ] Track usage
- **Tempo:** 5 dias
- **Commits:**
  - `feat: integra Stripe para billing`
  - `feat: define planos de assinatura`
  - `feat: implementa Subscription API`

#### Semana 24 - Billing UI

**Tarefa 22.2: Billing Frontend** 💰
- [ ] **Dia 1-2:** Criar `/admin/billing`
  - [ ] Current plan card
  - [ ] Usage stats (mensagens enviadas)
  - [ ] Upgrade/downgrade buttons
- [ ] **Dia 3:** Checkout flow
  - [ ] Stripe Checkout Session
  - [ ] Success/cancel redirects
  - [ ] Confirmation email
- [ ] **Dia 4-5:** Customer Portal
  - [ ] Stripe Customer Portal
  - [ ] Update payment method
  - [ ] View invoices
  - [ ] Download invoice PDFs
- **Tempo:** 5 dias
- **Commits:**
  - `feat: adiciona Billing page com current plan`
  - `feat: implementa Stripe Checkout flow`
  - `feat: integra Stripe Customer Portal`

**Esforço Total Sprint 22:** 10 dias
**Prioridade:** 🟢 Nice-to-have
**Impacto:** Monetização (SaaS revenue)

---

## 📊 RESUMO DO CRONOGRAMA

### Por Fase

| Fase | Sprints | Semanas | Dias | Prioridade | Status |
|------|---------|---------|------|------------|--------|
| **Fase 1: Crítico** | 1-4 | 1-4 | 20 | 🔴 Alta | Pendente |
| **Fase 2: Importante** | 5-7 | 5-8 | 20 | 🟡 Média | Pendente |
| **Fase 3: Qualidade** | 8-11 | 9-12 | 20 | 🔴 Alta | Pendente |
| **Fase 4: Features** | 12-17 | 13-18 | 30 | 🟢 Baixa | Pendente |
| **Fase 5: DevOps** | 18-22 | 19-24 | 30 | 🟡 Média | Pendente |
| **TOTAL** | 22 | 24 | ~120 | - | - |

### Por Categoria

| Categoria | Dias | Prioridade | Tarefas |
|-----------|------|------------|---------|
| Backend Gaps | 15 | 🔴 Crítico | Secrets, Database, Campaigns, Templates |
| Frontend Mobile | 5 | 🔴 Crítico | Navigation, Responsive |
| Agent Panel | 5 | 🔴 Crítico | 4 páginas faltando |
| Performance | 15 | 🟡 Importante | Queries, Caching, Analytics |
| Segurança | 5 | 🟡 Importante | Validation, HTTPS, Headers |
| Testes | 20 | 🔴 Crítico | Unit, Integration, E2E |
| CRM | 15 | 🟢 Nice-to-have | Salesforce, HubSpot, Pipedrive |
| Notifications | 5 | 🟡 Importante | Email, Push, WhatsApp |
| Storage | 5 | 🟡 Importante | S3 migration |
| UI Polish | 5 | 🟢 Nice-to-have | a11y, Animations |
| Monitoring | 15 | 🟡 Importante | Logs, Metrics, Alerts |
| CI/CD | 5 | 🟡 Importante | Pipeline, Pre-commit |
| Billing | 10 | 🟢 Nice-to-have | Stripe integration |

### Timeline Visual

```
Mês 1 (Out-Nov 2025)
Semana 1: [Sprint 1] Backend Hotfixes ⚡
Semana 2: [Sprint 2] Mobile & UX 📱
Semana 3: [Sprint 3] Agent Panel 👤
Semana 4: [Sprint 4] WhatsApp Templates 📝
Status: 75% → 80%

Mês 2 (Nov-Dez 2025)
Semana 5-6: [Sprint 5] Performance Backend ⚡
Semana 7: [Sprint 6] Analytics 📊
Semana 8: [Sprint 7] Segurança 🔒
Status: 80% → 85%

Mês 3 (Dez 2025 - Jan 2026)
Semana 9-10: [Sprint 8-9] Testes Backend 🧪
Semana 11: [Sprint 10] Testes Frontend 🧪
Semana 12: [Sprint 11] E2E Tests 🎭
Status: 85% → 90%

Mês 4 (Jan-Fev 2026)
Semana 13-15: [Sprint 12-14] CRM Integrations 🔗
Semana 16: [Sprint 15] Notifications 📧
Status: 90% → 92%

Mês 5 (Fev-Mar 2026)
Semana 17: [Sprint 16] S3 Storage ☁️
Semana 18: [Sprint 17] UI Polish ✨
Semana 19-20: [Sprint 18-19] Monitoring 📊
Status: 92% → 94%

Mês 6 (Mar 2026)
Semana 21: [Sprint 20] Alerting 🚨
Semana 22: [Sprint 21] CI/CD 🤖
Semana 23-24: [Sprint 22] Billing 💳
Status: 94% → 95%
```

---

## 🎯 MILESTONES

### Milestone 1: MVP Completo (Final Mês 1)
- ✅ Todos os endpoints funcionais
- ✅ Agent Panel 100%
- ✅ Mobile responsivo
- ✅ Campaign execution
- **Target:** 80% completo

### Milestone 2: Performance & Qualidade (Final Mês 3)
- ✅ Performance otimizado (caching, indexes)
- ✅ 80% test coverage
- ✅ E2E tests críticos
- **Target:** 90% completo

### Milestone 3: Features Premium (Final Mês 4)
- ✅ CRM integrations
- ✅ Notifications multi-canal
- ✅ S3 storage
- **Target:** 92% completo

### Milestone 4: Production-Ready (Final Mês 6)
- ✅ Monitoring completo
- ✅ CI/CD pipeline
- ✅ Billing system
- ✅ 95% completo
- 🚀 **LAUNCH!**

---

## 📋 CHECKLIST FINAL

### Antes do Launch
- [ ] Todos os 15 endpoints funcionando
- [ ] 22/22 páginas Admin funcionais
- [ ] 8/8 páginas Agent funcionais
- [ ] 80%+ test coverage
- [ ] CI/CD pipeline ativo
- [ ] Monitoring com alertas
- [ ] Performance: <200ms API, <2s page load
- [ ] Segurança: SSL, headers, validations
- [ ] Documentação API completa
- [ ] Billing system funcional
- [ ] Load testing (1000 concurrent users)
- [ ] Disaster recovery plan
- [ ] Backup strategy (daily)

---

## 🚀 PRÓXIMOS PASSOS IMEDIATOS

### Segunda-feira (Dia 1)
1. ⚡ **09:00-11:00** - Habilitar Secrets endpoint (2h)
2. ⚡ **11:00-14:00** - Habilitar Database endpoint (3h)
3. 🔒 **14:00-18:00** - Rate Limiting setup (4h)

### Terça-feira a Sexta-feira
- Continuar **Sprint 1** - Campaign Execution Engine

### Semana 2
- **Sprint 2** - Mobile Navigation + Toasts

### Semana 3
- **Sprint 3** - Agent Panel completo

---

**Documento criado em:** 23 de Outubro de 2025
**Última atualização:** 23 de Outubro de 2025
**Versão:** 1.0
**Status:** Planejamento aprovado ✅

**Começar imediatamente com Fase 1 - Sprint 1! 🚀**
