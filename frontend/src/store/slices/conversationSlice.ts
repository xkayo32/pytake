import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Message {
  id: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'audio' | 'document'
  sender: 'user' | 'contact'
  status: 'sent' | 'delivered' | 'read'
}

interface Contact {
  name: string
  phone: string
  avatar?: string
  status: 'online' | 'offline' | 'typing'
}

interface Conversation {
  id: string
  contact: Contact
  lastMessage: Message
  unreadCount: number
  platform: 'whatsapp' | 'telegram' | 'instagram' | 'messenger'
  status: 'active' | 'waiting' | 'closed'
  messages: Message[]
  createdAt: Date
  updatedAt: Date
}

interface ConversationState {
  conversations: Conversation[]
  selectedConversationId: string | null
  loading: boolean
  error: string | null
}

interface ConversationActions {
  loadConversations: () => Promise<void>
  selectConversation: (id: string) => void
  sendMessage: (conversationId: string, content: string, type: 'text') => void
  markAsRead: (conversationId: string) => void
  updateConversationStatus: (conversationId: string, status: 'active' | 'waiting' | 'closed') => void
  addMessage: (conversationId: string, message: Omit<Message, 'id'>) => void
  clearError: () => void
}

type ConversationStore = ConversationState & ConversationActions

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      // State
      conversations: [],
      selectedConversationId: null,
      loading: false,
      error: null,

      // Actions
      loadConversations: async () => {
        try {
          set({ loading: true, error: null })
          
          // TODO: Replace with actual API call
          // const response = await apiClient.get('/conversations')
          // const conversations = response.data
          
          // For now, using mock data
          console.log('Loading conversations from API...')
          
          set({ 
            loading: false,
            error: null
          })
        } catch (error) {
          set({ 
            loading: false, 
            error: error instanceof Error ? error.message : 'Failed to load conversations'
          })
        }
      },

      selectConversation: (id: string) => {
        set({ selectedConversationId: id })
        
        // Mark conversation as read when selected
        const { markAsRead } = get()
        markAsRead(id)
      },

      sendMessage: (conversationId: string, content: string, type: 'text') => {
        const conversations = get().conversations
        const conversation = conversations.find(conv => conv.id === conversationId)
        
        if (!conversation) return

        const newMessage: Message = {
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          content,
          timestamp: new Date(),
          type,
          sender: 'user',
          status: 'sent'
        }

        const updatedConversations = conversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              messages: [...conv.messages, newMessage],
              lastMessage: newMessage,
              updatedAt: new Date()
            }
          }
          return conv
        })

        set({ conversations: updatedConversations })

        // TODO: Send message to API
        // apiClient.post(`/conversations/${conversationId}/messages`, {
        //   content,
        //   type
        // })

        // Simulate message status updates
        setTimeout(() => {
          const currentConversations = get().conversations
          const updatedConversations = currentConversations.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: conv.messages.map(msg => 
                  msg.id === newMessage.id 
                    ? { ...msg, status: 'delivered' as const }
                    : msg
                )
              }
            }
            return conv
          })
          set({ conversations: updatedConversations })
        }, 1000)

        setTimeout(() => {
          const currentConversations = get().conversations
          const updatedConversations = currentConversations.map(conv => {
            if (conv.id === conversationId) {
              return {
                ...conv,
                messages: conv.messages.map(msg => 
                  msg.id === newMessage.id 
                    ? { ...msg, status: 'read' as const }
                    : msg
                )
              }
            }
            return conv
          })
          set({ conversations: updatedConversations })
        }, 3000)
      },

      markAsRead: (conversationId: string) => {
        const conversations = get().conversations
        const updatedConversations = conversations.map(conv => {
          if (conv.id === conversationId && conv.unreadCount > 0) {
            return {
              ...conv,
              unreadCount: 0
            }
          }
          return conv
        })

        set({ conversations: updatedConversations })

        // TODO: Update read status on API
        // apiClient.patch(`/conversations/${conversationId}/mark-read`)
      },

      updateConversationStatus: (conversationId: string, status: 'active' | 'waiting' | 'closed') => {
        const conversations = get().conversations
        const updatedConversations = conversations.map(conv => {
          if (conv.id === conversationId) {
            return {
              ...conv,
              status,
              updatedAt: new Date()
            }
          }
          return conv
        })

        set({ conversations: updatedConversations })

        // TODO: Update status on API
        // apiClient.patch(`/conversations/${conversationId}/status`, { status })
      },

      addMessage: (conversationId: string, messageData: Omit<Message, 'id'>) => {
        const conversations = get().conversations
        const message: Message = {
          ...messageData,
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        }

        const updatedConversations = conversations.map(conv => {
          if (conv.id === conversationId) {
            const newUnreadCount = message.sender === 'contact' 
              ? conv.unreadCount + 1 
              : conv.unreadCount

            return {
              ...conv,
              messages: [...conv.messages, message],
              lastMessage: message,
              unreadCount: newUnreadCount,
              updatedAt: new Date()
            }
          }
          return conv
        })

        set({ conversations: updatedConversations })
      },

      clearError: () => {
        set({ error: null })
      }
    }),
    {
      name: 'conversation-store',
      // Only persist selected conversation, not the full conversations array
      partialize: (state) => ({
        selectedConversationId: state.selectedConversationId
      })
    }
  )
)