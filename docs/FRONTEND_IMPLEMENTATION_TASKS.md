# ✅ Task Checklist - Frontend Implementation Sprint

**Data:** November 24, 2025  
**Sprint:** Week 1 (Prioridades Críticas)  
**Owner:** Desenvolvimento Frontend  
**Implementado por:** Kayo Carvalho Fernandes

---

## 📍 SPRINT 1 - Week 1 (CRÍTICAS - Must Have)

### 🔴 TASK 1: Conversations Page - List View
**Prioridade:** MÁXIMA  
**Timeline:** 2-3 dias  
**Deadline:** End of Day 2  

- [ ] **1.1** Criar arquivo: `/frontend/src/pages/conversations.tsx`
- [ ] **1.2** Criar componente: `/frontend/src/components/ConversationList.tsx`
- [ ] **1.3** Criar componente: `/frontend/src/components/ConversationCard.tsx`
- [ ] **1.4** Criar componente: `/frontend/src/components/ConversationStatusBadge.tsx`
- [ ] **1.5** Implementar fetch com `GET /conversations` endpoint
- [ ] **1.6** Implementar search functionality
- [ ] **1.7** Implementar filter por status (open, resolved, assigned, archived)
- [ ] **1.8** Implementar sort (recent, oldest, unread)
- [ ] **1.9** Implementar pagination (50 itens por página)
- [ ] **1.10** Adicionar skeleton loading com `Skeleton` do shadcn/ui
- [ ] **1.11** Adicionar error boundary com retry
- [ ] **1.12** Teste: Verificar se lista carrega e filtra corretamente
- [ ] **1.13** Teste: Verificar responsividade (mobile, tablet, desktop)

**Arquivos a Criar:**
```
/frontend/src/pages/conversations.tsx (200 linhas)
/frontend/src/components/ConversationList.tsx (150 linhas)
/frontend/src/components/ConversationCard.tsx (120 linhas)
/frontend/src/components/ConversationStatusBadge.tsx (50 linhas)
```

**Backend Required:**
- ✅ `GET /conversations`
- ✅ `GET /conversations/{id}`

---

### 🔴 TASK 2: Conversations Detail - Drawer/Modal
**Prioridade:** MÁXIMA  
**Timeline:** 2 dias  
**Deadline:** End of Day 4

- [ ] **2.1** Criar componente: `/frontend/src/components/ConversationDetail.tsx`
- [ ] **2.2** Criar componente: `/frontend/src/components/MessageComposer.tsx`
- [ ] **2.3** Criar componente: `/frontend/src/components/ContactSidebar.tsx`
- [ ] **2.4** Implementar fetch de conversation detail com `GET /conversations/{id}`
- [ ] **2.5** Implementar drawer/modal para visualizar conversation
- [ ] **2.6** Implementar message list (thread)
- [ ] **2.7** Implementar message composer (input + send button)
- [ ] **2.8** Implementar WebSocket real-time message updates
- [ ] **2.9** Implementar contact sidebar (name, phone, email, tags, history)
- [ ] **2.10** Implementar action menu (resolve, assign, archive)
- [ ] **2.11** Adicionar attachment preview
- [ ] **2.12** Adicionar emoji picker
- [ ] **2.13** Teste: WebSocket real-time updates funcionando
- [ ] **2.14** Teste: Actions (resolve, assign) salvando corretamente

**Arquivos a Criar:**
```
/frontend/src/components/ConversationDetail.tsx (300 linhas)
/frontend/src/components/MessageComposer.tsx (150 linhas)
/frontend/src/components/ContactSidebar.tsx (120 linhas)
/frontend/src/components/MessageBubble.tsx (100 linhas)
```

**Backend Required:**
- ✅ `WebSocket /ws/conversations/{id}`
- ✅ `PUT /conversations/{id}/status`
- ✅ `POST /conversations/{id}/messages` (send message)

**WebSocket Implementation:**
```typescript
// Use getWebSocketUrl() from frontend/src/lib/websocket.ts
const wsUrl = `${getWebSocketUrl()}/ws/conversations/${conversationId}`
const ws = new WebSocket(wsUrl)
```

---

### 🔴 TASK 3: Templates Pages - Create + Edit
**Prioridade:** MÁXIMA  
**Timeline:** 2-3 dias  
**Deadline:** End of Day 6

