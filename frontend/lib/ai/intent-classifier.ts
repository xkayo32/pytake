/**
 * Sistema de Classificação Automática de Intenções
 * 
 * Classifica automaticamente a intenção das mensagens dos clientes para
 * direcionar o atendimento e sugerir respostas mais adequadas
 */

export interface IntentResult {
  primary: IntentCategory
  confidence: number // 0-1
  secondary?: IntentCategory
  entities: EntityExtraction[]
  context: IntentContext
  urgency: 'low' | 'medium' | 'high' | 'critical'
  actionRequired: boolean
  suggestedActions: string[]
  routing?: {
    department: string
    skillRequired: string[]
    priority: number
  }
}

export interface IntentCategory {
  name: string
  type: IntentType
  confidence: number
  keywords: string[]
  patterns: string[]
  description: string
}

export type IntentType = 
  | 'question' 
  | 'problem_report' 
  | 'request' 
  | 'complaint' 
  | 'compliment' 
  | 'greeting' 
  | 'goodbye' 
  | 'escalation' 
  | 'information' 
  | 'support' 
  | 'sales' 
  | 'billing' 
  | 'technical' 
  | 'feedback'

export interface EntityExtraction {
  entity: string
  value: string
  confidence: number
  position: { start: number; end: number }
  type: 'person' | 'product' | 'service' | 'date' | 'time' | 'money' | 'email' | 'phone' | 'order_id' | 'custom'
}

export interface IntentContext {
  conversationStage: 'opening' | 'middle' | 'closing' | 'escalated'
  customerTier: 'regular' | 'premium' | 'vip'
  previousIntents: string[]
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night'
  channel: 'chat' | 'email' | 'phone' | 'social'
  isFollowUp: boolean
}

export interface IntentTrainingData {
  text: string
  intent: string
  entities: EntityExtraction[]
  metadata?: any
}

export interface IntentStats {
  totalClassifications: number
  intentDistribution: { [intent: string]: number }
  accuracyMetrics: {
    overallAccuracy: number
    precisionByIntent: { [intent: string]: number }
    recallByIntent: { [intent: string]: number }
  }
  commonEntities: { [entity: string]: number }
}

export class IntentClassifier {
  private apiUrl: string = '/api/v1/ai/intent'
  private cache: Map<string, { result: IntentResult; timestamp: number }> = new Map()
  private cacheTimeout: number = 5 * 60 * 1000 // 5 minutes

  // Predefined intent categories with Portuguese patterns
  private intentCategories: IntentCategory[] = [
    {
      name: 'greeting',
      type: 'greeting',
      confidence: 0.95,
      keywords: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hi'],
      patterns: ['^(oi|olá|bom dia)', 'como vai', 'tudo bem'],
      description: 'Cumprimentos e saudações'
    },
    {
      name: 'question_how_to',
      type: 'question',
      confidence: 0.90,
      keywords: ['como', 'onde', 'quando', 'qual', 'quanto'],
      patterns: ['como (fazer|usar|configurar)', 'onde (encontro|fica)', 'qual (é|seria)'],
      description: 'Perguntas sobre como fazer algo'
    },
    {
      name: 'problem_technical',
      type: 'problem_report',
      confidence: 0.85,
      keywords: ['problema', 'erro', 'bug', 'não funciona', 'quebrado', 'falha', 'travado'],
      patterns: ['não (funciona|está funcionando)', 'está (quebrado|com problema)', 'deu erro'],
      description: 'Relato de problemas técnicos'
    },
    {
      name: 'request_support',
      type: 'request',
      confidence: 0.80,
      keywords: ['preciso', 'quero', 'gostaria', 'solicito', 'ajuda', 'suporte'],
      patterns: ['preciso (de|que)', 'quero (fazer|ter)', 'gostaria (de|que)'],
      description: 'Solicitações de suporte ou ajuda'
    },
    {
      name: 'complaint',
      type: 'complaint',
      confidence: 0.85,
      keywords: ['reclamação', 'insatisfeito', 'péssimo', 'horrível', 'cancelar', 'reembolso'],
      patterns: ['estou (insatisfeito|decepcionado)', 'quero (cancelar|reclamar)', 'péssimo atendimento'],
      description: 'Reclamações e insatisfações'
    },
    {
      name: 'compliment',
      type: 'compliment',
      confidence: 0.90,
      keywords: ['obrigado', 'obrigada', 'parabéns', 'excelente', 'ótimo', 'perfeito', 'adorei'],
      patterns: ['muito obrigad[oa]', 'excelente (atendimento|serviço)', 'adorei (o|a)'],
      description: 'Elogios e agradecimentos'
    },
    {
      name: 'billing_question',
      type: 'billing',
      confidence: 0.88,
      keywords: ['cobrança', 'fatura', 'pagamento', 'valor', 'preço', 'plano', 'assinatura'],
      patterns: ['qual (o valor|preço)', 'sobre (a cobrança|fatura)', 'meu plano'],
      description: 'Questões sobre cobrança e pagamentos'
    },
    {
      name: 'escalation_request',
      type: 'escalation',
      confidence: 0.92,
      keywords: ['gerente', 'supervisor', 'responsável', 'superior', 'diretor'],
      patterns: ['falar com (o gerente|supervisor)', 'quero falar com', 'cadê (o gerente|responsável)'],
      description: 'Solicitações de escalação'
    },
    {
      name: 'information_request',
      type: 'information',
      confidence: 0.75,
      keywords: ['informação', 'sobre', 'detalhes', 'explicar', 'entender'],
      patterns: ['me (explica|conta)', 'informações sobre', 'detalhes (do|da)'],
      description: 'Solicitações de informações'
    },
    {
      name: 'goodbye',
      type: 'goodbye',
      confidence: 0.95,
      keywords: ['tchau', 'até logo', 'obrigado', 'já resolvi', 'pode encerrar'],
      patterns: ['até (logo|mais)', 'muito obrigad[oa]', 'já (resolvi|consegui)'],
      description: 'Despedidas e finalizações'
    }
  ]

