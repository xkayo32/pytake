'use client'

import { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { 
  MessageSquare, 
  Users, 
  Link2, 
  CreditCard, 
  Shield,
  User,
  Bell,
  Database,
  Key,
  Webhook,
  UserCheck,
  Clock
} from 'lucide-react'

import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'

interface SettingsLayoutProps {
  children: ReactNode
}

const settingsNavigation = [
  {
    name: 'WhatsApp',
    href: '/settings/whatsapp',
    icon: MessageSquare,
    description: 'Configurações da API do WhatsApp'
  },
  {
    name: 'Perfil',
    href: '/settings/profile',
    icon: User,
    description: 'Informações pessoais'
  },
  {
    name: 'Equipe',
    href: '/settings/team',
    icon: Users,
    description: 'Gerenciar usuários e permissões'
  },
  {
    name: 'Filas',
    href: '/settings/queues',
    icon: UserCheck,
    description: 'Configurar filas e agentes'
  },
  {
    name: 'Integrações',
    href: '/settings/integrations',
    icon: Link2,
    description: 'ERP e sistemas externos'
  },
  {
    name: 'API',
    href: '/settings/api',
    icon: Key,
    description: 'Chaves de API e webhooks'
  },
  {
    name: 'Cobrança',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Assinatura e pagamentos'
  },
  {
    name: 'Segurança',
    href: '/settings/security',
    icon: Shield,
    description: 'Senha e autenticação'
  },
  {
    name: 'Notificações',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Alertas e comunicações'
  }
]

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Settings Header with Tabs */}
        <div className="border-b bg-background/95 backdrop-blur">
          <div className="px-6 pt-6">
            <h2 className="text-2xl font-bold">Configurações</h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Gerencie todas as configurações do seu sistema
            </p>
          </div>
          
          {/* Tab Navigation */}
          <div className="px-6">
            <nav className="flex gap-6 overflow-x-auto scrollbar-hide">
              {settingsNavigation.map((item) => {
                const Icon = item.icon
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-1 py-3 text-sm font-medium transition-all
                      border-b-2 whitespace-nowrap relative
                      ${isActive 
                        ? 'text-primary border-primary' 
                        : 'text-muted-foreground border-transparent hover:text-foreground'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                    {isActive && (
                      <span className="absolute -bottom-[2px] left-0 right-0 h-0.5 bg-primary rounded-full" />
                    )}
                  </Link>
                )
              })}
            </nav>
          </div>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AppLayout>
  )
}