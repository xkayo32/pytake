export interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  avatar?: string
  
  // WhatsApp Info
  whatsappId?: string
  profilePicture?: string
  about?: string
  isWhatsAppBusiness?: boolean
  
  // Personal Info
  birthDate?: string
  gender?: 'male' | 'female' | 'other'
  company?: string
  position?: string
  
  // Address
  address?: {
    street?: string
    number?: string
    complement?: string
    neighborhood?: string
    city?: string
    state?: string
    country?: string
    zipCode?: string
  }
  
  // Social Media
  social?: {
    instagram?: string
    facebook?: string
    linkedin?: string
    twitter?: string
    website?: string
  }
  
  // CRM Info
  tags: string[]
  groups: string[]
  customFields?: Record<string, any>
  notes?: string
  
  // Interaction Stats
  stats: {
    totalMessages: number
    lastMessage?: string
    firstMessage?: string
    totalConversations: number
    avgResponseTime?: number
  }
  
  // Status
  status: 'active' | 'inactive' | 'blocked'
  source: 'whatsapp' | 'manual' | 'import' | 'api' | 'campaign'
  
  // Timestamps
  createdAt: string
  updatedAt: string
  lastInteraction?: string
  
  // LGPD/GDPR
  consent?: {
    marketing: boolean
    dataProcessing: boolean
    consentDate?: string
  }
}

export interface ContactGroup {
  id: string
  name: string
  description?: string
  color: string
  icon?: string
  contactCount: number
  createdAt: string
  updatedAt: string
}

export interface ContactTag {
  id: string
  name: string
  color: string
  count: number
}

export interface ContactImport {
  file: File
  mapping: Record<string, string>
  options: {
    updateExisting: boolean
    skipDuplicates: boolean
    addToGroup?: string
    addTags?: string[]
  }
}

