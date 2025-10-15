# Live Chat / Atendimento - Plano de Implementação

**Data:** 2025-10-10
**Status:** ✅ Fase 2 Completa - Pronto para Fase 3

---

## 📋 O Que Já Existe

### ✅ Backend
- [x] Modelos: `Conversation`, `Message` (completos)
- [x] Endpoints básicos de conversações
- [x] Sistema de fila (`queued` status)
- [x] Atribuição de agentes
- [x] Métricas e rastreamento
- [x] Status da janela de 24h (WhatsApp)
- [x] Soft delete
- [x] **Fix:** Schema `priority` field now optional (backend/app/schemas/conversation.py)

### ✅ Frontend - Fase 1 Completa
- [x] Página de chat individual (`/admin/conversations/[id]`)
- [x] Página de chat do agente (`/agent/conversations/[id]`)
- [x] WebSocket para tempo real (admin)
- [x] Componentes: `MessageList`, `MessageInput`
- [x] Integração com API de conversações
- [x] Indicador de janela de 24h
- [x] **Novo:** `ConversationList.tsx` - Lista de conversações com auto-refresh (5s)
- [x] **Novo:** `ConversationItem.tsx` - Card de conversa com status badges e preview
- [x] **Novo:** `ConversationFilters.tsx` - Filtros avançados (busca, status, minhas)
- [x] **Novo:** Inbox admin (`/admin/conversations`) - Layout 2 colunas tema roxo
- [x] **Novo:** Inbox agent (`/agent/conversations`) - Layout 2 colunas tema verde

**Screenshots:**
- ✅ `admin-inbox-with-conversation.png` - Admin inbox testado
- ✅ `agent-inbox-with-conversation.png` - Agent inbox testado

### ✅ Backend - Fase 2 Completa
- [x] **Novo:** `queue.py` - Endpoints REST para fila
- [x] **Expandido:** `conversation_service.py` - Métodos `get_queue()` e `pull_from_queue()`
- [x] **Endpoints:** `GET /api/v1/queue/` e `POST /api/v1/queue/pull`
- [x] **Fix:** Correção de parâmetro `assigned_department_id` vs `department_id`

### ✅ Frontend - Fase 2 Completa
- [x] **Novo:** `QueueList.tsx` - Lista de fila com auto-refresh (5s) e pull (8.5 KB)
- [x] **Novo:** `QueueItem.tsx` - Card de conversa na fila com prioridade (6.1 KB)
- [x] **Novo:** `/agent/queue/page.tsx` - Página de fila do agente (tema verde)
- [x] **API:** queueAPI adicionado ao `lib/api.ts`
- [x] **Features:** Priority badges, time in queue, "Pegar próxima" button, priority legend

**Screenshots:**
- ✅ `agent-queue-page.png` - Agent queue page testada

---

## 🎯 O Que Falta Implementar

### 1️⃣ **Inbox / Lista de Conversações** (Prioridade: ALTA)

**Descrição:**
Sidebar com lista de conversações ativas, similar ao WhatsApp Web.

**Funcionalidades:**
- Lista de conversações em tempo real
- Preview da última mensagem
- Badge de contador de mensagens não lidas
- Indicador de status (open, active, queued, closed)
- Avatar do contato
- Timestamp da última mensagem
- Busca por nome/número de contato
- Filtros por status, agente, departamento

**Componentes:**
- `ConversationList.tsx` - Lista completa
- `ConversationItem.tsx` - Item individual
- `ConversationFilters.tsx` - Filtros e busca

**Layout:**
```
┌─────────────────┬──────────────────────────────┐
│  INBOX          │  CHAT                        │
│  ────────       │                              │
│  🔍 Buscar      │  Header com info do contato  │
│                 │                              │
│  □ Todas        │                              │
│  □ Abertas      │                              │
│  □ Atribuídas   │      Mensagens               │
│  □ Encerradas   │                              │
│                 │                              │
│  Conversa 1     │                              │
│  Conversa 2     │                              │
│  Conversa 3     │  Input de mensagem           │
│                 │                              │
└─────────────────┴──────────────────────────────┘
```

---

### 2️⃣ **Fila de Atendimento** (Prioridade: ALTA)

**Descrição:**
Sistema de fila para agentes pegarem conversações.

