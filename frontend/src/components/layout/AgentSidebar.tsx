import { Link, useLocation } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { PermissionGate } from '@/components/auth/RoleBasedRoute'
import { useRoleBasedUI } from '@/hooks/usePermissions'
import { 
  MessageSquare, 
  Users, 
  FileText, 
  BarChart3,
  Settings,
  User,
  Upload,
  Headphones,
  Bell
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permissions?: string[]
  badge?: number
}

export function AgentSidebar() {
  const location = useLocation()
  const { isAgent, isSupervisor, isAdmin, canViewAnalytics } = useRoleBasedUI()

  // Define navigation based on user role
  const agentNavigation: NavItem[] = [
    {
      name: 'Conversas',
      href: '/app/conversations',
      icon: MessageSquare,
      // badge: 0 // TODO: Get real unread count from API
    },
    {
      name: 'Contatos',
      href: '/app/contacts',
      icon: Users
    },
    {
      name: 'Templates',
      href: '/app/templates',
      icon: FileText
    },
    {
      name: 'Mídia',
      href: '/app/media',
      icon: Upload
    }
  ]

  const supervisorNavigation: NavItem[] = [
    {
      name: 'Dashboard',
      href: '/app/dashboard',
      icon: BarChart3
    },
    ...agentNavigation,
    {
      name: 'Equipe',
      href: '/app/team',
      icon: Headphones
    },
    {
      name: 'Analytics',
      href: '/app/analytics',
      icon: BarChart3
    }
  ]

  const adminNavigation: NavItem[] = [
    ...supervisorNavigation,
    {
      name: 'Admin',
      href: '/app/admin',
      icon: Settings
    }
  ]

  // Select navigation based on role
  const navigation = isAdmin ? adminNavigation : 
                   isSupervisor ? supervisorNavigation : 
                   agentNavigation

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Logo */}
      <div className="p-4 border-b border-border">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== '/app/dashboard' && location.pathname.startsWith(item.href))
          
          return (
            <PermissionGate key={item.name} permissions={item.permissions as any}>
              <Link
                to={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="flex-1">{item.name}</span>
                {item.badge && (
                  <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                    {item.badge}
                  </span>
                )}
              </Link>
            </PermissionGate>
          )
        })}
      </nav>

      {/* User section */}
      <div className="p-4 border-t border-border">
        <div className="space-y-2">
          <Link
            to="/app/profile"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <User className="h-4 w-4" />
            <span>Perfil</span>
          </Link>
          
          <Link
            to="/app/settings"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
            <span>Configurações</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

// Role-specific dashboard components
export function AgentDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Meu Atendimento</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground">Conversas Ativas</h3>
          <p className="text-2xl font-bold">12</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground">Mensagens Hoje</h3>
          <p className="text-2xl font-bold">84</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground">Tempo Médio Resposta</h3>
          <p className="text-2xl font-bold">2m 15s</p>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Conversas Pendentes</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Cliente {i}</p>
                <p className="text-sm text-muted-foreground">Aguardando há 5 minutos</p>
              </div>
              <Button size="sm">Atender</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function SupervisorDashboard() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard da Equipe</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Conversas</h3>
          <p className="text-2xl font-bold">127</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground">Agentes Online</h3>
          <p className="text-2xl font-bold">8/12</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground">Tempo Médio</h3>
          <p className="text-2xl font-bold">1m 45s</p>
        </div>
        
        <div className="bg-card p-6 rounded-lg border">
          <h3 className="text-sm font-medium text-muted-foreground">Satisfação</h3>
          <p className="text-2xl font-bold">94%</p>
        </div>
      </div>

      {/* Team performance chart would go here */}
      <div className="bg-card p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">Performance da Equipe</h3>
        <p className="text-muted-foreground">Gráfico de performance seria renderizado aqui</p>
      </div>
    </div>
  )
}