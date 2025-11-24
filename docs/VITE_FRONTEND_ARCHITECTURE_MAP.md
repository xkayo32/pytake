# 🗺️ PyTake Frontend Architecture Map

**Data:** November 24, 2025  
**Implementado por:** Kayo Carvalho Fernandes

---

## 📊 Página Roadmap Visual (38 páginas)

```
PYTAKE FRONTEND - 38 PÁGINAS TOTAL
══════════════════════════════════════════════════════════════

✅ COMPLETE (12 páginas) - 31%
┌─────────────────────────────────────────────────────────┐
│ ✅ Home/Index        ✅ Login         ✅ Register        │
│ ✅ Dashboard*        ✅ Profile       ✅ Flows*          │
│ ✅ Flows Edit        ✅ Templates*    ✅ Contacts*       │
│ ✅ Automations*      ✅ Analytics*    ✅ Settings*       │
└─────────────────────────────────────────────────────────┘
    (* = Basic, needs enhancement)

🔴 CRITICAL MISSING (7 páginas) - 19%
┌─────────────────────────────────────────────────────────┐
│ ❌ Conversations       ❌ Conversations Detail            │
│ ❌ Templates Create    ❌ Templates Edit                  │
│ ❌ Campaigns           ❌ Campaigns Create                │
│ ❌ Campaigns Edit                                         │
└─────────────────────────────────────────────────────────┘
    ⚠️ BLOCKER: Core business can't work without these

🟡 IMPORTANT MISSING (11 páginas) - 29%
┌─────────────────────────────────────────────────────────┐
│ ❌ Contacts Enhanced   ❌ Flows Enhanced                  │
│ ❌ Dashboard Enhanced  ❌ Campaigns Executions            │
│ ❌ Settings Team       ❌ Settings WhatsApp               │
│ ❌ Settings Webhooks   ❌ AI Assistant                    │
│ ❌ Integrations        ❌ Integrations Detail             │
│ ❌ Reports                                                │
└─────────────────────────────────────────────────────────┘
    Important for full feature set

🟢 SECONDARY (8 páginas) - 21%
┌─────────────────────────────────────────────────────────┐
│ ❌ Messages Send       ❌ Profile Detail                  │
│ ❌ Error Pages         ❌ Pricing                         │
│ ❌ Demo               ❌ Privacy                          │
│ ❌ Terms              ❌ Changelog                        │
└─────────────────────────────────────────────────────────┘
    Nice to have, can wait
```

---

## 🏗️ Component Architecture