// Mock data
export const MOCK_CONTACTS: Contact[] = [
  {
    id: '1',
    name: 'João Silva',
    phone: '+55 11 99999-1234',
    email: 'joao.silva@email.com',
    whatsappId: '5511999991234',
    profilePicture: 'https://ui-avatars.com/api/?name=João+Silva&background=25D366&color=fff',
    about: 'Empreendedor | CEO da TechCorp',
    isWhatsAppBusiness: false,
    birthDate: '1985-06-15',
    gender: 'male',
    company: 'TechCorp',
    position: 'CEO',
    address: {
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil'
    },
    social: {
      linkedin: 'joaosilva',
      website: 'www.techcorp.com.br'
    },
    tags: ['vip', 'cliente-ouro', 'tech'],
    groups: ['Clientes Premium', 'Empresários'],
    notes: 'Cliente desde 2020. Sempre pontual nos pagamentos.',
    stats: {
      totalMessages: 342,
      lastMessage: '2024-01-15T14:30:00Z',
      firstMessage: '2020-03-10T09:00:00Z',
      totalConversations: 28,
      avgResponseTime: 120
    },
    status: 'active',
    source: 'whatsapp',
    createdAt: '2020-03-10T09:00:00Z',
    updatedAt: '2024-01-15T14:30:00Z',
    lastInteraction: '2024-01-15T14:30:00Z',
    consent: {
      marketing: true,
      dataProcessing: true,
      consentDate: '2020-03-10T09:00:00Z'
    }
  },
  {
    id: '2',
    name: 'Maria Santos',
    phone: '+55 11 98888-5678',
    email: 'maria@empresa.com',
    whatsappId: '5511988885678',
    profilePicture: 'https://ui-avatars.com/api/?name=Maria+Santos&background=25D366&color=fff',
    isWhatsAppBusiness: true,
    company: 'Boutique Maria',
    position: 'Proprietária',
    address: {
      city: 'São Paulo',
      state: 'SP',
      country: 'Brasil'
    },
    tags: ['loja', 'varejo', 'moda'],
    groups: ['Lojistas', 'Clientes'],
    stats: {
      totalMessages: 156,
      lastMessage: '2024-01-14T11:20:00Z',
      firstMessage: '2021-08-22T10:00:00Z',
      totalConversations: 12,
      avgResponseTime: 180
    },
    status: 'active',
    source: 'manual',
    createdAt: '2021-08-22T10:00:00Z',
    updatedAt: '2024-01-14T11:20:00Z',
    lastInteraction: '2024-01-14T11:20:00Z'
  },
  {
    id: '3',
    name: 'Carlos Lima',
    phone: '+55 11 97777-9012',
    email: 'carlos.lima@gmail.com',
    whatsappId: '5511977779012',
    profilePicture: 'https://ui-avatars.com/api/?name=Carlos+Lima&background=25D366&color=fff',
    birthDate: '1990-12-03',
    gender: 'male',
    tags: ['lead', 'potencial'],
    groups: ['Leads'],
    stats: {
      totalMessages: 23,
      lastMessage: '2024-01-13T16:45:00Z',
      firstMessage: '2024-01-05T14:00:00Z',
      totalConversations: 3,
      avgResponseTime: 300
    },
    status: 'active',
    source: 'campaign',
    createdAt: '2024-01-05T14:00:00Z',
    updatedAt: '2024-01-13T16:45:00Z',
    lastInteraction: '2024-01-13T16:45:00Z'
  },
  {
    id: '4',
    name: 'Ana Costa',
    phone: '+55 11 96666-3456',
    email: 'ana.costa@outlook.com',
    whatsappId: '5511966663456',
    profilePicture: 'https://ui-avatars.com/api/?name=Ana+Costa&background=25D366&color=fff',
    about: 'Consultora de Marketing Digital',
    birthDate: '1988-04-20',
    gender: 'female',
    company: 'AC Marketing',
    position: 'Consultora',
    social: {
      instagram: '@anacosta',
      linkedin: 'ana-costa-marketing'
    },
    tags: ['parceiro', 'marketing', 'consultor'],
    groups: ['Parceiros', 'Fornecedores'],
    customFields: {
      nivelParceria: 'Gold',
      ultimoProjeto: 'Campanha Black Friday 2023'
    },
    stats: {
      totalMessages: 89,
      lastMessage: '2024-01-12T09:30:00Z',
      firstMessage: '2022-05-15T11:00:00Z',
      totalConversations: 15,
      avgResponseTime: 90
    },
    status: 'active',
    source: 'whatsapp',
    createdAt: '2022-05-15T11:00:00Z',
    updatedAt: '2024-01-12T09:30:00Z',
    lastInteraction: '2024-01-12T09:30:00Z',
    consent: {
      marketing: true,
      dataProcessing: true,
      consentDate: '2022-05-15T11:00:00Z'
    }
  },
  {
    id: '5',
    name: 'Roberto Alves',
    phone: '+55 21 99999-8765',
    email: 'roberto@empresa.rio',
    whatsappId: '5521999998765',
    profilePicture: 'https://ui-avatars.com/api/?name=Roberto+Alves&background=25D366&color=fff',
    company: 'Rio Tech Solutions',
    position: 'Diretor Técnico',
    address: {
      city: 'Rio de Janeiro',
      state: 'RJ',
      country: 'Brasil'
    },
    tags: ['cliente', 'suporte-vip', 'rio'],
    groups: ['Clientes', 'Rio de Janeiro'],
    notes: 'Prefere contato pela manhã. Contrato de suporte premium.',
    stats: {
      totalMessages: 203,
      lastMessage: '2024-01-15T08:15:00Z',
      firstMessage: '2021-02-10T14:00:00Z',
      totalConversations: 45,
      avgResponseTime: 60
    },
    status: 'active',
    source: 'import',
    createdAt: '2021-02-10T14:00:00Z',
    updatedAt: '2024-01-15T08:15:00Z',
    lastInteraction: '2024-01-15T08:15:00Z'
  },
  {
    id: '6',
    name: 'Fernanda Oliveira',
    phone: '+55 11 95555-2222',
    whatsappId: '5511955552222',
    profilePicture: 'https://ui-avatars.com/api/?name=Fernanda+Oliveira&background=25D366&color=fff',
    tags: ['inativo', 'reativar'],
    groups: ['Inativos'],
    stats: {
      totalMessages: 12,
      lastMessage: '2023-08-20T15:00:00Z',
      firstMessage: '2023-06-01T10:00:00Z',
      totalConversations: 2,
      avgResponseTime: 240
    },
    status: 'inactive',
    source: 'whatsapp',
    createdAt: '2023-06-01T10:00:00Z',
    updatedAt: '2023-08-20T15:00:00Z',
    lastInteraction: '2023-08-20T15:00:00Z'
  },
  {
    id: '7',
    name: 'Pedro Henrique',
    phone: '+55 31 98888-1111',
    email: 'pedro@minastech.com',
    whatsappId: '5531988881111',
    profilePicture: 'https://ui-avatars.com/api/?name=Pedro+Henrique&background=25D366&color=fff',
    company: 'Minas Tech',
    position: 'Desenvolvedor',
    address: {
      city: 'Belo Horizonte',
      state: 'MG',
      country: 'Brasil'
    },
    tags: ['desenvolvedor', 'tech', 'mg'],
    groups: ['Tech', 'Minas Gerais'],
    stats: {
      totalMessages: 67,
      lastMessage: '2024-01-14T17:30:00Z',
      firstMessage: '2023-09-15T09:00:00Z',
      totalConversations: 8,
      avgResponseTime: 150
    },
    status: 'active',
    source: 'api',
    createdAt: '2023-09-15T09:00:00Z',
    updatedAt: '2024-01-14T17:30:00Z',
    lastInteraction: '2024-01-14T17:30:00Z'
  },
  {
    id: '8',
    name: 'Spam User',
    phone: '+55 11 90000-0000',
    whatsappId: '5511900000000',
    profilePicture: 'https://ui-avatars.com/api/?name=Spam&background=dc2626&color=fff',
    tags: ['spam', 'bloqueado'],
    groups: ['Bloqueados'],
    stats: {
      totalMessages: 3,
      lastMessage: '2024-01-01T12:00:00Z',
      firstMessage: '2024-01-01T12:00:00Z',
      totalConversations: 1,
      avgResponseTime: 0
    },
    status: 'blocked',
    source: 'whatsapp',
    createdAt: '2024-01-01T12:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
    lastInteraction: '2024-01-01T12:00:00Z'
  }
]

