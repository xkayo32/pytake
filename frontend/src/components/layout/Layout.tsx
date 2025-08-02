import { Outlet, useLocation, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart3,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Moon,
  Sun,
  Bell,
  Search,
  User,
  LogOut,
  Smartphone,
  Wifi,
  WifiOff,
  Presentation
} from 'lucide-react'
import { useAuthStore } from '@/store/slices/authSlice'

interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/conversations', label: 'Conversas', icon: MessageSquare },
  { path: '/analytics', label: 'Analytics', icon: BarChart3 },
  { path: '/whatsapp-showcase', label: 'Showcase', icon: Presentation },
  { path: '/settings', label: 'Configurações', icon: Settings },
]

export default function Layout() {
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isConnected, setIsConnected] = useState(true)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    // Check for saved theme preference or default to light
    const savedTheme = localStorage.getItem('theme')
    const isDark = savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode
    setIsDarkMode(newDarkMode)
    document.documentElement.classList.toggle('dark', newDarkMode)
    localStorage.setItem('theme', newDarkMode ? 'dark' : 'light')
  }

  const handleLogout = () => {
    logout()
    setShowUserMenu(false)
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Minimal Sidebar */}
      <motion.aside 
        initial={{ x: -256 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-60 bg-card border-r border-border/50"
      >
        {/* Minimal Logo */}
        <div className="p-6 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 bg-primary/10 rounded-md flex items-center justify-center border border-primary/20">
              <Smartphone className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-medium text-foreground">PyTake</h1>
              <p className="text-xs text-muted-foreground">WhatsApp Business</p>
            </div>
          </div>
        </div>

        {/* Clean Connection Status */}
        <div className="px-6 py-2 mb-4">
          <div className="flex items-center space-x-2 text-xs">
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-muted-foreground">Conectado</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-red-500 rounded-full" />
                <span className="text-muted-foreground">Desconectado</span>
              </>
            )}
          </div>
        </div>

        {/* Clean Navigation */}
        <nav className="flex-1 px-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path
              const Icon = item.icon
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="block"
                >
                  <motion.div
                    whileHover={{ x: 2 }}
                    transition={{ duration: 0.15 }}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? 'bg-primary/10 text-primary border border-primary/20'
                        : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 flex-shrink-0" />
                    <span>{item.label}</span>
                  </motion.div>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Minimal User Section */}
        <div className="p-4 border-t border-border/50">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center space-x-3 p-2 rounded-md hover:bg-accent/50 transition-colors duration-150"
            >
              <div className="w-7 h-7 bg-muted rounded-md flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">{user?.name || 'Admin'}</p>
                <p className="text-xs text-muted-foreground">{user?.email || 'admin@pytake.com'}</p>
              </div>
            </button>
            
            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border/50 rounded-md py-1"
                >
                  <button
                    onClick={toggleTheme}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-accent/50 transition-colors duration-150"
                  >
                    {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors duration-150"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sair</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {/* Clean Header */}
        <motion.header 
          initial={{ y: -64 }}
          animate={{ y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="h-14 bg-background border-b border-border/50 px-6 flex items-center justify-between"
        >
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar..."
                className="pl-10 pr-4 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 w-64 transition-colors duration-150"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.15 }}
              className="relative p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-md transition-colors duration-150"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </motion.button>
          </div>
        </motion.header>

        {/* Page Content */}
        <div className="h-[calc(100vh-3.5rem)] overflow-auto bg-muted/20">
          <Outlet />
        </div>
      </main>
    </div>
  )
}