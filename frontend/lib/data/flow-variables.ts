// Variáveis disponíveis no Flow Builder
export interface FlowVariable {
  id: string
  name: string
  description: string
  category: string
  example: string
  icon?: string
}

export const VARIABLE_CATEGORIES = {
  CONTACT: 'Contato',
  CONVERSATION: 'Conversa',
  SYSTEM: 'Sistema',
  CUSTOM: 'Personalizado',
  ERP: 'ERP',
  AI: 'IA'
} as const

export const FLOW_VARIABLES: FlowVariable[] = [
  // ========== CONTATO ==========
  {
    id: 'contact.name',
    name: 'Nome do Contato',
    description: 'Nome completo do contato',
    category: VARIABLE_CATEGORIES.CONTACT,
    example: 'João Silva',
    icon: '👤'
  },
  {
    id: 'contact.first_name',
    name: 'Primeiro Nome',
    description: 'Primeiro nome do contato',
    category: VARIABLE_CATEGORIES.CONTACT,
    example: 'João',
    icon: '👤'
  },
  {
    id: 'contact.phone',
    name: 'Telefone',
    description: 'Número de telefone do contato',
    category: VARIABLE_CATEGORIES.CONTACT,
    example: '+5511999999999',
    icon: '📱'
  },
  {
    id: 'contact.email',
    name: 'E-mail',
    description: 'E-mail do contato',
    category: VARIABLE_CATEGORIES.CONTACT,
    example: 'joao@exemplo.com',
    icon: '📧'
  },
  {
    id: 'contact.city',
    name: 'Cidade',
    description: 'Cidade do contato',
    category: VARIABLE_CATEGORIES.CONTACT,
    example: 'São Paulo',
    icon: '🏙️'
  },
  {
    id: 'contact.tags',
    name: 'Tags',
    description: 'Tags associadas ao contato',
    category: VARIABLE_CATEGORIES.CONTACT,
    example: 'VIP, Cliente',
    icon: '🏷️'
  },
  {
    id: 'contact.custom_field',
    name: 'Campo Personalizado',
    description: 'Campos personalizados do contato',
    category: VARIABLE_CATEGORIES.CONTACT,
    example: 'contact.custom.cpf',
    icon: '📝'
  },

  // ========== CONVERSA ==========
  {
    id: 'message.text',
    name: 'Última Mensagem',
    description: 'Texto da última mensagem recebida',
    category: VARIABLE_CATEGORIES.CONVERSATION,
    example: 'Olá, preciso de ajuda',
    icon: '💬'
  },
  {
    id: 'message.type',
    name: 'Tipo de Mensagem',
    description: 'Tipo da última mensagem (text, image, audio, etc)',
    category: VARIABLE_CATEGORIES.CONVERSATION,
    example: 'text',
    icon: '📋'
  },
  {
    id: 'conversation.id',
    name: 'ID da Conversa',
    description: 'Identificador único da conversa',
    category: VARIABLE_CATEGORIES.CONVERSATION,
    example: 'conv_123456',
    icon: '🔑'
  },
  {
    id: 'conversation.stage',
    name: 'Etapa da Conversa',
    description: 'Etapa atual no funil',
    category: VARIABLE_CATEGORIES.CONVERSATION,
    example: 'Negociação',
    icon: '📊'
  },
  {
    id: 'conversation.attendant',
    name: 'Atendente',
    description: 'Nome do atendente responsável',
    category: VARIABLE_CATEGORIES.CONVERSATION,
    example: 'Maria Santos',
    icon: '👩‍💼'
  },
  {
    id: 'conversation.wait_time',
    name: 'Tempo de Espera',
    description: 'Tempo desde a última interação',
    category: VARIABLE_CATEGORIES.CONVERSATION,
    example: '5 minutos',
    icon: '⏱️'
  },

  // ========== SISTEMA ==========
  {
    id: 'system.date',
    name: 'Data Atual',
    description: 'Data de hoje',
    category: VARIABLE_CATEGORIES.SYSTEM,
    example: '16/08/2025',
    icon: '📅'
  },
  {
    id: 'system.time',
    name: 'Hora Atual',
    description: 'Horário atual',
    category: VARIABLE_CATEGORIES.SYSTEM,
    example: '14:30',
    icon: '🕐'
  },
  {
    id: 'system.day_of_week',
    name: 'Dia da Semana',
    description: 'Dia da semana atual',
    category: VARIABLE_CATEGORIES.SYSTEM,
    example: 'Segunda-feira',
    icon: '📆'
  },
  {
    id: 'system.company_name',
    name: 'Nome da Empresa',
    description: 'Nome da sua empresa',
    category: VARIABLE_CATEGORIES.SYSTEM,
    example: 'PyTake Solutions',
    icon: '🏢'
  },
  {
    id: 'system.branch',
    name: 'Filial',
    description: 'Filial ou unidade atual',
    category: VARIABLE_CATEGORIES.SYSTEM,
    example: 'Matriz SP',
    icon: '🏪'
  },
  {
    id: 'system.random',
    name: 'Número Aleatório',
    description: 'Gera um número aleatório',
    category: VARIABLE_CATEGORIES.SYSTEM,
    example: '42',
    icon: '🎲'
  },

  // ========== ERP ==========
  {
    id: 'erp.customer.balance',
    name: 'Saldo do Cliente',
    description: 'Saldo devedor no ERP',
    category: VARIABLE_CATEGORIES.ERP,
    example: 'R$ 1.500,00',
    icon: '💰'
  },
  {
    id: 'erp.customer.due_date',
    name: 'Data de Vencimento',
    description: 'Próximo vencimento',
    category: VARIABLE_CATEGORIES.ERP,
    example: '20/08/2025',
    icon: '📆'
  },
  {
    id: 'erp.customer.plan',
    name: 'Plano do Cliente',
    description: 'Plano contratado',
    category: VARIABLE_CATEGORIES.ERP,
    example: 'Premium 100MB',
    icon: '📦'
  },
  {
    id: 'erp.invoice.number',
    name: 'Número da Fatura',
    description: 'Número da última fatura',
    category: VARIABLE_CATEGORIES.ERP,
    example: 'FAT-2025-001234',
    icon: '🧾'
  },
  {
    id: 'erp.invoice.link',
    name: 'Link da Fatura',
    description: 'Link para visualizar fatura',
    category: VARIABLE_CATEGORIES.ERP,
    example: 'https://erp.com/fatura/123',
    icon: '🔗'
  },
  {
    id: 'erp.pix.code',
    name: 'Código PIX',
    description: 'Código PIX para pagamento',
    category: VARIABLE_CATEGORIES.ERP,
    example: '00020126330014BR.GOV...',
    icon: '📱'
  },

  // ========== IA ==========
  {
    id: 'ai.sentiment',
    name: 'Sentimento',
    description: 'Análise de sentimento da mensagem',
    category: VARIABLE_CATEGORIES.AI,
    example: 'Positivo',
    icon: '🎭'
  },
  {
    id: 'ai.intent',
    name: 'Intenção',
    description: 'Intenção detectada na mensagem',
    category: VARIABLE_CATEGORIES.AI,
    example: 'Suporte Técnico',
    icon: '🎯'
  },
  {
    id: 'ai.summary',
    name: 'Resumo da Conversa',
    description: 'Resumo automático da conversa',
    category: VARIABLE_CATEGORIES.AI,
    example: 'Cliente solicitando segunda via',
    icon: '📝'
  },
  {
    id: 'ai.suggested_response',
    name: 'Resposta Sugerida',
    description: 'Resposta sugerida pela IA',
    category: VARIABLE_CATEGORIES.AI,
    example: 'Claro! Vou gerar sua segunda via...',
    icon: '🤖'
  }
]

// Função para buscar variáveis
export function searchVariables(query: string): FlowVariable[] {
  if (!query) return FLOW_VARIABLES
  
  const lowerQuery = query.toLowerCase()
  return FLOW_VARIABLES.filter(
    v => v.name.toLowerCase().includes(lowerQuery) ||
         v.id.toLowerCase().includes(lowerQuery) ||
         v.description.toLowerCase().includes(lowerQuery)
  )
}

// Função para obter variáveis por categoria
export function getVariablesByCategory(category: string): FlowVariable[] {
  return FLOW_VARIABLES.filter(v => v.category === category)
}

// Função para formatar variável para inserção
export function formatVariable(variableId: string): string {
  return `{{${variableId}}}`
}

// Função para extrair variáveis de um texto
export function extractVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g
  const matches = []
  let match
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1])
  }
  
  return matches
}

// Função para substituir variáveis com valores de exemplo
export function replaceWithExamples(text: string): string {
  let result = text
  
  FLOW_VARIABLES.forEach(variable => {
    const pattern = new RegExp(`\\{\\{${variable.id}\\}\\}`, 'g')
    result = result.replace(pattern, variable.example)
  })
  
  return result
}