**Funcionalidades:**
- `/agent/queue` - Página de fila
- Botão "Pegar próxima" (pull from queue)
- Contador de conversações na fila
- Priorização (alta, média, baixa)
- Tempo de espera na fila
- Filtro por departamento

**Backend - Novos Endpoints:**
```python
POST /api/v1/queue/pull          # Pegar próxima da fila
GET  /api/v1/queue/              # Listar conversações na fila
POST /api/v1/conversations/{id}/queue  # Adicionar à fila
```

**Layout da Fila:**
```
╔════════════════════════════════════════════╗
║          Fila de Atendimento               ║
╠════════════════════════════════════════════╣
║  12 conversas aguardando                   ║
║  ┌──────────────────────────────────────┐  ║
║  │  [Pegar Próxima]                     │  ║
║  └──────────────────────────────────────┘  ║
║                                            ║
║  🟡 João Silva - Urgente                   ║
║     Aguardando há 5 minutos                ║
║                                            ║
║  🟢 Maria Santos - Normal                  ║
║     Aguardando há 2 minutos                ║
╚════════════════════════════════════════════╝
```

---

### 3️⃣ **Indicadores em Tempo Real** (Prioridade: MÉDIA)

**Funcionalidades:**
- Indicador "digitando..." quando contato está escrevendo
- Status online/offline do agente
- Contador de não lidas
- Notificação sonora de nova mensagem
- Badge no menu lateral

**WebSocket Events:**
```typescript
'typing:start'  // Contato começou a digitar
'typing:stop'   // Contato parou de digitar
'agent:online'  // Agente ficou online
'agent:offline' // Agente ficou offline
'message:new'   // Nova mensagem (já implementado)
```

---

### 4️⃣ **Ações Rápidas** (Prioridade: MÉDIA)

**Funcionalidades:**
- Botão "Atribuir a outro agente"
- Botão "Transferir para departamento"
- Botão "Encerrar conversa"
- Botão "Reabrir conversa"
- Adicionar tags
- Adicionar notas internas
- Mudar prioridade

**UI:**
```
Header do Chat:
┌──────────────────────────────────────────┐
│ ← João Silva (+55 61 98765-4321)         │
│   [Aberta] [✓ Atribuir] [🏷️ Tags] [X]    │
└──────────────────────────────────────────┘
```

---

### 5️⃣ **Filtros e Busca** (Prioridade: BAIXA)

**Funcionalidades:**
- Busca por nome do contato
- Busca por número de telefone
- Filtro por status
- Filtro por agente responsável
- Filtro por departamento
- Filtro por tags
- Ordenação (mais recente, mais antiga, não lidas)

---

## 🔧 Endpoints Backend Necessários

### Fila
```python
# app/api/v1/endpoints/queue.py
GET  /api/v1/queue/                    # Listar fila
POST /api/v1/queue/pull                # Pegar próxima
POST /api/v1/conversations/{id}/queue  # Adicionar à fila
```

### Ações
```python
# app/api/v1/endpoints/conversations.py
POST /api/v1/conversations/{id}/assign       # Atribuir agente
POST /api/v1/conversations/{id}/transfer     # Transferir
POST /api/v1/conversations/{id}/close        # Encerrar
POST /api/v1/conversations/{id}/reopen       # Reabrir
POST /api/v1/conversations/{id}/priority     # Mudar prioridade
POST /api/v1/conversations/{id}/tags         # Adicionar tags
POST /api/v1/conversations/{id}/notes        # Adicionar nota interna
```

### Indicadores
```python
# WebSocket events (já existe socketio)
'typing:start'
'typing:stop'
'agent:status'
'conversation:update'
```

---

## 📁 Estrutura de Arquivos

### Backend
```
backend/app/
├── api/v1/endpoints/
│   ├── conversations.py  ✅ (expandir)
│   └── queue.py          🆕 (criar)
├── services/
│   ├── conversation_service.py  ✅ (expandir)
│   └── queue_service.py         🆕 (criar)
├── schemas/
│   ├── conversation.py  ✅ (expandir)
│   └── queue.py         🆕 (criar)
└── websocket/
    └── events.py  🆕 (eventos adicionais)
```

