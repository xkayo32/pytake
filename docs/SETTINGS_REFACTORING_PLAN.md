# 🔧 Plano de Refatoração - Configurações UX/UI

**Data:** 19 de Novembro de 2025  
**Autor:** Kayo Carvalho Fernandes  
**Status:** 📋 Pronto para Implementação

---

## 🎯 Objetivo

Eliminar redundância de navegação em configurações e criar hierarquia clara:
- **User Settings** (`/settings`) - Configurações pessoais  
- **Admin Settings** (`/admin/settings`) - Configurações organizacionais  

---

## 📊 Estado Atual vs Futuro

### ANTES (Confuso)
```
User → /settings/whatsapp        (Aba pessoal)
User → /admin/settings           (Grid de cards)
User → /admin/settings/organization?tab=departments (Tabs internos)

Problema: 3 formas de chegar em 1 lugar
```

### DEPOIS (Claro)
```
User → /settings/whatsapp        (Aba pessoal)
Admin → /admin/settings/organization (Estrutura clara)

Problema: Resolvido! ✅
```

---

## 📁 Mudanças de Estrutura de Pastas

### ANTES
```
frontend/
├── app/
│   ├── settings/
│   │   ├── layout.tsx
│   │   ├── page.tsx (redirect)
│   │   ├── whatsapp/
│   │   ├── profile/
│   │   ├── team/
│   │   ├── security/
│   │   └── ...
│   └── admin/
│       ├── settings/
│       │   ├── page.tsx (GRID DE CARDS ❌)
│       │   ├── organization/
│       │   │   └── page.tsx (com tabs internos)
│       │   ├── appearance/
│       │   ├── ai-assistant/
│       │   └── notifications/
│       └── ... other admin pages
```

### DEPOIS
```
frontend/
├── app/
│   ├── settings/
│   │   ├── layout.tsx (MANTÉM TAL QUAL)
│   │   ├── page.tsx (redirect)
│   │   ├── whatsapp/
│   │   ├── profile/
│   │   ├── team/
│   │   ├── security/
│   │   └── ...
│   └── admin/
│       ├── settings/
│       │   ├── layout.tsx (NOVA - Com left sidebar)
│       │   ├── page.tsx (REMOVE - Redirect para organization)
│       │   ├── organization/
│       │   │   ├── page.tsx (RENOMEADA - info)
│       │   │   ├── departments/
│       │   │   ├── queues/
│       │   │   └── layout.tsx (Novo - subnav)
│       │   ├── appearance/
│       │   ├── ai-assistant/
│       │   ├── notifications/
│       │   ├── security/
│       │   ├── audit-logs/
│       │   └── ... (mais pages)
│       └── ... other admin pages
```

---

## 🔧 Implementação Passo a Passo

### PASSO 1: Criar AdminSettingsLayout

**Arquivo:** `frontend/app/admin/settings/layout.tsx`

```tsx
'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  Palette,
  Sparkles,
  Bell,
  Shield,
  LogsIcon,
  ChevronRight
} from 'lucide-react'

interface AdminSettingsNavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  description?: string
  subitems?: AdminSettingsNavItem[]
}

interface AdminSettingsLayoutProps {
  children: ReactNode
}

const adminSettingsNav: AdminSettingsNavItem[] = [
  {
    label: 'Organização',
    href: '/admin/settings/organization',
    icon: Building2,
    description: 'Dados da empresa, departamentos e filas',
    subitems: [
      {
        label: 'Informações Gerais',
        href: '/admin/settings/organization',
        icon: Building2,
      },
      {
        label: 'Departamentos',
        href: '/admin/settings/organization/departments',
        icon: Building2,
      },
      {
        label: 'Filas',
        href: '/admin/settings/organization/queues',
        icon: ListTodo,
      },
    ],
  },
  {
    label: 'Aparência',
    href: '/admin/settings/appearance',
    icon: Palette,
    description: 'Tema, idioma e personalização',
  },
  {
    label: 'AI Assistant',
    href: '/admin/settings/ai-assistant',
    icon: Sparkles,
    description: 'Configuração de IA para respostas',
  },
  {
    label: 'Notificações',
    href: '/admin/settings/notifications',
    icon: Bell,
    description: 'Alertas e comunicações',
  },
  {
    label: 'Segurança',
    href: '/admin/settings/security',
    icon: Shield,
    description: 'Autenticação e políticas',
  },
  {
    label: 'Logs de Auditoria',
    href: '/admin/settings/audit-logs',
    icon: LogsIcon,
    description: 'Histórico de mudanças',
  },
]

export default function AdminSettingsLayout({ children }: AdminSettingsLayoutProps) {
  const pathname = usePathname()
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  return (
    <div className="flex h-full gap-6">
      {/* Left Sidebar */}
      <aside className="w-64 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
        <div className="p-6 space-y-1">
          {adminSettingsNav.map((item) => {
            const Icon = item.icon
            const hasSubitems = item.subitems && item.subitems.length > 0
            const itemActive = isActive(item.href)
            const isExpanded = expandedItem === item.label

            return (
              <div key={item.label}>
                {/* Main Item */}
                <button
                  onClick={() => {
                    if (hasSubitems) {
                      setExpandedItem(isExpanded ? null : item.label)
                    } else {
                      // Navigate without expanding
                      window.location.href = item.href
                    }
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left
                    ${itemActive
                      ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {hasSubitems && (
                    <ChevronRight
                      className={`w-4 h-4 transition-transform ${
                        isExpanded ? 'rotate-90' : ''
                      }`}
                    />
                  )}
                </button>

                {/* Subitems */}
                {hasSubitems && isExpanded && (
                  <div className="mt-1 ml-4 space-y-1 border-l-2 border-gray-200 dark:border-gray-700 pl-4">
                    {item.subitems.map((subitem) => {
                      const SubIcon = subitem.icon
                      const subActive = pathname === subitem.href

                      return (
                        <Link
                          key={subitem.label}
                          href={subitem.href}
                          className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm
                            ${subActive
                              ? 'bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 font-medium'
                              : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                            }
                          `}
                        >
                          <SubIcon className="w-4 h-4 flex-shrink-0" />
                          <span>{subitem.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

---

### PASSO 2: Refatorar `/admin/settings/page.tsx`

**Arquivo:** `frontend/app/admin/settings/page.tsx`

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

// Redirect to organization (primeira seção)
export default function SettingsPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/admin/settings/organization')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
    </div>
  )
}
```

---

### PASSO 3: Reorganizar Organization Settings

**Mover arquivo:**
```
frontend/app/admin/settings/organization/page.tsx
→ frontend/app/admin/settings/organization/page.tsx (renomear conteúdo)
```

**Novo arquivo:** `frontend/app/admin/settings/organization/layout.tsx`

```tsx
'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Building2, Users2, ListTodo } from 'lucide-react'

