# 🔐 PyTake - Sistema de Roles e Permissões

## 📋 Análise do Backend

### **Roles Identificados:**
- **Admin**: Controle total do sistema
- **Supervisor**: Gestão de equipe e monitoramento
- **Agent**: Atendimento direto ao cliente
- **Viewer**: Visualização apenas (relatórios, dashboards)

### **Permissões Granulares:** 24 permissões em 7 categorias
- User Management, Conversation Management, Message Management
- Contact Management, Template Management, Media Management
- System & Analytics

---

## 🎯 Definição de Interfaces por Role

### 1. **🤖 AGENT** - Interface de Atendimento
**Foco: Produtividade e facilidade de uso**

#### **Páginas Permitidas:**
- ✅ `/app/chat` - Interface principal de atendimento
- ✅ `/app/conversations` - Lista de conversas atribuídas
- ✅ `/app/conversations/:id` - Chat individual
- ✅ `/app/contacts` - Contatos (visualizar, criar, editar)
- ✅ `/app/templates` - Templates (usar, criar básicos)
- ✅ `/app/media/upload` - Upload de mídia
- ✅ `/app/dashboard/agent` - Dashboard simplificado
- ✅ `/app/profile` - Perfil pessoal

#### **Funcionalidades:**
- ✅ **Chat em tempo real** com WebSocket
- ✅ **Envio de mensagens** (texto, mídia, templates)
- ✅ **Gestão básica de contatos**
- ✅ **Upload de arquivos**
- ✅ **Dashboard com suas métricas pessoais**
- ❌ **Atribuição de conversas** (apenas recebe)
- ❌ **Gestão de outros usuários**
- ❌ **Configurações do sistema**

#### **UI Characteristics:**
- Interface **limpa e focada** no atendimento
- **Sidebar simplificada** (chat, contatos, templates)
- **Dashboard minimalista** com KPIs pessoais
- **Notificações proeminentes** para novas mensagens

### 2. **👨‍💼 SUPERVISOR** - Interface de Gestão
**Foco: Monitoramento de equipe e operações**

#### **Páginas Permitidas:**
- ✅ `/app/dashboard` - Dashboard completo da equipe
- ✅ `/app/conversations` - Todas as conversas da equipe
- ✅ `/app/conversations/assignment` - Atribuição de conversas
- ✅ `/app/conversations/monitor` - Monitoramento em tempo real
- ✅ `/app/team` - Gestão da equipe de agentes
- ✅ `/app/analytics` - Relatórios e analytics
- ✅ `/app/performance` - Performance da equipe
- ✅ `/app/contacts` - Gestão completa de contatos
- ✅ `/app/templates` - Gestão de templates
- ✅ `/app/flows` - Automações e fluxos
- ✅ `/app/media` - Biblioteca de mídia
- ✅ `/app/reports` - Relatórios avançados

#### **Funcionalidades:**
- ✅ **Monitoramento de equipe** em tempo real
- ✅ **Atribuição manual/automática** de conversas
- ✅ **Analytics avançado** e relatórios
- ✅ **Gestão de templates** e automações
- ✅ **Criar/editar agentes** (não deletar)
- ✅ **Configurar fluxos** de atendimento
- ✅ **Exportar relatórios**
- ❌ **Configurações do sistema**
- ❌ **Gestão de integrações**

#### **UI Characteristics:**
- **Dashboard rico** com métricas de equipe
- **Sidebar expandida** com todas as opções
- **Ferramentas de monitoramento** proeminentes
- **Gráficos e relatórios** detalhados

### 3. **👑 ADMIN** - Interface Completa
**Foco: Controle total e configurações do sistema**

