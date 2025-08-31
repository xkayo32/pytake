/**
 * API Client para Serviços de IA
 * 
 * Client TypeScript para integração com as APIs backend dos serviços de IA
 */

import { 
  SuggestionResponse, 
  SuggestionContext 
} from '@/lib/ai/suggestion-engine'
import { 
  SentimentResult, 
  SentimentHistory 
} from '@/lib/ai/sentiment-analyzer'
import { 
  IntentResult, 
  IntentContext,
  IntentTrainingData 
} from '@/lib/ai/intent-classifier'
import { 
  ChatbotResponse,
  ConversationContext 
} from '@/lib/ai/intelligent-chatbot'

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasNext: boolean
  hasPrev: boolean
}

export class AIServicesAPI {
  private baseUrl: string
  private authToken: string | null = null

  constructor(baseUrl: string = '/api/v1/ai') {
    this.baseUrl = baseUrl
    this.authToken = localStorage.getItem('token')
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers
    }

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`)
      }

      return {
        success: true,
        data: data.data || data,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }

  // ========================================
  // SUGGESTION ENGINE APIS
  // ========================================

  /**
   * Gera sugestões de resposta baseadas no contexto
   */
  async generateSuggestions(context: SuggestionContext): Promise<SuggestionResponse[]> {
    const response = await this.request<{ suggestions: SuggestionResponse[] }>('/suggestions', {
      method: 'POST',
      body: JSON.stringify({
        conversation: context.conversation,
        agentProfile: context.agentProfile,
        currentMessage: context.currentMessage,
        templates: context.availableTemplates?.slice(0, 10),
        knowledgeItems: context.knowledgeBase?.slice(0, 5),
        recentSuccesses: context.recentSuccessfulResponses?.slice(0, 3)
      })
    })

    return response.data?.suggestions || []
  }

  /**
   * Envia feedback sobre uso de sugestão
   */
  async submitSuggestionFeedback(
    suggestionId: string,
    context: SuggestionContext,
    feedback: {
      used: boolean
      edited: boolean
      finalText?: string
      customerSatisfaction?: number
      resolved: boolean
    }
  ): Promise<boolean> {
    const response = await this.request('/suggestions/feedback', {
      method: 'POST',
      body: JSON.stringify({
        suggestionId,
        context,
        feedback,
        timestamp: new Date().toISOString()
      })
    })

    return response.success
  }

  /**
   * Obtém estatísticas de uso das sugestões
   */
  async getSuggestionStats(): Promise<{
    totalSuggestions: number
    usageRate: number
    satisfactionImpact: number
    topSuggestionTypes: { category: string; count: number }[]
  }> {
    const response = await this.request<any>('/suggestions/stats')
    
    return response.data || {
      totalSuggestions: 0,
      usageRate: 0,
      satisfactionImpact: 0,
      topSuggestionTypes: []
    }
  }

  // ========================================
  // SENTIMENT ANALYSIS APIS
  // ========================================

  /**
   * Analisa sentimento de uma mensagem
   */
  async analyzeSentiment(
    message: string,
    context?: SentimentHistory[]
  ): Promise<SentimentResult | null> {
    const response = await this.request<{ sentiment: SentimentResult }>('/sentiment', {
      method: 'POST',
      body: JSON.stringify({
        message,
        context: context?.slice(-5) // Últimas 5 mensagens para contexto
      })
    })

    return response.data?.sentiment || null
  }

  /**
   * Analisa sentimento de múltiplas mensagens
   */
  async analyzeBulkSentiment(
    messages: Array<{ id: string; content: string; timestamp: Date }>
  ): Promise<{ [messageId: string]: SentimentResult }> {
    const response = await this.request<{ results: { [key: string]: SentimentResult } }>('/sentiment/bulk', {
      method: 'POST',
      body: JSON.stringify({ messages })
    })

    return response.data?.results || {}
  }

  /**
   * Obtém estatísticas de sentimento
   */
  async getSentimentStats(): Promise<{
    totalAnalyses: number
    sentimentDistribution: { [key: string]: number }
    averageUrgency: number
    topEmotions: { emotion: string; percentage: number }[]
  }> {
    const response = await this.request<any>('/sentiment/stats')
    
    return response.data || {
      totalAnalyses: 0,
      sentimentDistribution: {},
      averageUrgency: 0,
      topEmotions: []
    }
  }

  // ========================================
  // INTENT CLASSIFICATION APIS
  // ========================================

  /**
   * Classifica intenção de uma mensagem
   */
  async classifyIntent(
    message: string,
    context?: Partial<IntentContext>
  ): Promise<IntentResult | null> {
    const response = await this.request<{ intent: IntentResult }>('/intent', {
      method: 'POST',
      body: JSON.stringify({
        message,
        context,
        language: 'pt-BR'
      })
    })

    return response.data?.intent || null
  }

  /**
   * Classifica múltiplas mensagens
   */
  async classifyBulkIntent(
    messages: Array<{ id: string; content: string; context?: Partial<IntentContext> }>
  ): Promise<{ [messageId: string]: IntentResult }> {
    const response = await this.request<{ results: { [key: string]: IntentResult } }>('/intent/bulk', {
      method: 'POST',
      body: JSON.stringify({ messages })
    })

    return response.data?.results || {}
  }

  /**
   * Treina classificador com feedback
   */
  async trainIntentClassifier(data: IntentTrainingData): Promise<boolean> {
    const response = await this.request('/intent/train', {
      method: 'POST',
      body: JSON.stringify({
        text: data.text,
        intent: data.intent,
        entities: data.entities,
        metadata: data.metadata,
        timestamp: new Date().toISOString()
      })
    })

    return response.success
  }

  /**
   * Obtém estatísticas de classificação de intenções
   */
  async getIntentStats(): Promise<{
    totalClassifications: number
    intentDistribution: { [intent: string]: number }
    accuracyMetrics: {
      overallAccuracy: number
      precisionByIntent: { [intent: string]: number }
      recallByIntent: { [intent: string]: number }
    }
    commonEntities: { [entity: string]: number }
  }> {
    const response = await this.request<any>('/intent/stats')
    
    return response.data || {
      totalClassifications: 0,
      intentDistribution: {},
      accuracyMetrics: {
        overallAccuracy: 0,
        precisionByIntent: {},
        recallByIntent: {}
      },
      commonEntities: {}
    }
  }

  // ========================================
  // CHATBOT APIS
  // ========================================

  /**
   * Gera resposta do chatbot
   */
  async generateChatbotResponse(
    message: string,
    intent: IntentResult,
    sentiment: SentimentResult,
    context: ConversationContext
  ): Promise<{
    response: string
    confidence: number
    followUpQuestions?: string[]
  } | null> {
    const response = await this.request<any>('/chatbot/generate', {
      method: 'POST',
      body: JSON.stringify({
        message,
        intent,
        sentiment,
        context: {
          conversationId: context.conversationId,
          previousMessages: context.messages.slice(-5),
          currentTopic: context.currentTopic
        }
      })
    })

    return response.data || null
  }

  /**
   * Registra feedback sobre resposta do chatbot
   */
  async recordChatbotFeedback(
    messageId: string,
    rating: number,
    wasHelpful: boolean,
    userComment?: string
  ): Promise<boolean> {
    const response = await this.request('/chatbot/feedback', {
      method: 'POST',
      body: JSON.stringify({
        messageId,
        rating,
        wasHelpful,
        comment: userComment,
        timestamp: new Date().toISOString()
      })
    })

    return response.success
  }

  /**
   * Obtém estatísticas do chatbot
   */
  async getChatbotStats(): Promise<{
    totalInteractions: number
    automatedResponses: number
    humanTransfers: number
    averageResponseTime: number
    customerSatisfaction: number
    resolutionRate: number
    topIntents: { intent: string; count: number }[]
    escalationReasons: { reason: string; count: number }[]
  }> {
    const response = await this.request<any>('/chatbot/stats')
    
    return response.data || {
      totalInteractions: 0,
      automatedResponses: 0,
      humanTransfers: 0,
      averageResponseTime: 0,
      customerSatisfaction: 0,
      resolutionRate: 0,
      topIntents: [],
      escalationReasons: []
    }
  }

  // ========================================
  // KNOWLEDGE BASE APIS
  // ========================================

  /**
   * Busca na base de conhecimento
   */
  async searchKnowledgeBase(
    query: string,
    filters?: {
      category?: string
      minConfidence?: number
      limit?: number
    }
  ): Promise<Array<{
    id: string
    question: string
    answer: string
    category: string
    confidence: number
    lastUsed: Date
  }>> {
    const response = await this.request<{ items: any[] }>('/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({
        query,
        filters: filters || {},
        limit: filters?.limit || 10
      })
    })

    return response.data?.items || []
  }

  /**
   * Adiciona item à base de conhecimento
   */
  async addKnowledgeItem(item: {
    question: string
    answer: string
    keywords: string[]
    category: string
  }): Promise<string | null> {
    const response = await this.request<{ id: string }>('/knowledge', {
      method: 'POST',
      body: JSON.stringify(item)
    })

    return response.data?.id || null
  }

  /**
   * Atualiza item da base de conhecimento
   */
  async updateKnowledgeItem(
    id: string,
    updates: Partial<{
      question: string
      answer: string
      keywords: string[]
      category: string
    }>
  ): Promise<boolean> {
    const response = await this.request(`/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    })

    return response.success
  }

  // ========================================
  // TEMPLATES APIS
  // ========================================

  /**
   * Obtém templates de resposta
   */
  async getResponseTemplates(filters?: {
    category?: string
    tags?: string[]
    minSuccessRate?: number
  }): Promise<Array<{
    id: string
    title: string
    content: string
    category: string
    tags: string[]
    usageCount: number
    successRate: number
    variables: { [key: string]: string }
  }>> {
    const params = new URLSearchParams()
    if (filters?.category) params.set('category', filters.category)
    if (filters?.tags) params.set('tags', filters.tags.join(','))
    if (filters?.minSuccessRate) params.set('minSuccessRate', filters.minSuccessRate.toString())

    const response = await this.request<{ templates: any[] }>(`/templates?${params}`)
    return response.data?.templates || []
  }

  /**
   * Cria template de resposta
   */
  async createResponseTemplate(template: {
    title: string
    content: string
    category: string
    tags: string[]
    variables?: { [key: string]: string }
  }): Promise<string | null> {
    const response = await this.request<{ id: string }>('/templates', {
      method: 'POST',
      body: JSON.stringify(template)
    })

    return response.data?.id || null
  }

  // ========================================
  // ANALYTICS APIS
  // ========================================

  /**
   * Obtém métricas consolidadas de IA
   */
  async getAIMetrics(timeRange?: {
    startDate: Date
    endDate: Date
  }): Promise<{
    suggestions: any
    sentiment: any
    intents: any
    chatbot: any
    overall: {
      totalOperations: number
      healthScore: number
      automationRate: number
      customerSatisfaction: number
    }
  }> {
    const params = new URLSearchParams()
    if (timeRange?.startDate) params.set('startDate', timeRange.startDate.toISOString())
    if (timeRange?.endDate) params.set('endDate', timeRange.endDate.toISOString())

    const response = await this.request<any>(`/analytics/metrics?${params}`)
    
    return response.data || {
      suggestions: {},
      sentiment: {},
      intents: {},
      chatbot: {},
      overall: {
        totalOperations: 0,
        healthScore: 0,
        automationRate: 0,
        customerSatisfaction: 0
      }
    }
  }

  /**
   * Obtém insights automáticos
   */
  async getAIInsights(limit?: number): Promise<Array<{
    id: string
    type: string
    title: string
    description: string
    value: string | number
    change?: number
    trend: 'up' | 'down' | 'stable'
    severity: 'low' | 'medium' | 'high' | 'critical'
    actionable: boolean
    timestamp: Date
    recommendations?: string[]
  }>> {
    const params = limit ? `?limit=${limit}` : ''
    const response = await this.request<{ insights: any[] }>(`/analytics/insights${params}`)
    
    return response.data?.insights || []
  }

  /**
   * Exporta dados para análise
   */
  async exportAnalytics(
    type: 'suggestions' | 'sentiment' | 'intents' | 'chatbot' | 'all',
    format: 'csv' | 'json' | 'xlsx',
    timeRange?: { startDate: Date; endDate: Date }
  ): Promise<Blob | null> {
    const params = new URLSearchParams({
      type,
      format
    })
    
    if (timeRange?.startDate) params.set('startDate', timeRange.startDate.toISOString())
    if (timeRange?.endDate) params.set('endDate', timeRange.endDate.toISOString())

    try {
      const response = await fetch(`${this.baseUrl}/analytics/export?${params}`, {
        headers: this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}
      })

      if (!response.ok) throw new Error(`Export failed: ${response.status}`)

      return await response.blob()
    } catch (error) {
      console.error('Export error:', error)
      return null
    }
  }

  // ========================================
  // CONFIGURATION APIS
  // ========================================

  /**
   * Obtém configurações dos serviços de IA
   */
  async getAIConfig(): Promise<{
    suggestionEngine: any
    sentimentAnalyzer: any
    intentClassifier: any
    chatbot: any
  }> {
    const response = await this.request<any>('/config')
    
    return response.data || {
      suggestionEngine: {},
      sentimentAnalyzer: {},
      intentClassifier: {},
      chatbot: {}
    }
  }

  /**
   * Atualiza configurações
   */
  async updateAIConfig(
    service: 'suggestions' | 'sentiment' | 'intents' | 'chatbot',
    config: any
  ): Promise<boolean> {
    const response = await this.request(`/config/${service}`, {
      method: 'PUT',
      body: JSON.stringify(config)
    })

    return response.success
  }

  // ========================================
  // HEALTH CHECK
  // ========================================

  /**
   * Verifica status dos serviços de IA
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'down'
    services: {
      suggestions: 'up' | 'down'
      sentiment: 'up' | 'down'
      intents: 'up' | 'down'
      chatbot: 'up' | 'down'
      analytics: 'up' | 'down'
    }
    responseTime: number
    timestamp: Date
  }> {
    const startTime = Date.now()
    const response = await this.request<any>('/health')
    const responseTime = Date.now() - startTime

    return response.data || {
      status: 'down',
      services: {
        suggestions: 'down',
        sentiment: 'down',
        intents: 'down',
        chatbot: 'down',
        analytics: 'down'
      },
      responseTime,
      timestamp: new Date()
    }
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  /**
   * Atualiza token de autenticação
   */
  setAuthToken(token: string): void {
    this.authToken = token
    localStorage.setItem('token', token)
  }

  /**
   * Remove token de autenticação
   */
  clearAuthToken(): void {
    this.authToken = null
    localStorage.removeItem('token')
  }
}

// Instância singleton do cliente API
export const aiAPI = new AIServicesAPI()
export default aiAPI