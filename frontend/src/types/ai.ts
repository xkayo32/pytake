export type AIModel = 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'gemini-pro'
export type MessageRole = 'user' | 'assistant' | 'system'
export type SentimentLabel = 'positive' | 'negative' | 'neutral'
export type IntentLabel = 'support' | 'sales' | 'billing' | 'cancellation' | 'complaint' | 'praise' | 'question' | 'other'
export type LanguageCode = 'pt' | 'en' | 'es' | 'fr' | 'de' | 'it' | 'auto'
export type EntityType = 'phone' | 'email' | 'cpf' | 'cnpj' | 'name' | 'date' | 'money' | 'location' | 'url'
export type TemplateCategory = 'welcome' | 'support' | 'sales' | 'billing' | 'marketing' | 'confirmation' | 'reminder'
export type TemplateTone = 'formal' | 'casual' | 'friendly' | 'professional' | 'empathetic' | 'urgent'

export interface AIMessage {
  id: string
  role: MessageRole
  content: string
  timestamp: string
  model?: AIModel
  tokens?: number
  confidence?: number
}

export interface ChatContext {
  conversationId?: string
  contactInfo?: {
    name?: string
    phone?: string
    email?: string
    tags?: string[]
  }
  previousMessages?: {
    content: string
    timestamp: string
    sender: 'user' | 'agent'
  }[]
  businessContext?: {
    companyName?: string
    industry?: string
    commonIssues?: string[]
  }
}

export interface SentimentAnalysis {
  label: SentimentLabel
  score: number // 0-1
  confidence: number // 0-1
  emotions?: {
    joy: number
    anger: number
    fear: number
    sadness: number
    surprise: number
    disgust: number
  }
  keywords?: string[]
  explanation?: string
}

export interface IntentClassification {
  intent: IntentLabel
  confidence: number // 0-1
  subIntent?: string
  parameters?: Record<string, any>
  suggestedActions?: string[]
  priority?: 'low' | 'medium' | 'high' | 'urgent'
}

export interface ConversationSummary {
  conversationId: string
  summary: string
  keyPoints: string[]
  resolution?: string
  sentiment: SentimentLabel
  intents: IntentLabel[]
  outcome: 'resolved' | 'pending' | 'escalated' | 'abandoned'
  duration: number // minutes
  messageCount: number
  participantSatisfaction?: number // 1-5
  tags: string[]
  followUpRequired?: boolean
  followUpReason?: string
}

export interface ResponseSuggestion {
  id: string
  text: string
  confidence: number
  category: 'question' | 'acknowledgment' | 'solution' | 'escalation' | 'closing'
  reasoning?: string
  tone: TemplateTone
  estimatedReadTime?: number // seconds
  containsPersonalInfo?: boolean
  requiresApproval?: boolean
}

export interface TranslationResult {
  originalText: string
  translatedText: string
  sourceLanguage: LanguageCode
  targetLanguage: LanguageCode
  confidence: number
  model: AIModel
  alternativeTranslations?: string[]
}

export interface ExtractedEntity {
  type: EntityType
  value: string
  confidence: number
  startIndex: number
  endIndex: number
  formattedValue?: string
  metadata?: Record<string, any>
}

export interface EntityExtractionResult {
  text: string
  entities: ExtractedEntity[]
  totalEntities: number
  processingTime: number // milliseconds
}

export interface GeneratedTemplate {
  id: string
  name: string
  category: TemplateCategory
  tone: TemplateTone
  content: string
  variables?: string[]
  language: LanguageCode
  confidence: number
  useCase: string
  estimatedEffectiveness?: number // 1-100
  complianceChecks?: {
    lgpd: boolean
    spam: boolean
    offensive: boolean
  }
}

export interface AISettings {
  defaultModel: AIModel
  maxTokens: number
  temperature: number // 0-1
  enableSentimentAnalysis: boolean
  enableIntentClassification: boolean
  enableResponseSuggestions: boolean
  enableAutoTranslation: boolean
  enableConversationSummary: boolean
  autoSummarizeAfterMinutes: number
  sentimentThreshold: number // 0-1
  confidenceThreshold: number // 0-1
  maxSuggestions: number
  allowedLanguages: LanguageCode[]
  customPrompts: CustomPrompt[]
  apiKeys: {
    openai?: string
    anthropic?: string
    google?: string
  }
  costs: {
    monthlyBudget: number
    currentSpent: number
    costPerToken: number
    alertThreshold: number // percentage
  }
}

