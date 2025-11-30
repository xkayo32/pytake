# 🤖 PyTake Frontend Generation - Guia de Prompt para IA

## Contexto do Sistema

Você vai gerar o frontend para o **PyTake**, uma plataforma completa de automação de WhatsApp Business API. O backend já está 100% funcional com **145+ endpoints REST**.

---

## 📋 Índice

1. [Visão Geral do Sistema](#visão-geral-do-sistema)
2. [Stack Tecnológica Requerida](#stack-tecnológica-requerida)
3. [Arquitetura de Autenticação](#arquitetura-de-autenticação)
4. [Estrutura de Roles e Permissões](#estrutura-de-roles-e-permissões)
5. [Entidades do Sistema](#entidades-do-sistema)
6. [Fluxos de Usuário](#fluxos-de-usuário)
7. [Páginas e Componentes](#páginas-e-componentes)
8. [Integração com API](#integração-com-api)
9. [Design System](#design-system)
10. [Regras de Negócio Críticas](#regras-de-negócio-críticas)

---

## 1. Visão Geral do Sistema

### O que é o PyTake?
- Plataforma B2B para automação de WhatsApp Business API
- Multi-tenant (várias organizações isoladas)
- Sistema de atendimento ao cliente com chatbots, filas e agentes
- Campanhas de marketing via WhatsApp
- Analytics e relatórios de performance

### Público-Alvo
- **Empresas** que querem automatizar atendimento via WhatsApp
- **Agências** que gerenciam múltiplos clientes
- **Equipes de suporte** que precisam de organização de conversas
- **Times de marketing** para campanhas de mensagens

### Funcionalidades Principais
1. **Atendimento ao Cliente** - Gestão de conversas, filas, SLA
2. **Chatbots** - Construtor visual de flows de automação
3. **Campanhas** - Envio em massa segmentado
4. **Contatos** - CRM básico com tags e segmentação
5. **Analytics** - Métricas de performance
6. **WhatsApp** - Integração com Meta Cloud API e Evolution API

---

## 2. Stack Tecnológica Requerida

### Frontend Stack (Recomendada)
```
- Framework: React 18+ ou Next.js 14+ (App Router)
- Language: TypeScript 5+
- Styling: Tailwind CSS 3+
- UI Components: Radix UI, shadcn/ui ou Headless UI
- State Management: Zustand ou React Query
- Form Handling: React Hook Form + Zod
- HTTP Client: Axios ou Fetch API
- Real-time: WebSocket nativo ou Socket.io
- Charts: Recharts ou Chart.js
- Flow Builder: React Flow (para editor de chatbots)
- Icons: Lucide Icons
```

### Padrões de Código
- Componentes funcionais com hooks
- TypeScript strict mode
- Absolute imports com aliases (@/)
- Server/Client components (se Next.js)
- Error boundaries em páginas principais
- Loading states e skeletons
- Responsive design (mobile-first)
- Dark mode support

---

## 3. Arquitetura de Autenticação

### Fluxo de Autenticação
```
1. Usuário acessa /login
2. Envia email + password para POST /api/v1/auth/login
3. Recebe { access_token, refresh_token, user }
4. Salva tokens em localStorage/cookies
5. Adiciona Authorization: Bearer <token> em todas as requests
6. Ao expirar (1h), usa refresh_token em POST /api/v1/auth/refresh
7. Logout: POST /api/v1/auth/logout + limpar tokens
```

### Tokens
```typescript
interface TokenResponse {
  access_token: string;    // JWT, expira em 1 hora
  refresh_token: string;   // Expira em 7 dias
  token_type: "bearer";
  expires_in: 3600;        // segundos
}

interface User {
  id: string;              // UUID
  email: string;
  full_name: string;
  role: "super_admin" | "org_admin" | "agent" | "viewer";
  organization_id: string; // UUID
  is_active: boolean;
  avatar_url?: string;
}
```

### Endpoints de Auth
```
POST /api/v1/auth/register    - Criar conta + organização
POST /api/v1/auth/login       - Login
POST /api/v1/auth/refresh     - Renovar token
POST /api/v1/auth/logout      - Logout
GET  /api/v1/auth/me          - Perfil do usuário logado
GET  /api/v1/auth/verify-token - Verificar validade do token
```

### Interceptor de API (Axios Example)
```typescript
// Sempre incluir token
api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automático em 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const newTokens = await refreshAccessToken(refreshToken);
        // Retry original request
      } else {
        // Redirect to login
      }
    }
    return Promise.reject(error);
  }
);
```

---

## 4. Estrutura de Roles e Permissões

### Roles Disponíveis

| Role | Descrição | Permissões |
|------|-----------|------------|
| `super_admin` | Admin global | Acesso total, gerenciar múltiplas orgs |
| `org_admin` | Admin da organização | Gerenciar usuários, configs, chatbots, campanhas |
| `agent` | Agente de atendimento | Atender conversas, ver contatos |
| `viewer` | Visualizador | Somente leitura |

### Matriz de Permissões por Módulo

| Módulo | super_admin | org_admin | agent | viewer |
|--------|-------------|-----------|-------|--------|
| Dashboard | ✅ Full | ✅ Full | ✅ Own | ✅ Read |
| Conversas | ✅ Full | ✅ Full | ✅ Assigned | ✅ Read |
| Contatos | ✅ Full | ✅ Full | ✅ Read/Edit | ✅ Read |
| Usuários | ✅ Full | ✅ CRUD | ❌ | ❌ |
| Chatbots | ✅ Full | ✅ CRUD | ✅ Read | ✅ Read |
| Campanhas | ✅ Full | ✅ CRUD | ✅ Read | ✅ Read |
| WhatsApp | ✅ Full | ✅ CRUD | ✅ Read | ✅ Read |
| Analytics | ✅ Full | ✅ Full | ✅ Own | ✅ Read |
| Settings | ✅ Full | ✅ Org | ❌ | ❌ |

### Implementação de Guard
```typescript
// Route protection based on role
function RequireRole({ 
  roles, 
  children 
}: { 
  roles: string[]; 
  children: React.ReactNode 
}) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <Loading />;
  if (!user) return <Navigate to="/login" />;
  if (!roles.includes(user.role)) return <Navigate to="/403" />;
  
  return children;
}

// Usage
<Route path="/admin/users" element={
  <RequireRole roles={["super_admin", "org_admin"]}>
    <UsersPage />
  </RequireRole>
} />
```

---

## 5. Entidades do Sistema

### 5.1 User (Usuário)
```typescript
interface User {
  id: string;                    // UUID
  organization_id: string;       // UUID
  email: string;
  full_name: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  role: "super_admin" | "org_admin" | "agent" | "viewer";
  
  // Status
  is_active: boolean;
  is_online: boolean;
  email_verified: boolean;
  
  // Agent specific
  agent_status?: "available" | "busy" | "away" | "offline";
  agent_greeting_message?: string;
  department_ids: string[];      // Departamentos do agente
  
  // Timestamps
  last_seen_at?: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

interface UserCreate {
  email: string;
  password: string;              // min 8 chars
  full_name: string;
  role: string;
  department_ids?: string[];
}

interface UserUpdate {
  full_name?: string;
  phone_number?: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  is_active?: boolean;
  agent_status?: string;
  department_ids?: string[];
}
```

### 5.2 Organization (Organização)
```typescript
interface Organization {
  id: string;
  name: string;
  slug: string;                  // URL-friendly
  logo_url?: string;
  website?: string;
  industry?: string;
  timezone: string;              // e.g., "America/Sao_Paulo"
  
  // Status
  is_active: boolean;
  
  // Plan/Limits
  plan: "free" | "starter" | "professional" | "enterprise";
  max_users: number;
  max_contacts: number;
  max_messages_per_month: number;
  
  // Settings (JSON)
  settings: {
    default_language: string;
    business_hours: BusinessHours;
    sla_settings: SLASettings;
  };
  
  created_at: string;
  updated_at: string;
}
```

### 5.3 Contact (Contato)
```typescript
interface Contact {
  id: string;
  organization_id: string;
  
  // Identification
  whatsapp_id: string;           // Phone with country code
  whatsapp_name?: string;        // Name from WhatsApp profile
  whatsapp_profile_pic?: string;
  
  // Profile
  name?: string;
  email?: string;
  phone_number?: string;
  avatar_url?: string;
  company?: string;
  job_title?: string;
  notes?: string;
  
  // Address
  address_street?: string;
  address_city?: string;
  address_state?: string;
  address_country?: string;
  address_postal_code?: string;
  
  // Marketing
  source?: string;               // Where contact came from
  lifecycle_stage?: string;      // lead, customer, etc.
  opt_in: boolean;               // Marketing consent
  opt_in_date?: string;
  opt_out_date?: string;
  
  // Status
  is_blocked: boolean;
  blocked_at?: string;
  blocked_reason?: string;
  is_vip: boolean;
  
  // Activity
  last_message_at?: string;
  total_messages_sent: number;
  total_messages_received: number;
  total_conversations: number;
  
  // Assignment
  assigned_agent_id?: string;
  assigned_department_id?: string;
  
  // Tags
  tags: Tag[];
  
  created_at: string;
  updated_at: string;
}

interface ContactCreate {
  whatsapp_id: string;           // Required
  name?: string;
  email?: string;
  phone_number?: string;
  company?: string;
  notes?: string;
}

interface Tag {
  id: string;
  name: string;
  color: string;                 // Hex color
  organization_id: string;
}
```

### 5.4 Conversation (Conversa)
```typescript
interface Conversation {
  id: string;
  organization_id: string;
  contact_id: string;
  whatsapp_number_id: string;
  
  // Status
  status: "open" | "pending" | "resolved" | "closed" | "queued";
  priority?: "low" | "medium" | "high" | "urgent";
  
  // Assignment
  assigned_agent_id?: string;
  assigned_department_id?: string;
  queue_id?: string;
  
  // Bot
  is_bot_active: boolean;
  current_chatbot_id?: string;
  current_flow_id?: string;
  current_node_id?: string;
  
  // Timing
  last_message_at?: string;
  last_inbound_at?: string;
  last_outbound_at?: string;
  first_response_at?: string;
  resolved_at?: string;
  closed_at?: string;
  queued_at?: string;
  
  // Counts
  total_messages: number;
  unread_count: number;
  
  // Metrics
  response_time_seconds?: number;
  resolution_time_seconds?: number;
  
  // Extra
  channel: "whatsapp";
  tags?: string[];
  extra_data?: Record<string, any>;
  
  // Relations (populated)
  contact?: Contact;
  assigned_agent?: User;
  messages?: Message[];
  
  created_at: string;
  updated_at: string;
}

interface ConversationAssign {
  agent_id: string;
}

interface ConversationTransfer {
  department_id: string;
  note?: string;
}

interface ConversationClose {
  reason?: string;
  resolved: boolean;
}
```

### 5.5 Message (Mensagem)
```typescript
interface Message {
  id: string;
  conversation_id: string;
  contact_id: string;
  organization_id: string;
  whatsapp_number_id: string;
  
  // Content
  content: string;
  media_url?: string;
  media_type?: "image" | "video" | "audio" | "document";
  media_caption?: string;
  
  // Type and Direction
  direction: "inbound" | "outbound";
  message_type: "text" | "image" | "video" | "audio" | "document" | "template" | "interactive";
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  
  // WhatsApp
  whatsapp_message_id?: string;
  
  // Sender
  sender_id?: string;            // User ID if outbound
  sender_name?: string;
  
  // Error
  error_code?: string;
  error_message?: string;
  
  // Timing
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  failed_at?: string;
  
  created_at: string;
  updated_at: string;
}

interface MessageCreate {
  content: string;
  media_url?: string;
  media_type?: string;
  media_caption?: string;
}
```

### 5.6 WhatsAppNumber
```typescript
interface WhatsAppNumber {
  id: string;
  organization_id: string;
  
  // Number Info
  phone_number: string;          // Full phone with country code
  display_name: string;          // Business name
  
  // Provider
  provider: "meta_cloud" | "evolution";
  
  // Meta Cloud API
  phone_number_id?: string;      // Meta's phone ID
  waba_id?: string;              // WhatsApp Business Account ID
  access_token?: string;         // Encrypted
  
  // Evolution API
  evolution_instance_name?: string;
  evolution_api_key?: string;    // Encrypted
  
  // Webhook
  webhook_verify_token?: string;
  
  // Default Chatbot
  default_chatbot_id?: string;
  
  // Status
  is_active: boolean;
  is_connected: boolean;
  connection_status: "connected" | "disconnected" | "pending" | "error";
  last_connected_at?: string;
  
  // Rate Limiting
  rate_limit_tier: number;       // 1-4 (Meta tiers)
  
  created_at: string;
  updated_at: string;
}
```

### 5.7 Chatbot e Flow
```typescript
interface Chatbot {
  id: string;
  organization_id: string;
  
  name: string;
  description?: string;
  is_active: boolean;
  
  // Trigger
  trigger_type: "keyword" | "all" | "schedule" | "api";
  trigger_keywords?: string[];
  trigger_schedule?: string;     // Cron expression
  
  // Stats
  total_executions: number;
  successful_executions: number;
  
  // Flows
  flows?: Flow[];
  
  created_at: string;
  updated_at: string;
}

interface Flow {
  id: string;
  chatbot_id: string;
  organization_id: string;
  
  name: string;
  description?: string;
  is_active: boolean;
  is_main_flow: boolean;         // Entry point
  version: number;
  
  // Nodes (for editor)
  nodes?: FlowNode[];
  
  created_at: string;
  updated_at: string;
}

interface FlowNode {
  id: string;
  flow_id: string;
  
  // Position (for editor)
  position_x: number;
  position_y: number;
  
  // Type
  node_type: "start" | "message" | "question" | "condition" | 
             "action" | "transfer" | "end" | "delay" | "api_call";
  
  // Config (varies by type)
  config: {
    message?: string;
    options?: string[];          // For questions
    condition?: string;          // For conditions
    action_type?: string;
    api_url?: string;
    delay_seconds?: number;
    transfer_to?: string;
  };
  
  // Connections
  next_node_id?: string;
  connections?: {
    [key: string]: string;       // condition -> node_id
  };
  
  created_at: string;
  updated_at: string;
}
```

### 5.8 Campaign (Campanha)
```typescript
interface Campaign {
  id: string;
  organization_id: string;
  
  name: string;
  description?: string;
  
  // Type
  campaign_type: "bulk_message" | "drip" | "triggered";
  
  // Status
  status: "draft" | "scheduled" | "running" | "paused" | "completed" | "cancelled";
  
  // Content
  message_template_id?: string;
  message_content?: string;
  message_type: "text" | "template" | "media";
  
  // Targeting
  target_type: "all" | "tags" | "segment" | "contacts";
  target_tags?: string[];
  target_contact_ids?: string[];
  target_filters?: Record<string, any>;
  
  // WhatsApp Number
  whatsapp_number_id: string;
  
  // Schedule
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  
  // Stats
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  
  // Rate limiting
  messages_per_second: number;
  
  created_by_id: string;
  created_at: string;
  updated_at: string;
}
```

### 5.9 Department e Queue
```typescript
interface Department {
  id: string;
  organization_id: string;
  
  name: string;
  description?: string;
  color: string;                 // Hex
  is_active: boolean;
  
  // SLA Settings
  sla_first_response_minutes?: number;
  sla_resolution_minutes?: number;
  
  // Default queue
  default_queue_id?: string;
  
  // Members
  member_ids: string[];          // User IDs
  
  created_at: string;
  updated_at: string;
}

interface Queue {
  id: string;
  organization_id: string;
  department_id?: string;
  
  name: string;
  description?: string;
  is_active: boolean;
  
  // Assignment Strategy
  assignment_strategy: "round_robin" | "least_busy" | "random" | "manual";
  
  // Priority
  priority: number;              // Higher = processed first
  
  // Limits
  max_concurrent_per_agent: number;
  max_wait_time_minutes?: number;
  
  created_at: string;
  updated_at: string;
}
```

### 5.10 Analytics Metrics
```typescript
interface OverviewMetrics {
  // Conversations
  total_conversations: number;
  active_conversations: number;
  conversations_today: number;
  
  // Messages
  messages_sent_today: number;
  messages_received_today: number;
  total_messages: number;
  
  // Contacts
  total_contacts: number;
  new_contacts_today: number;
  active_contacts: number;
  
  // Campaigns
  active_campaigns: number;
  total_campaigns: number;
  
  // Response Time
  avg_response_time_seconds: number;
  avg_resolution_time_seconds: number;
  
  // SLA
  sla_compliance_rate: number;   // 0-100
  sla_violations_today: number;
}

interface AgentMetrics {
  agent_id: string;
  agent_name: string;
  
  conversations_handled: number;
  messages_sent: number;
  avg_response_time_seconds: number;
  avg_resolution_time_seconds: number;
  satisfaction_rating?: number;
  
  is_online: boolean;
  status: string;
}
```

---

## 6. Fluxos de Usuário

### 6.1 Fluxo de Registro
```
1. Usuário acessa /register
2. Preenche: email, password, full_name, organization_name
3. POST /api/v1/auth/register
4. Recebe tokens + user
5. Redireciona para /dashboard ou /onboarding
```

### 6.2 Fluxo de Login
```
1. Usuário acessa /login
2. Preenche email + password
3. POST /api/v1/auth/login
4. Recebe tokens + user
5. Salva tokens
6. Redireciona baseado em role:
   - super_admin, org_admin → /admin
   - agent → /agent
   - viewer → /agent (read-only)
```

### 6.3 Fluxo de Atendimento (Agent)
```
1. Agente acessa /agent
2. Vê dashboard com métricas pessoais
3. Define status: available/busy/away
4. Acessa fila de atendimento /agent/queue
5. Aceita conversa da fila (POST /conversations/{id}/assign)
6. Abre chat /agent/conversations/{id}
7. Troca mensagens em tempo real (WebSocket + POST /messages)
8. Finaliza conversa (POST /conversations/{id}/close)
```

### 6.4 Fluxo de Criação de Chatbot (Admin)
```
1. Admin acessa /admin/chatbots
2. Clica "Novo Chatbot"
3. Define nome, trigger_type, trigger_keywords
4. POST /api/v1/chatbots
5. Abre editor visual /admin/chatbots/{id}/edit
6. Arrasta nodes (React Flow)
7. Conecta nodes com edges
8. Salva (PATCH /api/v1/chatbots/flows/{id}/nodes)
9. Ativa chatbot (POST /chatbots/{id}/activate)
10. Vincula a número WhatsApp
```

### 6.5 Fluxo de Campanha
```
1. Admin acessa /admin/campaigns
2. Clica "Nova Campanha"
3. Define: nome, tipo, conteúdo da mensagem
4. Seleciona audiência (tags, segmento, todos)
5. Seleciona número WhatsApp
6. Define agendamento (opcional)
7. POST /api/v1/campaigns
8. Revisa preview
9. Inicia (POST /campaigns/{id}/start)
10. Acompanha progresso em tempo real
```

---

## 7. Páginas e Componentes

### 7.1 Estrutura de Rotas

```
/                           # Landing page (público)
/login                      # Login
/register                   # Registro
/forgot-password            # Recuperar senha
/reset-password             # Resetar senha

/dashboard                  # Router - redireciona por role

/admin                      # Dashboard admin
/admin/conversations        # Lista de todas conversas
/admin/conversations/[id]   # Chat individual
/admin/contacts             # Lista de contatos
/admin/contacts/[id]        # Detalhe do contato
/admin/users                # Gestão de usuários
/admin/users/[id]           # Detalhe do usuário
/admin/chatbots             # Lista de chatbots
/admin/chatbots/[id]        # Detalhe do chatbot
/admin/chatbots/[id]/edit   # Editor visual
/admin/campaigns            # Lista de campanhas
/admin/campaigns/[id]       # Detalhe da campanha
/admin/campaigns/new        # Nova campanha
/admin/whatsapp             # Números WhatsApp
/admin/whatsapp/templates   # Templates de mensagem
/admin/analytics            # Analytics
/admin/departments          # Departamentos
/admin/queues               # Filas
/admin/settings             # Configurações
/admin/settings/organization # Config da org
/admin/settings/profile     # Perfil do usuário

/agent                      # Dashboard do agente
/agent/queue                # Fila de atendimento
/agent/conversations        # Conversas ativas
/agent/conversations/[id]   # Chat
/agent/history              # Histórico
/agent/completed            # Concluídos
/agent/profile              # Perfil
```

### 7.2 Layouts

#### AdminLayout
```typescript
// Sidebar com:
// - Logo
// - Menu de navegação
// - User info no bottom
// - Toggle dark mode

const adminMenu = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Conversas', href: '/admin/conversations', icon: MessageSquare },
  { name: 'Contatos', href: '/admin/contacts', icon: Users },
  { name: 'Usuários', href: '/admin/users', icon: UserCircle },
  { name: 'Chatbots', href: '/admin/chatbots', icon: Bot },
  { name: 'Campanhas', href: '/admin/campaigns', icon: Send },
  { name: 'WhatsApp', href: '/admin/whatsapp', icon: Phone },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Departamentos', href: '/admin/departments', icon: Building },
  { name: 'Filas', href: '/admin/queues', icon: ListTodo },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];
```

#### AgentLayout
```typescript
// Sidebar mais simples
const agentMenu = [
  { name: 'Dashboard', href: '/agent', icon: LayoutDashboard },
  { name: 'Fila', href: '/agent/queue', icon: Inbox },
  { name: 'Conversas', href: '/agent/conversations', icon: MessageSquare },
  { name: 'Histórico', href: '/agent/history', icon: Clock },
  { name: 'Concluídos', href: '/agent/completed', icon: CheckCircle },
  { name: 'Perfil', href: '/agent/profile', icon: User },
];

// Header com:
// - Status selector (available/busy/away/offline)
// - Notifications bell
// - User menu
```

### 7.3 Componentes Principais

#### Chat Interface
```typescript
// Componentes para interface de chat:
// - MessageList: Lista de mensagens com scroll infinito
// - MessageBubble: Bolha de mensagem (inbound/outbound)
// - MessageInput: Input com emoji, attachments
// - ConversationHeader: Info do contato + ações
// - ConversationSidebar: Detalhes do contato, histórico
```

#### Flow Builder (React Flow)
```typescript
// Editor visual de chatbots:
// - Canvas com drag & drop
// - Node types: Start, Message, Question, Condition, Action, Transfer, End
// - Edge connections
// - Properties panel
// - Toolbar com node palette
// - Save/Preview buttons
```

#### Data Tables
```typescript
// Tabelas com:
// - Sorting
// - Filtering
// - Pagination (backend)
// - Bulk actions
// - Row selection
// - Column visibility
// - Export
```

#### Forms
```typescript
// Formulários com:
// - Validation (Zod)
// - Error messages
// - Loading states
// - Success feedback
// - File uploads
// - Multi-select
// - Date pickers
```

---

## 8. Integração com API

### 8.1 Base URL
```
Production: https://api.pytake.net/api/v1
Development: https://api-dev.pytake.net/api/v1
Local: http://localhost:8000/api/v1
```

### 8.2 Headers Padrão
```typescript
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`,
};
```

### 8.3 Tratamento de Erros
```typescript
interface APIError {
  detail: string | {
    msg: string;
    type: string;
    loc: string[];
  }[];
}

// HTTP Status Codes:
// 400 - Bad Request (validação)
// 401 - Unauthorized (token inválido/expirado)
// 403 - Forbidden (sem permissão)
// 404 - Not Found
// 422 - Validation Error (Pydantic)
// 429 - Rate Limited
// 500 - Server Error
```

### 8.4 Paginação
```typescript
// Query params padrão:
// ?skip=0&limit=100

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}
```

### 8.5 WebSocket (Real-time)
```typescript
// Conexão WebSocket para:
// - Novas mensagens
// - Status de mensagens (delivered, read)
// - Notificações
// - Status de agentes

const ws = new WebSocket(
  `wss://api.pytake.net/api/v1/websocket?token=${accessToken}`
);

// Events:
// - new_message
// - message_status
// - conversation_assigned
// - conversation_closed
// - agent_status_changed
```

---

## 9. Design System

### 9.1 Cores (Tailwind)
```css
/* Primary - Indigo */
--primary-50: #eef2ff;
--primary-500: #6366f1;
--primary-600: #4f46e5;
--primary-700: #4338ca;

/* Success - Green */
--success-500: #22c55e;

/* Warning - Yellow */
--warning-500: #eab308;

/* Error - Red */
--error-500: #ef4444;

/* Neutral - Gray */
--gray-50: #f9fafb;
--gray-100: #f3f4f6;
--gray-200: #e5e7eb;
--gray-300: #d1d5db;
--gray-400: #9ca3af;
--gray-500: #6b7280;
--gray-600: #4b5563;
--gray-700: #374151;
--gray-800: #1f2937;
--gray-900: #111827;
```

### 9.2 Typography
```css
/* Font Family */
font-family: 'Inter', sans-serif;

/* Sizes */
text-xs: 0.75rem;    /* 12px */
text-sm: 0.875rem;   /* 14px */
text-base: 1rem;     /* 16px */
text-lg: 1.125rem;   /* 18px */
text-xl: 1.25rem;    /* 20px */
text-2xl: 1.5rem;    /* 24px */
text-3xl: 1.875rem;  /* 30px */
```

### 9.3 Spacing
```css
/* Consistent spacing scale */
space-1: 0.25rem;    /* 4px */
space-2: 0.5rem;     /* 8px */
space-3: 0.75rem;    /* 12px */
space-4: 1rem;       /* 16px */
space-6: 1.5rem;     /* 24px */
space-8: 2rem;       /* 32px */
```

### 9.4 Componentes UI Básicos
```typescript
// Buttons
<Button variant="primary" size="md">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Destructive</Button>

// Inputs
<Input type="text" placeholder="..." />
<Textarea rows={4} />
<Select options={[...]} />
<Checkbox />
<RadioGroup />
<Switch />

// Feedback
<Badge variant="success">Active</Badge>
<Alert variant="warning">...</Alert>
<Toast />
<Skeleton />
<Spinner />

// Layout
<Card>...</Card>
<Modal>...</Modal>
<Drawer>...</Drawer>
<Tabs>...</Tabs>
<Accordion>...</Accordion>
<Dropdown>...</Dropdown>
```

---

## 10. Regras de Negócio Críticas

### 10.1 Multi-tenancy
```
⚠️ CRÍTICO: Todos os dados são escopados por organization_id

- O backend SEMPRE filtra por organization_id do usuário logado
- Frontend NÃO precisa enviar organization_id nas requests
- Um usuário NUNCA vê dados de outra organização
- super_admin pode acessar todas as organizações
```

### 10.2 Estados de Conversa
```typescript
// Estados possíveis:
type ConversationStatus = 
  | "open"      // Conversa ativa com agente
  | "pending"   // Aguardando resposta
  | "queued"    // Na fila, sem agente
  | "resolved"  // Resolvida pelo agente
  | "closed";   // Fechada

// Transições válidas:
// queued → open (quando agente assume)
// open ↔ pending (baseado em quem respondeu por último)
// open/pending → resolved (agente marca como resolvido)
// resolved → closed (automático ou manual)
// qualquer → queued (transferência)
```

### 10.3 Status de Agente
```typescript
type AgentStatus = 
  | "available"  // Pode receber novas conversas
  | "busy"       // Ocupado, não recebe novas
  | "away"       // Ausente temporariamente
  | "offline";   // Offline

// Conversas são atribuídas apenas para agentes "available"
```

### 10.4 SLA (Service Level Agreement)
```typescript
// Definido por departamento/fila:
// - sla_first_response_minutes: Tempo máximo para primeira resposta
// - sla_resolution_minutes: Tempo máximo para resolução

// Frontend deve mostrar:
// - Tempo de espera atual
// - Indicador visual quando próximo do SLA (>80%)
// - Alertas quando SLA violado
```

### 10.5 Rate Limiting WhatsApp
```
// Meta impõe limites por número:
// Tier 1: 1,000 mensagens/24h
// Tier 2: 10,000 mensagens/24h
// Tier 3: 100,000 mensagens/24h
// Tier 4: Unlimited

// Frontend deve:
// - Mostrar uso atual de rate limit
// - Alertar quando próximo do limite
// - Bloquear envio quando limite atingido
```

### 10.6 Chatbot Ativo
```typescript
// Conversa pode ter chatbot ativo:
// - is_bot_active: true/false
// - Quando bot ativo, mensagens são processadas pelo flow
// - Agente pode desativar bot (POST /conversations/{id}/take-over)
// - Bot pode transferir para agente (node de transferência)
```

### 10.7 Segurança de Tokens
```typescript
// Access Token:
// - Expira em 1 hora
// - Usar para todas as requests
// - Renovar antes de expirar

// Refresh Token:
// - Expira em 7 dias
// - Usar apenas para renovar access token
// - Salvar de forma segura (httpOnly cookie preferível)

// NUNCA expor tokens em:
// - URLs
// - Logs
// - Local storage (se possível usar cookies)
```

---

## 📋 Checklist para Implementação

### Autenticação
- [ ] Tela de login com validação
- [ ] Tela de registro com validação
- [ ] Interceptor de API com token
- [ ] Refresh automático de token
- [ ] Logout com limpeza de tokens
- [ ] Proteção de rotas por role

### Dashboard
- [ ] Dashboard admin com métricas
- [ ] Dashboard agent com métricas pessoais
- [ ] Cards de estatísticas
- [ ] Gráficos de tendência

### Conversas
- [ ] Lista de conversas com filtros
- [ ] Interface de chat real-time
- [ ] Envio de texto e mídia
- [ ] Status de mensagens (sent/delivered/read)
- [ ] Atribuição de conversa
- [ ] Transferência entre departamentos
- [ ] Fechamento com motivo

### Contatos
- [ ] Lista com busca e filtros
- [ ] CRUD completo
- [ ] Sistema de tags
- [ ] Bloqueio/VIP
- [ ] Histórico de conversas

### Usuários
- [ ] Lista de usuários
- [ ] CRUD com validação de role
- [ ] Atribuição a departamentos
- [ ] Ativação/Desativação

### Chatbots
- [ ] Lista de chatbots
- [ ] CRUD básico
- [ ] Editor visual (React Flow)
- [ ] Nodes: Message, Question, Condition, etc.
- [ ] Ativação/Desativação

### Campanhas
- [ ] Lista de campanhas
- [ ] Wizard de criação
- [ ] Seleção de audiência
- [ ] Agendamento
- [ ] Acompanhamento de progresso

### WhatsApp
- [ ] Lista de números
- [ ] Adicionar número (Meta Cloud)
- [ ] Conexão via QR Code (Evolution)
- [ ] Templates de mensagem
- [ ] Status de conexão

### Analytics
- [ ] Métricas gerais
- [ ] Métricas por agente
- [ ] Gráficos de série temporal
- [ ] Exportação de relatórios

### Configurações
- [ ] Configurações da organização
- [ ] Departamentos e filas
- [ ] Perfil do usuário
- [ ] Preferências

---

## 🚀 Conclusão

Este documento contém todas as informações necessárias para gerar um frontend completo para o PyTake. O backend está 100% funcional com 145+ endpoints documentados.

**Prioridades de Implementação:**
1. Autenticação e proteção de rotas
2. Dashboard e navegação
3. Conversas (core do produto)
4. Contatos
5. Usuários (admin)
6. WhatsApp config
7. Chatbots
8. Campanhas
9. Analytics
10. Configurações

---

*Documentação gerada para uso em prompts de IA para geração de frontend.*
*Versão: 1.0*
*Data: Novembro 2025*
*Autor: Kayo Carvalho Fernandes*
