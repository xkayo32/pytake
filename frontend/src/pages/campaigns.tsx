import { useEffect, useState } from 'react'
import { Plus, Search, Play, Pause, Eye, Trash2, TrendingUp, AlertCircle, Calendar } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface Campaign {
  id: string
  name: string
  status: 'draft' | 'running' | 'paused' | 'completed'
  recipients_count: number
  sent_count: number
  opened_count: number
  clicked_count: number
  created_at: string
  scheduled_for?: string
}

const statusConfig = {
  draft: { gradient: 'from-neutral-400 to-neutral-500', label: 'Rascunho', badge: 'badge-neutral' },
  running: { gradient: 'from-primary-500 to-primary-600', label: 'Em Execução', badge: 'badge-success' },
  paused: { gradient: 'from-amber-500 to-orange-500', label: 'Pausada', badge: 'badge-warning' },
  completed: { gradient: 'from-blue-500 to-blue-600', label: 'Concluída', badge: 'badge-info' },
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${getApiUrl()}/api/v1/campaigns`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error('Falha ao carregar campanhas')
        const data = await response.json()
        setCampaigns(Array.isArray(data) ? data : data.items || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas')
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  const filteredCampaigns = campaigns.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const getOpenRate = (campaign: Campaign) => {
    if (campaign.sent_count === 0) return 0
    return Math.round((campaign.opened_count / campaign.sent_count) * 100)
  }

  const getClickRate = (campaign: Campaign) => {
    if (campaign.opened_count === 0) return 0
    return Math.round((campaign.clicked_count / campaign.opened_count) * 100)
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 animate-fade-in">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Campanhas</h1>
            </div>
            <p className="text-muted-foreground ml-[52px]">Crie e monitore suas campanhas de marketing</p>
          </div>
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nova Campanha
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fade-in">
          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Nome da campanha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2 text-muted-foreground">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full h-10 px-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              <option value="all">Todas</option>
              <option value="draft">Rascunho</option>
              <option value="running">Em Execução</option>
              <option value="paused">Pausada</option>
              <option value="completed">Concluída</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="w-full p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary/20 rounded-xl text-sm">
              <strong className="text-primary-700 dark:text-primary-400">{filteredCampaigns.length}</strong>
              <span className="text-primary-600 dark:text-primary-500"> campanhas encontradas</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex gap-3 animate-scale-in">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 h-32 skeleton"></div>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="bg-card border border-border rounded-xl text-center py-12 animate-fade-in">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium mb-2 text-foreground">Nenhuma campanha encontrada</p>
            <p className="text-muted-foreground mb-6 text-sm">Crie sua primeira campanha para começar</p>
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Criar Campanha
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign, index) => {
              const config = statusConfig[campaign.status as keyof typeof statusConfig]
              const openRate = getOpenRate(campaign)
              const clickRate = getClickRate(campaign)
              const progress = campaign.recipients_count > 0 
                ? Math.round((campaign.sent_count / campaign.recipients_count) * 100) 
                : 0

              return (
                <div 
                  key={campaign.id} 
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-fade-in group"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4 lg:gap-6">
                    {/* Status Indicator */}
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${config.gradient} flex items-center justify-center text-white font-bold text-lg flex-shrink-0 shadow-sm`}>
                      {campaign.sent_count > 999 ? `${(campaign.sent_count/1000).toFixed(1)}k` : campaign.sent_count}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground group-hover:text-primary-600 transition-colors">
                            {campaign.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`${config.badge} text-xs`}>
                              ● {config.label}
                            </span>
                            {campaign.scheduled_for && (
                              <span className="text-xs text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Agendado para {new Date(campaign.scheduled_for).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 p-3 bg-muted/30 rounded-xl">
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Destinatários</p>
                          <p className="text-lg font-bold text-foreground">{campaign.recipients_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Enviadas</p>
                          <p className="text-lg font-bold text-primary-600 dark:text-primary-400">{campaign.sent_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Taxa Abertura</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{openRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-0.5">Taxa Clique</p>
                          <p className="text-lg font-bold text-secondary-600 dark:text-secondary-400">{clickRate}%</p>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="text-muted-foreground">Progresso</span>
                          <span className="font-medium text-foreground">{progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex lg:flex-col gap-2 flex-shrink-0">
                      {campaign.status === 'draft' && (
                        <button className="p-2.5 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-xl transition-colors" title="Iniciar">
                          <Play className="w-5 h-5 text-primary-600" />
                        </button>
                      )}
                      {campaign.status === 'running' && (
                        <button className="p-2.5 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-xl transition-colors" title="Pausar">
                          <Pause className="w-5 h-5 text-amber-600" />
                        </button>
                      )}
                      <button className="p-2.5 hover:bg-muted rounded-xl transition-colors" title="Visualizar">
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      </button>
                      <button className="p-2.5 hover:bg-muted rounded-xl transition-colors" title="Deletar">
                        <Trash2 className="w-5 h-5 text-destructive" />
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
  )
}
