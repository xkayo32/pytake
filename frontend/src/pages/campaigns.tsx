import { useEffect, useState } from 'react'
import { Plus, Search, Trash2, Play, Pause, RotateCcw, AlertCircle, CheckCircle, Clock, Zap, Archive } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Input } from '@components/ui/input'
import { Badge } from '@components/ui/badge'
import Link from 'next/link'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export interface Campaign {
  id: string
  name: string
  description?: string
  status: 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'
  target_type: string
  total_recipients: number
  sent_count: number
  success_count: number
  error_count: number
  template_id: string
  scheduled_at?: string
  started_at?: string
  completed_at?: string
  organization_id: string
  created_by: string
  created_at: string
  updated_at: string
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'draft' | 'scheduled' | 'running' | 'paused' | 'completed' | 'cancelled'>('all')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  // Fetch campaigns
  useEffect(() => {
    const fetchCampaigns = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${getApiUrl()}/api/v1/campaigns`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error(`Failed to fetch campaigns: ${response.statusText}`)
        const data = await response.json()
        setCampaigns(Array.isArray(data) ? data : data.items || [])
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar campanhas')
        setCampaigns([])
      } finally {
        setLoading(false)
      }
    }

    fetchCampaigns()
  }, [])

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = 
      campaign.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      campaign.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // Sort by creation date (newest first)
  const sortedCampaigns = [...filteredCampaigns].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  // Delete campaign
  const handleDeleteCampaign = async (campaignId: string) => {
    try {
      setActionLoading(campaignId)
      const response = await fetch(
        `${getApiUrl()}/api/v1/campaigns/${campaignId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders()
        }
      )
      if (!response.ok) throw new Error('Falha ao deletar campanha')
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
      setDeleteConfirm(null)
    } catch (err) {
      console.error('Erro ao deletar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Start campaign
  const handleStartCampaign = async (campaignId: string) => {
    try {
      setActionLoading(campaignId)
      const response = await fetch(
        `${getApiUrl()}/api/v1/campaigns/${campaignId}/start`,
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      )
      if (!response.ok) throw new Error('Falha ao iniciar campanha')
      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, status: 'running' as const } : c)
      )
    } catch (err) {
      console.error('Erro ao iniciar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Pause campaign
  const handlePauseCampaign = async (campaignId: string) => {
    try {
      setActionLoading(campaignId)
      const response = await fetch(
        `${getApiUrl()}/api/v1/campaigns/${campaignId}/pause`,
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      )
      if (!response.ok) throw new Error('Falha ao pausar campanha')
      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, status: 'paused' as const } : c)
      )
    } catch (err) {
      console.error('Erro ao pausar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  // Resume campaign
  const handleResumeCampaign = async (campaignId: string) => {
    try {
      setActionLoading(campaignId)
      const response = await fetch(
        `${getApiUrl()}/api/v1/campaigns/${campaignId}/resume`,
        {
          method: 'POST',
          headers: getAuthHeaders()
        }
      )
      if (!response.ok) throw new Error('Falha ao retomar campanha')
      setCampaigns(prev =>
        prev.map(c => c.id === campaignId ? { ...c, status: 'running' as const } : c)
      )
    } catch (err) {
      console.error('Erro ao retomar:', err)
    } finally {
      setActionLoading(null)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return <Clock className="w-4 h-4" />
      case 'scheduled':
        return <Clock className="w-4 h-4" />
      case 'running':
        return <Zap className="w-4 h-4" />
      case 'paused':
        return <Pause className="w-4 h-4" />
      case 'completed':
        return <CheckCircle className="w-4 h-4" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300'
      case 'scheduled':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
      case 'running':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
      case 'paused':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
      case 'completed':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300'
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-300'
    }
  }

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: 'Rascunho',
      scheduled: 'Agendada',
      running: 'Enviando',
      paused: 'Pausada',
      completed: 'Concluída',
      cancelled: 'Cancelada'
    }
    return labels[status] || status
  }

  const calculateProgress = (campaign: Campaign) => {
    if (campaign.total_recipients === 0) return 0
    return Math.round((campaign.sent_count / campaign.total_recipients) * 100)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
            Campanhas
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Crie e gerencie suas campanhas de mensagens em massa
          </p>
        </div>
        <Link href="/campaigns/create">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" />
            Nova Campanha
          </Button>
        </Link>
      </div>

      {/* Filters and Search */}
      <div className="mb-6 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            type="text"
            placeholder="Buscar por nome ou descrição..."
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
          <option value="draft">Rascunho</option>
          <option value="scheduled">Agendada</option>
          <option value="running">Enviando</option>
          <option value="paused">Pausada</option>
          <option value="completed">Concluída</option>
          <option value="cancelled">Cancelada</option>
        </select>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-red-900 dark:text-red-300">Erro ao carregar campanhas</p>
            <p className="text-red-800 dark:text-red-400 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-white dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Campaigns List */}
      {!loading && sortedCampaigns.length > 0 && (
        <div className="space-y-4">
          {sortedCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-white dark:bg-slate-800 rounded-lg p-5 border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Campaign Info */}
                <div className="md:col-span-2">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate text-lg">
                        {campaign.name}
                      </h3>
                      {campaign.description && (
                        <p className="text-sm text-slate-600 dark:text-slate-400 truncate">
                          {campaign.description}
                        </p>
                      )}
                    </div>
                    <Badge className={`${getStatusColor(campaign.status)} flex items-center gap-1 whitespace-nowrap`}>
                      {getStatusIcon(campaign.status)}
                      {getStatusLabel(campaign.status)}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Destinatários</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {campaign.total_recipients}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Enviadas</p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {campaign.sent_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Sucesso</p>
                      <p className="font-semibold text-green-600 dark:text-green-400">
                        {campaign.success_count}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Erros</p>
                      <p className="font-semibold text-red-600 dark:text-red-400">
                        {campaign.error_count}
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {campaign.status === 'running' && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-slate-600 dark:text-slate-400">Progresso</span>
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {calculateProgress(campaign)}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${calculateProgress(campaign)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                    {campaign.scheduled_at && (
                      <span>Agendado: {new Date(campaign.scheduled_at).toLocaleDateString('pt-BR')}</span>
                    )}
                    {campaign.started_at && (
                      <span>Iniciada: {new Date(campaign.started_at).toLocaleDateString('pt-BR')}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="md:col-span-1 flex flex-col gap-2">
                  {campaign.status === 'draft' && (
                    <>
                      <Link href={`/campaigns/${campaign.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full">
                          Editar
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleStartCampaign(campaign.id)}
                        disabled={actionLoading === campaign.id}
                        className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Iniciar
                      </Button>
                    </>
                  )}

                  {campaign.status === 'scheduled' && (
                    <>
                      <Link href={`/campaigns/${campaign.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full">
                          Editar
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        onClick={() => handleStartCampaign(campaign.id)}
                        disabled={actionLoading === campaign.id}
                        className="bg-green-600 hover:bg-green-700 text-white w-full"
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Enviar Agora
                      </Button>
                    </>
                  )}

                  {campaign.status === 'running' && (
                    <Button
                      size="sm"
                      onClick={() => handlePauseCampaign(campaign.id)}
                      disabled={actionLoading === campaign.id}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white w-full"
                    >
                      <Pause className="w-4 h-4 mr-1" />
                      Pausar
                    </Button>
                  )}

                  {campaign.status === 'paused' && (
                    <Button
                      size="sm"
                      onClick={() => handleResumeCampaign(campaign.id)}
                      disabled={actionLoading === campaign.id}
                      className="bg-green-600 hover:bg-green-700 text-white w-full"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Retomar
                    </Button>
                  )}

                  {(campaign.status === 'completed' || campaign.status === 'cancelled') && (
                    <>
                      <Link href={`/campaigns/${campaign.id}`} className="w-full">
                        <Button variant="outline" size="sm" className="w-full">
                          Ver Detalhes
                        </Button>
                      </Link>
                    </>
                  )}

                  {/* Delete Button */}
                  {(campaign.status === 'draft' || campaign.status === 'scheduled') && (
                    <>
                      {deleteConfirm === campaign.id ? (
                        <Button
                          size="sm"
                          className="bg-red-600 hover:bg-red-700 text-white w-full"
                          onClick={() => handleDeleteCampaign(campaign.id)}
                          disabled={actionLoading === campaign.id}
                        >
                          Confirmar Delete
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteConfirm(campaign.id)}
                          className="text-red-600 hover:text-red-700 dark:text-red-400 w-full"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Deletar
                        </Button>
                      )}
                      {deleteConfirm === campaign.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setDeleteConfirm(null)}
                        >
                          Cancelar
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedCampaigns.length === 0 && (
        <div className="text-center py-16">
          <Plus className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Nenhuma campanha encontrada
          </h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            {searchTerm ? 'Tente ajustar seus critérios de busca' : 'Comece criando sua primeira campanha'}
          </p>
          <Link href="/campaigns/create">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Criar Campanha
            </Button>
          </Link>
        </div>
      )}
    </div>
  )
}
