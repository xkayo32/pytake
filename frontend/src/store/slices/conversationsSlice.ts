import { create } from 'zustand'
import type { Conversation, ConversationFilters, Message } from '@/types'
import { conversationsApi } from '@/services/api/conversations'

interface ConversationsState {
  conversations: Conversation[]
  selectedConversation: Conversation | null
  messages: Record<string, Message[]>
  isLoading: boolean
  error: string | null
  filters: ConversationFilters
  pagination: {
    page: number
    perPage: number
    total: number
    totalPages: number
  }
}

interface ConversationsActions {
  // Conversations
  fetchConversations: () => Promise<void>
  selectConversation: (conversation: Conversation | null) => void
  updateConversation: (id: string, data: Partial<Conversation>) => Promise<boolean>
  assignConversation: (id: string, userId: string) => Promise<boolean>
  closeConversation: (id: string, notes?: string) => Promise<boolean>
  
  // Messages
  fetchMessages: (conversationId: string) => Promise<void>
  sendMessage: (conversationId: string, content: Message['content'], replyToId?: string) => Promise<boolean>
  addMessage: (message: Message) => void
  updateMessage: (messageId: string, updates: Partial<Message>) => void
  markAsRead: (conversationId: string, messageIds?: string[]) => Promise<void>
  
  // Filters and pagination
  setFilters: (filters: Partial<ConversationFilters>) => void
  setPage: (page: number) => void
  clearError: () => void
  
  // Real-time updates
  handleConversationUpdate: (conversation: Conversation) => void
  handleNewMessage: (message: Message) => void
}

export const useConversationsStore = create<ConversationsState & ConversationsActions>((set, get) => ({
  // State
  conversations: [],
  selectedConversation: null,
  messages: {},
  isLoading: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    perPage: 20,
    total: 0,
    totalPages: 0
  },

  // Actions
  fetchConversations: async () => {
    set({ isLoading: true, error: null })
    
    try {
      const { filters, pagination } = get()
      const response = await conversationsApi.getConversations({
        page: pagination.page,
        perPage: pagination.perPage,
        filters
      })
      
      if (response.success && response.data) {
        set({
          conversations: response.data.data,
          pagination: {
            ...pagination,
            total: response.data.pagination.total,
            totalPages: response.data.pagination.totalPages
          },
          isLoading: false,
          error: null
        })
      } else {
        set({
          error: response.error || 'Failed to fetch conversations',
          isLoading: false
        })
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch conversations',
        isLoading: false
      })
    }
  },

  selectConversation: (conversation: Conversation | null) => {
    set({ selectedConversation: conversation })
    if (conversation) {
      get().fetchMessages(conversation.id)
    }
  },

  updateConversation: async (id: string, data: Partial<Conversation>) => {
    try {
      const response = await conversationsApi.updateConversation(id, data)
      
      if (response.success && response.data) {
        const conversations = get().conversations.map(conv =>
          conv.id === id ? { ...conv, ...response.data } : conv
        )
        
        set({ 
          conversations,
          selectedConversation: get().selectedConversation?.id === id 
            ? { ...get().selectedConversation!, ...response.data }
            : get().selectedConversation
        })
        return true
      } else {
        set({ error: response.error || 'Failed to update conversation' })
        return false
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to update conversation' })
      return false
    }
  },

  assignConversation: async (id: string, userId: string) => {
    try {
      const response = await conversationsApi.assignConversation(id, userId)
      
      if (response.success && response.data) {
        get().handleConversationUpdate(response.data)
        return true
      } else {
        set({ error: response.error || 'Failed to assign conversation' })
        return false
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to assign conversation' })
      return false
    }
  },

  closeConversation: async (id: string, notes?: string) => {
    try {
      const response = await conversationsApi.closeConversation(id, notes)
      
      if (response.success && response.data) {
        get().handleConversationUpdate(response.data)
        return true
      } else {
        set({ error: response.error || 'Failed to close conversation' })
        return false
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to close conversation' })
      return false
    }
  },

  fetchMessages: async (conversationId: string) => {
    try {
      const response = await conversationsApi.getMessages(conversationId, {
        perPage: 50
      })
      
      if (response.success && response.data) {
        set({
          messages: {
            ...get().messages,
            [conversationId]: response.data.data.reverse() // Reverse to show oldest first
          }
        })
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  },

  sendMessage: async (conversationId: string, content: Message['content'], replyToId?: string) => {
    try {
      const response = await conversationsApi.sendMessage(conversationId, {
        content,
        replyToId
      })
      
      if (response.success && response.data) {
        get().addMessage(response.data)
        return true
      } else {
        set({ error: response.error || 'Failed to send message' })
        return false
      }
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Failed to send message' })
      return false
    }
  },

  addMessage: (message: Message) => {
    const currentMessages = get().messages[message.conversationId] || []
    set({
      messages: {
        ...get().messages,
        [message.conversationId]: [...currentMessages, message]
      }
    })
    
    // Update conversation's last message
    const conversations = get().conversations.map(conv =>
      conv.id === message.conversationId
        ? { 
            ...conv, 
            lastMessage: message,
            unreadCount: message.direction === 'inbound' ? conv.unreadCount + 1 : conv.unreadCount,
            updatedAt: message.sentAt
          }
        : conv
    )
    
    set({ conversations })
  },

  updateMessage: (messageId: string, updates: Partial<Message>) => {
    const messages = { ...get().messages }
    
    Object.keys(messages).forEach(conversationId => {
      messages[conversationId] = messages[conversationId].map(msg =>
        msg.id === messageId ? { ...msg, ...updates } : msg
      )
    })
    
    set({ messages })
  },

  markAsRead: async (conversationId: string, messageIds?: string[]) => {
    try {
      await conversationsApi.markAsRead(conversationId, messageIds)
      
      // Update local state
      const conversations = get().conversations.map(conv =>
        conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
      )
      
      set({ conversations })
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  },

  setFilters: (newFilters: Partial<ConversationFilters>) => {
    set({ 
      filters: { ...get().filters, ...newFilters },
      pagination: { ...get().pagination, page: 1 }
    })
    get().fetchConversations()
  },

  setPage: (page: number) => {
    set({ pagination: { ...get().pagination, page } })
    get().fetchConversations()
  },

  clearError: () => set({ error: null }),

  // Real-time updates
  handleConversationUpdate: (conversation: Conversation) => {
    const conversations = get().conversations.map(conv =>
      conv.id === conversation.id ? conversation : conv
    )
    
    set({ 
      conversations,
      selectedConversation: get().selectedConversation?.id === conversation.id 
        ? conversation 
        : get().selectedConversation
    })
  },

  handleNewMessage: (message: Message) => {
    get().addMessage(message)
  }
}))