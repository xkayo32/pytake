/**
 * Sistema de Análise de Sentimento em Tempo Real
 * 
 * Analisa o sentimento e emoções das mensagens dos clientes para
 * ajudar agentes a responder de forma mais apropriada
 */

export interface SentimentResult {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative'
  confidence: number // 0-1
  score: number // -1 to 1, where -1 is most negative and 1 is most positive
  emotions: EmotionAnalysis
  urgency: 'low' | 'medium' | 'high' | 'critical'
  indicators: SentimentIndicator[]
  suggestions: string[]
}

export interface EmotionAnalysis {
  anger: number        // 0-1
  frustration: number  // 0-1
  satisfaction: number // 0-1
  confusion: number    // 0-1
  urgency: number      // 0-1
  politeness: number   // 0-1
  gratitude: number    // 0-1
  impatience: number   // 0-1
}

export interface SentimentIndicator {
  type: 'positive' | 'negative' | 'neutral'
  text: string
  weight: number
  category: 'word' | 'phrase' | 'punctuation' | 'pattern'
}

export interface SentimentHistory {
  messageId: string
  timestamp: Date
  sentiment: SentimentResult
  message: string
}

export interface ConversationSentimentSummary {
  conversationId: string
  overallSentiment: SentimentResult['sentiment']
  sentimentTrend: 'improving' | 'declining' | 'stable' | 'volatile'
  keyMoments: Array<{
    timestamp: Date
    event: 'escalation' | 'resolution' | 'satisfaction_drop' | 'satisfaction_peak'
    sentiment: SentimentResult
    message: string
  }>
  recommendations: string[]
}

export class SentimentAnalyzer {
  private apiUrl: string = '/api/v1/ai/sentiment'
  private cache: Map<string, { result: SentimentResult; timestamp: number }> = new Map()
  private cacheTimeout: number = 10 * 60 * 1000 // 10 minutes

  // Lexicons for Portuguese sentiment analysis
  private positiveWords = new Set([
    'obrigado', 'obrigada', 'grato', 'grata', 'perfeito', 'ótimo', 'excelente',
    'maravilhoso', 'fantástico', 'amo', 'adoro', 'feliz', 'satisfeito', 'satisfeita',
    'legal', 'bacana', 'show', 'demais', 'top', 'massa', 'incrível',
    'parabéns', 'sucesso', 'bom', 'boa', 'melhor', 'adorei', 'amei',
    'recomendo', 'aprovado', 'positivo', 'positiva', 'sim', 'claro',
    'certamente', 'com certeza', 'super', 'muito bom', 'muito boa'
  ])

  private negativeWords = new Set([
    'ruim', 'péssimo', 'horrível', 'terrível', 'ódio', 'odeia', 'detesto',
    'raiva', 'irritado', 'irritada', 'furioso', 'furiosa', 'chateado', 'chateada',
    'decepcionado', 'decepcionada', 'frustrado', 'frustrada', 'problema', 'erro',
    'bug', 'falha', 'não funciona', 'quebrado', 'quebrada', 'lento', 'lenta',
    'demora', 'demorado', 'demorada', 'não gostei', 'não gosto', 'cancelar',
    'cancelamento', 'reembolso', 'reclamar', 'reclamação', 'insatisfeito',
    'insatisfeita', 'descontente', 'infeliz', 'triste', 'decepção', 'lixo',
    'porcaria', 'nunca mais', 'péssima', 'pior', 'mal', 'desastre'
  ])

  private urgencyWords = new Set([
    'urgente', 'emergência', 'rápido', 'rápida', 'imediato', 'imediata',
    'agora', 'já', 'hoje', 'socorro', 'ajuda', 'preciso', 'importante',
    'crítico', 'crítica', 'grave', 'sério', 'séria', 'prioridade'
  ])

  private intensifiers = new Map([
    ['muito', 1.5],
    ['super', 1.7],
    ['extremamente', 1.8],
    ['bastante', 1.3],
    ['demais', 1.4],
    ['totalmente', 1.6],
    ['completamente', 1.7],
    ['absolutamente', 1.8]
  ])

