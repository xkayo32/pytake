import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { Button } from '@components/ui/button'
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
  ChevronLeft,
  Moon,
  Sun,
} from 'lucide-react'
import { useState, useEffect } from 'react'

export default function Sidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout, user } = useAuth()
  const [isOpen, setIsOpen] = useState(true)
  const [isDark, setIsDark] = useState(false)

  // Initialize theme from localStorage or system preference
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      setIsDark(savedTheme === 'dark')
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      setIsDark(prefersDark)
      document.documentElement.classList.toggle('dark', prefersDark)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.classList.toggle('dark', newTheme)
  }

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
    <div
      className={`${
        isOpen ? 'w-64' : 'w-[72px]'
      } bg-card border-r border-border transition-all duration-300 flex flex-col h-screen`}
    >
      {/* Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-border">
        {isOpen && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-whatsapp rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">PyTake</span>
          </div>
        )}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 hover:bg-muted rounded-lg transition-colors"
          aria-label={isOpen ? 'Colapsar menu' : 'Expandir menu'}
        >
          {isOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* User Info */}
      {isOpen && (
        <div className="px-4 py-3 bg-muted/30 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-whatsapp rounded-full flex items-center justify-center text-white font-semibold text-sm">
              {user?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">
                {user?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email || 'email@exemplo.com'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = location.pathname === item.href

          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'bg-primary-500/10 text-primary-600 dark:text-primary-400 font-medium border-l-[3px] border-primary-500'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${!isOpen ? 'justify-center' : ''}`}
              title={!isOpen ? item.label : ''}
            >
              <Icon size={20} className="flex-shrink-0" />
              {isOpen && <span className="text-sm">{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 space-y-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-muted-foreground hover:bg-muted hover:text-foreground ${
            !isOpen ? 'justify-center' : ''
          }`}
          title={!isOpen ? (isDark ? 'Modo claro' : 'Modo escuro') : ''}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
          {isOpen && <span className="text-sm">{isDark ? 'Modo Claro' : 'Modo Escuro'}</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-destructive hover:bg-destructive/10 ${
            !isOpen ? 'justify-center' : ''
          }`}
          title={!isOpen ? 'Desconectar' : ''}
        >
          <LogOut size={20} />
          {isOpen && <span className="text-sm">Desconectar</span>}
        </button>
      </div>
    </div>
  )
}
