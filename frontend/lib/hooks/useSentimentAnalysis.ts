'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  SentimentAnalyzer, 
  SentimentResult, 
  SentimentHistory,
  ConversationSentimentSummary 
} from '@/lib/ai/sentiment-analyzer'

interface Message {
  id: string
  content: string
  sender: 'agent' | 'customer'
  timestamp: Date
}

interface UseSentimentAnalysisOptions {
  autoAnalyze?: boolean
  debounceMs?: number
  enableHistory?: boolean
  maxHistorySize?: number
}

export function useSentimentAnalysis(
  messages: Message[] = [],
  options: UseSentimentAnalysisOptions = {}
) {
  const {
    autoAnalyze = true,
    debounceMs = 1000,
    enableHistory = true,
    maxHistorySize = 50
  } = options

  const [currentSentiment, setCurrentSentiment] = useState<SentimentResult | null>(null)
  const [sentimentHistory, setSentimentHistory] = useState<SentimentHistory[]>([])
  const [conversationSummary, setConversationSummary] = useState<ConversationSentimentSummary | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)

  const analyzer = useRef(new SentimentAnalyzer())
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()
  const lastAnalyzedMessageId = useRef<string>()

  // Analyze single message sentiment
  const analyzeMessage = useCallback(async (message: string, context?: SentimentHistory[]): Promise<SentimentResult | null> => {
    if (!message.trim()) return null

    setIsAnalyzing(true)
    setError(null)

    try {
      const result = await analyzer.current.analyzeSentiment(message, context)
      setCurrentSentiment(result)
      return result
    } catch (err: any) {
      setError(err.message)
      console.error('Error analyzing sentiment:', err)
      return null
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  // Analyze conversation sentiment summary
  const analyzeConversation = useCallback(async (): Promise<ConversationSentimentSummary | null> => {
    if (messages.length === 0) return null

    try {
      const summary = await analyzer.current.analyzeConversationSentiment(messages)
      setConversationSummary(summary)
      return summary
    } catch (err: any) {
      setError(err.message)
      console.error('Error analyzing conversation sentiment:', err)
      return null
    }
  }, [messages])

  // Auto-analyze latest customer message
  useEffect(() => {
    if (!autoAnalyze || messages.length === 0) return

    const latestCustomerMessage = [...messages]
      .reverse()
      .find(m => m.sender === 'customer')

    if (!latestCustomerMessage || latestCustomerMessage.id === lastAnalyzedMessageId.current) {
      return
    }

    // Debounce analysis
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }

    debounceTimeoutRef.current = setTimeout(async () => {
      lastAnalyzedMessageId.current = latestCustomerMessage.id
      
      const context = enableHistory ? sentimentHistory.slice(-5) : undefined
      const result = await analyzeMessage(latestCustomerMessage.content, context)
      
      if (result && enableHistory) {
        const newHistoryEntry: SentimentHistory = {
          messageId: latestCustomerMessage.id,
          timestamp: latestCustomerMessage.timestamp,
          sentiment: result,
          message: latestCustomerMessage.content
        }
        
        setSentimentHistory(prev => {
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
  }, [messages, autoAnalyze, debounceMs, enableHistory, maxHistorySize, analyzeMessage, sentimentHistory])

  // Analyze conversation summary when messages change significantly
  useEffect(() => {
    if (messages.length > 0 && messages.length % 5 === 0) {
      analyzeConversation()
    }
  }, [messages.length, analyzeConversation])

  // Load stats on mount
  useEffect(() => {
    const loadStats = async () => {
      try {
        const statsData = await analyzer.current.getSentimentStats()
        setStats(statsData)
      } catch (error) {
        console.error('Error loading sentiment stats:', error)
      }
    }

    loadStats()
  }, [])

  // Clear history when conversation changes (based on first message timestamp)
  useEffect(() => {
    if (messages.length > 0) {
      const firstMessageTime = messages[0].timestamp.getTime()
      const lastHistoryTime = sentimentHistory[0]?.timestamp.getTime()
      
      if (lastHistoryTime && Math.abs(firstMessageTime - lastHistoryTime) > 24 * 60 * 60 * 1000) {
        // Clear history if more than 24 hours difference (new conversation)
        setSentimentHistory([])
        setConversationSummary(null)
      }
    }
  }, [messages, sentimentHistory])

  // Get sentiment trend
  const getSentimentTrend = useCallback(() => {
    if (sentimentHistory.length < 2) return 'stable' as const

    const recentScores = sentimentHistory.slice(-3).map(h => h.sentiment.score)
    const trend = recentScores[recentScores.length - 1] - recentScores[0]

    if (trend > 0.3) return 'improving' as const
    if (trend < -0.3) return 'declining' as const
    return 'stable' as const
  }, [sentimentHistory])

  // Get average sentiment score
  const getAverageSentiment = useCallback(() => {
    if (sentimentHistory.length === 0) return 0
    return sentimentHistory.reduce((sum, h) => sum + h.sentiment.score, 0) / sentimentHistory.length
  }, [sentimentHistory])

  // Check if immediate attention is needed
  const needsImmediateAttention = useCallback(() => {
    if (!currentSentiment) return false
    
    return (
      currentSentiment.sentiment === 'very_negative' && 
      currentSentiment.urgency === 'critical'
    ) || (
      sentimentHistory.slice(-2).every(h => h.sentiment.sentiment === 'very_negative')
    )
  }, [currentSentiment, sentimentHistory])

  // Get escalation recommendations
  const getEscalationRecommendations = useCallback(() => {
    const recommendations: string[] = []

    if (needsImmediateAttention()) {
      recommendations.push('Cliente extremamente insatisfeito - considere escalonamento imediato')
    }

    if (getSentimentTrend() === 'declining' && currentSentiment?.sentiment === 'negative') {
      recommendations.push('Sentimento deteriorando - intervenção necessária')
    }

    if (currentSentiment?.emotions.anger && currentSentiment.emotions.anger > 0.7) {
      recommendations.push('Alto nível de raiva detectado - use linguagem calmante')
    }

    if (currentSentiment?.emotions.confusion && currentSentiment.emotions.confusion > 0.6) {
      recommendations.push('Cliente confuso - use explicações mais simples')
    }

    return recommendations
  }, [needsImmediateAttention, getSentimentTrend, currentSentiment])

  // Manual refresh
  const refresh = useCallback(async () => {
    if (messages.length === 0) return

    const latestCustomerMessage = [...messages]
      .reverse()
      .find(m => m.sender === 'customer')

    if (latestCustomerMessage) {
      await analyzeMessage(latestCustomerMessage.content, sentimentHistory.slice(-5))
    }

    await analyzeConversation()
  }, [messages, analyzeMessage, analyzeConversation, sentimentHistory])

  // Clear analysis
  const clear = useCallback(() => {
    setCurrentSentiment(null)
    setSentimentHistory([])
    setConversationSummary(null)
    setError(null)
    lastAnalyzedMessageId.current = undefined
  }, [])

  return {
    // Current state
    currentSentiment,
    sentimentHistory,
    conversationSummary,
    isAnalyzing,
    error,
    stats,

    // Analysis functions
    analyzeMessage,
    analyzeConversation,
    refresh,
    clear,

    // Computed values
    sentimentTrend: getSentimentTrend(),
    averageSentiment: getAverageSentiment(),
    needsImmediateAttention: needsImmediateAttention(),
    escalationRecommendations: getEscalationRecommendations(),

    // Helper functions
    hasHistory: sentimentHistory.length > 0,
    hasCurrentAnalysis: currentSentiment !== null,
    totalAnalyses: sentimentHistory.length,
    
    // Most recent emotions (for quick access)
    recentEmotions: currentSentiment?.emotions || null,
    recentUrgency: currentSentiment?.urgency || 'low',
    recentConfidence: currentSentiment?.confidence || 0,

    // Historical insights
    mostFrequentSentiment: sentimentHistory.length > 0 
      ? sentimentHistory
          .reduce((acc, h) => {
            acc[h.sentiment.sentiment] = (acc[h.sentiment.sentiment] || 0) + 1
            return acc
          }, {} as Record<string, number>)
      : {},

    // Conversation insights
    conversationDuration: sentimentHistory.length > 1
      ? sentimentHistory[sentimentHistory.length - 1].timestamp.getTime() - sentimentHistory[0].timestamp.getTime()
      : 0,

    // Configuration
    isAutoAnalyzing: autoAnalyze,
    maxHistorySize,
    enableHistory
  }
}