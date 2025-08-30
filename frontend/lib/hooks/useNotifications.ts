'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/contexts/auth-context'

export type NotificationType = 
  | 'message_received'
  | 'message_assigned' 
  | 'conversation_assigned'
  | 'priority_message'
  | 'long_wait_time'
  | 'connection_lost'

export interface NotificationConfig {
  enabled: boolean
  sound: boolean
  desktop: boolean
  badge: boolean
  vibrate: boolean
  soundFile?: string
  volume: number
  doNotDisturb: {
    enabled: boolean
    startTime: string // "22:00"
    endTime: string   // "08:00"
  }
}

export interface NotificationPayload {
  type: NotificationType
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  requireInteraction?: boolean
  silent?: boolean
}

const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  sound: true,
  desktop: true,
  badge: true,
  vibrate: false,
  volume: 0.7,
  doNotDisturb: {
    enabled: false,
    startTime: "22:00",
    endTime: "08:00"
  }
}

const NOTIFICATION_SOUNDS = {
  message_received: '/sounds/message.mp3',
  message_assigned: '/sounds/assigned.mp3',
  conversation_assigned: '/sounds/assigned.mp3',
  priority_message: '/sounds/priority.mp3',
  long_wait_time: '/sounds/alert.mp3',
  connection_lost: '/sounds/disconnect.mp3'
}

