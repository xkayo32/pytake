'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  Zap,
  Webhook,
  Database,
  Mail,
  Calendar,
  MessageSquare,
  Play,
  Pause,
  Settings,
  Trash2,
  Edit3,
  Copy,
  BarChart3,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  TrendingUp,
  Link2,
  Globe,
  Server,
  Key,
  RefreshCw,
  ArrowRight,
  Filter,
  Code,
  FileSpreadsheet
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { MOCK_AUTOMATIONS, Automation, AutomationType, AutomationStatus } from '@/lib/types/automation'
import { Switch } from '@/components/ui/switch'

const typeConfig: Record<AutomationType, { label: string; icon: any; color: string }> = {
  webhook: { label: 'Webhook', icon: Webhook, color: 'text-blue-600' },
  api: { label: 'API Custom', icon: Code, color: 'text-purple-600' },
  erp: { label: 'ERP', icon: Database, color: 'text-green-600' },
  crm: { label: 'CRM', icon: Server, color: 'text-indigo-600' },
  email: { label: 'Email', icon: Mail, color: 'text-red-600' },
  sms: { label: 'SMS', icon: MessageSquare, color: 'text-orange-600' },
  calendar: { label: 'Calendário', icon: Calendar, color: 'text-pink-600' },
  sheet: { label: 'Planilha', icon: FileSpreadsheet, color: 'text-teal-600' }
}

