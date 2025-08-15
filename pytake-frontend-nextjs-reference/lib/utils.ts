import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Sistema de notificações global
export const notify = {
  success: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('app-toast', { 
        detail: { type: 'success', title, description } 
      })
      window.dispatchEvent(event)
    }
  },
  error: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('app-toast', { 
        detail: { type: 'error', title, description } 
      })
      window.dispatchEvent(event)
    }
  },
  warning: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('app-toast', { 
        detail: { type: 'warning', title, description } 
      })
      window.dispatchEvent(event)
    }
  },
  info: (title: string, description?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('app-toast', { 
        detail: { type: 'info', title, description } 
      })
      window.dispatchEvent(event)
    }
  }
}