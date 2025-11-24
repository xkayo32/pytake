import { useEffect, useState, useRef } from 'react'
import { X, Send, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar'
import { ScrollArea } from '@components/ui/scroll-area'
import { getApiUrl, getAuthHeaders } from '@lib/api'
import { getWebSocketUrl } from '@lib/websocket'
import type { Conversation } from '../conversations'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  sender_name: string
  sender_type: 'contact' | 'agent' | 'system'
  content: string
  media_url?: string
  media_type?: 'image' | 'video' | 'audio' | 'document'
  timestamp: string
  read_at?: string
}

interface ConversationDetailProps {
  conversation: Conversation
  onClose: () => void
}

export function ConversationDetail({ conversation, onClose }: ConversationDetailProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [conversationStatus, setConversationStatus] = useState<string>(conversation.status)
  const scrollRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  // Fetch messages
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${getApiUrl()}/api/v1/conversations/${conversation.id}/messages`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error('Falha ao carregar mensagens')
        const data = await response.json()
        setMessages(Array.isArray(data) ? data : data.items || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar mensagens')
      } finally {
        setLoading(false)
      }
    }

    fetchMessages()
  }, [conversation.id])

  // WebSocket connection for real-time messages
  useEffect(() => {
    const wsUrl = `${getWebSocketUrl()}/ws/conversations/${conversation.id}`
    
    try {
      wsRef.current = new WebSocket(wsUrl)
      
      wsRef.current.onopen = () => {
        console.log('WebSocket conectado:', conversation.id)
      }

      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data)
        if (message.type === 'message') {
          setMessages(prev => [...prev, message.data])
        } else if (message.type === 'status_update') {
          setConversationStatus(message.data.status)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('WebSocket erro:', error)
      }

      wsRef.current.onclose = () => {
        console.log('WebSocket desconectado')
      }
    } catch (err) {
      console.error('Erro ao conectar WebSocket:', err)
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [conversation.id])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  // Send message
  const handleSendMessage = async () => {
    if (!newMessage.trim()) return

    try {
      setSending(true)
      const response = await fetch(
        `${getApiUrl()}/api/v1/conversations/${conversation.id}/messages`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            content: newMessage
          })
        }
      )

      if (!response.ok) throw new Error('Falha ao enviar mensagem')
      
      const newMsg = await response.json()
      setMessages(prev => [...prev, newMsg])
      setNewMessage('')
    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
    } finally {
      setSending(false)
    }
  }

  // Update conversation status
  const handleStatusUpdate = async (newStatus: string) => {
    try {
      const response = await fetch(
        `${getApiUrl()}/api/v1/conversations/${conversation.id}/status`,
        {
          method: 'PUT',
          headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status: newStatus })
        }
      )

      if (!response.ok) throw new Error('Falha ao atualizar status')
      setConversationStatus(newStatus)
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'resolved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'assigned':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'archived':
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300'
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      open: 'Aberta',
      resolved: 'Resolvida',
      assigned: 'Atribuída',
      archived: 'Arquivada'
    }
    return labels[status] || status
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-end md:justify-center">
      {/* Modal */}
      <div className="bg-white dark:bg-slate-800 w-full md:w-2/3 lg:w-1/2 h-screen md:h-[90vh] md:rounded-lg flex flex-col shadow-lg md:shadow-2xl">
        {/* Header */}
        <div className="border-b border-slate-200 dark:border-slate-700 p-4 flex items-start justify-between">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={conversation.contact_avatar} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                {conversation.contact_name?.charAt(0).toUpperCase() || 'C'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="font-semibold text-slate-900 dark:text-white">
                {conversation.contact_name}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {conversation.contact_phone}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Status and Actions */}
        <div className="border-b border-slate-200 dark:border-slate-700 p-4 flex items-center justify-between gap-2 flex-wrap">
          <Badge className={getStatusColor(conversationStatus)}>
            {getStatusLabel(conversationStatus)}
          </Badge>
          <div className="flex gap-2 flex-wrap">
            {conversationStatus !== 'resolved' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('resolved')}
                className="text-xs"
              >
                Resolver
              </Button>
            )}
            {conversationStatus !== 'archived' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleStatusUpdate('archived')}
                className="text-xs"
              >
                Arquivar
              </Button>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {error && (
            <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
            </div>
          )}

          <ScrollArea className="flex-1 p-4">
            <div ref={scrollRef} className="space-y-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-slate-500 dark:text-slate-400">Nenhuma mensagem ainda</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender_type === 'agent' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        msg.sender_type === 'agent'
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white'
                      }`}
                    >
                      {msg.sender_type !== 'agent' && (
                        <p className="text-xs font-semibold opacity-70 mb-1">
                          {msg.sender_name}
                        </p>
                      )}
                      <p className="text-sm break-words">{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Message Input */}
        <div className="border-t border-slate-200 dark:border-slate-700 p-4">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Digite sua mensagem..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSendMessage()
                }
              }}
              disabled={sending}
              className="bg-slate-50 dark:bg-slate-700 border-slate-300 dark:border-slate-600"
            />
            <Button
              onClick={handleSendMessage}
              disabled={sending || !newMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
