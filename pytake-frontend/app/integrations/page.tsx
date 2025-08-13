'use client'

import { useState } from 'react'
import { 
  Settings,
  Zap,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  Link,
  Unlink,
  TestTube,
  Database,
  Webhook,
  Globe,
  Shield,
  BarChart3,
  Calendar,
  AlertTriangle,
  Info,
  XCircle,
  PlayCircle,
  StopCircle,
  Pause,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Copy,
  ExternalLink
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { AppLayout } from '@/components/layout/app-layout'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scrollarea'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Import ERP types and mock data
import {
  ERPType,
  ERPStatus,
  ERPConfig,
  ERPSyncLog,
  ERPIntegrationOverview,
  MOCK_ERP_CONFIGS,
  MOCK_ERP_SYNC_LOGS,
  MOCK_ERP_OVERVIEW
} from '@/lib/types/erp'

export default function IntegrationsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [erpTypeFilter, setERPTypeFilter] = useState<string>('all')

  const filteredConfigs = MOCK_ERP_CONFIGS.filter(config => {
    const matchesSearch = config.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         config.erpType.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || config.status === statusFilter
    const matchesType = erpTypeFilter === 'all' || config.erpType === erpTypeFilter
    
    return matchesSearch && matchesStatus && matchesType
  })

  const handleConnect = (erpType: ERPType) => {
    console.log('Connecting to ERP:', erpType)
  }

  const handleDisconnect = (configId: string) => {
    console.log('Disconnecting ERP:', configId)
  }

  const handleTest = (configId: string) => {
    console.log('Testing ERP connection:', configId)
  }

  const handleSync = (configId: string) => {
    console.log('Syncing ERP:', configId)
  }

  const handleConfigure = (configId: string) => {
    console.log('Configuring ERP:', configId)
  }

  const getERPName = (erpType: ERPType): string => {
    const names = {
      hubsoft: 'HubSoft',
      ixcsoft: 'IXC Soft',
      mksolutions: 'MK Solutions',
      sisgp: 'SisGP'
    }
    return names[erpType]
  }

  const getStatusColor = (status: ERPStatus): string => {
    switch (status) {
      case 'connected': return 'text-green-600 bg-green-50 border-green-200'
      case 'disconnected': return 'text-gray-600 bg-gray-50 border-gray-200'
      case 'error': return 'text-red-600 bg-red-50 border-red-200'
      case 'testing': return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'syncing': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  const getStatusIcon = (status: ERPStatus) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4" />
      case 'disconnected': return <XCircle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      case 'testing': return <TestTube className="h-4 w-4" />
      case 'syncing': return <RefreshCw className="h-4 w-4 animate-spin" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  const getStatusLabel = (status: ERPStatus): string => {
    switch (status) {
      case 'connected': return 'Conectado'
      case 'disconnected': return 'Desconectado'
      case 'error': return 'Erro'
      case 'testing': return 'Testando'
      case 'syncing': return 'Sincronizando'
      default: return 'Desconhecido'
    }
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

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    if (seconds < 60) return `${seconds}s`
    const minutes = Math.floor(seconds / 60)
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Integrações ERP</h1>
                <p className="text-sm text-muted-foreground">
                  Gerencie conexões com sistemas externos
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={`${
                MOCK_ERP_OVERVIEW.healthScore >= 90 ? 'text-green-600 border-green-200' :
                MOCK_ERP_OVERVIEW.healthScore >= 70 ? 'text-yellow-600 border-yellow-200' :
                'text-red-600 border-red-200'
              }`}>
                <Activity className="h-3 w-3 mr-1" />
                Saúde: {MOCK_ERP_OVERVIEW.healthScore}%
              </Badge>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Integração
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container p-6 space-y-6">
            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Integrações Ativas</p>
                      <p className="text-2xl font-bold">{MOCK_ERP_OVERVIEW.activeIntegrations}</p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    de {MOCK_ERP_OVERVIEW.totalIntegrations} configuradas
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Clientes</p>
                      <p className="text-2xl font-bold">{MOCK_ERP_OVERVIEW.totalCustomers.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-green-600 mt-2">
                    <TrendingUp className="h-3 w-3" />
                    +142 este mês
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Faturas em Atraso</p>
                      <p className="text-2xl font-bold text-red-600">{MOCK_ERP_OVERVIEW.overdueInvoices}</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    de {MOCK_ERP_OVERVIEW.totalInvoices.toLocaleString()} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Chamados Abertos</p>
                      <p className="text-2xl font-bold">{MOCK_ERP_OVERVIEW.openTickets}</p>
                    </div>
                    <AlertCircle className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="flex items-center gap-1 text-sm text-red-600 mt-2">
                    <TrendingDown className="h-3 w-3" />
                    -8 hoje
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="integrations" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="integrations">Integrações</TabsTrigger>
                <TabsTrigger value="logs">Logs & Atividade</TabsTrigger>
                <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
              </TabsList>

              {/* Integrations Tab */}
              <TabsContent value="integrations" className="space-y-6">
                {/* Filters */}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <div className="relative">
                          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar integrações..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </div>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          <SelectItem value="connected">Conectado</SelectItem>
                          <SelectItem value="disconnected">Desconectado</SelectItem>
                          <SelectItem value="error">Erro</SelectItem>
                          <SelectItem value="syncing">Sincronizando</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={erpTypeFilter} onValueChange={setERPTypeFilter}>
                        <SelectTrigger className="w-full md:w-48">
                          <SelectValue placeholder="Tipo de ERP" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os ERPs</SelectItem>
                          <SelectItem value="hubsoft">HubSoft</SelectItem>
                          <SelectItem value="ixcsoft">IXC Soft</SelectItem>
                          <SelectItem value="mksolutions">MK Solutions</SelectItem>
                          <SelectItem value="sisgp">SisGP</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* ERP Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredConfigs.map((config) => (
                    <Card key={config.id} className="relative">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                              <Database className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{config.name}</CardTitle>
                              <CardDescription>{getERPName(config.erpType)}</CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(config.status)}>
                              {getStatusIcon(config.status)}
                              <span className="ml-1">{getStatusLabel(config.status)}</span>
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleTest(config.id)}>
                                  <TestTube className="h-4 w-4 mr-2" />
                                  Testar Conexão
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleSync(config.id)}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Sincronizar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleConfigure(config.id)}>
                                  <Settings className="h-4 w-4 mr-2" />
                                  Configurar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                {config.status === 'connected' ? (
                                  <DropdownMenuItem 
                                    onClick={() => handleDisconnect(config.id)}
                                    className="text-red-600"
                                  >
                                    <Unlink className="h-4 w-4 mr-2" />
                                    Desconectar
                                  </DropdownMenuItem>
                                ) : (
                                  <DropdownMenuItem onClick={() => handleConnect(config.erpType)}>
                                    <Link className="h-4 w-4 mr-2" />
                                    Conectar
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      </CardHeader>
                      
                      <CardContent className="space-y-4">
                        {/* Connection Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">URL da API</p>
                            <p className="font-mono text-xs truncate">{config.apiUrl}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Última Sync</p>
                            <p className="text-xs">
                              {config.lastSync ? formatDate(config.lastSync) : 'Nunca'}
                            </p>
                          </div>
                        </div>

                        {/* Stats */}
                        {config.status === 'connected' && (
                          <div className="space-y-3">
                            <Separator />
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Clientes</span>
                                  <span className="font-medium">{config.stats.totalCustomers.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Faturas</span>
                                  <span className="font-medium">{config.stats.totalInvoices.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Chamados</span>
                                  <span className="font-medium">{config.stats.openTickets}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Uptime</span>
                                  <span className="font-medium">{config.stats.uptime}%</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Sync</span>
                                  <span className="font-medium">{formatDuration(config.stats.lastSyncDuration * 1000)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Erros</span>
                                  <span className={`font-medium ${config.stats.syncErrors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {config.stats.syncErrors}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Health Bar */}
                            <div>
                              <div className="flex justify-between text-sm mb-1">
                                <span className="text-muted-foreground">Saúde da Integração</span>
                                <span className="font-medium">{config.stats.uptime}%</span>
                              </div>
                              <Progress value={config.stats.uptime} className="h-2" />
                            </div>
                          </div>
                        )}

                        {/* Error Info */}
                        {config.status === 'error' && (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-800 text-sm">
                              <AlertCircle className="h-4 w-4" />
                              <span className="font-medium">Erro de Conexão</span>
                            </div>
                            <p className="text-red-700 text-xs mt-1">
                              Falha na autenticação. Verifique as credenciais da API.
                            </p>
                          </div>
                        )}

                        {/* Quick Actions */}
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleTest(config.id)}
                            disabled={config.status === 'testing' || config.status === 'syncing'}
                          >
                            <TestTube className="h-3 w-3 mr-1" />
                            Testar
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleSync(config.id)}
                            disabled={config.status !== 'connected'}
                          >
                            <RefreshCw className={`h-3 w-3 mr-1 ${config.status === 'syncing' ? 'animate-spin' : ''}`} />
                            Sync
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => handleConfigure(config.id)}
                          >
                            <Settings className="h-3 w-3 mr-1" />
                            Config
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Logs Tab */}
              <TabsContent value="logs" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Activity className="h-5 w-5" />
                      Logs de Atividade
                    </CardTitle>
                    <CardDescription>
                      Histórico de sincronizações e operações
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-96">
                      <div className="space-y-4">
                        {MOCK_ERP_SYNC_LOGS.map((log) => (
                          <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                            <div className={`w-2 h-2 rounded-full mt-2 ${
                              log.status === 'success' ? 'bg-green-500' :
                              log.status === 'error' ? 'bg-red-500' : 'bg-yellow-500'
                            }`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {getERPName(log.erpType)}
                                  </Badge>
                                  <Badge variant="secondary" className="text-xs">
                                    {log.operation === 'sync' ? 'Sincronização' :
                                     log.operation === 'test' ? 'Teste' : 'Webhook'}
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(log.createdAt)}
                                </span>
                              </div>
                              <p className="text-sm">{log.message}</p>
                              {log.recordsProcessed !== undefined && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                  <span>Processados: {log.recordsProcessed.toLocaleString()}</span>
                                  {log.recordsErrors !== undefined && log.recordsErrors > 0 && (
                                    <span className="text-red-600">Erros: {log.recordsErrors}</span>
                                  )}
                                  <span>Duração: {formatDuration(log.duration)}</span>
                                </div>
                              )}
                            </div>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Webhooks Tab */}
              <TabsContent value="webhooks" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Webhook className="h-5 w-5" />
                          Configuração de Webhooks
                        </CardTitle>
                        <CardDescription>
                          Gerencie webhooks para receber eventos dos ERPs
                        </CardDescription>
                      </div>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Webhook
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">HubSoft</Badge>
                                <Badge className="text-green-600 bg-green-50 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ativo
                                </Badge>
                              </div>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">URL</p>
                                <p className="font-mono text-xs truncate">
                                  https://api.pytake.net/api/v1/erp/hubsoft/webhook
                                </p>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total de Eventos</span>
                                <span>1,247</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Taxa de Sucesso</span>
                                <span className="text-green-600">98.5%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Último Evento</span>
                                <span>há 2h</span>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-1">Eventos:</p>
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">customer.*</Badge>
                                <Badge variant="secondary" className="text-xs">invoice.*</Badge>
                                <Badge variant="secondary" className="text-xs">ticket.*</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">IXC Soft</Badge>
                                <Badge className="text-green-600 bg-green-50 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Ativo
                                </Badge>
                              </div>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div>
                                <p className="text-muted-foreground">URL</p>
                                <p className="font-mono text-xs truncate">
                                  https://api.pytake.net/api/v1/erp/ixcsoft/webhook
                                </p>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Total de Eventos</span>
                                <span>567</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Taxa de Sucesso</span>
                                <span className="text-green-600">99.2%</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Último Evento</span>
                                <span>há 5h</span>
                              </div>
                            </div>
                            <div className="mt-3">
                              <p className="text-xs text-muted-foreground mb-1">Eventos:</p>
                              <div className="flex gap-1 flex-wrap">
                                <Badge variant="secondary" className="text-xs">customer.*</Badge>
                                <Badge variant="secondary" className="text-xs">invoice.*</Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}