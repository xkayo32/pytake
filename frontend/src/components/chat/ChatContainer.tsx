import React, { useState, useEffect } from 'react'
import { ChatList } from './ChatList'
import { ChatWindow } from './ChatWindow'
import { SocketConnectionIndicator } from './SocketConnectionIndicator'
import { useConversationStore } from '@/store/slices/conversationSlice'
import { useSocketConnection } from '@/hooks/useSocketConnection'
import type { MediaFile } from '@/types/media'
import type { Message as GlobalMessage, Conversation, Platform } from '@/types'

interface Message {
  id: string
  content: string
  timestamp: Date
  type: 'text' | 'image' | 'audio' | 'document' | 'video'
  sender: 'user' | 'contact'
  status: 'sent' | 'delivered' | 'read'
}

interface Contact {
  name: string
  phone: string
  avatar?: string
  status: 'online' | 'offline' | 'typing'
}

interface ChatConversation {
  id: string
  contact: Contact
  lastMessage: Message
  unreadCount: number
  platform: 'whatsapp' | 'telegram' | 'instagram' | 'messenger'
  status: 'active' | 'waiting' | 'closed'
  messages: Message[]
}

export const ChatContainer: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string>()
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const { loadConversations } = useConversationStore()
  
  const {
    isConnected,
    connectionStatus,
    connect,
    sendMessage: socketSendMessage,
    setTypingStatus,
    joinConversation,
    leaveConversation,
    typingContacts
  } = useSocketConnection()

  useEffect(() => {
    // Mock data for demonstration
    const mockConversations: ChatConversation[] = [
      {
        id: '1',
        contact: {
          name: 'João Silva',
          phone: '+55 11 99999-9999',
          status: 'online'
        },
        lastMessage: {
          id: 'msg1',
          content: 'Oi, gostaria de saber mais sobre os produtos',
          timestamp: new Date(Date.now() - 300000), // 5 minutes ago
          type: 'text',
          sender: 'contact',
          status: 'read'
        },
        unreadCount: 2,
        platform: 'whatsapp',
        status: 'active',
        messages: [
          {
            id: 'msg1',
            content: 'Oi, gostaria de saber mais sobre os produtos',
            timestamp: new Date(Date.now() - 300000),
            type: 'text',
            sender: 'contact',
            status: 'read'
          },
          {
            id: 'msg2',
            content: 'Olá! Claro, posso ajudar você. Que tipo de produto você está procurando?',
            timestamp: new Date(Date.now() - 240000),
            type: 'text',
            sender: 'user',
            status: 'read'
          },
          {
            id: 'msg3',
            content: 'Estou interessado em notebooks',
            timestamp: new Date(Date.now() - 180000),
            type: 'text',
            sender: 'contact',
            status: 'read'
          }
        ]
      },
      {
        id: '2',
        contact: {
          name: 'Maria Santos',
          phone: '+55 11 88888-8888',
          status: 'offline'
        },
        lastMessage: {
          id: 'msg4',
          content: 'Obrigada pelo atendimento!',
          timestamp: new Date(Date.now() - 3600000), // 1 hour ago
          type: 'text',
          sender: 'contact',
          status: 'read'
        },
        unreadCount: 0,
        platform: 'telegram',
        status: 'closed',
        messages: [
          {
            id: 'msg4',
            content: 'Obrigada pelo atendimento!',
            timestamp: new Date(Date.now() - 3600000),
            type: 'text',
            sender: 'contact',
            status: 'read'
          }
        ]
      },
      {
        id: '3',
        contact: {
          name: 'Pedro Costa',
          phone: '+55 11 77777-7777',
          status: 'typing'
        },
        lastMessage: {
          id: 'msg5',
          content: 'Quando vocês abrem?',
          timestamp: new Date(Date.now() - 900000), // 15 minutes ago
          type: 'text',
          sender: 'contact',
          status: 'delivered'
        },
        unreadCount: 1,
        platform: 'instagram',
        status: 'waiting',
        messages: [
          {
            id: 'msg5',
            content: 'Quando vocês abrem?',
            timestamp: new Date(Date.now() - 900000),
            type: 'text',
            sender: 'contact',
            status: 'delivered'
          }
        ]
      }
    ]

    setConversations(mockConversations)
    loadConversations()
    
    // Connect to WebSocket
    connect().catch(console.error)
  }, [loadConversations, connect])

  const selectedConversation = conversations.find(
    conv => conv.id === selectedConversationId
  )

  // Update contact status based on typing indicators
  const updatedSelectedConversation = selectedConversation ? {
    ...selectedConversation,
    contact: {
      ...selectedConversation.contact,
      status: typingContacts.has(selectedConversation.id) ? 'typing' as const : selectedConversation.contact.status
    }
  } : undefined

  const handleSelectConversation = (conversationId: string) => {
    // Leave previous conversation room
    if (selectedConversationId && selectedConversationId !== conversationId) {
      leaveConversation(selectedConversationId)
    }
    
    setSelectedConversationId(conversationId)
    
    // Join new conversation room
    joinConversation(conversationId)
  }

  const handleSendMessage = (content: string, type: 'text' | 'image' | 'document' | 'audio' | 'video', media?: MediaFile[]) => {
    if (!selectedConversationId) return

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      content,
      timestamp: new Date(),
      type,
      sender: 'user',
      status: 'sent'
    }

    // Add message to local state immediately for responsive UI
    setConversations(prev => 
      prev.map(conv => {
        if (conv.id === selectedConversationId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: newMessage
          }
        }
        return conv
      })
    )

    // Send message via WebSocket if connected
    if (isConnected) {
      try {
        socketSendMessage(selectedConversationId, content, type)
      } catch (error) {
        console.error('Failed to send message via WebSocket:', error)
        // Fallback to REST API or show error
      }
    }

    // Simulate message status updates (for demo purposes)
    setTimeout(() => {
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === selectedConversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg => 
                msg.id === newMessage.id 
                  ? { ...msg, status: 'delivered' }
                  : msg
              )
            }
          }
          return conv
        })
      )
    }, 1000)

    setTimeout(() => {
      setConversations(prev => 
        prev.map(conv => {
          if (conv.id === selectedConversationId) {
            return {
              ...conv,
              messages: conv.messages.map(msg => 
                msg.id === newMessage.id 
                  ? { ...msg, status: 'read' }
                  : msg
              )
            }
          }
          return conv
        })
      )
    }, 2000)
  }

  const handleAttachFile = () => {
    console.log('Attach file functionality would be implemented here')
  }

  return (
    <div className="flex flex-col h-full">
      {/* Connection Status Bar */}
      <div className="border-b border-border p-2 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-sm font-medium">PyTake Chat</h2>
            <SocketConnectionIndicator 
              status={connectionStatus}
              onReconnect={connect}
            />
          </div>
          
          <div className="text-xs text-muted-foreground">
            {conversations.length} conversas carregadas
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-1 min-h-0">
        <div className="w-80">
          <ChatList
            conversations={conversations}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
          />
        </div>
        
        <div className="flex-1">
          {updatedSelectedConversation ? (
            <ChatWindow
              conversationId={updatedSelectedConversation.id}
              contact={updatedSelectedConversation.contact}
              messages={updatedSelectedConversation.messages}
              platform={updatedSelectedConversation.platform}
              onSendMessage={handleSendMessage}
              onAttachFile={handleAttachFile}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <h3 className="text-lg font-medium text-muted-foreground">
                  Selecione uma conversa
                </h3>
                <p className="text-sm text-muted-foreground">
                  Escolha uma conversa da lista para começar a responder
                </p>
                {!isConnected && (
                  <p className="text-xs text-yellow-600 mt-2">
                    ⚠️ WebSocket desconectado - funcionalidade limitada
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}