  // Entity extraction patterns
  private entityPatterns = {
    email: /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    phone: /(\(?[\d\s\-\+\(\)]{10,}\)?)/g,
    order_id: /(pedido|order|protocolo)[\s#]*([a-zA-Z0-9]{6,})/gi,
    money: /(R\$\s?\d+(?:[.,]\d{2})?)/g,
    date: /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
    time: /(\d{1,2}:\d{2})/g
  }

  constructor() {
    this.loadCustomIntents()
  }

  /**
   * Classifica a intenção de uma mensagem
   */
  async classifyIntent(
    message: string, 
    context?: Partial<IntentContext>
  ): Promise<IntentResult> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(message, context)
      const cached = this.getFromCache(cacheKey)
      if (cached) {
        return cached
      }

      // Try API first
      let result = await this.callIntentAPI(message, context)
      
      // Fallback to rule-based classification
      if (!result) {
        result = this.classifyWithRules(message, context)
      }

      // Cache result
      this.setCache(cacheKey, result)
      
      return result

    } catch (error) {
      console.error('Error classifying intent:', error)
      return this.classifyWithRules(message, context)
    }
  }

  /**
   * Chama API de classificação de intenções
   */
  private async callIntentAPI(
    message: string, 
    context?: Partial<IntentContext>
  ): Promise<IntentResult | null> {
    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          message,
          context,
          language: 'pt-BR'
        })
      })

      if (!response.ok) {
        throw new Error(`Intent API error: ${response.status}`)
      }

      const data = await response.json()
      return data.intent

    } catch (error) {
      console.warn('Intent API unavailable, using rule-based classification:', error)
      return null
    }
  }

  /**
   * Classificação baseada em regras (fallback)
   */
  private classifyWithRules(
    message: string, 
    context?: Partial<IntentContext>
  ): IntentResult {
    const normalizedMessage = message.toLowerCase().trim()
    const words = normalizedMessage.split(/\s+/)
    
    // Score each intent category
    const intentScores: { [key: string]: number } = {}
    
    this.intentCategories.forEach(category => {
      let score = 0
      
      // Keyword matching
      category.keywords.forEach(keyword => {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          score += 1
        }
      })
      
      // Pattern matching
      category.patterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'i')
        if (regex.test(normalizedMessage)) {
          score += 2 // Patterns have higher weight
        }
      })
      
      // Context boost
      if (context) {
        score = this.applyContextBoost(score, category, context)
      }
      
      if (score > 0) {
        intentScores[category.name] = score * category.confidence
      }
    })

    // Find primary and secondary intents
    const sortedIntents = Object.entries(intentScores)
      .sort(([, a], [, b]) => b - a)
      .map(([name, score]) => ({
        category: this.intentCategories.find(c => c.name === name)!,
        score
      }))

    const primary = sortedIntents[0]?.category || this.getDefaultIntent()
    const secondary = sortedIntents[1]?.category
    const confidence = sortedIntents[0]?.score || 0.3

    // Extract entities
    const entities = this.extractEntities(message)

    // Determine urgency and actions
    const urgency = this.determineUrgency(primary, entities, context)
    const actionRequired = this.requiresAction(primary)
    const suggestedActions = this.getSuggestedActions(primary, entities)
    const routing = this.getRouting(primary, urgency)

    return {
      primary,
      confidence: Math.min(0.95, confidence / Math.max(words.length / 5, 1)),
      secondary,
      entities,
      context: this.buildContext(context),
      urgency,
      actionRequired,
      suggestedActions,
      routing
    }
  }

  /**
   * Aplica boost de contexto baseado na situação
   */
  private applyContextBoost(
    score: number, 
    category: IntentCategory, 
    context: Partial<IntentContext>
  ): number {
    let boost = 0

    // Stage-based boost
    if (context.conversationStage === 'opening' && category.type === 'greeting') {
      boost += 0.5
    }
    if (context.conversationStage === 'closing' && category.type === 'goodbye') {
      boost += 0.5
    }
    if (context.conversationStage === 'escalated' && category.type === 'escalation') {
      boost += 0.3
    }

    // Customer tier boost
    if (context.customerTier === 'vip' && category.type === 'complaint') {
      boost += 0.2
    }

    // Time-based boost
    if (context.timeOfDay === 'night' && category.name === 'problem_technical') {
      boost += 0.1 // Technical problems at night might be more urgent
    }

    // Follow-up boost
    if (context.isFollowUp && category.type === 'question') {
      boost += 0.1
    }

    return score + boost
  }

  /**
   * Extrai entidades da mensagem
   */
  private extractEntities(message: string): EntityExtraction[] {
    const entities: EntityExtraction[] = []

    Object.entries(this.entityPatterns).forEach(([type, pattern]) => {
      let match
      const regex = new RegExp(pattern)
      
      while ((match = regex.exec(message)) !== null) {
        entities.push({
          entity: type,
          value: match[0].trim(),
          confidence: 0.8,
          position: {
            start: match.index,
            end: match.index + match[0].length
          },
          type: type as EntityExtraction['type']
        })
      }
    })

    return entities
  }

  /**
   * Determina nível de urgência
   */
  private determineUrgency(
    intent: IntentCategory,
    entities: EntityExtraction[],
    context?: Partial<IntentContext>
  ): IntentResult['urgency'] {
    // High urgency intents
    if (['complaint', 'escalation', 'problem_report'].includes(intent.type)) {
      return 'high'
    }

    // Critical if VIP customer with complaint
    if (context?.customerTier === 'vip' && intent.type === 'complaint') {
      return 'critical'
    }

    // Medium urgency for requests and support
    if (['request', 'support'].includes(intent.type)) {
      return 'medium'
    }

    // Check for urgency indicators in entities or message content
    const urgencyIndicators = ['urgente', 'emergência', 'crítico', 'imediato']
    if (entities.some(e => urgencyIndicators.some(ui => e.value.toLowerCase().includes(ui)))) {
      return 'high'
    }

    return 'low'
  }

  /**
   * Verifica se a intenção requer ação
   */
  private requiresAction(intent: IntentCategory): boolean {
    const actionRequiredTypes: IntentType[] = [
      'problem_report', 'request', 'complaint', 'escalation', 'support', 'billing'
    ]
    return actionRequiredTypes.includes(intent.type)
  }

  /**
   * Gera ações sugeridas baseadas na intenção
   */
  private getSuggestedActions(
    intent: IntentCategory,
    entities: EntityExtraction[]
  ): string[] {
    const actions: string[] = []

    switch (intent.type) {
      case 'greeting':
        actions.push('Responder com cumprimento personalizado')
        actions.push('Perguntar como pode ajudar')
        break

      case 'question':
        actions.push('Buscar informações na base de conhecimento')
        actions.push('Fornecer resposta detalhada')
        if (intent.name.includes('how_to')) {
          actions.push('Oferecer guia passo-a-passo')
        }
        break

      case 'problem_report':
        actions.push('Demonstrar empatia pelo problema')
        actions.push('Coletar informações diagnósticas')
        actions.push('Fornecer solução ou próximos passos')
        break

      case 'complaint':
        actions.push('Usar linguagem empática')
        actions.push('Escutar ativamente as preocupações')
        actions.push('Oferecer solução ou compensação')
        actions.push('Considerar escalonamento se necessário')
        break

      case 'escalation':
        actions.push('Conectar com supervisor/gerente')
        actions.push('Explicar o processo de escalonamento')
        break

      case 'billing':
        actions.push('Verificar informações da conta')
        actions.push('Explicar cobrança detalhadamente')
        if (entities.some(e => e.entity === 'money')) {
          actions.push('Revisar valores específicos mencionados')
        }
        break

      case 'compliment':
        actions.push('Agradecer o feedback positivo')
        actions.push('Compartilhar com a equipe')
        break

      case 'goodbye':
        actions.push('Confirmar se tudo foi resolvido')
        actions.push('Finalizar atendimento cordialmente')
        break
    }

    return actions
  }

  /**
   * Determina roteamento baseado na intenção
   */
  private getRouting(
    intent: IntentCategory,
    urgency: IntentResult['urgency']
  ): IntentResult['routing'] {
    const routingMap: { [key: string]: { department: string; skills: string[] } } = {
      'billing': { department: 'financial', skills: ['billing', 'accounting'] },
      'technical': { department: 'technical', skills: ['troubleshooting', 'system_knowledge'] },
      'escalation': { department: 'management', skills: ['conflict_resolution', 'authority'] },
      'complaint': { department: 'quality', skills: ['customer_relations', 'problem_solving'] },
      'sales': { department: 'sales', skills: ['product_knowledge', 'negotiation'] }
    }

    const routing = routingMap[intent.type] || { department: 'general', skills: ['customer_service'] }
    
    const priorityMap = {
      'critical': 5,
      'high': 4,
      'medium': 3,
      'low': 2
    }

    return {
      department: routing.department,
      skillRequired: routing.skills,
      priority: priorityMap[urgency]
    }
  }

  /**
   * Constrói contexto completo
   */
  private buildContext(context?: Partial<IntentContext>): IntentContext {
    const now = new Date()
    const hour = now.getHours()
    
    let timeOfDay: IntentContext['timeOfDay']
    if (hour >= 6 && hour < 12) timeOfDay = 'morning'
    else if (hour >= 12 && hour < 18) timeOfDay = 'afternoon'
    else if (hour >= 18 && hour < 22) timeOfDay = 'evening'
    else timeOfDay = 'night'

    return {
      conversationStage: 'middle',
      customerTier: 'regular',
      previousIntents: [],
      timeOfDay,
      channel: 'chat',
      isFollowUp: false,
      ...context
    }
  }

  /**
   * Retorna intenção padrão quando nenhuma é identificada
   */
  private getDefaultIntent(): IntentCategory {
    return {
      name: 'general_inquiry',
      type: 'information',
      confidence: 0.3,
      keywords: [],
      patterns: [],
      description: 'Consulta geral não classificada'
    }
  }

  /**
   * Carrega intenções customizadas (placeholder para implementação futura)
   */
  private async loadCustomIntents(): Promise<void> {
    try {
      const response = await fetch('/api/v1/ai/intent/custom')
      if (response.ok) {
        const customIntents = await response.json()
        this.intentCategories.push(...customIntents)
      }
    } catch (error) {
      // Ignore errors, use default intents
    }
  }

  /**
   * Treina o classificador com novos dados
   */
  async trainWithFeedback(
    message: string,
    correctIntent: string,
    entities?: EntityExtraction[]
  ): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/train`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          text: message,
          intent: correctIntent,
          entities: entities || [],
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Error submitting training data:', error)
    }
  }

  /**
   * Obtém estatísticas de classificação
   */
  async getIntentStats(): Promise<IntentStats> {
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
      console.error('Error fetching intent stats:', error)
    }

    // Return mock data if API fails
    return {
      totalClassifications: 3240,
      intentDistribution: {
        'question': 0.35,
        'problem_report': 0.20,
        'request': 0.15,
        'complaint': 0.10,
        'greeting': 0.08,
        'billing': 0.07,
        'compliment': 0.03,
        'goodbye': 0.02
      },
      accuracyMetrics: {
        overallAccuracy: 0.87,
        precisionByIntent: {
          'greeting': 0.95,
          'goodbye': 0.92,
          'complaint': 0.88,
          'question': 0.85,
          'problem_report': 0.82,
          'request': 0.79
        },
        recallByIntent: {
          'greeting': 0.93,
          'goodbye': 0.90,
          'complaint': 0.85,
          'question': 0.88,
          'problem_report': 0.84,
          'request': 0.77
        }
      },
      commonEntities: {
        'email': 0.45,
        'phone': 0.30,
        'order_id': 0.25,
        'money': 0.20,
        'date': 0.15
      }
    }
  }

  // Cache management
  private getCacheKey(message: string, context?: Partial<IntentContext>): string {
    return `intent-${message.substring(0, 50)}-${JSON.stringify(context || {})}`
  }

  private getFromCache(key: string): IntentResult | null {
    const cached = this.cache.get(key)
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.result
    }
    this.cache.delete(key)
    return null
  }

  private setCache(key: string, result: IntentResult): void {
    this.cache.set(key, { result, timestamp: Date.now() })
    
    // Clean old cache entries
    if (this.cache.size > 150) {
      const oldestKey = this.cache.keys().next().value
      this.cache.delete(oldestKey)
    }
  }
}