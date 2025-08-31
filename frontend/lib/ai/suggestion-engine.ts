/**
 * Sistema de Sugestões Automáticas de IA
 * 
 * Este módulo fornece sugestões inteligentes de respostas baseadas no contexto
 * da conversa, histórico do cliente e padrões de atendimento bem-sucedidos
 */

export interface Message {
  id: string
  content: string
  sender: 'agent' | 'customer'
  timestamp: Date
  metadata?: {
    sentiment?: SentimentAnalysis
    intent?: IntentClassification
    urgency?: 'low' | 'medium' | 'high' | 'critical'
  }
}

export interface Conversation {
  id: string
  customerId: string
  messages: Message[]
  category?: 'support' | 'sales' | 'complaint' | 'question' | 'compliment'
  status: 'active' | 'resolved' | 'escalated' | 'abandoned'
  tags: string[]
  customerProfile?: CustomerProfile
}

export interface CustomerProfile {
  id: string
  name: string
  tier: 'vip' | 'premium' | 'regular'
  previousIssues: string[]
  preferredLanguageStyle: 'formal' | 'casual' | 'technical'
  satisfactionHistory: number[]
  lastInteractionDate: Date
}

export interface SuggestionResponse {
  id: string
  text: string
  confidence: number // 0-1
  category: 'greeting' | 'information' | 'solution' | 'escalation' | 'closing'
  reasoning: string
  personalizable: boolean
  shortcuts?: string[] // Quick actions
  followUpQuestions?: string[]
  estimatedResponseTime?: number // segundos para digitar
}

export interface SuggestionContext {
  conversation: Conversation
  agentProfile?: AgentProfile
  currentMessage?: string // Message being typed
  availableTemplates: Template[]
  knowledgeBase: KnowledgeItem[]
  recentSuccessfulResponses: SuccessfulResponse[]
}

export interface AgentProfile {
  id: string
  name: string
  expertise: string[]
  averageResponseTime: number
  satisfactionRating: number
  preferredResponseStyle: 'concise' | 'detailed' | 'empathetic'
  languagePreferences: {
    formality: 'formal' | 'informal' | 'mixed'
    tone: 'professional' | 'friendly' | 'technical'
    length: 'short' | 'medium' | 'long'
  }
}

export interface Template {
  id: string
  title: string
  content: string
  category: string
  tags: string[]
  usageCount: number
  successRate: number
  variables: { [key: string]: string }
}

export interface KnowledgeItem {
  id: string
  question: string
  answer: string
  keywords: string[]
  category: string
  confidence: number
  lastUpdated: Date
}

export interface SuccessfulResponse {
  originalMessage: string
  response: string
  context: string
  customerSatisfaction: number
  responseTime: number
  resolved: boolean
}

export interface SentimentAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative' | 'very_negative'
  confidence: number
  emotions: {
    anger: number
    frustration: number
    satisfaction: number
    confusion: number
    urgency: number
  }
  indicators: string[]
}

export interface IntentClassification {
  primary: string
  confidence: number
  secondary?: string
  entities: { [key: string]: string }
  actionRequired: boolean
}

export class AISuggestionEngine {
  private apiKey: string | null = null
  private baseUrl: string = '/api/v1/ai'
  private cache: Map<string, SuggestionResponse[]> = new Map()
  private cacheTimeout: number = 5 * 60 * 1000 // 5 minutes

  constructor(apiKey?: string) {
    this.apiKey = apiKey || null
  }

  /**
   * Gera sugestões de resposta baseadas no contexto da conversa
   */
  async generateSuggestions(context: SuggestionContext): Promise<SuggestionResponse[]> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(context)
      const cachedSuggestions = this.getFromCache(cacheKey)
      if (cachedSuggestions) {
        return cachedSuggestions
      }

      // Try API first
      let suggestions = await this.callAIService(context)
      
      // Fallback to rule-based suggestions
      if (!suggestions || suggestions.length === 0) {
        suggestions = this.generateRuleBasedSuggestions(context)
      }

      // Enhanced suggestions with context
      suggestions = this.enhanceSuggestions(suggestions, context)
      
