export interface NodeType {
  id: string
  category: string
  name: string
  icon: string
  color: string
  inputs?: string[]
  outputs?: string[]
  properties?: Record<string, any>
}

export const NODE_CATEGORIES = {
  TRIGGER: 'trigger',
  MESSAGE: 'message',
  AI: 'ai',
  API: 'api',
  DATABASE: 'database',
  STORAGE: 'storage',
  LOGIC: 'logic',
  FLOW: 'flow',
  TRANSFORM: 'transform',
  INTEGRATION: 'integration'
} as const

export const FLOW_NODES: NodeType[] = [
  // ========== TRIGGERS ==========
  {
    id: 'trigger_keyword',
    category: NODE_CATEGORIES.TRIGGER,
    name: 'Palavra-chave',
    icon: 'MessageCircle',
    color: '#22c55e',
    outputs: ['message']
  },
  {
    id: 'trigger_webhook',
    category: NODE_CATEGORIES.TRIGGER,
    name: 'Webhook',
    icon: 'Globe',
    color: '#22c55e',
    outputs: ['data']
  },
  {
    id: 'trigger_schedule',
    category: NODE_CATEGORIES.TRIGGER,
    name: 'Agendamento',
    icon: 'Clock',
    color: '#22c55e',
    outputs: ['trigger']
  },
  {
    id: 'trigger_qrcode',
    category: NODE_CATEGORIES.TRIGGER,
    name: 'QR Code Scan',
    icon: 'QrCode',
    color: '#22c55e',
    outputs: ['data']
  },

  // ========== MESSAGES ==========
  {
    id: 'msg_text',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Texto',
    icon: 'MessageSquare',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['sent']
  },
  {
    id: 'msg_image',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Imagem',
    icon: 'Image',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['sent']
  },
  {
    id: 'msg_audio',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Áudio',
    icon: 'Mic',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['sent']
  },
  {
    id: 'msg_video',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Vídeo',
    icon: 'Video',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['sent']
  },
  {
    id: 'msg_document',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Documento',
    icon: 'FileText',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['sent']
  },
  {
    id: 'msg_location',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Localização',
    icon: 'MapPin',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['sent']
  },
  {
    id: 'msg_buttons',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Botões',
    icon: 'MousePointer',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['selected']
  },
  {
    id: 'msg_list',
    category: NODE_CATEGORIES.MESSAGE,
    name: 'Lista',
    icon: 'List',
    color: '#3b82f6',
    inputs: ['trigger'],
    outputs: ['selected']
  },

  // ========== AI NODES ==========
  {
    id: 'ai_chatgpt',
    category: NODE_CATEGORIES.AI,
    name: 'ChatGPT',
    icon: 'Brain',
    color: '#10b981',
    inputs: ['prompt'],
    outputs: ['response']
  },
  {
    id: 'ai_claude',
    category: NODE_CATEGORIES.AI,
    name: 'Claude',
    icon: 'Sparkles',
    color: '#8b5cf6',
    inputs: ['prompt'],
    outputs: ['response']
  },
  {
    id: 'ai_gemini',
    category: NODE_CATEGORIES.AI,
    name: 'Gemini',
    icon: 'Stars',
    color: '#06b6d4',
    inputs: ['prompt'],
    outputs: ['response']
  },
  {
    id: 'ai_llama',
    category: NODE_CATEGORIES.AI,
    name: 'Llama',
    icon: 'Cpu',
    color: '#f59e0b',
    inputs: ['prompt'],
    outputs: ['response']
  },
  {
    id: 'ai_whisper',
    category: NODE_CATEGORIES.AI,
    name: 'Whisper STT',
    icon: 'Mic',
    color: '#ec4899',
    inputs: ['audio'],
    outputs: ['text']
  },
  {
    id: 'ai_dalle',
    category: NODE_CATEGORIES.AI,
    name: 'DALL-E',
    icon: 'Palette',
    color: '#f43f5e',
    inputs: ['prompt'],
    outputs: ['image']
  },

  // ========== API NODES ==========
  {
    id: 'api_rest',
    category: NODE_CATEGORIES.API,
    name: 'REST API',
    icon: 'Globe',
    color: '#0ea5e9',
    inputs: ['data'],
    outputs: ['response']
  },
  {
    id: 'api_graphql',
    category: NODE_CATEGORIES.API,
    name: 'GraphQL',
    icon: 'Share2',
    color: '#e11d48',
    inputs: ['query'],
    outputs: ['data']
  },
  {
    id: 'api_soap',
    category: NODE_CATEGORIES.API,
    name: 'SOAP',
    icon: 'Cloud',
    color: '#7c3aed',
    inputs: ['xml'],
    outputs: ['response']
  },
  {
    id: 'api_webhook_send',
    category: NODE_CATEGORIES.API,
    name: 'Enviar Webhook',
    icon: 'Send',
    color: '#2563eb',
    inputs: ['data'],
    outputs: ['status']
  },

  // ========== DATABASE NODES ==========
  {
    id: 'db_query',
    category: NODE_CATEGORIES.DATABASE,
    name: 'SQL Query',
    icon: 'Database',
    color: '#059669',
    inputs: ['params'],
    outputs: ['result']
  },
  {
    id: 'db_insert',
    category: NODE_CATEGORIES.DATABASE,
    name: 'Inserir',
    icon: 'Plus',
    color: '#059669',
    inputs: ['data'],
    outputs: ['id']
  },
  {
    id: 'db_update',
    category: NODE_CATEGORIES.DATABASE,
    name: 'Atualizar',
    icon: 'Edit',
    color: '#059669',
    inputs: ['data'],
    outputs: ['success']
  },
  {
    id: 'db_delete',
    category: NODE_CATEGORIES.DATABASE,
    name: 'Deletar',
    icon: 'Trash',
    color: '#059669',
    inputs: ['id'],
    outputs: ['success']
  },
  {
    id: 'db_mongodb',
    category: NODE_CATEGORIES.DATABASE,
    name: 'MongoDB',
    icon: 'Layers',
    color: '#16a34a',
    inputs: ['query'],
    outputs: ['result']
  },
  {
    id: 'db_redis',
    category: NODE_CATEGORIES.DATABASE,
    name: 'Redis',
    icon: 'Zap',
    color: '#dc2626',
    inputs: ['key'],
    outputs: ['value']
  },

  // ========== STORAGE NODES ==========
  {
    id: 'storage_upload',
    category: NODE_CATEGORIES.STORAGE,
    name: 'Upload',
    icon: 'Upload',
    color: '#f97316',
    inputs: ['file'],
    outputs: ['url']
  },
  {
    id: 'storage_download',
    category: NODE_CATEGORIES.STORAGE,
    name: 'Download',
    icon: 'Download',
    color: '#f97316',
    inputs: ['url'],
    outputs: ['file']
  },
  {
    id: 'storage_s3',
    category: NODE_CATEGORIES.STORAGE,
    name: 'AWS S3',
    icon: 'Cloud',
    color: '#f59e0b',
    inputs: ['file'],
    outputs: ['url']
  },
  {
    id: 'storage_gcs',
    category: NODE_CATEGORIES.STORAGE,
    name: 'Google Cloud',
    icon: 'CloudRain',
    color: '#4285f4',
    inputs: ['file'],
    outputs: ['url']
  },
  {
    id: 'storage_ftp',
    category: NODE_CATEGORIES.STORAGE,
    name: 'FTP',
    icon: 'Server',
    color: '#6b7280',
    inputs: ['file'],
    outputs: ['success']
  },

  // ========== LOGIC NODES ==========
  {
    id: 'logic_condition',
    category: NODE_CATEGORIES.LOGIC,
    name: 'Condição',
    icon: 'GitBranch',
    color: '#a855f7',
    inputs: ['value'],
    outputs: ['true', 'false']
  },
  {
    id: 'logic_switch',
    category: NODE_CATEGORIES.LOGIC,
    name: 'Switch',
    icon: 'ToggleLeft',
    color: '#a855f7',
    inputs: ['value'],
    outputs: ['case1', 'case2', 'case3', 'default']
  },
  {
    id: 'logic_loop',
    category: NODE_CATEGORIES.LOGIC,
    name: 'Loop',
    icon: 'RefreshCw',
    color: '#a855f7',
    inputs: ['array'],
    outputs: ['item', 'done']
  },
  {
    id: 'logic_wait',
    category: NODE_CATEGORIES.LOGIC,
    name: 'Aguardar',
    icon: 'Clock',
    color: '#a855f7',
    inputs: ['trigger'],
    outputs: ['continue']
  },
  {
    id: 'logic_random',
    category: NODE_CATEGORIES.LOGIC,
    name: 'Aleatório',
    icon: 'Shuffle',
    color: '#a855f7',
    inputs: ['options'],
    outputs: ['selected']
  },

  // ========== FLOW CONTROL ==========
  {
    id: 'flow_group',
    category: NODE_CATEGORIES.FLOW,
    name: 'Grupo',
    icon: 'Package',
    color: '#64748b',
    inputs: ['input'],
    outputs: ['output']
  },
  {
    id: 'flow_subflow',
    category: NODE_CATEGORIES.FLOW,
    name: 'Sub-flow',
    icon: 'GitMerge',
    color: '#64748b',
    inputs: ['params'],
    outputs: ['result']
  },
  {
    id: 'flow_goto',
    category: NODE_CATEGORIES.FLOW,
    name: 'Ir Para',
    icon: 'Navigation',
    color: '#64748b',
    inputs: ['trigger'],
    outputs: []
  },
  {
    id: 'flow_end',
    category: NODE_CATEGORIES.FLOW,
    name: 'Finalizar',
    icon: 'StopCircle',
    color: '#ef4444',
    inputs: ['trigger'],
    outputs: []
  },

  // ========== TRANSFORM NODES ==========
  {
    id: 'transform_json',
    category: NODE_CATEGORIES.TRANSFORM,
    name: 'JSON',
    icon: 'Code',
    color: '#0891b2',
    inputs: ['data'],
    outputs: ['json']
  },
  {
    id: 'transform_csv',
    category: NODE_CATEGORIES.TRANSFORM,
    name: 'CSV',
    icon: 'Table',
    color: '#0891b2',
    inputs: ['data'],
    outputs: ['csv']
  },
  {
    id: 'transform_template',
    category: NODE_CATEGORIES.TRANSFORM,
    name: 'Template',
    icon: 'FileCode',
    color: '#0891b2',
    inputs: ['data'],
    outputs: ['text']
  },
  {
    id: 'transform_extract',
    category: NODE_CATEGORIES.TRANSFORM,
    name: 'Extrair',
    icon: 'Filter',
    color: '#0891b2',
    inputs: ['data'],
    outputs: ['extracted']
  },

  // ========== INTEGRATIONS ==========
  {
    id: 'int_hubspot',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'HubSpot',
    icon: 'Package',
    color: '#ff7a59',
    inputs: ['data'],
    outputs: ['response']
  },
  {
    id: 'int_zapier',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'Zapier',
    icon: 'Zap',
    color: '#ff4a00',
    inputs: ['trigger'],
    outputs: ['action']
  },
  {
    id: 'int_slack',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'Slack',
    icon: 'Hash',
    color: '#4a154b',
    inputs: ['message'],
    outputs: ['sent']
  },
  {
    id: 'int_email',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'Email',
    icon: 'Mail',
    color: '#ea4335',
    inputs: ['data'],
    outputs: ['sent']
  },
  {
    id: 'int_sms',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'SMS',
    icon: 'MessageSquare',
    color: '#25d366',
    inputs: ['message'],
    outputs: ['sent']
  },
  {
    id: 'int_calendar',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'Calendário',
    icon: 'Calendar',
    color: '#4285f4',
    inputs: ['event'],
    outputs: ['created']
  },
  {
    id: 'int_sheets',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'Google Sheets',
    icon: 'Table2',
    color: '#0f9d58',
    inputs: ['data'],
    outputs: ['success']
  },
  {
    id: 'int_payment',
    category: NODE_CATEGORIES.INTEGRATION,
    name: 'Pagamento',
    icon: 'CreditCard',
    color: '#5469d4',
    inputs: ['amount'],
    outputs: ['paid']
  }
]

export const CATEGORY_LABELS: Record<string, string> = {
  trigger: 'Gatilhos',
  message: 'Mensagens',
  ai: 'Inteligência Artificial',
  api: 'APIs',
  database: 'Banco de Dados',
  storage: 'Arquivos',
  logic: 'Lógica',
  flow: 'Controle de Fluxo',
  transform: 'Transformação',
  integration: 'Integrações'
}