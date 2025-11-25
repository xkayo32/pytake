export type UserRole = 'admin' | 'manager' | 'agent' | 'viewer'
export type UserStatus = 'active' | 'inactive' | 'pending' | 'suspended'
export type Permission = 
  | 'conversations.view' | 'conversations.create' | 'conversations.edit' | 'conversations.delete'
  | 'contacts.view' | 'contacts.create' | 'contacts.edit' | 'contacts.delete' | 'contacts.import'
  | 'campaigns.view' | 'campaigns.create' | 'campaigns.edit' | 'campaigns.delete' | 'campaigns.send'
  | 'flows.view' | 'flows.create' | 'flows.edit' | 'flows.delete' | 'flows.publish'
  | 'templates.view' | 'templates.create' | 'templates.edit' | 'templates.delete' | 'templates.approve'
  | 'automations.view' | 'automations.create' | 'automations.edit' | 'automations.delete'
  | 'reports.view' | 'reports.create' | 'reports.edit' | 'reports.delete' | 'reports.export'
  | 'analytics.view' | 'analytics.export'
  | 'settings.view' | 'settings.edit' | 'settings.whatsapp' | 'settings.integrations'
  | 'team.view' | 'team.invite' | 'team.edit' | 'team.delete'
  | 'billing.view' | 'billing.edit'

export type NotificationType = 'email' | 'push' | 'sms' | 'whatsapp'
export type NotificationFrequency = 'instant' | 'hourly' | 'daily' | 'weekly' | 'never'
export type Theme = 'light' | 'dark' | 'system'
export type Language = 'pt' | 'en' | 'es'

export interface UserPermissions {
  role: UserRole
  permissions: Permission[]
  restrictedHours?: {
    start: string // HH:MM
    end: string // HH:MM
    timezone: string
  }
  maxConversations?: number
  maxCampaigns?: number
  allowedWhatsAppNumbers?: string[]
}

export interface NotificationSettings {
  email: {
    enabled: boolean
    newMessage: NotificationFrequency
    newConversation: NotificationFrequency
    campaignComplete: NotificationFrequency
    systemAlerts: NotificationFrequency
    weeklyReport: boolean
    monthlyReport: boolean
  }
  push: {
    enabled: boolean
    newMessage: NotificationFrequency
    newConversation: NotificationFrequency
    mentions: NotificationFrequency
    systemAlerts: NotificationFrequency
  }
  sms: {
    enabled: boolean
    emergencyOnly: boolean
    systemDown: boolean
  }
  whatsapp: {
    enabled: boolean
    dailySummary: boolean
    weeklyReport: boolean
  }
}

export interface UserPreferences {
  theme: Theme
  language: Language
  timezone: string
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
  timeFormat: '12h' | '24h'
  defaultView: 'list' | 'grid' | 'cards'
  conversationsPerPage: number
  autoRefresh: boolean
  autoRefreshInterval: number // seconds
  soundNotifications: boolean
  compactMode: boolean
}

export interface UserProfile {
  id: string
  name: string
  email: string
  phone?: string
  avatar?: string
  title?: string
  department?: string
  bio?: string
  location?: string
  whatsappNumber?: string
  
  // Authentication
  emailVerified: boolean
  phoneVerified: boolean
  twoFactorEnabled: boolean
  lastPasswordChange: string
  
  // Activity
  status: UserStatus
  lastLogin?: string
  lastActivity?: string
  loginCount: number
  createdAt: string
  updatedAt: string
  
  // Settings
  permissions: UserPermissions
  notifications: NotificationSettings
  preferences: UserPreferences
  
  // Statistics
  stats: {
    totalConversations: number
    totalMessages: number
    avgResponseTime: number // seconds
    satisfaction: number // 0-100
    campaignsSent: number
    reportsCreated: number
    activeToday: boolean
    hoursWorked: number
  }
  
  // Team info
  managerId?: string
  teamId?: string
  createdBy: string
  invitedBy?: string
  invitedAt?: string
}

