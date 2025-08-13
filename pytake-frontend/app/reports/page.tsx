'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Search, 
  FileText,
  Download,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Filter,
  Share2,
  Eye,
  Edit3,
  Copy,
  Trash2,
  Play,
  Pause,
  FileSpreadsheet,
  FilePlus,
  TrendingUp,
  BarChart3,
  PieChart,
  Activity,
  DollarSign,
  Users,
  MessageSquare,
  Zap,
  Mail,
  MoreVertical,
  Settings
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { MOCK_REPORTS, Report, ReportType, ReportStatus, ReportFormat } from '@/lib/types/report'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const typeConfig: Record<ReportType, { label: string; icon: any; color: string }> = {
  conversations: { label: 'Conversas', icon: MessageSquare, color: 'text-blue-600' },
  messages: { label: 'Mensagens', icon: Mail, color: 'text-green-600' },
  contacts: { label: 'Contatos', icon: Users, color: 'text-purple-600' },
  campaigns: { label: 'Campanhas', icon: TrendingUp, color: 'text-orange-600' },
  flows: { label: 'Flows', icon: Zap, color: 'text-pink-600' },
  financial: { label: 'Financeiro', icon: DollarSign, color: 'text-emerald-600' },
  performance: { label: 'Performance', icon: Activity, color: 'text-indigo-600' },
  custom: { label: 'Personalizado', icon: Settings, color: 'text-gray-600' }
}

const statusConfig: Record<ReportStatus, { label: string; color: string; icon: any }> = {
  draft: { label: 'Rascunho', color: 'bg-gray-100 text-gray-600 border-gray-200', icon: Edit3 },
  generating: { label: 'Gerando', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: RefreshCw },
  ready: { label: 'Pronto', color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle },
  failed: { label: 'Falhou', color: 'bg-red-100 text-red-800 border-red-200', icon: XCircle },
  scheduled: { label: 'Agendado', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock }
}