### Frontend
```
frontend/src/
├── app/
│   ├── admin/
│   │   ├── conversations/
│   │   │   ├── page.tsx          🆕 (inbox)
│   │   │   └── [id]/page.tsx     ✅ (já existe)
│   └── agent/
│       ├── queue/
│       │   └── page.tsx          🆕 (fila)
│       └── conversations/
│           ├── page.tsx          🆕 (inbox)
│           └── [id]/page.tsx     ✅ (já existe)
├── components/
│   ├── inbox/
│   │   ├── ConversationList.tsx     🆕
│   │   ├── ConversationItem.tsx     🆕
│   │   ├── ConversationFilters.tsx  🆕
│   │   └── ConversationSearch.tsx   🆕
│   ├── queue/
│   │   ├── QueueList.tsx            🆕
│   │   └── QueueItem.tsx            🆕
│   └── chat/
│       ├── MessageList.tsx          ✅ (já existe)
│       ├── MessageInput.tsx         ✅ (já existe)
│       ├── ChatHeader.tsx           🆕
│       └── ChatActions.tsx          🆕
└── lib/
    └── socket.ts  ✅ (expandir)
```

---

## 🎯 Ordem de Implementação

### ✅ **Fase 1: Inbox** (COMPLETA - 2025-10-10)
1. ✅ Criar `ConversationList.tsx` - Lista de conversações (8.1 KB)
2. ✅ Criar `ConversationItem.tsx` - Item individual (6.1 KB)
3. ✅ Criar `ConversationFilters.tsx` - Filtros avançados (5.3 KB)
4. ✅ Criar `/admin/conversations/page.tsx` - Página inbox admin (tema roxo)
5. ✅ Criar `/agent/conversations/page.tsx` - Página inbox agent (tema verde)
6. ✅ Integrar com API existente (conversationsAPI.list)
7. ✅ Adicionar busca e filtros básicos (busca, status, minhas conversas)
8. ✅ Testar admin e agent inbox via browser
9. ✅ Corrigir erro de validação backend (priority field)
10. ✅ Verificar role guards funcionando

### ✅ **Fase 2: Fila** (COMPLETA - 2025-10-10)
1. ✅ Backend: Endpoints de fila criados (`backend/app/api/v1/endpoints/queue.py`)
2. ✅ Backend: Métodos adicionados ao `conversation_service.py`
3. ✅ Frontend: Página `/agent/queue/page.tsx` criada
4. ✅ Componentes `QueueList.tsx` (8.5 KB) e `QueueItem.tsx` (6.1 KB)
5. ✅ Botão "⚡ Pegar Próxima da Fila" implementado
6. ✅ Contador de fila em tempo real (auto-refresh 5s)
7. ✅ Sistema de prioridade (Urgente/Alta/Média/Baixa) com cores
8. ✅ Testado fluxo completo via browser automation

### **Fase 3: Ações Rápidas** (Importante)
1. Backend: Endpoints de ações (assign, transfer, close, etc.)
2. Frontend: `ChatActions.tsx`
3. Modals de confirmação
4. Feedback visual

### **Fase 4: Indicadores** (Bônus)
1. WebSocket: Eventos de typing
2. Status online/offline
3. Notificações
4. Badge de não lidas

---

## 🧪 Testes Necessários

### Backend
- ✅ Listagem de conversações
- ✅ Pegar mensagens
- ✅ Enviar mensagem
- 🆕 Pegar da fila
- 🆕 Atribuir agente
- 🆕 Encerrar conversa
- 🆕 WebSocket events

### Frontend
- 🆕 Carregar lista de conversações
- 🆕 Filtrar conversações
- 🆕 Buscar por nome/número
- 🆕 Pegar próxima da fila
- ✅ Enviar mensagem
- ✅ Receber mensagem em tempo real
- 🆕 Indicadores de typing
- 🆕 Atribuir/encerrar conversa

---

## 📊 Métricas de Sucesso

- ✅ Agente consegue ver lista de conversações
- ✅ Agente consegue pegar conversa da fila
- ✅ Agente consegue enviar e receber mensagens
- ✅ Admin consegue ver todas as conversações
- ✅ Admin consegue atribuir conversações
- ✅ Indicadores em tempo real funcionando
- ✅ Filtros e busca funcionando
- ✅ Performance: Inbox carrega em < 1s
- ✅ WebSocket: Mensagens aparecem em < 500ms

---

**Status:** Pronto para começar implementação! 🚀
