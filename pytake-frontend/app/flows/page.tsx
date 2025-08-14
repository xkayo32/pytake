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
  Settings
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
  const [flows, setFlows] = useState<Flow[]>(mockFlows)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
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

  const filteredFlows = flows.filter(flow => {
    const matchesSearch = flow.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         flow.trigger.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = filterStatus === 'all' || flow.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const handleStatusToggle = (flowId: string) => {
    setFlows(prev => prev.map(flow => 
      flow.id === flowId 
        ? { 
            ...flow, 
            status: flow.status === 'active' ? 'inactive' : 'active',
            updatedAt: new Date().toISOString()
          }
        : flow
    ))
  }

  const handleEdit = (flowId: string) => {
    router.push(`/flows/${flowId}/edit`)
  }

  const handleDuplicate = (flowId: string) => {
    const originalFlow = flows.find(f => f.id === flowId)
    if (originalFlow) {
      const newFlow: Flow = {
        ...originalFlow,
        id: Date.now().toString(),
        name: `${originalFlow.name} (Cópia)`,
        status: 'draft',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        stats: {
          executions: 0,
          successRate: 0
        }
      }
      setFlows(prev => [newFlow, ...prev])
    }
  }

  const handleDelete = (flowId: string) => {
    setFlows(prev => prev.filter(flow => flow.id !== flowId))
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Flows</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.total}</div>
                <p className="text-xs text-muted-foreground">
                  {totalStats.active} ativos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Execuções</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.executions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  Total de execuções
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalStats.avgSuccessRate.toFixed(1)}%</div>
                <p className="text-xs text-muted-foreground">
                  Média de sucesso
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">
                  Em andamento agora
                </p>
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
            </div>
          </div>

          {/* Flows Grid */}
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
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredFlows.map((flow) => (
                <Card key={flow.id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">{flow.name}</CardTitle>
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
          )}
        </main>
      </div>
    </AppLayout>
  )
}