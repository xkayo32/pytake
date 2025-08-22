export type ERPType = 'hubsoft' | 'ixcsoft' | 'mksolutions' | 'sisgp'
export type ERPStatus = 'connected' | 'disconnected' | 'error' | 'testing' | 'syncing'
export type CustomerStatus = 'active' | 'inactive' | 'blocked' | 'suspended'
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'cancelled'
export type TicketType = 'technical' | 'billing' | 'support' | 'installation' | 'maintenance'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical' | 'urgent'
export type ConnectionType = 'active' | 'inactive' | 'suspended' | 'maintenance'
export type PlanType = 'residential' | 'business' | 'enterprise' | 'premium'
export type PaymentMethod = 'boleto' | 'credit_card' | 'debit_card' | 'bank_transfer' | 'pix'

export interface ERPConfig {
  id: string
  erpType: ERPType
  name: string
  apiUrl: string
  apiKey: string
  apiSecret?: string
  isActive: boolean
  status: ERPStatus
  lastSync?: string
  createdAt: string
  updatedAt: string
  settings: ERPSettings
  stats: ERPStats
}

export interface ERPSettings {
  autoSync: boolean
  syncInterval: number // minutes
  webhookUrl?: string
  webhookSecret?: string
  enabledFeatures: {
    customers: boolean
    invoices: boolean
    tickets: boolean
    plans: boolean
    connectionStatus: boolean
  }
  notifications: {
    syncErrors: boolean
    newTickets: boolean
    overdueInvoices: boolean
    connectionIssues: boolean
  }
  customFields: Record<string, any>
}

export interface ERPStats {
  totalCustomers: number
  activeCustomers: number
  totalInvoices: number
  overdueInvoices: number
  openTickets: number
  totalPlans: number
  lastSyncDuration: number // seconds
  syncErrors: number
  uptime: number // percentage
}

export interface ERPCustomer {
  id: string
  erpId: string
  document: string // CPF/CNPJ
  name: string
  email?: string
  phone?: string
  address: {
    street: string
    number: string
    complement?: string
    neighborhood: string
    city: string
    state: string
    zipCode: string
  }
  status: CustomerStatus
  planId?: string
  planName?: string
  installationDate?: string
  connectionStatus: ConnectionType
  balance: number
  overdueAmount: number
  lastPayment?: string
  tags: string[]
  customFields: Record<string, any>
  createdAt: string
  updatedAt: string
}

