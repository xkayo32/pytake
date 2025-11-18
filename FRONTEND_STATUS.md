# 📊 Frontend - Status de Implementação

**Data:** 17 de Novembro de 2025  
**Status:** ⏳ **PARCIALMENTE IMPLEMENTADO**

---

## ✅ O Que Já Existe

### 1. **BulkDispatchModal** ✅
**Localização:** `frontend/src/components/admin/builder/BulkDispatchModal.tsx` (504 linhas)

**O Que Faz:**
- ✅ Input de números (lista ou CSV)
- ✅ Parsing de CSV com headers
- ✅ Mapeamento de variáveis (CSV → Variáveis do Flow)
- ✅ Seleção de número WhatsApp
- ✅ Schedule (agendar disparo)
- ✅ Cria `FlowAutomation` na API
- ✅ Inicia execução via `/flow-automations/{id}/start`

**Limitações Atuais:**
- ❌ Sem suporte a recorrência (daily, weekly, monthly, cron)
- ❌ Sem gerenciamento de exceções (skip, reschedule, modify)
- ❌ Sem preview de próximas execuções
- ❌ Sem integração com nova API de scheduling

### 2. **Execution Monitor** ✅
**Localização:** `frontend/src/app/admin/flow-automations/[id]/execution/[execution_id]/page.tsx` (71 linhas)

**O Que Faz:**
- ✅ Monitor de execução individual
- ✅ Busca stats de automação

**Limitações:**
- ❌ Implementação incompleta (só fetch de stats)
- ❌ Sem visualização real de recipients
- ❌ Sem status em tempo real

---

## ❌ O Que Falta (TODO)

### 🎯 Prioridade Alta - Essencial

#### 1. **Dashboard de Automações** 
**Rota:** `/admin/flow-automations`  
**Arquivo:** `frontend/src/app/admin/flow-automations/page.tsx`

```
Componentes Necessários:
├─ Header com "Nova Automação" button
├─ Filters (status, busca)
├─ DataTable com colunas:
│  ├─ Nome
│  ├─ Status (draft, active, paused, completed, archived)
│  ├─ Tipo (manual, scheduled, cron, webhook, event)
│  ├─ Stats (total_sent, total_delivered, total_completed, total_failed)
│  ├─ Próxima execução (next_scheduled_at)
│  ├─ Última execução (last_executed_at)
│  └─ Ações (Play, Edit, Duplicate, Delete)
└─ EmptyState se vazio

API Usada:
- GET /api/v1/flow-automations?status=&limit=100
- POST /api/v1/flow-automations/{id}/start (Play)
- DELETE /api/v1/flow-automations/{id} (Delete)
- POST /api/v1/flow-automations/{id}/pause (Pause)
```

**Requisitos:**
- Listar automações (com paginação)
- Filtrar por status
- Busca por nome
- Ações: Play, Edit, Duplicate, Delete, Archive
- Real-time updates via WebSocket (opcional)

#### 2. **Nova Automação - Stepper com Schedule**
**Rota:** `/admin/flow-automations/new`  
**Arquivo:** `frontend/src/app/admin/flow-automations/new/page.tsx`

```
Steps:
1. Informações Básicas
   ├─ Name
   ├─ Description
   ├─ Chatbot
   ├─ Flow
   └─ WhatsApp Number

2. Audiência
   ├─ Tipo (all, custom, tags, segment, uploaded)
   └─ Config apropriada

3. Variáveis
   ├─ Mapeamento JSON
   └─ Preview

4. [NOVO] AGENDAMENTO ← Falta!
   ├─ Tipo de Recorrência
   ├─ Config de cada tipo
   ├─ Execution Window
   ├─ Blackout Dates
   └─ Preview (próximas execuções)
```

#### 3. **Schedule Editor Component** 
**Localização:** `frontend/src/components/admin/flow-automations/ScheduleEditor.tsx`

```
Props:
- schedule: FlowAutomationSchedule
- onSave: (schedule) => void
- onCancel: () => void

Seções:
├─ Recurrence Type Selector
│  ├─ Once
│  ├─ Daily (interval)
│  ├─ Weekly (days selector)
│  ├─ Monthly (day of month)
│  ├─ Cron (expression editor com helper)
│  └─ Custom (date picker list)
│
├─ Execution Window
│  ├─ Start time (09:00)
│  └─ End time (18:00)
│
├─ Business Rules
│  ├─ Skip weekends (toggle)
│  ├─ Skip holidays (toggle)
│  └─ Blackout dates (date range picker)
│
├─ Timezone Selector
│  └─ Default: America/Sao_Paulo
│
└─ Preview (Calendar)
   └─ Próximas 10 execuções com datas
```

