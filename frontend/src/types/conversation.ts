export interface Message {
  id: string
  conversationId: string
  content: string
  sender: 'user' | 'agent'
  timestamp: Date
  status: 'sent' | 'delivered' | 'read'
  attachments?: {
    type: 'image' | 'document' | 'audio'
    url: string
    name: string
  }[]
}

export interface Conversation {
  id: string
  contactName: string
  contactPhone: string
  contactAvatar?: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  status: 'active' | 'pending' | 'resolved'
  assignedAgent?: string
  tags: string[]
  channel: 'whatsapp' | 'webchat' | 'instagram'
}