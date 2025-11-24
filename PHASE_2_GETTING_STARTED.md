# 🚀 Começar Phase 2: Dashboard com Dados Reais

**Data:** 24 de Novembro de 2025  
**Implementado por:** Kayo Carvalho Fernandes  
**Duração Estimada:** 5 dias (1 semana)

---

## ⚡ Quick Start - 5 Minutos

### Passo 1: Criar Branch

```bash
cd /home/administrator/pytake

# Verificar que está em develop
git branch

# Puxar últimas mudanças
git fetch origin
git pull origin develop

# Criar nova branch
git checkout -b feature/PHASE2-dashboard-integration
```

### Passo 2: Entender o Objetivo

Phase 2 vai transformar o Dashboard estático em dinâmico:

**Antes (Phase 1):** Apenas layout bonito com dados fake
**Depois (Phase 2):** Dashboard com dados reais da API

### Passo 3: Revisar Endpoints Necessários

Os endpoints abaixo precisam existir no backend:

```
GET /api/v1/dashboard/stats
  └─ Resposta esperada:
     {
       "total_flows": 10,
       "active_flows": 5,
       "total_messages": 1240,
       "conversion_rate": 85.5
     }

GET /api/v1/flows?page=1&limit=20&status=active
  └─ Resposta esperada:
     {
       "items": [{id, name, status, messages_count, created_at}, ...],
       "total": 50,
       "page": 1
     }
```

---

## 📝 Tarefas Phase 2

### Task 2.1: Dashboard Stats Component

**Arquivo:** `frontend/src/pages/Dashboard.tsx`

**O que fazer:**
1. Adicionar `useEffect` para chamar `GET /api/v1/dashboard/stats`
2. Mostrar loading skeleton enquanto carrega
3. Exibir dados reais nos cards
4. Adicionar error handling

**Código exemplo:**

```typescript
import { useEffect, useState } from 'react'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/dashboard/stats`,
          { headers: getAuthHeaders() }
        )
        const data = await response.json()
        setStats(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  if (loading) return <LoadingSkeleton />
  if (error) return <ErrorAlert message={error} />

  return (
    <div className="grid grid-cols-4 gap-4">
      {/* Usar stats.total_flows aqui */}
    </div>
  )
}
```

**Checklist:**
- [ ] Remover dados fake
- [ ] Adicionar useEffect com fetch
- [ ] Implementar loading state
- [ ] Implementar error state
- [ ] Testar no navegador
- [ ] Commit: `feat: Dashboard real stats`

---

### Task 2.2: Flows Table Dinâmica

**Arquivo:** `frontend/src/pages/Flows.tsx`

**O que fazer:**
1. Chamar `GET /api/v1/flows` ao carregar página
2. Exibir flows em tabela
3. Adicionar paginação
4. Adicionar filtros (opcional)

**Código exemplo:**

```typescript
export default function Flows() {
  const [flows, setFlows] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFlows = async () => {
      try {
        const response = await fetch(
          `${getApiUrl()}/api/v1/flows?page=${page}&limit=20`,
          { headers: getAuthHeaders() }
        )
        const data = await response.json()
        setFlows(data.items)
      } finally {
        setLoading(false)
      }
    }

    fetchFlows()
  }, [page])

  return (
    <div>
      {/* Table com flows.map() */}
      {/* Pagination buttons */}
    </div>
  )
}
```

**Checklist:**
- [ ] Integrar com API
- [ ] Remover dados fake
- [ ] Implementar paginação
- [ ] Testar filtros
- [ ] Commit: `feat: Flows dynamic table`

---

### Task 2.3: Settings Persistência

**Arquivo:** `frontend/src/pages/Settings.tsx`

**O que fazer:**
1. Carregar configurações com `GET /api/v1/users/me/settings`
2. Atualizar com `PATCH /api/v1/users/me/settings`
3. Adicionar toast de sucesso
4. Validação de campos

**Código exemplo:**

```typescript
const handleSaveSettings = async (e) => {
  e.preventDefault()
  
  try {
    const response = await fetch(
      `${getApiUrl()}/api/v1/users/me/settings`,
      {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          theme: darkMode ? 'dark' : 'light',
          notifications: notificationsEnabled
        })
      }
    )
    
    if (response.ok) {
      showToast('Configurações salvas!', 'success')
    }
  } catch (err) {
    showToast('Erro ao salvar', 'error')
  }
}
```

**Checklist:**
- [ ] GET settings ao carregar
- [ ] PATCH ao salvar
- [ ] Toast notifications
- [ ] Error handling
- [ ] Commit: `feat: Settings persistence`

---

### Task 2.4: Loading States & Skeletons

**Arquivos:**
- `frontend/src/components/LoadingSkeleton.tsx` (novo)
- `frontend/src/components/ErrorAlert.tsx` (novo)

**O que fazer:**
1. Criar componente de skeleton (cinza piscante)
2. Criar componente de erro
3. Usar em todos os places com loading

**Código exemplo:**

```typescript
// LoadingSkeleton.tsx
export function LoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-12 bg-gray-300 rounded"></div>
      <div className="h-12 bg-gray-300 rounded"></div>
      <div className="h-12 bg-gray-300 rounded"></div>
    </div>
  )
}
```

**Checklist:**
- [ ] Criar componentes
- [ ] Usar em Dashboard
- [ ] Usar em Flows
- [ ] Usar em Settings
- [ ] Commit: `feat: Loading states & skeletons`

---

### Task 2.5: Error Handling

**Arquivo:** `frontend/src/components/ErrorBoundary.tsx` (novo)

**O que fazer:**
1. Criar Error Boundary component
2. Capturar erros em children
3. Mostrar fallback UI
4. Log errors (opcional)

**Checklist:**
- [ ] Error Boundary implementado
- [ ] Envolver componentes principais
- [ ] Testar com erro simulado
- [ ] Commit: `feat: Error boundary`

---

## 🔧 Backend - Verificar Endpoints

### Verificar se endpoints existem

```bash
# Listar todos os endpoints
curl http://localhost:8002/api/v1/docs