export interface CustomPrompt {
  id: string
  name: string
  category: 'system' | 'sentiment' | 'intent' | 'response' | 'summary' | 'template'
  prompt: string
  variables?: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
  usage: {
    totalUses: number
    successRate: number
    avgConfidence: number
  }
}

export interface AIAnalysis {
  id: string
  conversationId: string
  messageId?: string
  type: 'sentiment' | 'intent' | 'summary' | 'suggestion' | 'translation' | 'entities'
  result: any // Union of all result types
  model: AIModel
  processingTime: number
  tokens: number
  cost?: number
  confidence: number
  createdAt: string
  feedback?: {
    accurate: boolean
    helpful: boolean
    comment?: string
  }
}

export interface AIUsageStats {
  totalRequests: number
  totalTokens: number
  totalCost: number
  requestsByModel: Record<AIModel, number>
  requestsByType: Record<string, number>
  avgProcessingTime: number
  avgConfidence: number
  successRate: number
  costByDay: { date: string; cost: number }[]
  topFeatures: { feature: string; usage: number }[]
  userSatisfaction: number // 1-5
}

// Mock data
export const MOCK_AI_CONVERSATIONS: AIMessage[][] = [
  [
    {
      id: '1',
      role: 'user',
      content: 'Como posso melhorar o atendimento ao cliente?',
      timestamp: '2024-01-15T10:00:00Z'
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Aqui estão algumas estratégias para melhorar o atendimento ao cliente:\n\n1. **Treinamento da equipe**: Invista em capacitação contínua dos agentes\n2. **Tempo de resposta**: Mantenha tempos de resposta baixos (idealmente < 5 minutos)\n3. **Personalização**: Use o nome do cliente e histórico de interações\n4. **Proatividade**: Antecipe necessidades e ofereça soluções\n5. **Feedback**: Colete e analise avaliações dos clientes\n\nGostaria que eu detalhe algum desses pontos?',
      timestamp: '2024-01-15T10:00:15Z',
      model: 'gpt-4',
      tokens: 142,
      confidence: 0.95
    },
    {
      id: '3',
      role: 'user',
      content: 'Sim, fale mais sobre tempo de resposta',
      timestamp: '2024-01-15T10:01:00Z'
    },
    {
      id: '4',
      role: 'assistant',
      content: 'O tempo de resposta é crucial para a satisfação do cliente. Aqui estão as melhores práticas:\n\n**Metas de tempo:**\n• WhatsApp: 5-15 minutos\n• Email: 2-4 horas\n• Chat: 30-60 segundos\n\n**Como melhorar:**\n• Automação inicial com chatbots\n• Notificações em tempo real para agentes\n• Templates de resposta rápida\n• Escalação automática para supervisores\n• Monitoramento de SLA em tempo real\n\n**Ferramentas úteis:**\n• Métricas de tempo médio de resposta\n• Alertas para tempos elevados\n• Distribuição automática de conversas',
      timestamp: '2024-01-15T10:01:30Z',
      model: 'gpt-4',
      tokens: 156,
      confidence: 0.92
    }
  ]
]

export const MOCK_SENTIMENT_ANALYSES: SentimentAnalysis[] = [
  {
    label: 'positive',
    score: 0.87,
    confidence: 0.94,
    emotions: {
      joy: 0.65,
      anger: 0.02,
      fear: 0.05,
      sadness: 0.08,
      surprise: 0.15,
      disgust: 0.05
    },
    keywords: ['excelente', 'satisfeito', 'recomendo'],
    explanation: 'Cliente demonstra alta satisfação com o atendimento'
  },
  {
    label: 'negative',
    score: 0.78,
    confidence: 0.89,
    emotions: {
      joy: 0.05,
      anger: 0.72,
      fear: 0.08,
      sadness: 0.10,
      surprise: 0.03,
      disgust: 0.02
    },
    keywords: ['frustrado', 'lento', 'problema'],
    explanation: 'Cliente expressa frustração com demora no atendimento'
  },
  {
    label: 'neutral',
    score: 0.52,
    confidence: 0.76,
    emotions: {
      joy: 0.20,
      anger: 0.15,
      fear: 0.10,
      sadness: 0.15,
      surprise: 0.20,
      disgust: 0.20
    },
    keywords: ['informação', 'dúvida', 'consulta'],
    explanation: 'Consulta neutra solicitando informações'
  }
]

