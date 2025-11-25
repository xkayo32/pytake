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
  draft: { color: 'from-gray-500 to-gray-600', label: 'Rascunho' },
  running: { color: 'from-green-500 to-green-600', label: 'Em Execução' },
  paused: { color: 'from-yellow-500 to-yellow-600', label: 'Pausada' },
  completed: { color: 'from-blue-500 to-blue-600', label: 'Concluída' },
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="section-title flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-primary" />
              Campanhas
            </h1>
            <p className="section-subtitle">Crie e monitore suas campanhas de marketing</p>
          </div>
          <Button className="btn-primary">
            <Plus className="w-5 h-5" />
            Nova Campanha
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div>
            <label className="block text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Nome da campanha..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary"
            >
              <option value="all">Todas</option>
              <option value="draft">Rascunho</option>
              <option value="running">Em Execução</option>
              <option value="paused">Pausada</option>
              <option value="completed">Concluída</option>
            </select>
          </div>

          <div className="flex items-end">
            <div className="w-full p-3 bg-info/10 border border-info/30 rounded-lg text-sm">
              <strong>{filteredCampaigns.length}</strong> campanhas encontradas
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-interactive h-32 skeleton"></div>
            ))}
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="card-interactive text-center py-12">
            <TrendingUp className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-lg font-medium mb-2">Nenhuma campanha encontrada</p>
            <p className="text-muted-foreground mb-6">Crie sua primeira campanha para começar</p>
            <Button className="btn-primary">
              <Plus className="w-5 h-5" />
              Criar Campanha
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCampaigns.map((campaign) => {
              const config = statusConfig[campaign.status as keyof typeof statusConfig]
              const openRate = getOpenRate(campaign)
              const clickRate = getClickRate(campaign)

              return (
                <div key={campaign.id} className="card-interactive">
                  <div className="flex items-start gap-6">
                    {/* Status Indicator */}
                    <div className={`w-16 h-16 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center text-white font-bold text-2xl flex-shrink-0`}>
                      {campaign.sent_count}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <h3 className="font-semibold text-lg mb-1">{campaign.name}</h3>
                          <div className="flex items-center gap-3">
                            <span className={`badge-info text-xs font-medium`}>
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
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-secondary/30 rounded-lg">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Destinatários</p>
                          <p className="text-lg font-bold">{campaign.recipients_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Enviadas</p>
                          <p className="text-lg font-bold text-green-600 dark:text-green-400">{campaign.sent_count}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Taxa Abertura</p>
                          <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{openRate}%</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Taxa Clique</p>
                          <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{clickRate}%</p>
                        </div>
                      </div>

                      {/* Progress Bars */}
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Progresso</span>
                            <span className="font-medium">{Math.round((campaign.sent_count / campaign.recipients_count) * 100)}%</span>
                          </div>
                          <div className="h-2 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-600"
                              style={{ width: `${Math.round((campaign.sent_count / campaign.recipients_count) * 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 flex-shrink-0">
                      {campaign.status === 'draft' && (
                        <button className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Iniciar">
                          <Play className="w-5 h-5 text-green-600" />
                        </button>
                      )}
                      {campaign.status === 'running' && (
                        <button className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Pausar">
                          <Pause className="w-5 h-5 text-yellow-600" />
                        </button>
                      )}
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Visualizar">
                        <Eye className="w-5 h-5" />
                      </button>
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors" title="Deletar">
                        <Trash2 className="w-5 h-5 text-red-600" />
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
