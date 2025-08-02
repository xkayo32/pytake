import { useEffect, useState } from 'react'
import { useSocket } from '@/services/websocket/socketClient'
import { useConversationStore } from '@/store/slices/conversationSlice'
import type { 
  SocketMessage, 
  ContactTypingEvent, 
  MessageStatusUpdate, 
  NewConversationEvent 
} from '@/services/websocket/socketClient'

interface SocketConnectionState {
  isConnected: boolean
  isConnecting: boolean
  error: string | null
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error'
}

export const useSocketConnection = () => {
  const { client, connect, disconnect } = useSocket()
  const { addMessage, updateConversationStatus, loadConversations } = useConversationStore()
  
  const [state, setState] = useState<SocketConnectionState>({
    isConnected: false,
    isConnecting: false,
    error: null,
    connectionStatus: 'disconnected'
  })

  const [typingContacts, setTypingContacts] = useState<Map<string, string>>(new Map())

  useEffect(() => {
    const setupSocketListeners = () => {
      // Handle new messages
      client.on('message:new', (message: SocketMessage) => {
        addMessage(message.conversationId, {
          content: message.content,
          timestamp: message.timestamp,
          type: message.type,
          sender: message.sender,
          status: 'delivered'
        })
      })

      // Handle message status updates
      client.on('message:status', (update: MessageStatusUpdate) => {
        // This would typically update the message status in the store
        console.log('Message status updated:', update)
      })

      // Handle typing indicators
      client.on('contact:typing', (event: ContactTypingEvent) => {
        setTypingContacts(prev => {
          const newMap = new Map(prev)
          if (event.isTyping) {
            newMap.set(event.conversationId, event.contactName)
          } else {
            newMap.delete(event.conversationId)
          }
          return newMap
        })
      })

      // Handle new conversations
      client.on('conversation:new', (conversation: NewConversationEvent) => {
        // This would typically add the new conversation to the store
        console.log('New conversation created:', conversation)
        loadConversations() // Reload conversations list
      })

      // Handle connection status changes
      client.on('connection:status', (status: 'connected' | 'disconnected' | 'error') => {
        setState(prev => ({
          ...prev,
          isConnected: status === 'connected',
          isConnecting: false,
          connectionStatus: status === 'connected' ? 'connected' : 
                          status === 'error' ? 'error' : 'disconnected',
          error: status === 'error' ? 'Connection failed' : null
        }))
      })
    }

    setupSocketListeners()

    // Cleanup listeners on unmount
    return () => {
      client.off('message:new')
      client.off('message:status')
      client.off('contact:typing')
      client.off('conversation:new')
      client.off('connection:status')
    }
  }, [client, addMessage, loadConversations])

  const connectToSocket = async () => {
    if (state.isConnected || state.isConnecting) {
      return
    }

    setState(prev => ({
      ...prev,
      isConnecting: true,
      error: null,
      connectionStatus: 'connecting'
    }))

    try {
      await connect()
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Connection failed',
        connectionStatus: 'error'
      }))
    }
  }

  const disconnectFromSocket = () => {
    disconnect()
    setState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false,
      connectionStatus: 'disconnected'
    }))
  }

  const sendMessage = (conversationId: string, content: string, type: 'text' = 'text') => {
    if (!state.isConnected) {
      throw new Error('Socket not connected')
    }
    client.sendMessage(conversationId, content, type)
  }

  const setTypingStatus = (conversationId: string, isTyping: boolean) => {
    if (state.isConnected) {
      client.setTypingStatus(conversationId, isTyping)
    }
  }

  const joinConversation = (conversationId: string) => {
    if (state.isConnected) {
      client.joinConversation(conversationId)
    }
  }

  const leaveConversation = (conversationId: string) => {
    if (state.isConnected) {
      client.leaveConversation(conversationId)
    }
  }

  const markMessageAsRead = (messageId: string) => {
    if (state.isConnected) {
      client.updateMessageStatus(messageId, 'read')
    }
  }

  return {
    // Connection state
    ...state,
    
    // Connection methods
    connect: connectToSocket,
    disconnect: disconnectFromSocket,
    
    // Messaging methods
    sendMessage,
    setTypingStatus,
    joinConversation,
    leaveConversation,
    markMessageAsRead,
    
    // Real-time data
    typingContacts
  }
}