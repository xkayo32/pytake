import api from './auth'

export interface Conversation {
  id: string
  tenant_id: string
  contact_id: string
  whatsapp_config_id?: string
  status: 'active' | 'closed' | 'waiting' | 'assigned'
  unread_count: number
  last_message?: string
  last_message_time?: string
  assigned_to?: string
  tags?: string[]
  metadata?: any
  created_at: string
  updated_at: string
  
  // Populated fields
  contact?: Contact
  assigned_agent?: Agent
}

export interface Contact {
  id: string
  name?: string
  phone: string
  email?: string
  avatar?: string
  tags?: string[]
  metadata?: any
}

export interface Agent {
  id: string
  name: string
  email: string
  status: 'online' | 'offline' | 'busy'
}

export interface Message {
  id: string
  conversation_id: string
  sender_type: 'contact' | 'agent' | 'system' | 'bot'
  sender_id?: string
  content: string
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'template'
  whatsapp_message_id?: string
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  metadata?: any
  created_at: string
  
  // Populated fields
  sender_name?: string
  sender_phone?: string
}

export interface MessageInput {
  content: string
  message_type?: 'text' | 'image' | 'document' | 'audio' | 'video'
  metadata?: any
}

export interface ConversationStats {
  active_conversations: number
  messages_today: number
  unread_count: number
  avg_response_time?: number
  total_conversations?: number
}

export const conversationsApi = {
  // Get all conversations
  getConversations: async (params?: {
    status?: string
    limit?: number
    offset?: number
    search?: string
  }): Promise<Conversation[]> => {
    const queryParams = new URLSearchParams()
    if (params?.status) queryParams.append('status', params.status)
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.search) queryParams.append('search', params.search)
    
    const response = await api.get(`/api/v1/conversations?${queryParams}`)
    return response.data || []
  },

  // Get conversation by ID
  getConversation: async (id: string): Promise<Conversation | null> => {
    try {
      const response = await api.get(`/api/v1/conversations/${id}`)
      return response.data
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  },

  // Get conversation messages
  getMessages: async (conversationId: string, params?: {
    limit?: number
    offset?: number
    before?: string
  }): Promise<Message[]> => {
    const queryParams = new URLSearchParams()
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    if (params?.offset) queryParams.append('offset', params.offset.toString())
    if (params?.before) queryParams.append('before', params.before)
    
    const response = await api.get(`/api/v1/conversations/${conversationId}/messages?${queryParams}`)
    return response.data || []
  },

  // Send message
  sendMessage: async (conversationId: string, message: MessageInput): Promise<Message> => {
    const response = await api.post(`/api/v1/conversations/${conversationId}/messages`, {
      content: message.content,
      message_type: message.message_type || 'text',
      metadata: message.metadata || {}
    })
    return response.data
  },

  // Mark messages as read
  markAsRead: async (conversationId: string): Promise<void> => {
    await api.patch(`/api/v1/conversations/${conversationId}/read`)
  },

  // Get conversation stats
  getStats: async (): Promise<ConversationStats> => {
    const response = await api.get('/api/v1/conversations/stats')
    return response.data
  },

  // Update conversation status
  updateStatus: async (conversationId: string, status: string): Promise<Conversation> => {
    const response = await api.patch(`/api/v1/conversations/${conversationId}/status`, { status })
    return response.data
  },

  // Assign conversation to agent
  assignToAgent: async (conversationId: string, agentId: string): Promise<Conversation> => {
    const response = await api.patch(`/api/v1/conversations/${conversationId}/assign`, { 
      assigned_to: agentId 
    })
    return response.data
  },

  // Add tags to conversation
  addTags: async (conversationId: string, tags: string[]): Promise<Conversation> => {
    const response = await api.patch(`/api/v1/conversations/${conversationId}/tags`, { tags })
    return response.data
  },

  // Sync conversations (force refresh from WhatsApp)
  syncConversations: async (): Promise<{ synced: number; errors: number }> => {
    const response = await api.post('/api/v1/conversations/sync')
    return response.data
  }
}