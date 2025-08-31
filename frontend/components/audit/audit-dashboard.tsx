'use client'

import { useState } from 'react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Shield,
  AlertTriangle,
  Eye,
  Filter,
  Download,
  RefreshCw,
  Search,
  Calendar,
  User,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  XCircle,
  Info,
  Zap,
  FileText,
  Settings,
  Database,
  MessageSquare,
  Users,
  Workflow,
  BarChart3,
  Lock
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'
import { Checkbox } from '@/components/ui/checkbox'

import { useAuditLog, AuditLogEntry } from '@/lib/hooks/useAuditLog'

export function AuditDashboard() {
  const {
    entries,
    securityAlerts,
    stats,
    filters,
    isLoading,
    error,
    realTimeEnabled,
    updateFilters,
    clearFilters,
    exportAuditData,
    setRealTimeEnabled,
    loadAuditData,
    criticalAlerts,
    openAlerts,
    failureRate,
    topUsers,
    topActions
  } = useAuditLog()

  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const getCategoryIcon = (category: AuditLogEntry['category']) => {
    switch (category) {
      case 'authentication': return <Lock className="h-4 w-4" />
      case 'conversation': return <MessageSquare className="h-4 w-4" />
      case 'flow': return <Workflow className="h-4 w-4" />
      case 'contact': return <Users className="h-4 w-4" />
      case 'campaign': return <Zap className="h-4 w-4" />
      case 'settings': return <Settings className="h-4 w-4" />
      case 'system': return <Database className="h-4 w-4" />
      case 'security': return <Shield className="h-4 w-4" />
      case 'data': return <FileText className="h-4 w-4" />
      case 'ai': return <BarChart3 className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getSeverityColor = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'error': return 'text-red-500 bg-red-50 border-red-200'
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'info': return 'text-blue-600 bg-blue-50 border-blue-200'
    }
  }

  const getStatusIcon = (status: AuditLogEntry['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'failure': return <XCircle className="h-4 w-4 text-red-600" />
      case 'pending': return <Clock className="h-4 w-4 text-yellow-600" />
    }
  }

  const formatDuration = (duration?: number) => {
    if (!duration) return 'N/A'
    if (duration < 1000) return `${duration}ms`
    return `${(duration / 1000).toFixed(2)}s`
  }

  const categoryLabels: Record<AuditLogEntry['category'], string> = {
    authentication: 'Autenticação',
    conversation: 'Conversas',
    flow: 'Fluxos',
    contact: 'Contatos',
    campaign: 'Campanhas',
    settings: 'Configurações',
    system: 'Sistema',
    security: 'Segurança',
    data: 'Dados',
    ai: 'IA'
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Auditoria e Logs</h2>
          <p className="text-muted-foreground">
            Monitore atividades e eventos do sistema em tempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={realTimeEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setRealTimeEnabled(!realTimeEnabled)}
          >
            <Activity className={`h-4 w-4 mr-2 ${realTimeEnabled ? 'animate-pulse' : ''}`} />
            Tempo Real
          </Button>
          <Button variant="outline" size="sm" onClick={loadAuditData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportAuditData('json')}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Alertas Críticos</AlertTitle>
          <AlertDescription>
            {criticalAlerts.length} alertas críticos de segurança precisam de atenção imediata.
          </AlertDescription>
        </Alert>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Eventos</p>
                <p className="text-2xl font-bold">{stats?.totalEntries.toLocaleString() || 0}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Alertas Ativos</p>
                <p className="text-2xl font-bold">{openAlerts.length}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Falhas</p>
                <p className="text-2xl font-bold">{failureRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Usuários Únicos</p>
                <p className="text-2xl font-bold">{stats?.uniqueUsers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="logs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="logs">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="security">Alertas de Segurança</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Audit Logs */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Log de Atividades</CardTitle>
                  <CardDescription>
                    {entries.length} de {stats?.totalEntries || 0} eventos
                    {filters.search && ` • Filtrando: "${filters.search}"`}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Pesquisar logs..."
                      value={filters.search}
                      onChange={(e) => updateFilters({ search: e.target.value })}
                      className="pl-8 w-64"
                    />
                  </div>

                  {/* Filters */}
                  <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtros
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold">Filtros Avançados</h4>
                          <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Limpar
                          </Button>
                        </div>

                        {/* Date Range */}
                        <div className="space-y-2">
                          <Label>Período</Label>
                          <div className="flex gap-2">
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="justify-start">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {filters.dateRange.start 
                                    ? format(filters.dateRange.start, 'dd/MM', { locale: ptBR })
                                    : 'Início'
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                  mode="single"
                                  selected={filters.dateRange.start}
                                  onSelect={(date) => updateFilters({ 
                                    dateRange: { ...filters.dateRange, start: date } 
                                  })}
                                />
                              </PopoverContent>
                            </Popover>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button variant="outline" size="sm" className="justify-start">
                                  <Calendar className="h-4 w-4 mr-2" />
                                  {filters.dateRange.end 
                                    ? format(filters.dateRange.end, 'dd/MM', { locale: ptBR })
                                    : 'Fim'
                                  }
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <CalendarComponent
                                  mode="single"
                                  selected={filters.dateRange.end}
                                  onSelect={(date) => updateFilters({ 
                                    dateRange: { ...filters.dateRange, end: date } 
                                  })}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        {/* Categories */}
                        <div className="space-y-2">
                          <Label>Categorias</Label>
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(categoryLabels).map(([key, label]) => (
                              <div key={key} className="flex items-center space-x-2">
                                <Checkbox
                                  id={`category-${key}`}
                                  checked={filters.categories.includes(key as AuditLogEntry['category'])}
                                  onCheckedChange={(checked) => {
                                    const newCategories = checked 
                                      ? [...filters.categories, key as AuditLogEntry['category']]
                                      : filters.categories.filter(c => c !== key)
                                    updateFilters({ categories: newCategories })
                                  }}
                                />
                                <Label htmlFor={`category-${key}`} className="text-sm">
                                  {label}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Severity */}
                        <div className="space-y-2">
                          <Label>Gravidade</Label>
                          <div className="flex gap-2">
                            {['info', 'warning', 'error', 'critical'].map((severity) => (
                              <Button
                                key={severity}
                                variant={filters.severity.includes(severity as any) ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                  const newSeverity = filters.severity.includes(severity as any)
                                    ? filters.severity.filter(s => s !== severity)
                                    : [...filters.severity, severity as AuditLogEntry['severity']]
                                  updateFilters({ severity: newSeverity })
                                }}
                              >
                                {severity.charAt(0).toUpperCase() + severity.slice(1)}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => {
                        setSelectedEntry(entry)
                        setDetailsOpen(true)
                      }}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(entry.category)}
                          {getStatusIcon(entry.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{entry.action.replace('_', ' ')}</p>
                            <Badge className={`text-xs ${getSeverityColor(entry.severity)}`}>
                              {entry.severity}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {entry.userName} • {categoryLabels[entry.category]} • 
                            {format(entry.timestamp, 'dd/MM HH:mm:ss', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDuration(entry.duration)}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Alerts */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Segurança</CardTitle>
              <CardDescription>
                Monitoramento de atividades suspeitas e violações de segurança
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {securityAlerts.map((alert) => (
                  <div key={alert.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                          alert.severity === 'critical' ? 'text-red-600' :
                          alert.severity === 'high' ? 'text-orange-600' :
                          alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                        }`} />
                        <div>
                          <h4 className="font-medium">{alert.title}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.description}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{format(alert.timestamp, 'dd/MM/yyyy HH:mm', { locale: ptBR })}</span>
                            {alert.userId && <span>Usuário: {alert.userId}</span>}
                            <span>{alert.relatedEntries.length} eventos relacionados</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={alert.status === 'open' ? 'destructive' : 'secondary'}>
                          {alert.status === 'open' ? 'Aberto' :
                           alert.status === 'investigating' ? 'Investigando' :
                           alert.status === 'resolved' ? 'Resolvido' : 'Falso Positivo'}
                        </Badge>
                        <Badge variant="outline">
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Users */}
            <Card>
              <CardHeader>
                <CardTitle>Usuários Mais Ativos</CardTitle>
                <CardDescription>
                  Usuários com maior número de ações registradas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topUsers.slice(0, 10).map((userStat, index) => (
                    <div key={userStat.userId} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{userStat.userName}</p>
                          <p className="text-xs text-muted-foreground">{userStat.userId}</p>
                        </div>
                      </div>
                      <Badge variant="outline">{userStat.count} ações</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Ações Mais Frequentes</CardTitle>
                <CardDescription>
                  Ações mais executadas no sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topActions.slice(0, 10).map((actionStat, index) => (
                    <div key={actionStat.action} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
                          {index + 1}
                        </div>
                        <p className="font-medium text-sm capitalize">
                          {actionStat.action.replace('_', ' ')}
                        </p>
                      </div>
                      <Badge variant="outline">{actionStat.count} vezes</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Entry Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
            <DialogDescription>
              Informações completas sobre o evento de auditoria
            </DialogDescription>
          </DialogHeader>
          
          {selectedEntry && (
            <div className="space-y-4">
              {/* Header Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Usuário</Label>
                  <p className="text-sm">{selectedEntry.userName}</p>
                  <p className="text-xs text-muted-foreground">{selectedEntry.userEmail}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Timestamp</Label>
                  <p className="text-sm">
                    {format(selectedEntry.timestamp, 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Ação</Label>
                  <p className="text-sm capitalize">{selectedEntry.action.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Categoria</Label>
                  <p className="text-sm">{categoryLabels[selectedEntry.category]}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedEntry.status)}
                    <span className="text-sm capitalize">{selectedEntry.status}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Gravidade</Label>
                  <Badge className={getSeverityColor(selectedEntry.severity)}>
                    {selectedEntry.severity}
                  </Badge>
                </div>
              </div>

              <Separator />

              {/* Metadata */}
              <div>
                <Label className="text-sm font-medium">Metadados</Label>
                <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">IP Address:</span>
                    <span className="ml-2">{selectedEntry.metadata.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Dispositivo:</span>
                    <span className="ml-2 capitalize">{selectedEntry.metadata.device.type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">SO:</span>
                    <span className="ml-2">{selectedEntry.metadata.device.os}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Navegador:</span>
                    <span className="ml-2">{selectedEntry.metadata.device.browser}</span>
                  </div>
                  {selectedEntry.metadata.location && (
                    <>
                      <div>
                        <span className="text-muted-foreground">País:</span>
                        <span className="ml-2">{selectedEntry.metadata.location.country}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Cidade:</span>
                        <span className="ml-2">{selectedEntry.metadata.location.city}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <Separator />

              {/* Details */}
              <div>
                <Label className="text-sm font-medium">Detalhes</Label>
                <pre className="mt-2 text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                  {JSON.stringify(selectedEntry.details, null, 2)}
                </pre>
              </div>

              {/* Changes */}
              {selectedEntry.changes && (
                <>
                  <Separator />
                  <div>
                    <Label className="text-sm font-medium">Alterações</Label>
                    <div className="mt-2 space-y-2">
                      <div>
                        <span className="text-xs text-muted-foreground">Campos alterados:</span>
                        <div className="flex gap-2 mt-1">
                          {selectedEntry.changes.fields?.map(field => (
                            <Badge key={field} variant="outline" className="text-xs">
                              {field}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-muted-foreground block mb-1">Antes:</span>
                          <pre className="bg-red-50 p-2 rounded">
                            {JSON.stringify(selectedEntry.changes.before, null, 2)}
                          </pre>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Depois:</span>
                          <pre className="bg-green-50 p-2 rounded">
                            {JSON.stringify(selectedEntry.changes.after, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}