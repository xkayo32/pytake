export type AutomationType = 'webhook' | 'api' | 'erp' | 'crm' | 'email' | 'sms' | 'calendar' | 'sheet'
export type AutomationStatus = 'active' | 'inactive' | 'error' | 'testing'
export type TriggerType = 'message_received' | 'message_sent' | 'contact_created' | 'contact_updated' | 
  'campaign_completed' | 'flow_completed' | 'tag_added' | 'tag_removed' | 'schedule' | 'manual'
export type ActionType = 'send_message' | 'update_contact' | 'add_tag' | 'remove_tag' | 
  'create_task' | 'send_webhook' | 'send_email' | 'update_crm' | 'create_invoice' | 'custom_api'

export interface WebhookConfig {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  authentication?: {
    type: 'none' | 'bearer' | 'basic' | 'api_key'
    value?: string
    username?: string
    password?: string
    keyName?: string
    keyValue?: string
    keyLocation?: 'header' | 'query'
  }
  retryOnFailure: boolean
  maxRetries: number
  timeoutMs: number
}

export interface ERPConfig {
  provider: 'hubsoft' | 'ixcsoft' | 'mksolutions' | 'sisgp' | 'custom'
  baseUrl: string
  apiKey: string
  syncCustomers: boolean
  syncInvoices: boolean
  syncPayments: boolean
  syncTickets: boolean
  customMapping?: Record<string, string>
}

export interface AutomationTrigger {
  id: string
  type: TriggerType
  conditions?: {
    field: string
    operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than'
    value: any
  }[]
  schedule?: {
    frequency: 'once' | 'hourly' | 'daily' | 'weekly' | 'monthly'
    time?: string
    dayOfWeek?: number
    dayOfMonth?: number
    timezone: string
  }
}

export interface AutomationAction {
  id: string
  type: ActionType
  config: {
    // For send_message
    templateId?: string
    messageText?: string
    variables?: Record<string, string>
    
    // For update_contact
    fields?: Record<string, any>
    
    // For tags
    tags?: string[]
    
    // For webhook
    webhook?: WebhookConfig
    
    // For email
    emailTo?: string
    emailSubject?: string
    emailBody?: string
    
    // For CRM/ERP
    erpAction?: string
    erpData?: Record<string, any>
    
    // For custom API
    apiEndpoint?: string
    apiMethod?: string
    apiBody?: any
  }
  delay?: {
    value: number
    unit: 'seconds' | 'minutes' | 'hours' | 'days'
  }
}

export interface Automation {
  id: string
  name: string
  description?: string
  type: AutomationType
  status: AutomationStatus
  
  // Trigger configuration
  triggers: AutomationTrigger[]
  triggerLogic: 'any' | 'all' // OR vs AND
  
  // Action configuration
  actions: AutomationAction[]
  
  // Integration settings
  integration?: {
    webhook?: WebhookConfig
    erp?: ERPConfig
  }
  
  // Execution settings
  settings: {
    enabled: boolean
    runOnce: boolean // Run only once per contact
    maxExecutions?: number
    cooldownMinutes?: number // Minimum time between executions
    errorHandling: 'stop' | 'continue' | 'retry'
    notifyOnError: boolean
    logExecutions: boolean
  }
  
  // Statistics
  stats: {
    totalExecutions: number
    successCount: number
    errorCount: number
    lastExecution?: string
    lastError?: string
    avgExecutionTime?: number
  }
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  tags: string[]
}

