'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  MessageSquare, 
  Zap, 
  Users, 
  Send, 
  FileText, 
  Settings, 
  BarChart3,
  Menu,
  X,
  LogOut,
  User,
  Brain,
  Database,
  UserCheck,
  Clock,
  UsersRound
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scrollarea'
import { useAuth } from '@/lib/hooks/useAuth'

interface SidebarProps {
  className?: string
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    description: 'Visão geral'
  },
  {
    name: 'Conversas',
    href: '/conversations',
    icon: MessageSquare,
    description: 'Monitoramento'
  },
  {
    name: 'Enviar',
    href: '/messages/send',
    icon: Send,
    description: 'Mensagens'
  },
  {
    name: 'Flows',
    href: '/flows',
    icon: Zap,
    description: 'Automações'
  },
  {
    name: 'Campanhas',
    href: '/campaigns',
    icon: Send,
    description: 'Marketing'
  },
  {
    name: 'Contatos',
    href: '/contacts',
    icon: Users,
    description: 'CRM e Grupos'
  },
  {
    name: 'Filas',
    href: '/queues',
    icon: UserCheck,
    description: 'Atendimento'
  },
  {
    name: 'Templates',
    href: '/templates',
    icon: FileText,
    description: 'Mensagens'
  },
  {
    name: 'AI Assistant',
    href: '/ai-assistant',
    icon: Brain,
    description: 'Inteligência Artificial'
  },
  {
    name: 'Integrações',
    href: '/integrations',
    icon: Database,
    description: 'ERPs e Sistemas'
  },
]

const settingsNavigation = [
  {
    name: 'Configurações',
    href: '/settings',
    icon: Settings,
    description: 'Sistema'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: BarChart3,
    description: 'Relatórios'
  }
]

export function Sidebar({ className = '' }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const { user, logout } = useAuth()
  
  console.log('🔄 Sidebar: Component rendered, current unreadCount:', unreadCount)

  // Real-time updates for unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/v1/conversations/unread-count')
        if (response.ok) {
          const data = await response.json()
          console.log('📊 Sidebar: Fetched unread count:', data.count)
          setUnreadCount(data.count || 0)
        } else if (response.status === 404) {
          console.warn('⚠️ Sidebar: Backend API not available (404). Setting count to 0.')
          setUnreadCount(0)
        }
      } catch (error) {
        console.warn('⚠️ Sidebar: Backend API not available. Setting count to 0:', error)
        setUnreadCount(0)
      }
    }

    // Listen for conversations cleared event
    const handleConversationsCleared = () => {
      console.log('📧 Sidebar: Conversations cleared, updating count to 0')
      setUnreadCount(0)
    }

    // Listen for window events from settings page
    window.addEventListener('conversationsCleared', handleConversationsCleared)

    // Force reset counter on component mount
    console.log('🔄 Sidebar: Forcing unread count reset on mount')
    setUnreadCount(0)
    
    // Initial fetch
    fetchUnreadCount()

    // Poll every 10 seconds for real-time updates
    // TODO: Replace with WebSocket when backend WebSocket proxy is configured
    const interval = setInterval(fetchUnreadCount, 10000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('conversationsCleared', handleConversationsCleared)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <MessageSquare className="h-8 w-8 text-primary" />
        {!isCollapsed && (
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            PyTake
          </span>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors relative
                  ${active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                `}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate">{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                    )}
                  </div>
                )}
                {/* Unread count badge for Conversations */}
                {item.href === '/conversations' && unreadCount > 0 && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        {/* Separator */}
        <div className="my-4 border-t" />

        {/* Settings Navigation */}
        <div className="space-y-1">
          {settingsNavigation.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`
                  flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors
                  ${active 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }
                `}
                onClick={() => setIsMobileOpen(false)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                {!isCollapsed && (
                  <div className="flex flex-col min-w-0">
                    <span className="truncate">{item.name}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground truncate">{item.description}</span>
                    )}
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      </ScrollArea>

      {/* User Menu */}
      <div className="border-t p-3">
        <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2">Sair</span>}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        className="fixed top-4 left-4 z-50 md:hidden"
        onClick={() => setIsMobileOpen(true)}
      >
        <Menu className="h-4 w-4" />
      </Button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden" 
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <div className={`
        fixed left-0 top-0 z-50 h-full w-64 transform bg-background shadow-lg transition-transform duration-300 md:hidden
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="absolute right-4 top-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <SidebarContent />
      </div>

      {/* Desktop sidebar */}
      <div className={`
        hidden h-full border-r bg-background transition-all duration-300 md:flex md:flex-col
        ${isCollapsed ? 'w-16' : 'w-64'}
        ${className}
      `}>
        {/* Collapse button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute -right-3 top-6 z-10 h-6 w-6 rounded-full border bg-background p-0"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? <Menu className="h-3 w-3" /> : <X className="h-3 w-3" />}
        </Button>
        
        <SidebarContent />
      </div>
    </>
  )
}