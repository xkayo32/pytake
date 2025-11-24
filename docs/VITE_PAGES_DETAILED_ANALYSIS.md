# 📊 Análise Detalhada - Vite Frontend vs Next.js Reference

**Data:** November 24, 2025  
**Versão:** 1.0  
**Implementado por:** Kayo Carvalho Fernandes

---

## 📋 Status Geral

| Componente | Status | Completude | Prioridade |
|-----------|--------|-----------|-----------|
| **Backend** | ✅ Completo | 100% | - |
| **Frontend Pages** | 🟡 Parcial | 31% (12/38) | - |
| **Componentes UI** | ✅ Disponível | 90% (shadcn/ui) | - |
| **API Client** | ✅ Pronto | 100% | - |
| **WebSocket** | ✅ Funcional | 100% | - |
| **Auth/RBAC** | ✅ Implementado | 100% | - |

---

## 🔍 Análise Por Página (38 Total)

### ✅ PÁGINAS COMPLETAS (12)

#### 1. **Home/Index** (login redirect)
- **Status:** ✅ COMPLETO
- **Rota:** `/`
- **Implementação:** Simple redirect to login ou dashboard
- **Backend:** N/A
- **Componentes:** Button, navigation

#### 2. **Login**
- **Status:** ✅ COMPLETO
- **Rota:** `/login`
- **Features Implementadas:**
  - Form com email/password
  - Error handling
  - Redirect após login
  - "Remember me" (opcional)
- **Backend:** ✅ POST /auth/login
- **Componentes:** Form, Input, Button
- **Tipo:** Public route (sem auth)

#### 3. **Register**
- **Status:** ✅ COMPLETO
- **Rota:** `/register`
- **Features Implementadas:**
  - Form com email/password/confirm
  - Validation
  - Organization selection
  - Terms acceptance
- **Backend:** ✅ POST /auth/register
- **Componentes:** Form, Input, Checkbox, Button
- **Tipo:** Public route (sem auth)

#### 4. **Dashboard/Home**
- **Status:** ✅ BÁSICO (precisa enhancement)
- **Rota:** `/dashboard` ou `/`
- **Features Atuais:**
  - Welcome message
  - Quick stats (números)
  - Recent activities
- **Features Esperadas:**
  - 📊 Gráficos (Chart.js/Recharts)
  - 📈 KPI cards com trend indicators
  - 📅 Timeline de eventos recentes
  - 🔔 Notifications widget
  - 📱 Device info (conversas por canal)
  - 👥 Top contacts/conversations
- **Backend:** ✅ GET /analytics/dashboard
- **Componentes:** Card, Badge, Chart, Avatar
- **Tipo:** Protected (auth required)
- **Melhoria:** Adicionar real-time updates via WebSocket

#### 5. **Profile**
- **Status:** ✅ BÁSICO
- **Rota:** `/profile`
- **Features Atuais:**
  - User info display
  - Edit profile form
- **Features Esperadas:**
  - Avatar upload
  - Password change
  - Two-factor authentication
  - Login history
  - Connected devices
  - Preferences (notifications, language, etc)
- **Backend:** ✅ GET/PUT /users/me
- **Componentes:** Form, Input, Avatar, Button
- **Tipo:** Protected (auth required)

#### 6. **Flows (Index)**
- **Status:** ✅ BÁSICO
- **Rota:** `/flows`
- **Features Atuais:**
  - List with grid layout
  - Search e filter por status
  - Basic action buttons (play/pause/edit/copy/delete)
  - Status badges
- **Features Esperadas:**
  - ✨ Modal de criação com form
  - ✨ Modal de edição (edit existente)
  - ✨ Modal de visualização de detalhes
  - ✨ Pagination (50 itens por página)
  - ✨ Skeleton loading
  - ✨ Execution logs/history
  - ✨ Versioning
  - ✨ Bulk actions (select múltiplos)
  - ✨ Advanced filtering (por data, triggers, tags)
  - ✨ Ordenação (nome, data, status)
- **Backend:** ✅ GET/POST/PUT/DELETE /flow-automations
- **Componentes:** Card, Badge, Modal, Form, Button, Skeleton
- **Tipo:** Protected (org_admin, agent)
- **Atual File:** `/frontend/src/pages/Flows.tsx`