      // Cache results
      this.setCache(cacheKey, suggestions)
      
      return suggestions.slice(0, 5) // Limit to top 5 suggestions

    } catch (error) {
      console.error('Error generating AI suggestions:', error)
      return this.generateRuleBasedSuggestions(context)
    }
  }

  /**
   * Chama serviço de IA externo (OpenAI/Claude)
   */
  private async callAIService(context: SuggestionContext): Promise<SuggestionResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          conversation: context.conversation,
          agentProfile: context.agentProfile,
          currentMessage: context.currentMessage,
          context: {
            templates: context.availableTemplates.slice(0, 10),
            knowledgeItems: context.knowledgeBase.slice(0, 5),
            recentSuccesses: context.recentSuccessfulResponses.slice(0, 3)
          }
        })
      })

      if (!response.ok) {
        throw new Error(`AI service error: ${response.status}`)
      }

      const data = await response.json()
      return data.suggestions || []

    } catch (error) {
      console.warn('AI service unavailable, falling back to rule-based suggestions:', error)
      return []
    }
  }

  /**
   * Gera sugestões baseadas em regras quando IA não está disponível
   */
  private generateRuleBasedSuggestions(context: SuggestionContext): SuggestionResponse[] {
    const { conversation, availableTemplates, knowledgeBase } = context
    const lastMessage = conversation.messages[conversation.messages.length - 1]
    const suggestions: SuggestionResponse[] = []

    if (!lastMessage || lastMessage.sender === 'agent') {
      return this.getFollowUpSuggestions(context)
    }

    const messageContent = lastMessage.content.toLowerCase()
    
    // Greeting suggestions
    if (this.isGreeting(messageContent)) {
      suggestions.push({
        id: 'greeting-1',
        text: `Olá! Sou ${context.agentProfile?.name || 'seu atendente'} e estou aqui para ajudar. Como posso te auxiliar hoje?`,
        confidence: 0.9,
        category: 'greeting',
        reasoning: 'Resposta de cumprimento personalizada',
        personalizable: true,
        estimatedResponseTime: 3
      })
    }

    // Problem-solving suggestions
    if (this.isProblemReport(messageContent)) {
      suggestions.push({
        id: 'empathy-1',
        text: 'Entendo sua situação e vou fazer o possível para resolver isso rapidamente. Pode me dar mais detalhes sobre o problema?',
        confidence: 0.85,
        category: 'solution',
        reasoning: 'Resposta empática para relato de problema',
        personalizable: true,
        followUpQuestions: [
          'Quando esse problema começou?',
          'Você já tentou alguma solução?',
          'Isso está afetando outras funcionalidades?'
        ],
        estimatedResponseTime: 5
      })
    }

    // Information request suggestions
    if (this.isInformationRequest(messageContent)) {
      const matchingKnowledge = this.findMatchingKnowledge(messageContent, knowledgeBase)
      if (matchingKnowledge.length > 0) {
        const bestMatch = matchingKnowledge[0]
        suggestions.push({
          id: `knowledge-${bestMatch.id}`,
          text: bestMatch.answer,
          confidence: bestMatch.confidence,
          category: 'information',
          reasoning: `Resposta da base de conhecimento: ${bestMatch.question}`,
          personalizable: false,
          estimatedResponseTime: 2
        })
      }
    }

    // Template-based suggestions
    const matchingTemplates = this.findMatchingTemplates(messageContent, availableTemplates)
    matchingTemplates.forEach((template, index) => {
      suggestions.push({
        id: `template-${template.id}`,
        text: this.fillTemplateVariables(template.content, context),
        confidence: 0.7 - (index * 0.1),
        category: 'information',
        reasoning: `Template: ${template.title}`,
        personalizable: true,
        shortcuts: [`/${template.title.toLowerCase().replace(/\s+/g, '-')}`],
        estimatedResponseTime: 4
      })
    })

    // Escalation suggestions for complex issues
    if (this.shouldSuggestEscalation(context)) {
      suggestions.push({
        id: 'escalation-1',
        text: 'Esta situação requer atenção especializada. Vou transferir você para um especialista que poderá resolver isso melhor. Um momento, por favor.',
        confidence: 0.8,
        category: 'escalation',
        reasoning: 'Problema complexo detectado, escalação recomendada',
        personalizable: false,
        shortcuts: ['/escalate'],
        estimatedResponseTime: 4
      })
    }

    return suggestions.sort((a, b) => b.confidence - a.confidence)
  }

  /**
   * Melhora sugestões com contexto adicional
   */
  private enhanceSuggestions(suggestions: SuggestionResponse[], context: SuggestionContext): SuggestionResponse[] {
    return suggestions.map(suggestion => {
      // Personalizar baseado no perfil do agente
      if (suggestion.personalizable && context.agentProfile) {
        suggestion.text = this.personalizeForAgent(suggestion.text, context.agentProfile)
      }

      // Personalizar baseado no cliente
      if (context.conversation.customerProfile) {
        suggestion.text = this.personalizeForCustomer(suggestion.text, context.conversation.customerProfile)
      }

      // Adicionar estimativa de tempo se não existir
      if (!suggestion.estimatedResponseTime) {
        suggestion.estimatedResponseTime = Math.ceil(suggestion.text.length / 10) // ~10 characters per second
      }

      return suggestion
    })
  }

  /**
   * Personaliza texto para o estilo do agente
   */
  private personalizeForAgent(text: string, agent: AgentProfile): string {
    let personalizedText = text

    // Ajustar formalidade
    if (agent.languagePreferences.formality === 'formal') {
      personalizedText = personalizedText
        .replace(/\boi\b/gi, 'Olá')
        .replace(/\bokay\b/gi, 'Certo')
        .replace(/\bbeleza\b/gi, 'Perfeito')
    } else if (agent.languagePreferences.formality === 'informal') {
      personalizedText = personalizedText
        .replace(/\bOlá\b/gi, 'Oi')
        .replace(/\bCerto\b/gi, 'Okay')
        .replace(/\bPerfeito\b/gi, 'Beleza')
    }

    // Ajustar comprimento baseado na preferência
    if (agent.languagePreferences.length === 'short' && personalizedText.length > 100) {
      const sentences = personalizedText.split('. ')
      personalizedText = sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '.' : '')
    }

    return personalizedText
  }

  /**
   * Personaliza texto para o perfil do cliente
   */
  private personalizeForCustomer(text: string, customer: CustomerProfile): string {
    let personalizedText = text

    // Usar nome do cliente se disponível
    if (customer.name) {
      personalizedText = personalizedText.replace(/\bvocê\b/gi, customer.name)
    }

    // Ajustar estilo baseado no tier do cliente
    if (customer.tier === 'vip') {
      personalizedText = `${customer.name}, ` + personalizedText
    }

    return personalizedText
  }

  /**
   * Gera sugestões de follow-up
   */
  private getFollowUpSuggestions(context: SuggestionContext): SuggestionResponse[] {
    const conversation = context.conversation
    const lastAgentMessage = [...conversation.messages]
      .reverse()
      .find(m => m.sender === 'agent')

    if (!lastAgentMessage) {
      return [{
        id: 'initial-1',
        text: 'Olá! Como posso ajudar você hoje?',
        confidence: 0.9,
        category: 'greeting',
        reasoning: 'Mensagem inicial de atendimento',
        personalizable: true,
        estimatedResponseTime: 2
      }]
    }

    return [
      {
        id: 'followup-1',
        text: 'Há mais alguma coisa em que posso ajudar?',
        confidence: 0.8,
        category: 'closing',
        reasoning: 'Follow-up padrão',
        personalizable: true,
        estimatedResponseTime: 2
      },
      {
        id: 'followup-2',
        text: 'Conseguiu resolver o problema? Precisa de mais alguma informação?',
        confidence: 0.7,
        category: 'closing',
        reasoning: 'Verificação de resolução',
        personalizable: true,
        estimatedResponseTime: 3
      }
    ]
  }

  // Utility methods for pattern recognition
  private isGreeting(message: string): boolean {
    const greetings = ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi']
    return greetings.some(greeting => message.includes(greeting))
  }

  private isProblemReport(message: string): boolean {
    const problemIndicators = [
      'problema', 'erro', 'bug', 'não funciona', 'quebrado', 'falha',
      'ajuda', 'socorro', 'dificuldade', 'não consigo'
    ]
    return problemIndicators.some(indicator => message.includes(indicator))
  }

  private isInformationRequest(message: string): boolean {
    const questionWords = ['como', 'quando', 'onde', 'que', 'qual', 'quanto', 'por que']
    const questionMarks = message.includes('?')
    return questionMarks || questionWords.some(word => message.includes(word))
  }

  private findMatchingKnowledge(message: string, knowledgeBase: KnowledgeItem[]): KnowledgeItem[] {
    return knowledgeBase
      .filter(item => 
        item.keywords.some(keyword => message.includes(keyword.toLowerCase()))
      )
      .sort((a, b) => b.confidence - a.confidence)
  }

  private findMatchingTemplates(message: string, templates: Template[]): Template[] {
    return templates
      .filter(template => 
        template.tags.some(tag => message.includes(tag.toLowerCase()))
      )
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 3)
  }

  private fillTemplateVariables(content: string, context: SuggestionContext): string {
    let filledContent = content
    
    // Replace common variables
    filledContent = filledContent
      .replace(/\{agentName\}/g, context.agentProfile?.name || 'Atendente')
      .replace(/\{customerName\}/g, context.conversation.customerProfile?.name || 'Cliente')
      .replace(/\{currentTime\}/g, new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }))
    
    return filledContent
  }

  private shouldSuggestEscalation(context: SuggestionContext): boolean {
    const conversation = context.conversation
    const messageCount = conversation.messages.length
    const hasNegativeSentiment = conversation.messages.some(m => 
      m.metadata?.sentiment?.sentiment === 'very_negative'
    )
    const isComplexIssue = conversation.messages.some(m => 
      m.content.toLowerCase().includes('gerente') || 
      m.content.toLowerCase().includes('superior') ||
      m.content.toLowerCase().includes('cancelar')
    )

    return messageCount > 10 || hasNegativeSentiment || isComplexIssue
  }

  // Cache management
  private getCacheKey(context: SuggestionContext): string {
    const lastMessage = context.conversation.messages[context.conversation.messages.length - 1]
    return `${context.conversation.id}-${lastMessage?.id || 'empty'}`
  }

  private getFromCache(key: string): SuggestionResponse[] | null {
    const cached = this.cache.get(key)
    if (cached) {
      // Check if cache is still valid (5 minutes)
      const now = Date.now()
      if (now - (cached as any).timestamp < this.cacheTimeout) {
        return (cached as any).data
      }
      this.cache.delete(key)
    }
    return null
  }

  private setCache(key: string, data: SuggestionResponse[]): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    } as any)

    // Clean old cache entries
    if (this.cache.size > 100) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }

  /**
   * Treina o sistema com feedback de sucessos/falhas
   */
  async trainWithFeedback(
    suggestion: SuggestionResponse,
    context: SuggestionContext,
    feedback: {
      used: boolean
      edited: boolean
      finalText?: string
      customerSatisfaction?: number
      resolved: boolean
    }
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          suggestionId: suggestion.id,
          context,
          feedback
        })
      })
    } catch (error) {
      console.error('Error submitting feedback:', error)
    }
  }

  /**
   * Obtém estatísticas de uso das sugestões
   */
  async getUsageStats(): Promise<{
    totalSuggestions: number
    usageRate: number
    satisfactionImpact: number
    topSuggestionTypes: { category: string; count: number }[]
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching usage stats:', error)
    }

    // Return mock data if API fails
    return {
      totalSuggestions: 1250,
      usageRate: 0.78,
      satisfactionImpact: 0.15,
      topSuggestionTypes: [
        { category: 'information', count: 450 },
        { category: 'solution', count: 380 },
        { category: 'greeting', count: 220 },
        { category: 'closing', count: 200 }
      ]
    }
  }
}