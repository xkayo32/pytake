'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  MessageSquare, 
  Users, 
  BarChart3, 
  Bot,
  Zap,
  Settings,
  Home,
  FileText,
  Megaphone,
  Workflow,
  ChevronLeft,
  ChevronRight,
  UserCircle,
  Building2,
  CreditCard,
  HelpCircle,
  LogOut,
  Bell,
  Shield,
  Webhook,
  Phone,
  Send,
  UserCheck
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LogoInline } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/hooks/useAuth'
import { NotificationStatus } from '@/components/ui/notification-status'

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const pathname = usePathname()
  const { user, logout } = useAuth()

  // Real-time updates for unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/v1/conversations/unread-count')
        if (response.ok) {
          const data = await response.json()
          setUnreadCount(data.count || 0)
        } else {
          setUnreadCount(0)
        }
      } catch (error) {
        setUnreadCount(0)
      }
    }

    // Initial fetch
    fetchUnreadCount()

    // Poll every 10 seconds for real-time updates
    const interval = setInterval(fetchUnreadCount, 10000)

    return () => {
      clearInterval(interval)
    }
  }, [])

  // Create menu items with dynamic unread count
  const menuItems = [
    {
      title: 'Principal',
      items: [
        { icon: Home, label: 'Dashboard', href: '/dashboard' },
        { icon: UserCheck, label: 'Meu Dashboard', href: '/agent/dashboard' },
        { icon: MessageSquare, label: 'Conversas', href: '/conversations', badge: unreadCount > 0 ? unreadCount.toString() : undefined },
        { icon: Users, label: 'Contatos', href: '/contacts' },
        { icon: UserCheck, label: 'Filas', href: '/queues' },
        { icon: BarChart3, label: 'Analytics', href: '/analytics' },
      ]
    },
    {
      title: 'Automação',
      items: [
        { icon: Bot, label: 'Fluxos', href: '/flows' },
        { icon: Workflow, label: 'Campanhas', href: '/campaigns' },
        { icon: Megaphone, label: 'Broadcast', href: '/broadcast' },
      ]
    },
    {
      title: 'Integrações',
      items: [
        { icon: Zap, label: 'ERP', href: '/integrations/erp' },
        { icon: Webhook, label: 'Webhooks', href: '/webhooks' },
        { icon: Shield, label: 'API Keys', href: '/api-keys' },
      ]
    },
    {
      title: 'WhatsApp',
      items: [
        { icon: Phone, label: 'Configurações', href: '/settings/whatsapp' },
        { icon: FileText, label: 'Templates', href: '/templates' },
        { icon: Send, label: 'Enviar Mensagem', href: '/messages/send' },
      ]
    },
    {
      title: 'Configurações',
      items: [
        { icon: Building2, label: 'Empresa', href: '/settings/company' },
        { icon: UserCircle, label: 'Perfil', href: '/settings/profile' },
        { icon: Users, label: 'Equipe', href: '/settings/team' },
        { icon: CreditCard, label: 'Assinatura', href: '/settings/billing' },
        { icon: Settings, label: 'Sistema', href: '/settings/system' },
      ]
    },
  ]

  return (
    <aside className={cn(
      "border-r bg-surface h-screen sticky top-0 transition-all duration-300 flex flex-col",
      collapsed ? "w-20" : "w-64"
    )}>
      {/* Header */}
      <div className="h-16 border-b flex items-center justify-between px-4">
        {!collapsed && <LogoInline className="h-10" />}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((section) => (
          <div key={section.title} className="mb-6">
            {!collapsed && (
              <h3 className="px-4 mb-2 text-xs font-semibold text-foreground-tertiary uppercase tracking-wider">
                {section.title}
              </h3>
            )}
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative group",
                        isActive 
                          ? "bg-primary/10 text-primary" 
                          : "hover:bg-surface-secondary text-foreground-secondary hover:text-foreground",
                        collapsed && "justify-center"
                      )}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 text-sm font-medium">{item.label}</span>
                          {item.badge && (
                            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                      {collapsed && item.badge && (
                        <div className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs w-5 h-5 rounded-full flex items-center justify-center">
                          {item.badge}
                        </div>
                      )}
                      {collapsed && (
                        <div className="absolute left-full ml-2 px-2 py-1 bg-slate-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                          {item.label}
                        </div>
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t p-4 space-y-2">
        {/* Notifications */}
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
          {!collapsed && <span className="text-sm font-medium">Notificações</span>}
          <NotificationStatus showUnreadCount={true} />
        </div>
        
        {/* Help */}
        <Button variant="ghost" className={cn("w-full", collapsed ? "px-0" : "justify-start")}>
          <HelpCircle className="h-4 w-4" />
          {!collapsed && <span className="ml-3 text-sm">Ajuda</span>}
        </Button>

        {/* User */}
        {!collapsed && user && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                <UserCircle className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-foreground-tertiary truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}

        {/* Logout */}
        <Button 
          variant="ghost" 
          className={cn("w-full text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950", collapsed ? "px-0" : "justify-start")}
          onClick={logout}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-3 text-sm">Sair</span>}
        </Button>
      </div>
    </aside>
  )
}