#### 7. **Flows Edit**
- **Status:** ✅ BÁSICO
- **Rota:** `/flows/:id` ou `/flows/[id]`
- **Features:** Form editor para fluxo
- **Backend:** ✅ GET/PUT /flow-automations/{id}
- **Componentes:** Form, Input, Textarea, Button
- **Tipo:** Protected

#### 8. **Templates**
- **Status:** ✅ BÁSICO
- **Rota:** `/templates`
- **Features Atuais:**
  - Grid view de templates
  - Basic actions
- **Features Esperadas:**
  - List ou grid com preview
  - Search e filter por category
  - Create button → form modal
  - Edit action → form modal
  - Duplicate action
  - Delete action
  - Use in campaign action
  - Category/tags management
  - Markdown preview real-time
  - Variable selector {{{var}}}
  - Pagination
  - Skeleton loading
- **Backend:** ✅ GET/POST/PUT/DELETE /templates
- **Componentes:** Card, Modal, Form, Badge, Button
- **Tipo:** Protected

#### 9. **Contacts**
- **Status:** ✅ BÁSICO
- **Rota:** `/contacts`
- **Features Atuais:**
  - List view
  - Search
- **Features Esperadas:**
  - Table com sorting/filtering
  - Segmentação (by group, tag, status)
  - Import CSV (uploader component)
  - Export CSV
  - Create contact form
  - Edit contact form
  - Bulk actions (delete, tag, segment)
  - Contact groups/tags
  - Last message timestamp
  - Status indicators (active, inactive, blocked)
  - Pagination
  - Skeleton loading
  - Advanced filters (phone, email, tag, last contact date)
- **Backend:** ✅ GET/POST/PUT/DELETE /contacts (19 endpoints)
- **Componentes:** Table, Form, Upload, Button, Badge
- **Tipo:** Protected

#### 10. **Automations**
- **Status:** ✅ BÁSICO
- **Rota:** `/automations`
- **Features:** List de automações (similar a Flows)
- **Backend:** ✅ Endpoints prontos
- **Componentes:** Similar a Flows
- **Tipo:** Protected

#### 11. **Analytics**
- **Status:** ✅ BÁSICO
- **Rota:** `/analytics`
- **Features Atuais:** Basic metrics display
- **Features Esperadas:**
  - Multiple chart types (line, bar, pie)
  - Date range picker
  - Export reports (PDF, Excel)
  - Custom dashboard builder
  - KPI cards
  - Trend indicators
  - Comparison view (month/month, etc)
  - Drilldown capabilities
