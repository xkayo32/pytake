/**
 * Sistema de Chatbot Inteligente com Fallback Humano
 * 
 * Chatbot que responde automaticamente quando possível e transfere
 * para agentes humanos quando necessário
 */

import { SentimentAnalyzer, SentimentResult } from './sentiment-analyzer'
import { IntentClassifier, IntentResult } from './intent-classifier'
import { AISuggestionEngine, SuggestionResponse } from './suggestion-engine'

export interface ChatbotMessage {
  id: string
  content: string
  sender: 'bot' | 'user' | 'agent'
  timestamp: Date
  confidence?: number
  metadata?: ChatbotMessageMetadata
}

export interface ChatbotMessageMetadata {
  intent?: IntentResult
  sentiment?: SentimentResult
  suggestions?: SuggestionResponse[]
  requiresHuman?: boolean
  escalationReason?: string
  responseTime?: number
  wasAutomated?: boolean
}

export interface ChatbotResponse {
  message: string
  confidence: number
  shouldTransferToHuman: boolean
  transferReason?: string
  suggestedActions?: string[]
  metadata: {
    intent: IntentResult
    sentiment: SentimentResult
    responseSource: 'automated' | 'template' | 'knowledge_base' | 'ai_generated'
    processingTime: number
  }
}

export interface ChatbotConfig {
  autoResponseThreshold: number // 0-1, minimum confidence to auto-respond
  escalationTriggers: {
    sentimentThreshold: number // negative sentiment threshold
    urgencyLevel: ('high' | 'critical')[]
    intentTypes: string[]
    consecutiveFailures: number
  }
  responseTemplates: ResponseTemplate[]
  knowledgeBase: KnowledgeItem[]
  enableLearning: boolean
  maxResponseTime: number // max time in ms for auto-response
}

export interface ResponseTemplate {
  id: string
  triggers: {
    intents: string[]
    keywords: string[]
    patterns: string[]
  }
  responses: string[]
  conditions?: {
    sentiment?: string[]
    urgency?: string[]
    context?: string[]
  }
  followUpQuestions?: string[]
  escalationRules?: {
    afterAttempts: number
    ifNotResolved: boolean
  }
}

export interface KnowledgeItem {
  id: string
  question: string
  answer: string
  keywords: string[]
  category: string
  confidence: number
  lastUsed?: Date
  successRate: number
}

export interface ChatbotStats {
  totalInteractions: number
  automatedResponses: number
  humanTransfers: number
  averageResponseTime: number
  customerSatisfaction: number
  resolutionRate: number
  topIntents: { intent: string; count: number }[]
  escalationReasons: { reason: string; count: number }[]
}

export interface ConversationContext {
  conversationId: string
  userId: string
  messages: ChatbotMessage[]
  currentTopic?: string
  unresolvedIssues: string[]
  transferredToHuman: boolean
  agentId?: string
  startTime: Date
  lastActivity: Date
}

export class IntelligentChatbot {
  private sentimentAnalyzer: SentimentAnalyzer
  private intentClassifier: IntentClassifier
  private suggestionEngine: AISuggestionEngine
  private apiUrl: string = '/api/v1/ai/chatbot'

  private defaultConfig: ChatbotConfig = {
    autoResponseThreshold: 0.75,
    escalationTriggers: {
      sentimentThreshold: -0.5,
      urgencyLevel: ['high', 'critical'],
      intentTypes: ['complaint', 'escalation', 'problem_report'],
      consecutiveFailures: 2
    },
    responseTemplates: [
      {
        id: 'greeting',
        triggers: {
          intents: ['greeting'],
          keywords: ['oi', 'olá', 'bom dia', 'boa tarde'],
          patterns: ['^(oi|olá)', 'como vai']
        },
        responses: [
          'Olá! Sou o assistente virtual. Como posso ajudar você hoje?',
          'Oi! Em que posso ser útil?',
          'Olá! Estou aqui para ajudar. Qual é sua dúvida?'
        ],
        followUpQuestions: ['Como posso ajudar você hoje?']
      },
      {
        id: 'thanks',
        triggers: {
          intents: ['compliment'],
          keywords: ['obrigado', 'obrigada', 'valeu', 'brigado'],
          patterns: ['muito obrigad[oa]', 'valeu mesmo']
        },
        responses: [
          'De nada! Fico feliz em ajudar! 😊',
          'Foi um prazer ajudar você!',
          'Sempre às ordens! Se precisar de mais alguma coisa, é só chamar.'
        ]
      },
      {
        id: 'password_reset',
        triggers: {
          intents: ['question', 'request'],
          keywords: ['senha', 'password', 'resetar', 'esqueci'],
          patterns: ['esqueci (a|minha) senha', 'resetar senha']
        },
        responses: [
          'Para resetar sua senha: 1) Acesse a tela de login, 2) Clique em "Esqueci minha senha", 3) Digite seu email, 4) Verifique sua caixa de entrada. Se não receber o email em 5 minutos, verifique o spam.'
        ],
        followUpQuestions: [
          'Conseguiu receber o email de redefinição?',
          'Precisa de ajuda com algum passo específico?'
        ]
      }
    ],
    knowledgeBase: [
      {
        id: 'kb1',
        question: 'Como resetar senha?',
        answer: 'Para resetar sua senha, vá em "Esqueci minha senha" na tela de login, digite seu email e siga as instruções enviadas.',
        keywords: ['senha', 'reset', 'esqueci', 'redefinir'],
        category: 'account',
        confidence: 0.9,
        successRate: 0.85
      },
      {
        id: 'kb2',
        question: 'Como cancelar assinatura?',
        answer: 'Você pode cancelar sua assinatura em Configurações > Assinatura > Cancelar. Você manterá acesso até o fim do período pago.',
        keywords: ['cancelar', 'assinatura', 'plano'],
        category: 'billing',
        confidence: 0.85,
        successRate: 0.75
      }
    ],
    enableLearning: true,
    maxResponseTime: 2000
  }