export const MOCK_INTENT_CLASSIFICATIONS: IntentClassification[] = [
  {
    intent: 'support',
    confidence: 0.94,
    subIntent: 'technical_issue',
    parameters: {
      issue_type: 'connectivity',
      urgency: 'medium'
    },
    suggestedActions: ['diagnose_connection', 'escalate_technical'],
    priority: 'medium'
  },
  {
    intent: 'billing',
    confidence: 0.91,
    subIntent: 'payment_question',
    parameters: {
      payment_method: 'credit_card',
      amount: 'R$ 99,90'
    },
    suggestedActions: ['check_payment_status', 'provide_invoice'],
    priority: 'high'
  },
  {
    intent: 'cancellation',
    confidence: 0.87,
    subIntent: 'service_cancellation',
    parameters: {
      reason: 'unsatisfied',
      account_type: 'premium'
    },
    suggestedActions: ['retention_offer', 'escalate_manager'],
    priority: 'urgent'
  }
]

export const MOCK_CONVERSATION_SUMMARIES: ConversationSummary[] = [
  {
    conversationId: 'conv-1',
    summary: 'Cliente relatou problema de conexão intermitente. Após diagnóstico remoto, identificamos instabilidade no roteador. Agendamento de visita técnica realizado para amanhã às 14h.',
    keyPoints: [
      'Conexão instável há 3 dias',
      'Problema isolado no roteador',
      'Visita técnica agendada',
      'Cliente VIP - prioridade alta'
    ],
    resolution: 'Visita técnica agendada para substituição do roteador',
    sentiment: 'neutral',
    intents: ['support'],
    outcome: 'pending',
    duration: 15,
    messageCount: 12,
    participantSatisfaction: 4,
    tags: ['technical', 'router', 'vip'],
    followUpRequired: true,
    followUpReason: 'Confirmar resolução após visita técnica'
  },
  {
    conversationId: 'conv-2',
    summary: 'Cliente questionou cobrança duplicada na fatura. Após verificação, confirmamos erro no sistema. Estorno processado e fatura corrigida enviada por email.',
    keyPoints: [
      'Cobrança duplicada identificada',
      'Erro no sistema de faturamento',
      'Estorno de R$ 45,90 processado',
      'Fatura corrigida enviada'
    ],
    resolution: 'Estorno processado e fatura corrigida',
    sentiment: 'positive',
    intents: ['billing'],
    outcome: 'resolved',
    duration: 8,
    messageCount: 6,
    participantSatisfaction: 5,
    tags: ['billing', 'refund', 'system-error'],
    followUpRequired: false
  }
]

export const MOCK_RESPONSE_SUGGESTIONS: ResponseSuggestion[] = [
  {
    id: '1',
    text: 'Entendo sua frustração. Vou verificar imediatamente o status da sua conexão e providenciar uma solução rápida.',
    confidence: 0.92,
    category: 'acknowledgment',
    reasoning: 'Cliente demonstra frustração, necessária empatia e ação imediata',
    tone: 'empathetic',
    estimatedReadTime: 5,
    containsPersonalInfo: false,
    requiresApproval: false
  },
  {
    id: '2',
    text: 'Para resolver isso rapidamente, posso agendar uma visita técnica para hoje à tarde. Que horário seria melhor para você?',
    confidence: 0.89,
    category: 'solution',
    reasoning: 'Problema técnico requer visita presencial, oferecer agendamento',
    tone: 'professional',
    estimatedReadTime: 4,
    containsPersonalInfo: false,
    requiresApproval: false
  },
  {
    id: '3',
    text: 'Vou transferir seu atendimento para nossa equipe especializada em soluções empresariais, que poderá auxiliá-lo melhor.',
    confidence: 0.85,
    category: 'escalation',
    reasoning: 'Demanda complexa requer escalação para especialista',
    tone: 'professional',
    estimatedReadTime: 6,
    containsPersonalInfo: false,
    requiresApproval: true
  }
]

