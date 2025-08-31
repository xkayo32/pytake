import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
  duration?: number
}

let toastCounter = 0

// Global toast store
let toasts: Toast[] = []
let listeners: ((toasts: Toast[]) => void)[] = []

const addToast = (toast: Omit<Toast, 'id'>) => {
  const id = (++toastCounter).toString()
  const newToast: Toast = {
    id,
    duration: 5000,
    ...toast,
  }
  
  toasts = [...toasts, newToast]
  listeners.forEach(listener => listener(toasts))
  
  // Auto remove after duration
  if (newToast.duration && newToast.duration > 0) {
    setTimeout(() => {
      removeToast(id)
    }, newToast.duration)
  }
  
  return id
}

const removeToast = (id: string) => {
  toasts = toasts.filter(toast => toast.id !== id)
  listeners.forEach(listener => listener(toasts))
}

export function useToast() {
  const [state, setState] = useState<Toast[]>(toasts)
  
  const subscribe = useCallback((listener: (toasts: Toast[]) => void) => {
    listeners.push(listener)
    return () => {
      listeners = listeners.filter(l => l !== listener)
    }
  }, [])
  
  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    return addToast(props)
  }, [])
  
  const dismiss = useCallback((id?: string) => {
    if (id) {
      removeToast(id)
    } else {
      // Remove all toasts
      toasts = []
      listeners.forEach(listener => listener(toasts))
    }
  }, [])
  
  // Subscribe to changes
  useState(() => {
    const unsubscribe = subscribe(setState)
    return unsubscribe
  })
  
  return {
    toasts: state,
    toast,
    dismiss,
  }
}