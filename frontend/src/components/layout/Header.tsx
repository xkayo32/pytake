import { Menu, X, Sun, Moon } from 'lucide-react'
import { useState, useContext } from 'react'
import { AuthContext } from '@lib/auth/authContext'
import { UserMenu } from './UserMenu'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(document.documentElement.classList.contains('dark'))
  const { user } = useContext(AuthContext)

  const toggleDarkMode = () => {
    document.documentElement.classList.toggle('dark')
    setDarkMode(!darkMode)
    localStorage.setItem('darkMode', String(!darkMode))
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary/10 to-accent/10 backdrop-blur-md border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="hidden sm:block text-lg font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            PyTake
          </span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {user && (
            <>
              <nav className="flex gap-6 text-sm font-medium">
                <a href="/dashboard" className="text-foreground hover:text-primary transition-colors">Dashboard</a>
                <a href="/conversations" className="text-foreground hover:text-primary transition-colors">Conversas</a>
                <a href="/campaigns" className="text-foreground hover:text-primary transition-colors">Campanhas</a>
              </nav>
            </>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-background rounded-lg transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-slate-600" />
            )}
          </button>

          {/* User Menu */}
          {user && <UserMenu />}

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-background rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && user && (
        <div className="md:hidden border-t border-border bg-card">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-3">
            <a href="/dashboard" className="px-3 py-2 hover:bg-secondary rounded-lg transition-colors">Dashboard</a>
            <a href="/conversations" className="px-3 py-2 hover:bg-secondary rounded-lg transition-colors">Conversas</a>
            <a href="/campaigns" className="px-3 py-2 hover:bg-secondary rounded-lg transition-colors">Campanhas</a>
          </nav>
        </div>
      )}
    </header>
  )
}