- [ ] **3.1** Criar arquivo: `/frontend/src/pages/templates/create.tsx`
- [ ] **3.2** Criar arquivo: `/frontend/src/pages/templates/[id].tsx` (edit)
- [ ] **3.3** Criar componente: `/frontend/src/components/TemplateForm.tsx`
- [ ] **3.4** Criar componente: `/frontend/src/components/TemplateEditor.tsx` (markdown editor)
- [ ] **3.5** Criar componente: `/frontend/src/components/TemplatePreview.tsx` (live preview)
- [ ] **3.6** Criar componente: `/frontend/src/components/VariableSelector.tsx` (insert variables)
- [ ] **3.7** Implementar form com validação (nome, categoria, conteúdo)
- [ ] **3.8** Implementar markdown editor com live preview
- [ ] **3.9** Implementar variable selector ({{{variable}}})
- [ ] **3.10** Implementar character counter
- [ ] **3.11** Implementar save & publish
- [ ] **3.12** Implementar auto-save draft
- [ ] **3.13** Implementar back/next navigation
- [ ] **3.14** Teste: Create template salvando no backend
- [ ] **3.15** Teste: Edit template carregando dados corretamente
- [ ] **3.16** Teste: Markdown preview renderizando corretamente

**Arquivos a Criar:**
```
/frontend/src/pages/templates/create.tsx (150 linhas)
/frontend/src/pages/templates/[id].tsx (150 linhas)
/frontend/src/components/TemplateForm.tsx (200 linhas)
/frontend/src/components/TemplateEditor.tsx (150 linhas)
/frontend/src/components/TemplatePreview.tsx (100 linhas)
/frontend/src/components/VariableSelector.tsx (100 linhas)
```

**Backend Required:**
- ✅ `POST /templates` (create)
- ✅ `GET /templates/{id}` (fetch for edit)
- ✅ `PUT /templates/{id}` (update)

---

### 🔴 TASK 4: Campaigns Page - List View
**Prioridade:** MÁXIMA  
**Timeline:** 2 dias  
**Deadline:** End of Day 8

- [ ] **4.1** Criar arquivo: `/frontend/src/pages/campaigns.tsx`
- [ ] **4.2** Criar componente: `/frontend/src/components/CampaignList.tsx`
- [ ] **4.3** Criar componente: `/frontend/src/components/CampaignCard.tsx`
- [ ] **4.4** Criar componente: `/frontend/src/components/CampaignStatusBadge.tsx`
- [ ] **4.5** Criar componente: `/frontend/src/components/CampaignStats.tsx` (sent, delivered, opened, etc)
- [ ] **4.6** Implementar fetch com `GET /campaigns` endpoint
- [ ] **4.7** Implementar search functionality
- [ ] **4.8** Implementar filter por status (draft, scheduled, running, completed, paused, failed)
- [ ] **4.9** Implementar sort (recent, oldest, name)
- [ ] **4.10** Implementar pagination
- [ ] **4.11** Implementar skeleton loading
- [ ] **4.12** Implementar action buttons (edit, pause/resume, delete, duplicate)
- [ ] **4.13** Implementar bulk actions (select multiple)
- [ ] **4.14** Implementar action menu com view execution history
- [ ] **4.15** Teste: List carrega com dados corretos
- [ ] **4.16** Teste: Filtros funcionando corretamente

**Arquivos a Criar:**
```
/frontend/src/pages/campaigns.tsx (250 linhas)
/frontend/src/components/CampaignList.tsx (150 linhas)
/frontend/src/components/CampaignCard.tsx (150 linhas)
/frontend/src/components/CampaignStats.tsx (80 linhas)
```

**Backend Required:**
- ✅ `GET /campaigns`
- ✅ `GET /campaigns/{id}`
- ✅ `GET /campaigns/{id}/executions` (history)

---

### 🟡 TASK 5: Campaigns Create + Edit (Wizard Form)
**Prioridade:** ALTA  
**Timeline:** 2-3 dias  
**Deadline:** End of Week 1