#### 4. **Calendar Preview Component**
**Localização:** `frontend/src/components/admin/flow-automations/CalendarPreview.tsx`

```
Exibe:
├─ Mini calendar com datas agendadas marcadas
├─ Lista de próximas N execuções
│  └─ Cada linha: data, hora, status
└─ Legenda de cores:
   ├─ Verde: Execução normal
   ├─ Amarelo: Dentro de execution window
   ├─ Cinza: Skipped (weekend/holiday)
   └─ Vermelho: Erro/blackout

API:
- GET /api/v1/flow-automations/{id}/schedule/preview?num_executions=10&days_ahead=30
```

---

### 🎯 Prioridade Média - Importante

#### 5. **Detail/Edit Automation Page**
**Rota:** `/admin/flow-automations/{id}`

```
Tabs:
├─ Informações (readonly ou editar)
├─ Agendamento (integra ScheduleEditor)
├─ Histórico de Execuções
├─ Recipients (tabela com status)
└─ Exceptions (gerenciar skip/reschedule/modify)
```

#### 6. **Exceptions Manager Component**
**Localização:** `frontend/src/components/admin/flow-automations/ExceptionsManager.tsx`

```
Funcionalidades:
├─ Listar exceções
├─ Adicionar exceção (skip, reschedule, modify)
├─ Editar exceção
├─ Deletar exceção
│
Modal de Criação:
├─ Tipo (skip/reschedule/modify)
├─ Data início e fim
├─ Descrição/Motivo
└─ Config específica do tipo
```

#### 7. **Execution History**
**Localização:** `frontend/src/components/admin/flow-automations/ExecutionHistory.tsx`

```
Tabela com:
├─ Data/Hora
├─ Status (processing, completed, failed, partial)
├─ Total enviados
├─ Total entregues
├─ Total completados
├─ Taxa de sucesso
├─ Ação: View Details

Details Modal:
├─ Stats agregadas
├─ Tabela de recipients com filtros
│  └─ Coluna: nome, phone, status, erro (se houver)
└─ Option: Retry failed recipients
```

---

### 🎯 Prioridade Baixa - Bônus

#### 8. **Real-time Updates (WebSocket)**
```
- WebSocket na lista de automações
- Mostra stats em tempo real
- Alerta quando execução termina
```

#### 9. **Advanced Filters**
```
- Filter por execution window
- Filter por próxima execução (dentro de X dias)
- Filter por taxa de sucesso
```

#### 10. **Bulk Actions**
```
- Multi-select com ações em batch
- Exemplo: Ativar 5 automações de uma vez
```

---

## 📋 Arquivos Necessários

### Backend (✅ JÁ IMPLEMENTADO)
```
✅ app/tasks/flow_automation_tasks.py
✅ app/models/flow_automation.py (+Schedule, +Exception)
✅ app/services/flow_automation_schedule_service.py
✅ app/schemas/flow_automation.py (+Schedule schemas)
✅ app/api/v1/endpoints/flow_automations.py (+7 endpoints)
```

### Frontend (⏳ EM PROGRESSO)

**Essencial (Needs):**
```
❌ /admin/flow-automations/page.tsx (Dashboard)
❌ /admin/flow-automations/new/page.tsx (New with Schedule Step)
❌ /admin/flow-automations/[id]/page.tsx (Detail/Edit)
❌ components/admin/flow-automations/ScheduleEditor.tsx
❌ components/admin/flow-automations/CalendarPreview.tsx
❌ components/admin/flow-automations/ExecutionHistory.tsx
❌ components/admin/flow-automations/ExceptionsManager.tsx
❌ types/flow_automation.ts (Types para schedule)
```

**Útil:**
```
⏳ lib/api/flowAutomationsAPI.ts (API client com tipos)
❌ hooks/useFlowAutomations.ts (SWR hook para fetch)
```

---

## 🔄 Fluxo Completo Atual

### ✅ Implementado (Hoje)
```
User → Builder
  └─ Click "Enviar para múltiplos" 
     └─ BulkDispatchModal abre
        ├─ Input números (CSV/lista)
        ├─ Map variáveis
        ├─ Schedule (único, agora)
        └─ Create FlowAutomation + Start ✅

Backend recebe → Process recipients
  └─ Celery tasks paralelos
     └─ Executam flows para cada contato ✅
```

