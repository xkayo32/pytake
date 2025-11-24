'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AppSidebar } from './app-sidebar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { getApiUrl, getAuthHeaders } from '@/lib/api-client'
import { handleAuthError } from '@/lib/auth-interceptor'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoadingContacts, setIsLoadingContacts] = useState(false)

  useEffect(() => {
    // Carregar contagem de mensagens não lidas
    const loadUnreadCount = async () => {
      if (isLoadingContacts) return // Prevenir requisições simultâneas
      
      setIsLoadingContacts(true)
      try {
        const apiUrl = getApiUrl()
        const headers = getAuthHeaders()
        const response = await fetch(`${apiUrl}/contacts/`, { headers })
        
        // Interceptar erros de autenticação
        if (response.status === 401 || response.status === 403) {
          await handleAuthError(response, router)
          setIsLoadingContacts(false)
          return
        }
        
        if (response.ok) {
          const contacts = await response.json()
          const total = Array.isArray(contacts) 
            ? contacts.reduce((sum, contact) => sum + (contact.unread_count || 0), 0)
            : 0
          setUnreadCount(total)
        } else {
          console.warn(`Failed to load contacts: ${response.status}`)
        }
      } catch (error) {
        console.error('Error loading unread count:', error)
      } finally {
        setIsLoadingContacts(false)
      }
    }

    loadUnreadCount()
    
    // Recarregar a cada 10 segundos
    const interval = setInterval(loadUnreadCount, 10000)
    
    return () => clearInterval(interval)
  }, [router, isLoadingContacts])

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