const formatConfig: Record<ReportFormat, { label: string; icon: any; color: string }> = {
  pdf: { label: 'PDF', icon: FileText, color: 'text-red-600' },
  excel: { label: 'Excel', icon: FileSpreadsheet, color: 'text-green-600' },
  csv: { label: 'CSV', icon: FileText, color: 'text-blue-600' },
  json: { label: 'JSON', icon: FileText, color: 'text-purple-600' },
  html: { label: 'HTML', icon: FileText, color: 'text-orange-600' }
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
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

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         report.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesType = filterType === 'all' || report.type === filterType
    const matchesStatus = filterStatus === 'all' || report.status === filterStatus
    const matchesPeriod = filterPeriod === 'all' || report.dataSource.period === filterPeriod

    return matchesSearch && matchesType && matchesStatus && matchesPeriod
  })

  const handleGenerate = (reportId: string) => {
    setReports(prev => prev.map(report => {
      if (report.id === reportId) {
        return { 
          ...report, 
          status: 'generating',
          lastGenerated: new Date().toISOString()
        }
      }
      return report
    }))
    
    // Simulate generation completion
    setTimeout(() => {
      setReports(prev => prev.map(report => {
        if (report.id === reportId) {
          return { 
            ...report, 
            status: 'ready',
            generationTime: Math.floor(Math.random() * 10000) + 1000,
            fileSize: Math.floor(Math.random() * 10000000) + 100000,
            downloadUrl: `/reports/${reportId}/download`
          }
        }
        return report
      }))
    }, 3000)
  }

  const handleDownload = (reportId: string, format: ReportFormat) => {
    // TODO: Implement download
    console.log(`Downloading report ${reportId} as ${format}`)
  }

  const handleDelete = (reportId: string) => {
    if (confirm('Tem certeza que deseja excluir este relatório?')) {
      setReports(prev => prev.filter(r => r.id !== reportId))
    }
  }

  const handleDuplicate = (reportId: string) => {
    const original = reports.find(r => r.id === reportId)
    if (original) {
      const duplicate: Report = {
        ...original,
        id: Date.now().toString(),
        name: `${original.name} (Cópia)`,
        status: 'draft',
        lastGenerated: undefined,
        downloadUrl: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      setReports(prev => [duplicate, ...prev])
    }
  }

  const handleShare = (reportId: string) => {
    // TODO: Implement share
    console.log('Sharing report:', reportId)
  }

  const stats = {
    total: reports.length,
    ready: reports.filter(r => r.status === 'ready').length,
    scheduled: reports.filter(r => r.status === 'scheduled' || r.schedule?.enabled).length,
    generating: reports.filter(r => r.status === 'generating').length,
    failed: reports.filter(r => r.status === 'failed').length,
    public: reports.filter(r => r.isPublic).length
  }

  const formatBytes = (bytes: number) => {
    if (!bytes) return '-'
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const formatDate = (date: string) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDuration = (ms: number) => {
    if (!ms) return '-'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}min`
  }

  const getPeriodLabel = (period: string) => {
    const labels: Record<string, string> = {
      today: 'Hoje',
      yesterday: 'Ontem',
      week: 'Semana',
      month: 'Mês',
      quarter: 'Trimestre',
      year: 'Ano',
      custom: 'Personalizado'
    }
    return labels[period] || period
  }

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      once: 'Uma vez',
      daily: 'Diário',
      weekly: 'Semanal',
      monthly: 'Mensal',
      quarterly: 'Trimestral',
      yearly: 'Anual'
    }
    return labels[frequency] || frequency
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Relatórios</h1>
              <p className="text-sm text-muted-foreground">
                Gere e exporte relatórios personalizados
              </p>
            </div>
            <Button onClick={() => router.push('/reports/create')}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Relatório
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
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground">Relatórios</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prontos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
                <p className="text-xs text-muted-foreground">Para download</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Agendados</CardTitle>
                <Clock className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.scheduled}</div>
                <p className="text-xs text-muted-foreground">Automáticos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gerando</CardTitle>
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{stats.generating}</div>
                <p className="text-xs text-muted-foreground">Em processo</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Falhas</CardTitle>
                <XCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.failed}</div>
                <p className="text-xs text-muted-foreground">Com erro</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Públicos</CardTitle>
                <Share2 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">{stats.public}</div>
                <p className="text-xs text-muted-foreground">Compartilhados</p>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar relatórios..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {Object.entries(typeConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    <div className="flex items-center gap-2">
                      <config.icon className={`h-4 w-4 ${config.color}`} />
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                {Object.entries(statusConfig).map(([value, config]) => (
                  <SelectItem key={value} value={value}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterPeriod} onValueChange={setFilterPeriod}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Períodos</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Semana</SelectItem>
                <SelectItem value="month">Mês</SelectItem>
                <SelectItem value="quarter">Trimestre</SelectItem>
                <SelectItem value="year">Ano</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reports List */}
          {filteredReports.length === 0 ? (
            <Card className="p-12">
              <div className="text-center text-muted-foreground">
                <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
                <p className="mb-4">
                  {searchTerm 
                    ? 'Tente ajustar os filtros de busca' 
                    : 'Crie seu primeiro relatório'}
                </p>
                {!searchTerm && (
                  <Button onClick={() => router.push('/reports/create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Criar Primeiro Relatório
                  </Button>
                )}
              </div>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredReports.map((report) => {
                const TypeIcon = typeConfig[report.type].icon
                const StatusIcon = statusConfig[report.status].icon
                
                return (
                  <Card key={report.id} className="hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg bg-primary/10`}>
                              <TypeIcon className={`h-5 w-5 ${typeConfig[report.type].color}`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="text-lg font-semibold">{report.name}</h3>
                                <Badge 
                                  variant="outline" 
                                  className={statusConfig[report.status].color}
                                >
                                  <StatusIcon className="h-3 w-3 mr-1" />
                                  {statusConfig[report.status].label}
                                </Badge>
                                <Badge variant="secondary">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  {getPeriodLabel(report.dataSource.period)}
                                </Badge>
                                {report.isPublic && (
                                  <Badge variant="outline" className="text-purple-600 border-purple-200">
                                    <Share2 className="h-3 w-3 mr-1" />
                                    Público
                                  </Badge>
                                )}
                                {report.schedule?.enabled && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-200">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {getFrequencyLabel(report.schedule.frequency)}
                                  </Badge>
                                )}
                              </div>
                              {report.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {report.description}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Info Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Colunas</p>
                              <p className="text-sm font-semibold">{report.columns.length}</p>
                            </div>
                            {report.charts && report.charts.length > 0 && (
                              <div className="text-center p-2 bg-muted/50 rounded">
                                <p className="text-xs text-muted-foreground">Gráficos</p>
                                <p className="text-sm font-semibold">{report.charts.length}</p>
                              </div>
                            )}
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Última Geração</p>
                              <p className="text-sm font-semibold">
                                {report.lastGenerated ? formatDate(report.lastGenerated) : '-'}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Tempo</p>
                              <p className="text-sm font-semibold">
                                {formatDuration(report.generationTime)}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Tamanho</p>
                              <p className="text-sm font-semibold">
                                {formatBytes(report.fileSize)}
                              </p>
                            </div>
                            <div className="text-center p-2 bg-muted/50 rounded">
                              <p className="text-xs text-muted-foreground">Formatos</p>
                              <div className="flex justify-center gap-1">
                                {report.exportFormats.map(format => {
                                  const FormatIcon = formatConfig[format].icon
                                  return (
                                    <FormatIcon 
                                      key={format}
                                      className={`h-3 w-3 ${formatConfig[format].color}`}
                                      title={formatConfig[format].label}
                                    />
                                  )
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Schedule Info */}
                          {report.schedule?.enabled && (
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{report.schedule.recipients.length} destinatário(s)</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="h-3 w-3" />
                                <span>
                                  {report.schedule.frequency === 'daily' && `Diário às ${report.schedule.time}`}
                                  {report.schedule.frequency === 'weekly' && `Semanal às ${report.schedule.time}`}
                                  {report.schedule.frequency === 'monthly' && `Dia ${report.schedule.dayOfMonth} às ${report.schedule.time}`}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Tags */}
                          {report.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {report.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 ml-4">
                          {report.status === 'ready' && report.downloadUrl ? (
                            <>
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleDownload(report.id, report.exportFormats[0])}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleGenerate(report.id)}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </>
                          ) : report.status === 'generating' ? (
                            <Button variant="outline" size="sm" disabled>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleGenerate(report.id)}
                            >
                              <Play className="h-4 w-4 mr-2" />
                              Gerar
                            </Button>
                          )}
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/reports/${report.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/reports/${report.id}/edit`)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleShare(report.id)}
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDuplicate(report.id)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(report.id)}
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