  constructor(private config: ChatbotConfig = this.defaultConfig) {
    this.sentimentAnalyzer = new SentimentAnalyzer()
    this.intentClassifier = new IntentClassifier()
    this.suggestionEngine = new AISuggestionEngine()
  }

  /**
   * Processa uma mensagem do usuário e retorna resposta do chatbot
   */
  async processMessage(
    message: string,
    context: ConversationContext
  ): Promise<ChatbotResponse> {
    const startTime = Date.now()

    try {
      // Análise paralela da mensagem
      const [sentiment, intent] = await Promise.all([
        this.sentimentAnalyzer.analyzeSentiment(message),
        this.intentClassifier.classifyIntent(message, {
          conversationStage: this.getConversationStage(context),
          previousIntents: context.messages
            .filter(m => m.metadata?.intent)
            .map(m => m.metadata!.intent!.primary.name)
            .slice(-3)
        })
      ])

      // Verificar se deve escalar para humano
      const shouldEscalate = this.shouldEscalateToHuman(sentiment, intent, context)
      
      if (shouldEscalate.escalate) {
        return {
          message: shouldEscalate.message,
          confidence: 1.0,
          shouldTransferToHuman: true,
          transferReason: shouldEscalate.reason,
          suggestedActions: ['Conectar com agente humano', 'Explicar situação ao agente'],
          metadata: {
            intent,
            sentiment,
            responseSource: 'automated',
            processingTime: Date.now() - startTime
          }
        }
      }

      // Tentar gerar resposta automática
      const response = await this.generateResponse(message, intent, sentiment, context)
      
      return {
        ...response,
        metadata: {
          ...response.metadata,
          processingTime: Date.now() - startTime
        }
      }

    } catch (error) {
      console.error('Error processing message:', error)
      
      // Fallback em caso de erro
      return {
        message: 'Desculpe, tive um problema técnico. Vou conectar você com um agente humano para ajudar melhor.',
        confidence: 0.0,
        shouldTransferToHuman: true,
        transferReason: 'Erro técnico no sistema',
        suggestedActions: ['Conectar com agente humano'],
        metadata: {
          intent: {} as IntentResult,
          sentiment: {} as SentimentResult,
          responseSource: 'automated',
          processingTime: Date.now() - startTime
        }
      }
    }
  }

