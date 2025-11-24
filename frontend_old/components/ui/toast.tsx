'use client'

import * as React from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ToastProps {
  id: string
  title?: string
  description?: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

const ToastContext = React.createContext<{
  toasts: ToastProps[]
  addToast: (toast: Omit<ToastProps, 'id'>) => void
  removeToast: (id: string) => void
}>({
  toasts: [],
  addToast: () => {},
  removeToast: () => {}
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastProps[]>([])

  const addToast = React.useCallback((toast: Omit<ToastProps, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }
    
    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    const duration = toast.duration || 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }, [])

  // Escutar eventos globais de toast
  React.useEffect(() => {
    const handleToastEvent = (event: CustomEvent) => {
      const { type, title, description } = event.detail
      addToast({ type, title, description })
    }

    window.addEventListener('app-toast' as any, handleToastEvent)
    return () => {
      window.removeEventListener('app-toast' as any, handleToastEvent)
    }
  }, [addToast])

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastContainer() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

const toastVariants = {
  success: {
    icon: CheckCircle,
    className: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    iconClassName: 'text-green-600 dark:text-green-400'
  },
  error: {
    icon: AlertCircle,
    className: 'bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800',
    iconClassName: 'text-red-600 dark:text-red-400'
  },
  warning: {
    icon: AlertTriangle,
    className: 'bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800',
    iconClassName: 'text-yellow-600 dark:text-yellow-400'
  },
  info: {
    icon: Info,
    className: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    iconClassName: 'text-blue-600 dark:text-blue-400'
  }
}

function Toast({ 
  title, 
  description, 
  type = 'info', 
  action,
  onClose 
}: ToastProps & { onClose: () => void }) {
  const variant = toastVariants[type]
  const Icon = variant.icon

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border p-4 shadow-lg transition-all',
        'animate-in slide-in-from-right-full fade-in duration-300',
        variant.className
      )}
    >
      <div className="flex gap-3">
        <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', variant.iconClassName)} />
        
        <div className="flex-1 space-y-1">
          {title && (
            <h5 className="font-semibold text-sm">
              {title}
            </h5>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
          {action && (
            <button
              onClick={action.onClick}
              className="text-sm font-medium text-primary hover:underline"
            >
              {action.label}
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          className="flex-shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>
    </div>
  )
}

// Função helper para uso direto
export const toast = {
  success: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', { 
        detail: { type: 'success', title, description } 
      })
      window.dispatchEvent(event)
    }
  },
  error: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', { 
        detail: { type: 'error', title, description } 
      })
      window.dispatchEvent(event)
    }
  },
  warning: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', { 
        detail: { type: 'warning', title, description } 
      })
      window.dispatchEvent(event)
    }
  },
  info: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('toast', { 
        detail: { type: 'info', title, description } 
      })
      window.dispatchEvent(event)
    }
  }
}