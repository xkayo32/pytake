import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Button } from '@components/ui/button'
import UserMenu from '@components/UserMenu'
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Send,
  BarChart3,
  Settings,
  Users,
  Zap,
  Menu,
  LogOut,
} from 'lucide-react'
import { useState } from 'react'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isOpen, setIsOpen] = useState(true)

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: MessageCircle, label: 'Conversas', href: '/conversations' },
    { icon: MessageSquare, label: 'Templates', href: '/templates' },
    { icon: Send, label: 'Campanhas', href: '/campaigns' },
    { icon: Send, label: 'Broadcast', href: '/broadcast' },
    { icon: BarChart3, label: 'Relatórios', href: '/reports' },
    { icon: Users, label: 'Usuários', href: '/users' },
    { icon: Zap, label: 'Integrações', href: '/integrations' },
    { icon: Settings, label: 'Configurações', href: '/settings' },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/logout')
  }

  return (
    <div className={`${isOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col h-screen border-r border-slate-800`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-800">
        {isOpen && <h1 className="text-2xl font-bold">PyTake</h1>}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 hover:bg-slate-800 rounded-lg"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* User Info */}
      {isOpen && (
        <div className="px-4 py-3 bg-slate-800/50 border-b border-slate-800">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Usuário</p>
          <p className="text-sm font-semibold truncate">{user?.full_name}</p>
          <p className="text-xs text-slate-400 truncate">{user?.email}</p>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
              title={!isOpen ? item.label : ''}
            >
              <Icon size={20} className="flex-shrink-0" />
              {isOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-800 p-4 space-y-2">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className={`w-full justify-start text-red-400 hover:bg-red-900/20 hover:text-red-300 ${!isOpen ? 'px-2' : ''}`}
          title={!isOpen ? 'Desconectar' : ''}
        >
          <LogOut size={20} className={!isOpen ? '' : 'mr-2'} />
          {isOpen && <span>Desconectar</span>}
        </Button>
      </div>
    </div>
  )
}
