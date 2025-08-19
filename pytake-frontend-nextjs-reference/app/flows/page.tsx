'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Play, 
  Pause, 
  Copy, 
  Trash2, 
  Edit3, 
  BarChart3,
  Zap,
  Users,
  MessageCircle,
  Clock,
  Settings,
  Grid3x3,
  List,
  TrendingUp,
  Activity,
  CheckCircle
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'

interface Flow {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive' | 'draft'
  trigger: string
  createdAt: string
  updatedAt: string
  stats: {
    executions: number
    successRate: number
    lastExecution?: string
  }
  tags: string[]
  isTemplate?: boolean
  isDraft?: boolean
  isLocal?: boolean
  templateData?: any
  draftData?: any
  flowData?: any
}

// Mock data
const mockFlows: Flow[] = [
  {
    id: '1',
    name: 'Boas-vindas Novo Cliente',
    description: 'Fluxo automático de boas-vindas para novos clientes que escrevem "oi" ou "olá"',
    status: 'active',
    trigger: 'Palavra-chave: oi, olá, boa tarde',
    createdAt: '2024-01-10T08:00:00Z',
    updatedAt: '2024-01-15T10:30:00Z',
    stats: {
      executions: 145,
      successRate: 98.5,
      lastExecution: '2024-01-15T14:22:00Z'
    },
    tags: ['atendimento', 'automático']
  },
  {
    id: '2',
    name: 'Suporte Técnico',
    description: 'Direciona clientes para suporte técnico e coleta informações do problema',
    status: 'active',
    trigger: 'Palavra-chave: problema, erro, bug, não funciona',
    createdAt: '2024-01-08T14:20:00Z',
    updatedAt: '2024-01-14T16:45:00Z',
    stats: {
      executions: 89,
      successRate: 92.1,
      lastExecution: '2024-01-15T11:15:00Z'
    },
    tags: ['suporte', 'técnico']
  },
  {
    id: '3',
    name: 'Agendamento Consulta',
    description: 'Permite agendar consultas através do WhatsApp com integração ao calendário',
    status: 'draft',
    trigger: 'Palavra-chave: agendar, consulta, horário',
    createdAt: '2024-01-12T09:10:00Z',
    updatedAt: '2024-01-15T08:30:00Z',
    stats: {
      executions: 0,
      successRate: 0
    },
    tags: ['agendamento', 'calendário']
  },
  {
    id: '4',
    name: 'Cobrança Automática',
    description: 'Envia lembretes de pagamento e links para quitação de faturas em atraso',
    status: 'inactive',
    trigger: 'Agendado: Segunda-feira 9:00',
    createdAt: '2024-01-05T11:30:00Z',
    updatedAt: '2024-01-10T15:20:00Z',
    stats: {
      executions: 234,
      successRate: 87.3,
      lastExecution: '2024-01-08T09:00:00Z'
    },
    tags: ['cobrança', 'financeiro', 'agendado']
  }
]

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-200'
    case 'inactive': return 'bg-red-100 text-red-800 border-red-200'
    case 'draft': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    default: return 'bg-gray-100 text-gray-800 border-gray-200'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'active': return 'Ativo'
    case 'inactive': return 'Inativo'
    case 'draft': return 'Rascunho'
    default: return status
  }
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only load flows on client side
    if (typeof window !== 'undefined') {
      console.log('Loading flows on client side...')
      // Load view mode preference from localStorage
      const savedViewMode = localStorage.getItem('flowsViewMode')
      if (savedViewMode === 'list' || savedViewMode === 'cards') {
        setViewMode(savedViewMode)
      }
      loadFlows()
      loadLocalData()
    }
  }, [])
  
  // Carregar templates e rascunhos do localStorage
  const loadLocalData = () => {
    try {
      // Carregar flows salvos localmente
      const savedFlows = JSON.parse(localStorage.getItem('saved_flows') || '[]')
      const localFlows = savedFlows.map((flow: any) => ({
        id: flow.id,
        name: flow.name || 'Flow sem nome',
        description: flow.description || 'Flow criado no editor',
        status: flow.status || 'draft',
        trigger: flow.trigger?.type || 'Configurar gatilho',
        createdAt: flow.createdAt,
        updatedAt: flow.updatedAt,
        stats: {
          executions: 0,
          successRate: 0
        },
        tags: ['local', 'salvo'],
        isLocal: true,
        flowData: flow
      }))
      
      // Carregar templates salvos
      const templates = JSON.parse(localStorage.getItem('flow_templates') || '[]')
      const templateFlows = templates.map((template: any, index: number) => ({
        id: `template-${index}`,
        name: template.name,
        description: template.description,
        status: 'draft' as const,
        trigger: `Template - ${template.category}`,
        createdAt: template.metadata.createdAt,
        updatedAt: template.metadata.updatedAt,
        stats: {
          executions: 0,
          successRate: 0
        },
        tags: ['template', ...template.tags],
        isTemplate: true,
        templateData: template
      }))
      
      // Carregar rascunho atual se existir
      const draftData = localStorage.getItem('pytake_flow_draft')
      const draftFlows = []
      if (draftData) {
        const draft = JSON.parse(draftData)
        if (draft.flow && draft.nodes && draft.nodes.length > 0) {
          draftFlows.push({
            id: 'draft-current',
            name: draft.flow?.name || 'Rascunho sem título',
            description: 'Rascunho salvo automaticamente',
            status: 'draft' as const,
            trigger: 'Rascunho em edição',
            createdAt: draft.timestamp,
            updatedAt: draft.timestamp,
            stats: {
              executions: 0,
              successRate: 0
            },
            tags: ['rascunho', 'auto-save'],
            isDraft: true,
            draftData: draft
          })
        }
      }
      
      // Combinar com flows existentes
      setFlows(prev => {
        // Remover templates, rascunhos e flows locais anteriores
        const filtered = prev.filter(f => 
          !f.id.startsWith('template-') && 
          !f.id.startsWith('draft-') &&
          !localFlows.some((lf: any) => lf.id === f.id)
        )
        return [...filtered, ...localFlows, ...templateFlows, ...draftFlows]
      })
    } catch (error) {
      console.error('Error loading local data:', error)
    }
  }

  // useEffect(() => {
  //   if (!isLoading && !isAuthenticated) {
  //     router.push('/login')
  //   }
  // }, [isLoading, isAuthenticated, router])

  // useEffect(() => {
  //   if (isAuthenticated) {
  //     loadFlows()
  //   }
  // }, [isAuthenticated])

  const loadFlows = async () => {
    try {
      setLoading(true)
      
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        console.log('Skipping fetch on server side')
        return
      }
      
      // Use Next.js API route proxy to avoid CORS issues
      console.log('🔄 Loading flows via Next.js proxy...')
      
      const response = await fetch('/api/v1/flows', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      let apiFlows: Flow[] = []
      
      if (response.ok) {
        const data = await response.json()
        apiFlows = data.flows || []
        console.log('✅ Flows loaded via proxy:', apiFlows.length)
      } else {
        console.error('❌ Proxy response error:', response.status, response.statusText)
        // Don't throw error, just continue with empty API flows
        console.log('Continuing without API flows')
      }
      
      // Set API flows first, loadLocalData will merge with these
      setFlows(apiFlows)
      
    } catch (error) {
      console.error('Error loading flows:', error)
      // Don't set empty array, let loadLocalData handle local flows
      setFlows([])
    } finally {
      setLoading(false)
    }
  }

  // Simplified loading check for demo
  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Carregando flows...</span>
        </div>
      </AppLayout>
    )
  }

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.trigger.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || flow.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const handleStatusToggle = async (flowId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return

    const newStatus = flow.status === 'active' ? 'inactive' : 'active'
    
    try {
      const response = await fetch(`/api/v1/flows/${flowId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      
      if (response.ok) {
        const updatedFlow = await response.json()
        setFlows(prev => prev.map(f => 
          f.id === flowId ? updatedFlow : f
        ))
      }
    } catch (error) {
      console.error('Error updating flow status:', error)
    }
  }

  const handleEdit = (flowId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return
    
    // Se for um template, carregar no editor
    if (flow.isTemplate && flow.templateData) {
      // Salvar template no sessionStorage para carregar no editor
      sessionStorage.setItem('load_template', JSON.stringify(flow.templateData))
      router.push('/flows/create')
    } 
    // Se for um rascunho, continuar editando
    else if (flow.isDraft) {
      // O rascunho já está no localStorage, apenas redirecionar
      router.push('/flows/create')
    }
    // Se for um flow local salvo
    else if (flow.isLocal && flow.flowData) {
      // Salvar flow no sessionStorage para carregar no editor
      sessionStorage.setItem('load_flow', JSON.stringify(flow.flowData))
      router.push('/flows/create')
    }
    // Flow normal do backend
    else {
      router.push(`/flows/${flowId}/edit`)
    }
  }

  const handleDuplicate = async (flowId: string) => {
    const originalFlow = flows.find(f => f.id === flowId)
    if (!originalFlow) return

    try {
      const response = await fetch('/api/v1/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...originalFlow,
          name: `${originalFlow.name} (Cópia)`,
          status: 'draft'
        })
      })
      
      if (response.ok) {
        const newFlow = await response.json()
        setFlows(prev => [newFlow, ...prev])
      }
    } catch (error) {
      console.error('Error duplicating flow:', error)
    }
  }

  const handleDelete = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este flow?')) return
    
    try {
      const response = await fetch(`/api/v1/flows/${flowId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setFlows(prev => prev.filter(flow => flow.id !== flowId))
      }
    } catch (error) {
      console.error('Error deleting flow:', error)
    }
  }

  const totalStats = {
    total: flows.length,
    active: flows.filter(f => f.status === 'active').length,
    executions: flows.reduce((sum, f) => sum + f.stats.executions, 0),
    avgSuccessRate: flows.length > 0 
      ? flows.reduce((sum, f) => sum + f.stats.successRate, 0) / flows.length 
      : 0
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Flows de Automação</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie seus fluxos automatizados do WhatsApp
              </p>
            </div>
            <Button onClick={() => router.push('/flows/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Flow
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Flows</CardTitle>
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Zap className="h-4 w-4 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.total}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-green-600 font-medium">{totalStats.active}</span>
                  <span className="text-muted-foreground">ativos</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-orange-600 font-medium">{totalStats.total - totalStats.active}</span>
                  <span className="text-muted-foreground">inativos</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Execuções</CardTitle>
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <BarChart3 className="h-4 w-4 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.executions.toLocaleString('pt-BR')}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span>+12% este mês</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold">{totalStats.avgSuccessRate.toFixed(1)}%</div>
                  {totalStats.avgSuccessRate >= 90 && (
                    <Badge variant="success" className="text-xs">Excelente</Badge>
                  )}
                </div>
                <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all"
                    style={{ width: `${totalStats.avgSuccessRate}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Activity className="h-4 w-4 text-orange-600 animate-pulse" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <div className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-muted-foreground">Em andamento agora</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Input
                placeholder="Buscar flows por nome, descrição ou gatilho..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todos
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
              >
                Ativos
              </Button>
              <Button
                variant={filterStatus === 'draft' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('draft')}
              >
                Rascunhos
              </Button>
              
              <div className="border-l mx-2" />
              
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('cards')
                  localStorage.setItem('flowsViewMode', 'cards')
                }}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setViewMode('list')
                  localStorage.setItem('flowsViewMode', 'list')
                }}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Flows Grid or List */}
          {filteredFlows.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum flow encontrado</h3>
                <p className="mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca' 
                    : 'Crie seu primeiro flow de automação'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push('/flows/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Flow
                  </Button>
                )}
              </div>
            </Card>
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFlows.map((flow) => (
                <Card key={flow.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          {flow.name}
                          {flow.isTemplate && (
                            <Badge variant="secondary" className="ml-2 text-xs">
                              📋 Template
                            </Badge>
                          )}
                          {flow.isDraft && (
                            <Badge variant="outline" className="ml-2 text-xs bg-orange-50 text-orange-700 border-orange-300">
                              ✏️ Rascunho
                            </Badge>
                          )}
                          {flow.isLocal && (
                            <Badge variant="default" className="ml-2 text-xs bg-green-50 text-green-700 border-green-300">
                              💾 Salvo
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={getStatusColor(flow.status)}
                      >
                        {getStatusLabel(flow.status)}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {flow.description}
                    </p>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <Settings className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Gatilho:</span>
                        <span className="font-medium">{flow.trigger}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Atualizado:</span>
                        <span>{formatDate(flow.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{flow.stats.executions}</p>
                        <p className="text-xs text-muted-foreground">Execuções</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{flow.stats.successRate}%</p>
                        <p className="text-xs text-muted-foreground">Sucesso</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {flow.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(flow.id)}
                        className="flex-1"
                      >
                        <Edit3 className="h-4 w-4 mr-1" />
                        Editar
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusToggle(flow.id)}
                      >
                        {flow.status === 'active' ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDuplicate(flow.id)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(flow.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // List View
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr className="text-left">
                      <th className="p-4 font-medium">Nome</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Gatilho</th>
                      <th className="p-4 font-medium text-center">Execuções</th>
                      <th className="p-4 font-medium text-center">Taxa de Sucesso</th>
                      <th className="p-4 font-medium">Atualizado</th>
                      <th className="p-4 font-medium text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredFlows.map((flow) => (
                      <tr key={flow.id} className="hover:bg-muted/50 transition-colors">
                        <td className="p-4">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {flow.name}
                              {flow.isTemplate && (
                                <Badge variant="secondary" className="text-xs">
                                  📋 Template
                                </Badge>
                              )}
                              {flow.isDraft && (
                                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700 border-orange-300">
                                  ✏️ Rascunho
                                </Badge>
                              )}
                              {flow.isLocal && (
                                <Badge variant="default" className="text-xs bg-green-50 text-green-700 border-green-300">
                                  💾 Salvo
                                </Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {flow.description}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={getStatusColor(flow.status)}
                          >
                            {getStatusLabel(flow.status)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{flow.trigger}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-medium">{flow.stats.executions}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-medium text-green-600">
                            {flow.stats.successRate}%
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">{formatDate(flow.updatedAt)}</div>
                        </td>
                        <td className="p-4">
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(flow.id)}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleStatusToggle(flow.id)}
                            >
                              {flow.status === 'active' ? (
                                <Pause className="h-4 w-4" />
                              ) : (
                                <Play className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(flow.id)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(flow.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </main>
      </div>
    </AppLayout>
  )
}