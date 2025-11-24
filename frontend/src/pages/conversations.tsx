import { useEffect, useState } from 'react'
import { Plus, Search, MoreVertical, MessageSquare, AlertCircle, ChevronRight } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@components/ui/avatar'
import { getApiUrl, getAuthHeaders } from '@lib/api'
import { ConversationDetail } from '@components/Conversations/ConversationDetail'

export interface Conversation {
  id: string
  contact_id: string
  contact_name: string
  contact_phone: string
  contact_avatar?: string
  last_message: string
  last_message_at: string
  status: 'open' | 'resolved' | 'assigned' | 'archived'
  unread_count: number
  assigned_to?: string
  organization_id: string
  created_at: string
  updated_at: string
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved' | 'assigned' | 'archived'>('all')
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  // Fetch conversations list
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${getApiUrl()}/api/v1/conversations`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error(`Failed to fetch conversations: ${response.statusText}`)
        const data = await response.json()
        setConversations(Array.isArray(data) ? data : data.items || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar conversas')
        setConversations([])
      } finally {
        setLoading(false)
      }
    }

    fetchConversations()
  }, [])

  // Filter conversations
  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = 
      conv.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      conv.contact_phone?.includes(searchTerm) ||
      conv.last_message?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Sort by last message (most recent first)
  const sortedConversations = [...filteredConversations].sort(
    (a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  )

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation)
    setShowDetail(true)
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Conversas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Gerencie conversas com seus contatos WhatsApp
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nome, telefone ou mensagem..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-4 py-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
        >
          <option value="all">Todos os Status</option>
          <option value="open">Abertas</option>
          <option value="resolved">Resolvidas</option>
          <option value="assigned">Atribuídas</option>
          <option value="archived">Arquivadas</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-300">Erro ao carregar conversas</p>
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Conversations List */}
      {!loading && sortedConversations.length > 0 && (
        <div className="space-y-3">
          {sortedConversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => handleSelectConversation(conversation)}
              className="bg-white dark:bg-slate-800 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarImage src={conversation.contact_avatar} />
                  <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                    {conversation.contact_name?.charAt(0).toUpperCase() || 'C'}
                  </AvatarFallback>
                </Avatar>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                        {conversation.contact_name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {conversation.contact_phone}
                      </p>
                    </div>
                    {conversation.unread_count > 0 && (
                      <Badge className="bg-red-500 text-white flex-shrink-0">
                        {conversation.unread_count}
                      </Badge>
                    )}
                  </div>

                  {/* Last Message */}
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate mb-2">
                    {conversation.last_message}
                  </p>

                  {/* Status and Time */}
                  <div className="flex items-center justify-between gap-2">
                    <Badge className={getStatusColor(conversation.status)}>
                      {getStatusLabel(conversation.status)}
                    </Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(conversation.last_message_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Chevron */}
                <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-500 flex-shrink-0 mt-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedConversations.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Nenhuma conversa encontrada
          </h3>
          <p className="text-slate-600 dark:text-slate-400">
            {searchTerm ? 'Tente ajustar seus critérios de busca' : 'Suas conversas aparecerão aqui'}
          </p>
        </div>
      )}

      {/* Detail Drawer/Modal */}
      {showDetail && selectedConversation && (
        <ConversationDetail
          conversation={selectedConversation}
          onClose={() => {
            setShowDetail(false)
            setSelectedConversation(null)
          }}
        />
      )}
    </div>
  )
}