- [ ] **5.1** Criar arquivo: `/frontend/src/pages/campaigns/create.tsx`
- [ ] **5.2** Criar arquivo: `/frontend/src/pages/campaigns/[id].tsx` (edit)
- [ ] **5.3** Criar componente: `/frontend/src/components/CampaignWizard.tsx` (stepper)
- [ ] **5.4** Criar componente: `/frontend/src/components/CampaignFormStep1.tsx` (name, description, template)
- [ ] **5.5** Criar componente: `/frontend/src/components/CampaignFormStep2.tsx` (target contacts, segment, filter)
- [ ] **5.6** Criar componente: `/frontend/src/components/CampaignFormStep3.tsx` (schedule)
- [ ] **5.7** Criar componente: `/frontend/src/components/CampaignScheduler.tsx` (date, time, repeat)
- [ ] **5.8** Criar componente: `/frontend/src/components/SegmentSelector.tsx` (contact groups)
- [ ] **5.9** Implementar multi-step form com wizard
- [ ] **5.10** Implementar form validation per step
- [ ] **5.11** Implementar campaign preview
- [ ] **5.12** Implementar save as draft
- [ ] **5.13** Implementar schedule/publish
- [ ] **5.14** Teste: Wizard navigation funcionando
- [ ] **5.15** Teste: Campaign salvando e sendo criado no backend

**Arquivos a Criar:**
```
/frontend/src/pages/campaigns/create.tsx (150 linhas)
/frontend/src/pages/campaigns/[id].tsx (150 linhas)
/frontend/src/components/CampaignWizard.tsx (200 linhas)
/frontend/src/components/CampaignFormStep*.tsx (100 linhas cada)
/frontend/src/components/CampaignScheduler.tsx (150 linhas)
```

**Backend Required:**
- ✅ `POST /campaigns` (create)
- ✅ `GET /campaigns/{id}` (fetch for edit)
- ✅ `PUT /campaigns/{id}` (update)

---

## 📊 SPRINT 2 - Week 2 (IMPORTANTES - Should Have)

### 🟡 TASK 6: Contacts - Enhanced with Import/Export
**Prioridade:** ALTA  
**Timeline:** 2 dias

- [ ] **6.1** Melhorar `/frontend/src/pages/contacts.tsx` (já existe, mas básico)
- [ ] **6.2** Criar componente: `/frontend/src/components/ContactsTable.tsx`
- [ ] **6.3** Criar componente: `/frontend/src/components/ContactImporter.tsx` (CSV uploader)
- [ ] **6.4** Criar componente: `/frontend/src/components/ContactSegments.tsx`
- [ ] **6.5** Implementar table com sorting/filtering
- [ ] **6.6** Implementar segmentação (por group, tag, status)
- [ ] **6.7** Implementar CSV import (uploader + parser)
- [ ] **6.8** Implementar CSV export
- [ ] **6.9** Implementar bulk actions (delete, tag, segment)
- [ ] **6.10** Implementar create contact form (modal)
- [ ] **6.11** Implementar edit contact form (modal)
- [ ] **6.12** Teste: CSV import salvando contatos corretamente

---

### 🟡 TASK 7: Flows - Enhanced (Modals + CRUD)
**Prioridade:** ALTA  
**Timeline:** 2 dias

- [ ] **7.1** Melhorar `/frontend/src/pages/Flows.tsx` (já existe, mas básico)
- [ ] **7.2** Criar componente: `/frontend/src/components/FlowCreateModal.tsx`
- [ ] **7.3** Criar componente: `/frontend/src/components/FlowEditModal.tsx`
- [ ] **7.4** Criar componente: `/frontend/src/components/FlowDetailView.tsx`
- [ ] **7.5** Criar componente: `/frontend/src/components/FlowExecutionLogs.tsx`
- [ ] **7.6** Implementar modal de criação
- [ ] **7.7** Implementar modal de edição
- [ ] **7.8** Implementar view de detalhes
- [ ] **7.9** Implementar view de execution logs
- [ ] **7.10** Implementar ação "duplicar flow"
- [ ] **7.11** Implementar ação "ver execuções"
- [ ] **7.12** Implementar bulk actions
- [ ] **7.13** Implementar advanced filters
- [ ] **7.14** Teste: Flows CRUD funcionando completo

---

### 🟡 TASK 8: Dashboard - Enhanced with Charts
**Prioridade:** ALTA  
**Timeline:** 2 dias