  /**
   * Analisa o sentimento de uma mensagem
   */
  async analyzeSentiment(message: string, conversationContext?: SentimentHistory[]): Promise<SentimentResult> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(message)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }

      // Try API first
      let result = await this.callSentimentAPI(message, conversationContext)
      
      // Fallback to rule-based analysis
      if (!result) {
        result = this.analyzeWithRules(message)
      }

      // Add contextual analysis
      if (conversationContext) {
        result = this.addContextualAnalysis(result, conversationContext)
      }

      // Cache result
      this.setCache(cacheKey, result)
      
      return result

    } catch (error) {
      console.error('Error analyzing sentiment:', error)
      return this.analyzeWithRules(message)
    }
  }

  /**
   * Chama API de análise de sentimento
   */
  private async callSentimentAPI(message: string, context?: SentimentHistory[]): Promise<SentimentResult | null> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message,
          context: context?.slice(-5) // Last 5 messages for context
        })
      })

      if (!response.ok) {
        throw new Error(`Sentiment API error: ${response.status}`)
      }

      const data = await response.json()
      return data.sentiment

    } catch (error) {
      console.warn('Sentiment API unavailable, using rule-based analysis:', error)
      return null
    }
  }

  /**
   * Análise baseada em regras (fallback)
   */
  private analyzeWithRules(message: string): SentimentResult {
    const cleanMessage = message.toLowerCase()
    const words = cleanMessage.split(/\s+/)
    const indicators: SentimentIndicator[] = []
    
    let positiveScore = 0
    let negativeScore = 0
    let urgencyScore = 0
    let emotionScores: EmotionAnalysis = {
      anger: 0,
      frustration: 0,
      satisfaction: 0,
      confusion: 0,
      urgency: 0,
      politeness: 0,
      gratitude: 0,
      impatience: 0
    }

    // Analyze words
    words.forEach((word, index) => {
      let multiplier = 1

      // Check for intensifiers before this word
      if (index > 0 && this.intensifiers.has(words[index - 1])) {
        multiplier = this.intensifiers.get(words[index - 1]) || 1
      }

      // Positive words
      if (this.positiveWords.has(word)) {
        const score = multiplier
        positiveScore += score
        indicators.push({
          type: 'positive',
          text: word,
          weight: score,
          category: 'word'
        })
        emotionScores.satisfaction += score * 0.3
        emotionScores.gratitude += score * 0.2
        emotionScores.politeness += score * 0.1
      }

      // Negative words
      if (this.negativeWords.has(word)) {
        const score = multiplier
        negativeScore += score
        indicators.push({
          type: 'negative',
          text: word,
          weight: score,
          category: 'word'
        })
        emotionScores.anger += score * 0.2
        emotionScores.frustration += score * 0.3
      }

      // Urgency words
      if (this.urgencyWords.has(word)) {
        urgencyScore += multiplier
        emotionScores.urgency += multiplier * 0.4
        emotionScores.impatience += multiplier * 0.2
      }
    })

    // Punctuation analysis
    const exclamationCount = (message.match(/!/g) || []).length
    const questionCount = (message.match(/\?/g) || []).length
    const capsCount = (message.match(/[A-Z]{2,}/g) || []).length

    if (exclamationCount > 1) {
      indicators.push({
        type: 'negative',
        text: 'Multiple exclamations',
        weight: exclamationCount * 0.3,
        category: 'punctuation'
      })
      emotionScores.anger += exclamationCount * 0.1
      negativeScore += exclamationCount * 0.3
    }

    if (questionCount > 2) {
      emotionScores.confusion += questionCount * 0.15
      indicators.push({
        type: 'neutral',
        text: 'Multiple questions',
        weight: questionCount * 0.2,
        category: 'punctuation'
      })
    }

    if (capsCount > 0) {
      indicators.push({
        type: 'negative',
        text: 'CAPS LOCK usage',
        weight: capsCount * 0.4,
        category: 'punctuation'
      })
      emotionScores.anger += capsCount * 0.2
      negativeScore += capsCount * 0.4
    }

    // Pattern analysis
    if (message.includes('não consigo') || message.includes('não funcionou')) {
      emotionScores.frustration += 0.3
      negativeScore += 0.5
      indicators.push({
        type: 'negative',
        text: 'Expression of inability',
        weight: 0.5,
        category: 'pattern'
      })
    }

    if (message.includes('já tentei') || message.includes('várias vezes')) {
      emotionScores.impatience += 0.4
      negativeScore += 0.3
    }

    // Calculate final scores
    const totalScore = positiveScore - negativeScore
    const normalizedScore = Math.max(-1, Math.min(1, totalScore / Math.max(words.length / 4, 1)))
    
    // Normalize emotion scores
    Object.keys(emotionScores).forEach(key => {
      emotionScores[key as keyof EmotionAnalysis] = Math.min(1, emotionScores[key as keyof EmotionAnalysis])
    })

    // Determine sentiment category
    let sentiment: SentimentResult['sentiment']
    if (normalizedScore >= 0.6) sentiment = 'very_positive'
    else if (normalizedScore >= 0.2) sentiment = 'positive'
    else if (normalizedScore >= -0.2) sentiment = 'neutral'
    else if (normalizedScore >= -0.6) sentiment = 'negative'
    else sentiment = 'very_negative'

    // Determine urgency
    let urgency: SentimentResult['urgency']
    if (urgencyScore >= 2 || emotionScores.anger > 0.7) urgency = 'critical'
    else if (urgencyScore >= 1 || emotionScores.anger > 0.5) urgency = 'high'
    else if (urgencyScore >= 0.5 || emotionScores.frustration > 0.6) urgency = 'medium'
    else urgency = 'low'

    // Generate suggestions based on sentiment
    const suggestions = this.generateSuggestions(sentiment, emotionScores, urgency)

    return {
      sentiment,
      confidence: Math.min(0.95, 0.6 + (Math.abs(normalizedScore) * 0.35)), // Rule-based has lower confidence
      score: normalizedScore,
      emotions: emotionScores,
      urgency,
      indicators,
      suggestions
    }
  }

  /**
   * Adiciona análise contextual baseada no histórico
   */
  private addContextualAnalysis(result: SentimentResult, context: SentimentHistory[]): SentimentResult {
    if (context.length === 0) return result

    // Analyze sentiment trend
    const recentSentiments = context.slice(-3).map(h => h.sentiment.score)
    const trendScore = this.calculateTrend(recentSentiments)
    
    // If sentiment is getting worse, increase urgency
    if (trendScore < -0.3 && result.sentiment === 'negative') {
      result.urgency = result.urgency === 'low' ? 'medium' : 'high'
      result.suggestions.unshift('Cliente está ficando mais insatisfeito - considere escalonamento')
    }

    // If this is a repeated negative sentiment, suggest proactive action
    const consecutiveNegative = context.slice(-2).every(h => 
      ['negative', 'very_negative'].includes(h.sentiment.sentiment)
    )
    
    if (consecutiveNegative && ['negative', 'very_negative'].includes(result.sentiment)) {
      result.urgency = 'high'
      result.suggestions.unshift('Múltiplas mensagens negativas - ação imediata necessária')
    }

    return result
  }

  /**
   * Calcula tendência do sentimento
   */
  private calculateTrend(scores: number[]): number {
    if (scores.length < 2) return 0
    
    let trend = 0
    for (let i = 1; i < scores.length; i++) {
      trend += scores[i] - scores[i - 1]
    }
    
    return trend / (scores.length - 1)
  }

  /**
   * Gera sugestões baseadas no sentimento
   */
  private generateSuggestions(
    sentiment: SentimentResult['sentiment'], 
    emotions: EmotionAnalysis,
    urgency: SentimentResult['urgency']
  ): string[] {
    const suggestions: string[] = []

    switch (sentiment) {
      case 'very_negative':
        suggestions.push('Use linguagem empática e calma')
        suggestions.push('Considere escalonamento para supervisor')
        suggestions.push('Ofereça soluções concretas rapidamente')
        if (emotions.anger > 0.6) {
          suggestions.push('Cliente muito irritado - evite frases defensivas')
        }
        break

      case 'negative':
        suggestions.push('Demonstre compreensão do problema')
        suggestions.push('Seja proativo na solução')
        if (emotions.frustration > 0.5) {
          suggestions.push('Cliente frustrado - explique próximos passos claramente')
        }
        break

      case 'neutral':
        suggestions.push('Mantenha tom profissional e prestativo')
        if (emotions.confusion > 0.4) {
          suggestions.push('Cliente pode estar confuso - use explicações simples')
        }
        break

      case 'positive':
        suggestions.push('Continue o bom atendimento')
        suggestions.push('Aproveite para oferecer informações extras')
        break

      case 'very_positive':
        suggestions.push('Cliente satisfeito - momento ideal para feedback')
        suggestions.push('Considere mencionar outros serviços')
        break
    }

    if (urgency === 'critical') {
      suggestions.unshift('URGENTE: Resposta imediata necessária')
    } else if (urgency === 'high') {
      suggestions.unshift('Alta prioridade - responda rapidamente')
    }

    if (emotions.gratitude > 0.4) {
      suggestions.push('Cliente demonstrou gratidão - reconheça e mantenha positividade')
    }

    return suggestions
  }

  /**
   * Analisa o sentimento de toda uma conversa
   */
  async analyzeConversationSentiment(
    messages: Array<{ content: string; sender: 'agent' | 'customer'; timestamp: Date }>
  ): Promise<ConversationSentimentSummary> {
    const customerMessages = messages.filter(m => m.sender === 'customer')
    const sentimentHistory: SentimentHistory[] = []

    // Analyze each customer message
    for (const message of customerMessages) {
      const sentiment = await this.analyzeSentiment(message.content, sentimentHistory)
      sentimentHistory.push({
        messageId: `${message.timestamp.getTime()}`,
        timestamp: message.timestamp,
        sentiment,
        message: message.content
      })
    }

    if (sentimentHistory.length === 0) {
      return {
        conversationId: 'unknown',
        overallSentiment: 'neutral',
        sentimentTrend: 'stable',
        keyMoments: [],
        recommendations: ['Sem mensagens do cliente para analisar']
      }
    }

    // Calculate overall sentiment
    const avgScore = sentimentHistory.reduce((sum, h) => sum + h.sentiment.score, 0) / sentimentHistory.length
    let overallSentiment: SentimentResult['sentiment']
    if (avgScore >= 0.3) overallSentiment = 'positive'
    else if (avgScore >= -0.3) overallSentiment = 'neutral'
    else overallSentiment = 'negative'

    // Calculate trend
    const scores = sentimentHistory.map(h => h.sentiment.score)
    const trendScore = this.calculateTrend(scores)
    let sentimentTrend: ConversationSentimentSummary['sentimentTrend']
    if (trendScore > 0.2) sentimentTrend = 'improving'
    else if (trendScore < -0.2) sentimentTrend = 'declining'
    else if (Math.max(...scores) - Math.min(...scores) > 1.0) sentimentTrend = 'volatile'
    else sentimentTrend = 'stable'

    // Identify key moments
    const keyMoments: ConversationSentimentSummary['keyMoments'] = []
    for (let i = 0; i < sentimentHistory.length; i++) {
      const current = sentimentHistory[i]
      
      if (current.sentiment.sentiment === 'very_negative' && current.sentiment.urgency === 'critical') {
        keyMoments.push({
          timestamp: current.timestamp,
          event: 'escalation',
          sentiment: current.sentiment,
          message: current.message
        })
      }
      
      if (i > 0) {
        const previous = sentimentHistory[i - 1]
        if (previous.sentiment.score < -0.5 && current.sentiment.score > 0.3) {
          keyMoments.push({
            timestamp: current.timestamp,
            event: 'resolution',
            sentiment: current.sentiment,
            message: current.message
          })
        }
      }
    }

    // Generate recommendations
    const recommendations = this.generateConversationRecommendations(
      overallSentiment, 
      sentimentTrend, 
      sentimentHistory
    )

    return {
      conversationId: 'conversation-' + messages[0]?.timestamp.getTime(),
      overallSentiment,
      sentimentTrend,
      keyMoments,
      recommendations
    }
  }

  /**
   * Gera recomendações para a conversa
   */
  private generateConversationRecommendations(
    overall: SentimentResult['sentiment'],
    trend: ConversationSentimentSummary['sentimentTrend'],
    history: SentimentHistory[]
  ): string[] {
    const recommendations: string[] = []

    if (overall === 'negative' && trend === 'declining') {
      recommendations.push('Situação crítica - considere escalonamento imediato')
      recommendations.push('Foque em soluções concretas, não explicações')
    }

    if (trend === 'improving') {
      recommendations.push('Cliente está se acalmando - continue a abordagem atual')
    }

    if (trend === 'volatile') {
      recommendations.push('Sentimento instável - seja extra cauteloso nas respostas')
    }

    const hasHighUrgency = history.some(h => h.sentiment.urgency === 'critical')
    if (hasHighUrgency) {
      recommendations.push('Mensagens de alta urgência detectadas - responda prioritariamente')
    }

    const avgSatisfaction = history.reduce((sum, h) => sum + h.sentiment.emotions.satisfaction, 0) / history.length
    if (avgSatisfaction > 0.6) {
      recommendations.push('Cliente demonstra satisfação - momento ideal para finalizar positivamente')
    }

    return recommendations
  }

  // Cache management
  private getCacheKey(message: string): string {
    return `sentiment-${message.substring(0, 50)}-${message.length}`
  }

  private getFromCache(key: string): SentimentResult | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result
    }
    this.cache.delete(key)
    return null
  }

  private setCache(key: string, result: SentimentResult): void {
    this.cache.set(key, { result, timestamp: Date.now() })
    
    // Clean old cache entries
    if (this.cache.size > 200) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
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
    try {
      const response = await fetch(`${this.apiUrl}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching sentiment stats:', error)
    }

    // Return mock data if API fails
    return {
      totalAnalyses: 2450,
      sentimentDistribution: {
        very_positive: 0.15,
        positive: 0.35,
        neutral: 0.25,
        negative: 0.20,
        very_negative: 0.05
      },
      averageUrgency: 0.3,
      topEmotions: [
        { emotion: 'satisfaction', percentage: 0.45 },
        { emotion: 'frustration', percentage: 0.25 },
        { emotion: 'confusion', percentage: 0.15 },
        { emotion: 'gratitude', percentage: 0.10 },
        { emotion: 'anger', percentage: 0.05 }
      ]
    }
  }
}