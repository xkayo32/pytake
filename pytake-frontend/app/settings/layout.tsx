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
  Webhook
} from 'lucide-react'

import { AppLayout } from '@/components/layout/app-layout'
import { Button } from '@/components/ui/button'

interface SettingsLayoutProps {
  children: ReactNode
}

const settingsNavigation = [
  {
    name: 'WhatsApp Business',
    href: '/settings/whatsapp',
    icon: MessageSquare,
    description: 'Configurações da API do WhatsApp'
  },
  {
    name: 'Integrações',
    href: '/settings/integrations',
    icon: Link2,
    description: 'ERP e sistemas externos'
  },
  {
    name: 'Equipe',
    href: '/settings/team',
    icon: Users,
    description: 'Gerenciar usuários e permissões'
  },
  {
    name: 'Cobrança',
    href: '/settings/billing',
    icon: CreditCard,
    description: 'Assinatura e pagamentos'
  },
  {
    name: 'Perfil',
    href: '/settings/profile',
    icon: User,
    description: 'Informações pessoais'
  },
  {
    name: 'Notificações',
    href: '/settings/notifications',
    icon: Bell,
    description: 'Alertas e comunicações'
  },
  {
    name: 'Segurança',
    href: '/settings/security',
    icon: Shield,
    description: 'Senha e autenticação'
  },
  {
    name: 'API & Webhooks',
    href: '/settings/api',
    icon: Webhook,
    description: 'Chaves de API e webhooks'
  },
  {
    name: 'Backup',
    href: '/settings/backup',
    icon: Database,
    description: 'Backup e recuperação'
  }
]

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  return (
    <AppLayout>
      <div className="flex h-full">
        {/* Settings Sidebar */}
        <div className="w-64 border-r bg-background/50">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">Configurações</h2>
            <p className="text-sm text-muted-foreground">
              Gerencie seu sistema
            </p>
          </div>
          
          <nav className="p-2">
            {settingsNavigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors mb-1
                    ${isActive 
                      ? 'bg-primary/10 text-primary' 
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 mt-0.5" />
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs opacity-70">{item.description}</div>
                  </div>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Settings Content */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </AppLayout>
  )
}