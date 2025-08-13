import { Template } from './template'
import { Contact, ContactGroup } from './contact'

export type CampaignStatus = 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed'
export type CampaignType = 'immediate' | 'scheduled' | 'recurring'
export type TargetType = 'all' | 'groups' | 'tags' | 'custom' | 'csv'

export interface CampaignTarget {
  type: TargetType
  groups?: string[]
  tags?: string[]
  customFilter?: {
    lastInteraction?: {
      from?: string
      to?: string
    }
    messageCount?: {
      min?: number
      max?: number
    }
    hasWhatsApp?: boolean
    status?: string[]
  }
  csvFile?: File
  estimatedReach?: number
}

export interface CampaignSchedule {
  type: CampaignType
  startDate: string
  startTime: string
  endDate?: string
  recurring?: {
    frequency: 'daily' | 'weekly' | 'monthly'
    interval: number
    daysOfWeek?: number[]
    dayOfMonth?: number
    time: string
  }
  timezone: string
}

export interface CampaignMessage {
  templateId: string
  template?: Template
  variables?: Record<string, string>
  attachments?: {
    type: 'image' | 'document' | 'video' | 'audio'
    url: string
    caption?: string
  }[]
}

export interface CampaignMetrics {
  sent: number
  delivered: number
  read: number
  replied: number
  failed: number
  pending: number
  clickedLinks: number
  conversionRate: number
  avgResponseTime?: number
  cost?: number
}

export interface Campaign {
  id: string
  name: string
  description?: string
  type: CampaignType
  status: CampaignStatus
  
  // Target
  target: CampaignTarget
  
  // Message
  message: CampaignMessage
  
  // Schedule
  schedule: CampaignSchedule
  
  // Settings
  settings: {
    rateLimit?: number // messages per second
    retryFailed?: boolean
    stopOnError?: boolean
    trackLinks?: boolean
    enableReplies?: boolean
    fallbackFlow?: string
  }
  
  // Metrics
  metrics: CampaignMetrics
  
  // Metadata
  createdAt: string
  updatedAt: string
  startedAt?: string
  completedAt?: string
  createdBy: string
  tags: string[]
}

