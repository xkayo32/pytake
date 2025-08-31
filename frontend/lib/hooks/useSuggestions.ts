'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { 
  AISuggestionEngine, 
  SuggestionResponse, 
  SuggestionContext,
  Conversation,
  AgentProfile
} from '@/lib/ai/suggestion-engine'
import { useAuthContext } from '@/contexts/auth-context'

interface UseSuggestionsOptions {
  autoRefresh?: boolean
  refreshDelay?: number
  maxSuggestions?: number
  enableFeedback?: boolean
}

interface SuggestionFeedback {
  used: boolean
  edited: boolean
  finalText?: string
  customerSatisfaction?: number
  resolved: boolean
}

export function useSuggestions(
  conversation: Conversation | null,
  options: UseSuggestionsOptions = {}
) {
  const { user } = useAuthContext()
  const {
    autoRefresh = true,
    refreshDelay = 500,
    maxSuggestions = 5,
    enableFeedback = true
  } = options

  const [suggestions, setSuggestions] = useState<SuggestionResponse[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [usageStats, setUsageStats] = useState<any>(null)

  const suggestionEngine = useRef(new AISuggestionEngine())
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()
  const lastMessageIdRef = useRef<string>()
  const feedbackQueue = useRef<{ suggestion: SuggestionResponse; context: SuggestionContext; feedback: SuggestionFeedback }[]>([])

  // Mock agent profile from user data
  const agentProfile: AgentProfile | undefined = user ? {
    id: user.id,
    name: user.name || 'Agente',
    expertise: ['atendimento', 'suporte'],
    averageResponseTime: 60,
    satisfactionRating: 4.5,
    preferredResponseStyle: 'empathetic',
    languagePreferences: {
      formality: 'mixed',
      tone: 'friendly',
      length: 'medium'
    }
  } : undefined

  // Mock context data
  const getMockContext = useCallback((): Omit<SuggestionContext, 'conversation' | 'agentProfile'> => ({
    availableTemplates: [
      {
        id: 'greeting-standard',
        title: 'Cumprimento Padrão',
        content: 'Olá {customerName}! Sou {agentName} e estou aqui para ajudar. Como posso auxiliar você hoje?',
        category: 'greeting',
        tags: ['cumprimento', 'inicial', 'atendimento'],
        usageCount: 245,
        successRate: 0.92,
        variables: { customerName: 'Cliente', agentName: 'Atendente' }
      },
      {
        id: 'problem-empathy',
        title: 'Empatia para Problemas',
        content: 'Entendo completamente sua situação e sei como isso pode ser frustrante. Vou fazer o possível para resolver rapidamente. Pode me dar mais detalhes?',
        category: 'support',
        tags: ['problema', 'empatia', 'suporte'],
        usageCount: 189,
        successRate: 0.87,
        variables: {}
      },
      {
        id: 'solution-technical',
        title: 'Solução Técnica',
        content: 'Para resolver este problema técnico, vamos seguir alguns passos: 1) Verificar configurações, 2) Testar conexão, 3) Validar resultado.',
        category: 'solution',
        tags: ['técnico', 'passo-a-passo', 'solução'],
        usageCount: 156,
        successRate: 0.89,
        variables: {}
      },
      {
        id: 'escalation-manager',
        title: 'Escalação para Gerente',
        content: 'Esta situação requer atenção especializada. Vou conectar você com meu supervisor que tem mais autoridade para resolver isso.',
        category: 'escalation',
        tags: ['escalação', 'gerente', 'supervisor'],
        usageCount: 67,
        successRate: 0.94,
        variables: {}
      },
      {
        id: 'closing-satisfaction',
        title: 'Fechamento com Satisfação',
        content: 'Conseguimos resolver seu problema? Há mais alguma coisa em que posso ajudar hoje?',
        category: 'closing',
        tags: ['fechamento', 'satisfação', 'follow-up'],
        usageCount: 312,
        successRate: 0.85,
        variables: {}
      }
    ],
    knowledgeBase: [
      {
        id: 'kb-password-reset',
        question: 'Como resetar a senha do sistema?',
        answer: 'Para resetar sua senha: 1) Acesse a tela de login, 2) Clique em "Esqueci minha senha", 3) Digite seu email, 4) Verifique sua caixa de entrada e spam, 5) Clique no link recebido e crie uma nova senha.',
        keywords: ['senha', 'reset', 'esqueci', 'login', 'resetar', 'redefinir'],
        category: 'account',
        confidence: 0.95,
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'kb-billing-cancel',
        question: 'Como cancelar minha assinatura?',
        answer: 'Para cancelar sua assinatura: 1) Faça login na sua conta, 2) Vá para "Configurações" > "Assinatura", 3) Clique em "Cancelar Assinatura", 4) Confirme o cancelamento. Você continuará tendo acesso até o final do período pago.',
        keywords: ['cancelar', 'assinatura', 'conta', 'billing', 'cobrança', 'plano'],
        category: 'billing',
        confidence: 0.90,
        lastUpdated: new Date('2024-01-10')
      },
      {
        id: 'kb-technical-support',
        question: 'Problemas técnicos comuns e soluções',
        answer: 'Para problemas técnicos gerais: 1) Limpe o cache do navegador, 2) Desative extensões, 3) Tente outro navegador, 4) Verifique sua conexão de internet, 5) Reinicie o dispositivo.',
        keywords: ['problema', 'técnico', 'bug', 'erro', 'não funciona', 'travado'],
        category: 'technical',
        confidence: 0.85,
        lastUpdated: new Date('2024-01-12')
      },
      {
        id: 'kb-contact-info',
        question: 'Informações de contato e horários',
        answer: 'Nosso atendimento funciona de segunda a sexta, das 8h às 18h. Para urgências, use o WhatsApp: (11) 9999-9999. Email: suporte@empresa.com',
        keywords: ['contato', 'telefone', 'email', 'horário', 'atendimento', 'whatsapp'],
        category: 'contact',
        confidence: 0.88,
        lastUpdated: new Date('2024-01-08')
      }
    ],
    recentSuccessfulResponses: [
      {
        originalMessage: 'Não consigo fazer login no sistema',
        response: 'Vou ajudar você com o login! Primeiro, vamos verificar se o email está digitado corretamente. Pode me confirmar qual email você está usando?',
        context: 'login authentication issue',
        customerSatisfaction: 4.8,
        responseTime: 35,
        resolved: true
      },
      {
        originalMessage: 'O sistema está muito lento hoje',
        response: 'Entendo sua frustração com a lentidão. Estamos enfrentando um pico de usuários, mas já estamos trabalhando na solução. Posso te ajudar a otimizar sua experiência enquanto isso?',
        context: 'performance complaint',
        customerSatisfaction: 4.2,
        responseTime: 28,
        resolved: true
      },
      {
        originalMessage: 'Quero cancelar minha conta',
        response: 'Posso entender que às vezes precisamos fazer mudanças. Antes de prosseguir com o cancelamento, posso saber se há algo específico que podemos melhorar para você?',
        context: 'cancellation request',
        customerSatisfaction: 4.6,
        responseTime: 42,
        resolved: false
      }
    ]
  }), [])

  // Generate suggestions
  const generateSuggestions = useCallback(async (currentMessage?: string) => {
    if (!conversation || conversation.messages.length === 0) {
      setSuggestions([])
      return
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1]
    
    // Skip if it's the same message and no current message provided
    if (!currentMessage && lastMessageIdRef.current === lastMessage.id) return
    lastMessageIdRef.current = lastMessage.id

    setIsLoading(true)
    setError(null)

    try {
      const context: SuggestionContext = {
        conversation,
        agentProfile,
        currentMessage,
        ...getMockContext()
      }

      const newSuggestions = await suggestionEngine.current.generateSuggestions(context)
      setSuggestions(newSuggestions.slice(0, maxSuggestions))
    } catch (err: any) {
      setError(err.message)
      console.error('Error generating suggestions:', err)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [conversation, agentProfile, maxSuggestions, getMockContext])

  // Auto-refresh suggestions when conversation changes
  useEffect(() => {
    if (!autoRefresh || !conversation) return

    if (refreshTimeoutRef.current) {
      clearTimeout(refreshTimeoutRef.current)
    }

    refreshTimeoutRef.current = setTimeout(() => {
      generateSuggestions()
    }, refreshDelay)

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [conversation, autoRefresh, refreshDelay, generateSuggestions])

  // Load usage statistics
  const loadUsageStats = useCallback(async () => {
    try {
      const stats = await suggestionEngine.current.getUsageStats()
      setUsageStats(stats)
    } catch (error) {
      console.error('Error loading usage stats:', error)
    }
  }, [])

  // Load stats on mount
  useEffect(() => {
    loadUsageStats()
  }, [loadUsageStats])

  // Process feedback queue
  useEffect(() => {
    if (!enableFeedback || feedbackQueue.current.length === 0) return

    const processQueue = async () => {
      const queue = [...feedbackQueue.current]
      feedbackQueue.current = []

      for (const item of queue) {
        try {
          await suggestionEngine.current.trainWithFeedback(
            item.suggestion,
            item.context,
            item.feedback
          )
        } catch (error) {
          console.error('Error submitting feedback:', error)
        }
      }
    }

    const timeoutId = setTimeout(processQueue, 1000) // Batch feedback after 1 second
    return () => clearTimeout(timeoutId)
  }, [enableFeedback, feedbackQueue.current.length])

  // Submit feedback for suggestion usage
  const submitFeedback = useCallback(async (
    suggestion: SuggestionResponse,
    feedback: SuggestionFeedback
  ) => {
    if (!enableFeedback || !conversation) return

    const context: SuggestionContext = {
      conversation,
      agentProfile,
      ...getMockContext()
    }

    // Add to feedback queue for batching
    feedbackQueue.current.push({ suggestion, context, feedback })
  }, [enableFeedback, conversation, agentProfile, getMockContext])

  // Use suggestion (mark as used)
  const useSuggestion = useCallback(async (
    suggestion: SuggestionResponse,
    edited = false,
    finalText?: string
  ) => {
    await submitFeedback(suggestion, {
      used: true,
      edited,
      finalText,
      resolved: false // Will be updated later when conversation resolves
    })
  }, [submitFeedback])

  // Copy suggestion to clipboard
  const copySuggestion = useCallback(async (suggestion: SuggestionResponse) => {
    try {
      await navigator.clipboard.writeText(suggestion.text)
      await submitFeedback(suggestion, {
        used: true,
        edited: false,
        resolved: false
      })
      return true
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      return false
    }
  }, [submitFeedback])

  // Mark suggestion as ignored
  const ignoreSuggestion = useCallback(async (suggestion: SuggestionResponse) => {
    await submitFeedback(suggestion, {
      used: false,
      edited: false,
      resolved: false
    })
  }, [submitFeedback])

  // Refresh suggestions manually
  const refreshSuggestions = useCallback(async (currentMessage?: string) => {
    await generateSuggestions(currentMessage)
  }, [generateSuggestions])

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions([])
    setError(null)
  }, [])

  // Get suggestions for specific message
  const getSuggestionsForMessage = useCallback(async (message: string) => {
    if (!conversation) return []

    const context: SuggestionContext = {
      conversation,
      agentProfile,
      currentMessage: message,
      ...getMockContext()
    }

    try {
      return await suggestionEngine.current.generateSuggestions(context)
    } catch (error) {
      console.error('Error getting suggestions for message:', error)
      return []
    }
  }, [conversation, agentProfile, getMockContext])

  return {
    // Data
    suggestions,
    usageStats,
    
    // State
    isLoading,
    error,
    
    // Actions
    refreshSuggestions,
    clearSuggestions,
    useSuggestion,
    copySuggestion,
    ignoreSuggestion,
    getSuggestionsForMessage,
    submitFeedback,
    loadUsageStats,
    
    // Computed values
    hasSuggestions: suggestions.length > 0,
    topSuggestion: suggestions[0] || null,
    suggestionCategories: [...new Set(suggestions.map(s => s.category))],
    averageConfidence: suggestions.length > 0 
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length 
      : 0,
    
    // Configuration
    maxSuggestions,
    autoRefresh,
    enableFeedback
  }
}