- [ ] **8.1** Melhorar `/frontend/src/pages/dashboard.tsx`
- [ ] **8.2** Instalar Chart.js ou Recharts: `npm install recharts`
- [ ] **8.3** Criar componente: `/frontend/src/components/DashboardChart.tsx`
- [ ] **8.4** Criar componente: `/frontend/src/components/KPICard.tsx`
- [ ] **8.5** Criar componente: `/frontend/src/components/TrendIndicator.tsx`
- [ ] **8.6** Implementar métricas em tempo real (fetch GET /analytics/dashboard)
- [ ] **8.7** Implementar gráficos (conversations trend, campaign performance, etc)
- [ ] **8.8** Implementar KPI cards com trend indicators
- [ ] **8.9** Implementar WebSocket real-time updates
- [ ] **8.10** Teste: Gráficos renderizando corretamente
- [ ] **8.11** Teste: Real-time updates funcionando

---

### 🟡 TASK 9: Settings - Team Management
**Prioridade:** ALTA  
**Timeline:** 1.5 dias

- [ ] **9.1** Criar arquivo: `/frontend/src/pages/settings/team.tsx`
- [ ] **9.2** Criar componente: `/frontend/src/components/UserTable.tsx`
- [ ] **9.3** Criar componente: `/frontend/src/components/UserForm.tsx`
- [ ] **9.4** Criar componente: `/frontend/src/components/RoleSelector.tsx`
- [ ] **9.5** Implementar table de usuários
- [ ] **9.6** Implementar form para adicionar usuário
- [ ] **9.7** Implementar role selector (org_admin, agent, viewer)
- [ ] **9.8** Implementar permissões por role
- [ ] **9.9** Implementar deactivate/activate usuário
- [ ] **9.10** Implementar resend invitation
- [ ] **9.11** Implementar remove user
- [ ] **9.12** Teste: CRUD de usuários funcionando

---

### 🟡 TASK 10: Settings - WhatsApp Configuration
**Prioridade:** ALTA  
**Timeline:** 1.5 dias

- [ ] **10.1** Criar arquivo: `/frontend/src/pages/settings/whatsapp.tsx`
- [ ] **10.2** Criar componente: `/frontend/src/components/WhatsAppForm.tsx`
- [ ] **10.3** Criar componente: `/frontend/src/components/WebhookConfig.tsx`
- [ ] **10.4** Criar componente: `/frontend/src/components/ConnectionStatus.tsx`
- [ ] **10.5** Implementar API credential form
- [ ] **10.6** Implementar phone number configuration
- [ ] **10.7** Implementar webhook URL display
- [ ] **10.8** Implementar test webhook button
- [ ] **10.9** Implementar connection status indicator
- [ ] **10.10** Teste: WhatsApp config salvando corretamente

---

## 🟢 SPRINT 3 - Week 3-4 (NICE TO HAVE)

### 🟢 TASK 11: AI Assistant Page
**Prioridade:** MÉDIA  
**Timeline:** 2 dias

- [ ] Criar `/frontend/src/pages/ai-assistant.tsx`
- [ ] Criar componentes de chat interface
- [ ] Implementar WebSocket connection
- [ ] Integrar com AI endpoints

---

### 🟢 TASK 12: Integrations Pages
**Prioridade:** MÉDIA  
**Timeline:** 3 dias

- [ ] Criar `/frontend/src/pages/integrations.tsx` (list)
- [ ] Criar `/frontend/src/pages/integrations/[erpType].tsx` (detail)
- [ ] Implementar integration config forms
- [ ] Implementar field mapping

---

### 🟢 TASK 13: Reports Page
**Prioridade:** MÉDIA  
**Timeline:** 3 dias

- [ ] Criar `/frontend/src/pages/reports.tsx`
- [ ] Implementar custom report builder
- [ ] Implementar pre-built templates
- [ ] Implementar export (PDF, CSV, Excel)

---

### 🟢 TASK 14: Settings - Webhooks
**Prioridade:** MÉDIA  
**Timeline:** 2 dias

- [ ] Criar `/frontend/src/pages/settings/webhooks.tsx`
- [ ] Implementar webhook management
- [ ] Implementar webhook logs viewer
- [ ] Implementar test webhook

---

## 📋 GENERAL TASKS (Parallelizar com sprints)

### 🔧 TASK 15: Create Reusable Components Library
**Timeline:** 1 dia (parallelizar)