export interface ERPInvoice {
  id: string
  erpId: string
  customerId: string
  customerName: string
  customerDocument: string
  invoiceNumber: string
  description: string
  amount: number
  dueDate: string
  issueDate: string
  paymentDate?: string
  status: InvoiceStatus
  paymentMethod?: PaymentMethod
  barcode?: string
  digitableLine?: string
  downloadUrl?: string
  paymentUrl?: string
  notes?: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

export interface ERPTicket {
  id: string
  erpId: string
  customerId: string
  customerName: string
  customerDocument: string
  customerPhone?: string
  title: string
  description: string
  type: TicketType
  priority: TicketPriority
  status: TicketStatus
  assignedTo?: string
  assignedToName?: string
  resolution?: string
  estimatedTime?: number // minutes
  actualTime?: number // minutes
  scheduledDate?: string
  completedDate?: string
  tags: string[]
  attachments: {
    id: string
    name: string
    url: string
    type: string
    size: number
  }[]
  comments: {
    id: string
    author: string
    content: string
    isInternal: boolean
    createdAt: string
  }[]
  createdAt: string
  updatedAt: string
}

export interface ERPPlan {
  id: string
  erpId: string
  name: string
  description: string
  type: PlanType
  speed: {
    download: number // Mbps
    upload: number // Mbps
  }
  price: number
  installationFee?: number
  isActive: boolean
  features: string[]
  restrictions: string[]
  customerCount: number
  createdAt: string
  updatedAt: string
}

export interface ERPConnectionStatus {
  customerId: string
  customerName: string
  status: ConnectionType
  ipAddress?: string
  macAddress?: string
  lastSeen?: string
  uptime: number // hours
  downloadSpeed: number // Mbps
  uploadSpeed: number // Mbps
  signalQuality: number // percentage
  packetLoss: number // percentage
  latency: number // ms
  issues: {
    type: string
    description: string
    severity: 'low' | 'medium' | 'high'
    detectedAt: string
  }[]
}

export interface ERPSyncLog {
  id: string
  erpType: ERPType
  operation: 'sync' | 'connect' | 'test' | 'webhook'
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
  duration: number // milliseconds
  recordsProcessed?: number
  recordsErrors?: number
  createdAt: string
}

export interface ERPWebhook {
  id: string
  erpType: ERPType
  url: string
  secret: string
  events: string[]
  isActive: boolean
  lastTrigger?: string
  totalTriggers: number
  successRate: number
  createdAt: string
  updatedAt: string
}

export interface ERPIntegrationOverview {
  totalIntegrations: number
  activeIntegrations: number
  errorIntegrations: number
  totalCustomers: number
  totalInvoices: number
  totalTickets: number
  overdueInvoices: number
  openTickets: number
  lastSyncTime?: string
  healthScore: number // 0-100
}

// Mock data
export const MOCK_ERP_CONFIGS: ERPConfig[] = [
  {
    id: '1',
    erpType: 'hubsoft',
    name: 'HubSoft Principal',
    apiUrl: 'https://api.hubsoft.com.br',
    apiKey: 'hs_live_*********************',
    isActive: true,
    status: 'connected',
    lastSync: '2024-01-15T17:30:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T17:30:00Z',
    settings: {
      autoSync: true,
      syncInterval: 15,
      webhookUrl: 'https://api.pytake.net/api/v1/erp/hubsoft/webhook',
      webhookSecret: 'webhook_secret_123',
      enabledFeatures: {
        customers: true,
        invoices: true,
        tickets: true,
        plans: true,
        connectionStatus: true
      },
      notifications: {
        syncErrors: true,
        newTickets: true,
        overdueInvoices: true,
        connectionIssues: true
      },
      customFields: {}
    },
    stats: {
      totalCustomers: 2847,
      activeCustomers: 2456,
      totalInvoices: 15678,
      overdueInvoices: 234,
      openTickets: 67,
      totalPlans: 12,
      lastSyncDuration: 145,
      syncErrors: 3,
      uptime: 99.8
    }
  },
  {
    id: '2',
    erpType: 'ixcsoft',
    name: 'IXC Soft Filial',
    apiUrl: 'https://sistema.ixcsoft.com.br',
    apiKey: 'ixc_api_*********************',
    isActive: true,
    status: 'connected',
    lastSync: '2024-01-15T17:25:00Z',
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-15T17:25:00Z',
    settings: {
      autoSync: true,
      syncInterval: 30,
      enabledFeatures: {
        customers: true,
        invoices: true,
        tickets: false,
        plans: true,
        connectionStatus: true
      },
      notifications: {
        syncErrors: true,
        newTickets: false,
        overdueInvoices: true,
        connectionIssues: true
      },
      customFields: {}
    },
    stats: {
      totalCustomers: 1234,
      activeCustomers: 1098,
      totalInvoices: 8765,
      overdueInvoices: 156,
      openTickets: 0,
      totalPlans: 8,
      lastSyncDuration: 89,
      syncErrors: 1,
      uptime: 99.5
    }
  },
  {
    id: '3',
    erpType: 'mksolutions',
    name: 'MK Solutions',
    apiUrl: 'https://api.mksolutions.com.br',
    apiKey: 'mk_*********************',
    isActive: false,
    status: 'error',
    lastSync: '2024-01-15T14:20:00Z',
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2024-01-15T14:20:00Z',
    settings: {
      autoSync: true,
      syncInterval: 60,
      enabledFeatures: {
        customers: true,
        invoices: true,
        tickets: true,
        plans: false,
        connectionStatus: false
      },
      notifications: {
        syncErrors: true,
        newTickets: true,
        overdueInvoices: true,
        connectionIssues: false
      },
      customFields: {}
    },
    stats: {
      totalCustomers: 567,
      activeCustomers: 445,
      totalInvoices: 3456,
      overdueInvoices: 89,
      openTickets: 23,
      totalPlans: 5,
      lastSyncDuration: 0,
      syncErrors: 15,
      uptime: 87.2
    }
  },
  {
    id: '4',
    erpType: 'sisgp',
    name: 'SisGP Integração',
    apiUrl: 'https://sistema.sisgp.com.br',
    apiKey: 'sisgp_*********************',
    isActive: false,
    status: 'disconnected',
    createdAt: '2024-01-12T00:00:00Z',
    updatedAt: '2024-01-12T10:30:00Z',
    settings: {
      autoSync: false,
      syncInterval: 120,
      enabledFeatures: {
        customers: false,
        invoices: false,
        tickets: false,
        plans: false,
        connectionStatus: false
      },
      notifications: {
        syncErrors: false,
        newTickets: false,
        overdueInvoices: false,
        connectionIssues: false
      },
      customFields: {}
    },
    stats: {
      totalCustomers: 0,
      activeCustomers: 0,
      totalInvoices: 0,
      overdueInvoices: 0,
      openTickets: 0,
      totalPlans: 0,
      lastSyncDuration: 0,
      syncErrors: 0,
      uptime: 0
    }
  }
]

export const MOCK_ERP_CUSTOMERS: ERPCustomer[] = [
  {
    id: '1',
    erpId: 'hs_customer_001',
    document: '12345678901',
    name: 'João Silva Santos',
    email: 'joao.silva@email.com',
    phone: '+55 11 99999-1234',
    address: {
      street: 'Rua das Flores',
      number: '123',
      complement: 'Apto 45',
      neighborhood: 'Centro',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01000-000'
    },
    status: 'active',
    planId: 'plan_100mb',
    planName: 'Internet 100MB',
    installationDate: '2023-06-15T00:00:00Z',
    connectionStatus: 'active',
    balance: -45.90,
    overdueAmount: 0,
    lastPayment: '2024-01-10T00:00:00Z',
    tags: ['vip', 'pontual'],
    customFields: {
      observacoes: 'Cliente preferencial',
      vendedor: 'Carlos Silva'
    },
    createdAt: '2023-06-15T00:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    erpId: 'hs_customer_002',
    document: '98765432100',
    name: 'Maria Oliveira Costa',
    email: 'maria.costa@empresa.com',
    phone: '+55 11 88888-5678',
    address: {
      street: 'Av. Principal',
      number: '456',
      neighborhood: 'Jardim Europa',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567'
    },
    status: 'active',
    planId: 'plan_200mb',
    planName: 'Internet 200MB',
    installationDate: '2023-08-20T00:00:00Z',
    connectionStatus: 'active',
    balance: 0,
    overdueAmount: 0,
    lastPayment: '2024-01-05T00:00:00Z',
    tags: ['empresarial'],
    customFields: {},
    createdAt: '2023-08-20T00:00:00Z',
    updatedAt: '2024-01-15T09:15:00Z'
  },
  {
    id: '3',
    erpId: 'hs_customer_003',
    document: '11122233344',
    name: 'Pedro Ferreira Lima',
    email: 'pedro.lima@hotmail.com',
    phone: '+55 11 77777-9999',
    address: {
      street: 'Rua do Comércio',
      number: '789',
      neighborhood: 'Vila Madalena',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '05432-123'
    },
    status: 'blocked',
    planId: 'plan_50mb',
    planName: 'Internet 50MB',
    installationDate: '2023-03-10T00:00:00Z',
    connectionStatus: 'suspended',
    balance: 156.78,
    overdueAmount: 156.78,
    lastPayment: '2023-11-15T00:00:00Z',
    tags: ['inadimplente'],
    customFields: {
      motivo_bloqueio: 'Inadimplência',
      contatos_realizados: 3
    },
    createdAt: '2023-03-10T00:00:00Z',
    updatedAt: '2024-01-15T16:45:00Z'
  }
]

export const MOCK_ERP_INVOICES: ERPInvoice[] = [
  {
    id: '1',
    erpId: 'hs_invoice_001',
    customerId: '1',
    customerName: 'João Silva Santos',
    customerDocument: '12345678901',
    invoiceNumber: 'FAT-2024-001',
    description: 'Internet 100MB - Janeiro/2024',
    amount: 89.90,
    dueDate: '2024-01-25T00:00:00Z',
    issueDate: '2024-01-01T00:00:00Z',
    paymentDate: '2024-01-10T00:00:00Z',
    status: 'paid',
    paymentMethod: 'pix',
    barcode: '12345678901234567890123456789012345678901234',
    digitableLine: '12345.67890 12345.678901 23456.789012 3 45678901234567890',
    downloadUrl: 'https://api.hubsoft.com/invoices/001/download',
    paymentUrl: 'https://api.hubsoft.com/invoices/001/pay',
    notes: 'Pagamento realizado via PIX',
    tags: ['pago', 'pix'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-10T12:30:00Z'
  },
  {
    id: '2',
    erpId: 'hs_invoice_002',
    customerId: '2',
    customerName: 'Maria Oliveira Costa',
    customerDocument: '98765432100',
    invoiceNumber: 'FAT-2024-002',
    description: 'Internet 200MB - Janeiro/2024',
    amount: 129.90,
    dueDate: '2024-01-20T00:00:00Z',
    issueDate: '2024-01-01T00:00:00Z',
    status: 'pending',
    paymentMethod: 'boleto',
    barcode: '98765432109876543210987654321098765432109876',
    digitableLine: '98765.43210 98765.432109 87654.321098 7 65432109876543210',
    downloadUrl: 'https://api.hubsoft.com/invoices/002/download',
    paymentUrl: 'https://api.hubsoft.com/invoices/002/pay',
    tags: ['pendente'],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  },
  {
    id: '3',
    erpId: 'hs_invoice_003',
    customerId: '3',
    customerName: 'Pedro Ferreira Lima',
    customerDocument: '11122233344',
    invoiceNumber: 'FAT-2023-150',
    description: 'Internet 50MB - Dezembro/2023',
    amount: 69.90,
    dueDate: '2023-12-25T00:00:00Z',
    issueDate: '2023-12-01T00:00:00Z',
    status: 'overdue',
    paymentMethod: 'boleto',
    barcode: '11122233344111223334411122333441112233344111',
    digitableLine: '11122.33344 11122.333441 11223.334411 1 22333441112233344',
    downloadUrl: 'https://api.hubsoft.com/invoices/003/download',
    paymentUrl: 'https://api.hubsoft.com/invoices/003/pay',
    notes: 'Fatura em atraso - cliente contactado',
    tags: ['vencida', 'contactado'],
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-15T14:20:00Z'
  }
]

export const MOCK_ERP_TICKETS: ERPTicket[] = [
  {
    id: '1',
    erpId: 'hs_ticket_001',
    customerId: '1',
    customerName: 'João Silva Santos',
    customerDocument: '12345678901',
    customerPhone: '+55 11 99999-1234',
    title: 'Internet lenta pela manhã',
    description: 'Cliente relata que a internet fica muito lenta entre 8h e 10h da manhã, principalmente durante videochamadas.',
    type: 'technical',
    priority: 'medium',
    status: 'in_progress',
    assignedTo: 'tech_001',
    assignedToName: 'Carlos Técnico',
    estimatedTime: 120,
    actualTime: 45,
    scheduledDate: '2024-01-16T09:00:00Z',
    tags: ['lentidao', 'manha'],
    attachments: [
      {
        id: 'att_001',
        name: 'teste_velocidade.png',
        url: 'https://storage.pytake.net/attachments/teste_velocidade.png',
        type: 'image/png',
        size: 245760
      }
    ],
    comments: [
      {
        id: 'comm_001',
        author: 'Carlos Técnico',
        content: 'Realizei teste remoto. Detectei congestionamento na rede. Agendando visita para verificação local.',
        isInternal: false,
        createdAt: '2024-01-15T14:30:00Z'
      },
      {
        id: 'comm_002',
        author: 'João Silva Santos',
        content: 'Perfeito! Estarei disponível amanhã das 9h às 12h.',
        isInternal: false,
        createdAt: '2024-01-15T15:45:00Z'
      }
    ],
    createdAt: '2024-01-15T10:20:00Z',
    updatedAt: '2024-01-15T15:45:00Z'
  },
  {
    id: '2',
    erpId: 'hs_ticket_002',
    customerId: '2',
    customerName: 'Maria Oliveira Costa',
    customerDocument: '98765432100',
    customerPhone: '+55 11 88888-5678',
    title: 'Dúvida sobre cobrança adicional',
    description: 'Cliente questiona cobrança de R$ 25,00 na última fatura que não estava prevista no contrato.',
    type: 'billing',
    priority: 'low',
    status: 'resolved',
    assignedTo: 'billing_001',
    assignedToName: 'Ana Financeiro',
    resolution: 'Cobrança referente ao upgrade de plano solicitado em dezembro. Enviado detalhamento por email.',
    estimatedTime: 30,
    actualTime: 25,
    completedDate: '2024-01-15T11:30:00Z',
    tags: ['cobranca', 'esclarecimento'],
    attachments: [],
    comments: [
      {
        id: 'comm_003',
        author: 'Ana Financeiro',
        content: 'Verificando o histórico de alterações do plano da cliente.',
        isInternal: true,
        createdAt: '2024-01-15T09:15:00Z'
      },
      {
        id: 'comm_004',
        author: 'Ana Financeiro',
        content: 'Olá Maria! A cobrança se refere ao upgrade para 200MB solicitado em dezembro. Enviei o detalhamento completo por email.',
        isInternal: false,
        createdAt: '2024-01-15T11:30:00Z'
      }
    ],
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-15T11:30:00Z'
  },
  {
    id: '3',
    erpId: 'hs_ticket_003',
    customerId: '3',
    customerName: 'Pedro Ferreira Lima',
    customerDocument: '11122233344',
    customerPhone: '+55 11 77777-9999',
    title: 'Solicitação de religação',
    description: 'Cliente solicita religação do serviço após quitação de débitos pendentes.',
    type: 'support',
    priority: 'high',
    status: 'open',
    assignedTo: 'support_001',
    assignedToName: 'Roberto Suporte',
    estimatedTime: 60,
    tags: ['religacao', 'pagamento'],
    attachments: [
      {
        id: 'att_002',
        name: 'comprovante_pagamento.pdf',
        url: 'https://storage.pytake.net/attachments/comprovante_pagamento.pdf',
        type: 'application/pdf',
        size: 512000
      }
    ],
    comments: [
      {
        id: 'comm_005',
        author: 'Pedro Ferreira Lima',
        content: 'Anexo comprovante de pagamento. Quando posso ter o serviço religado?',
        isInternal: false,
        createdAt: '2024-01-15T16:45:00Z'
      }
    ],
    createdAt: '2024-01-15T16:45:00Z',
    updatedAt: '2024-01-15T16:45:00Z'
  }
]

export const MOCK_ERP_PLANS: ERPPlan[] = [
  {
    id: '1',
    erpId: 'hs_plan_001',
    name: 'Internet 50MB',
    description: 'Plano residencial básico com 50MB de velocidade',
    type: 'residential',
    speed: {
      download: 50,
      upload: 25
    },
    price: 69.90,
    installationFee: 99.90,
    isActive: true,
    features: [
      'Wi-Fi gratuito',
      'Instalação inclusa',
      'Suporte 24h',
      'Netflix incluso'
    ],
    restrictions: [
      'Fair usage: 500GB/mês',
      'Velocidade reduzida após limite'
    ],
    customerCount: 1247,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    erpId: 'hs_plan_002',
    name: 'Internet 100MB',
    description: 'Plano residencial intermediário com 100MB de velocidade',
    type: 'residential',
    speed: {
      download: 100,
      upload: 50
    },
    price: 89.90,
    installationFee: 99.90,
    isActive: true,
    features: [
      'Wi-Fi gratuito',
      'Instalação inclusa',
      'Suporte 24h',
      'Netflix + Amazon Prime',
      'Roteador Wi-Fi 6'
    ],
    restrictions: [
      'Fair usage: 1TB/mês'
    ],
    customerCount: 2156,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '3',
    erpId: 'hs_plan_003',
    name: 'Internet 200MB',
    description: 'Plano residencial premium com 200MB de velocidade',
    type: 'residential',
    speed: {
      download: 200,
      upload: 100
    },
    price: 129.90,
    installationFee: 0,
    isActive: true,
    features: [
      'Wi-Fi gratuito',
      'Instalação gratuita',
      'Suporte prioritário 24h',
      'Netflix + Amazon Prime + Disney+',
      'Roteador Wi-Fi 6 Pro',
      'IP fixo opcional'
    ],
    restrictions: [],
    customerCount: 856,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '4',
    erpId: 'hs_plan_004',
    name: 'Empresarial 500MB',
    description: 'Plano empresarial com 500MB simétrico',
    type: 'business',
    speed: {
      download: 500,
      upload: 500
    },
    price: 299.90,
    installationFee: 199.90,
    isActive: true,
    features: [
      'Velocidade simétrica',
      'IP fixo incluso',
      'SLA 99.9%',
      'Suporte técnico dedicado',
      'Backup 4G incluso',
      'Monitoramento 24h'
    ],
    restrictions: [],
    customerCount: 89,
    createdAt: '2023-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  }
]

export const MOCK_ERP_CONNECTION_STATUS: ERPConnectionStatus[] = [
  {
    customerId: '1',
    customerName: 'João Silva Santos',
    status: 'active',
    ipAddress: '192.168.1.100',
    macAddress: '00:1B:44:11:3A:B7',
    lastSeen: '2024-01-15T17:45:00Z',
    uptime: 167.5,
    downloadSpeed: 98.5,
    uploadSpeed: 47.2,
    signalQuality: 95,
    packetLoss: 0.1,
    latency: 12,
    issues: []
  },
  {
    customerId: '2',
    customerName: 'Maria Oliveira Costa',
    status: 'active',
    ipAddress: '192.168.1.101',
    macAddress: '00:1B:44:11:3A:B8',
    lastSeen: '2024-01-15T17:44:00Z',
    uptime: 234.2,
    downloadSpeed: 195.8,
    uploadSpeed: 98.1,
    signalQuality: 98,
    packetLoss: 0.05,
    latency: 8,
    issues: []
  },
  {
    customerId: '3',
    customerName: 'Pedro Ferreira Lima',
    status: 'suspended',
    lastSeen: '2024-01-10T22:30:00Z',
    uptime: 0,
    downloadSpeed: 0,
    uploadSpeed: 0,
    signalQuality: 0,
    packetLoss: 100,
    latency: 0,
    issues: [
      {
        type: 'service_suspended',
        description: 'Serviço suspenso por inadimplência',
        severity: 'high',
        detectedAt: '2024-01-11T08:00:00Z'
      }
    ]
  }
]

export const MOCK_ERP_SYNC_LOGS: ERPSyncLog[] = [
  {
    id: '1',
    erpType: 'hubsoft',
    operation: 'sync',
    status: 'success',
    message: 'Sincronização completa realizada com sucesso',
    details: {
      customers: { processed: 2847, errors: 0 },
      invoices: { processed: 1567, errors: 0 },
      tickets: { processed: 67, errors: 0 }
    },
    duration: 145000,
    recordsProcessed: 4481,
    recordsErrors: 0,
    createdAt: '2024-01-15T17:30:00Z'
  },
  {
    id: '2',
    erpType: 'ixcsoft',
    operation: 'sync',
    status: 'success',
    message: 'Sincronização parcial - tickets desabilitados',
    details: {
      customers: { processed: 1234, errors: 0 },
      invoices: { processed: 876, errors: 0 }
    },
    duration: 89000,
    recordsProcessed: 2110,
    recordsErrors: 0,
    createdAt: '2024-01-15T17:25:00Z'
  },
  {
    id: '3',
    erpType: 'mksolutions',
    operation: 'sync',
    status: 'error',
    message: 'Falha na autenticação da API',
    details: {
      error_code: 'AUTH_FAILED',
      error_message: 'API key inválida ou expirada'
    },
    duration: 5000,
    recordsProcessed: 0,
    recordsErrors: 0,
    createdAt: '2024-01-15T14:20:00Z'
  },
  {
    id: '4',
    erpType: 'hubsoft',
    operation: 'test',
    status: 'success',
    message: 'Teste de conectividade realizado com sucesso',
    duration: 2500,
    createdAt: '2024-01-15T16:45:00Z'
  },
  {
    id: '5',
    erpType: 'hubsoft',
    operation: 'webhook',
    status: 'success',
    message: 'Webhook recebido: nova fatura criada',
    details: {
      event: 'invoice.created',
      invoice_id: 'hs_invoice_004'
    },
    duration: 150,
    createdAt: '2024-01-15T15:30:00Z'
  }
]

export const MOCK_ERP_WEBHOOKS: ERPWebhook[] = [
  {
    id: '1',
    erpType: 'hubsoft',
    url: 'https://api.pytake.net/api/v1/erp/hubsoft/webhook',
    secret: 'webhook_secret_123',
    events: [
      'customer.created',
      'customer.updated',
      'invoice.created',
      'invoice.paid',
      'ticket.created',
      'ticket.updated'
    ],
    isActive: true,
    lastTrigger: '2024-01-15T15:30:00Z',
    totalTriggers: 1247,
    successRate: 98.5,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T15:30:00Z'
  },
  {
    id: '2',
    erpType: 'ixcsoft',
    url: 'https://api.pytake.net/api/v1/erp/ixcsoft/webhook',
    secret: 'webhook_secret_456',
    events: [
      'customer.created',
      'invoice.created',
      'invoice.paid'
    ],
    isActive: true,
    lastTrigger: '2024-01-15T12:15:00Z',
    totalTriggers: 567,
    successRate: 99.2,
    createdAt: '2024-01-05T00:00:00Z',
    updatedAt: '2024-01-15T12:15:00Z'
  }
]

export const MOCK_ERP_OVERVIEW: ERPIntegrationOverview = {
  totalIntegrations: 4,
  activeIntegrations: 2,
  errorIntegrations: 1,
  totalCustomers: 4648,
  totalInvoices: 27899,
  totalTickets: 90,
  overdueInvoices: 479,
  openTickets: 67,
  lastSyncTime: '2024-01-15T17:30:00Z',
  healthScore: 87
}