export function useNotifications() {
  const { user } = useAuthContext()
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [config, setConfig] = useState<NotificationConfig>(DEFAULT_CONFIG)
  const [isSupported, setIsSupported] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Check notification support
  useEffect(() => {
    setIsSupported('Notification' in window && 'serviceWorker' in navigator)
    if ('Notification' in window) {
      setPermission(Notification.permission)
    }
  }, [])

  // Load user config from localStorage
  useEffect(() => {
    if (user) {
      const savedConfig = localStorage.getItem(`notification-config-${user.id}`)
      if (savedConfig) {
        try {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) })
        } catch (error) {
          console.error('Error loading notification config:', error)
        }
      }
    }
  }, [user])

  // Save config to localStorage
  const saveConfig = useCallback((newConfig: Partial<NotificationConfig>) => {
    if (!user) return

    const updatedConfig = { ...config, ...newConfig }
    setConfig(updatedConfig)
    localStorage.setItem(`notification-config-${user.id}`, JSON.stringify(updatedConfig))
  }, [user, config])

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false

    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      return result === 'granted'
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return false
    }
  }, [isSupported])

  // Check if notifications are allowed (considering DND)
  const canNotify = useCallback((type: NotificationType): boolean => {
    if (!config.enabled || permission !== 'granted') return false

    // Check Do Not Disturb
    if (config.doNotDisturb.enabled) {
      const now = new Date()
      const currentTime = now.getHours() * 100 + now.getMinutes()
      
      const startTime = parseInt(config.doNotDisturb.startTime.replace(':', ''))
      const endTime = parseInt(config.doNotDisturb.endTime.replace(':', ''))
      
      // Handle overnight DND (22:00 to 08:00)
      if (startTime > endTime) {
        if (currentTime >= startTime || currentTime <= endTime) {
          return false
        }
      } else {
        // Handle same day DND
        if (currentTime >= startTime && currentTime <= endTime) {
          return false
        }
      }
    }

    // Check if page is visible (don't notify if user is actively using the app)
    if (!document.hidden) {
      // Only show desktop notifications for priority messages when page is visible
      return type === 'priority_message' || type === 'long_wait_time'
    }

    return true
  }, [config, permission])

  // Play notification sound
  const playSound = useCallback((type: NotificationType) => {
    if (!config.sound) return

    try {
      const soundFile = config.soundFile || NOTIFICATION_SOUNDS[type]
      if (!soundFile) return

      // Create or reuse audio element
      if (!audioRef.current) {
        audioRef.current = new Audio()
      }
      
      audioRef.current.src = soundFile
      audioRef.current.volume = config.volume
      audioRef.current.play().catch(error => {
        console.error('Error playing notification sound:', error)
      })
    } catch (error) {
      console.error('Error setting up notification sound:', error)
    }
  }, [config.sound, config.soundFile, config.volume])

  // Update badge count
  const updateBadge = useCallback((count: number) => {
    setUnreadCount(count)
    
    if (!config.badge) return

    try {
      // Update document title with count
      const baseTitle = 'PyTake'
      document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle

      // Update favicon badge if supported
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          (navigator as any).setAppBadge(count)
        } else {
          (navigator as any).clearAppBadge()
        }
      }
    } catch (error) {
      console.error('Error updating badge:', error)
    }
  }, [config.badge])

  // Vibrate device (mobile)
  const vibrate = useCallback((pattern: number[] = [200, 100, 200]) => {
    if (!config.vibrate || !navigator.vibrate) return
    
    try {
      navigator.vibrate(pattern)
    } catch (error) {
      console.error('Error triggering vibration:', error)
    }
  }, [config.vibrate])

  // Show desktop notification
  const showNotification = useCallback((payload: NotificationPayload): Notification | null => {
    if (!canNotify(payload.type) || !config.desktop) return null

    try {
      const notification = new Notification(payload.title, {
        body: payload.body,
        icon: payload.icon || '/logo-notification.png',
        badge: payload.badge || '/logo-badge.png',
        tag: payload.tag || `notification-${Date.now()}`,
        data: payload.data,
        requireInteraction: payload.requireInteraction || false,
        silent: payload.silent || false
      })

      // Auto close after 5 seconds unless requireInteraction is true
      if (!payload.requireInteraction) {
        setTimeout(() => {
          notification.close()
        }, 5000)
      }

      // Handle notification click
      notification.onclick = (event) => {
        event.preventDefault()
        window.focus()
        
        // Handle navigation based on notification data
        if (payload.data?.conversationId) {
          window.location.href = `/conversations/${payload.data.conversationId}`
        } else {
          window.location.href = '/conversations'
        }
        
        notification.close()
      }

      return notification
    } catch (error) {
      console.error('Error showing desktop notification:', error)
      return null
    }
  }, [canNotify, config.desktop])

  // Main notification function
  const notify = useCallback((payload: NotificationPayload) => {
    if (!canNotify(payload.type)) return

    // Play sound
    playSound(payload.type)
    
    // Show desktop notification
    showNotification(payload)
    
    // Vibrate (mobile)
    vibrate()
    
    console.log('Notification triggered:', payload.type, payload.title)
  }, [canNotify, playSound, showNotification, vibrate])

  // Convenience methods for common notifications
  const notifyNewMessage = useCallback((senderName: string, message: string, conversationId: string) => {
    notify({
      type: 'message_received',
      title: `Nova mensagem de ${senderName}`,
      body: message.length > 100 ? message.substring(0, 100) + '...' : message,
      tag: `message-${conversationId}`,
      data: { conversationId },
      requireInteraction: false
    })
  }, [notify])

  const notifyAssignment = useCallback((conversationId: string, customerName: string) => {
    notify({
      type: 'conversation_assigned',
      title: 'Nova conversa atribuída',
      body: `Conversa com ${customerName} foi atribuída a você`,
      tag: `assignment-${conversationId}`,
      data: { conversationId },
      requireInteraction: true
    })
  }, [notify])

  const notifyPriority = useCallback((title: string, body: string, conversationId?: string) => {
    notify({
      type: 'priority_message',
      title: title,
      body: body,
      tag: `priority-${conversationId || Date.now()}`,
      data: conversationId ? { conversationId } : undefined,
      requireInteraction: true
    })
  }, [notify])

  const notifyLongWait = useCallback((conversationId: string, customerName: string, waitTime: string) => {
    notify({
      type: 'long_wait_time',
      title: 'Cliente aguardando há muito tempo',
      body: `${customerName} aguarda resposta há ${waitTime}`,
      tag: `wait-${conversationId}`,
      data: { conversationId },
      requireInteraction: true
    })
  }, [notify])

  const notifyConnectionLost = useCallback(() => {
    notify({
      type: 'connection_lost',
      title: 'Conexão perdida',
      body: 'Reconectando ao servidor...',
      tag: 'connection-status',
      requireInteraction: false,
      silent: true
    })
  }, [notify])

  // Clear all notifications
  const clearNotifications = useCallback(() => {
    updateBadge(0)
  }, [updateBadge])

  return {
    // State
    permission,
    config,
    isSupported,
    unreadCount,
    
    // Actions
    requestPermission,
    saveConfig,
    updateBadge,
    clearNotifications,
    
    // Notification methods
    notify,
    notifyNewMessage,
    notifyAssignment,
    notifyPriority,
    notifyLongWait,
    notifyConnectionLost,
    
    // Utilities
    canNotify,
    playSound
  }
}