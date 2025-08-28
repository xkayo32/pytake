'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageCircle, 
  Search, 
  Phone, 
  Mail, 
  Clock,
  CheckCheck,
  Check,
  RefreshCw,
  User,
  Bot,
  UserCheck,
  Eye,
  Filter,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Calendar,
  ArrowRight
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

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
  sentiment?: 'positive' | 'neutral' | 'negative'
}

export default function ConversationsViewPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'queue' | 'bot'>('all')

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
          }
        ],
        lastMessage: 'Claro! Qual é o número do seu pedido?',
        timestamp: '2024-01-20T10:01:00',
        inQueue: true,
        queueName: 'Suporte',
        agentName: 'Ana Costa',
        sentiment: 'neutral'
      },
      {
        contact: {
          id: '2',
          name: 'Maria Oliveira',
          phone: '+55 21 97654-3210',
          lastSeen: '2024-01-20T09:45:00',
          status: 'offline'
        },
        messages: [],
        lastMessage: 'Obrigada pela ajuda!',
        timestamp: '2024-01-20T09:30:00',
        sentiment: 'positive'
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
        timestamp: '2024-01-20T10:31:00',
        sentiment: 'neutral'
      }
    ]

    setTimeout(() => {
      setConversations(mockConversations)
      setIsLoading(false)
    }, 1000)
  }, [])

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact.phone.includes(searchTerm)
    
    if (selectedFilter === 'all') return matchesSearch
    if (selectedFilter === 'active') return matchesSearch && conv.contact.status === 'online'
    if (selectedFilter === 'queue') return matchesSearch && conv.inQueue
    if (selectedFilter === 'bot') return matchesSearch && !conv.inQueue
    
    return matchesSearch
  })

  const formatMessageTime = (timestamp: string) => {
    return format(new Date(timestamp), 'HH:mm', { locale: ptBR })
  }

  const getSentimentIcon = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'negative':
        return <TrendingDown className="h-3 w-3 text-red-500" />
      default:
        return <Activity className="h-3 w-3 text-gray-400" />
    }
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

  // Métricas
  const totalConversations = conversations.length
  const activeConversations = conversations.filter(c => c.contact.status === 'online').length
  const inQueueCount = conversations.filter(c => c.inQueue).length
  const unreadCount = conversations.reduce((acc, c) => acc + (c.contact.unreadCount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Header com Métricas */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Conversas</h1>
            <p className="text-muted-foreground">
              Acompanhe todas as conversas do sistema
            </p>
          </div>
          
          <Link href="/settings/conversations">
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Gerenciar Conversas
            </Button>
          </Link>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total de Conversas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalConversations}</div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                <span>Todas as conversas</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Conversas Ativas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeConversations}</div>
              <div className="flex items-center gap-1 text-xs text-green-600">
                <Activity className="h-3 w-3" />
                <span>Online agora</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Em Atendimento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{inQueueCount}</div>
              <div className="flex items-center gap-1 text-xs text-blue-600">
                <UserCheck className="h-3 w-3" />
                <span>Com agentes</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Não Lidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
              <div className="flex items-center gap-1 text-xs text-orange-600">
                <MessageCircle className="h-3 w-3" />
                <span>Mensagens pendentes</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Conversas</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
              >
                Todas
              </Button>
              <Button
                variant={selectedFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('active')}
              >
                Ativas
              </Button>
              <Button
                variant={selectedFilter === 'queue' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('queue')}
              >
                Em Fila
              </Button>
              <Button
                variant={selectedFilter === 'bot' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('bot')}
              >
                Bot
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por nome ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="space-y-2">
              {filteredConversations.map((conv) => (
                <div
                  key={conv.contact.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {conv.contact.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {conv.contact.name}
                          </p>
                          {getSentimentIcon(conv.sentiment)}
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatMessageTime(conv.timestamp)}
                        </span>
                      </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-gray-600 truncate flex-1">
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

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <Phone className="h-3 w-3" />
                          <span>{conv.contact.phone}</span>
                          {conv.contact.email && (
                            <>
                              <span>•</span>
                              <Mail className="h-3 w-3" />
                              <span>{conv.contact.email}</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
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
                          
                          <Link href="/settings/conversations">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {filteredConversations.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              )}
            </div>
          )}

          {/* Nota informativa */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">
                  Modo de Visualização
                </p>
                <p className="text-sm text-blue-700 mt-1">
                  Esta é uma visão geral das conversas. Para responder mensagens, acesse o{' '}
                  <Link href="/settings/conversations" className="font-medium underline">
                    painel de gerenciamento
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}