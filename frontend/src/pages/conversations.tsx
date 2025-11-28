import { useEffect, useState } from 'react'
import { Search, MessageCircle, Clock, AlertCircle, CheckCircle2, Trash2, Archive, Filter } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export interface Conversation {
  id: string
  contact_id: string
  contact_name: string
  contact_phone: string
  last_message: string
  last_message_at: string
  status: 'open' | 'resolved' | 'assigned' | 'archived'
  unread_count: number
  assigned_to?: string
}

const statusConfig = {
  open: { color: 'from-primary-500 to-primary-600', label: 'Aberta', icon: MessageCircle, badge: 'badge-success' },
  resolved: { color: 'from-blue-500 to-blue-600', label: 'Resolvida', icon: CheckCircle2, badge: 'badge-info' },
  assigned: { color: 'from-amber-500 to-orange-500', label: 'Atribuída', icon: Archive, badge: 'badge-warning' },
  archived: { color: 'from-neutral-400 to-neutral-500', label: 'Arquivada', icon: Archive, badge: 'badge-neutral' },
}

export default function Conversations() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved' | 'assigned' | 'archived'>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

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

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = conv.contact_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         conv.contact_phone.includes(searchTerm)
    const matchesStatus = filterStatus === 'all' || conv.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const then = new Date(date)
    const diff = now.getTime() - then.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'Agora'
    if (minutes < 60) return `${minutes}m atrás`
    if (hours < 24) return `${hours}h atrás`
    return `${days}d atrás`
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Conversas</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Gerencie todas as suas conversas em um só lugar</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters */}
          <div className="bg-card border border-border rounded-xl p-5 h-fit animate-fade-in">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              Filtros
            </h3>
            
            {/* Search */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-muted-foreground">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Nome ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-10"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium mb-3 text-muted-foreground">Status</label>
              <div className="space-y-1">
                {['all', 'open', 'resolved', 'assigned', 'archived'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as any)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      filterStatus === status
                        ? 'bg-primary-500 text-white'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {status === 'all' ? 'Todas' : statusConfig[status as keyof typeof statusConfig].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-border space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{filteredConversations.length}</strong> conversas encontradas
              </p>
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">{conversations.filter(c => c.unread_count > 0).length}</strong> não lidas
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 animate-scale-in">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="bg-card border border-border rounded-xl p-5 h-24 skeleton"></div>
                ))}
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="bg-card border border-border rounded-xl text-center py-12 animate-fade-in">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-lg font-medium mb-2 text-foreground">Nenhuma conversa encontrada</p>
                <p className="text-muted-foreground text-sm">Tente ajustar seus filtros ou busca</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredConversations.map((conv, index) => {
                  const statusInfo = statusConfig[conv.status as keyof typeof statusConfig]
                  const StatusIcon = statusInfo.icon

                  return (
                    <div
                      key={conv.id}
                      onClick={() => setSelectedId(conv.id)}
                      className={`bg-card border rounded-xl p-4 cursor-pointer transition-all duration-200 animate-fade-in group ${
                        selectedId === conv.id 
                          ? 'border-primary-500 ring-2 ring-primary-500/20' 
                          : 'border-border hover:border-primary/30 hover:shadow-sm'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${statusInfo.color} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm`}>
                          {getInitials(conv.contact_name)}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex-1">
                              <h3 className="font-semibold text-foreground truncate group-hover:text-primary-600 transition-colors">
                                {conv.contact_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">{conv.contact_phone}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {conv.unread_count > 0 && (
                                <span className="bg-primary-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground truncate mb-3">{conv.last_message}</p>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`${statusInfo.badge} text-xs`}>
                                <StatusIcon className="w-3 h-3" />
                                {statusInfo.label}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {getTimeAgo(conv.last_message_at)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Arquivar">
                            <Archive className="w-4 h-4 text-muted-foreground" />
                          </button>
                          <button className="p-2 hover:bg-muted rounded-lg transition-colors" title="Deletar">
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