  /**
   * Verifica se deve escalar para humano
   */
  private shouldEscalateToHuman(
    sentiment: SentimentResult,
    intent: IntentResult,
    context: ConversationContext
  ): { escalate: boolean; reason: string; message: string } {
    // Sentimento muito negativo
    if (sentiment.score < this.config.escalationTriggers.sentimentThreshold) {
      return {
        escalate: true,
        reason: 'Sentimento muito negativo detectado',
        message: 'Percebo que você está insatisfeito. Vou conectar você com um de nossos especialistas para resolver isso da melhor forma possível.'
      }
    }

    // Urgência crítica
    if (this.config.escalationTriggers.urgencyLevel.includes(intent.urgency)) {
      return {
        escalate: true,
        reason: `Urgência ${intent.urgency} detectada`,
        message: 'Sua solicitação requer atenção prioritária. Vou conectar você imediatamente com um agente especialista.'
      }
    }

    // Tipos de intenção que requerem humano
    if (this.config.escalationTriggers.intentTypes.includes(intent.primary.type)) {
      return {
        escalate: true,
        reason: `Intenção ${intent.primary.type} requer atendimento humano`,
        message: 'Para essa situação, nossos especialistas humanos podem ajudar melhor. Vou conectar você agora.'
      }
    }

    // Múltiplas tentativas sem resolução
    const recentBotMessages = context.messages
      .filter(m => m.sender === 'bot')
      .slice(-this.config.escalationTriggers.consecutiveFailures)
    
    if (recentBotMessages.length >= this.config.escalationTriggers.consecutiveFailures) {
      return {
        escalate: true,
        reason: 'Múltiplas tentativas sem resolução',
        message: 'Vejo que ainda não conseguimos resolver sua questão completamente. Vou conectar você com um agente humano que poderá ajudar melhor.'
      }
    }

    // Solicitação explícita de agente humano
    const requestsHuman = /(?:quero falar com|cadê|onde está).*(atendente|agente|pessoa|humano|gerente|supervisor)/i
    if (requestsHuman.test(context.messages[context.messages.length - 1]?.content || '')) {
      return {
        escalate: true,
        reason: 'Solicitação explícita de agente humano',
        message: 'Claro! Vou conectar você com um de nossos agentes humanos. Um momento, por favor.'
      }
    }

    return { escalate: false, reason: '', message: '' }
  }

  /**
   * Gera resposta automática
   */
  private async generateResponse(
    message: string,
    intent: IntentResult,
    sentiment: SentimentResult,
    context: ConversationContext
  ): Promise<ChatbotResponse> {
    // Tentar template primeiro
    const templateResponse = this.findTemplateResponse(intent, message, sentiment)
    if (templateResponse && templateResponse.confidence >= this.config.autoResponseThreshold) {
      return templateResponse
    }

    // Tentar base de conhecimento
    const kbResponse = this.searchKnowledgeBase(message, intent)
    if (kbResponse && kbResponse.confidence >= this.config.autoResponseThreshold) {
      return kbResponse
    }

    // Tentar IA generativa (API)
    const aiResponse = await this.generateAIResponse(message, intent, sentiment, context)
    if (aiResponse && aiResponse.confidence >= this.config.autoResponseThreshold) {
      return aiResponse
    }

    // Fallback para humano
    return {
      message: 'Sua pergunta é muito específica. Vou conectar você com um especialista que poderá ajudar melhor.',
      confidence: 0.3,
      shouldTransferToHuman: true,
      transferReason: 'Não foi possível gerar resposta automática confiável',
      suggestedActions: ['Conectar com agente especializado'],
      metadata: {
        intent,
        sentiment,
        responseSource: 'automated',
        processingTime: 0
      }
    }
  }

