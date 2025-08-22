'use client'

import { useTheme } from '@/lib/hooks/useTheme'
import { Sun, Moon } from 'lucide-react'

export function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme()

  if (!mounted) {
    return (
      <div className="w-16 h-8 rounded-full bg-muted animate-pulse" />
    )
  }

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle"
      aria-label={`Alterar para tema ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      <div className="theme-toggle-thumb">
        {theme === 'light' ? (
          <Sun className="w-3 h-3 text-amber-500" />
        ) : (
          <Moon className="w-3 h-3 text-blue-400" />
        )}
      </div>
    </button>
  )
}