export interface Team {
  id: string
  name: string
  description?: string
  color?: string
  managerId: string
  members: string[] // User IDs
  permissions: Permission[]
  settings: {
    autoAssignConversations: boolean
    maxConversationsPerAgent: number
    workingHours: {
      enabled: boolean
      start: string
      end: string
      timezone: string
      weekdays: number[] // 0-6
    }
    roundRobinAssignment: boolean
    escalationRules: {
      enabled: boolean
      timeoutMinutes: number
      escalateToManagerId?: string
    }
  }
  stats: {
    totalMembers: number
    activeMembers: number
    totalConversations: number
    avgResponseTime: number
    satisfaction: number
  }
  createdAt: string
  updatedAt: string
  createdBy: string
}

export interface Invitation {
  id: string
  email: string
  role: UserRole
  teamId?: string
  permissions?: Permission[]
  invitedBy: string
  invitedAt: string
  expiresAt: string
  acceptedAt?: string
  declinedAt?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  message?: string
}

export interface UserActivity {
  id: string
  userId: string
  action: string
  description: string
  metadata?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  timestamp: string
}

export interface SessionInfo {
  id: string
  userId: string
  ipAddress: string
  userAgent: string
  location?: string
  device: string
  browser: string
  isCurrent: boolean
  createdAt: string
  lastActivity: string
  expiresAt: string
}

