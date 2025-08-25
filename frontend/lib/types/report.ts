export type ReportType = 'conversations' | 'messages' | 'contacts' | 'campaigns' | 'flows' | 'financial' | 'performance' | 'custom'
export type ReportPeriod = 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom'
export type ReportFormat = 'pdf' | 'excel' | 'csv' | 'json' | 'html'
export type ReportStatus = 'draft' | 'generating' | 'ready' | 'failed' | 'scheduled'
export type ReportFrequency = 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface ReportFilter {
  field: string
  operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'between' | 'in'
  value: any
  value2?: any // For 'between' operator
}

export interface ReportColumn {
  id: string
  name: string
  field: string
  type: 'text' | 'number' | 'date' | 'boolean' | 'currency' | 'percentage'
  width?: number
  align?: 'left' | 'center' | 'right'
  format?: string // For date/number formatting
  aggregate?: 'sum' | 'avg' | 'min' | 'max' | 'count'
  visible: boolean
  sortable: boolean
}

export interface ReportChart {
  id: string
  type: 'line' | 'bar' | 'pie' | 'area' | 'scatter' | 'funnel' | 'heatmap'
  title: string
  dataSource: string
  xAxis: string
  yAxis: string
  series?: string[]
  colors?: string[]
  showLegend: boolean
  showGrid: boolean
}

export interface ReportSchedule {
  enabled: boolean
  frequency: ReportFrequency
  time?: string // HH:MM format
  dayOfWeek?: number // 0-6 (Sunday-Saturday)
  dayOfMonth?: number // 1-31
  recipients: string[] // Email addresses
  format: ReportFormat
  includeCharts: boolean
  timezone: string
}

export interface Report {
  id: string
  name: string
  description?: string
  type: ReportType
  status: ReportStatus
  
  // Data configuration
  dataSource: {
    entity: string // conversations, messages, contacts, etc.
    dateField: string
    period: ReportPeriod
    startDate?: string
    endDate?: string
    filters: ReportFilter[]
    groupBy?: string[]
    orderBy?: { field: string; direction: 'asc' | 'desc' }[]
  }
  
  // Display configuration
  columns: ReportColumn[]
  charts?: ReportChart[]
  
  // Export settings
  exportFormats: ReportFormat[]
  
  // Schedule
  schedule?: ReportSchedule
  
  // Execution info
  lastGenerated?: string
  lastGeneratedBy?: string
  generationTime?: number // milliseconds
  fileSize?: number // bytes
  downloadUrl?: string
  expiresAt?: string
  
  // Metadata
  createdAt: string
  updatedAt: string
  createdBy: string
  tags: string[]
  isPublic: boolean
  sharedWith?: string[] // User IDs
}

