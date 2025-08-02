import { useState, useCallback } from 'react'

export interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

interface ToastState {
  toasts: Toast[]
}

let toastId = 0

export function useToast() {
  const [state, setState] = useState<ToastState>({ toasts: [] })

  const toast = useCallback((props: Omit<Toast, 'id'>) => {
    const id = (++toastId).toString()
    const newToast: Toast = {
      ...props,
      id,
      duration: props.duration ?? 5000,
    }

    setState(prev => ({
      toasts: [...prev.toasts, newToast]
    }))

    // Auto remove toast after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        setState(prev => ({
          toasts: prev.toasts.filter(t => t.id !== id)
        }))
      }, newToast.duration)
    }

    return id
  }, [])

  const dismiss = useCallback((toastId: string) => {
    setState(prev => ({
      toasts: prev.toasts.filter(t => t.id !== toastId)
    }))
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss,
  }
}