import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Button } from '@components/ui/button'
import {
  LayoutDashboard,
  Zap,
  MessageSquare,
  Users,
  BarChart,
  Settings,
  LogOut,
} from 'lucide-react'

export default function Sidebar() {
  const location = useLocation()
  const { logout } = useAuth()

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Zap, label: 'Automações', href: '/automations' },
    { icon: Zap, label: 'Fluxos', href: '/flows' },
    { icon: MessageSquare, label: 'Templates', href: '/templates' },
    { icon: Users, label: 'Contatos', href: '/contacts' },
    { icon: BarChart, label: 'Analytics', href: '/analytics' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ]

  return (
    <div className="w-64 bg-slate-900 text-white p-4 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">PyTake</h1>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center space-x-3 px-4 py-2 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <Button
        onClick={logout}
        variant="ghost"
        className="w-full justify-start text-slate-300 hover:bg-slate-800"
      >
        <LogOut size={20} className="mr-2" />
        Sair
      </Button>
    </div>
  )
}