// Mock data
export const MOCK_REPORTS: Report[] = [
  {
    id: '1',
    name: 'Relatório Mensal de Conversas',
    description: 'Análise completa das conversas do mês com métricas de desempenho',
    type: 'conversations',
    status: 'ready',
    dataSource: {
      entity: 'conversations',
      dateField: 'createdAt',
      period: 'month',
      filters: [],
      groupBy: ['status', 'assignedTo'],
      orderBy: [{ field: 'createdAt', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'Data', field: 'createdAt', type: 'date', visible: true, sortable: true },
      { id: '2', name: 'Contato', field: 'contactName', type: 'text', visible: true, sortable: true },
      { id: '3', name: 'Mensagens', field: 'messageCount', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '4', name: 'Duração', field: 'duration', type: 'number', visible: true, sortable: true, aggregate: 'avg' },
      { id: '5', name: 'Status', field: 'status', type: 'text', visible: true, sortable: true },
      { id: '6', name: 'Atendente', field: 'assignedTo', type: 'text', visible: true, sortable: true },
      { id: '7', name: 'Tempo Resposta', field: 'responseTime', type: 'number', visible: true, sortable: true, aggregate: 'avg' },
      { id: '8', name: 'Satisfação', field: 'satisfaction', type: 'percentage', visible: true, sortable: true, aggregate: 'avg' }
    ],
    charts: [
      {
        id: 'c1',
        type: 'line',
        title: 'Evolução de Conversas',
        dataSource: 'conversations',
        xAxis: 'date',
        yAxis: 'count',
        showLegend: true,
        showGrid: true
      },
      {
        id: 'c2',
        type: 'bar',
        title: 'Conversas por Atendente',
        dataSource: 'conversations',
        xAxis: 'assignedTo',
        yAxis: 'count',
        showLegend: false,
        showGrid: true
      }
    ],
    exportFormats: ['pdf', 'excel', 'csv'],
    schedule: {
      enabled: true,
      frequency: 'monthly',
      dayOfMonth: 1,
      time: '08:00',
      recipients: ['gerencia@empresa.com', 'supervisor@empresa.com'],
      format: 'pdf',
      includeCharts: true,
      timezone: 'America/Sao_Paulo'
    },
    lastGenerated: '2024-01-01T08:00:00Z',
    lastGeneratedBy: 'system',
    generationTime: 3500,
    fileSize: 2457600,
    downloadUrl: '/reports/1/download',
    expiresAt: '2024-02-01T08:00:00Z',
    createdAt: '2023-12-01T10:00:00Z',
    updatedAt: '2024-01-01T08:00:00Z',
    createdBy: 'user-1',
    tags: ['mensal', 'conversas', 'desempenho'],
    isPublic: false,
    sharedWith: ['user-2', 'user-3']
  },
  {
    id: '2',
    name: 'Relatório de Campanhas',
    description: 'Performance detalhada de todas as campanhas de marketing',
    type: 'campaigns',
    status: 'ready',
    dataSource: {
      entity: 'campaigns',
      dateField: 'startedAt',
      period: 'quarter',
      filters: [
        { field: 'status', operator: 'equals', value: 'completed' }
      ],
      groupBy: ['type', 'tags'],
      orderBy: [{ field: 'conversionRate', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'Campanha', field: 'name', type: 'text', visible: true, sortable: true },
      { id: '2', name: 'Tipo', field: 'type', type: 'text', visible: true, sortable: true },
      { id: '3', name: 'Início', field: 'startedAt', type: 'date', visible: true, sortable: true },
      { id: '4', name: 'Enviadas', field: 'sent', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '5', name: 'Entregues', field: 'delivered', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '6', name: 'Lidas', field: 'read', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '7', name: 'Conversão', field: 'conversionRate', type: 'percentage', visible: true, sortable: true, aggregate: 'avg' },
      { id: '8', name: 'ROI', field: 'roi', type: 'currency', visible: true, sortable: true, aggregate: 'sum' }
    ],
    charts: [
      {
        id: 'c3',
        type: 'funnel',
        title: 'Funil de Conversão',
        dataSource: 'campaigns',
        xAxis: 'stage',
        yAxis: 'count',
        showLegend: true,
        showGrid: false
      }
    ],
    exportFormats: ['pdf', 'excel'],
    lastGenerated: '2024-01-15T14:00:00Z',
    lastGeneratedBy: 'user-1',
    generationTime: 5200,
    fileSize: 1845200,
    downloadUrl: '/reports/2/download',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-15T14:00:00Z',
    createdBy: 'user-1',
    tags: ['campanhas', 'marketing', 'trimestral'],
    isPublic: true
  },
  {
    id: '3',
    name: 'Relatório Financeiro',
    description: 'Resumo financeiro com receitas, custos e lucratividade',
    type: 'financial',
    status: 'generating',
    dataSource: {
      entity: 'transactions',
      dateField: 'date',
      period: 'month',
      filters: [],
      groupBy: ['category', 'paymentMethod'],
      orderBy: [{ field: 'amount', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'Data', field: 'date', type: 'date', visible: true, sortable: true },
      { id: '2', name: 'Descrição', field: 'description', type: 'text', visible: true, sortable: true },
      { id: '3', name: 'Categoria', field: 'category', type: 'text', visible: true, sortable: true },
      { id: '4', name: 'Receita', field: 'revenue', type: 'currency', visible: true, sortable: true, aggregate: 'sum' },
      { id: '5', name: 'Custo', field: 'cost', type: 'currency', visible: true, sortable: true, aggregate: 'sum' },
      { id: '6', name: 'Lucro', field: 'profit', type: 'currency', visible: true, sortable: true, aggregate: 'sum' },
      { id: '7', name: 'Margem', field: 'margin', type: 'percentage', visible: true, sortable: true, aggregate: 'avg' }
    ],
    charts: [
      {
        id: 'c4',
        type: 'area',
        title: 'Evolução Financeira',
        dataSource: 'transactions',
        xAxis: 'date',
        yAxis: 'amount',
        series: ['revenue', 'cost', 'profit'],
        showLegend: true,
        showGrid: true
      },
      {
        id: 'c5',
        type: 'pie',
        title: 'Distribuição por Categoria',
        dataSource: 'transactions',
        xAxis: 'category',
        yAxis: 'amount',
        showLegend: true,
        showGrid: false
      }
    ],
    exportFormats: ['pdf', 'excel', 'csv'],
    schedule: {
      enabled: true,
      frequency: 'weekly',
      dayOfWeek: 1,
      time: '07:00',
      recipients: ['financeiro@empresa.com', 'diretoria@empresa.com'],
      format: 'excel',
      includeCharts: true,
      timezone: 'America/Sao_Paulo'
    },
    createdAt: '2024-01-10T09:00:00Z',
    updatedAt: '2024-01-15T16:00:00Z',
    createdBy: 'user-2',
    tags: ['financeiro', 'receita', 'custos'],
    isPublic: false,
    sharedWith: ['user-1', 'user-4']
  },
  {
    id: '4',
    name: 'Análise de Contatos',
    description: 'Perfil e segmentação da base de contatos',
    type: 'contacts',
    status: 'ready',
    dataSource: {
      entity: 'contacts',
      dateField: 'createdAt',
      period: 'year',
      filters: [
        { field: 'status', operator: 'equals', value: 'active' }
      ],
      groupBy: ['source', 'tags', 'city'],
      orderBy: [{ field: 'lastInteraction', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'Nome', field: 'name', type: 'text', visible: true, sortable: true },
      { id: '2', name: 'Telefone', field: 'phone', type: 'text', visible: true, sortable: false },
      { id: '3', name: 'Cidade', field: 'city', type: 'text', visible: true, sortable: true },
      { id: '4', name: 'Origem', field: 'source', type: 'text', visible: true, sortable: true },
      { id: '5', name: 'Tags', field: 'tags', type: 'text', visible: true, sortable: false },
      { id: '6', name: 'Mensagens', field: 'messageCount', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '7', name: 'Última Interação', field: 'lastInteraction', type: 'date', visible: true, sortable: true }
    ],
    charts: [
      {
        id: 'c6',
        type: 'heatmap',
        title: 'Mapa de Atividade',
        dataSource: 'contacts',
        xAxis: 'dayOfWeek',
        yAxis: 'hourOfDay',
        showLegend: true,
        showGrid: true
      }
    ],
    exportFormats: ['excel', 'csv'],
    lastGenerated: '2024-01-14T10:00:00Z',
    lastGeneratedBy: 'user-3',
    generationTime: 8900,
    fileSize: 5632000,
    downloadUrl: '/reports/4/download',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-14T10:00:00Z',
    createdBy: 'user-3',
    tags: ['contatos', 'crm', 'segmentacao'],
    isPublic: true
  },
  {
    id: '5',
    name: 'Performance de Flows',
    description: 'Análise de eficiência dos flows de automação',
    type: 'flows',
    status: 'scheduled',
    dataSource: {
      entity: 'flow_executions',
      dateField: 'executedAt',
      period: 'week',
      filters: [],
      groupBy: ['flowName', 'status'],
      orderBy: [{ field: 'successRate', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'Flow', field: 'flowName', type: 'text', visible: true, sortable: true },
      { id: '2', name: 'Execuções', field: 'executions', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '3', name: 'Sucesso', field: 'success', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '4', name: 'Falhas', field: 'failures', type: 'number', visible: true, sortable: true, aggregate: 'sum' },
      { id: '5', name: 'Taxa Sucesso', field: 'successRate', type: 'percentage', visible: true, sortable: true, aggregate: 'avg' },
      { id: '6', name: 'Tempo Médio', field: 'avgDuration', type: 'number', visible: true, sortable: true, aggregate: 'avg' }
    ],
    exportFormats: ['pdf', 'csv'],
    schedule: {
      enabled: true,
      frequency: 'daily',
      time: '06:00',
      recipients: ['tech@empresa.com'],
      format: 'csv',
      includeCharts: false,
      timezone: 'America/Sao_Paulo'
    },
    createdAt: '2024-01-12T14:00:00Z',
    updatedAt: '2024-01-12T14:00:00Z',
    createdBy: 'user-2',
    tags: ['flows', 'automacao', 'performance'],
    isPublic: false
  },
  {
    id: '6',
    name: 'Relatório de Mensagens',
    description: 'Volume e padrões de mensagens trocadas',
    type: 'messages',
    status: 'ready',
    dataSource: {
      entity: 'messages',
      dateField: 'sentAt',
      period: 'today',
      filters: [],
      groupBy: ['type', 'status', 'direction'],
      orderBy: [{ field: 'sentAt', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'Horário', field: 'sentAt', type: 'date', visible: true, sortable: true },
      { id: '2', name: 'Contato', field: 'contactName', type: 'text', visible: true, sortable: true },
      { id: '3', name: 'Direção', field: 'direction', type: 'text', visible: true, sortable: true },
      { id: '4', name: 'Tipo', field: 'type', type: 'text', visible: true, sortable: true },
      { id: '5', name: 'Status', field: 'status', type: 'text', visible: true, sortable: true },
      { id: '6', name: 'Tamanho', field: 'length', type: 'number', visible: true, sortable: true }
    ],
    exportFormats: ['csv', 'json'],
    lastGenerated: '2024-01-15T17:00:00Z',
    lastGeneratedBy: 'user-1',
    generationTime: 1200,
    fileSize: 856000,
    downloadUrl: '/reports/6/download',
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T17:00:00Z',
    createdBy: 'user-1',
    tags: ['mensagens', 'diario', 'comunicacao'],
    isPublic: true
  },
  {
    id: '7',
    name: 'Dashboard Executivo',
    description: 'Visão geral para diretoria com KPIs principais',
    type: 'performance',
    status: 'ready',
    dataSource: {
      entity: 'multiple',
      dateField: 'date',
      period: 'month',
      filters: [],
      groupBy: ['department', 'metric'],
      orderBy: [{ field: 'value', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'KPI', field: 'metric', type: 'text', visible: true, sortable: true },
      { id: '2', name: 'Valor Atual', field: 'currentValue', type: 'number', visible: true, sortable: true },
      { id: '3', name: 'Meta', field: 'target', type: 'number', visible: true, sortable: true },
      { id: '4', name: 'Variação', field: 'variation', type: 'percentage', visible: true, sortable: true },
      { id: '5', name: 'Status', field: 'status', type: 'text', visible: true, sortable: true }
    ],
    charts: [
      {
        id: 'c7',
        type: 'scatter',
        title: 'Correlação de Métricas',
        dataSource: 'metrics',
        xAxis: 'efficiency',
        yAxis: 'satisfaction',
        showLegend: true,
        showGrid: true
      }
    ],
    exportFormats: ['pdf', 'html'],
    schedule: {
      enabled: true,
      frequency: 'monthly',
      dayOfMonth: 5,
      time: '09:00',
      recipients: ['ceo@empresa.com', 'cfo@empresa.com', 'cto@empresa.com'],
      format: 'pdf',
      includeCharts: true,
      timezone: 'America/Sao_Paulo'
    },
    lastGenerated: '2024-01-05T09:00:00Z',
    lastGeneratedBy: 'system',
    generationTime: 12000,
    fileSize: 4500000,
    downloadUrl: '/reports/7/download',
    createdAt: '2023-12-01T00:00:00Z',
    updatedAt: '2024-01-05T09:00:00Z',
    createdBy: 'user-1',
    tags: ['executivo', 'kpi', 'mensal', 'diretoria'],
    isPublic: false,
    sharedWith: ['user-5', 'user-6', 'user-7']
  },
  {
    id: '8',
    name: 'Relatório Personalizado - Vendas',
    description: 'Análise customizada do funil de vendas',
    type: 'custom',
    status: 'failed',
    dataSource: {
      entity: 'custom_query',
      dateField: 'date',
      period: 'custom',
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      filters: [
        { field: 'stage', operator: 'in', value: ['qualified', 'proposal', 'negotiation', 'closed'] },
        { field: 'value', operator: 'greater_than', value: 1000 }
      ],
      groupBy: ['salesperson', 'product', 'stage'],
      orderBy: [{ field: 'value', direction: 'desc' }]
    },
    columns: [
      { id: '1', name: 'Vendedor', field: 'salesperson', type: 'text', visible: true, sortable: true },
      { id: '2', name: 'Produto', field: 'product', type: 'text', visible: true, sortable: true },
      { id: '3', name: 'Etapa', field: 'stage', type: 'text', visible: true, sortable: true },
      { id: '4', name: 'Valor', field: 'value', type: 'currency', visible: true, sortable: true, aggregate: 'sum' },
      { id: '5', name: 'Probabilidade', field: 'probability', type: 'percentage', visible: true, sortable: true },
      { id: '6', name: 'Dias no Funil', field: 'daysInPipeline', type: 'number', visible: true, sortable: true, aggregate: 'avg' }
    ],
    exportFormats: ['excel', 'csv', 'json'],
    createdAt: '2024-01-15T11:00:00Z',
    updatedAt: '2024-01-15T11:30:00Z',
    createdBy: 'user-4',
    tags: ['vendas', 'funil', 'personalizado'],
    isPublic: false
  }
]