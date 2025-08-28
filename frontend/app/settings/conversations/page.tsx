'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { 
  MessageCircle, 
  Send, 
  Search, 
  Phone, 
  Mail, 
  Calendar,
  Clock,
  CheckCheck,
  Check,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Smile,
  MoreVertical,
  Archive,
  Star,
  Trash2,
  RefreshCw,
  User,
  Bot,
  UserCheck
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Contact {
  id: string
  name: string
  phone: string
  email?: string
  avatar?: string
  lastSeen: string
  status: 'online' | 'offline' | 'typing'
  unreadCount?: number
}

interface Message {
  id: string
  contactId: string
  content: string
  timestamp: string
  type: 'sent' | 'received'
  status: 'pending' | 'sent' | 'delivered' | 'read'
  mediaType?: 'image' | 'video' | 'audio' | 'document'
  mediaUrl?: string
  isFromBot?: boolean
}

interface Conversation {
  contact: Contact
  messages: Message[]
  lastMessage: string
  timestamp: string
  inQueue?: boolean
  queueName?: string
  agentName?: string
}

export default function ConversationsAdminPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [message, setMessage] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Mock data - substituir por API real
  useEffect(() => {
    const mockConversations: Conversation[] = [
      {
        contact: {
          id: '1',
          name: 'João Silva',
          phone: '+55 11 98765-4321',
          email: 'joao@example.com',
          lastSeen: '2024-01-20T10:30:00',
          status: 'online',
          unreadCount: 3
        },
        messages: [
          {
            id: '1',
            contactId: '1',
            content: 'Olá, preciso de ajuda com meu pedido',
            timestamp: '2024-01-20T10:00:00',
            type: 'received',
            status: 'read'
          },
          {
            id: '2',
            contactId: '1',
            content: 'Claro! Qual é o número do seu pedido?',
            timestamp: '2024-01-20T10:01:00',
            type: 'sent',
            status: 'read',
            isFromBot: true
          },
          {
            id: '3',
            contactId: '1',
            content: 'É o pedido #12345',
            timestamp: '2024-01-20T10:02:00',
            type: 'received',
            status: 'read'
          },
          {
            id: '4',
            contactId: '1',
            content: 'Deixe-me verificar para você...',
            timestamp: '2024-01-20T10:03:00',
            type: 'sent',
            status: 'delivered'
          }
        ],
        lastMessage: 'Deixe-me verificar para você...',
        timestamp: '2024-01-20T10:03:00',
        inQueue: true,
        queueName: 'Suporte',
        agentName: 'Ana Costa'
      },
      {
        contact: {
          id: '2',
          name: 'Maria Oliveira',
          phone: '+55 21 97654-3210',
          lastSeen: '2024-01-20T09:45:00',
          status: 'offline'
        },
        messages: [
          {
            id: '5',
            contactId: '2',
            content: 'Gostaria de saber sobre os planos',
            timestamp: '2024-01-20T09:30:00',
            type: 'received',
            status: 'read'
          }
        ],
        lastMessage: 'Gostaria de saber sobre os planos',
        timestamp: '2024-01-20T09:30:00'
      },
      {
        contact: {
          id: '3',
          name: 'Pedro Santos',
          phone: '+55 31 96543-2109',
          lastSeen: '2024-01-20T10:20:00',
          status: 'typing',
          unreadCount: 1
        },
        messages: [],
        lastMessage: 'está digitando...',
        timestamp: '2024-01-20T10:31:00'
      }
    ]

    setTimeout(() => {
      setConversations(mockConversations)
      setIsLoading(false)
    }, 1000)
  }, [])

  // Auto-scroll para última mensagem
  useEffect(() => {
    scrollToBottom()
  }, [selectedConversation?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedConversation || isSending) return

    setIsSending(true)
    
    const newMessage: Message = {
      id: Date.now().toString(),
      contactId: selectedConversation.contact.id,
      content: message,
      timestamp: new Date().toISOString(),
      type: 'sent',
      status: 'pending'
    }

    // Adicionar mensagem otimisticamente
    setSelectedConversation({
      ...selectedConversation,
      messages: [...selectedConversation.messages, newMessage]
    })

    setMessage('')

    // Simular envio (substituir por API real)
    setTimeout(() => {
      // Atualizar status da mensagem
      setSelectedConversation(prev => {
        if (!prev) return null
        return {
          ...prev,
          messages: prev.messages.map(msg => 
            msg.id === newMessage.id 
              ? { ...msg, status: 'sent' as const }
              : msg
          )
        }
      })
      setIsSending(false)
    }, 1000)
  }

  const filteredConversations = conversations.filter(conv =>
    conv.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.contact.phone.includes(searchTerm)
  )

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR })
  }

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="h-3 w-3 text-blue-500" />
      case 'delivered':
        return <CheckCheck className="h-3 w-3 text-gray-400" />
      case 'sent':
        return <Check className="h-3 w-3 text-gray-400" />
      default:
        return <Clock className="h-3 w-3 text-gray-300" />
    }
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-50">
      {/* Lista de Conversas */}
      <div className="w-96 bg-white border-r">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversas Ativas</h2>
            <Badge variant="secondary">{conversations.length}</Badge>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <ScrollArea className="h-[calc(100%-5rem)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.contact.id}
                  className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                    selectedConversation?.contact.id === conv.contact.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {conv.contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm truncate">
                          {conv.contact.name}
                        </p>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(conv.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600 truncate">
                          {conv.contact.status === 'typing' 
                            ? 'está digitando...' 
                            : conv.lastMessage}
                        </p>
                        {conv.contact.unreadCount && conv.contact.unreadCount > 0 && (
                          <Badge className="ml-2 h-5 min-w-[20px] px-1">
                            {conv.contact.unreadCount}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {conv.inQueue && (
                          <Badge variant="outline" className="text-xs">
                            <UserCheck className="h-3 w-3 mr-1" />
                            {conv.queueName}
                          </Badge>
                        )}
                        {conv.agentName && (
                          <Badge variant="secondary" className="text-xs">
                            {conv.agentName}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Área de Chat */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Header do Chat */}
          <div className="bg-white border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {selectedConversation.contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <h3 className="font-semibold">{selectedConversation.contact.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{selectedConversation.contact.phone}</span>
                    {selectedConversation.contact.email && (
                      <>
                        <span>•</span>
                        <Mail className="h-3 w-3" />
                        <span>{selectedConversation.contact.email}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Star className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Mensagens */}
          <ScrollArea className="flex-1 p-4 bg-gray-50">
            <div className="space-y-4 max-w-4xl mx-auto">
              {selectedConversation.messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.type === 'sent' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[70%] ${msg.type === 'sent' ? 'order-2' : ''}`}>
                    {msg.isFromBot && (
                      <div className="flex items-center gap-1 mb-1">
                        <Bot className="h-3 w-3 text-purple-600" />
                        <span className="text-xs text-purple-600">Bot Automático</span>
                      </div>
                    )}
                    
                    <div
                      className={`rounded-lg px-4 py-2 ${
                        msg.type === 'sent'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    
                    <div className={`flex items-center gap-1 mt-1 ${
                      msg.type === 'sent' ? 'justify-end' : ''
                    }`}>
                      <span className="text-xs text-gray-500">
                        {formatMessageTime(msg.timestamp)}
                      </span>
                      {msg.type === 'sent' && getStatusIcon(msg.status)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input de Mensagem */}
          <div className="bg-white border-t p-4">
            <div className="flex items-end gap-2">
              <Button variant="ghost" size="icon" className="mb-1">
                <Paperclip className="h-5 w-5" />
              </Button>
              
              <div className="flex-1">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="min-h-[40px] max-h-32 resize-none"
                  rows={1}
                />
              </div>

              <div className="flex gap-1 mb-1">
                <Button variant="ghost" size="icon">
                  <Smile className="h-5 w-5" />
                </Button>
                <Button 
                  onClick={handleSendMessage}
                  disabled={!message.trim() || isSending}
                  size="icon"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Selecione uma conversa
            </h3>
            <p className="text-gray-500">
              Escolha uma conversa na lista para começar a responder
            </p>
          </div>
        </div>
      )}
    </div>
  )
}