# Se não existir, você precisa criar no backend
# Seguir o padrão em backend/app/api/v1/endpoints/
```

### Criar Endpoints (se necessário)

Se os endpoints não existem, você precisa:

1. Criar em `backend/app/api/v1/endpoints/dashboard.py`:
```python
from fastapi import APIRouter, Depends

router = APIRouter()

@router.get("/stats")
async def get_dashboard_stats(organization_id: str = Depends(get_org_id)):
    """Get dashboard statistics"""
    return {
        "total_flows": 10,
        "active_flows": 5,
        "total_messages": 1240,
        "conversion_rate": 85.5
    }
```

2. Registrar no router em `backend/app/api/v1/router.py`:
```python
from .endpoints import dashboard

router.include_router(
    dashboard.router,
    prefix="/dashboard",
    tags=["dashboard"]
)
```

---

## 📊 Arquivos a Modificar/Criar

### Modificar (3)
```
frontend/src/pages/Dashboard.tsx      (add API call)
frontend/src/pages/Flows.tsx          (add API call)
frontend/src/pages/Settings.tsx       (add API call)
```

### Criar (3)
```
frontend/src/components/LoadingSkeleton.tsx
frontend/src/components/ErrorAlert.tsx
frontend/src/components/ErrorBoundary.tsx
```

### Total de Changes
```
~500-800 linhas de código novo
6 tarefas principais
5 commits granulares
```

---

## 📋 Checklist Phase 2

### Planning
- [ ] Verificar endpoints existem no backend
- [ ] Revisar estrutura de dados da API
- [ ] Planejar componentes novos

### Implementation
- [ ] Task 2.1: Dashboard stats
- [ ] Task 2.2: Flows table
- [ ] Task 2.3: Settings persistence
- [ ] Task 2.4: Loading/skeleton states
- [ ] Task 2.5: Error boundary

### Testing
- [ ] Testar cada endpoint no Postman/curl
- [ ] Testar loading states
- [ ] Testar error scenarios
- [ ] Testar offline behavior

### Code Quality
- [ ] Sem console.errors
- [ ] TypeScript tipos corretos
- [ ] Código formatado
- [ ] Commits descritivos

### Documentation
- [ ] Comentários no código
- [ ] Atualizar ROADMAP_FRONTEND.md
- [ ] Criar PHASE_2_SUMMARY.md

---

## 🚀 Como Começar

### Sequência Recomendada

1. **Verificar endpoints** (30 min)
   ```bash
   # Verificar se existem
   curl http://localhost:8002/api/v1/dashboard/stats
   curl http://localhost:8002/api/v1/flows
   curl http://localhost:8002/api/v1/users/me/settings
   
   # Se 404, criar no backend antes
   ```

2. **Começar com Dashboard** (2 horas)
   ```bash
   # Task 2.1: Dashboard stats
   # Mais simples e rápido
   ```

3. **Flows table** (2 horas)
   ```bash
   # Task 2.2: Flows dinâmica
   # Mais complexo (paginação)
   ```

4. **Settings** (1 hora)
   ```bash
   # Task 2.3: Settings CRUD
   ```

5. **Componentes de UX** (1 hora)
   ```bash
   # Task 2.4 & 2.5: Loading, Error states
   ```

**Total estimado:** 6-8 horas (1 dia de trabalho)

---

## 💡 Tips & Tricks

### Use Custom Hooks

Criar um hook para cada seção:

```typescript
// frontend/src/hooks/useDashboard.ts
export function useDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Fetch logic aqui
  }, [])

  return { stats, loading, error }
}
```

Uso no componente:
```typescript
const { stats, loading, error } = useDashboard()
```

### Reutilizar getAuthHeaders

Sempre usar em requisições autenticadas:

```typescript
const response = await fetch(url, {
  headers: getAuthHeaders()  // ✅ Correto
})
```

### Error Messages

Extrair do backend:

```typescript
try {
  const data = await response.json()
  setError(data.error?.message || 'Erro desconhecido')
} catch {
  setError('Erro ao conectar com servidor')
}
```

---

## 🐛 Debugging

### Verificar API Response

```bash
# No navegador Console
fetch('http://localhost:8002/api/v1/dashboard/stats', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('access_token')
  }
})
.then(r => r.json())
.then(d => console.log(d))
```

### Verificar Tokens

```bash
# No DevTools
localStorage.getItem('access_token')
localStorage.getItem('refresh_token')
```

### Verificar Logs

```bash
# Backend
podman compose logs -f backend | grep -i error