```
FRONTEND STRUCTURE
══════════════════════════════════════════════════════════════

frontend/src/
├── pages/ (38 rotas)
│   ├── index.tsx (Home)
│   ├── login.tsx (✅ Done)
│   ├── register.tsx (✅ Done)
│   ├── dashboard.tsx (🟡 Basic → Add Charts)
│   ├── profile.tsx (✅ Done)
│   ├── flows.tsx (🟡 Basic → Add Modals)
│   ├── flows-edit.tsx (✅ Done)
│   ├── templates.tsx (🟡 Basic → Add Pages)
│   ├── templates/
│   │   ├── create.tsx (❌ NEW)
│   │   └── [id].tsx (❌ NEW)
│   ├── contacts.tsx (🟡 Basic → Enhance)
│   ├── conversations.tsx (❌ NEW)
│   ├── conversations/
│   │   └── [id].tsx (❌ NEW - as drawer)
│   ├── campaigns.tsx (❌ NEW)
│   ├── campaigns/
│   │   ├── create.tsx (❌ NEW)
│   │   └── [id].tsx (❌ NEW)
│   ├── automations.tsx (🟡 Basic)
│   ├── analytics.tsx (🟡 Basic)
│   ├── ai-assistant.tsx (❌ NEW)
│   ├── integrations.tsx (❌ NEW)
│   ├── integrations/
│   │   └── [erpType].tsx (❌ NEW)
│   ├── reports.tsx (❌ NEW)
│   ├── settings.tsx (✅ Main)
│   ├── settings/
│   │   ├── team.tsx (❌ NEW)
│   │   ├── whatsapp.tsx (❌ NEW)
│   │   └── webhooks.tsx (❌ NEW)
│   └── 404.tsx (✅ Implicit)
│
├── components/ (~50+ componentes)
│   ├── Conversations/
│   │   ├── ConversationList.tsx (❌ NEW)
│   │   ├── ConversationCard.tsx (❌ NEW)
│   │   ├── ConversationDetail.tsx (❌ NEW)
│   │   ├── MessageComposer.tsx (❌ NEW)
│   │   ├── MessageBubble.tsx (❌ NEW)
│   │   ├── ContactSidebar.tsx (❌ NEW)
│   │   └── ConversationStatusBadge.tsx (❌ NEW)
│   │
│   ├── Templates/
│   │   ├── TemplateList.tsx (✅ Exists)
│   │   ├── TemplateForm.tsx (❌ NEW)
│   │   ├── TemplateEditor.tsx (❌ NEW)
│   │   ├── TemplatePreview.tsx (❌ NEW)
│   │   └── VariableSelector.tsx (❌ NEW)
│   │
│   ├── Campaigns/
│   │   ├── CampaignList.tsx (❌ NEW)
│   │   ├── CampaignCard.tsx (❌ NEW)
│   │   ├── CampaignWizard.tsx (❌ NEW)
│   │   ├── CampaignFormStep1.tsx (❌ NEW)
│   │   ├── CampaignFormStep2.tsx (❌ NEW)
│   │   ├── CampaignFormStep3.tsx (❌ NEW)
│   │   ├── CampaignScheduler.tsx (❌ NEW)
│   │   ├── CampaignStats.tsx (❌ NEW)
│   │   ├── CampaignStatusBadge.tsx (❌ NEW)
│   │   ├── SegmentSelector.tsx (❌ NEW)
│   │   └── CampaignExecutionHistory.tsx (❌ NEW)
│   │
│   ├── Flows/
│   │   ├── FlowList.tsx (✅ Exists)
│   │   ├── FlowCard.tsx (✅ Exists)
│   │   ├── FlowCreateModal.tsx (❌ NEW)
│   │   ├── FlowEditModal.tsx (❌ NEW)
│   │   ├── FlowDetailView.tsx (❌ NEW)
│   │   ├── FlowExecutionLogs.tsx (❌ NEW)
│   │   └── FlowStatusBadge.tsx (❌ NEW)
│   │
│   ├── Shared/
│   │   ├── StatusBadge.tsx (❌ NEW)
│   │   ├── LoadingSkeleton.tsx (❌ NEW)
│   │   ├── ErrorBoundary.tsx (❌ NEW)
│   │   ├── EmptyState.tsx (❌ NEW)
│   │   ├── FilterPanel.tsx (❌ NEW)
│   │   ├── DataTable.tsx (❌ NEW)
│   │   ├── ConfirmDialog.tsx (❌ NEW)
│   │   ├── PageHeader.tsx (❌ NEW)
│   │   ├── DateRangePicker.tsx (❌ NEW)
│   │   └── ChartContainer.tsx (❌ NEW)
│   │
│   ├── Settings/
│   │   ├── UserTable.tsx (❌ NEW)
│   │   ├── UserForm.tsx (❌ NEW)
│   │   ├── RoleSelector.tsx (❌ NEW)
│   │   ├── WhatsAppForm.tsx (❌ NEW)
│   │   ├── WebhookConfig.tsx (❌ NEW)
│   │   ├── WebhookLogs.tsx (❌ NEW)
│   │   └── ConnectionStatus.tsx (❌ NEW)
│   │
│   ├── Integrations/
│   │   ├── IntegrationCard.tsx (❌ NEW)
│   │   ├── IntegrationForm.tsx (❌ NEW)
│   │   ├── FieldMapper.tsx (❌ NEW)
│   │   └── SyncLogs.tsx (❌ NEW)
│   │
│   ├── Dashboard/
│   │   ├── DashboardChart.tsx (❌ NEW)
│   │   ├── KPICard.tsx (❌ NEW)
│   │   ├── TrendIndicator.tsx (❌ NEW)
│   │   └── MetricsGrid.tsx (❌ NEW)
│   │
│   ├── ui/ (✅ Shadcn/ui - 50+)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── form.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── table.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── badge.tsx
│   │   ├── avatar.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   └── ... (40+ mais)
│   │
│   ├── Layout/
│   │   ├── Header.tsx (✅ Exists)
│   │   ├── Sidebar.tsx (✅ Exists)
│   │   └── Footer.tsx (✅ Exists)
│   │
│   └── Auth/
│       ├── LoginForm.tsx (✅ Exists)
│       ├── RegisterForm.tsx (✅ Exists)
│       └── ProtectedRoute.tsx (✅ Exists)
│
├── lib/
│   ├── api.ts (✅ getApiUrl, getAuthHeaders)
│   ├── websocket.ts (✅ getWebSocketUrl, WebSocket)
│   ├── auth.ts (✅ auth context)
│   ├── hooks.ts (✅ useAuth, etc)
│   └── utils.ts (✅ helpers)
│
└── public/
    └── ... (images, icons, etc)
```