#### **Páginas Permitidas:**
- ✅ **Todas as páginas** do Supervisor +
- ✅ `/app/admin/users` - Gestão completa de usuários
- ✅ `/app/admin/system` - Configurações do sistema
- ✅ `/app/admin/integrations` - Integrações e APIs
- ✅ `/app/admin/webhooks` - Configuração de webhooks
- ✅ `/app/admin/audit` - Logs de auditoria
- ✅ `/app/admin/billing` - Faturamento e planos
- ✅ `/app/admin/organization` - Configurações da empresa
- ✅ `/app/settings/advanced` - Configurações avançadas

#### **Funcionalidades:**
- ✅ **Gestão completa de usuários** (criar, editar, deletar)
- ✅ **Configurações do sistema**
- ✅ **Integrações e webhooks**
- ✅ **Logs de auditoria**
- ✅ **Configurações de organização**
- ✅ **Faturamento e planos**
- ✅ **Backup e exportação**

#### **UI Characteristics:**
- **Interface completa** com acesso a tudo
- **Seção administrativa** dedicada
- **Ferramentas avançadas** de configuração
- **Logs e auditoria** detalhados

### 4. **👁️ VIEWER** - Interface Somente Leitura
**Foco: Monitoramento e relatórios**

#### **Páginas Permitidas:**
- ✅ `/app/dashboard/readonly` - Dashboard somente leitura
- ✅ `/app/conversations/view` - Conversas (apenas visualizar)
- ✅ `/app/analytics/view` - Analytics básico
- ✅ `/app/reports/view` - Relatórios básicos
- ✅ `/app/contacts/view` - Contatos (apenas visualizar)

#### **Funcionalidades:**
- ✅ **Visualizar dashboards**
- ✅ **Acompanhar conversas** (sem interação)
- ✅ **Visualizar relatórios** básicos
- ❌ **Enviar mensagens**
- ❌ **Criar/editar** qualquer coisa
- ❌ **Exportar dados**

---

## 🛡️ Sistema de Controle de Acesso

### **1. Hook de Autenticação**
```typescript
// hooks/useAuth.ts
export function useAuth() {
  return {
    user: AuthenticatedUser,
    role: UserRole,
    permissions: Permission[],
    hasPermission: (permission: Permission) => boolean,
    hasRole: (role: Role) => boolean,
    canAccess: (route: string) => boolean
  }
}
```

### **2. Componente de Proteção**
```typescript
// components/auth/ProtectedRoute.tsx
interface ProtectedRouteProps {
  roles?: Role[]
  permissions?: Permission[]
  fallback?: React.ComponentType
  children: React.ReactNode
}

export function ProtectedRoute({ roles, permissions, fallback, children }: ProtectedRouteProps) {
  const { hasRole, hasPermission } = useAuth()
  
  if (roles && !roles.some(role => hasRole(role))) {
    return fallback ? <fallback /> : <AccessDenied />
  }
  
  if (permissions && !permissions.some(permission => hasPermission(permission))) {
    return fallback ? <fallback /> : <AccessDenied />
  }
  
  return <>{children}</>
}
```

### **3. Mapeamento de Rotas por Role**
```typescript
// utils/roleRoutes.ts
export const ROLE_ROUTES = {
  Agent: [
    '/app/chat',
    '/app/conversations',
    '/app/contacts',
    '/app/templates',
    '/app/dashboard/agent',
    '/app/profile'
  ],
  
  Supervisor: [
    '/app/dashboard',
    '/app/conversations',
    '/app/team',
    '/app/analytics',
    '/app/flows',
    '/app/reports',
    // ... todas as rotas de Agent
  ],
  
  Admin: [
    '/app/admin/*',
    // ... todas as rotas de Supervisor
  ],
  
  Viewer: [
    '/app/dashboard/readonly',
    '/app/conversations/view',
    '/app/analytics/view'
  ]
}
```

---

## 🎨 Adaptação de UI por Role

