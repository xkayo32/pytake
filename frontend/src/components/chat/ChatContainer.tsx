import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatList } from './ChatList'
import { ChatWindow } from './ChatWindow'
import type { Conversation, Message } from '@/types/conversation'

export const ChatContainer: React.FC = () => {
  const [selectedConversationId, setSelectedConversationId] = useState<string>()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Record<string, Message[]>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)

  // Load conversations from API
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/v1/conversations', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          // Map backend data to frontend format
          const mappedConversations: Conversation[] = data.conversations?.map((conv: any) => ({
            id: conv.id,
            contactName: conv.contact_name || 'Contato',
            contactPhone: conv.contact_phone || '+55...',
            contactAvatar: conv.contact_avatar,
            lastMessage: conv.last_message || 'Nova conversa',
            lastMessageTime: new Date(conv.last_message_time || Date.now()),
            unreadCount: conv.unread_count || 0,
            status: conv.status || 'pending',
            assignedAgent: conv.assigned_agent,
            tags: conv.tags || [],
            channel: conv.channel || 'whatsapp'
          })) || []
          
          setConversations(mappedConversations)
        }
      } catch (error) {
        console.error('Error fetching conversations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
    
    // Refresh conversations every 30 seconds
    const interval = setInterval(fetchConversations, 30000)
    return () => clearInterval(interval)
  }, [])

  // Load messages for selected conversation
  useEffect(() => {
    if (selectedConversationId && !messages[selectedConversationId]) {
      const fetchMessages = async () => {
        try {
          const token = localStorage.getItem('token')
          const response = await fetch(`/api/v1/conversations/${selectedConversationId}/messages`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          
          if (response.ok) {
            const data = await response.json()
            const mappedMessages: Message[] = data.messages?.map((msg: any) => ({
              id: msg.id,
              conversationId: selectedConversationId,
              content: msg.content,
              sender: msg.sender === 'agent' ? 'agent' : 'user',
              timestamp: new Date(msg.timestamp),
              status: msg.status || 'read',
              attachments: msg.attachments
            })) || []
            
            setMessages(prev => ({
              ...prev,
              [selectedConversationId]: mappedMessages
            }))
          }
        } catch (error) {
          console.error('Error fetching messages:', error)
        }
      }
      
      fetchMessages()
    }
  }, [selectedConversationId, messages])

  const selectedConversation = conversations.find(
    conv => conv.id === selectedConversationId
  )

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId)
    
    // Mark as read
    setConversations(prev =>
      prev.map(conv =>
        conv.id === conversationId
          ? { ...conv, unreadCount: 0 }
          : conv
      )
    )
  }

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId) return

    const tempId = `temp-${Date.now()}`
    const newMessage: Message = {
      id: tempId,
      conversationId: selectedConversationId,
      content,
      sender: 'agent',
      timestamp: new Date(),
      status: 'sent'
    }

    // Add message to UI immediately
    setMessages(prev => ({
      ...prev,
      [selectedConversationId]: [...(prev[selectedConversationId] || []), newMessage]
    }))

    // Update conversation last message
    setConversations(prev =>
      prev.map(conv =>
        conv.id === selectedConversationId
          ? {
              ...conv,
              lastMessage: content,
              lastMessageTime: new Date()
            }
          : conv
      )
    )

    try {
      // Send message via API
      const token = localStorage.getItem('token')
      const response = await fetch(`/api/v1/conversations/${selectedConversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          content,
          sender: 'agent'
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Update message with real ID and status
        setMessages(prev => ({
          ...prev,
          [selectedConversationId]: prev[selectedConversationId].map(msg =>
            msg.id === tempId ? { ...msg, id: data.message.id, status: 'delivered' } : msg
          )
        }))
      } else {
        // Handle error - mark message as failed
        setMessages(prev => ({
          ...prev,
          [selectedConversationId]: prev[selectedConversationId].map(msg =>
            msg.id === tempId ? { ...msg, status: 'sent' } : msg
          )
        }))
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Keep message as sent if API fails
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.contactPhone.includes(searchQuery) ||
    conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-full bg-background rounded-xl overflow-hidden">
      {/* Conversations List */}
      <motion.div 
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-96 border-r border-border/50 bg-card/50 flex flex-col"
      >
        <ChatList
          conversations={filteredConversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
      </motion.div>
      
      {/* Chat Window */}
      <AnimatePresence mode="wait">
        {selectedConversation ? (
          <motion.div 
            key={selectedConversationId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex-1 flex flex-col"
          >
            <ChatWindow
              conversation={selectedConversation}
              messages={selectedConversationId ? messages[selectedConversationId] || [] : []}
              onSendMessage={handleSendMessage}
            />
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex items-center justify-center bg-muted/20"
          >
            <div className="text-center">
              <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">
                Selecione uma conversa
              </h3>
              <p className="text-sm text-muted-foreground">
                Escolha uma conversa da lista para começar
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}