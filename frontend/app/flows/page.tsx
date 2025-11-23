'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { notify } from '@/lib/utils'
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
  CheckCircle,
  Phone,
  Bug
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { getApiUrl, getAuthHeaders } from '@/lib/api-client'
import { WhatsAppNumberSelector } from '@/components/whatsapp/whatsapp-number-selector'
import { Flow } from '@/lib/types/flow'
import { EmptyState } from '@/components/ui/empty-state'
import { CardSkeleton } from '@/components/ui/skeleton'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// (removido import duplicado de Flow)

// Mock data
const mockFlows: any[] = [
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
    status: 'active',
    trigger: 'Palavra-chave: agendar, consulta, horário',
    createdAt: '2024-01-12T09:10:00Z',
    updatedAt: '2024-01-15T08:30:00Z',
    stats: {
      executions: 156,
      successRate: 94.2
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

const formatDate = (dateString: string | undefined) => {
  if (!dateString) {
    return 'Data não disponível'
  }
  
  const date = new Date(dateString)
  
  // Verificar se a data é válida
  if (isNaN(date.getTime())) {
    console.warn('Invalid date string:', dateString)
    return 'Data inválida'
  }
  
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const getTriggerFromFlow = (flow: any): string => {
  // Extrair trigger dos nodes
  const nodes = flow.nodes || flow.flow?.nodes || []
  const triggerNode = nodes.find((n: any) => 
    n.type?.startsWith('trigger_') || n.data?.nodeType?.startsWith('trigger_')
  )
  
  if (!triggerNode) {
    return 'Sem gatilho'
  }
  
  const nodeType = triggerNode.data?.nodeType || triggerNode.type
  const config = triggerNode.data?.config || {}
  
  switch(nodeType) {
    case 'trigger_keyword':
      const keywords = config.keywords ? 
        config.keywords.split('\n').filter((k: string) => k.trim()).join(', ') : 
        'não definida'
      return keywords !== 'não definida' ? keywords : 'Palavra-chave não configurada'
      
    case 'trigger_webhook':
      return 'Webhook'
      
    case 'trigger_schedule':
      return config.schedule || 'Agendamento'
      
    case 'trigger_template_button':
      return 'Botão de Template'
      
    default:
      return nodeType?.replace('trigger_', '').replace(/_/g, ' ') || 'Gatilho'
  }
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterWhatsApp, setFilterWhatsApp] = useState<boolean>(false)
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards')
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false)
  const [selectedFlow, setSelectedFlow] = useState<Flow | null>(null)
  const [selectedWhatsAppNumbers, setSelectedWhatsAppNumbers] = useState<string[]>([])
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    // Only load flows on client side
    if (typeof window !== 'undefined') {
      console.log('Loading flows on client side...')
      // Load flows from backend only
      loadFlows()
    }
  }, [])
  

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

  const handleCreateNewFlow = async () => {
    try {
      setLoading(true)
      
      // Criar novo flow no backend imediatamente
      const newFlowData = {
        name: 'Novo Flow',
        description: 'Flow criado automaticamente',
        status: 'draft',
        flow: {
          nodes: [],
          edges: []
        },
        trigger: {
          type: 'keyword',
          config: {}
        }
      }
      
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/flows`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newFlowData)
      })
      
      if (response.ok) {
        const createdFlow = await response.json()
        console.log('✅ Novo flow criado - resposta completa:', createdFlow)
        
        // O backend retorna o ID no campo 'id'
        const flowId = createdFlow.id
        
        if (!flowId) {
          console.error('❌ Backend não retornou ID do flow:', createdFlow)
          notify.error('Erro', 'Flow criado mas sem ID. Verifique o backend.')
          return
        }
        
        // Garantir que o flow tem todos os campos necessários
        const flowWithId = {
          ...newFlowData,
          ...createdFlow,
          id: flowId,
          apiId: createdFlow.apiId || 'v1'
        }
        
        // Salvar flow completo no sessionStorage para a página de edição carregar
        sessionStorage.setItem('load_flow', JSON.stringify(flowWithId))
        
        console.log('🚀 Redirecionando para:', `/flows/${flowId}/edit`)
        console.log('📦 Flow salvo no sessionStorage:', flowWithId)
        
        // Redirecionar imediatamente para a página de edição
        router.push(`/flows/${flowId}/edit`)
      } else {
        console.error('❌ Erro ao criar flow:', response.status)
        notify.error('Erro', 'Erro ao criar novo flow. Tente novamente.')
      }
    } catch (error) {
      console.error('Erro ao criar flow:', error)
      notify.error('Erro', 'Erro ao criar novo flow. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }
  
  const loadFlows = async () => {
    try {
      setLoading(true)
      
      // Check if we're on the client side
      if (typeof window === 'undefined') {
        console.log('Skipping fetch on server side')
        return
      }
      
      // Use Next.js API route proxy to avoid CORS issues
      console.log('🔄 Loading flows via API...')
      
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/flows`, {
        method: 'GET',
        headers
      })
      
      let apiFlows: Flow[] = []
      
      if (response.ok) {
        const data = await response.json()
        // Handle both array and object responses
        apiFlows = Array.isArray(data) ? data : (data.flows || [])
        console.log('✅ Flows loaded via proxy:', apiFlows.length)
      } else {
        console.error('❌ Proxy response error:', response.status, response.statusText)
        // Don't throw error, just continue with empty API flows
        console.log('Continuing without API flows')
      }
      
      // Set API flows only - no more localStorage integration
      console.log('🔧 Setting flows in state:', apiFlows)
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

  console.log('🔍 Current flows state:', flows.length, 'flows')
  console.log('🔍 Filter status:', filterStatus, 'Search term:', searchTerm)
  
  const filteredFlows = flows.filter(flow => {
    // Handle trigger safely - it might be string or object
    const triggerText = typeof flow.trigger === 'string' 
      ? flow.trigger 
      : (flow.triggerType || '')
    
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         triggerText.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || flow.status === filterStatus
    
    const matchesWhatsApp = !filterWhatsApp || (flow.whatsapp_numbers && flow.whatsapp_numbers.length > 0)

    return matchesSearch && matchesStatus && matchesWhatsApp
  })
  
  console.log('🔍 Filtered flows:', filteredFlows.length, 'flows')

  const handleStatusToggle = async (flowId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return

    const newStatus = flow.status === 'active' ? 'inactive' : 'active'
    
    try {
      // Flow do backend - alterar via API
      console.log('🔄 Alterando status do flow do backend:', flowId, 'para', newStatus)
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
        console.log('✅ Status do flow do backend alterado')
      }
    } catch (error) {
      console.error('Error updating flow status:', error)
    }
  }

  const handleEdit = (flowId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return
    
    // Sempre usar a rota com ID para todos os flows
    router.push(`/flows/${flowId}/edit`)
  }

  const handleTest = (flowId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return
    
    console.log('🧪 Testando flow:', flowId)
    router.push(`/flows/${flowId}/test`)
  }

  const handleDuplicate = async (flowId: string) => {
    const originalFlow = flows.find(f => f.id === flowId)
    if (!originalFlow) return

    try {
      // Flow do backend - duplicar via API
      console.log('📋 Duplicando flow do backend:', flowId)
      const apiUrl = getApiUrl()
      const headers = getAuthHeaders()
      const response = await fetch(`${apiUrl}/flows`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...originalFlow,
          name: `${originalFlow.name} (Cópia)`,
          status: 'draft'
        })
      })
      
      if (response.ok) {
        const newFlow = await response.json()
        setFlows(prev => [newFlow, ...prev])
        console.log('✅ Flow do backend duplicado')
      }
    } catch (error) {
      console.error('Error duplicating flow:', error)
    }
  }

  const handleDelete = async (flowId: string) => {
    if (!confirm('Tem certeza que deseja excluir este flow?')) return
    
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return
    
    try {
      // Flow do backend - deletar via API
      console.log('🗑️ Deletando flow do backend:', flowId)
      const response = await fetch(`/api/v1/flows/${flowId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setFlows(prev => prev.filter(flow => flow.id !== flowId))
        console.log('✅ Flow do backend deletado')
      } else {
        console.error('❌ Erro ao deletar flow do backend:', response.status)
      }
    } catch (error) {
      console.error('Error deleting flow:', error)
    }
  }

  const handleLinkWhatsApp = async (flowId: string) => {
    const flow = flows.find(f => f.id === flowId)
    if (!flow) return

    setSelectedFlow(flow)
    
    // TODO: Carregar números WhatsApp vinculados do backend
    setSelectedWhatsAppNumbers([])
    
    setIsLinkDialogOpen(true)
  }

  const handleSaveLinkWhatsApp = async () => {
    if (!selectedFlow) return

    try {
      // Para flows do backend, implementar API call aqui
      console.log('🔄 Vinculação de números para flows do backend será implementada')
      
      // Fechar modal
      setIsLinkDialogOpen(false)
      setSelectedFlow(null)
      setSelectedWhatsAppNumbers([])
      
    } catch (error) {
      console.error('Erro ao vincular números WhatsApp:', error)
    }
  }

  const totalStats = {
    total: flows.length,
    active: flows.filter(f => f.status === 'active').length,
    executions: flows.reduce((sum, f) => sum + (f.stats?.executions || 0), 0),
    avgSuccessRate: flows.length > 0 
      ? flows.reduce((sum, f) => sum + (f.stats?.successRate || 0), 0) / flows.length 
      : 0
  }

  return (
    <ErrorBoundary>
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
              <Button onClick={handleCreateNewFlow} disabled={loading}>
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
                    <Badge className="text-xs bg-green-100 text-green-800">Excelente</Badge>
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
                variant={filterWhatsApp ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterWhatsApp(!filterWhatsApp)}
                className={filterWhatsApp ? 'bg-green-500 hover:bg-green-600 text-white' : ''}
              >
                <Phone className="h-4 w-4 mr-1" />
                WhatsApp
              </Button>
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
                onClick={() => setViewMode('cards')}
              >
                <Grid3x3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Flows Grid or List */}
          {loading ? (
            <div
              className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
              role="status"
              aria-label="Carregando flows"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          ) : filteredFlows.length === 0 ? (
            <EmptyState
              icon={<Zap className="h-16 w-16 opacity-50" />}
              title={searchTerm ? "Nenhum flow encontrado" : "Nenhum flow criado ainda"}
              description={
                searchTerm 
                  ? "Tente ajustar os filtros de busca ou criar um novo flow" 
                  : "Crie seu primeiro flow de automação para começar a automatizar suas conversas no WhatsApp"
              }
              action={!searchTerm ? {
                label: "Criar Primeiro Flow",
                onClick: handleCreateNewFlow,
                variant: "default"
              } : undefined}
            />
          ) : viewMode === 'cards' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFlows.map((flow) => (
                <Card key={flow.id} className="hover:shadow-lg transition-shadow relative">
                  {/* Indicador de WhatsApp vinculado */}
                  {flow.whatsapp_numbers && flow.whatsapp_numbers.length > 0 && (
                    <div 
                      className="absolute top-2 right-2 z-10"
                      title={`WhatsApp: ${flow.whatsapp_numbers.join(', ')}`}
                    >
                      <Badge 
                        className="bg-green-500 text-white hover:bg-green-600 cursor-help"
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        {flow.whatsapp_numbers.length}
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">
                          {flow.name}
                          {flow.isLegacy && (
                            <Badge variant="outline" className="ml-2 text-xs bg-gray-50 text-gray-700 border-gray-300">
                              📋 Legacy
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
                          {flow.status === 'published' && (
                            <Badge variant="default" className="ml-2 text-xs bg-blue-50 text-blue-700 border-blue-300">
                              🚀 Publicado
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
                        <span className="font-medium">{getTriggerFromFlow(flow)}</span>
                      </div>
                      
                      {flow.whatsapp_numbers && flow.whatsapp_numbers.length > 0 && (
                        <div className="flex items-start gap-2 text-sm">
                          <Phone className="h-4 w-4 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <span className="text-muted-foreground">WhatsApp:</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {flow.whatsapp_numbers.map((number: string) => (
                                <Badge 
                                  key={number}
                                  variant="secondary" 
                                  className="text-xs bg-green-50 text-green-700"
                                >
                                  {number}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Atualizado:</span>
                        <span>{formatDate(flow.updatedAt)}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">{flow.stats?.executions ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Execuções</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">{flow.stats?.successRate ?? 0}%</p>
                        <p className="text-xs text-muted-foreground">Sucesso</p>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {(flow.tags || []).map((tag: string) => (
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
                        onClick={() => handleTest(flow.id)}
                        className="flex-1"
                        title="Testar flow com debug"
                      >
                        <Bug className="h-4 w-4 mr-1" />
                        Testar
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

                      {/* Botão de vincular números WhatsApp para flows ativos */}
                      {flow.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLinkWhatsApp(flow.id)}
                          title="Vincular números WhatsApp"
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                      )}

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
                              {flow.whatsapp_numbers && flow.whatsapp_numbers.length > 0 && (
                                <div 
                                  className="inline-flex items-center"
                                  title={`WhatsApp: ${flow.whatsapp_numbers.join(', ')}`}
                                >
                                  <Badge 
                                    className="bg-green-500 text-white text-xs cursor-help"
                                  >
                                    <Phone className="h-3 w-3 mr-1" />
                                    {flow.whatsapp_numbers.length}
                                  </Badge>
                                </div>
                              )}
                              {flow.isLegacy && (
                                <Badge variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                                  📋 Legacy
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
                              {flow.status === 'published' && (
                                <Badge variant="default" className="text-xs bg-blue-50 text-blue-700 border-blue-300">
                                  🚀 Publicado
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
                          <div className="text-sm">{getTriggerFromFlow(flow)}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-medium">{flow.stats?.executions ?? 0}</div>
                        </td>
                        <td className="p-4 text-center">
                          <div className="font-medium text-green-600">
                            {flow.stats?.successRate ?? 0}%
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

        {/* Modal de Vinculação WhatsApp */}
        <Dialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Vincular Números WhatsApp
              </DialogTitle>
              <DialogDescription>
                Selecione os números WhatsApp que irão ativar o flow "{selectedFlow?.name}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <WhatsAppNumberSelector
                selectedNumbers={selectedWhatsAppNumbers}
                onNumbersChange={setSelectedWhatsAppNumbers}
                title="Números Disponíveis"
                description="Escolha quais números WhatsApp irão executar este flow quando ativados"
                allowMultiple={true}
              />
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLinkDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveLinkWhatsApp}>
                <Phone className="h-4 w-4 mr-2" />
                Vincular {selectedWhatsAppNumbers.length} número{selectedWhatsAppNumbers.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
    </ErrorBoundary>
  )
}