'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Play,
  Pause,
  StopCircle,
  Copy,
  Trash2,
  Edit3,
  BarChart3,
  Send,
  Users,
  Clock,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  TrendingUp,
  Target,
  MessageSquare,
  RefreshCw,
  Zap,
  DollarSign
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { MOCK_CAMPAIGNS, Campaign, CampaignStatus } from '@/lib/types/campaign'

const statusConfig: Record<CampaignStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Edit3 },
  scheduled: { label: 'Agendada', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Clock },
  running: { label: 'Em Execução', color: 'bg-green-100 text-green-800 border-green-200', icon: Play },
  paused: { label: 'Pausada', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Pause },
  completed: { label: 'Concluída', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle }
}

const typeConfig = {
  immediate: { label: 'Imediata', icon: Zap, color: 'text-orange-600' },
  scheduled: { label: 'Agendada', icon: Calendar, color: 'text-blue-600' },
  recurring: { label: 'Recorrente', icon: RefreshCw, color: 'text-green-600' }
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(MOCK_CAMPAIGNS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
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

  const filteredCampaigns = campaigns.filter(campaign => {
    const matchesSearch = campaign.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         campaign.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesStatus = filterStatus === 'all' || campaign.status === filterStatus
    const matchesType = filterType === 'all' || campaign.type === filterType

    return matchesSearch && matchesStatus && matchesType
  })

  const handlePlayPause = (campaignId: string, currentStatus: CampaignStatus) => {
    setCampaigns(prev => prev.map(campaign => {
      if (campaign.id === campaignId) {
        let newStatus: CampaignStatus = currentStatus
        if (currentStatus === 'running') newStatus = 'paused'
        else if (currentStatus === 'paused' || currentStatus === 'scheduled') newStatus = 'running'
        else if (currentStatus === 'draft') newStatus = 'scheduled'
        
        return { ...campaign, status: newStatus }
      }
      return campaign
    }))
  }

  const handleStop = (campaignId: string) => {
    if (confirm('Tem certeza que deseja parar esta campanha? Esta ação não pode ser desfeita.')) {
      setCampaigns(prev => prev.map(campaign => 
        campaign.id === campaignId 
          ? { ...campaign, status: 'completed' as CampaignStatus }
          : campaign
      ))
    }
  }

  const handleDelete = (campaignId: string) => {
    if (confirm('Tem certeza que deseja excluir esta campanha?')) {
      setCampaigns(prev => prev.filter(c => c.id !== campaignId))
    }
  }

  const handleDuplicate = (campaignId: string) => {
    const original = campaigns.find(c => c.id === campaignId)
    if (original) {
      const duplicate: Campaign = {
        ...original,
        id: Date.now().toString(),
        name: `${original.name} (Cópia)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        metrics: {
          sent: 0,
          delivered: 0,
          read: 0,
          replied: 0,
          failed: 0,
          pending: original.target.estimatedReach || 0,
          clickedLinks: 0,
          conversionRate: 0
        }
      }
      setCampaigns(prev => [duplicate, ...prev])
    }
  }

  const stats = {
    total: campaigns.length,
    running: campaigns.filter(c => c.status === 'running').length,
    scheduled: campaigns.filter(c => c.status === 'scheduled').length,
    completed: campaigns.filter(c => c.status === 'completed').length,
    totalSent: campaigns.reduce((sum, c) => sum + c.metrics.sent, 0),
    totalDelivered: campaigns.reduce((sum, c) => sum + c.metrics.delivered, 0),
    avgConversion: campaigns.length > 0 
      ? campaigns.reduce((sum, c) => sum + c.metrics.conversionRate, 0) / campaigns.length
      : 0
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getProgressPercentage = (campaign: Campaign) => {
    const total = campaign.metrics.sent + campaign.metrics.pending + campaign.metrics.failed
    if (total === 0) return 0
    return Math.round((campaign.metrics.sent / total) * 100)
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Campanhas</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie suas campanhas de mensagens em massa
              </p>
            </div>
            <Button onClick={() => router.push('/campaigns/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Campanha
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Campanhas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Em Execução</CardTitle>
                <Play className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.running}</div>
                <p className="text-xs text-muted-foreground">Ativas agora</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agendadas</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.scheduled}</div>
                <p className="text-xs text-muted-foreground">Futuras</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Enviadas</CardTitle>
                <Send className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">
                  {stats.totalSent.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Mensagens</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Entregues</CardTitle>
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {stats.totalDelivered.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Com sucesso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversão</CardTitle>
                <TrendingUp className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.avgConversion.toFixed(1)}%
                </div>
                <p className="text-xs text-muted-foreground">Média geral</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar campanhas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todas
              </Button>
              <Button
                variant={filterStatus === 'running' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('running')}
              >
                Em Execução
              </Button>
              <Button
                variant={filterStatus === 'scheduled' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('scheduled')}
              >
                Agendadas
              </Button>
              <Button
                variant={filterStatus === 'completed' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('completed')}
              >
                Concluídas
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterType === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('all')}
              >
                Todos Tipos
              </Button>
              <Button
                variant={filterType === 'immediate' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('immediate')}
              >
                Imediatas
              </Button>
              <Button
                variant={filterType === 'recurring' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('recurring')}
              >
                Recorrentes
              </Button>
            </div>
          </div>

          {/* Campaigns List */}
          {filteredCampaigns.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Send className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma campanha encontrada</h3>
                <p className="mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca' 
                    : 'Crie sua primeira campanha de mensagens'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push('/campaigns/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Campanha
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCampaigns.map((campaign) => {
                const StatusIcon = statusConfig[campaign.status].icon
                const TypeIcon = typeConfig[campaign.type].icon
                const progress = getProgressPercentage(campaign)
                
                return (
                  <Card key={campaign.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold">{campaign.name}</h3>
                            <Badge 
                              variant="outline" 
                              className={statusConfig[campaign.status].color}
                            >
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig[campaign.status].label}
                            </Badge>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <TypeIcon className={`h-3 w-3 ${typeConfig[campaign.type].color}`} />
                              {typeConfig[campaign.type].label}
                            </Badge>
                          </div>
                          
                          {campaign.description && (
                            <p className="text-sm text-muted-foreground mb-3">
                              {campaign.description}
                            </p>
                          )}

                          {/* Target Info */}
                          <div className="flex items-center gap-6 text-sm mb-3">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {campaign.target.type === 'groups' && `Grupos: ${campaign.target.groups?.join(', ')}`}
                                {campaign.target.type === 'tags' && `Tags: ${campaign.target.tags?.join(', ')}`}
                                {campaign.target.type === 'all' && 'Todos os contatos'}
                                {campaign.target.type === 'custom' && 'Filtro personalizado'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span>{campaign.target.estimatedReach?.toLocaleString()} contatos</span>
                            </div>
                            
                            {campaign.schedule.type === 'scheduled' && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {formatDate(`${campaign.schedule.startDate}T${campaign.schedule.startTime}`)}
                                </span>
                              </div>
                            )}
                            
                            {campaign.schedule.type === 'recurring' && (
                              <div className="flex items-center gap-2">
                                <RefreshCw className="h-4 w-4 text-muted-foreground" />
                                <span>
                                  {campaign.schedule.recurring?.frequency === 'daily' && 'Diário'}
                                  {campaign.schedule.recurring?.frequency === 'weekly' && 'Semanal'}
                                  {campaign.schedule.recurring?.frequency === 'monthly' && 'Mensal'}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Progress Bar */}
                          {(campaign.status === 'running' || campaign.status === 'paused') && (
                            <div className="mb-3">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary rounded-full h-2 transition-all duration-300"
                                  style={{ width: `${progress}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Metrics */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Enviadas</p>
                              <p className="text-sm font-semibold">{campaign.metrics.sent.toLocaleString()}</p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Entregues</p>
                              <p className="text-sm font-semibold text-green-600">
                                {campaign.metrics.delivered.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Lidas</p>
                              <p className="text-sm font-semibold text-blue-600">
                                {campaign.metrics.read.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Respostas</p>
                              <p className="text-sm font-semibold text-purple-600">
                                {campaign.metrics.replied.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Falhas</p>
                              <p className="text-sm font-semibold text-red-600">
                                {campaign.metrics.failed.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Conversão</p>
                              <p className="text-sm font-semibold text-orange-600">
                                {campaign.metrics.conversionRate.toFixed(1)}%
                              </p>
                            </div>
                            {campaign.metrics.cost && (
                              <div className="text-center p-2 bg-muted/50 rounded">
                                <p className="text-xs text-muted-foreground">Custo</p>
                                <p className="text-sm font-semibold">
                                  R$ {campaign.metrics.cost.toFixed(2)}
                                </p>
                              </div>
                            )}
                          </div>

                          {/* Tags */}
                          {campaign.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {campaign.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 ml-4">
                          {(campaign.status === 'draft' || campaign.status === 'scheduled' || 
                            campaign.status === 'paused') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePlayPause(campaign.id, campaign.status)}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          
                          {campaign.status === 'running' && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePlayPause(campaign.id, campaign.status)}
                              >
                                <Pause className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleStop(campaign.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <StopCircle className="h-4 w-4" />
                              </Button>
                            </>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/campaigns/${campaign.id}`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/campaigns/${campaign.id}/edit`)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicate(campaign.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(campaign.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>
    </AppLayout>
  )
}