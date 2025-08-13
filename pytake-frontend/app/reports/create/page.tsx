'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Save,
  Play,
  Plus,
  Trash2,
  Settings,
  Database,
  BarChart3,
  FileText,
  Calendar,
  Clock,
  Mail,
  Filter,
  Columns,
  Eye,
  EyeOff,
  ChevronUp,
  ChevronDown,
  AlertCircle,
  Info,
  Download
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'
import { 
  ReportType, 
  ReportPeriod, 
  ReportFormat,
  ReportFrequency,
  ReportColumn,
  ReportChart,
  ReportFilter
} from '@/lib/types/report'

const typeOptions: { value: ReportType; label: string; description: string }[] = [
  { value: 'conversations', label: 'Conversas', description: 'Análise de conversas e atendimento' },
  { value: 'messages', label: 'Mensagens', description: 'Volume e padrões de mensagens' },
  { value: 'contacts', label: 'Contatos', description: 'Perfil e segmentação de contatos' },
  { value: 'campaigns', label: 'Campanhas', description: 'Performance de campanhas' },
  { value: 'flows', label: 'Flows', description: 'Eficiência de automações' },
  { value: 'financial', label: 'Financeiro', description: 'Receitas, custos e lucratividade' },
  { value: 'performance', label: 'Performance', description: 'KPIs e métricas gerais' },
  { value: 'custom', label: 'Personalizado', description: 'Query customizada' }
]

const periodOptions: { value: ReportPeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'yesterday', label: 'Ontem' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'quarter', label: 'Este Trimestre' },
  { value: 'year', label: 'Este Ano' },
  { value: 'custom', label: 'Período Personalizado' }
]

const formatOptions: { value: ReportFormat; label: string; icon: string }[] = [
  { value: 'pdf', label: 'PDF', icon: '📄' },
  { value: 'excel', label: 'Excel', icon: '📊' },
  { value: 'csv', label: 'CSV', icon: '📝' },
  { value: 'json', label: 'JSON', icon: '{ }' },
  { value: 'html', label: 'HTML', icon: '🌐' }
]

const frequencyOptions: { value: ReportFrequency; label: string }[] = [
  { value: 'once', label: 'Uma vez' },
  { value: 'daily', label: 'Diário' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensal' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' }
]

