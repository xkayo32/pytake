// Definição de schemas para cada tipo de nó do Flow Builder
// Este arquivo centraliza todas as configurações e schemas de propriedades

export interface NodeSchema {
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean' | 'json' | 'array' | 'template_select' | 'button_select'
  label: string
  placeholder?: string
  options?: Array<{ value: string; label: string }>
  required?: boolean
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
  }
  dependsOn?: string // Campo que depende de outro campo
}

export interface NodeConfig {
  id: string
  name: string
  category: string
  icon: string
  color: string
  description: string
  inputs: number
  outputs: number
  configSchema: Record<string, NodeSchema>
}

// Schema completo para todos os tipos de nós
export const NODE_CONFIGS: Record<string, NodeConfig> = {
  // ========== TRIGGERS ==========
  'trigger_keyword': {
    id: 'trigger_keyword',
    name: 'Palavra-chave',
    category: 'trigger',
    icon: 'MessageCircle',
    color: '#22c55e',
    description: 'Inicia o flow quando receber mensagem com palavra-chave',
    inputs: 0,
    outputs: 1,
    configSchema: {
      keywords: {
        type: 'textarea',
        label: 'Palavras-chave',
        placeholder: 'Digite as palavras-chave, uma por linha\nExemplo:\noi\nolá\nbom dia',
        required: true
      },
      caseSensitive: {
        type: 'boolean',
        label: 'Diferenciar maiúsculas/minúsculas',
        defaultValue: false
      },
      exactMatch: {
        type: 'boolean',
        label: 'Correspondência exata',
        defaultValue: false
      }
    }
  },
  
  'trigger_webhook': {
    id: 'trigger_webhook',
    name: 'Webhook',
    category: 'trigger',
    icon: 'Globe',
    color: '#22c55e',
    description: 'Inicia o flow quando receber requisição HTTP',
    inputs: 0,
    outputs: 1,
    configSchema: {
      webhookUrl: {
        type: 'text',
        label: 'URL do Webhook',
        placeholder: 'https://api.pytake.net/webhook/...',
        required: true
      },
      method: {
        type: 'select',
        label: 'Método HTTP',
        options: [
          { value: 'POST', label: 'POST' },
          { value: 'GET', label: 'GET' },
          { value: 'PUT', label: 'PUT' }
        ],
        defaultValue: 'POST',
        required: true
      },
      authentication: {
        type: 'select',
        label: 'Autenticação',
        options: [
          { value: 'none', label: 'Nenhuma' },
          { value: 'bearer', label: 'Bearer Token' },
          { value: 'api_key', label: 'API Key' }
        ],
        defaultValue: 'none'
      },
      token: {
        type: 'text',
        label: 'Token/API Key',
        placeholder: 'Digite o token se necessário'
      }
    }
  },
  
  'trigger_schedule': {
    id: 'trigger_schedule',
    name: 'Agendamento',
    category: 'trigger',
    icon: 'Clock',
    color: '#22c55e',
    description: 'Executa o flow em horários específicos',
    inputs: 0,
    outputs: 1,
    configSchema: {
      frequency: {
        type: 'select',
        label: 'Frequência',
        options: [
          { value: 'once', label: 'Uma vez' },
          { value: 'daily', label: 'Diariamente' },
          { value: 'weekly', label: 'Semanalmente' },
          { value: 'monthly', label: 'Mensalmente' },
          { value: 'custom', label: 'Personalizado (CRON)' }
        ],
        required: true,
        defaultValue: 'daily'
      },
      time: {
        type: 'text',
        label: 'Horário',
        placeholder: '09:00',
        required: true
      },
      timezone: {
        type: 'select',
        label: 'Fuso horário',
        options: [
          { value: 'America/Sao_Paulo', label: 'Brasília (UTC-3)' },
          { value: 'America/Manaus', label: 'Manaus (UTC-4)' },
          { value: 'America/Fortaleza', label: 'Fortaleza (UTC-3)' }
        ],
        defaultValue: 'America/Sao_Paulo'
      },
      daysOfWeek: {
        type: 'array',
        label: 'Dias da semana',
        placeholder: 'Selecione os dias'
      },
      cronExpression: {
        type: 'text',
        label: 'Expressão CRON',
        placeholder: '0 9 * * 1-5'
      }
    }
  },
  
  'trigger_template_button': {
    id: 'trigger_template_button',
    name: 'Botão Template',
    category: 'trigger',
    icon: 'MousePointer',
    color: '#22c55e',
    description: 'Responde a cliques em botões de templates',
    inputs: 0,
    outputs: 1, // Será dinâmico baseado nos botões
    configSchema: {
      templateName: {
        type: 'template_select',
        label: 'Template WhatsApp',
        placeholder: 'Selecione um template',
        required: true
      },
      selectedButtons: {
        type: 'button_select',
        label: 'Botões para Capturar',
        placeholder: 'Selecione os botões',
        dependsOn: 'templateName',
        required: false
      },
      captureAll: {
        type: 'boolean',
        label: 'Capturar todos os botões',
        defaultValue: true
      }
    }
  },
  
  'trigger_qrcode': {
    id: 'trigger_qrcode',
    name: 'QR Code Scan',
    category: 'trigger',
    icon: 'QrCode',
    color: '#22c55e',
    description: 'Ativado quando um QR Code é escaneado',
    inputs: 0,
    outputs: 1,
    configSchema: {
      qrCodeType: {
        type: 'select',
        label: 'Tipo de QR Code',
        options: [
          { value: 'payment', label: 'Pagamento PIX' },
          { value: 'login', label: 'Login WhatsApp' },
          { value: 'custom', label: 'Personalizado' }
        ],
        required: true
      },
      validationPattern: {
        type: 'text',
        label: 'Padrão de Validação',
        placeholder: 'Regex para validar o conteúdo'
      }
    }
  },
  
  // ========== MESSAGES ==========
  'msg_text': {
    id: 'msg_text',
    name: 'Mensagem de Texto',
    category: 'action',
    icon: 'MessageSquare',
    color: '#3b82f6',
    description: 'Envia uma mensagem de texto simples',
    inputs: 1,
    outputs: 1,
    configSchema: {
      message: {
        type: 'textarea',
        label: 'Mensagem',
        placeholder: 'Digite sua mensagem aqui...\n\nVocê pode usar variáveis:\n{{nome}}\n{{telefone}}\n{{empresa}}',
        required: true
      },
      typingDelay: {
        type: 'number',
        label: 'Delay de digitação (segundos)',
        placeholder: '2',
        defaultValue: 0,
        validation: {
          min: 0,
          max: 10
        }
      },
      parseMode: {
        type: 'select',
        label: 'Formatação',
        options: [
          { value: 'plain', label: 'Texto simples' },
          { value: 'markdown', label: 'Markdown' },
          { value: 'html', label: 'HTML' }
        ],
        defaultValue: 'plain'
      }
    }
  },
  
  'msg_image': {
    id: 'msg_image',
    name: 'Imagem',
    category: 'action',
    icon: 'Image',
    color: '#3b82f6',
    description: 'Envia uma imagem com legenda opcional',
    inputs: 1,
    outputs: 1,
    configSchema: {
      imageUrl: {
        type: 'text',
        label: 'URL da Imagem',
        placeholder: 'https://exemplo.com/imagem.jpg',
        required: true
      },
      caption: {
        type: 'textarea',
        label: 'Legenda',
        placeholder: 'Legenda opcional da imagem'
      },
      uploadFromComputer: {
        type: 'boolean',
        label: 'Upload do computador',
        defaultValue: false
      }
    }
  },
  
  'msg_template': {
    id: 'msg_template',
    name: 'Template WhatsApp',
    category: 'action',
    icon: 'FileText',
    color: '#3b82f6',
    description: 'Envia um template aprovado do WhatsApp',
    inputs: 1,
    outputs: 2,
    configSchema: {
      templateName: {
        type: 'text',
        label: 'Nome do Template',
        placeholder: 'welcome_message',
        required: true
      },
      language: {
        type: 'select',
        label: 'Idioma',
        options: [
          { value: 'pt_BR', label: 'Português (BR)' },
          { value: 'en_US', label: 'English (US)' },
          { value: 'es', label: 'Español' }
        ],
        defaultValue: 'pt_BR',
        required: true
      },
      variables: {
        type: 'json',
        label: 'Variáveis do Template',
        placeholder: '{\n  "1": "{{nome}}",\n  "2": "{{empresa}}"\n}'
      },
      buttons: {
        type: 'json',
        label: 'Configuração de Botões',
        placeholder: '[\n  {\n    "type": "quick_reply",\n    "text": "Sim"\n  },\n  {\n    "type": "quick_reply",\n    "text": "Não"\n  }\n]'
      }
    }
  },
  
  'msg_negotiation_template': {
    id: 'msg_negotiation_template',
    name: 'Template de Negociação',
    category: 'action',
    icon: 'CreditCard',
    color: '#f59e0b',
    description: 'Template especializado para negociação de dívidas',
    inputs: 1,
    outputs: 3,
    configSchema: {
      customerName: {
        type: 'text',
        label: 'Nome do Cliente',
        placeholder: '{{contact.name}}',
        required: true
      },
      debtAmount: {
        type: 'number',
        label: 'Valor da Dívida',
        placeholder: '500.00',
        required: true
      },
      dueDate: {
        type: 'text',
        label: 'Data de Vencimento',
        placeholder: '{{debt.due_date}}',
        required: true
      },
      discountOptions: {
        type: 'json',
        label: 'Opções de Desconto',
        placeholder: '[\n  { "percentage": 50, "label": "À vista" },\n  { "percentage": 30, "label": "2x" },\n  { "percentage": 20, "label": "3x" }\n]',
        required: true
      },
      pixKey: {
        type: 'text',
        label: 'Chave PIX',
        placeholder: 'empresa@exemplo.com',
        required: true
      }
    }
  }
}