  /**
   * Busca resposta em templates
   */
  private findTemplateResponse(
    intent: IntentResult,
    message: string,
    sentiment: SentimentResult
  ): ChatbotResponse | null {
    const normalizedMessage = message.toLowerCase()

    for (const template of this.config.responseTemplates) {
      let score = 0

      // Verificar intenções
      if (template.triggers.intents.includes(intent.primary.name) ||
          template.triggers.intents.includes(intent.primary.type)) {
        score += 0.4
      }

      // Verificar palavras-chave
      template.triggers.keywords.forEach(keyword => {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          score += 0.2
        }
      })

      // Verificar padrões
      template.triggers.patterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'i')
        if (regex.test(message)) {
          score += 0.4
        }
      })

      // Verificar condições
      if (template.conditions) {
        if (template.conditions.sentiment && 
            !template.conditions.sentiment.includes(sentiment.sentiment)) {
          continue
        }
        if (template.conditions.urgency && 
            !template.conditions.urgency.includes(intent.urgency)) {
          continue
        }
      }

      if (score >= 0.6) {
        const responseText = this.selectRandomResponse(template.responses)
        return {
          message: responseText,
          confidence: Math.min(score, 0.95),
          shouldTransferToHuman: false,
          suggestedActions: template.followUpQuestions,
          metadata: {
            intent,
            sentiment,
            responseSource: 'template',
            processingTime: 0
          }
        }
      }
    }

    return null
  }

  /**
   * Busca na base de conhecimento
   */
  private searchKnowledgeBase(message: string, intent: IntentResult): ChatbotResponse | null {
    const normalizedMessage = message.toLowerCase()
    let bestMatch: KnowledgeItem | null = null
    let bestScore = 0

    for (const item of this.config.knowledgeBase) {
      let score = 0

      // Verificar palavras-chave
      item.keywords.forEach(keyword => {
        if (normalizedMessage.includes(keyword.toLowerCase())) {
          score += 0.3
        }
      })

      // Similaridade com pergunta
      const questionWords = item.question.toLowerCase().split(' ')
      const messageWords = normalizedMessage.split(' ')
      const commonWords = questionWords.filter(word => messageWords.includes(word))
      score += (commonWords.length / questionWords.length) * 0.5

      // Bonus por confiança do item
      score *= item.confidence

      if (score > bestScore && score > 0.6) {
        bestScore = score
        bestMatch = item
      }
    }

    if (bestMatch) {
      return {
        message: bestMatch.answer,
        confidence: Math.min(bestScore, 0.90),
        shouldTransferToHuman: false,
        suggestedActions: ['Isso responde sua dúvida?', 'Precisa de mais informações?'],
        metadata: {
          intent,
          sentiment: {} as SentimentResult,
          responseSource: 'knowledge_base',
          processingTime: 0
        }
      }
    }

    return null
  }

  /**
   * Gera resposta usando IA
   */
  private async generateAIResponse(
    message: string,
    intent: IntentResult,
    sentiment: SentimentResult,
    context: ConversationContext
  ): Promise<ChatbotResponse | null> {
    try {
      const response = await fetch(`${this.apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
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

      if (!response.ok) throw new Error(`API error: ${response.status}`)

      const data = await response.json()
      
      return {
        message: data.response,
        confidence: data.confidence || 0.7,
        shouldTransferToHuman: false,
        suggestedActions: data.followUpQuestions || [],
        metadata: {
          intent,
          sentiment,
          responseSource: 'ai_generated',
          processingTime: 0
        }
      }

    } catch (error) {
      console.error('Error generating AI response:', error)
      return null
    }
  }

  /**
   * Obtém estágio da conversa
   */
  private getConversationStage(context: ConversationContext): 'opening' | 'middle' | 'closing' | 'escalated' {
    if (context.transferredToHuman) return 'escalated'
    if (context.messages.length <= 2) return 'opening'
    
    const lastMessages = context.messages.slice(-3)
    if (lastMessages.some(m => m.content.toLowerCase().includes('tchau') || 
                             m.content.toLowerCase().includes('obrigad'))) {
      return 'closing'
    }
    
    return 'middle'
  }

  /**
   * Seleciona resposta aleatória de um array
   */
  private selectRandomResponse(responses: string[]): string {
    return responses[Math.floor(Math.random() * responses.length)]
  }

  /**
   * Registra feedback sobre resposta do bot
   */
  async recordFeedback(
    messageId: string,
    rating: number,
    wasHelpful: boolean,
    userComment?: string
  ): Promise<void> {
    try {
      await fetch(`${this.apiUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          messageId,
          rating,
          wasHelpful,
          comment: userComment,
          timestamp: new Date().toISOString()
        })
      })
    } catch (error) {
      console.error('Error recording feedback:', error)
    }
  }

  /**
   * Obtém estatísticas do chatbot
   */
  async getStats(): Promise<ChatbotStats> {
    try {
      const response = await fetch(`${this.apiUrl}/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      })

      if (response.ok) {
        return await response.json()
      }
    } catch (error) {
      console.error('Error fetching chatbot stats:', error)
    }

    // Retorna dados mockados se API falhar
    return {
      totalInteractions: 1842,
      automatedResponses: 1398,
      humanTransfers: 444,
      averageResponseTime: 1.2,
      customerSatisfaction: 4.2,
      resolutionRate: 0.76,
      topIntents: [
        { intent: 'question', count: 567 },
        { intent: 'problem_report', count: 423 },
        { intent: 'request', count: 289 },
        { intent: 'greeting', count: 198 },
        { intent: 'billing', count: 156 }
      ],
      escalationReasons: [
        { reason: 'Sentimento muito negativo', count: 134 },
        { reason: 'Problema complexo', count: 98 },
        { reason: 'Solicitação de agente humano', count: 87 },
        { reason: 'Múltiplas tentativas', count: 67 },
        { reason: 'Urgência crítica', count: 58 }
      ]
    }
  }

  /**
   * Atualiza configuração do chatbot
   */
  updateConfig(newConfig: Partial<ChatbotConfig>): void {
    this.config = { ...this.config, ...newConfig }
  }

  /**
   * Adiciona novo template de resposta
   */
  addResponseTemplate(template: ResponseTemplate): void {
    this.config.responseTemplates.push(template)
  }

  /**
   * Adiciona item à base de conhecimento
   */
  addKnowledgeItem(item: KnowledgeItem): void {
    this.config.knowledgeBase.push(item)
  }
}