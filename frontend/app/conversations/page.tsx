'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AppLayout } from '@/components/layout/app-layout'
import { useConversations } from '@/lib/hooks/useConversations'
import { useSentimentAnalysis } from '@/lib/hooks/useSentimentAnalysis'
import { useIntentClassification } from '@/lib/hooks/useIntentClassification'
import { SentimentIndicator } from '@/components/ai/sentiment-indicator'
import { IntentDisplay } from '@/components/ai/intent-display'
import { 
  MessageCircle, 
  Search, 
  Phone, 
  RefreshCw,
  User,
  Bot,
  UserCheck,
  Eye,
  Filter,
  Users,
  Activity,
  Clock,
  CheckCheck,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Link from 'next/link'

export default function ConversationsViewPage() {
  const {
    conversations,
    searchTerm,
    setSearchTerm,
    statusFilter,
    setStatusFilter,
    isLoading,
    error,
    unreadCount,
    isConnected,
    selectConversation,
    loadConversations
  } = useConversations()

  // Mock data for AI analysis per conversation
  const getConversationAnalysis = (conversation: any) => {
    const mockMessages = [
      { 
        id: `msg-${conversation.id}-1`, 
        content: conversation.last_message || 'Olá, preciso de ajuda!', 
        sender: 'customer' as const, 
        timestamp: new Date(conversation.last_message_time || Date.now()) 
      }
    ]
    return { messages: mockMessages }
  }

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500'
      case 'waiting': return 'bg-yellow-500'
      case 'assigned': return 'bg-blue-500'
      case 'closed': return 'bg-gray-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo'
      case 'waiting': return 'Aguardando'
      case 'assigned': return 'Atribuído'
      case 'closed': return 'Fechado'
      default: return status
    }
  }

  const formatLastSeen = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return format(date, 'HH:mm - dd/MM', { locale: ptBR })
    } catch {
      return 'Agora'
    }
  }

  const getContactInitials = (name?: string, phone?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (phone) {
      return phone.slice(-2)
    }
    return 'C'
  }

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold">Conversas</h1>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Wifi className="h-3 w-3 mr-1" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800">
                    <WifiOff className="h-3 w-3 mr-1" />
                    Desconectado
                  </Badge>
                )}
                {unreadCount > 0 && (
                  <Badge className="bg-primary">
                    {unreadCount} não lidas
                  </Badge>
                )}
              </div>
            </div>
            <p className="text-foreground-secondary mt-1">
              Gerencie todas as suas conversas do WhatsApp
            </p>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadConversations} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button asChild>
              <Link href="/conversations/new">
                <MessageCircle className="h-4 w-4 mr-2" />
                Nova Conversa
              </Link>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-600">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={loadConversations} className="ml-auto">
              Tentar novamente
            </Button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Pesquisar conversas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant={statusFilter === 'all' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              <Users className="h-4 w-4 mr-2" />
              Todas
            </Button>
            <Button 
              variant={statusFilter === 'active' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('active')}
            >
              <Activity className="h-4 w-4 mr-2" />
              Ativas
            </Button>
            <Button 
              variant={statusFilter === 'waiting' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('waiting')}
            >
              <Clock className="h-4 w-4 mr-2" />
              Aguardando
            </Button>
            <Button 
              variant={statusFilter === 'assigned' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setStatusFilter('assigned')}
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Atribuídas
            </Button>
          </div>
        </div>

        {/* Conversations List */}
        <div className="grid gap-4">
          {conversations.length === 0 ? (
            <Card className="p-8 text-center">
              <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma conversa encontrada</h3>
              <p className="text-foreground-secondary">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tente ajustar seus filtros de busca'
                  : 'As conversas aparecerão aqui quando você receber mensagens'
                }
              </p>
            </Card>
          ) : (
            conversations.map((conversation) => {
              const analysisData = getConversationAnalysis(conversation)
              
              return (
                <Card 
                  key={conversation.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => selectConversation(conversation.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <Avatar className="h-12 w-12">
                        <AvatarFallback>
                          {getContactInitials(conversation.contact?.name, conversation.contact?.phone)}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold truncate">
                              {conversation.contact?.name || conversation.contact?.phone || 'Contato'}
                            </h3>
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(conversation.status)}`} />
                            <Badge variant="outline" className="text-xs">
                              {getStatusLabel(conversation.status)}
                            </Badge>
                            
                            {/* AI Analysis Components */}
                            <ConversationAIInsights conversation={conversation} messages={analysisData.messages} />
                          </div>
                          <span className="text-xs text-foreground-secondary">
                            {formatLastSeen(conversation.last_message_time || conversation.updated_at)}
                          </span>
                        </div>
                      
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm text-foreground-secondary truncate flex-1">
                          {conversation.last_message || 'Sem mensagens'}
                        </p>
                        {conversation.unread_count > 0 && (
                          <Badge className="ml-2 h-5 min-w-[20px] px-1">
                            {conversation.unread_count}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                          <Phone className="h-3 w-3" />
                          <span>{conversation.contact?.phone || 'Sem telefone'}</span>
                          {conversation.assigned_to && (
                            <>
                              <span>•</span>
                              <User className="h-3 w-3" />
                              <span>Atribuído</span>
                            </>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/conversations/${conversation.id}`} onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3 mr-1" />
                              Ver
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )})
          )}
        </div>

        {/* Stats Footer */}
        <div className="flex items-center justify-center gap-6 text-sm text-foreground-secondary pt-6 border-t">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>{conversations.length} conversas</span>
          </div>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <span>{unreadCount} não lidas</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <Wifi className="h-4 w-4 text-green-600" />
                <span>Tempo real ativo</span>
              </>
            ) : (
              <>
                <WifiOff className="h-4 w-4 text-red-600" />
                <span>Atualizações manuais</span>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}

// AI Insights Component for each conversation
function ConversationAIInsights({ conversation, messages }: { conversation: any; messages: any[] }) {
  const sentimentAnalysis = useSentimentAnalysis(messages)
  const intentClassification = useIntentClassification(messages)

  if (!sentimentAnalysis.hasCurrentAnalysis && !intentClassification.currentIntent) {
    return null
  }

  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      {sentimentAnalysis.hasCurrentAnalysis && sentimentAnalysis.currentSentiment && (
        <SentimentIndicator 
          result={sentimentAnalysis.currentSentiment}
          size="sm"
          showLabel={false}
        />
      )}
      {intentClassification.currentIntent && (
        <IntentDisplay 
          result={intentClassification.currentIntent}
          confidence={intentClassification.recentConfidence}
          size="sm"
          showLabel={false}
        />
      )}
    </div>
  )
}