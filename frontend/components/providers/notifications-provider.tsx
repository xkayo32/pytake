'use client'

import { useEffect } from 'react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { NotificationProvider } from '@/contexts/notification-context'
import { soundGenerator } from '@/lib/utils/soundGenerator'

interface NotificationsProviderProps {
  children: React.ReactNode
}

export function NotificationsProvider({ children }: NotificationsProviderProps) {
  const { isSupported, requestPermission } = useNotifications()

  useEffect(() => {
    // Initialize notifications system
    const initializeNotifications = async () => {
      if (!isSupported) {
        console.log('Notifications not supported in this browser')
        return
      }

      try {
        // Register service worker
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.register('/sw.js', {
            scope: '/'
          })
          
          console.log('Service Worker registered:', registration.scope)

          // Handle service worker updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('New service worker available')
                  // Could show update notification here
                }
              })
            }
          })

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            console.log('Message from service worker:', event.data)
            
            const { type, payload } = event.data
            
            switch (type) {
              case 'NAVIGATE':
                // Handle navigation requests from service worker
                window.location.href = payload.url
                break
                
              case 'SYNC_COMPLETE':
                // Handle sync completion
                console.log('Background sync completed')
                break
                
              default:
                console.log('Unknown service worker message:', type)
            }
          })
        }

        // Generate notification sounds
        await soundGenerator.generateSounds()
        console.log('Notification sounds generated')

        // Auto-request permission after user interaction (optional)
        // This is commented out to avoid annoying users immediately
        // setTimeout(() => {
        //   if (Notification.permission === 'default') {
        //     requestPermission()
        //   }
        // }, 5000)

      } catch (error) {
        console.error('Error initializing notifications:', error)
      }
    }

    initializeNotifications()
  }, [isSupported, requestPermission])

  // Handle page visibility changes to manage badge updates
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        console.log('Page hidden - notifications may show')
      } else {
        console.log('Page visible - reducing notification frequency')
        
        // Clear some notifications when user returns to app
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'CLEAR_NOTIFICATIONS',
            payload: { tag: 'message' } // Clear message notifications but keep priority ones
          })
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Handle beforeunload to persist notification state
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Save any necessary state before page unload
      sessionStorage.setItem('app-last-closed', new Date().toISOString())
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  )
}

// Hook to send messages to service worker
export function useServiceWorkerMessaging() {
  const sendToServiceWorker = (type: string, payload?: any) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type,
        payload
      })
    }
  }

  return { sendToServiceWorker }
}