---

## 🔄 Data Flow Architecture

```
USER → FRONTEND → API → BACKEND → DATABASE
═══════════════════════════════════════════

1. USER INTERACTION
   └─> Click "Create Campaign" button
   
2. FRONTEND COMPONENT
   └─> CampaignWizard.tsx (form with validation)
   
3. API CALL
   ├─> URL: `${getApiUrl()}/api/v1/campaigns`
   ├─> Method: POST
   ├─> Headers: {...getAuthHeaders(), 'Content-Type': 'application/json'}
   └─> Body: { name, description, template_id, contacts, schedule }
   
4. BACKEND ROUTE
   ├─> POST /api/v1/campaigns
   ├─> Handler: create_campaign() in endpoints/campaigns.py
   ├─> Validation: Pydantic model CampaignCreate
   └─> Service: CampaignService.create_campaign()
   
5. BUSINESS LOGIC (Service)
   ├─> Check permissions (org_admin, agent)
   ├─> Check organization_id scope
   ├─> Generate campaign ID
   └─> Call repository to save
   
6. DATABASE (Repository)
   ├─> INSERT INTO campaigns (...)
   ├─> COMMIT transaction
   └─> Return created campaign
   
7. RESPONSE FLOW
   ├─> Backend: CampaignResponse (Pydantic)
   ├─> Frontend: JSON → TypeScript type
   ├─> Component: Update UI state
   └─> User: See new campaign in list
   
8. REAL-TIME UPDATES (Optional)
   └─> WebSocket: Other users see new campaign instantly
       POST /ws/campaigns/stream
       Message: { action: 'create', campaign: {...} }
```

---

## 📊 Status Timeline

```
WEEK 1 (Days 1-5)          WEEK 2 (Days 6-10)      WEEK 3-4 (Days 11-20)
═════════════════          ═══════════════════     ═════════════════════

Day 1-2                    Day 6-7                 Day 11-12
❌→✅ Conversations        🟡→✅ Contacts          ✅ AI Assistant
  (list + detail)            (enhanced)            

Day 3-4                    Day 8-9                 Day 13-14
❌→✅ Templates             🟡→✅ Flows             ✅ Integrations
  (create + edit)            (enhanced)            
                                                    
Day 5                      Day 10                  Day 15-20
❌→✅ Campaigns             🟡→✅ Dashboard         ✅ Reports
  (list + wizard)            (charts)              ✅ Testing
                             🟡→✅ Settings        ✅ Polish

SPRINT 1              SPRINT 2              SPRINT 3
─────────            ─────────            ─────────
CRITICAL             IMPORTANT            NICE-TO-HAVE
(Core business)      (Good UX)            (Advanced)
5 tasks              5 tasks              3 tasks
```

---

## 🎯 Component Dependencies Map