### **Sidebar Dinâmica**
```typescript
// components/layout/Sidebar.tsx
export function Sidebar() {
  const { role } = useAuth()
  
  const menuItems = useMemo(() => {
    switch (role) {
      case 'Agent':
        return AGENT_MENU_ITEMS
      case 'Supervisor':
        return SUPERVISOR_MENU_ITEMS
      case 'Admin':
        return ADMIN_MENU_ITEMS
      case 'Viewer':
        return VIEWER_MENU_ITEMS
    }
  }, [role])
  
  return <SidebarContent items={menuItems} />
}
```

### **Dashboard Condicional**
```typescript
// pages/DashboardPage.tsx
export function DashboardPage() {
  const { role } = useAuth()
  
  return (
    <>
      {role === 'Agent' && <AgentDashboard />}
      {role === 'Supervisor' && <SupervisorDashboard />}
      {role === 'Admin' && <AdminDashboard />}
      {role === 'Viewer' && <ViewerDashboard />}
    </>
  )
}
```

### **Botões Condicionais**
```typescript
// components/ConversationActions.tsx
export function ConversationActions({ conversationId }: Props) {
  const { hasPermission } = useAuth()
  
  return (
    <div className="flex gap-2">
      {hasPermission('SendMessages') && (
        <Button onClick={() => sendMessage()}>Responder</Button>
      )}
      {hasPermission('AssignConversations') && (
        <Button onClick={() => assignConversation()}>Atribuir</Button>
      )}
      {hasPermission('DeleteConversations') && (
        <Button variant="destructive">Deletar</Button>
      )}
    </div>
  )
}
```

---

## 🚀 Implementação Faseada

### **Fase 1: Base (1-2 semanas)**
1. ✅ Hook de autenticação com roles
2. ✅ Componente ProtectedRoute
3. ✅ Mapeamento básico de rotas
4. ✅ Sidebar dinâmica

### **Fase 2: Interfaces Específicas (2-3 semanas)**
1. ✅ Dashboard por role
2. ✅ Interface do Agent otimizada
3. ✅ Interface do Supervisor completa
4. ✅ Seção administrativa para Admin

### **Fase 3: Refinamentos (1 semana)**
1. ✅ Botões condicionais em todos os componentes
2. ✅ Validação client-side refinada
3. ✅ Fallbacks e mensagens de erro
4. ✅ Testes de permissão

---

## 📊 Comparação de Acessos

| Funcionalidade | Agent | Supervisor | Admin | Viewer |
|----------------|-------|------------|-------|--------|
| **Chat em Tempo Real** | ✅ | ✅ | ✅ | ❌ |
| **Visualizar Conversas** | ✅ Próprias | ✅ Todas | ✅ Todas | ✅ Apenas ver |
| **Atribuir Conversas** | ❌ | ✅ | ✅ | ❌ |
| **Gestão de Usuários** | ❌ | ✅ Criar/Editar | ✅ Total | ❌ |
| **Analytics** | ✅ Básico | ✅ Completo | ✅ Completo | ✅ Básico |
| **Configurações** | ❌ | ❌ | ✅ | ❌ |
| **Exportar Dados** | ❌ | ✅ | ✅ | ❌ |

---

## 🔐 Considerações de Segurança

### **Client-Side**
- ✅ Validação de permissões em todos os componentes
- ✅ Rotas protegidas por role
- ✅ UI condicional baseada em permissões
- ✅ Redirecionamento automático para páginas permitidas

### **Server-Side**
- ✅ Middleware de autenticação em todas as rotas
- ✅ Validação de permissões no backend
- ✅ Tokens JWT com roles e permissões
- ✅ Logs de auditoria para ações sensíveis

### **Fallbacks**
- ✅ Página de "Acesso Negado" customizada
- ✅ Redirecionamento inteligente baseado no role
- ✅ Mensagens de erro específicas por contexto
- ✅ Comportamento gracioso em caso de falha

Este sistema garante que cada tipo de usuário tenha uma experiência otimizada para suas responsabilidades específicas! 🎯