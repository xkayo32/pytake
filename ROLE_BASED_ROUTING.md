# Role-Based Routing Implementation

## 📋 Overview

Sistema completo de controle de acesso baseado em roles (RBAC) implementado no PyTake, com dashboards e rotas específicas para cada tipo de usuário.

## 🎯 Roles Disponíveis

| Role | Descrição | Acesso |
|------|-----------|--------|
| `super_admin` | Administrador da plataforma | `/admin` (acesso total) |
| `org_admin` | Administrador da organização | `/admin` (acesso total) |
| `agent` | Agente de atendimento | `/agent` (interface de atendimento) |
| `viewer` | Visualizador (somente leitura) | `/agent` (modo leitura) |

## 🗺️ Estrutura de Rotas

### Admin Dashboard (`/admin/*`)

**Acesso:** `org_admin`, `super_admin`

```
/admin                     → Dashboard com métricas da organização
/admin/conversations       → Todas as conversas
/admin/contacts           → Gerenciamento de contatos
/admin/chatbots           → Construtor de chatbots
/admin/campaigns          → Gerenciamento de campanhas
/admin/users              → Gerenciamento de usuários/agentes
/admin/queues             → Configuração de filas
/admin/analytics          → Analytics e relatórios
/admin/whatsapp           → Configuração WhatsApp
/admin/settings           → Configurações da organização
```

**Características:**
- Sidebar com navegação completa
- Métricas organizacionais
- Gestão de equipe
- Configurações avançadas
- Cor tema: Roxo/Indigo

### Agent Dashboard (`/agent/*`)

**Acesso:** `agent`, `viewer`

```
/agent                    → Dashboard com métricas pessoais
/agent/queue              → Fila de atendimento (pegar conversas)
/agent/conversations      → Conversas ativas
/agent/history            → Histórico de atendimentos
/agent/completed          → Atendimentos concluídos
/agent/profile            → Perfil do agente
```

**Características:**
- Sidebar focada em atendimento
- Métricas pessoais de performance
- Seletor de status (Disponível, Ocupado, Ausente, Offline)
- Interface otimizada para atendimento
- Cor tema: Verde/Emerald

### Dashboard Router (`/dashboard`)

Rota inteligente que redireciona automaticamente baseado no role:
- `org_admin` / `super_admin` → `/admin`
- `agent` / `viewer` → `/agent`

## 🛡️ Proteção de Rotas

### 1. Middleware do Next.js

**Arquivo:** `frontend/src/middleware.ts`

```typescript
// Protege rotas automaticamente
// Redireciona não-autenticados para /login
// Redireciona autenticados que acessam /login para /dashboard
```

### 2. RoleGuard Component

**Arquivo:** `frontend/src/lib/auth/roleGuard.tsx`

```typescript
import { RoleGuard } from '@/lib/auth/roleGuard';

// Uso em layouts
<RoleGuard allowedRoles={['org_admin', 'super_admin']} fallbackPath="/agent">
  <AdminContent />
</RoleGuard>
```

**Hooks disponíveis:**

```typescript
import { useHasRole, useIsAdmin, useIsAgent } from '@/lib/auth/roleGuard';

const isAdmin = useIsAdmin();           // true para org_admin ou super_admin
const isAgent = useIsAgent();           // true para agent
const canManage = useHasRole(['org_admin']); // check custom
```

## 🔄 Fluxo de Autenticação

### Login Flow

```
1. Usuário preenche credenciais
2. Backend valida e retorna user com role
3. Frontend armazena user no Zustand store
4. Redirecionamento automático:
   - org_admin/super_admin → /admin
   - agent/viewer → /agent
```

### Registro Flow

```
1. Usuário preenche formulário de registro
2. Backend cria usuário com role padrão (org_admin para primeiro usuário)
3. Frontend mostra mensagem de sucesso
4. Redireciona para /login (não faz auto-login)
5. Usuário faz login manualmente
6. Redirecionado para dashboard apropriado
```

## 📁 Arquivos Criados/Modificados

### Novos Arquivos