```
Conversations Page
  └─ ConversationList (grid/list)
      ├─ ConversationCard
      │   └─ ConversationStatusBadge
      │   └─ Avatar
      │   └─ Button (action menu)
      └─ ConversationDetail (drawer)
          ├─ MessageBubble (repeated)
          ├─ MessageComposer
          │   ├─ Input
          │   ├─ Button (send)
          │   └─ IconButton (emoji, attachment)
          └─ ContactSidebar
              ├─ Avatar
              ├─ Badge (tags)
              └─ ConversationHistory

Campaigns Page
  └─ CampaignList
      ├─ CampaignCard
      │   ├─ CampaignStatusBadge
      │   └─ CampaignStats
      └─ Modal (create/edit)
          └─ CampaignWizard
              ├─ CampaignFormStep1
              ├─ CampaignFormStep2
              │   └─ SegmentSelector
              ├─ CampaignFormStep3
              │   └─ CampaignScheduler
              │       └─ DatePicker + TimePicker
              └─ CampaignPreview

Dashboard
  └─ MetricsGrid
      ├─ KPICard (4x)
      │   └─ TrendIndicator
      └─ ChartContainer (2x)
          └─ Recharts (LineChart, BarChart)
```

---

## 🔐 Authentication & Authorization Flow

```
RBAC ARCHITECTURE
═════════════════════════════════════════════

Roles:
  super_admin (platform)
    └─ Can access: Everything
    
  org_admin (organization)
    └─ Can access: All org data, team management, settings
    
  agent (user)
    └─ Can access: Conversations, campaigns, templates
    
  viewer (read-only)
    └─ Can access: Dashboards, reports (read-only)

Protected Routes (Frontend):
  ├─ /conversations → requireRole(['agent', 'org_admin'])
  ├─ /campaigns → requireRole(['agent', 'org_admin'])
  ├─ /settings → requireRole(['org_admin'])
  ├─ /reports → requireRole(['agent', 'org_admin', 'viewer'])
  └─ /integrations → requireRole(['org_admin'])

API Authorization (Backend):
  ├─ GET /conversations → Check role + organization_id filter
  ├─ POST /campaigns → Check org_admin or agent role + org_id
  ├─ PUT /campaigns/{id} → Check ownership + role
  ├─ DELETE /conversations/{id} → Check org_admin role
  └─ All endpoints filter by organization_id
```

---

## 🗄️ Multi-Tenancy Architecture

```
DATA ISOLATION (All resources scoped by organization_id)
════════════════════════════════════════════════════════

Organization A (org_id: 1)
  ├─ Conversations (10 records, all org_id=1)
  ├─ Campaigns (5 records, all org_id=1)
  ├─ Contacts (200 records, all org_id=1)
  └─ Users (5 users, all org_id=1)

Organization B (org_id: 2)
  ├─ Conversations (8 records, all org_id=2)
  ├─ Campaigns (3 records, all org_id=2)
  ├─ Contacts (150 records, all org_id=2)
  └─ Users (4 users, all org_id=2)

Frontend Enforcement:
  ├─ getAuthHeaders() includes user's org_id
  ├─ All API calls filter by org_id automatically
  ├─ Cannot access org_id ≠ user's org_id
  └─ API returns 403 if org_id mismatch

Backend Enforcement:
  ├─ All queries: WHERE organization_id = {user_org_id}
  ├─ All inserts: SET organization_id = {user_org_id}
  ├─ All updates: WHERE id = X AND organization_id = {user_org_id}
  ├─ All deletes: WHERE id = X AND organization_id = {user_org_id}
  └─ 100% queryable isolation (PostgreSQL)
```

---

## 🔌 WebSocket Real-time Architecture

```
REAL-TIME UPDATES (WebSocket)
═════════════════════════════════════════════

Connection Flow:
  Frontend → Establish WebSocket
    ↓
  `wss://api-dev.pytake.net/ws/conversations`
    ↓
  Backend → Accept connection + Verify auth
    ↓
  Store connection in connection pool (Redis)
    ↓
  Listen for events

Message Flow (Example: New Message):
  User A sends message
    ↓
  POST /api/v1/conversations/{id}/messages
    ↓
  Backend saves message → Database
    ↓
  Backend publishes event: "new_message"
    ↓
  WebSocket handler broadcasts to all subscribers
    ↓
  All connected clients receive update
    ↓
  Frontend updates UI in real-time
    ↓
  User sees new message instantly

Implemented Endpoints:
  ✅ /ws/conversations/{id} - Real-time message stream
  ✅ /ws/campaigns - Campaign execution updates
  ✅ /ws/dashboard - Dashboard metrics updates