// Função helper para obter schema por ID
export function getNodeConfig(nodeId: string): NodeConfig | undefined {
  return NODE_CONFIGS[nodeId]
}

// Função para validar configuração de um nó
export function validateNodeConfig(nodeId: string, config: any): { isValid: boolean; errors: string[] } {
  const nodeConfig = NODE_CONFIGS[nodeId]
  if (!nodeConfig) {
    return { isValid: false, errors: ['Tipo de nó não encontrado'] }
  }
  
  const errors: string[] = []
  
  Object.entries(nodeConfig.configSchema).forEach(([key, schema]) => {
    const value = config[key]
    
    // Verificar campos obrigatórios
    if (schema.required && (!value || value === '')) {
      errors.push(`${schema.label} é obrigatório`)
    }
    
    // Validar tipos
    if (value !== undefined && value !== '') {
      if (schema.type === 'number' && isNaN(Number(value))) {
        errors.push(`${schema.label} deve ser um número`)
      }
      
      if (schema.validation) {
        if (schema.type === 'number') {
          const numValue = Number(value)
          if (schema.validation.min !== undefined && numValue < schema.validation.min) {
            errors.push(`${schema.label} deve ser maior que ${schema.validation.min}`)
          }
          if (schema.validation.max !== undefined && numValue > schema.validation.max) {
            errors.push(`${schema.label} deve ser menor que ${schema.validation.max}`)
          }
        }
        
        if (schema.validation.pattern) {
          const regex = new RegExp(schema.validation.pattern)
          if (!regex.test(value)) {
            errors.push(`${schema.label} tem formato inválido`)
          }
        }
      }
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
}