// Available columns based on report type
const availableColumns: Record<ReportType, ReportColumn[]> = {
  conversations: [
    { id: '1', name: 'Data de Criação', field: 'createdAt', type: 'date', visible: true, sortable: true },
    { id: '2', name: 'Contato', field: 'contactName', type: 'text', visible: true, sortable: true },
    { id: '3', name: 'Número de Mensagens', field: 'messageCount', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '4', name: 'Duração (min)', field: 'duration', type: 'number', visible: true, sortable: true, aggregate: 'avg' },
    { id: '5', name: 'Status', field: 'status', type: 'text', visible: true, sortable: true },
    { id: '6', name: 'Atendente', field: 'assignedTo', type: 'text', visible: true, sortable: true },
    { id: '7', name: 'Tempo de Resposta (s)', field: 'responseTime', type: 'number', visible: true, sortable: true, aggregate: 'avg' },
    { id: '8', name: 'Satisfação', field: 'satisfaction', type: 'percentage', visible: false, sortable: true }
  ],
  messages: [
    { id: '1', name: 'Data de Envio', field: 'sentAt', type: 'date', visible: true, sortable: true },
    { id: '2', name: 'Contato', field: 'contactName', type: 'text', visible: true, sortable: true },
    { id: '3', name: 'Direção', field: 'direction', type: 'text', visible: true, sortable: true },
    { id: '4', name: 'Tipo', field: 'type', type: 'text', visible: true, sortable: true },
    { id: '5', name: 'Status', field: 'status', type: 'text', visible: true, sortable: true },
    { id: '6', name: 'Tamanho', field: 'length', type: 'number', visible: false, sortable: true }
  ],
  contacts: [
    { id: '1', name: 'Nome', field: 'name', type: 'text', visible: true, sortable: true },
    { id: '2', name: 'Telefone', field: 'phone', type: 'text', visible: true, sortable: false },
    { id: '3', name: 'Email', field: 'email', type: 'text', visible: true, sortable: true },
    { id: '4', name: 'Cidade', field: 'city', type: 'text', visible: true, sortable: true },
    { id: '5', name: 'Origem', field: 'source', type: 'text', visible: true, sortable: true },
    { id: '6', name: 'Tags', field: 'tags', type: 'text', visible: true, sortable: false },
    { id: '7', name: 'Total de Mensagens', field: 'messageCount', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '8', name: 'Última Interação', field: 'lastInteraction', type: 'date', visible: true, sortable: true }
  ],
  campaigns: [
    { id: '1', name: 'Nome da Campanha', field: 'name', type: 'text', visible: true, sortable: true },
    { id: '2', name: 'Tipo', field: 'type', type: 'text', visible: true, sortable: true },
    { id: '3', name: 'Data de Início', field: 'startedAt', type: 'date', visible: true, sortable: true },
    { id: '4', name: 'Mensagens Enviadas', field: 'sent', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '5', name: 'Entregues', field: 'delivered', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '6', name: 'Lidas', field: 'read', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '7', name: 'Taxa de Conversão', field: 'conversionRate', type: 'percentage', visible: true, sortable: true, aggregate: 'avg' },
    { id: '8', name: 'ROI', field: 'roi', type: 'currency', visible: false, sortable: true, aggregate: 'sum' }
  ],
  flows: [
    { id: '1', name: 'Nome do Flow', field: 'flowName', type: 'text', visible: true, sortable: true },
    { id: '2', name: 'Execuções', field: 'executions', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '3', name: 'Sucessos', field: 'success', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '4', name: 'Falhas', field: 'failures', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
    { id: '5', name: 'Taxa de Sucesso', field: 'successRate', type: 'percentage', visible: true, sortable: true, aggregate: 'avg' },
    { id: '6', name: 'Tempo Médio (s)', field: 'avgDuration', type: 'number', visible: true, sortable: true, aggregate: 'avg' }
  ],
  financial: [
    { id: '1', name: 'Data', field: 'date', type: 'date', visible: true, sortable: true },
    { id: '2', name: 'Descrição', field: 'description', type: 'text', visible: true, sortable: true },
    { id: '3', name: 'Categoria', field: 'category', type: 'text', visible: true, sortable: true },
    { id: '4', name: 'Receita', field: 'revenue', type: 'currency', visible: true, sortable: true, aggregate: 'sum' },
    { id: '5', name: 'Custo', field: 'cost', type: 'currency', visible: true, sortable: true, aggregate: 'sum' },
    { id: '6', name: 'Lucro', field: 'profit', type: 'currency', visible: true, sortable: true, aggregate: 'sum' },
    { id: '7', name: 'Margem', field: 'margin', type: 'percentage', visible: true, sortable: true, aggregate: 'avg' }
  ],
  performance: [
    { id: '1', name: 'KPI', field: 'metric', type: 'text', visible: true, sortable: true },
    { id: '2', name: 'Valor Atual', field: 'currentValue', type: 'number', visible: true, sortable: true },
    { id: '3', name: 'Meta', field: 'target', type: 'number', visible: true, sortable: true },
    { id: '4', name: 'Variação %', field: 'variation', type: 'percentage', visible: true, sortable: true },
    { id: '5', name: 'Status', field: 'status', type: 'text', visible: true, sortable: true }
  ],
  custom: [
    { id: '1', name: 'Campo 1', field: 'field1', type: 'text', visible: true, sortable: true },
    { id: '2', name: 'Campo 2', field: 'field2', type: 'number', visible: true, sortable: true },
    { id: '3', name: 'Campo 3', field: 'field3', type: 'date', visible: true, sortable: true }
  ]
}

export default function CreateReportPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  
  // Basic info
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<ReportType>('conversations')
  const [tags, setTags] = useState('')
  
  // Data source
  const [period, setPeriod] = useState<ReportPeriod>('month')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [filters, setFilters] = useState<ReportFilter[]>([])
  
  // Columns
  const [columns, setColumns] = useState<ReportColumn[]>([])
  
  // Charts
  const [charts, setCharts] = useState<ReportChart[]>([])
  const [includeCharts, setIncludeCharts] = useState(false)
  
  // Export
  const [exportFormats, setExportFormats] = useState<ReportFormat[]>(['pdf'])
  
  // Schedule
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [frequency, setFrequency] = useState<ReportFrequency>('monthly')
  const [scheduleTime, setScheduleTime] = useState('08:00')
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [recipients, setRecipients] = useState('')
  const [scheduleFormat, setScheduleFormat] = useState<ReportFormat>('pdf')
  
  // Settings
  const [isPublic, setIsPublic] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  useEffect(() => {
    // Update available columns when type changes
    const typeColumns = availableColumns[type] || []
    setColumns(typeColumns.map(col => ({ ...col })))
  }, [type])

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

  const handleToggleColumn = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    ))
  }

  const handleMoveColumn = (columnId: string, direction: 'up' | 'down') => {
    const currentIndex = columns.findIndex(col => col.id === columnId)
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === columns.length - 1)
    ) {
      return
    }

    const newColumns = [...columns]
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    
    ;[newColumns[currentIndex], newColumns[targetIndex]] = 
     [newColumns[targetIndex], newColumns[currentIndex]]
    
    setColumns(newColumns)
  }

  const handleAddFilter = () => {
    const newFilter: ReportFilter = {
      field: 'status',
      operator: 'equals',
      value: ''
    }
    setFilters([...filters, newFilter])
  }

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index))
  }

  const handleUpdateFilter = (index: number, updates: Partial<ReportFilter>) => {
    setFilters(prev => prev.map((filter, i) => 
      i === index ? { ...filter, ...updates } : filter
    ))
  }

  const handleToggleFormat = (format: ReportFormat) => {
    if (exportFormats.includes(format)) {
      setExportFormats(prev => prev.filter(f => f !== format))
    } else {
      setExportFormats(prev => [...prev, format])
    }
  }

  const handleSave = () => {
    const report = {
      name,
      description,
      type,
      dataSource: {
        entity: type === 'custom' ? 'custom_query' : type,
        dateField: type === 'messages' ? 'sentAt' : 'createdAt',
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
        filters,
        groupBy: [],
        orderBy: []
      },
      columns: columns.filter(col => col.visible),
      charts: includeCharts ? charts : undefined,
      exportFormats,
      schedule: scheduleEnabled ? {
        enabled: true,
        frequency,
        time: scheduleTime,
        dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        recipients: recipients.split(',').map(email => email.trim()).filter(Boolean),
        format: scheduleFormat,
        includeCharts,
        timezone: 'America/Sao_Paulo'
      } : undefined,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      isPublic
    }
    
    console.log('Saving report:', report)
    router.push('/reports')
  }

  const handleTest = () => {
    console.log('Testing report generation...')
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/reports')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Novo Relatório</h1>
                <p className="text-sm text-muted-foreground">
                  Configure dados, colunas e formato do relatório
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleTest}>
                <Play className="h-4 w-4 mr-2" />
                Testar
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Relatório
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle>Informações Básicas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome do Relatório</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Relatório Mensal de Conversas"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tags">Tags (separadas por vírgula)</Label>
                    <Input
                      id="tags"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      placeholder="Ex: mensal, conversas, kpi"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descreva o objetivo deste relatório..."
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label>Tipo de Relatório</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {typeOptions.map(option => (
                      <button
                        key={option.value}
                        onClick={() => setType(option.value)}
                        className={`p-3 rounded-lg border-2 transition-all text-left ${
                          type === option.value 
                            ? 'border-primary bg-primary/10' 
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {option.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Source */}
            <Card>
              <CardHeader>
                <CardTitle>Fonte de Dados</CardTitle>
                <CardDescription>
                  Configure período e filtros para os dados
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label>Período</Label>
                    <Select value={period} onValueChange={(v: ReportPeriod) => setPeriod(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {periodOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {period === 'custom' && (
                    <>
                      <div>
                        <Label htmlFor="start-date">Data Inicial</Label>
                        <Input
                          id="start-date"
                          type="date"
                          value={startDate}
                          onChange={(e) => setStartDate(e.target.value)}
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="end-date">Data Final</Label>
                        <Input
                          id="end-date"
                          type="date"
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                
                {/* Filters */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label>Filtros</Label>
                    <Button variant="outline" size="sm" onClick={handleAddFilter}>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Filtro
                    </Button>
                  </div>
                  
                  {filters.length === 0 ? (
                    <div className="text-center py-6 text-muted-foreground">
                      <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum filtro adicionado</p>
                      <p className="text-sm">Filtros ajudam a refinar os dados do relatório</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filters.map((filter, index) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Select 
                            value={filter.field} 
                            onValueChange={(value) => handleUpdateFilter(index, { field: value })}
                          >
                            <SelectTrigger className="w-[150px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="status">Status</SelectItem>
                              <SelectItem value="type">Tipo</SelectItem>
                              <SelectItem value="source">Origem</SelectItem>
                              <SelectItem value="tags">Tags</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Select 
                            value={filter.operator} 
                            onValueChange={(value: any) => handleUpdateFilter(index, { operator: value })}
                          >
                            <SelectTrigger className="w-[130px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equals">Igual a</SelectItem>
                              <SelectItem value="not_equals">Diferente de</SelectItem>
                              <SelectItem value="contains">Contém</SelectItem>
                              <SelectItem value="greater_than">Maior que</SelectItem>
                              <SelectItem value="less_than">Menor que</SelectItem>
                            </SelectContent>
                          </Select>
                          
                          <Input
                            value={filter.value}
                            onChange={(e) => handleUpdateFilter(index, { value: e.target.value })}
                            placeholder="Valor"
                            className="flex-1"
                          />
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveFilter(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Columns */}
            <Card>
              <CardHeader>
                <CardTitle>Colunas do Relatório</CardTitle>
                <CardDescription>
                  Selecione e organize as colunas que aparecerão no relatório
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {columns.map((column, index) => (
                    <div 
                      key={column.id} 
                      className={`flex items-center gap-3 p-3 border rounded-lg transition-all ${
                        column.visible ? 'bg-primary/5 border-primary/20' : 'bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleColumn(column.id)}
                        >
                          {column.visible ? (
                            <Eye className="h-4 w-4 text-green-600" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveColumn(column.id, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMoveColumn(column.id, 'down')}
                            disabled={index === columns.length - 1}
                          >
                            <ChevronDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${column.visible ? '' : 'text-muted-foreground'}`}>
                            {column.name}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            {column.type}
                          </Badge>
                          {column.aggregate && (
                            <Badge variant="outline" className="text-xs">
                              {column.aggregate.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Campo: {column.field}
                        </p>
                      </div>
                      
                      <div className="text-sm text-muted-foreground">
                        Posição: {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Charts */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Gráficos</CardTitle>
                    <CardDescription>
                      Adicione visualizações ao relatório
                    </CardDescription>
                  </div>
                  <Switch
                    checked={includeCharts}
                    onCheckedChange={setIncludeCharts}
                  />
                </div>
              </CardHeader>
              {includeCharts && (
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Configuração de gráficos será implementada</p>
                    <p className="text-sm">Tipos: linha, barra, pizza, área, dispersão</p>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Export Formats */}
            <Card>
              <CardHeader>
                <CardTitle>Formatos de Exportação</CardTitle>
                <CardDescription>
                  Selecione os formatos disponíveis para download
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                  {formatOptions.map(format => (
                    <button
                      key={format.value}
                      onClick={() => handleToggleFormat(format.value)}
                      className={`p-3 rounded-lg border-2 transition-all ${
                        exportFormats.includes(format.value)
                          ? 'border-primary bg-primary/10' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-2xl mb-1">{format.icon}</div>
                      <p className="text-sm font-medium">{format.label}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Schedule */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Agendamento Automático</CardTitle>
                    <CardDescription>
                      Configure geração e envio automático por email
                    </CardDescription>
                  </div>
                  <Switch
                    checked={scheduleEnabled}
                    onCheckedChange={setScheduleEnabled}
                  />
                </div>
              </CardHeader>
              {scheduleEnabled && (
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Frequência</Label>
                      <Select value={frequency} onValueChange={(v: ReportFrequency) => setFrequency(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencyOptions.map(option => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="schedule-time">Horário</Label>
                      <Input
                        id="schedule-time"
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      />
                    </div>
                    
                    {frequency === 'monthly' && (
                      <div>
                        <Label htmlFor="day-month">Dia do Mês</Label>
                        <Input
                          id="day-month"
                          type="number"
                          min="1"
                          max="31"
                          value={dayOfMonth}
                          onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        />
                      </div>
                    )}
                    
                    {frequency === 'weekly' && (
                      <div>
                        <Label>Dia da Semana</Label>
                        <Select value={dayOfWeek.toString()} onValueChange={(v) => setDayOfWeek(Number(v))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">Segunda-feira</SelectItem>
                            <SelectItem value="2">Terça-feira</SelectItem>
                            <SelectItem value="3">Quarta-feira</SelectItem>
                            <SelectItem value="4">Quinta-feira</SelectItem>
                            <SelectItem value="5">Sexta-feira</SelectItem>
                            <SelectItem value="6">Sábado</SelectItem>
                            <SelectItem value="0">Domingo</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="recipients">Destinatários (emails separados por vírgula)</Label>
                    <Input
                      id="recipients"
                      value={recipients}
                      onChange={(e) => setRecipients(e.target.value)}
                      placeholder="gerencia@empresa.com, supervisor@empresa.com"
                    />
                  </div>
                  
                  <div>
                    <Label>Formato do Email</Label>
                    <Select value={scheduleFormat} onValueChange={(v: ReportFormat) => setScheduleFormat(v)}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {exportFormats.map(format => (
                          <SelectItem key={format} value={format}>
                            {formatOptions.find(f => f.value === format)?.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Configurações</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="public">Relatório Público</Label>
                    <p className="text-sm text-muted-foreground">
                      Permite que outros usuários vejam este relatório
                    </p>
                  </div>
                  <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}