export const MOCK_GENERATED_TEMPLATES: GeneratedTemplate[] = [
  {
    id: '1',
    name: 'Boas-vindas Personalizada',
    category: 'welcome',
    tone: 'friendly',
    content: 'Olá {{nome}}! 👋\n\nSeja muito bem-vindo(a) à {{empresa}}! Estamos felizes em tê-lo(a) conosco.\n\nEu sou {{agente}}, seu consultor pessoal. Estou aqui para ajudar com qualquer dúvida sobre nossos serviços.\n\nComo posso ajudá-lo(a) hoje?',
    variables: ['{{nome}}', '{{empresa}}', '{{agente}}'],
    language: 'pt',
    confidence: 0.94,
    useCase: 'Primeira interação com novos clientes',
    estimatedEffectiveness: 87,
    complianceChecks: {
      lgpd: true,
      spam: true,
      offensive: true
    }
  },
  {
    id: '2',
    name: 'Confirmação de Agendamento',
    category: 'confirmation',
    tone: 'professional',
    content: 'Agendamento confirmado! ✅\n\n📅 **Data:** {{data}}\n🕐 **Horário:** {{horario}}\n📍 **Local:** {{endereco}}\n👤 **Técnico:** {{tecnico}}\n\nVocê receberá um lembrete 1 hora antes.\n\nPrecisa reagendar? É só me avisar!',
    variables: ['{{data}}', '{{horario}}', '{{endereco}}', '{{tecnico}}'],
    language: 'pt',
    confidence: 0.91,
    useCase: 'Confirmação de visitas técnicas',
    estimatedEffectiveness: 92,
    complianceChecks: {
      lgpd: true,
      spam: true,
      offensive: true
    }
  },
  {
    id: '3',
    name: 'Resolução de Problema',
    category: 'support',
    tone: 'empathetic',
    content: 'Problema resolvido! 🎉\n\nOlá {{nome}}, tenho uma ótima notícia!\n\nSeu problema com {{issue}} foi solucionado. Nossa equipe técnica implementou a correção e tudo deve estar funcionando normalmente agora.\n\n**Próximos passos:**\n1. Teste o serviço\n2. Confirme se está tudo OK\n3. Entre em contato se precisar de mais alguma coisa\n\nSua satisfação é nossa prioridade! 😊',
    variables: ['{{nome}}', '{{issue}}'],
    language: 'pt',
    confidence: 0.88,
    useCase: 'Comunicação de resolução de problemas',
    estimatedEffectiveness: 89,
    complianceChecks: {
      lgpd: true,
      spam: true,
      offensive: true
    }
  }
]

export const MOCK_AI_SETTINGS: AISettings = {
  defaultModel: 'gpt-4',
  maxTokens: 2000,
  temperature: 0.7,
  enableSentimentAnalysis: true,
  enableIntentClassification: true,
  enableResponseSuggestions: true,
  enableAutoTranslation: false,
  enableConversationSummary: true,
  autoSummarizeAfterMinutes: 30,
  sentimentThreshold: 0.7,
  confidenceThreshold: 0.8,
  maxSuggestions: 3,
  allowedLanguages: ['pt', 'en', 'es'],
  customPrompts: [
    {
      id: '1',
      name: 'Análise de Sentimento Personalizada',
      category: 'sentiment',
      prompt: 'Analise o sentimento da seguinte mensagem considerando o contexto de atendimento ao cliente brasileiro: {{message}}',
      variables: ['{{message}}'],
      isActive: true,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
      usage: {
        totalUses: 1250,
        successRate: 0.94,
        avgConfidence: 0.87
      }
    }
  ],
  apiKeys: {
    openai: 'sk-...configured',
    anthropic: 'sk-...configured'
  },
  costs: {
    monthlyBudget: 500.00,
    currentSpent: 187.45,
    costPerToken: 0.000015,
    alertThreshold: 80
  }
}

export const MOCK_AI_USAGE_STATS: AIUsageStats = {
  totalRequests: 15420,
  totalTokens: 2847593,
  totalCost: 187.45,
  requestsByModel: {
    'gpt-4': 8932,
    'gpt-3.5-turbo': 5234,
    'claude-3': 1123,
    'gemini-pro': 131
  },
  requestsByType: {
    'sentiment': 5823,
    'intent': 3542,
    'suggestions': 2987,
    'summary': 1876,
    'translation': 1192
  },
  avgProcessingTime: 1847, // milliseconds
  avgConfidence: 0.89,
  successRate: 0.96,
  costByDay: [
    { date: '2024-01-01', cost: 12.34 },
    { date: '2024-01-02', cost: 15.67 },
    { date: '2024-01-03', cost: 9.82 },
    { date: '2024-01-04', cost: 18.45 },
    { date: '2024-01-05', cost: 14.23 },
    { date: '2024-01-06', cost: 11.76 },
    { date: '2024-01-07', cost: 16.89 }
  ],
  topFeatures: [
    { feature: 'Análise de Sentimento', usage: 5823 },
    { feature: 'Classificação de Intenção', usage: 3542 },
    { feature: 'Sugestões de Resposta', usage: 2987 },
    { feature: 'Resumo de Conversas', usage: 1876 },
    { feature: 'Tradução', usage: 1192 }
  ],
  userSatisfaction: 4.3
}