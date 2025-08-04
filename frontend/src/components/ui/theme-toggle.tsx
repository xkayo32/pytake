import { motion } from 'framer-motion'
import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from './button'

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  const themes = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' }
  ] as const

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      {themes.map((t) => {
        const Icon = t.icon
        const isActive = theme === t.value
        
        return (
          <motion.div
            key={t.value}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              variant={isActive ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTheme(t.value as any)}
              className={`relative h-8 w-8 p-0 ${
                isActive 
                  ? 'bg-primary text-primary-foreground' 
                  : 'hover:bg-accent'
              }`}
              title={t.label}
            >
              <Icon className="h-4 w-4" />
              {isActive && (
                <motion.div
                  layoutId="activeTheme"
                  className="absolute inset-0 rounded-md border-2 border-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Button>
          </motion.div>
        )
      })}
    </div>
  )
}

export function ThemeToggleCompact() {
  const { theme, setTheme, resolvedTheme } = useTheme()
  
  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark')
    else if (theme === 'dark') setTheme('system')
    else setTheme('light')
  }
  
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor
  
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={cycleTheme}
      className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
      title={`Tema: ${theme === 'system' ? 'Sistema' : theme === 'light' ? 'Claro' : 'Escuro'}`}
    >
      <motion.div
        key={theme}
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Icon className="h-4 w-4" />
      </motion.div>
    </motion.button>
  )
}