// Mock data
export const MOCK_USERS: UserProfile[] = [
  {
    id: '1',
    name: 'João Silva',
    email: 'joao.silva@empresa.com',
    phone: '+55 11 99999-1234',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150',
    title: 'Gerente de Atendimento',
    department: 'Atendimento',
    bio: 'Especialista em atendimento ao cliente com 8 anos de experiência',
    location: 'São Paulo, SP',
    whatsappNumber: '+55 11 99999-1234',
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    lastPasswordChange: '2024-01-01T00:00:00Z',
    status: 'active',
    lastLogin: '2024-01-15T16:30:00Z',
    lastActivity: '2024-01-15T17:45:00Z',
    loginCount: 342,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T17:45:00Z',
    permissions: {
      role: 'manager',
      permissions: [
        'conversations.view', 'conversations.create', 'conversations.edit',
        'contacts.view', 'contacts.create', 'contacts.edit', 'contacts.import',
        'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.send',
        'reports.view', 'reports.create', 'reports.export',
        'analytics.view', 'analytics.export',
        'team.view', 'team.invite', 'team.edit'
      ],
      maxConversations: 50,
      maxCampaigns: 10
    },
    notifications: {
      email: {
        enabled: true,
        newMessage: 'instant',
        newConversation: 'instant',
        campaignComplete: 'instant',
        systemAlerts: 'instant',
        weeklyReport: true,
        monthlyReport: true
      },
      push: {
        enabled: true,
        newMessage: 'instant',
        newConversation: 'instant',
        mentions: 'instant',
        systemAlerts: 'instant'
      },
      sms: {
        enabled: false,
        emergencyOnly: true,
        systemDown: true
      },
      whatsapp: {
        enabled: true,
        dailySummary: true,
        weeklyReport: false
      }
    },
    preferences: {
      theme: 'light',
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      defaultView: 'list',
      conversationsPerPage: 25,
      autoRefresh: true,
      autoRefreshInterval: 30,
      soundNotifications: true,
      compactMode: false
    },
    stats: {
      totalConversations: 1245,
      totalMessages: 8934,
      avgResponseTime: 120,
      satisfaction: 94,
      campaignsSent: 23,
      reportsCreated: 15,
      activeToday: true,
      hoursWorked: 8.5
    },
    teamId: '1',
    createdBy: 'system'
  },
  {
    id: '2',
    name: 'Maria Santos',
    email: 'maria.santos@empresa.com',
    phone: '+55 11 98888-5678',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612c1e3?w=150',
    title: 'Agente de Atendimento',
    department: 'Atendimento',
    location: 'Rio de Janeiro, RJ',
    whatsappNumber: '+55 11 98888-5678',
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: false,
    lastPasswordChange: '2023-12-15T00:00:00Z',
    status: 'active',
    lastLogin: '2024-01-15T14:20:00Z',
    lastActivity: '2024-01-15T17:30:00Z',
    loginCount: 156,
    createdAt: '2023-08-15T00:00:00Z',
    updatedAt: '2024-01-15T17:30:00Z',
    permissions: {
      role: 'agent',
      permissions: [
        'conversations.view', 'conversations.create', 'conversations.edit',
        'contacts.view', 'contacts.create', 'contacts.edit',
        'templates.view',
        'reports.view'
      ],
      restrictedHours: {
        start: '08:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo'
      },
      maxConversations: 25
    },
    notifications: {
      email: {
        enabled: true,
        newMessage: 'hourly',
        newConversation: 'instant',
        campaignComplete: 'daily',
        systemAlerts: 'instant',
        weeklyReport: false,
        monthlyReport: false
      },
      push: {
        enabled: true,
        newMessage: 'instant',
        newConversation: 'instant',
        mentions: 'instant',
        systemAlerts: 'instant'
      },
      sms: {
        enabled: false,
        emergencyOnly: false,
        systemDown: false
      },
      whatsapp: {
        enabled: false,
        dailySummary: false,
        weeklyReport: false
      }
    },
    preferences: {
      theme: 'system',
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      defaultView: 'grid',
      conversationsPerPage: 20,
      autoRefresh: true,
      autoRefreshInterval: 15,
      soundNotifications: true,
      compactMode: true
    },
    stats: {
      totalConversations: 687,
      totalMessages: 4521,
      avgResponseTime: 89,
      satisfaction: 96,
      campaignsSent: 0,
      reportsCreated: 3,
      activeToday: true,
      hoursWorked: 7.2
    },
    managerId: '1',
    teamId: '1',
    createdBy: '1'
  },
  {
    id: '3',
    name: 'Carlos Lima',
    email: 'carlos.lima@empresa.com',
    phone: '+55 11 97777-9012',
    title: 'Analista de Marketing',
    department: 'Marketing',
    location: 'Brasília, DF',
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: true,
    lastPasswordChange: '2024-01-10T00:00:00Z',
    status: 'active',
    lastLogin: '2024-01-15T15:45:00Z',
    lastActivity: '2024-01-15T16:20:00Z',
    loginCount: 89,
    createdAt: '2023-10-01T00:00:00Z',
    updatedAt: '2024-01-15T16:20:00Z',
    permissions: {
      role: 'agent',
      permissions: [
        'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.send',
        'contacts.view', 'contacts.import',
        'templates.view', 'templates.create', 'templates.edit',
        'reports.view', 'reports.create', 'reports.export',
        'analytics.view', 'analytics.export'
      ],
      maxCampaigns: 20
    },
    notifications: {
      email: {
        enabled: true,
        newMessage: 'never',
        newConversation: 'never',
        campaignComplete: 'instant',
        systemAlerts: 'instant',
        weeklyReport: true,
        monthlyReport: true
      },
      push: {
        enabled: false,
        newMessage: 'never',
        newConversation: 'never',
        mentions: 'instant',
        systemAlerts: 'instant'
      },
      sms: {
        enabled: false,
        emergencyOnly: false,
        systemDown: false
      },
      whatsapp: {
        enabled: true,
        dailySummary: false,
        weeklyReport: true
      }
    },
    preferences: {
      theme: 'dark',
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '12h',
      defaultView: 'cards',
      conversationsPerPage: 15,
      autoRefresh: false,
      autoRefreshInterval: 60,
      soundNotifications: false,
      compactMode: false
    },
    stats: {
      totalConversations: 123,
      totalMessages: 456,
      avgResponseTime: 245,
      satisfaction: 87,
      campaignsSent: 45,
      reportsCreated: 28,
      activeToday: true,
      hoursWorked: 6.8
    },
    teamId: '2',
    createdBy: '1'
  },
  {
    id: '4',
    name: 'Ana Costa',
    email: 'ana.costa@empresa.com',
    phone: '+55 11 96666-3456',
    title: 'Supervisora',
    department: 'Atendimento',
    location: 'São Paulo, SP',
    emailVerified: true,
    phoneVerified: true,
    twoFactorEnabled: true,
    lastPasswordChange: '2023-11-20T00:00:00Z',
    status: 'active',
    lastLogin: '2024-01-15T17:00:00Z',
    lastActivity: '2024-01-15T17:15:00Z',
    loginCount: 234,
    createdAt: '2023-07-01T00:00:00Z',
    updatedAt: '2024-01-15T17:15:00Z',
    permissions: {
      role: 'manager',
      permissions: [
        'conversations.view', 'conversations.edit',
        'contacts.view', 'contacts.edit',
        'flows.view', 'flows.edit', 'flows.publish',
        'automations.view', 'automations.edit',
        'reports.view', 'reports.create', 'reports.export',
        'analytics.view',
        'team.view', 'team.edit'
      ],
      maxConversations: 40
    },
    notifications: {
      email: {
        enabled: true,
        newMessage: 'hourly',
        newConversation: 'hourly',
        campaignComplete: 'instant',
        systemAlerts: 'instant',
        weeklyReport: true,
        monthlyReport: false
      },
      push: {
        enabled: true,
        newMessage: 'hourly',
        newConversation: 'instant',
        mentions: 'instant',
        systemAlerts: 'instant'
      },
      sms: {
        enabled: true,
        emergencyOnly: true,
        systemDown: true
      },
      whatsapp: {
        enabled: true,
        dailySummary: true,
        weeklyReport: false
      }
    },
    preferences: {
      theme: 'light',
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      defaultView: 'list',
      conversationsPerPage: 30,
      autoRefresh: true,
      autoRefreshInterval: 20,
      soundNotifications: true,
      compactMode: false
    },
    stats: {
      totalConversations: 892,
      totalMessages: 5643,
      avgResponseTime: 156,
      satisfaction: 91,
      campaignsSent: 12,
      reportsCreated: 35,
      activeToday: true,
      hoursWorked: 8.0
    },
    managerId: '1',
    teamId: '1',
    createdBy: '1'
  },
  {
    id: '5',
    name: 'Roberto Alves',
    email: 'roberto.alves@empresa.com',
    title: 'Visualizador',
    department: 'Diretoria',
    emailVerified: true,
    phoneVerified: false,
    twoFactorEnabled: false,
    lastPasswordChange: '2023-09-01T00:00:00Z',
    status: 'inactive',
    lastLogin: '2024-01-10T10:30:00Z',
    lastActivity: '2024-01-10T11:00:00Z',
    loginCount: 45,
    createdAt: '2023-09-01T00:00:00Z',
    updatedAt: '2024-01-10T11:00:00Z',
    permissions: {
      role: 'viewer',
      permissions: [
        'conversations.view',
        'contacts.view',
        'campaigns.view',
        'reports.view',
        'analytics.view'
      ]
    },
    notifications: {
      email: {
        enabled: true,
        newMessage: 'never',
        newConversation: 'never',
        campaignComplete: 'never',
        systemAlerts: 'weekly',
        weeklyReport: true,
        monthlyReport: true
      },
      push: {
        enabled: false,
        newMessage: 'never',
        newConversation: 'never',
        mentions: 'never',
        systemAlerts: 'never'
      },
      sms: {
        enabled: false,
        emergencyOnly: false,
        systemDown: false
      },
      whatsapp: {
        enabled: false,
        dailySummary: false,
        weeklyReport: false
      }
    },
    preferences: {
      theme: 'system',
      language: 'pt',
      timezone: 'America/Sao_Paulo',
      dateFormat: 'DD/MM/YYYY',
      timeFormat: '24h',
      defaultView: 'list',
      conversationsPerPage: 50,
      autoRefresh: false,
      autoRefreshInterval: 120,
      soundNotifications: false,
      compactMode: true
    },
    stats: {
      totalConversations: 0,
      totalMessages: 0,
      avgResponseTime: 0,
      satisfaction: 0,
      campaignsSent: 0,
      reportsCreated: 8,
      activeToday: false,
      hoursWorked: 0
    },
    createdBy: '1'
  }
]

export const MOCK_TEAMS: Team[] = [
  {
    id: '1',
    name: 'Atendimento',
    description: 'Equipe responsável pelo atendimento direto aos clientes',
    color: '#10B981',
    managerId: '1',
    members: ['1', '2', '4'],
    permissions: [
      'conversations.view', 'conversations.create', 'conversations.edit',
      'contacts.view', 'contacts.create', 'contacts.edit',
      'templates.view'
    ],
    settings: {
      autoAssignConversations: true,
      maxConversationsPerAgent: 25,
      workingHours: {
        enabled: true,
        start: '08:00',
        end: '18:00',
        timezone: 'America/Sao_Paulo',
        weekdays: [1, 2, 3, 4, 5]
      },
      roundRobinAssignment: true,
      escalationRules: {
        enabled: true,
        timeoutMinutes: 30,
        escalateToManagerId: '1'
      }
    },
    stats: {
      totalMembers: 3,
      activeMembers: 3,
      totalConversations: 2824,
      avgResponseTime: 122,
      satisfaction: 94
    },
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2024-01-15T17:00:00Z',
    createdBy: '1'
  },
  {
    id: '2',
    name: 'Marketing',
    description: 'Equipe responsável por campanhas e estratégias de marketing',
    color: '#3B82F6',
    managerId: '3',
    members: ['3'],
    permissions: [
      'campaigns.view', 'campaigns.create', 'campaigns.edit', 'campaigns.send',
      'contacts.view', 'contacts.import',
      'templates.view', 'templates.create', 'templates.edit',
      'reports.view', 'reports.create', 'reports.export',
      'analytics.view', 'analytics.export'
    ],
    settings: {
      autoAssignConversations: false,
      maxConversationsPerAgent: 10,
      workingHours: {
        enabled: true,
        start: '09:00',
        end: '17:00',
        timezone: 'America/Sao_Paulo',
        weekdays: [1, 2, 3, 4, 5]
      },
      roundRobinAssignment: false,
      escalationRules: {
        enabled: false,
        timeoutMinutes: 60
      }
    },
    stats: {
      totalMembers: 1,
      activeMembers: 1,
      totalConversations: 123,
      avgResponseTime: 245,
      satisfaction: 87
    },
    createdAt: '2023-10-01T00:00:00Z',
    updatedAt: '2024-01-15T16:20:00Z',
    createdBy: '1'
  }
]

export const MOCK_INVITATIONS: Invitation[] = [
  {
    id: '1',
    email: 'pedro.oliveira@empresa.com',
    role: 'agent',
    teamId: '1',
    invitedBy: '1',
    invitedAt: '2024-01-14T10:00:00Z',
    expiresAt: '2024-01-21T10:00:00Z',
    status: 'pending',
    message: 'Bem-vindo à equipe de atendimento!'
  },
  {
    id: '2',
    email: 'julia.fernandes@empresa.com',
    role: 'manager',
    invitedBy: '1',
    invitedAt: '2024-01-13T15:30:00Z',
    expiresAt: '2024-01-20T15:30:00Z',
    acceptedAt: '2024-01-13T16:45:00Z',
    status: 'accepted'
  },
  {
    id: '3',
    email: 'lucas.martinez@empresa.com',
    role: 'agent',
    teamId: '2',
    invitedBy: '3',
    invitedAt: '2024-01-12T09:00:00Z',
    expiresAt: '2024-01-19T09:00:00Z',
    declinedAt: '2024-01-12T14:20:00Z',
    status: 'declined'
  }
]