Frontend Implementation:
  const ws = new WebSocket(`${getWebSocketUrl()}/ws/conversations/{id}`)
  ws.onmessage = (e) => handleUpdate(JSON.parse(e.data))
  ws.onerror = () => handleError()
  ws.onclose = () => handleReconnect()
```

---

## 📈 Performance Optimization Points

```
PERFORMANCE CONSIDERATIONS
═════════════════════════════════════════════

List Pages (Frontend):
  ├─ Pagination: 50 items per page (not load all)
  ├─ Lazy Loading: modals/drawers loaded on demand
  ├─ Debouncing: search input (300ms delay)
  ├─ Virtual Scrolling: for contact lists (1000+ items)
  └─ Caching: Consider React Query or SWR

API Calls (Backend):
  ├─ Pagination: /conversations?page=1&limit=50
  ├─ Filtering: /campaigns?status=running (server-side)
  ├─ Sorting: /contacts?sort=name&order=asc
  ├─ Projection: /users?fields=id,name,email (not all)
  └─ Compression: gzip enabled on Nginx

Database (PostgreSQL):
  ├─ Indexes: on organization_id (already done)
  ├─ Indexes: on status, created_at (need to add)
  ├─ Connection pooling: via SQLAlchemy
  ├─ Query caching: via Redis (optional)
  └─ Slow query logs: monitor > 100ms

Frontend Bundling (Vite):
  ├─ Code splitting: per route
  ├─ Tree shaking: remove dead code
  ├─ Minification: production build
  ├─ Images: optimize PNG/JPG
  └─ CDN: serve static from Nginx

Monitoring:
  ├─ Frontend: Measure Web Vitals (LCP, FID, CLS)
  ├─ Backend: Log API response times
  ├─ Database: Monitor query performance
  └─ WebSocket: Monitor connection count
```

---

## 🚀 Deployment Architecture

```
DEVELOPMENT (Current)
════════════════════════════════════════

localhost:3001 (Frontend)
    ↓
https://api-dev.pytake.net (Nginx reverse proxy)
    ↓
localhost:8002 (Backend FastAPI)
    ↓
PostgreSQL (5435)
Redis (6382)
MongoDB (27020)

Docker Compose:
  podman compose up -d

All containers on same network: pytake-dev_pytake-network


STAGING/PRODUCTION (Disabled in CI/CD)
════════════════════════════════════════

See .github/CI_CD_DEV_ONLY.md for why disabled.
Only test.yml and build.yml run automatically.
```

---

## 📝 File Tree Summary

```
docs/
├── VITE_FRONTEND_README.md ← Navigation guide
├── VITE_FRONTEND_EXECUTIVE_SUMMARY.md ← Quick start
├── VITE_FRONTEND_MIGRATION_PLAN.md ← Detailed plan
├── VITE_PAGES_DETAILED_ANALYSIS.md ← Page by page
├── FRONTEND_IMPLEMENTATION_TASKS.md ← Action items
├── VITE_FRONTEND_SUMMARY.json ← Quick reference
└── VITE_FRONTEND_ARCHITECTURE_MAP.md ← This file

frontend/src/
├── pages/ (38 rotas - 12 done, 26 todo)
├── components/ (50+ componentes - 30 todo)
├── lib/ (utilities - 100% done)
└── public/ (assets)

backend/app/
├── api/v1/endpoints/ (145+ endpoints - 100% done)
├── schemas/ (Pydantic models)
├── services/ (business logic)
└── repositories/ (data access)
```

---

## ✅ Next Steps (Visual)

```
START HERE
    ↓
Read VITE_FRONTEND_EXECUTIVE_SUMMARY.md (10 min)
    ↓
Read FRONTEND_IMPLEMENTATION_TASKS.md (10 min)
    ↓
Review Flows.tsx (pattern example) (15 min)
    ↓
Create branch: feature/TASK-001-conversations
    ↓
Implement Conversations.tsx (list view)
    ↓
Implement ConversationDetail.tsx (drawer)
    ↓
Connect WebSocket real-time
    ↓
Make first PR to develop
    ↓
✅ DONE - Merge + Continue to Task 2
```

---

**Documento Criado:** November 24, 2025  
**Implementado por:** Kayo Carvalho Fernandes  
**Versão:** 1.0  
**Status:** 🟢 Pronto para Referência
