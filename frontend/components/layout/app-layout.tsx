'use client'

import { useState, useEffect } from 'react'
import { AppSidebar } from './app-sidebar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { getApiUrl, getAuthHeaders } from '@/lib/api-client'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    // Carregar contagem de mensagens não lidas
    const loadUnreadCount = async () => {
      try {
        const apiUrl = getApiUrl()
        const headers = getAuthHeaders()
        const response = await fetch(`${apiUrl}/api/v1/contacts/`, { headers })
        
        if (response.ok) {
          const contacts = await response.json()
          const total = Array.isArray(contacts) 
            ? contacts.reduce((sum, contact) => sum + (contact.unread_count || 0), 0)
            : 0
          setUnreadCount(total)
        }
      } catch (error) {
        console.error('Error loading unread count:', error)
      }
    }

    loadUnreadCount()
    
    // Recarregar a cada 10 segundos
    const interval = setInterval(loadUnreadCount, 10000)
    
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex h-screen bg-background">
      <AppSidebar unreadCount={unreadCount} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-end px-6">
          <ThemeToggle />
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}