```
frontend/src/middleware.ts                      # Next.js middleware
frontend/src/lib/auth/roleGuard.tsx            # Role guard component + hooks
frontend/src/components/layouts/AdminSidebar.tsx  # Admin navigation
frontend/src/components/layouts/AgentSidebar.tsx  # Agent navigation
frontend/src/app/admin/layout.tsx              # Admin layout
frontend/src/app/admin/page.tsx                # Admin dashboard
frontend/src/app/agent/layout.tsx              # Agent layout
frontend/src/app/agent/page.tsx                # Agent dashboard
```

### Arquivos Modificados

```
frontend/src/app/dashboard/page.tsx            # Agora é um router inteligente
frontend/src/app/login/page.tsx                # Redireciona baseado em role
CLAUDE.md                                       # Documentação atualizada
```

## 🎨 Design System

### Admin (Roxo/Indigo)

- Cor primária: `indigo-600`
- Hover: `indigo-50` / `indigo-900/30`
- Badge: `purple-100` / `purple-900/30`
- Ícones: Foco em gestão (Users, Bot, Send, Settings)

### Agent (Verde/Emerald)

- Cor primária: `green-600`
- Hover: `green-50` / `green-900/30`
- Badge: `green-100` / `green-900/30`
- Ícones: Foco em atendimento (MessageSquare, Inbox, Clock)

## 🧪 Testando

### Teste Admin

```bash
# Login com usuário admin
Email: admin@pytake.com
Password: Admin123
Role: org_admin

# Deve redirecionar para: http://localhost:3001/admin
# Interface: Dashboard administrativo com sidebar roxa
# Features: Métricas organizacionais, gestão de chatbots, campanhas, usuários
```

### Teste Agent

```bash
# Login com usuário agent (já criado e pronto para uso)
Email: agente@pytake.com
Password: Agente123
Role: agent

# Deve redirecionar para: http://localhost:3001/agent
# Interface: Dashboard de atendimento com sidebar verde
# Features: Métricas pessoais, fila, conversas ativas, status selector
```

### Teste de Proteção

```
1. Tentar acessar /admin com usuário agent
   → Redireciona para /agent

2. Tentar acessar /agent com usuário admin
   → Redireciona para /admin

3. Acessar /dashboard
   → Redireciona automaticamente baseado no role
```

## 🔐 Segurança

### Camadas de Proteção

1. **Middleware**: Bloqueia acesso não-autenticado
2. **RoleGuard**: Valida role antes de renderizar
3. **useEffect hooks**: Double-check em cada página
4. **Backend**: Validação final no servidor (implementar)

### Próximos Passos Backend

```python
# TODO: Adicionar decorators de permissão no FastAPI
from app.api.deps import require_role

@router.get("/admin/users")
async def list_users(
    current_user: User = Depends(require_role(['org_admin', 'super_admin']))
):
    ...
```

## 📊 Métricas dos Dashboards

### Admin Dashboard

- Total de contatos
- Conversas ativas
- Mensagens hoje
- Campanhas ativas
- Status dos chatbots
- Estatísticas rápidas

### Agent Dashboard

- Atendimentos hoje
- Conversas ativas
- Tempo médio de resposta
- Avaliação de satisfação (4.8/5.0)
- Atividade diária
- Meta de atendimentos

## 🚀 Deploy

Para deploy em produção:

1. Rebuild da imagem Docker do frontend
2. Configurar variáveis de ambiente
3. Executar migrations se necessário
4. Testar fluxo completo de cada role

```bash
# Rebuild
docker-compose build frontend

# Restart
docker-compose up -d frontend

# Verificar logs
docker-compose logs -f frontend
```

## 📚 Documentação Relacionada

- [CLAUDE.md](CLAUDE.md) - Documentação principal do projeto
- [ERROR_HANDLING.md](ERROR_HANDLING.md) - Padrões de tratamento de erros
- [AUTH_SESSION_FIX.md](AUTH_SESSION_FIX.md) - Fix de autenticação
- [CREDENTIALS.md](CREDENTIALS.md) - Credenciais padrão

## ✨ Features Futuras

- [ ] Dashboard de `super_admin` para multi-organizações
- [ ] Permissões granulares além de roles
- [ ] Modo offline para agents
- [ ] Dashboard mobile responsivo
- [ ] Customização de dashboards por organização
- [ ] Analytics avançado por role