# Frontend
podman compose logs -f frontend | grep -i error
```

---

## 📚 Referências

### Código Existente
- `frontend/src/lib/api.ts` - API utilities
- `frontend/src/lib/auth/AuthContext.tsx` - Auth pattern
- `frontend/src/pages/Login.tsx` - Form pattern

### Documentação
- `ROADMAP_FRONTEND.md` - Planejamento completo
- `PHASE_1_BACKEND_INTEGRATION.md` - Como usamos API
- `.github/GIT_WORKFLOW.md` - Git conventions

### Swagger Docs
- http://localhost:8002/api/v1/docs - Ver todos endpoints

---

## ✅ Definition of Done

Phase 2 está pronta quando:

- [x] Dashboard mostra dados reais
- [x] Flows table carrega e pagina
- [x] Settings salva no backend
- [x] Loading states funcionam
- [x] Erros mostram mensagens
- [x] Sem console errors
- [x] Testes manuais passam
- [x] Código formatado
- [x] Commits descritivos
- [x] Documentação atualizada

---

## 🎯 Próximas Fases

Após Phase 2:
- **Phase 3:** Token refresh, Profile, Flow builder, WebSocket
- **Phase 4:** Testes, Performance, Accessibility

---

## 📞 Dúvidas?

Referências:
1. `ROADMAP_FRONTEND.md` - Planejamento detalhado
2. `TESTING_AUTHENTICATION.md` - Como testar
3. Swagger docs - Ver endpoints
4. `backend/app/main.py` - Entender estrutura backend

---

**Status:** Pronto para iniciar!

```bash
# Comando final para começar:
cd /home/administrator/pytake
git checkout develop
git pull origin develop
git checkout -b feature/PHASE2-dashboard-integration

# Começar Task 2.1: Dashboard Stats
# Ver instruções acima para os passos
```

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 24 de Novembro de 2025