export const MOCK_GROUPS: ContactGroup[] = [
  {
    id: '1',
    name: 'Clientes Premium',
    description: 'Clientes com plano premium ou VIP',
    color: '#FFD700',
    icon: '⭐',
    contactCount: 45,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '2',
    name: 'Leads',
    description: 'Potenciais clientes em prospecção',
    color: '#3B82F6',
    icon: '🎯',
    contactCount: 128,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '3',
    name: 'Parceiros',
    description: 'Parceiros e fornecedores',
    color: '#10B981',
    icon: '🤝',
    contactCount: 23,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '4',
    name: 'Inativos',
    description: 'Contatos sem interação há mais de 90 dias',
    color: '#6B7280',
    icon: '😴',
    contactCount: 67,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  },
  {
    id: '5',
    name: 'Bloqueados',
    description: 'Contatos bloqueados ou spam',
    color: '#DC2626',
    icon: '🚫',
    contactCount: 12,
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: '2024-01-15T00:00:00Z'
  }
]

export const MOCK_TAGS: ContactTag[] = [
  { id: '1', name: 'vip', color: '#FFD700', count: 15 },
  { id: '2', name: 'cliente', color: '#10B981', count: 89 },
  { id: '3', name: 'lead', color: '#3B82F6', count: 128 },
  { id: '4', name: 'parceiro', color: '#8B5CF6', count: 23 },
  { id: '5', name: 'fornecedor', color: '#EC4899', count: 18 },
  { id: '6', name: 'tech', color: '#06B6D4', count: 34 },
  { id: '7', name: 'varejo', color: '#F59E0B', count: 45 },
  { id: '8', name: 'suporte', color: '#EF4444', count: 67 },
  { id: '9', name: 'marketing', color: '#84CC16', count: 29 },
  { id: '10', name: 'inativo', color: '#6B7280', count: 67 }
]