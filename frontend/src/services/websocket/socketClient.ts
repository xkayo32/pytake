import { io, Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/slices/authSlice'

interface SocketMessage {
  id: string
  conversationId: string
  content: string
  type: 'text' | 'image' | 'audio' | 'document'
  sender: 'user' | 'contact'
  timestamp: Date
  platform: 'whatsapp' | 'telegram' | 'instagram' | 'messenger'
}

interface ContactTypingEvent {
  conversationId: string
  contactName: string
  isTyping: boolean
}

interface MessageStatusUpdate {
  messageId: string
  conversationId: string
  status: 'sent' | 'delivered' | 'read'
}

interface NewConversationEvent {
  conversationId: string
  contact: {
    name: string
    phone: string
    avatar?: string
  }
  platform: 'whatsapp' | 'telegram' | 'instagram' | 'messenger'
  initialMessage: SocketMessage
}

type SocketEventHandlers = {
  'message:new': (message: SocketMessage) => void
  'message:status': (update: MessageStatusUpdate) => void
  'contact:typing': (event: ContactTypingEvent) => void
  'conversation:new': (conversation: NewConversationEvent) => void
  'connection:status': (status: 'connected' | 'disconnected' | 'error') => void
}

class SocketClient {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000
  private eventHandlers: Partial<SocketEventHandlers> = {}
  private baseUrl: string

  constructor(baseUrl: string = 'ws://localhost:8080') {
    this.baseUrl = baseUrl
  }

  connect(token: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.socket = io(this.baseUrl, {
          auth: {
            token
          },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectInterval
        })

        this.socket.on('connect', () => {
          console.log('🔌 WebSocket connected')
          this.reconnectAttempts = 0
          this.emit('connection:status', 'connected')
          resolve()
        })

        this.socket.on('disconnect', (reason) => {
          console.log('🔌 WebSocket disconnected:', reason)
          this.emit('connection:status', 'disconnected')
        })

        this.socket.on('connect_error', (error) => {
          console.error('🔌 WebSocket connection error:', error)
          this.emit('connection:status', 'error')
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            reject(new Error('Failed to connect to WebSocket server'))
          }
          this.reconnectAttempts++
        })

        // Register event listeners
        this.socket.on('message:new', (message: SocketMessage) => {
          console.log('📨 New message received:', message)
          this.emit('message:new', {
            ...message,
            timestamp: new Date(message.timestamp)
          })
        })

        this.socket.on('message:status', (update: MessageStatusUpdate) => {
          console.log('📋 Message status updated:', update)
          this.emit('message:status', update)
        })

        this.socket.on('contact:typing', (event: ContactTypingEvent) => {
          console.log('⌨️ Contact typing:', event)
          this.emit('contact:typing', event)
        })

        this.socket.on('conversation:new', (conversation: NewConversationEvent) => {
          console.log('💬 New conversation:', conversation)
          this.emit('conversation:new', {
            ...conversation,
            initialMessage: {
              ...conversation.initialMessage,
              timestamp: new Date(conversation.initialMessage.timestamp)
            }
          })
        })

      } catch (error) {
        reject(error)
      }
    })
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      console.log('🔌 WebSocket disconnected manually')
    }
  }

  // Send message to server
  sendMessage(conversationId: string, content: string, type: 'text' = 'text'): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected')
    }

    const message = {
      conversationId,
      content,
      type,
      timestamp: new Date()
    }

    this.socket.emit('message:send', message)
    console.log('📤 Message sent:', message)
  }

  // Update message status (mark as read, etc.)
  updateMessageStatus(messageId: string, status: 'read'): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected')
    }

    this.socket.emit('message:status', { messageId, status })
    console.log('📋 Message status update sent:', { messageId, status })
  }

  // Notify typing status
  setTypingStatus(conversationId: string, isTyping: boolean): void {
    if (!this.socket || !this.socket.connected) {
      return // Fail silently for typing indicators
    }

    this.socket.emit('user:typing', { conversationId, isTyping })
  }

  // Join conversation room for real-time updates
  joinConversation(conversationId: string): void {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Socket not connected')
    }

    this.socket.emit('conversation:join', { conversationId })
    console.log('🏠 Joined conversation room:', conversationId)
  }

  // Leave conversation room
  leaveConversation(conversationId: string): void {
    if (!this.socket || !this.socket.connected) {
      return
    }

    this.socket.emit('conversation:leave', { conversationId })
    console.log('🚪 Left conversation room:', conversationId)
  }

  // Event handler management
  on<K extends keyof SocketEventHandlers>(
    event: K,
    handler: SocketEventHandlers[K]
  ): void {
    this.eventHandlers[event] = handler
  }

  off<K extends keyof SocketEventHandlers>(event: K): void {
    delete this.eventHandlers[event]
  }

  private emit<K extends keyof SocketEventHandlers>(
    event: K,
    data: Parameters<SocketEventHandlers[K]>[0]
  ): void {
    const handler = this.eventHandlers[event]
    if (handler) {
      (handler as any)(data)
    }
  }

  // Connection status
  get isConnected(): boolean {
    return this.socket?.connected ?? false
  }

  // Reconnect manually
  reconnect(): void {
    if (this.socket) {
      this.socket.connect()
    }
  }
}

// Singleton instance
let socketClient: SocketClient | null = null

export const getSocketClient = (): SocketClient => {
  if (!socketClient) {
    socketClient = new SocketClient()
  }
  return socketClient
}

// React hook for WebSocket connection
export const useSocket = () => {
  const client = getSocketClient()
  const { token } = useAuthStore()

  const connect = async () => {
    if (token && !client.isConnected) {
      try {
        await client.connect(token)
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error)
        throw error
      }
    }
  }

  const disconnect = () => {
    client.disconnect()
  }

  return {
    client,
    connect,
    disconnect,
    isConnected: client.isConnected
  }
}

export type {
  SocketMessage,
  ContactTypingEvent,
  MessageStatusUpdate,
  NewConversationEvent,
  SocketEventHandlers
}