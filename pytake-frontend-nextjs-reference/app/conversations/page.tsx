'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, MessageCircle, Phone, User, Clock, CheckCheck } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'

interface Conversation {
  id: string
  contact: {
    name: string
    phone: string
    avatar?: string
  }
  lastMessage: {
    content: string
    timestamp: string
    sender: 'user' | 'contact'
    read: boolean
  }
  unreadCount: number
  status: 'active' | 'waiting' | 'closed'
  tags: string[]
}

// Mock data for conversations
const mockConversations: Conversation[] = [
  {
    id: '1',
    contact: {
      name: 'João Silva',
      phone: '+55 11 99999-1234',
    },
    lastMessage: {
      content: 'Olá, preciso de ajuda com meu pedido',
      timestamp: '2024-01-15T10:30:00Z',
      sender: 'contact',
      read: false
    },
    unreadCount: 2,
    status: 'active',
    tags: ['suporte', 'urgente']
  },
  {
    id: '2',
    contact: {
      name: 'Maria Santos',
      phone: '+55 11 98888-5678',
    },
    lastMessage: {
      content: 'Obrigada pelo atendimento!',
      timestamp: '2024-01-15T09:15:00Z',
      sender: 'contact',
      read: true
    },
    unreadCount: 0,
    status: 'closed',
    tags: ['vendas']
  },
  {
    id: '3',
    contact: {
      name: 'Carlos Lima',
      phone: '+55 11 97777-9012',
    },
    lastMessage: {
      content: 'Quando posso fazer o pedido?',
      timestamp: '2024-01-15T08:45:00Z',
      sender: 'contact',
      read: false
    },
    unreadCount: 1,
    status: 'waiting',
    tags: ['vendas', 'novo-cliente']
  },
  {
    id: '4',
    contact: {
      name: 'Ana Costa',
      phone: '+55 11 96666-3456',
    },
    lastMessage: {
      content: 'Perfeito, vou aguardar o contato',
      timestamp: '2024-01-14T16:20:00Z',
      sender: 'user',
      read: true
    },
    unreadCount: 0,
    status: 'active',
    tags: ['follow-up']
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200'
    case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    case 'closed': return 'bg-gray-100 text-gray-800 border-gray-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Ativa'
    case 'waiting': return 'Aguardando'
    case 'closed': return 'Finalizada'
    default: return status
  }
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (hours < 1) {
    return `${minutes}min`
  } else if (hours < 24) {
    return `${hours}h`
  } else {
    return date.toLocaleDateString()
  }
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState<Conversation[]>(mockConversations)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = conversation.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conversation.contact.phone.includes(searchTerm) ||
                         conversation.lastMessage.content.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || conversation.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const handleConversationClick = (conversationId: string) => {
    router.push(`/conversations/${conversationId}`)
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Conversas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie todas as suas conversas do WhatsApp
              </p>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
            {/* Conversations List */}
            <div className="lg:col-span-1 border-r bg-background/50">
              {/* Search and Filters */}
              <div className="p-4 border-b">
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar conversas..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
                
                {/* Status Filter */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                  >
                    Todas
                  </Button>
                  <Button
                    variant={filterStatus === 'active' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('active')}
                  >
                    Ativas
                  </Button>
                  <Button
                    variant={filterStatus === 'waiting' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('waiting')}
                  >
                    Aguardando
                  </Button>
                </div>
              </div>

              {/* Conversations List */}
              <div className="overflow-auto h-[calc(100vh-200px)]">
                {filteredConversations.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma conversa encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-1 p-2">
                    {filteredConversations.map((conversation) => (
                      <Card
                        key={conversation.id}
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => handleConversationClick(conversation.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Avatar */}
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                              <User className="h-5 w-5 text-primary" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Header */}
                              <div className="flex items-center justify-between mb-1">
                                <h3 className="font-medium truncate">
                                  {conversation.contact.name}
                                </h3>
                                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                  {conversation.unreadCount > 0 && (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary">
                                      {conversation.unreadCount}
                                    </Badge>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {formatTime(conversation.lastMessage.timestamp)}
                                  </span>
                                </div>
                              </div>

                              {/* Phone */}
                              <div className="flex items-center gap-1 mb-2">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">
                                  {conversation.contact.phone}
                                </span>
                              </div>

                              {/* Last Message */}
                              <div className="flex items-center gap-2 mb-2">
                                {conversation.lastMessage.sender === 'user' && (
                                  <CheckCheck className="h-3 w-3 text-blue-500" />
                                )}
                                <p className="text-sm text-muted-foreground truncate">
                                  {conversation.lastMessage.content}
                                </p>
                              </div>

                              {/* Status and Tags */}
                              <div className="flex items-center justify-between">
                                <Badge 
                                  variant="outline" 
                                  className={getStatusColor(conversation.status)}
                                >
                                  {getStatusLabel(conversation.status)}
                                </Badge>
                                
                                <div className="flex gap-1">
                                  {conversation.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="secondary" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Empty State for Chat */}
            <div className="lg:col-span-2 hidden lg:flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="h-24 w-24 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-medium mb-2">Selecione uma conversa</h3>
                <p>Escolha uma conversa da lista para começar</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}