- **Backend:** ✅ GET /analytics/* (9 endpoints)
- **Componentes:** Chart, Card, DatePicker, Button
- **Tipo:** Protected

#### 12. **Settings**
- **Status:** ✅ BÁSICO
- **Rota:** `/settings`
- **Features Atuais:** Basic form
- **Features Esperadas:**
  - Tab navigation:
    - **General:** Organization name, logo, timezone
    - **Team:** User management, role assignment
    - **WhatsApp:** API keys, business account config
    - **Webhooks:** Webhook management, logs
    - **Integrations:** ERP connections
    - **Notifications:** Preferences
    - **Billing:** Plan info, usage
  - CRUD operations per section
- **Backend:** ✅ GET/PUT /organizations/{id} (7 endpoints)
- **Componentes:** Tabs, Form, Table, Modal, Button
- **Tipo:** Protected (org_admin only)

---

### 🔴 PÁGINAS CRÍTICAS FALTANDO (0% - Bloqueiam)

#### 13. **Conversations (NEW)**
- **Status:** 🔴 NÃO EXISTE
- **Rota:** `/conversations`
- **Prioridade:** MÁXIMA (core business)
- **Features:**
  - List view com search, filter por status/date/contact
  - Real-time updates via WebSocket
  - Last message preview
  - Contact avatar
  - Status badge (open, resolved, assigned)
  - Sort options (recent, oldest, unread)
  - Pagination
  - Bulk actions (mark as resolved, assign, archive)
  - Quick reply options
  - Message count display
- **Detail View (drawer/modal):**
  - Full conversation thread
  - Contact info sidebar (name, phone, email, tags, history)
  - Message composer
  - Attachment support
  - Emoji support
  - File preview
  - Action menu (resolve, assign, transfer, archive)
  - Metadata (created_at, updated_at, assigned_to)
- **Backend:**
  - ✅ GET /conversations (list)
  - ✅ GET /conversations/{id} (detail)
  - ✅ PUT /conversations/{id}/status (update status)
  - ✅ DELETE /conversations/{id} (archive)
  - ✅ WebSocket /ws/conversations/{id} (real-time)
- **Componentes:**
  - ConversationList.tsx
  - ConversationDetail.tsx
  - MessageComposer.tsx
  - ConversationStatusBadge.tsx
  - ContactSidebar.tsx
- **Tipo:** Protected (agent, org_admin)
- **Timeline:** 2-3 days

#### 14. **Conversations Detail** (parte de Conversations)
- **Status:** 🔴 NÃO EXISTE (drawer em modal)
- **Rota:** `/conversations/:id` (drawer)
- **Features:** Vê Conversations acima
- **Timeline:** Incluído em Conversations

#### 15. **Templates Create (NEW)**
- **Status:** 🔴 NÃO EXISTE
- **Rota:** `/templates/create`
- **Features:**
  - Form wizard (nome, categoria, conteúdo)
  - Markdown editor com live preview
  - Variable selector (inserir {{{variable}}})
  - Character counter
  - Save & publish
  - Back/next navigation
  - Auto-save draft
- **Backend:** ✅ POST /templates
- **Componentes:**
  - TemplateForm.tsx
  - TemplateEditor.tsx
  - TemplatePreview.tsx
  - VariableSelector.tsx
- **Tipo:** Protected
- **Timeline:** 1.5 days

#### 16. **Templates Edit (NEW)**
- **Status:** 🔴 NÃO EXISTE
- **Rota:** `/templates/:id`
- **Features:** Similar a Create, mas com dados pré-preenchidos
- **Backend:** ✅ GET/PUT /templates/{id}
- **Componentes:** Same as Create
- **Tipo:** Protected
- **Timeline:** 1 day (reutiliza Templates Create)

#### 17. **Campaigns (NEW)**
- **Status:** 🔴 NÃO EXISTE
- **Rota:** `/campaigns`
- **Prioridade:** MÁXIMA (revenue driver)
- **Features:**
  - List view com status, schedule, metrics
  - Search e filter
  - Status badges (draft, scheduled, running, completed, paused, failed)
  - Scheduled date display
  - Stats (sent, delivered, opened, clicked, replied)
  - Create button
  - Edit action
  - Pause action (se running)
  - Resume action (se paused)
  - Delete action
  - Duplicate action
  - View execution history
  - Sorting (date, status, name)
  - Pagination
  - Skeleton loading
  - Bulk actions (pause, resume, delete)
- **Backend:**
  - ✅ GET /campaigns (list)
  - ✅ POST /campaigns (create)
  - ✅ PUT /campaigns/{id} (update)
  - ✅ DELETE /campaigns/{id} (delete)
  - ✅ GET /campaigns/{id}/executions (history)
- **Componentes:**
  - CampaignList.tsx
  - CampaignCard.tsx
  - CampaignStats.tsx
  - CampaignStatusBadge.tsx
- **Tipo:** Protected
- **Timeline:** 2-3 days

#### 18. **Campaigns Create (NEW)**
- **Status:** 🔴 NÃO EXISTE
- **Rota:** `/campaigns/create`
- **Features:**
  - Multi-step form (wizard):
    1. **Step 1:** Name, description, template selection
    2. **Step 2:** Target contacts (segment, filter, tags)
    3. **Step 3:** Schedule (start date, time, repeat options)
  - Preview of campaign
  - Save as draft ou schedule
  - Back/next navigation
  - Validation per step
- **Backend:** ✅ POST /campaigns
- **Componentes:**
  - CampaignWizard.tsx
  - CampaignFormStep1.tsx
  - CampaignFormStep2.tsx
  - CampaignFormStep3.tsx
  - CampaignScheduler.tsx
  - SegmentSelector.tsx
- **Tipo:** Protected
- **Timeline:** 2 days

#### 19. **Campaigns Edit (NEW)**
- **Status:** 🔴 NÃO EXISTE
- **Rota:** `/campaigns/:id`
- **Features:** Similar a Create, mas com validações (não pode editar após start)
- **Backend:** ✅ PUT /campaigns/{id}
- **Componentes:** Same as Create (com lógica de bloqueio)
- **Tipo:** Protected
- **Timeline:** 1 day (reutiliza Create logic)

#### 20. **Campaigns Execution History (NEW)**
- **Status:** 🔴 NÃO EXISTE (pode ser modal/drawer)
- **Rota:** `/campaigns/:id/executions`
- **Features:**
  - Timeline de execuções
  - Status por execução (sent, delivered, failed)
  - Start/end time
  - Total messages sent
  - Error log
  - Retry options
- **Backend:** ✅ GET /campaigns/{id}/executions
- **Componentes:** Timeline, Table
- **Tipo:** Protected
- **Timeline:** 1 day

---

### 🟡 PÁGINAS IMPORTANTES FALTANDO (Secundárias)

#### 21. **Integrations (NEW)**
- **Status:** 🟡 NÃO EXISTE
- **Rota:** `/integrations`
- **Features:**
  - List de integrações disponíveis (ERP, CRM, etc)
  - Status de conexão (connected, disconnected, error)
  - Actions (connect, disconnect, reconfigure, test)
  - API keys management
  - Webhook URLs display
  - Documentation link
  - Support contact
- **Backend:** ✅ Endpoints prontos
- **Componentes:**
  - IntegrationCard.tsx
  - IntegrationStatusBadge.tsx
  - ApiKeyManager.tsx
- **Tipo:** Protected (org_admin)
- **Timeline:** 2 days

#### 22. **Integrations Detail (NEW)**
- **Status:** 🟡 NÃO EXISTE
- **Rota:** `/integrations/:erpType`
- **Features:**
  - ERP-specific configuration form
  - Authentication flow (OAuth if applicable)
  - Field mapping (WhatsApp fields → ERP fields)
  - Webhook configuration
  - Test connection button
  - Logs (sync history, errors)
  - Disable/enable toggle
- **Backend:** ✅ Endpoints prontos
- **Componentes:**
  - IntegrationForm.tsx
  - FieldMapper.tsx
  - WebhookConfig.tsx
  - SyncLogs.tsx
- **Tipo:** Protected (org_admin)
- **Timeline:** 2-3 days

#### 23. **Reports (NEW)**
- **Status:** 🟡 NÃO EXISTE
- **Rota:** `/reports`
- **Features:**
  - Custom report builder
  - Pre-built report templates:
    - Conversation analytics
    - Campaign performance
    - Contact analytics
    - Agent performance
  - Date range picker
  - Filters (agent, campaign, contact segment, etc)
  - Chart types (line, bar, pie, table)
  - Export options (PDF, CSV, Excel)
  - Schedule recurring reports
  - Email delivery
  - Sharing options
- **Backend:** ✅ GET /analytics/* (9 endpoints)
- **Componentes:**
  - ReportBuilder.tsx
  - ChartRenderer.tsx
  - FilterPanel.tsx
  - ExportOptions.tsx
- **Tipo:** Protected
- **Timeline:** 2-3 days

#### 24. **AI Assistant (NEW)**
- **Status:** 🟡 NÃO EXISTE
- **Rota:** `/ai-assistant`
- **Features:**
  - Chat interface
  - Conversation history
  - Context awareness (current page info)
  - Quick suggestions/prompts
  - Response formatting (code, tables, etc)
  - Clear conversation button
  - Copy response
  - Feedback (like/dislike)
- **Backend:** ✅ 12 AI endpoints prontos
- **Componentes:**
  - ChatInterface.tsx
  - MessageBubble.tsx
  - QuickPrompts.tsx
  - ResponseFormatter.tsx
- **Tipo:** Protected
- **Timeline:** 2 days

#### 25. **Settings - Team (NEW)**
- **Status:** 🟡 NÃO EXISTE
- **Rota:** `/settings/team`
- **Features:**
  - Table de usuários da org
  - Add user form
  - Role selector (org_admin, agent, viewer)
  - Permissions per role
  - Deactivate/activate user
  - Resend invitation
  - Remove user
  - Bulk actions
- **Backend:** ✅ GET/POST/PUT/DELETE /users (10 endpoints)
- **Componentes:**
  - UserTable.tsx
  - UserForm.tsx
  - RoleSelector.tsx
  - PermissionsList.tsx
- **Tipo:** Protected (org_admin only)
- **Timeline:** 2 days

#### 26. **Settings - WhatsApp (NEW)**
- **Status:** 🟡 NÃO EXISTE
- **Rota:** `/settings/whatsapp`
- **Features:**
  - API credential form
  - Phone number configuration
  - Message templates approval status
  - Webhook URL display
  - Test webhook button
  - Rate limits info
  - Connection status indicator
- **Backend:** ✅ GET/PUT endpoints
- **Componentes:**
  - WhatsAppForm.tsx
  - ApiKeyInput.tsx
  - WebhookConfig.tsx
  - ConnectionStatus.tsx
- **Tipo:** Protected (org_admin)
- **Timeline:** 1.5 days

#### 27. **Settings - Webhooks (NEW)**
- **Status:** 🟡 NÃO EXISTE
- **Rota:** `/settings/webhooks`
- **Features:**
  - List webhooks
  - Create webhook form (URL, events, active toggle)
  - Edit webhook
  - Delete webhook
  - Test webhook
  - Webhook logs (deliveries, failures, retries)
  - Retry options
  - Signature verification info
- **Backend:** ✅ Endpoints prontos
- **Componentes:**
  - WebhookTable.tsx
  - WebhookForm.tsx
  - WebhookLogs.tsx
  - TestWebhookButton.tsx
- **Tipo:** Protected (org_admin)
- **Timeline:** 2 days

---

### 🟢 PÁGINAS SECUNDÁRIAS/PÚBLICAS (Podem esperar)

#### 28-38. Páginas Públicas/Misc
```
❌ 28. Messages/Send (compose modal, can be drawer in Conversations)
❌ 29. Profile/[id] (user profile public/private view)
❌ 30. 403.tsx (error page)
❌ 31. 404.tsx (error page)
❌ 32. 500.tsx (error page)
❌ 33. Pricing.tsx (pricing table, public)
❌ 34. Demo.tsx (demo page, public)
❌ 35. Privacy.tsx (privacy policy, public)
❌ 36. Terms.tsx (terms of service, public)
❌ 37. Documentation.tsx (API docs, internal)
❌ 38. Changelog.tsx (changelog, internal)
```

**Prioridade:** BAIXA - Pode ser implementado depois

---

## 🎨 Componentes Reutilizáveis Checklist

### ✅ DISPONÍVEIS (Shadcn/ui)
- [x] Button
- [x] Input
- [x] Form
- [x] Card
- [x] Dialog
- [x] Dropdown
- [x] Badge
- [x] Avatar
- [x] Table
- [x] Tabs
- [x] Select
- [x] Textarea
- [x] Checkbox
- [x] Radio
- [x] Label
- [x] Skeleton
- [x] Toast
- [x] Alert

### 🟡 CRIAR/CUSTOMIZAR
- [ ] StatusBadge (com cores por status)
- [ ] LoadingSkeleton (genérico)
- [ ] ErrorBoundary (error handling)
- [ ] EmptyState (generic empty state card)
- [ ] FilterPanel (reusable filter component)
- [ ] DataTable (enhanced table com sort/filter)
- [ ] Modal/Drawer (generic modal)
- [ ] ConfirmDialog (delete confirmation)
- [ ] NotificationToast (success/error)
- [ ] PageHeader (title + breadcrumb + actions)
- [ ] DateRangePicker (date range selection)
- [ ] TimezonePicker (timezone selection)
- [ ] AvatarGroup (multiple avatars)
- [ ] ProgressBar (progress indicator)
- [ ] StepperWizard (multi-step form)
- [ ] ChartContainer (wrapper para gráficos)
- [ ] ImageUploader (with preview)
- [ ] FileUploader (CSV, etc)

---

## 📊 Comparação: Current vs Expected

### Flows.tsx
```
CURRENT:
✅ List view (grid layout)
✅ Search
✅ Filter por status
✅ Basic action buttons
✅ Status badges
✅ Stats (messages, triggers, updated)

MISSING:
❌ Create flow modal/form
❌ Edit flow modal/form
❌ View details modal
❌ Execution logs/history
❌ Pagination
❌ Skeleton loading
❌ Advanced filters
❌ Sorting options
❌ Duplicate action
❌ WebSocket real-time updates
```

### Templates.tsx
```
CURRENT:
✅ Grid view

MISSING:
❌ Create page (/templates/create)
❌ Edit page (/templates/:id)
❌ Markdown preview
❌ Variable selector
❌ Category/tags
❌ Search
❌ Pagination
❌ Duplicate action
❌ "Use in campaign" action
```

### Conversations.tsx
```
CURRENT:
❌ PÁGINA NÃO EXISTE

NECESSÁRIO:
✅ List view com search/filter
✅ Real-time WebSocket updates
✅ Detail drawer/modal
✅ Message composer
✅ Attachment support
✅ Contact sidebar
✅ Action menu
```

---

## 🔄 Padrões de Código a Usar

### Pattern 1: API Call com Error Handling
```typescript
const [data, setData] = useState([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/endpoint`,
        { headers: getAuthHeaders() }
      )
      if (!response.ok) throw new Error('Failed to fetch')
      const result = await response.json()
      setData(result.items || result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setLoading(false)
    }
  }
  
  fetchData()
}, [])
```

### Pattern 2: CRUD com Modal
```typescript
const [items, setItems] = useState([])
const [isOpen, setIsOpen] = useState(false)
const [selected, setSelected] = useState<Item | null>(null)

const handleSave = async (formData: ItemForm) => {
  const method = selected ? 'PUT' : 'POST'
  const endpoint = selected ? `/items/${selected.id}` : '/items'
  
  const response = await fetch(`${getApiUrl()}/api/v1${endpoint}`, {
    method,
    headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  
  if (response.ok) {
    // Refetch or update local state
    setIsOpen(false)
    setSelected(null)
  }
}
```

### Pattern 3: Real-time WebSocket
```typescript
useEffect(() => {
  const ws = new WebSocket(
    `${getWebSocketUrl()}/ws/conversations`
  )
  
  ws.onmessage = (event) => {
    const message = JSON.parse(event.data)
    setConversations(prev => [...prev, message])
  }
  
  return () => ws.close()
}, [])
```

---

## 📋 Dependências & Tecnologias

### Core
- React 19
- TypeScript
- Vite (bundler)
- Tailwind CSS
- Shadcn/ui

### Charts & Data Viz
- Chart.js ou Recharts (para gráficos)
- Date-fns (date handling)

### Forms
- React Hook Form (já usando)
- Zod (schema validation, opcional)

### Utilities
- clsx (class merging)
- date-fns (date utilities)
- lodash (utility functions)

### WebSocket
- Native WebSocket API (já implementado)

---

## ⚡ Performance Considerations

1. **Pagination:** Implementar para listas > 50 itens
2. **Virtual Scrolling:** Para listas muito grandes (contacts)
3. **Skeleton Loading:** Em todas as páginas
4. **Error Boundaries:** Em páginas críticas
5. **Lazy Loading:** Para modais/drawers
6. **Debouncing:** Em search inputs
7. **Caching:** Considerar React Query ou SWR
8. **Code Splitting:** Por rota

---

## 📞 Quick Reference

**Template Create Exemplo:**
```
File: frontend/src/pages/templates/create.tsx
Pattern: Form com validation
Backend: POST /templates
Componentes: TemplateEditor, TemplatePreview
```

**Conversations Exemplo:**
```
Files:
- frontend/src/pages/conversations.tsx (list)
- frontend/src/components/ConversationDetail.tsx (drawer)
Pattern: Real-time updates via WebSocket
Backend: GET /conversations, WebSocket /ws/conversations/{id}
Componentes: ConversationList, MessageComposer
```

---

**Documento Criado:** November 24, 2025  
**Implementado por:** Kayo Carvalho Fernandes  
**Versão:** 1.0