- [ ] Criar `/frontend/src/components/Shared/StatusBadge.tsx`
- [ ] Criar `/frontend/src/components/Shared/LoadingSkeleton.tsx`
- [ ] Criar `/frontend/src/components/Shared/ErrorBoundary.tsx`
- [ ] Criar `/frontend/src/components/Shared/EmptyState.tsx`
- [ ] Criar `/frontend/src/components/Shared/FilterPanel.tsx`
- [ ] Criar `/frontend/src/components/Shared/DataTable.tsx`
- [ ] Criar `/frontend/src/components/Shared/ConfirmDialog.tsx`
- [ ] Criar `/frontend/src/components/Shared/PageHeader.tsx`

---

### 🧪 TASK 16: Testing Setup
**Timeline:** 1 dia (parallelizar)

- [ ] Setup Playwright ou Cypress
- [ ] Escrever E2E tests para critical paths:
  - Login flow
  - Conversations list + detail
  - Campaign creation
  - Template creation

---

### 🎨 TASK 17: UI/UX Polish
**Timeline:** 1-2 dias (final)

- [ ] Error boundaries em todas as pages
- [ ] Loading skeletons em todas as pages
- [ ] Consistent dark mode support
- [ ] Accessibility audit (WCAG)
- [ ] Performance optimization

---

## 📊 Task Summary

| Task | Priority | Timeline | Status |
|------|----------|----------|--------|
| Conversations | 🔴 CRÍTICA | 2-3d | ❌ Todo |
| Conversations Detail | 🔴 CRÍTICA | 2d | ❌ Todo |
| Templates CRUD | 🔴 CRÍTICA | 2-3d | ❌ Todo |
| Campaigns List | 🔴 CRÍTICA | 2d | ❌ Todo |
| Campaigns CRUD | 🔴 CRÍTICA | 2-3d | ❌ Todo |
| Contacts Enhanced | 🟡 ALTA | 2d | ❌ Todo |
| Flows Enhanced | 🟡 ALTA | 2d | ❌ Todo |
| Dashboard Charts | 🟡 ALTA | 2d | ❌ Todo |
| Settings Team | 🟡 ALTA | 1.5d | ❌ Todo |
| Settings WhatsApp | 🟡 ALTA | 1.5d | ❌ Todo |
| AI Assistant | 🟢 MÉD | 2d | ❌ Todo |
| Integrations | 🟢 MÉD | 3d | ❌ Todo |
| Reports | 🟢 MÉD | 3d | ❌ Todo |
| Webhooks | 🟢 MÉD | 2d | ❌ Todo |
| **TOTAL** | - | **~40-45d** | - |

**Timeline Estimada (1 dev):** 4-6 semanas  
**Com 2 devs:** 2-3 semanas

---

## 🚀 How to Start (RIGHT NOW)

### Step 1: Pick TASK 1 (Conversations)
```bash
cd /home/administrator/pytake
git checkout develop
git pull origin develop
git checkout -b feature/TASK-001-conversations
```

### Step 2: Create Folder Structure
```bash
mkdir -p frontend/src/pages/conversations
mkdir -p frontend/src/components/Conversations
```

### Step 3: Create First Component File
```bash
touch frontend/src/pages/conversations.tsx
touch frontend/src/components/ConversationList.tsx
```

### Step 4: Copy Pattern from Flows.tsx
- Use `Flows.tsx` como referência de estrutura
- Adapte para Conversations endpoint
- Siga os mesmos padrões (getApiUrl, getAuthHeaders, etc)

### Step 5: Test Locally
```bash
podman compose up -d
podman exec pytake-frontend npm run dev
# Abrir http://localhost:3001/conversations
```

### Step 6: Commit & Push
```bash
git add .
git commit -m "feat: conversations list page | Author: Kayo Carvalho Fernandes"
git push origin feature/TASK-001-conversations
gh pr create --base develop
```

---

## 📞 Resources & Help

**Referências de Código:**
- Flows.tsx - List page pattern
- templates.tsx - Simple grid pattern
- api.ts - API utilities
- websocket.ts - WebSocket pattern

**Backend Endpoints:**
- Ver `backend/app/api/v1/endpoints/` para schemas
- Ver `backend/app/schemas/` para Pydantic models

**Component Library:**
- Shadcn/ui docs: https://ui.shadcn.com
- Tailwind CSS: https://tailwindcss.com
- React Hooks: https://react.dev

---

**Documento Criado:** November 24, 2025  
**Implementado por:** Kayo Carvalho Fernandes  
**Versão:** 1.0  
**Status:** 🟢 Pronto para Implementação

