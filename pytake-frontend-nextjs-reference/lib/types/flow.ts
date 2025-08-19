export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: {
    label: string
    description?: string
    config: Record<string, any>
    icon?: string
    color?: string
  }
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
  data?: {
    condition?: string
    label?: string
  }
}

export interface Flow {
  id: string
  name: string
  description: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  trigger: FlowTrigger
  status: 'active' | 'inactive' | 'draft'
  createdAt: string
  updatedAt: string
  version: number
  apiId?: string
}

export interface FlowTrigger {
  type: 'keyword' | 'schedule' | 'webhook' | 'event'
  config: {
    keywords?: string[]
    schedule?: {
      type: 'daily' | 'weekly' | 'monthly'
      time: string
      days?: number[]
    }
    webhook?: {
      url: string
      method: 'GET' | 'POST'
      headers?: Record<string, string>
    }
    event?: {
      type: string
      conditions?: Record<string, any>
    }
  }
}

export interface NodeType {
  id: string
  name: string
  category: 'trigger' | 'action' | 'condition' | 'data'
  icon: string
  color: string
  description: string
  inputs: number
  outputs: number
  configSchema: {
    [key: string]: {
      type: 'text' | 'textarea' | 'select' | 'number' | 'boolean' | 'json'
      label: string
      placeholder?: string
      options?: Array<{ value: string; label: string }>
      required?: boolean
      validation?: {
        min?: number
        max?: number
        pattern?: string
      }
    }
  }
}

export const NODE_TYPES: NodeType[] = [
  // Triggers
  {
    id: 'trigger-keyword',
    name: 'Palavra-chave',
    category: 'trigger',
    icon: 'MessageCircle',
    color: '#10B981',
    description: 'Inicia o flow quando receber mensagem com palavra-chave específica',
    inputs: 0,
    outputs: 1,
    configSchema: {
      keywords: {
        type: 'textarea',
        label: 'Palavras-chave',
        placeholder: 'oi, olá, bom dia (separar por vírgula)',
        required: true
      },
      caseSensitive: {
        type: 'boolean',
        label: 'Diferenciar maiúsculas/minúsculas'
      }
    }
  },
  {
    id: 'trigger-schedule',
    name: 'Agendamento',
    category: 'trigger',
    icon: 'Clock',
    color: '#8B5CF6',
    description: 'Executa o flow em horário específico',
    inputs: 0,
    outputs: 1,
    configSchema: {
      schedule: {
        type: 'select',
        label: 'Frequência',
        options: [
          { value: 'daily', label: 'Diário' },
          { value: 'weekly', label: 'Semanal' },
          { value: 'monthly', label: 'Mensal' }
        ],
        required: true
      },
      time: {
        type: 'text',
        label: 'Horário',
        placeholder: '09:00',
        required: true
      }
    }
  },

  // Actions
  {
    id: 'action-send-message',
    name: 'Enviar Mensagem',
    category: 'action',
    icon: 'Send',
    color: '#3B82F6',
    description: 'Envia uma mensagem de texto para o usuário',
    inputs: 1,
    outputs: 1,
    configSchema: {
      message: {
        type: 'textarea',
        label: 'Mensagem',
        placeholder: 'Digite sua mensagem aqui...',
        required: true
      },
      delay: {
        type: 'number',
        label: 'Delay (segundos)',
        placeholder: '0'
      }
    }
  },
  {
    id: 'action-wait-response',
    name: 'Aguardar Resposta',
    category: 'action',
    icon: 'Clock',
    color: '#F59E0B',
    description: 'Pausa o flow e aguarda resposta do usuário',
    inputs: 1,
    outputs: 2,
    configSchema: {
      timeout: {
        type: 'number',
        label: 'Timeout (minutos)',
        placeholder: '5',
        required: true
      },
      timeoutMessage: {
        type: 'text',
        label: 'Mensagem de timeout',
        placeholder: 'Tempo esgotado. Tente novamente mais tarde.'
      }
    }
  },
  {
    id: 'action-transfer-human',
    name: 'Transferir Atendente',
    category: 'action',
    icon: 'User',
    color: '#EF4444',
    description: 'Transfere a conversa para um atendente humano',
    inputs: 1,
    outputs: 1,
    configSchema: {
      department: {
        type: 'select',
        label: 'Departamento',
        options: [
          { value: 'sales', label: 'Vendas' },
          { value: 'support', label: 'Suporte' },
          { value: 'billing', label: 'Financeiro' }
        ]
      },
      message: {
        type: 'text',
        label: 'Mensagem para atendente',
        placeholder: 'Cliente transferido do bot'
      }
    }
  },

  // Conditions
  {
    id: 'condition-if',
    name: 'Condição If/Else',
    category: 'condition',
    icon: 'GitBranch',
    color: '#8B5CF6',
    description: 'Direciona o flow baseado em uma condição',
    inputs: 1,
    outputs: 2,
    configSchema: {
      variable: {
        type: 'text',
        label: 'Variável',
        placeholder: '{{user.name}}',
        required: true
      },
      operator: {
        type: 'select',
        label: 'Operador',
        options: [
          { value: 'equals', label: 'Igual a' },
          { value: 'contains', label: 'Contém' },
          { value: 'starts_with', label: 'Inicia com' },
          { value: 'greater_than', label: 'Maior que' },
          { value: 'less_than', label: 'Menor que' }
        ],
        required: true
      },
      value: {
        type: 'text',
        label: 'Valor',
        placeholder: 'valor para comparar',
        required: true
      }
    }
  },
  {
    id: 'condition-time',
    name: 'Condição de Horário',
    category: 'condition',
    icon: 'Clock',
    color: '#6366F1',
    description: 'Verifica se está dentro de um horário específico',
    inputs: 1,
    outputs: 2,
    configSchema: {
      startTime: {
        type: 'text',
        label: 'Horário início',
        placeholder: '09:00',
        required: true
      },
      endTime: {
        type: 'text',
        label: 'Horário fim',
        placeholder: '18:00',
        required: true
      },
      days: {
        type: 'select',
        label: 'Dias da semana',
        options: [
          { value: 'all', label: 'Todos os dias' },
          { value: 'weekdays', label: 'Dias úteis' },
          { value: 'weekends', label: 'Finais de semana' }
        ]
      }
    }
  },

  // Data
  {
    id: 'data-save-variable',
    name: 'Salvar Variável',
    category: 'data',
    icon: 'Database',
    color: '#059669',
    description: 'Salva dados em uma variável para usar posteriormente',
    inputs: 1,
    outputs: 1,
    configSchema: {
      variableName: {
        type: 'text',
        label: 'Nome da variável',
        placeholder: 'user_name',
        required: true
      },
      value: {
        type: 'text',
        label: 'Valor',
        placeholder: '{{last_message}} ou valor fixo',
        required: true
      }
    }
  },
  {
    id: 'data-api-call',
    name: 'Chamar API',
    category: 'data',
    icon: 'Globe',
    color: '#DC2626',
    description: 'Faz uma requisição HTTP para API externa',
    inputs: 1,
    outputs: 2,
    configSchema: {
      url: {
        type: 'text',
        label: 'URL da API',
        placeholder: 'https://api.exemplo.com/endpoint',
        required: true
      },
      method: {
        type: 'select',
        label: 'Método HTTP',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' }
        ],
        required: true
      },
      headers: {
        type: 'json',
        label: 'Headers',
        placeholder: '{"Authorization": "Bearer token"}'
      },
      body: {
        type: 'json',
        label: 'Body (POST/PUT)',
        placeholder: '{"key": "value"}'
      }
    }
  }
]