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
  showWhen?: string // Condição para mostrar o campo (ex: "captureAll:false")
  supportsVariables?: boolean // Campo suporta inserção de variáveis
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
      captureAll: {
        type: 'boolean',
        label: 'Capturar todos os botões',
        defaultValue: true
      },
      selectedButtons: {
        type: 'button_select',
        label: 'Botões para Capturar',
        placeholder: 'Selecione os botões',
        dependsOn: 'templateName',
        showWhen: 'captureAll:false',
        required: false
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

  'trigger_universal': {
    id: 'trigger_universal',
    name: 'Fluxo Universal',
    category: 'trigger',
    icon: 'Zap',
    color: '#10b981',
    description: 'Responde a todas as mensagens quando não há outros fluxos ativos',
    inputs: 0,
    outputs: 1,
    configSchema: {
      expiration_minutes: {
        type: 'number',
        label: 'Tempo de Expiração (minutos)',
        placeholder: '10',
        defaultValue: 10,
        min: 1,
        max: 1440,
        required: false,
        helpText: 'Tempo em minutos que o fluxo permanece ativo para o mesmo contato'
      },
      welcome_template: {
        type: 'template_select',
        label: 'Template de Boas-vindas (fora da janela 24h)',
        placeholder: 'Selecione um template',
        required: false,
        helpText: 'Template enviado quando usuário está fora da janela de 24h'
      },
      priority_note: {
        type: 'info',
        label: 'Prioridade',
        content: 'Este fluxo tem a menor prioridade e só é executado quando nenhum outro fluxo (template, palavra-chave) está ativo.'
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
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Mensagem de boas-vindas',
        required: false
      },
      message: {
        type: 'textarea',
        label: 'Mensagem',
        placeholder: 'Digite sua mensagem aqui...\n\nVocê pode usar variáveis:\n{{nome}}\n{{telefone}}\n{{empresa}}',
        required: true,
        supportsVariables: true
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
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Foto do produto',
        required: false
      },
      imageUrl: {
        type: 'text',
        label: 'URL da Imagem',
        placeholder: 'https://exemplo.com/imagem.jpg',
        required: true
      },
      caption: {
        type: 'textarea',
        label: 'Legenda',
        placeholder: 'Legenda opcional da imagem',
        supportsVariables: true
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
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Template de boas-vindas',
        required: false
      },
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
        placeholder: '{\n  "1": "{{nome}}",\n  "2": "{{empresa}}"\n}',
        supportsVariables: true
      },
      buttons: {
        type: 'json',
        label: 'Configuração de Botões',
        placeholder: '[\n  {\n    "type": "quick_reply",\n    "text": "Sim"\n  },\n  {\n    "type": "quick_reply",\n    "text": "Não"\n  }\n]'
      }
    }
  },
  
  'msg_audio': {
    id: 'msg_audio',
    name: 'Áudio',
    category: 'action',
    icon: 'Mic',
    color: '#3b82f6',
    description: 'Envia uma mensagem de áudio',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Áudio de instruções',
        required: false
      },
      audioUrl: {
        type: 'text',
        label: 'URL do Áudio',
        placeholder: 'https://exemplo.com/audio.mp3',
        required: true
      },
      caption: {
        type: 'textarea',
        label: 'Legenda',
        placeholder: 'Legenda opcional do áudio',
        supportsVariables: true
      },
      uploadFromComputer: {
        type: 'boolean',
        label: 'Upload do computador',
        defaultValue: false
      }
    }
  },
  
  'msg_video': {
    id: 'msg_video',
    name: 'Vídeo',
    category: 'action',
    icon: 'Video',
    color: '#3b82f6',
    description: 'Envia um vídeo com legenda opcional',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Tutorial em vídeo',
        required: false
      },
      videoUrl: {
        type: 'text',
        label: 'URL do Vídeo',
        placeholder: 'https://exemplo.com/video.mp4',
        required: true
      },
      caption: {
        type: 'textarea',
        label: 'Legenda',
        placeholder: 'Legenda opcional do vídeo',
        supportsVariables: true
      },
      uploadFromComputer: {
        type: 'boolean',
        label: 'Upload do computador',
        defaultValue: false
      }
    }
  },
  
  'msg_document': {
    id: 'msg_document',
    name: 'Documento',
    category: 'action',
    icon: 'FileText',
    color: '#3b82f6',
    description: 'Envia um documento (PDF, DOC, etc)',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Contrato PDF',
        required: false
      },
      documentUrl: {
        type: 'text',
        label: 'URL do Documento',
        placeholder: 'https://exemplo.com/documento.pdf',
        required: true
      },
      filename: {
        type: 'text',
        label: 'Nome do arquivo',
        placeholder: 'contrato.pdf',
        required: true
      },
      caption: {
        type: 'textarea',
        label: 'Legenda',
        placeholder: 'Descrição opcional do documento',
        supportsVariables: true
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
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Oferta de negociação',
        required: false
      },
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
  },

  // ========== AI NODES ==========
  'ai_chatgpt': {
    id: 'ai_chatgpt',
    name: 'ChatGPT',
    category: 'ai',
    icon: 'Brain',
    color: '#10b981',
    description: 'Processa texto usando ChatGPT da OpenAI',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Assistente de atendimento',
        required: false
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt do sistema',
        placeholder: 'Você é um assistente de atendimento ao cliente...\n\nVocê pode usar variáveis:\n{{nome}}\n{{mensagem}}\n{{contexto}}',
        required: true,
        supportsVariables: true
      },
      model: {
        type: 'select',
        label: 'Modelo',
        options: [
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' }
        ],
        defaultValue: 'gpt-3.5-turbo',
        required: true
      },
      maxTokens: {
        type: 'number',
        label: 'Máximo de tokens',
        placeholder: '150',
        defaultValue: 150,
        validation: {
          min: 1,
          max: 4000
        }
      },
      temperature: {
        type: 'number',
        label: 'Criatividade (0-1)',
        placeholder: '0.7',
        defaultValue: 0.7,
        validation: {
          min: 0,
          max: 1,
          step: 0.1
        }
      }
    }
  },

  'ai_claude': {
    id: 'ai_claude',
    name: 'Claude',
    category: 'ai',
    icon: 'Sparkles',
    color: '#8b5cf6',
    description: 'Processa texto usando Claude da Anthropic',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Analisador de sentimentos',
        required: false
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt do sistema',
        placeholder: 'Analise o sentimento da mensagem do cliente...\n\nVocê pode usar variáveis:\n{{nome}}\n{{mensagem}}\n{{contexto}}',
        required: true,
        supportsVariables: true
      },
      model: {
        type: 'select',
        label: 'Modelo',
        options: [
          { value: 'claude-3-haiku', label: 'Claude 3 Haiku' },
          { value: 'claude-3-sonnet', label: 'Claude 3 Sonnet' },
          { value: 'claude-3-opus', label: 'Claude 3 Opus' }
        ],
        defaultValue: 'claude-3-haiku',
        required: true
      },
      maxTokens: {
        type: 'number',
        label: 'Máximo de tokens',
        placeholder: '150',
        defaultValue: 150,
        validation: {
          min: 1,
          max: 4000
        }
      }
    }
  },

  'ai_gemini': {
    id: 'ai_gemini',
    name: 'Gemini',
    category: 'ai',
    icon: 'Stars',
    color: '#06b6d4',
    description: 'Processa texto usando Gemini do Google',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Gerador de respostas',
        required: false
      },
      prompt: {
        type: 'textarea',
        label: 'Prompt do sistema',
        placeholder: 'Gere uma resposta apropriada para o cliente...\n\nVocê pode usar variáveis:\n{{nome}}\n{{mensagem}}\n{{contexto}}',
        required: true,
        supportsVariables: true
      },
      model: {
        type: 'select',
        label: 'Modelo',
        options: [
          { value: 'gemini-pro', label: 'Gemini Pro' },
          { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
        ],
        defaultValue: 'gemini-pro',
        required: true
      },
      maxTokens: {
        type: 'number',
        label: 'Máximo de tokens',
        placeholder: '150',
        defaultValue: 150,
        validation: {
          min: 1,
          max: 2000
        }
      }
    }
  },

  // ========== API NODES ==========
  'api_rest': {
    id: 'api_rest',
    name: 'REST API',
    category: 'api',
    icon: 'Globe',
    color: '#0ea5e9',
    description: 'Faz requisições HTTP para APIs REST',
    inputs: 1,
    outputs: 2,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Consultar CEP',
        required: false
      },
      url: {
        type: 'text',
        label: 'URL da API',
        placeholder: 'https://api.exemplo.com/endpoint',
        required: true,
        supportsVariables: true
      },
      method: {
        type: 'select',
        label: 'Método HTTP',
        options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' },
          { value: 'PUT', label: 'PUT' },
          { value: 'DELETE', label: 'DELETE' },
          { value: 'PATCH', label: 'PATCH' }
        ],
        defaultValue: 'GET',
        required: true
      },
      headers: {
        type: 'json',
        label: 'Headers',
        placeholder: '{\n  "Authorization": "Bearer {{token}}",\n  "Content-Type": "application/json"\n}',
        supportsVariables: true
      },
      body: {
        type: 'json',
        label: 'Corpo da requisição',
        placeholder: '{\n  "nome": "{{nome}}",\n  "email": "{{email}}"\n}',
        supportsVariables: true,
        showWhen: 'method:POST,PUT,PATCH'
      },
      timeout: {
        type: 'number',
        label: 'Timeout (segundos)',
        placeholder: '30',
        defaultValue: 30,
        validation: {
          min: 1,
          max: 300
        }
      }
    }
  },

  // ========== LOGIC NODES ==========
  'logic_window_check': {
    id: 'logic_window_check',
    name: 'Verificar Janela 24h',
    category: 'logic',
    icon: 'Clock',
    color: '#0ea5e9',
    description: 'Verifica se existe janela de 24h ativa com o contato',
    inputs: 1,
    outputs: 2,
    outputLabels: ['Com Janela (pode enviar)', 'Sem Janela (precisa template)'],
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Verificar Janela WhatsApp',
        required: false
      },
      fallback_template: {
        type: 'template_select',
        label: 'Template para abrir janela',
        placeholder: 'Selecione um template aprovado',
        required: false,
        helpText: 'Template enviado automaticamente quando não há janela de 24h ativa'
      },
      window_info: {
        type: 'info',
        label: 'Como funciona',
        content: 'WhatsApp permite envio de mensagens diretas apenas dentro de 24h após a última interação do usuário. Fora deste período, é necessário usar templates pré-aprovados pelo Meta.'
      },
      output_info: {
        type: 'info',
        label: 'Saídas',
        content: '👉 Saída 1 (Superior): Janela ativa - pode enviar mensagens diretas\n👉 Saída 2 (Inferior): Sem janela - precisa usar template aprovado'
      }
    }
  },

  'logic_condition': {
    id: 'logic_condition',
    name: 'Condição Se',
    category: 'logic',
    icon: 'GitBranch',
    color: '#a855f7',
    description: 'Executa ações baseadas em condições',
    inputs: 1,
    outputs: 2,
    outputLabels: ['Verdadeiro (Sim)', 'Falso (Não)'],
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Verificar idade',
        required: false
      },
      variable: {
        type: 'text',
        label: 'Variável',
        placeholder: '{{idade}}',
        required: true,
        supportsVariables: true
      },
      operator: {
        type: 'select',
        label: 'Operador',
        options: [
          { value: '==', label: 'Igual a (=)' },
          { value: '!=', label: 'Diferente de (≠)' },
          { value: '>', label: 'Maior que (>)' },
          { value: '<', label: 'Menor que (<)' },
          { value: '>=', label: 'Maior ou igual (≥)' },
          { value: '<=', label: 'Menor ou igual (≤)' },
          { value: 'contains', label: 'Contém' },
          { value: 'not_contains', label: 'Não contém' }
        ],
        required: true,
        defaultValue: '=='
      },
      value: {
        type: 'text',
        label: 'Valor de comparação',
        placeholder: '18',
        required: true,
        supportsVariables: true
      }
    }
  },

  'logic_switch': {
    id: 'logic_switch',
    name: 'Switch Múltiplo',
    category: 'logic',
    icon: 'ToggleLeft',
    color: '#a855f7',
    description: 'Avalia múltiplos casos de uma variável',
    inputs: 1,
    outputs: 4,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Tipo de cliente',
        required: false
      },
      variable: {
        type: 'text',
        label: 'Variável',
        placeholder: '{{tipo_cliente}}',
        required: true,
        supportsVariables: true
      },
      cases: {
        type: 'json',
        label: 'Casos',
        placeholder: '[\n  {"value": "premium", "label": "Cliente Premium"},\n  {"value": "gold", "label": "Cliente Gold"},\n  {"value": "basic", "label": "Cliente Básico"}\n]',
        required: true
      },
      hasDefault: {
        type: 'boolean',
        label: 'Incluir caso padrão',
        defaultValue: true
      }
    }
  },

  // ========== FLOW CONTROL NODES ==========
  'logic_wait': {
    id: 'logic_wait',
    name: 'Aguardar',
    category: 'flow',
    icon: 'Clock',
    color: '#64748b',
    description: 'Adiciona uma pausa no fluxo',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Aguardar resposta',
        required: false
      },
      delay: {
        type: 'number',
        label: 'Tempo de espera (segundos)',
        placeholder: '5',
        required: true,
        defaultValue: 5,
        validation: {
          min: 1,
          max: 3600
        }
      },
      randomize: {
        type: 'boolean',
        label: 'Adicionar aleatoriedade',
        defaultValue: false
      },
      randomRange: {
        type: 'number',
        label: 'Variação aleatória (±segundos)',
        placeholder: '2',
        defaultValue: 2,
        showWhen: 'randomize:true',
        validation: {
          min: 1,
          max: 60
        }
      }
    }
  },

  'flow_goto': {
    id: 'flow_goto',
    name: 'Ir Para Flow',
    category: 'flow',
    icon: 'Navigation',
    color: '#64748b',
    description: 'Redireciona para outro fluxo',
    inputs: 1,
    outputs: 0,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Ir para suporte',
        required: false
      },
      targetFlow: {
        type: 'text',
        label: 'Flow de destino',
        placeholder: 'nome-do-flow',
        required: true
      },
      returnBack: {
        type: 'boolean',
        label: 'Retornar após execução',
        defaultValue: false
      },
      passVariables: {
        type: 'boolean',
        label: 'Passar variáveis atuais',
        defaultValue: true
      }
    }
  },

  'flow_end': {
    id: 'flow_end',
    name: 'Finalizar',
    category: 'flow',
    icon: 'StopCircle',
    color: '#ef4444',
    description: 'Finaliza a execução do fluxo',
    inputs: 1,
    outputs: 0,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Conversa finalizada',
        required: false
      },
      reason: {
        type: 'text',
        label: 'Motivo da finalização',
        placeholder: 'Ex: Problema resolvido',
        required: false
      },
      saveConversation: {
        type: 'boolean',
        label: 'Salvar conversa',
        defaultValue: true
      }
    }
  },

  // ========== MESSAGE NODES ==========
  'msg_location': {
    id: 'msg_location',
    name: 'Localização',
    category: 'message',
    icon: 'MapPin',
    color: '#3b82f6',
    description: 'Envia localização no WhatsApp',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Enviar localização loja',
        required: false
      },
      latitude: {
        type: 'text',
        label: 'Latitude',
        placeholder: '-23.550520',
        required: true,
        supportsVariables: true
      },
      longitude: {
        type: 'text',
        label: 'Longitude',
        placeholder: '-46.633308',
        required: true,
        supportsVariables: true
      },
      name: {
        type: 'text',
        label: 'Nome do local',
        placeholder: 'Loja Principal',
        required: false,
        supportsVariables: true
      },
      address: {
        type: 'text',
        label: 'Endereço',
        placeholder: 'Rua das Flores, 123 - São Paulo, SP',
        required: false,
        supportsVariables: true
      }
    }
  },

  'msg_buttons': {
    id: 'msg_buttons',
    name: 'Botões',
    category: 'message',
    icon: 'MousePointer',
    color: '#3b82f6',
    description: 'Mensagem com botões interativos',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Menu principal',
        required: false
      },
      message: {
        type: 'textarea',
        label: 'Mensagem',
        placeholder: 'Selecione uma opção:',
        required: true,
        supportsVariables: true
      },
      buttons: {
        type: 'json',
        label: 'Botões',
        placeholder: '[\n  {"id": "option1", "text": "Opção 1"},\n  {"id": "option2", "text": "Opção 2"},\n  {"id": "option3", "text": "Opção 3"}\n]',
        required: true
      }
    }
  },

  'msg_list': {
    id: 'msg_list',
    name: 'Lista',
    category: 'message',
    icon: 'List',
    color: '#3b82f6',
    description: 'Lista interativa de opções',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Catálogo de produtos',
        required: false
      },
      message: {
        type: 'textarea',
        label: 'Mensagem',
        placeholder: 'Escolha um produto:',
        required: true,
        supportsVariables: true
      },
      buttonText: {
        type: 'text',
        label: 'Texto do botão',
        placeholder: 'Ver opções',
        required: true
      },
      sections: {
        type: 'json',
        label: 'Seções da lista',
        placeholder: '[\n  {\n    "title": "Produtos",\n    "rows": [\n      {"id": "prod1", "title": "Produto 1", "description": "Descrição do produto 1"},\n      {"id": "prod2", "title": "Produto 2", "description": "Descrição do produto 2"}\n    ]\n  }\n]',
        required: true
      }
    }
  },

  // ========== LOGIC NODES ==========
  'logic_loop': {
    id: 'logic_loop',
    name: 'Loop',
    category: 'logic',
    icon: 'RefreshCw',
    color: '#a855f7',
    description: 'Repete ações para cada item de uma lista',
    inputs: 1,
    outputs: 2,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Para cada cliente',
        required: false
      },
      array: {
        type: 'text',
        label: 'Array/Lista',
        placeholder: '{{clientes}}',
        required: true,
        supportsVariables: true
      },
      itemVariable: {
        type: 'text',
        label: 'Nome da variável do item',
        placeholder: 'cliente_atual',
        required: true
      },
      maxIterations: {
        type: 'number',
        label: 'Máximo de iterações',
        placeholder: '100',
        defaultValue: 100
      }
    }
  },

  'logic_random': {
    id: 'logic_random',
    name: 'Aleatório',
    category: 'logic',
    icon: 'Shuffle',
    color: '#a855f7',
    description: 'Seleciona aleatoriamente uma das saídas',
    inputs: 1,
    outputs: 3,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Resposta aleatória',
        required: false
      },
      option1Weight: {
        type: 'number',
        label: 'Peso da opção 1',
        placeholder: '33',
        defaultValue: 33
      },
      option2Weight: {
        type: 'number',
        label: 'Peso da opção 2',
        placeholder: '33',
        defaultValue: 33
      },
      option3Weight: {
        type: 'number',
        label: 'Peso da opção 3',
        placeholder: '34',
        defaultValue: 34
      }
    }
  },

  // ========== DATABASE NODES ==========
  'db_update': {
    id: 'db_update',
    name: 'Atualizar',
    category: 'database',
    icon: 'Edit',
    color: '#059669',
    description: 'Atualiza registros no banco de dados',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Atualizar status cliente',
        required: false
      },
      table: {
        type: 'text',
        label: 'Tabela',
        placeholder: 'clientes',
        required: true
      },
      data: {
        type: 'json',
        label: 'Dados para atualizar',
        placeholder: '{\n  "status": "ativo",\n  "updated_at": "{{now}}"\n}',
        required: true
      },
      where: {
        type: 'text',
        label: 'Condição WHERE',
        placeholder: 'id = {{cliente.id}}',
        required: true,
        supportsVariables: true
      }
    }
  },

  'db_delete': {
    id: 'db_delete',
    name: 'Deletar',
    category: 'database',
    icon: 'Trash',
    color: '#059669',
    description: 'Remove registros do banco de dados',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Remover cliente inativo',
        required: false
      },
      table: {
        type: 'text',
        label: 'Tabela',
        placeholder: 'clientes',
        required: true
      },
      where: {
        type: 'text',
        label: 'Condição WHERE',
        placeholder: 'id = {{cliente.id}}',
        required: true,
        supportsVariables: true
      },
      confirmDelete: {
        type: 'boolean',
        label: 'Confirmar antes de deletar',
        defaultValue: true
      }
    }
  },

  // ========== DATA NODES ==========
  'data_set': {
    id: 'data_set',
    name: 'Definir Variável',
    category: 'data',
    icon: 'Database',
    color: '#059669',
    description: 'Define o valor de uma variável',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Salvar nome cliente',
        required: false
      },
      variable: {
        type: 'text',
        label: 'Nome da variável',
        placeholder: 'nome_cliente',
        required: true
      },
      value: {
        type: 'text',
        label: 'Valor',
        placeholder: '{{contact.name}}',
        required: true,
        supportsVariables: true
      },
      dataType: {
        type: 'select',
        label: 'Tipo de dado',
        options: [
          { value: 'string', label: 'Texto' },
          { value: 'number', label: 'Número' },
          { value: 'boolean', label: 'Verdadeiro/Falso' },
          { value: 'json', label: 'JSON' }
        ],
        defaultValue: 'string'
      }
    }
  },

  'data_get': {
    id: 'data_get',
    name: 'Obter Variável',
    category: 'data',
    icon: 'Download',
    color: '#059669',
    description: 'Obtém o valor de uma variável',
    inputs: 1,
    outputs: 1,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Carregar dados cliente',
        required: false
      },
      variable: {
        type: 'text',
        label: 'Nome da variável',
        placeholder: 'nome_cliente',
        required: true
      },
      defaultValue: {
        type: 'text',
        label: 'Valor padrão',
        placeholder: 'Valor se variável não existir',
        required: false
      }
    }
  },

  // ========== DATABASE NODES ==========
  'db_query': {
    id: 'db_query',
    name: 'Consulta SQL',
    category: 'database',
    icon: 'Database',
    color: '#059669',
    description: 'Executa uma consulta SQL no banco de dados',
    inputs: 1,
    outputs: 2,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Buscar cliente por CPF',
        required: false
      },
      query: {
        type: 'textarea',
        label: 'Query SQL',
        placeholder: 'SELECT * FROM clientes WHERE cpf = {{cpf}}',
        required: true,
        supportsVariables: true
      },
      database: {
        type: 'select',
        label: 'Banco de dados',
        options: [
          { value: 'main', label: 'Principal' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'logs', label: 'Logs' }
        ],
        defaultValue: 'main',
        required: true
      },
      timeout: {
        type: 'number',
        label: 'Timeout (segundos)',
        placeholder: '30',
        defaultValue: 30,
        validation: {
          min: 1,
          max: 300
        }
      }
    }
  },

  'db_insert': {
    id: 'db_insert',
    name: 'Inserir Dados',
    category: 'database',
    icon: 'Plus',
    color: '#059669',
    description: 'Insere novos registros no banco de dados',
    inputs: 1,
    outputs: 2,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Salvar novo cliente',
        required: false
      },
      table: {
        type: 'text',
        label: 'Tabela',
        placeholder: 'clientes',
        required: true
      },
      data: {
        type: 'json',
        label: 'Dados para inserir',
        placeholder: '{\n  "nome": "{{nome}}",\n  "email": "{{email}}",\n  "telefone": "{{telefone}}"\n}',
        required: true,
        supportsVariables: true
      },
      database: {
        type: 'select',
        label: 'Banco de dados',
        options: [
          { value: 'main', label: 'Principal' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'logs', label: 'Logs' }
        ],
        defaultValue: 'main',
        required: true
      }
    }
  },

  // ========== INTEGRATION NODES ==========
  'int_email': {
    id: 'int_email',
    name: 'Enviar Email',
    category: 'integration',
    icon: 'Mail',
    color: '#ea4335',
    description: 'Envia email via SMTP ou provedor',
    inputs: 1,
    outputs: 2,
    configSchema: {
      customName: {
        type: 'text',
        label: 'Nome do componente',
        placeholder: 'Ex: Notificar por email',
        required: false
      },
      to: {
        type: 'text',
        label: 'Destinatário',
        placeholder: '{{email}}',
        required: true,
        supportsVariables: true
      },
      subject: {
        type: 'text',
        label: 'Assunto',
        placeholder: 'Nova mensagem de {{nome}}',
        required: true,
        supportsVariables: true
      },
      body: {
        type: 'textarea',
        label: 'Corpo do email',
        placeholder: 'Olá,\n\nRecebemos uma nova mensagem:\n{{mensagem}}\n\nAtenciosamente,\nEquipe',
        required: true,
        supportsVariables: true
      },
      provider: {
        type: 'select',
        label: 'Provedor',
        options: [
          { value: 'smtp', label: 'SMTP' },
          { value: 'sendgrid', label: 'SendGrid' },
          { value: 'mailgun', label: 'Mailgun' },
          { value: 'ses', label: 'Amazon SES' }
        ],
        defaultValue: 'smtp',
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