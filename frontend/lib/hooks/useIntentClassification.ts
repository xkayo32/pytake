'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  IntentClassifier, 
  IntentResult, 
  IntentContext, 
  IntentStats 
} from '@/lib/ai/intent-classifier'

interface Message {
  id: string
  content: string
  sender: 'agent' | 'customer'
  timestamp: Date
}

interface IntentHistory {
  messageId: string
  timestamp: Date
  intent: IntentResult
  message: string
}

interface UseIntentClassificationOptions {
  autoClassify?: boolean
  debounceMs?: number
  enableHistory?: boolean
  maxHistorySize?: number
  context?: Partial<IntentContext>
}

export function useIntentClassification(
  messages: Message[] = [],
  options: UseIntentClassificationOptions = {}
) {
  const {
    autoClassify = true,
    debounceMs = 800,
    enableHistory = true,
    maxHistorySize = 100,
    context = {}
  } = options

  const [currentIntent, setCurrentIntent] = useState<IntentResult | null>(null)
  const [intentHistory, setIntentHistory] = useState<IntentHistory[]>([])
  const [isClassifying, setIsClassifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<IntentStats | null>(null)

  const classifier = useRef(new IntentClassifier())
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  const lastClassifiedMessageId = useRef<string>()

  // Classify single message
  const classifyMessage = useCallback(async (
    message: string, 
    messageContext?: Partial<IntentContext>
  ): Promise<IntentResult | null> => {
    if (!message.trim()) return null

    setIsClassifying(true)
    setError(null)

    try {
      const fullContext = { ...context, ...messageContext }
      const result = await classifier.current.classifyIntent(message, fullContext)
      setCurrentIntent(result)
      return result
    } catch (err: any) {
      setError(err.message)
      console.error('Error classifying intent:', err)
      return null
    } finally {
      setIsClassifying(false)
    }
  }, [context])

  // Build context from conversation
  const buildContextFromConversation = useCallback((messages: Message[]): Partial<IntentContext> => {
    if (messages.length === 0) return {}

    const customerMessages = messages.filter(m => m.sender === 'customer')
    const previousIntents = intentHistory
      .filter(h => customerMessages.some(m => m.id === h.messageId))
      .map(h => h.intent.primary.name)
      .slice(-5)

    // Determine conversation stage
    let conversationStage: IntentContext['conversationStage'] = 'middle'
    if (messages.length <= 3) conversationStage = 'opening'
    else if (previousIntents.includes('goodbye') || 
             previousIntents.includes('escalation_request')) {
      conversationStage = 'closing'
    }
    else if (previousIntents.includes('escalation')) {
      conversationStage = 'escalated'
    }

    // Check if this is a follow-up
    const isFollowUp = previousIntents.length > 0 && 
                      messages.length > 1 &&
                      Date.now() - messages[messages.length - 2].timestamp.getTime() < 5 * 60 * 1000 // 5 minutes

    return {
      conversationStage,
      previousIntents,
      isFollowUp,
      ...context
    }
  }, [intentHistory, context])

  // Auto-classify latest customer message
  useEffect(() => {
    if (!autoClassify || messages.length === 0) return

    const latestCustomerMessage = [...messages]
      .reverse()
      .find(m => m.sender === 'customer')

    if (!latestCustomerMessage || latestCustomerMessage.id === lastClassifiedMessageId.current) {
      return
    }

    // Debounce classification
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      lastClassifiedMessageId.current = latestCustomerMessage.id
      
      const messageContext = buildContextFromConversation(messages)
      const result = await classifyMessage(latestCustomerMessage.content, messageContext)
      
      if (result && enableHistory) {
        const newHistoryEntry: IntentHistory = {
          messageId: latestCustomerMessage.id,
          timestamp: latestCustomerMessage.timestamp,
          intent: result,
          message: latestCustomerMessage.content
        }
        
        setIntentHistory(prev => {
          const updated = [...prev, newHistoryEntry]
          return updated.slice(-maxHistorySize) // Keep only recent history
        })
      }
    }, debounceMs)

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [messages, autoClassify, debounceMs, enableHistory, maxHistorySize, classifyMessage, buildContextFromConversation])

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await classifier.current.getIntentStats()
        setStats(statsData)
      } catch (error) {
        console.error('Error loading intent stats:', error)
      }
    }

    loadStats()
  }, [])

  // Submit feedback for training
  const submitFeedback = useCallback(async (
    messageId: string, 
    correctIntent: string,
    isCorrect: boolean = false
  ) => {
    const historyEntry = intentHistory.find(h => h.messageId === messageId)
    if (!historyEntry) return

    try {
      if (!isCorrect) {
        await classifier.current.trainWithFeedback(
          historyEntry.message,
          correctIntent,
          historyEntry.intent.entities
        )
      }
      
      // Could update local state to reflect feedback
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }, [intentHistory])

  // Get intent distribution for current conversation
  const getIntentDistribution = useCallback(() => {
    if (intentHistory.length === 0) return {}

    const distribution: { [intent: string]: number } = {}
    intentHistory.forEach(entry => {
      const intentName = entry.intent.primary.name
      distribution[intentName] = (distribution[intentName] || 0) + 1
    })

    // Convert to percentages
    Object.keys(distribution).forEach(intent => {
      distribution[intent] = distribution[intent] / intentHistory.length
    })

    return distribution
  }, [intentHistory])

  // Get urgency trend
  const getUrgencyTrend = useCallback(() => {
    if (intentHistory.length < 2) return 'stable' as const

    const recentUrgencies = intentHistory.slice(-3).map(h => {
      const urgencyScores = { low: 1, medium: 2, high: 3, critical: 4 }
      return urgencyScores[h.intent.urgency]
    })

    const trend = recentUrgencies[recentUrgencies.length - 1] - recentUrgencies[0]
    if (trend > 1) return 'escalating' as const
    if (trend < -1) return 'de-escalating' as const
    return 'stable' as const
  }, [intentHistory])

  // Check if escalation is recommended
  const shouldEscalate = useCallback(() => {
    if (!currentIntent) return false

    // Critical urgency
    if (currentIntent.urgency === 'critical') return true

    // Multiple high urgency in sequence
    const recentHighUrgency = intentHistory
      .slice(-3)
      .filter(h => ['high', 'critical'].includes(h.intent.urgency))
    if (recentHighUrgency.length >= 2) return true

    // Escalation intent
    if (currentIntent.primary.type === 'escalation') return true

    // Complaint with high urgency
    if (currentIntent.primary.type === 'complaint' && currentIntent.urgency === 'high') {
      return true
    }

    return false
  }, [currentIntent, intentHistory])

  // Get conversation insights
  const getConversationInsights = useCallback(() => {
    const insights: string[] = []

    if (intentHistory.length === 0) return insights

    // Analyze intent patterns
    const intentTypes = intentHistory.map(h => h.intent.primary.type)
    const uniqueIntents = [...new Set(intentTypes)]

    if (uniqueIntents.includes('complaint') && uniqueIntents.includes('problem_report')) {
      insights.push('Cliente relatou problemas e fez reclamações - atenção especial necessária')
    }

    if (intentTypes.includes('escalation')) {
      insights.push('Cliente solicitou escalação - supervisão pode ser necessária')
    }

    // Check for intent progression
    const lastThreeIntents = intentTypes.slice(-3)
    if (lastThreeIntents.includes('greeting') && lastThreeIntents.includes('goodbye')) {
      insights.push('Conversa completa detectada - cliente chegou ao final do atendimento')
    }

    // Urgency patterns
    const urgencyTrend = getUrgencyTrend()
    if (urgencyTrend === 'escalating') {
      insights.push('Urgência crescente detectada - intervenção proativa recomendada')
    }

    // Entity patterns
    const allEntities = intentHistory.flatMap(h => h.intent.entities)
    const entityTypes = [...new Set(allEntities.map(e => e.entity))]
    
    if (entityTypes.includes('order_id') && intentTypes.includes('problem_report')) {
      insights.push('Problema relacionado a pedido específico - verificar histórico do pedido')
    }

    if (entityTypes.includes('money') && intentTypes.includes('billing')) {
      insights.push('Questão financeira específica - verificar valores mencionados')
    }

    return insights
  }, [intentHistory, getUrgencyTrend])

  // Clear classification data
  const clear = useCallback(() => {
    setCurrentIntent(null)
    setIntentHistory([])
    setError(null)
    lastClassifiedMessageId.current = undefined
  }, [])

  // Manual refresh
  const refresh = useCallback(async () => {
    if (messages.length === 0) return

    const latestCustomerMessage = [...messages]
      .reverse()
      .find(m => m.sender === 'customer')

    if (latestCustomerMessage) {
      const messageContext = buildContextFromConversation(messages)
      await classifyMessage(latestCustomerMessage.content, messageContext)
    }
  }, [messages, classifyMessage, buildContextFromConversation])

  return {
    // Current state
    currentIntent,
    intentHistory,
    isClassifying,
    error,
    stats,

    // Functions
    classifyMessage,
    submitFeedback,
    clear,
    refresh,

    // Computed insights
    intentDistribution: getIntentDistribution(),
    urgencyTrend: getUrgencyTrend(),
    shouldEscalate: shouldEscalate(),
    conversationInsights: getConversationInsights(),

    // Helper values
    hasCurrentIntent: currentIntent !== null,
    hasHistory: intentHistory.length > 0,
    totalClassifications: intentHistory.length,
    
    // Most recent values (for quick access)
    recentIntent: currentIntent?.primary.type || null,
    recentUrgency: currentIntent?.urgency || 'low',
    recentConfidence: currentIntent?.confidence || 0,
    requiresAction: currentIntent?.actionRequired || false,

    // Historical analysis
    mostFrequentIntent: intentHistory.length > 0
      ? intentHistory
          .reduce((acc, h) => {
            const intent = h.intent.primary.name
            acc[intent] = (acc[intent] || 0) + 1
            return acc
          }, {} as Record<string, number>)
      : {},

    averageConfidence: intentHistory.length > 0
      ? intentHistory.reduce((sum, h) => sum + h.intent.confidence, 0) / intentHistory.length
      : 0,

    // Entity insights
    commonEntities: intentHistory
      .flatMap(h => h.intent.entities)
      .reduce((acc, entity) => {
        acc[entity.entity] = (acc[entity.entity] || 0) + 1
        return acc
      }, {} as Record<string, number>),

    // Configuration
    isAutoClassifying: autoClassify,
    maxHistorySize,
    enableHistory
  }
}