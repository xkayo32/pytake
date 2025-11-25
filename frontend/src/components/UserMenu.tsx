import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@lib/auth/AuthContext'
import { LogOut, Settings, User, ChevronDown } from 'lucide-react'

export function UserMenu() {
  const { user, logout } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
          <span className="text-white text-sm font-bold">
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-600 dark:text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">
              {user?.full_name}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {user?.email}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 capitalize">
              {user?.role}
            </p>
          </div>

          {/* Menu Items */}
          <div className="py-2">
            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              onClick={() => setIsOpen(false)}
            >
              <User className="w-4 h-4" />
              Perfil
            </Link>

            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              onClick={() => setIsOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Configurações
            </Link>

            <hr className="my-2 border-slate-200 dark:border-slate-700" />

            <Link
              to="/logout"
              className="flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              onClick={() => setIsOpen(false)}
            >
              <LogOut className="w-4 h-4" />
              Desconectar
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserMenu
