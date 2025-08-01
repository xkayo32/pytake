// User types
export interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'agent' | 'supervisor'
  status: 'active' | 'inactive' | 'away' | 'busy'
  avatar?: string
  phone?: string
  department?: string
  createdAt: string
  lastActiveAt?: string
}

// Platform types
export type Platform = 
  | 'whatsapp' 
  | 'instagram' 
  | 'facebook' 
  | 'telegram' 
  | 'webchat' 
  | 'sms' 
  | 'email'
  | 'discord'
  | 'slack'
  | 'linkedin'
  | 'teams'

export interface PlatformInfo {
  id: Platform
  name: string
  displayName: string
  icon: string
  color: string
  enabled: boolean
  connected: boolean
}

// Message types
export interface Message {
  id: string
  conversationId: string
  platform: Platform
  direction: 'inbound' | 'outbound'
  content: MessageContent
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  sentAt: string
  deliveredAt?: string
  readAt?: string
  failedAt?: string
  failureReason?: string
  senderId?: string
  senderName?: string
  replyToId?: string
  metadata?: Record<string, any>
}

export type MessageContent = 
  | { type: 'text'; body: string }
  | { type: 'image'; url: string; caption?: string; filename?: string }
  | { type: 'document'; url: string; filename: string; mimeType: string }
  | { type: 'audio'; url: string; duration?: number }
  | { type: 'video'; url: string; caption?: string; duration?: number }
  | { type: 'location'; latitude: number; longitude: number; address?: string }
  | { type: 'contact'; name: string; phone: string }

// Conversation types
export interface Conversation {
  id: string
  platform: Platform
  contactPhone: string
  contactName?: string
  contactAvatar?: string
  status: 'active' | 'resolved' | 'pending' | 'closed'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  assignedUserId?: string
  assignedUser?: User
  lastMessage?: Message
  unreadCount: number
  createdAt: string
  updatedAt: string
  resolvedAt?: string
  tags?: string[]
  notes?: string
  isActive: boolean
}

// Template types
export interface ResponseTemplate {
  id: string
  name: string
  content: string
  category: 'greeting' | 'closing' | 'faq' | 'escalation' | 'follow_up' | 'custom'
  platform?: Platform[]
  isActive: boolean
  shortcut?: string
  variables?: string[]
  createdBy: string
  createdAt: string
  updatedAt: string
}

// Auth types
export interface AuthTokens {
  accessToken: string
  refreshToken: string
  expiresAt: number
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  user: User
  tokens: AuthTokens
}

// API types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

// Metrics types
export interface ConversationMetrics {
  totalConversations: number
  activeConversations: number
  resolvedConversations: number
  averageResponseTime: number
  averageResolutionTime: number
  satisfactionRate: number
}

export interface MessageMetrics {
  totalSent: number
  totalDelivered: number
  totalFailed: number
  deliveryRate: number
  responseRate: number
}

export interface PlatformMetrics {
  platform: Platform
  conversations: number
  messages: number
  responseTime: number
  satisfactionRate: number
}

// WebSocket types
export interface WebSocketMessage {
  type: 'message' | 'conversation_update' | 'user_status' | 'notification'
  data: any
  timestamp: string
}

// Form types
export interface ConversationFilters {
  platform?: Platform[]
  status?: Conversation['status'][]
  priority?: Conversation['priority'][]
  assignedUserId?: string
  dateRange?: {
    start: string
    end: string
  }
  search?: string
}

// Settings types
export interface PlatformSettings {
  platform: Platform
  enabled: boolean
  config: Record<string, any>
  webhookUrl?: string
  apiKey?: string
  secretKey?: string
}

export interface NotificationSettings {
  email: boolean
  push: boolean
  desktop: boolean
  sound: boolean
  vibration: boolean
}

export interface UserSettings {
  notifications: NotificationSettings
  autoAssignment: boolean
  workingHours: {
    enabled: boolean
    start: string
    end: string
    timezone: string
    workingDays: number[]
  }
  signature?: string
  language: string
  theme: 'light' | 'dark' | 'system'
}