// Mock data
export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: '1',
    name: 'Black Friday 2024',
    description: 'Campanha promocional de Black Friday com 50% de desconto',
    type: 'scheduled',
    status: 'scheduled',
    target: {
      type: 'groups',
      groups: ['Clientes Premium', 'Leads'],
      estimatedReach: 1250
    },
    message: {
      templateId: '4',
      variables: {
        '{{1}}': 'Cliente',
        '{{2}}': '50',
        '{{3}}': 'toda a loja',
        '{{4}}': '30/11/2024',
        '{{5}}': 'BLACK50'
      }
    },
    schedule: {
      type: 'scheduled',
      startDate: '2024-11-24',
      startTime: '09:00',
      timezone: 'America/Sao_Paulo'
    },
    settings: {
      rateLimit: 10,
      retryFailed: true,
      trackLinks: true,
      enableReplies: true
    },
    metrics: {
      sent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
      failed: 0,
      pending: 1250,
      clickedLinks: 0,
      conversionRate: 0
    },
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    createdBy: 'user-1',
    tags: ['black-friday', 'promocao', '2024']
  },
  {
    id: '2',
    name: 'Boas-vindas Automático',
    description: 'Mensagem de boas-vindas para novos contatos',
    type: 'immediate',
    status: 'running',
    target: {
      type: 'tags',
      tags: ['novo-cliente'],
      estimatedReach: 45
    },
    message: {
      templateId: '1',
      variables: {
        '{{1}}': 'PyTake',
        '{{2}}': 'soluções em automação'
      }
    },
    schedule: {
      type: 'immediate',
      startDate: '2024-01-01',
      startTime: '00:00',
      timezone: 'America/Sao_Paulo'
    },
    settings: {
      rateLimit: 5,
      retryFailed: true,
      enableReplies: true,
      fallbackFlow: 'flow-welcome'
    },
    metrics: {
      sent: 823,
      delivered: 810,
      read: 780,
      replied: 234,
      failed: 13,
      pending: 0,
      clickedLinks: 145,
      conversionRate: 28.4,
      avgResponseTime: 180
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    startedAt: '2024-01-01T00:00:00Z',
    createdBy: 'user-1',
    tags: ['boas-vindas', 'automatico']
  },
  {
    id: '3',
    name: 'Lembrete de Pagamento',
    description: 'Lembrete mensal de faturas pendentes',
    type: 'recurring',
    status: 'running',
    target: {
      type: 'custom',
      customFilter: {
        tags: ['cliente'],
        hasWhatsApp: true
      },
      estimatedReach: 320
    },
    message: {
      templateId: '3',
      variables: {
        '{{1}}': 'Cliente',
        '{{2}}': 'Janeiro/2024',
        '{{3}}': '299,90',
        '{{4}}': '20/01/2024',
        '{{5}}': 'FAT-2024'
      }
    },
    schedule: {
      type: 'recurring',
      startDate: '2024-01-15',
      startTime: '09:00',
      recurring: {
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 15,
        time: '09:00'
      },
      timezone: 'America/Sao_Paulo'
    },
    settings: {
      rateLimit: 8,
      retryFailed: true,
      stopOnError: false,
      trackLinks: true
    },
    metrics: {
      sent: 2450,
      delivered: 2400,
      read: 2100,
      replied: 450,
      failed: 50,
      pending: 0,
      clickedLinks: 890,
      conversionRate: 36.3,
      cost: 49.0
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T09:00:00Z',
    startedAt: '2024-01-15T09:00:00Z',
    createdBy: 'user-1',
    tags: ['cobranca', 'recorrente', 'mensal']
  },
  {
    id: '4',
    name: 'Pesquisa de Satisfação',
    description: 'Pesquisa NPS pós-atendimento',
    type: 'immediate',
    status: 'paused',
    target: {
      type: 'custom',
      customFilter: {
        lastInteraction: {
          from: '2024-01-01T00:00:00Z',
          to: '2024-01-07T23:59:59Z'
        },
        hasWhatsApp: true
      },
      estimatedReach: 156
    },
    message: {
      templateId: '6',
      variables: {
        '{{1}}': 'Cliente',
        '{{2}}': 'nosso atendimento'
      }
    },
    schedule: {
      type: 'immediate',
      startDate: '2024-01-08',
      startTime: '10:00',
      timezone: 'America/Sao_Paulo'
    },
    settings: {
      rateLimit: 5,
      retryFailed: false,
      enableReplies: true
    },
    metrics: {
      sent: 89,
      delivered: 87,
      read: 82,
      replied: 45,
      failed: 2,
      pending: 67,
      clickedLinks: 38,
      conversionRate: 51.7
    },
    createdAt: '2024-01-08T08:00:00Z',
    updatedAt: '2024-01-10T14:20:00Z',
    startedAt: '2024-01-08T10:00:00Z',
    createdBy: 'user-2',
    tags: ['pesquisa', 'nps', 'satisfacao']
  },
  {
    id: '5',
    name: 'Reativação de Inativos',
    description: 'Campanha para reativar clientes inativos há mais de 90 dias',
    type: 'scheduled',
    status: 'completed',
    target: {
      type: 'groups',
      groups: ['Inativos'],
      estimatedReach: 67
    },
    message: {
      templateId: '4',
      variables: {
        '{{1}}': 'Cliente',
        '{{2}}': '30',
        '{{3}}': 'produtos selecionados',
        '{{4}}': '31/01/2024',
        '{{5}}': 'VOLTA30'
      }
    },
    schedule: {
      type: 'scheduled',
      startDate: '2024-01-05',
      startTime: '14:00',
      timezone: 'America/Sao_Paulo'
    },
    settings: {
      rateLimit: 3,
      retryFailed: true,
      trackLinks: true,
      enableReplies: true
    },
    metrics: {
      sent: 67,
      delivered: 65,
      read: 58,
      replied: 12,
      failed: 2,
      pending: 0,
      clickedLinks: 23,
      conversionRate: 18.5,
      cost: 1.34
    },
    createdAt: '2024-01-03T10:00:00Z',
    updatedAt: '2024-01-05T16:30:00Z',
    startedAt: '2024-01-05T14:00:00Z',
    completedAt: '2024-01-05T14:25:00Z',
    createdBy: 'user-1',
    tags: ['reativacao', 'inativos', 'desconto']
  },
  {
    id: '6',
    name: 'Aniversariantes do Mês',
    description: 'Parabenizar e oferecer desconto especial',
    type: 'recurring',
    status: 'draft',
    target: {
      type: 'custom',
      customFilter: {
        tags: ['cliente'],
        hasWhatsApp: true
      },
      estimatedReach: 28
    },
    message: {
      templateId: '4',
      variables: {
        '{{1}}': 'Aniversariante',
        '{{2}}': '20',
        '{{3}}': 'qualquer produto',
        '{{4}}': '31/01/2024',
        '{{5}}': 'NIVER20'
      }
    },
    schedule: {
      type: 'recurring',
      startDate: '2024-02-01',
      startTime: '09:00',
      recurring: {
        frequency: 'monthly',
        interval: 1,
        dayOfMonth: 1,
        time: '09:00'
      },
      timezone: 'America/Sao_Paulo'
    },
    settings: {
      rateLimit: 5,
      retryFailed: true,
      trackLinks: true
    },
    metrics: {
      sent: 0,
      delivered: 0,
      read: 0,
      replied: 0,
      failed: 0,
      pending: 28,
      clickedLinks: 0,
      conversionRate: 0
    },
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:00:00Z',
    createdBy: 'user-3',
    tags: ['aniversario', 'recorrente', 'desconto']
  },
  {
    id: '7',
    name: 'Lançamento Produto X',
    description: 'Anunciar novo produto para base premium',
    type: 'scheduled',
    status: 'failed',
    target: {
      type: 'groups',
      groups: ['Clientes Premium'],
      estimatedReach: 45
    },
    message: {
      templateId: '4',
      variables: {
        '{{1}}': 'Cliente VIP',
        '{{2}}': '15',
        '{{3}}': 'Produto X',
        '{{4}}': '20/01/2024',
        '{{5}}': 'LANCAMENTO15'
      }
    },
    schedule: {
      type: 'scheduled',
      startDate: '2024-01-10',
      startTime: '10:00',
      timezone: 'America/Sao_Paulo'
    },
    settings: {
      rateLimit: 10,
      retryFailed: false,
      stopOnError: true
    },
    metrics: {
      sent: 12,
      delivered: 0,
      read: 0,
      replied: 0,
      failed: 12,
      pending: 33,
      clickedLinks: 0,
      conversionRate: 0
    },
    createdAt: '2024-01-09T15:00:00Z',
    updatedAt: '2024-01-10T10:05:00Z',
    startedAt: '2024-01-10T10:00:00Z',
    completedAt: '2024-01-10T10:05:00Z',
    createdBy: 'user-2',
    tags: ['lancamento', 'produto', 'vip']
  }
]