const statusConfig: Record<AutomationStatus, { label: string; color: string; icon: any }> = {
  active: { label: 'Ativa', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  inactive: { label: 'Inativa', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: XCircle },
  error: { label: 'Erro', color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle },
  testing: { label: 'Testando', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock }
}

export default function AutomationsPage() {
  const [automations, setAutomations] = useState<Automation[]>(MOCK_AUTOMATIONS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
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

  const filteredAutomations = automations.filter(automation => {
    const matchesSearch = automation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         automation.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         automation.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === 'all' || automation.type === filterType
    const matchesStatus = filterStatus === 'all' || automation.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  const handleToggleStatus = (automationId: string) => {
    setAutomations(prev => prev.map(automation => {
      if (automation.id === automationId) {
        const newStatus = automation.status === 'active' ? 'inactive' : 'active'
        return { 
          ...automation, 
          status: newStatus,
          settings: { ...automation.settings, enabled: newStatus === 'active' }
        }
      }
      return automation
    }))
  }

  const handleDelete = (automationId: string) => {
    if (confirm('Tem certeza que deseja excluir esta automação?')) {
      setAutomations(prev => prev.filter(a => a.id !== automationId))
    }
  }

  const handleDuplicate = (automationId: string) => {
    const original = automations.find(a => a.id === automationId)
    if (original) {
      const duplicate: Automation = {
        ...original,
        id: Date.now().toString(),
        name: `${original.name} (Cópia)`,
        status: 'inactive',
        settings: { ...original.settings, enabled: false },
        stats: {
          totalExecutions: 0,
          successCount: 0,
          errorCount: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setAutomations(prev => [duplicate, ...prev])
    }
  }

  const handleTest = (automationId: string) => {
    // TODO: Implement test automation
    console.log('Testing automation:', automationId)
  }

  const stats = {
    total: automations.length,
    active: automations.filter(a => a.status === 'active').length,
    inactive: automations.filter(a => a.status === 'inactive').length,
    errors: automations.filter(a => a.status === 'error').length,
    totalExecutions: automations.reduce((sum, a) => sum + a.stats.totalExecutions, 0),
    successRate: automations.length > 0 
      ? Math.round(automations.reduce((sum, a) => 
          sum + (a.stats.totalExecutions > 0 ? (a.stats.successCount / a.stats.totalExecutions) * 100 : 0), 0) 
          / automations.length)
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

  const getTriggerLabel = (type: string) => {
    const labels: Record<string, string> = {
      message_received: 'Mensagem Recebida',
      message_sent: 'Mensagem Enviada',
      contact_created: 'Contato Criado',
      contact_updated: 'Contato Atualizado',
      campaign_completed: 'Campanha Concluída',
      flow_completed: 'Flow Concluído',
      tag_added: 'Tag Adicionada',
      tag_removed: 'Tag Removida',
      schedule: 'Agendamento',
      manual: 'Manual'
    }
    return labels[type] || type
  }

  const getActionLabel = (type: string) => {
    const labels: Record<string, string> = {
      send_message: 'Enviar Mensagem',
      update_contact: 'Atualizar Contato',
      add_tag: 'Adicionar Tag',
      remove_tag: 'Remover Tag',
      create_task: 'Criar Tarefa',
      send_webhook: 'Enviar Webhook',
      send_email: 'Enviar Email',
      update_crm: 'Atualizar CRM',
      create_invoice: 'Criar Fatura',
      custom_api: 'API Customizada'
    }
    return labels[type] || type
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Automações</h1>
              <p className="text-sm text-muted-foreground">
                Configure integrações e automações para seu WhatsApp
              </p>
            </div>
            <Button onClick={() => router.push('/automations/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Nova Automação
            </Button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Automações</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ativas</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.active}</div>
                <p className="text-xs text-muted-foreground">Em execução</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inativas</CardTitle>
                <XCircle className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{stats.inactive}</div>
                <p className="text-xs text-muted-foreground">Pausadas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Com Erro</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.errors}</div>
                <p className="text-xs text-muted-foreground">Precisam atenção</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Execuções</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalExecutions.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Total geral</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa Sucesso</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.successRate}%</div>
                <p className="text-xs text-muted-foreground">Média geral</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar automações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
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
                variant={filterType === 'webhook' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('webhook')}
              >
                <Webhook className="h-4 w-4 mr-1" />
                Webhook
              </Button>
              <Button
                variant={filterType === 'erp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('erp')}
              >
                <Database className="h-4 w-4 mr-1" />
                ERP
              </Button>
              <Button
                variant={filterType === 'api' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType('api')}
              >
                <Code className="h-4 w-4 mr-1" />
                API
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                variant={filterStatus === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('all')}
              >
                Todos Status
              </Button>
              <Button
                variant={filterStatus === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('active')}
              >
                Ativas
              </Button>
              <Button
                variant={filterStatus === 'error' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus('error')}
              >
                Com Erro
              </Button>
            </div>
          </div>

          {/* Automations List */}
          {filteredAutomations.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <Zap className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhuma automação encontrada</h3>
                <p className="mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca' 
                    : 'Crie sua primeira automação'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push('/automations/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeira Automação
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredAutomations.map((automation) => {
                const TypeIcon = typeConfig[automation.type].icon
                const StatusIcon = statusConfig[automation.status].icon
                const successRate = automation.stats.totalExecutions > 0 
                  ? Math.round((automation.stats.successCount / automation.stats.totalExecutions) * 100)
                  : 0
                
                return (
                  <Card key={automation.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg bg-primary/10`}>
                              <TypeIcon className={`h-5 w-5 ${typeConfig[automation.type].color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold">{automation.name}</h3>
                                <Badge 
                                  variant="outline" 
                                  className={statusConfig[automation.status].color}
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig[automation.status].label}
                                </Badge>
                                <Badge variant="secondary">
                                  {typeConfig[automation.type].label}
                                </Badge>
                              </div>
                              {automation.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {automation.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Trigger and Actions */}
                          <div className="flex items-center gap-6 mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <Play className="h-3 w-3 mr-1" />
                                Gatilho
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {automation.triggers.map(t => getTriggerLabel(t.type)).join(', ')}
                              </span>
                            </div>
                            
                            <ArrowRight className="h-4 w-4 text-muted-foreground" />
                            
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <Zap className="h-3 w-3 mr-1" />
                                Ações
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {automation.actions.length} ação(ões)
                              </span>
                            </div>
                          </div>

                          {/* Integration Info */}
                          {automation.integration && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              {automation.integration.webhook && (
                                <div className="flex items-center gap-2">
                                  <Link2 className="h-3 w-3" />
                                  <span className="truncate max-w-xs">
                                    {automation.integration.webhook.url}
                                  </span>
                                </div>
                              )}
                              {automation.integration.erp && (
                                <div className="flex items-center gap-2">
                                  <Server className="h-3 w-3" />
                                  <span>
                                    {automation.integration.erp.provider.toUpperCase()}
                                  </span>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Stats */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Execuções</p>
                              <p className="text-sm font-semibold">
                                {automation.stats.totalExecutions.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Sucesso</p>
                              <p className="text-sm font-semibold text-green-600">
                                {automation.stats.successCount.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Erros</p>
                              <p className="text-sm font-semibold text-red-600">
                                {automation.stats.errorCount.toLocaleString()}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Taxa Sucesso</p>
                              <p className="text-sm font-semibold text-blue-600">
                                {successRate}%
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Tempo Médio</p>
                              <p className="text-sm font-semibold">
                                {automation.stats.avgExecutionTime 
                                  ? `${(automation.stats.avgExecutionTime / 1000).toFixed(1)}s`
                                  : '-'}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Última Exec.</p>
                              <p className="text-sm font-semibold">
                                {automation.stats.lastExecution 
                                  ? new Date(automation.stats.lastExecution).toLocaleDateString('pt-BR')
                                  : '-'}
                              </p>
                            </div>
                          </div>

                          {/* Error Message */}
                          {automation.stats.lastError && (
                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                              <AlertCircle className="h-3 w-3 inline mr-1" />
                              Último erro: {automation.stats.lastError}
                            </div>
                          )}

                          {/* Tags */}
                          {automation.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-3">
                              {automation.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          <Switch
                            checked={automation.settings.enabled}
                            onCheckedChange={() => handleToggleStatus(automation.id)}
                            disabled={automation.status === 'error'}
                          />
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTest(automation.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/automations/${automation.id}`)}
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/automations/${automation.id}/edit`)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicate(automation.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(automation.id)}
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