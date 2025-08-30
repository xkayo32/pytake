'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { conversationsApi, type Conversation, type Message, type MessageInput } from '@/lib/api/conversations'
import { useWebSocket, type WebSocketMessage } from './useWebSocket'
import { useAuthContext } from '@/contexts/auth-context'

interface ConversationsState {
  conversations: Conversation[]
  currentConversation: Conversation | null
  messages: Record<string, Message[]>
  isLoading: boolean
  error: string | null
  unreadCount: number
  lastUpdated: Date | null
}

export function useConversations() {
  const { isAuthenticated } = useAuthContext()
  const [state, setState] = useState<ConversationsState>({
    conversations: [],
    currentConversation: null,
    messages: {},
    isLoading: true,
    error: null,
    unreadCount: 0,
    lastUpdated: null
  })

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // WebSocket connection
  const { isConnected, sendMessage: wsSendMessage } = useWebSocket({
    onMessage: handleWebSocketMessage,
    onConnect: () => {
      console.log('Conversations WebSocket connected')
    },
    onDisconnect: () => {
      console.log('Conversations WebSocket disconnected')
    }
  })

  // Handle WebSocket messages
  function handleWebSocketMessage(wsMessage: WebSocketMessage) {
    console.log('Handling WebSocket message:', wsMessage)
    
    switch (wsMessage.event) {
      case 'message_received':
        handleNewMessage(wsMessage.data)
        break
      
      case 'message_sent':
        handleNewMessage(wsMessage.data)
        break
      
      case 'message_status_updated':
        handleMessageStatusUpdate(wsMessage.data)
        break
      
      case 'conversation_updated':
        handleConversationUpdate(wsMessage.data)
        break
      
      case 'typing_start':
        handleTypingStart(wsMessage.data)
        break
      
      case 'typing_stop':
        handleTypingStop(wsMessage.data)
        break
    }
  }

  // Handle new message from WebSocket
  const handleNewMessage = useCallback((message: Message) => {
    setState(prev => {
      const conversationMessages = prev.messages[message.conversation_id] || []
      const existingIndex = conversationMessages.findIndex(m => m.id === message.id)
      
      let updatedMessages: Message[]
      if (existingIndex >= 0) {
        // Update existing message
        updatedMessages = [...conversationMessages]
        updatedMessages[existingIndex] = message
      } else {
        // Add new message
        updatedMessages = [...conversationMessages, message].sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }

      // Update conversation's last message
      const updatedConversations = prev.conversations.map(conv => {
        if (conv.id === message.conversation_id) {
          return {
            ...conv,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: message.sender_type === 'contact' ? (conv.unread_count || 0) + 1 : conv.unread_count
          }
        }
        return conv
      })

      return {
        ...prev,
        messages: {
          ...prev.messages,
          [message.conversation_id]: updatedMessages
        },
        conversations: updatedConversations,
        unreadCount: message.sender_type === 'contact' ? prev.unreadCount + 1 : prev.unreadCount
      }
    })
  }, [])

  // Handle message status updates
  const handleMessageStatusUpdate = useCallback((data: { message_id: string; status: string; conversation_id: string }) => {
    setState(prev => {
      const conversationMessages = prev.messages[data.conversation_id] || []
      const updatedMessages = conversationMessages.map(msg => 
        msg.id === data.message_id ? { ...msg, status: data.status as any } : msg
      )

      return {
        ...prev,
        messages: {
          ...prev.messages,
          [data.conversation_id]: updatedMessages
        }
      }
    })
  }, [])

  // Handle conversation updates
  const handleConversationUpdate = useCallback((conversation: Conversation) => {
    setState(prev => {
      const updatedConversations = prev.conversations.map(conv => 
        conv.id === conversation.id ? { ...conversation, ...conv } : conv
      )

      return {
        ...prev,
        conversations: updatedConversations,
        currentConversation: prev.currentConversation?.id === conversation.id 
          ? { ...conversation, ...prev.currentConversation } 
          : prev.currentConversation
      }
    })
  }, [])

  // Handle typing indicators
  const handleTypingStart = useCallback((data: { conversation_id: string; contact_id: string }) => {
    // Update conversation status to show typing indicator
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.map(conv => 
        conv.id === data.conversation_id 
          ? { ...conv, contact: { ...conv.contact, status: 'typing' } as any }
          : conv
      )
    }))
  }, [])

  const handleTypingStop = useCallback((data: { conversation_id: string; contact_id: string }) => {
    setState(prev => ({
      ...prev,
      conversations: prev.conversations.map(conv => 
        conv.id === data.conversation_id 
          ? { ...conv, contact: { ...conv.contact, status: 'online' } as any }
          : conv
      )
    }))
  }, [])

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated) return

    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))
      
      const conversations = await conversationsApi.getConversations({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchTerm || undefined,
        limit: 50
      })

      const totalUnread = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0)

      setState(prev => ({
        ...prev,
        conversations,
        unreadCount: totalUnread,
        isLoading: false,
        lastUpdated: new Date()
      }))
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Erro ao carregar conversas',
        isLoading: false
      }))
    }
  }, [isAuthenticated, statusFilter, searchTerm])

  // Load messages for specific conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const messages = await conversationsApi.getMessages(conversationId, { limit: 100 })
      
      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [conversationId]: messages
        }
      }))
    } catch (error: any) {
      console.error('Error loading messages:', error)
    }
  }, [])

  // Send message
  const sendMessage = useCallback(async (conversationId: string, messageInput: MessageInput) => {
    try {
      const message = await conversationsApi.sendMessage(conversationId, messageInput)
      
      // The WebSocket should handle adding the message to state
      // But we can add it immediately for better UX
      handleNewMessage(message)
      
      return message
    } catch (error: any) {
      throw new Error(error.message || 'Erro ao enviar mensagem')
    }
  }, [handleNewMessage])

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    try {
      await conversationsApi.markAsRead(conversationId)
      
      setState(prev => {
        const updatedConversations = prev.conversations.map(conv => 
          conv.id === conversationId ? { ...conv, unread_count: 0 } : conv
        )
        
        const conversation = prev.conversations.find(c => c.id === conversationId)
        const prevUnread = conversation?.unread_count || 0
        
        return {
          ...prev,
          conversations: updatedConversations,
          unreadCount: Math.max(0, prev.unreadCount - prevUnread)
        }
      })
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }, [])

  // Select conversation
  const selectConversation = useCallback(async (conversationId: string) => {
    const conversation = state.conversations.find(c => c.id === conversationId)
    if (!conversation) return

    setState(prev => ({ ...prev, currentConversation: conversation }))
    
    // Load messages if not already loaded
    if (!state.messages[conversationId]) {
      await loadMessages(conversationId)
    }
    
    // Mark as read
    if (conversation.unread_count && conversation.unread_count > 0) {
      await markAsRead(conversationId)
    }
  }, [state.conversations, state.messages, loadMessages, markAsRead])

  // Filter conversations
  const filteredConversations = useMemo(() => {
    let filtered = state.conversations

    if (searchTerm) {
      filtered = filtered.filter(conv => 
        conv.contact?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.contact?.phone?.includes(searchTerm) ||
        conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(conv => conv.status === statusFilter)
    }

    return filtered.sort((a, b) => {
      const aTime = new Date(a.last_message_time || a.updated_at).getTime()
      const bTime = new Date(b.last_message_time || b.updated_at).getTime()
      return bTime - aTime // Most recent first
    })
  }, [state.conversations, searchTerm, statusFilter])

  // Initial load
  useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // Periodic refresh when not connected to WebSocket
  useEffect(() => {
    if (!isConnected && isAuthenticated) {
      const interval = setInterval(loadConversations, 30000) // Refresh every 30s
      return () => clearInterval(interval)
    }
  }, [isConnected, isAuthenticated, loadConversations])

  return {
    // State
    conversations: filteredConversations,
    currentConversation: state.currentConversation,
    currentMessages: state.currentConversation ? state.messages[state.currentConversation.id] || [] : [],
    isLoading: state.isLoading,
    error: state.error,
    unreadCount: state.unreadCount,
    lastUpdated: state.lastUpdated,
    isConnected,
    
    // Filters
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    
    // Actions
    loadConversations,
    selectConversation,
    sendMessage,
    markAsRead,
    loadMessages
  }
}