### ❌ Faltando (Implementar)
```
User → AdminDashboard
  └─ Lista automações agendadas
     └─ Vê próximas execuções
        └─ Gerencia agendamento (daily, weekly, cron)
           └─ Adiciona exceções
              └─ [Backend executa com Celery Beat] ← Needs Scheduler!
```

---

## 🎯 Próximos Passos Recomendados

### Esta Semana
1. [ ] Implementar Dashboard (`/admin/flow-automations/page.tsx`)
2. [ ] Adicionar Step 4 (Schedule) ao New page
3. [ ] Criar ScheduleEditor + CalendarPreview components

### Próxima Semana
1. [ ] Implementar Detail page com tabs
2. [ ] Exceptions Manager
3. [ ] Execution History

### Após Banco Completo
1. [ ] Celery Beat Scheduler (backend job runner)
2. [ ] WebSocket real-time updates

---

## 📚 Tipos Necessários

**Criar arquivo:** `frontend/src/types/flow_automation.ts`

```typescript
export interface FlowAutomationSchedule {
  id: string;
  automation_id: string;
  recurrence_type: 'once' | 'daily' | 'weekly' | 'monthly' | 'cron' | 'custom';
  start_date: string; // ISO
  start_time: string; // HH:MM:SS
  recurrence_config: Record<string, any>;
  execution_window_start?: string;
  execution_window_end?: string;
  skip_weekends?: boolean;
  skip_holidays?: boolean;
  blackout_dates?: string[];
  timezone: string;
  last_executed_at?: string;
  next_scheduled_at: string;
  exceptions: FlowAutomationScheduleException[];
  created_at: string;
  updated_at: string;
}

export interface FlowAutomationScheduleException {
  id: string;
  schedule_id: string;
  exception_type: 'skip' | 'reschedule' | 'modify';
  start_date: string;
  end_date?: string;
  rescheduled_to?: string;
  modified_config?: Record<string, any>;
  reason?: string;
  created_at: string;
}

export interface SchedulePreview {
  next_executions: Array<{
    scheduled_at: string;
    execution_window: {
      start: string;
      end: string;
    };
    is_skipped: boolean;
    skip_reason?: string;
  }>;
}
```

---

## 🎁 Bônus: API Client Helper

**Criar arquivo:** `frontend/src/lib/api/flowAutomationsAPI.ts`

```typescript
export const flowAutomationsAPI = {
  list: (params) => api.get('/flow-automations', { params }),
  get: (id) => api.get(`/flow-automations/${id}`),
  create: (data) => api.post('/flow-automations', data),
  update: (id, data) => api.put(`/flow-automations/${id}`, data),
  delete: (id) => api.delete(`/flow-automations/${id}`),
  
  // Schedule Management
  getSchedule: (automationId) => 
    api.get(`/flow-automations/${automationId}/schedule`),
  createSchedule: (automationId, data) => 
    api.post(`/flow-automations/${automationId}/schedule`, data),
  updateSchedule: (automationId, data) => 
    api.put(`/flow-automations/${automationId}/schedule`, data),
  deleteSchedule: (automationId) => 
    api.delete(`/flow-automations/${automationId}/schedule`),
  
  // Schedule Preview
  getSchedulePreview: (automationId, numExecutions = 10, daysAhead = 30) =>
    api.get(
      `/flow-automations/${automationId}/schedule/preview`,
      { params: { num_executions: numExecutions, days_ahead: daysAhead } }
    ),
  
  // Exceptions
  addException: (automationId, data) => 
    api.post(`/flow-automations/${automationId}/schedule/exceptions`, data),
  removeException: (automationId, exceptionId) => 
    api.delete(`/flow-automations/${automationId}/schedule/exceptions/${exceptionId}`),
};
```

---

## 📊 Comparação: O que Você Tem vs Falta

| Feature | Backend | Frontend |
|---------|---------|----------|
| CRUD Automação | ✅ | ⏳ (apenas modal) |
| Schedule (daily/weekly/monthly/cron) | ✅ | ❌ |
| Calendar Preview | ✅ | ❌ |
| Exceptions (skip/reschedule/modify) | ✅ | ❌ |
| Celery Tasks | ✅ | N/A |
| Execute Now | ✅ | ✅ (via modal) |
| View History | ✅ (API) | ⏳ (incomplete) |
| **Scheduler (Beat)** | ❌ | N/A |

---

**Conclusão:** Você tem 100% do backend pronto! 🚀  
**Frontend:** 30% pronto (Modal existe), faltam 70% (Dashboard, Schedule Editor, Detail pages)

Quer que eu implemente tudo agora?
