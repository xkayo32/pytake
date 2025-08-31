'use client'

import { createContext, useContext, useEffect, ReactNode } from 'react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useSentimentAnalysis } from '@/lib/hooks/useSentimentAnalysis'
import { useIntentClassification } from '@/lib/hooks/useIntentClassification'

interface NotificationContextType {
  // From useNotifications hook
  permission: NotificationPermission
  unreadCount: number
  requestPermission: () => Promise<boolean>
  notifyNewMessage: (senderName: string, message: string, conversationId: string) => void
  notifyAssignment: (conversationId: string, customerName: string) => void
  notifyPriority: (title: string, body: string, conversationId?: string) => void
  notifyLongWait: (conversationId: string, customerName: string, waitTime: string) => void
  notifyConnectionLost: () => void
  
  // AI-powered notifications
  notifyAIAlert: (type: string, message: string, confidence: number, conversationId?: string) => void
  notifySentimentChange: (sentiment: string, score: number, conversationId: string) => void
  notifyIntentDetected: (intent: string, confidence: number, conversationId: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const notifications = useNotifications()

  // AI-enhanced notification functions
  const notifyAIAlert = (type: string, message: string, confidence: number, conversationId?: string) => {
    let title = 'Alerta de IA'
    let requireInteraction = false

    switch (type) {
      case 'negative_sentiment':
        title = 'Cliente Insatisfeito Detectado'
        requireInteraction = confidence > 0.8
        break
      case 'urgent_intent':
        title = 'Intenção Urgente Detectada'
        requireInteraction = confidence > 0.7
        break
      case 'escalation_needed':
        title = 'Escalação Recomendada'
        requireInteraction = true
        break
      case 'high_priority':
        title = 'Prioridade Alta'
        requireInteraction = confidence > 0.9
        break
    }

    notifications.notify({
      type: 'priority_message',
      title,
      body: `${message} (${Math.round(confidence * 100)}% confiança)`,
      tag: `ai-alert-${conversationId || Date.now()}`,
      data: conversationId ? { conversationId, aiType: type, confidence } : undefined,
      requireInteraction
    })
  }

  const notifySentimentChange = (sentiment: string, score: number, conversationId: string) => {
    if (sentiment === 'very_negative' || (sentiment === 'negative' && score < -0.6)) {
      notifyAIAlert(
        'negative_sentiment',
        `Cliente expressa ${sentiment === 'very_negative' ? 'extrema insatisfação' : 'insatisfação'}`,
        Math.abs(score),
        conversationId
      )
    }
  }

  const notifyIntentDetected = (intent: string, confidence: number, conversationId: string) => {
    if (intent === 'urgent' && confidence > 0.7) {
      notifyAIAlert(
        'urgent_intent',
        'Cliente solicita atendimento urgente',
        confidence,
        conversationId
      )
    } else if (intent === 'complaint' && confidence > 0.8) {
      notifyAIAlert(
        'escalation_needed',
        'Cliente expressou reclamação - considere escalação',
        confidence,
        conversationId
      )
    }
  }

  // Monitor AI analysis for automatic notifications (in a real app, this would be connected to WebSocket events)
  useEffect(() => {
    // This is a demo - in a real application, you would connect to WebSocket events
    // or API polling to monitor sentiment changes and intents across all conversations
    
    const demoInterval = setInterval(() => {
      // Simulate AI alerts for demonstration
      if (Math.random() > 0.95) { // 5% chance every 30 seconds
        const scenarios = [
          {
            type: 'negative_sentiment',
            message: 'Cliente João Silva expressa frustração',
            confidence: 0.87,
            conversationId: 'conv-123'
          },
          {
            type: 'urgent_intent',
            message: 'Cliente Maria Santos solicita atendimento urgente',
            confidence: 0.92,
            conversationId: 'conv-456'
          },
          {
            type: 'escalation_needed',
            message: 'Cliente Pedro Costa expressou reclamação séria',
            confidence: 0.95,
            conversationId: 'conv-789'
          }
        ]
        
        const scenario = scenarios[Math.floor(Math.random() * scenarios.length)]
        notifyAIAlert(scenario.type, scenario.message, scenario.confidence, scenario.conversationId)
      }
    }, 30000) // Every 30 seconds

    return () => clearInterval(demoInterval)
  }, [])

  const contextValue: NotificationContextType = {
    ...notifications,
    notifyAIAlert,
    notifySentimentChange,
    notifyIntentDetected
  }

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotificationContext() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotificationContext must be used within a NotificationProvider')
  }
  return context
}

// Hook for AI-powered notifications in components
export function useAINotifications() {
  const { notifyAIAlert, notifySentimentChange, notifyIntentDetected } = useNotificationContext()
  
  return {
    notifyAIAlert,
    notifySentimentChange, 
    notifyIntentDetected,
    
    // Convenience methods
    notifyNegativeSentiment: (conversationId: string, customerName: string, score: number) => {
      notifySentimentChange('negative', score, conversationId)
    },
    
    notifyUrgentIntent: (conversationId: string, customerName: string, confidence: number) => {
      notifyIntentDetected('urgent', confidence, conversationId)
    },
    
    notifyComplaint: (conversationId: string, customerName: string, confidence: number) => {
      notifyIntentDetected('complaint', confidence, conversationId)
    }
  }
}