interface OrganizationLayoutProps {
  children: ReactNode
}

const orgNavigation = [
  {
    label: 'Informações Gerais',
    href: '/admin/settings/organization',
    icon: Building2,
  },
  {
    label: 'Departamentos',
    href: '/admin/settings/organization/departments',
    icon: Users2,
  },
  {
    label: 'Filas',
    href: '/admin/settings/organization/queues',
    icon: ListTodo,
  },
]

export default function OrganizationLayout({ children }: OrganizationLayoutProps) {
  const pathname = usePathname()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Organização
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Gerencie dados da sua organização, departamentos e filas de atendimento
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800">
        <nav className="flex gap-8">
          {orgNavigation.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`
                  flex items-center gap-2 px-1 py-3 text-sm font-medium border-b-2 transition-all
                  ${isActive
                    ? 'border-purple-600 text-purple-600 dark:text-purple-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Content */}
      {children}
    </div>
  )
}
```

---

### PASSO 4: Criar Pages Vazias para Subitens

**Arquivo:** `frontend/app/admin/settings/organization/departments/page.tsx`

```tsx
import { redirect } from 'next/navigation'

// Esta seção é renderizada pelo layout.tsx do parent
// Se acessar diretamente, redirecionar para organização com tab
export default function DepartmentsPage() {
  redirect('/admin/settings/organization')
}
```

Similar para `queues/page.tsx`.

---

## 🚨 Checklist de Implementação

### Fase 1: Estrutura Base
- [ ] Criar `admin/settings/layout.tsx` com sidebar
- [ ] Atualizar `admin/settings/page.tsx` para redirect
- [ ] Criar `admin/settings/organization/layout.tsx`
- [ ] Mover conteúdo de pages

### Fase 2: Navegação
- [ ] Testar navegação entre páginas
- [ ] Validar estado ativo de links
- [ ] Testar mobile responsiveness
- [ ] Validar collapse/expand de subitems

### Fase 3: Content
- [ ] Garantir cada página carrega conteúdo correto
- [ ] Validar formulários funcionam
- [ ] Testar save/update de dados

### Fase 4: Cleanup
- [ ] Remover grid de cards duplicados
- [ ] Atualizar AdminSidebar (remover duplicatas)
- [ ] Testar todos os links apontam corretamente
- [ ] Validar permissões de acesso

### Fase 5: Testing
- [ ] Teste em desktop
- [ ] Teste em tablet
- [ ] Teste em mobile
- [ ] Teste com diferentes roles

### Fase 6: Deploy
- [ ] Criar PR com mudanças
- [ ] Code review
- [ ] Merge para develop
- [ ] Deploy para produção

---

## 📋 Pontos de Atenção

### 1. **Permissões de Acesso**
Garantir que apenas admins acessem `/admin/settings/*`.

### 2. **Links Internos**
Verificar se há links para essas páginas em outras partes do código.

### 3. **API Routes**
Validar que endpoints API continuam funcionando.

### 4. **Testes de Regressão**
- [ ] Departamentos ainda listam corretamente
- [ ] Filas ainda listam corretamente
- [ ] Criar/editar/deletar funcionam
- [ ] Validações funcionam

### 5. **Mobile UX**
- Sidebar colapsável em mobile
- Menu hamburger
- Texto legível

---

## 🎯 Resultado Final

### User Settings (`/settings`)
```
Fácil de usar ✅
Abas horizontais limpas
Sem confusão
```

### Admin Settings (`/admin/settings`)
```
Hierarquia clara ✅
Sidebar com subitems
Navegação intuitiva
Sem redundância
```

---

**Implementado por:** Kayo Carvalho Fernandes  
**Data:** 19 de Novembro de 2025  
**Versão:** 1.0