// Mock data
export const MOCK_AUTOMATIONS: Automation[] = [
  {
    id: '1',
    name: 'Boas-vindas Automático',
    description: 'Envia mensagem de boas-vindas quando novo contato é criado',
    type: 'webhook',
    status: 'active',
    triggers: [{
      id: 't1',
      type: 'contact_created',
      conditions: [{
        field: 'source',
        operator: 'equals',
        value: 'whatsapp'
      }]
    }],
    triggerLogic: 'all',
    actions: [
      {
        id: 'a1',
        type: 'send_message',
        config: {
          templateId: '1',
          variables: {
            '{{1}}': 'PyTake',
            '{{2}}': 'automação inteligente'
          }
        },
        delay: {
          value: 5,
          unit: 'seconds'
        }
      },
      {
        id: 'a2',
        type: 'add_tag',
        config: {
          tags: ['novo-contato', 'boas-vindas-enviado']
        }
      }
    ],
    settings: {
      enabled: true,
      runOnce: true,
      errorHandling: 'continue',
      notifyOnError: true,
      logExecutions: true
    },
    stats: {
      totalExecutions: 342,
      successCount: 338,
      errorCount: 4,
      lastExecution: '2024-01-15T14:30:00Z',
      avgExecutionTime: 1250
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    createdBy: 'user-1',
    tags: ['boas-vindas', 'novo-contato']
  },
  {
    id: '2',
    name: 'Webhook Pagamento Confirmado',
    description: 'Recebe webhook do gateway de pagamento e atualiza status do cliente',
    type: 'webhook',
    status: 'active',
    triggers: [{
      id: 't2',
      type: 'message_received',
      conditions: [{
        field: 'message',
        operator: 'contains',
        value: 'pagamento'
      }]
    }],
    triggerLogic: 'any',
    actions: [
      {
        id: 'a3',
        type: 'send_webhook',
        config: {
          webhook: {
            url: 'https://api.gateway.com/payment/verify',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            authentication: {
              type: 'bearer',
              value: 'sk_live_abc123'
            },
            retryOnFailure: true,
            maxRetries: 3,
            timeoutMs: 5000
          }
        }
      },
      {
        id: 'a4',
        type: 'update_contact',
        config: {
          fields: {
            paymentStatus: 'confirmed',
            lastPaymentDate: '{{current_date}}'
          }
        }
      }
    ],
    integration: {
      webhook: {
        url: 'https://api.gateway.com/webhooks/pytake',
        method: 'POST',
        authentication: {
          type: 'bearer',
          value: 'sk_live_abc123'
        },
        retryOnFailure: true,
        maxRetries: 3,
        timeoutMs: 5000
      }
    },
    settings: {
      enabled: true,
      runOnce: false,
      cooldownMinutes: 5,
      errorHandling: 'retry',
      notifyOnError: true,
      logExecutions: true
    },
    stats: {
      totalExecutions: 89,
      successCount: 87,
      errorCount: 2,
      lastExecution: '2024-01-15T13:45:00Z',
      avgExecutionTime: 2300
    },
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-15T13:45:00Z',
    createdBy: 'user-1',
    tags: ['pagamento', 'webhook', 'gateway']
  },
  {
    id: '3',
    name: 'Sincronização HubSoft',
    description: 'Sincroniza dados de clientes com sistema HubSoft ERP',
    type: 'erp',
    status: 'active',
    triggers: [
      {
        id: 't3',
        type: 'schedule',
        schedule: {
          frequency: 'hourly',
          timezone: 'America/Sao_Paulo'
        }
      }
    ],
    triggerLogic: 'any',
    actions: [
      {
        id: 'a5',
        type: 'update_crm',
        config: {
          erpAction: 'sync_customers',
          erpData: {
            fields: ['name', 'phone', 'email', 'cpf', 'address']
          }
        }
      }
    ],
    integration: {
      erp: {
        provider: 'hubsoft',
        baseUrl: 'https://api.hubsoft.com.br/v2',
        apiKey: 'hub_k3y_xyz789',
        syncCustomers: true,
        syncInvoices: true,
        syncPayments: true,
        syncTickets: false
      }
    },
    settings: {
      enabled: true,
      runOnce: false,
      errorHandling: 'retry',
      notifyOnError: true,
      logExecutions: true
    },
    stats: {
      totalExecutions: 720,
      successCount: 718,
      errorCount: 2,
      lastExecution: '2024-01-15T15:00:00Z',
      avgExecutionTime: 8500
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T15:00:00Z',
    createdBy: 'user-1',
    tags: ['erp', 'hubsoft', 'sincronizacao']
  },
  {
    id: '4',
    name: 'Lembrete de Consulta',
    description: 'Envia lembrete 24h antes da consulta agendada',
    type: 'calendar',
    status: 'active',
    triggers: [{
      id: 't4',
      type: 'schedule',
      schedule: {
        frequency: 'daily',
        time: '09:00',
        timezone: 'America/Sao_Paulo'
      }
    }],
    triggerLogic: 'all',
    actions: [
      {
        id: 'a6',
        type: 'send_message',
        config: {
          messageText: 'Olá {{nome}}! Este é um lembrete da sua consulta amanhã às {{horario}}. Confirme sua presença respondendo SIM.',
          variables: {
            '{{nome}}': '${contact.name}',
            '{{horario}}': '${appointment.time}'
          }
        }
      }
    ],
    settings: {
      enabled: true,
      runOnce: false,
      errorHandling: 'continue',
      notifyOnError: false,
      logExecutions: true
    },
    stats: {
      totalExecutions: 456,
      successCount: 450,
      errorCount: 6,
      lastExecution: '2024-01-15T09:00:00Z',
      avgExecutionTime: 950
    },
    createdAt: '2024-01-03T14:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    createdBy: 'user-2',
    tags: ['lembrete', 'consulta', 'agendamento']
  },
  {
    id: '5',
    name: 'Envio de Fatura Mensal',
    description: 'Gera e envia fatura todo dia 10 de cada mês',
    type: 'erp',
    status: 'active',
    triggers: [{
      id: 't5',
      type: 'schedule',
      schedule: {
        frequency: 'monthly',
        dayOfMonth: 10,
        time: '08:00',
        timezone: 'America/Sao_Paulo'
      }
    }],
    triggerLogic: 'all',
    actions: [
      {
        id: 'a7',
        type: 'create_invoice',
        config: {
          erpAction: 'generate_invoice',
          erpData: {
            template: 'monthly_subscription',
            dueDate: '{{due_date}}'
          }
        }
      },
      {
        id: 'a8',
        type: 'send_message',
        config: {
          templateId: '3',
          variables: {
            '{{1}}': '${contact.name}',
            '{{2}}': '${invoice.month}',
            '{{3}}': '${invoice.amount}',
            '{{4}}': '${invoice.dueDate}',
            '{{5}}': '${invoice.id}'
          }
        },
        delay: {
          value: 30,
          unit: 'minutes'
        }
      }
    ],
    integration: {
      erp: {
        provider: 'ixcsoft',
        baseUrl: 'https://api.ixcsoft.com.br/v1',
        apiKey: 'ixc_key_456',
        syncCustomers: true,
        syncInvoices: true,
        syncPayments: true,
        syncTickets: true
      }
    },
    settings: {
      enabled: true,
      runOnce: false,
      errorHandling: 'stop',
      notifyOnError: true,
      logExecutions: true
    },
    stats: {
      totalExecutions: 12,
      successCount: 12,
      errorCount: 0,
      lastExecution: '2024-01-10T08:00:00Z',
      avgExecutionTime: 12000
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T08:00:00Z',
    createdBy: 'user-1',
    tags: ['fatura', 'cobranca', 'mensal']
  },
  {
    id: '6',
    name: 'Notificação por Email',
    description: 'Envia email quando recebe mensagem com palavra-chave urgente',
    type: 'email',
    status: 'inactive',
    triggers: [{
      id: 't6',
      type: 'message_received',
      conditions: [
        {
          field: 'message',
          operator: 'contains',
          value: 'urgente'
        }
      ]
    }],
    triggerLogic: 'any',
    actions: [
      {
        id: 'a9',
        type: 'send_email',
        config: {
          emailTo: 'suporte@empresa.com',
          emailSubject: 'Mensagem Urgente - {{contact_name}}',
          emailBody: 'Recebida mensagem urgente de {{contact_name}} ({{contact_phone}}): {{message}}'
        }
      }
    ],
    settings: {
      enabled: false,
      runOnce: false,
      cooldownMinutes: 15,
      errorHandling: 'continue',
      notifyOnError: false,
      logExecutions: true
    },
    stats: {
      totalExecutions: 23,
      successCount: 20,
      errorCount: 3,
      lastExecution: '2024-01-08T16:45:00Z',
      lastError: 'SMTP connection timeout',
      avgExecutionTime: 3200
    },
    createdAt: '2024-01-02T11:00:00Z',
    updatedAt: '2024-01-08T16:45:00Z',
    createdBy: 'user-3',
    tags: ['email', 'urgente', 'notificacao']
  },
  {
    id: '7',
    name: 'API Custom - CRM Pipedrive',
    description: 'Sincroniza contatos com Pipedrive CRM',
    type: 'api',
    status: 'testing',
    triggers: [
      {
        id: 't7',
        type: 'contact_updated'
      },
      {
        id: 't8',
        type: 'tag_added',
        conditions: [{
          field: 'tag',
          operator: 'equals',
          value: 'qualified-lead'
        }]
      }
    ],
    triggerLogic: 'any',
    actions: [
      {
        id: 'a10',
        type: 'custom_api',
        config: {
          apiEndpoint: 'https://api.pipedrive.com/v1/persons',
          apiMethod: 'POST',
          apiBody: {
            name: '${contact.name}',
            phone: '${contact.phone}',
            email: '${contact.email}',
            custom_fields: {
              whatsapp_id: '${contact.whatsappId}'
            }
          }
        }
      }
    ],
    settings: {
      enabled: false,
      runOnce: true,
      errorHandling: 'retry',
      notifyOnError: true,
      logExecutions: true
    },
    stats: {
      totalExecutions: 5,
      successCount: 3,
      errorCount: 2,
      lastExecution: '2024-01-14T10:30:00Z',
      lastError: 'Invalid API key',
      avgExecutionTime: 4500
    },
    createdAt: '2024-01-14T09:00:00Z',
    updatedAt: '2024-01-14T10:30:00Z',
    createdBy: 'user-2',
    tags: ['crm', 'pipedrive', 'api']
  },
  {
    id: '8',
    name: 'Planilha Google Sheets',
    description: 'Exporta novos contatos para Google Sheets',
    type: 'sheet',
    status: 'error',
    triggers: [{
      id: 't9',
      type: 'contact_created'
    }],
    triggerLogic: 'all',
    actions: [
      {
        id: 'a11',
        type: 'custom_api',
        config: {
          apiEndpoint: 'https://sheets.googleapis.com/v4/spreadsheets/ABC123/values/A:Z:append',
          apiMethod: 'POST',
          apiBody: {
            values: [
              ['${contact.name}', '${contact.phone}', '${contact.email}', '${contact.createdAt}']
            ]
          }
        }
      }
    ],
    settings: {
      enabled: true,
      runOnce: false,
      errorHandling: 'stop',
      notifyOnError: true,
      logExecutions: true
    },
    stats: {
      totalExecutions: 67,
      successCount: 45,
      errorCount: 22,
      lastExecution: '2024-01-15T11:20:00Z',
      lastError: 'Google Sheets API quota exceeded',
      avgExecutionTime: 2800
    },
    createdAt: '2024-01-10T13:00:00Z',
    updatedAt: '2024-01-15T11:20:00Z',
    createdBy: 'user-3',
    tags: ['sheets', 'google', 'export']
  }
]