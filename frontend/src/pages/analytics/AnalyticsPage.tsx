import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from 'recharts'
import { 
  TrendingUp, TrendingDown, Users, MessageSquare, 
  Clock, Star, BarChart3, Activity, Calendar,
  Download, Filter, ChevronUp, ChevronDown
} from 'lucide-react'
import { PageHeader, PageSection } from '@/components/ui/page-header'
import { StatsCard } from '@/components/ui/stats-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/Badge'
import { DataTable } from '@/components/ui/data-table'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Chart colors
const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6']

// Interfaces for metrics data
interface MessagingMetrics {
  total_messages: number
  inbound_messages: number
  outbound_messages: number
  delivery_rate: number
  active_conversations: number
}

interface SystemMetrics {
  api_requests_per_minute: number
  average_response_time_ms: number
  error_rate: number
  active_websocket_connections: number
}

interface BusinessMetrics {
  daily_active_users: number
  monthly_active_users: number
  message_volume_growth: number
  user_retention_rate: number
}

interface DashboardMetrics {
  messaging: MessagingMetrics
  system: SystemMetrics
  business: BusinessMetrics
  generated_at: string
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [realTimeMetrics, setRealTimeMetrics] = useState({
    activeConversations: 0,
    queueSize: 0,
    onlineAgents: 0,
    avgWaitTime: '0s'
  })
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  
  // Fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const token = localStorage.getItem('token')
        
        // Fetch dashboard metrics for analytics
        const response = await fetch('/api/v1/dashboard/admin', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setMetrics({
            messaging: {
              total_messages: data.stats.total_messages,
              inbound_messages: Math.round(data.stats.total_messages * 0.6),
              outbound_messages: Math.round(data.stats.total_messages * 0.4),
              delivery_rate: 1.0, // TODO: Get from backend API
              active_conversations: data.stats.active_conversations
            },
            system: {
              api_requests_per_minute: Math.max(data.stats.api_requests_today / (24 * 60), 0),
              average_response_time_ms: data.stats.avg_response_time * 1000,
              error_rate: 0.0, // TODO: Get from backend API
              active_websocket_connections: data.stats.active_users
            },
            business: {
              daily_active_users: data.stats.active_users,
              monthly_active_users: data.stats.total_users,
              message_volume_growth: 0.0, // TODO: Get from backend API
              user_retention_rate: 0.0 // TODO: Get from backend API
            },
            generated_at: new Date().toISOString()
          })
          
          // Set real-time metrics
          setRealTimeMetrics({
            activeConversations: data.stats.active_conversations,
            queueSize: 0, // TODO: Get from backend API
            onlineAgents: data.stats.active_users,
            avgWaitTime: '0m 0s' // TODO: Get from backend API
          })
        }
      } catch (error) {
        console.error('Error fetching analytics data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalyticsData()
  }, [])
  
  // Update real-time metrics every 30 seconds
  useEffect(() => {
    if (!metrics) return
    
    const interval = setInterval(async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/v1/dashboard/admin', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setRealTimeMetrics({
            activeConversations: data.stats.active_conversations,
            queueSize: 0, // TODO: Get from backend API
            onlineAgents: data.stats.active_users,
            avgWaitTime: '0m 0s' // TODO: Get from backend API
          })
        }
      } catch (error) {
        console.error('Error updating real-time metrics:', error)
      }
    }, 30000)
    
    return () => clearInterval(interval)
  }, [metrics])

  // Chart data - will be loaded from API
  const [chartData, setChartData] = useState({
    messageVolume: Array.from({ length: 7 }, (_, i) => ({
      date: new Date(Date.now() - (6 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      received: 0,
      sent: 0
    })),
    channelDistribution: [
      { name: 'WhatsApp', count: 0, percentage: 0 },
      { name: 'Telegram', count: 0, percentage: 0 },
      { name: 'Instagram', count: 0, percentage: 0 }
    ],
    peakHours: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      count: 0
    })),
    agentPerformance: [],
    tagDistribution: []
  })

  const conversationTrend = 12.5 // TODO: Get from metrics API
  const responseTrend = -8.3 // TODO: Get from metrics API  
  const satisfactionTrend = 4.2 // TODO: Get from metrics API

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Analytics"
        description="Métricas e insights detalhados do seu atendimento"
        icon={BarChart3}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </Button>
            <Button size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        }
      />

      {/* Real-time Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-primary/5 rounded-xl border border-primary/20"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Métricas em Tempo Real</h3>
            <Badge variant="secondary" className="animate-pulse">
              AO VIVO
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            Atualizado {format(new Date(), 'HH:mm:ss', { locale: ptBR })}
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Conversas Ativas</p>
            <p className="text-2xl font-bold text-foreground">{realTimeMetrics.activeConversations}</p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Na Fila</p>
            <p className="text-2xl font-bold text-foreground">{realTimeMetrics.queueSize}</p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Agentes Online</p>
            <p className="text-2xl font-bold text-foreground">{realTimeMetrics.onlineAgents}</p>
          </div>
          <div className="bg-card rounded-lg p-4 border border-border/50">
            <p className="text-sm text-muted-foreground">Tempo de Espera</p>
            <p className="text-2xl font-bold text-foreground">{realTimeMetrics.avgWaitTime}</p>
          </div>
        </div>
      </motion.div>

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Total de Conversas"
          value={loading ? '...' : (metrics?.messaging.active_conversations.toLocaleString('pt-BR') || '0')}
          change={conversationTrend}
          changeLabel="vs. mês anterior"
          icon={MessageSquare}
          trend={conversationTrend > 0 ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Taxa de Resolução"
          value={loading ? '...' : '89.2%'}
          change={8.2}
          changeLabel="vs. mês anterior"
          icon={TrendingUp}
          trend="up"
        />
        
        <StatsCard
          title="Tempo de Resposta"
          value={loading ? '...' : '2m 15s'}
          change={Math.abs(responseTrend)}
          changeLabel="mais rápido"
          icon={Clock}
          trend={responseTrend < 0 ? 'up' : 'down'}
        />
        
        <StatsCard
          title="Satisfação"
          value={loading ? '...' : '4.7'}
          change={satisfactionTrend}
          changeLabel="156 avaliações"
          icon={Star}
          trend={satisfactionTrend > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Message Volume Chart */}
        <PageSection
          title="Volume de Mensagens"
          description="Mensagens enviadas e recebidas nos últimos 7 dias"
          className="bg-card rounded-xl border border-border/50 p-6"
        >
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData.messageVolume}>
              <defs>
                <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/20" />
              <XAxis dataKey="date" className="text-muted-foreground" />
              <YAxis className="text-muted-foreground" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: 'none',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Area 
                type="monotone" 
                dataKey="received" 
                stroke="#10b981" 
                fillOpacity={1} 
                fill="url(#colorReceived)" 
                name="Recebidas"
              />
              <Area 
                type="monotone" 
                dataKey="sent" 
                stroke="#3b82f6" 
                fillOpacity={1} 
                fill="url(#colorSent)" 
                name="Enviadas"
              />
              <Legend />
            </AreaChart>
          </ResponsiveContainer>
        </PageSection>

        {/* Channel Distribution */}
        <PageSection
          title="Distribuição por Canal"
          description="Origem das conversas por plataforma"
          className="bg-card rounded-xl border border-border/50 p-6"
        >
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData.channelDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percentage }) => `${percentage.toFixed(1)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="count"
              >
                {chartData.channelDistribution.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                  border: 'none',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: '#fff' }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </PageSection>
      </div>

      {/* Peak Hours Chart */}
      <PageSection
        title="Horários de Pico"
        description="Distribuição de conversas por hora do dia"
        className="bg-card rounded-xl border border-border/50 p-6"
      >
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData.peakHours}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
            <XAxis 
              dataKey="hour" 
              stroke="#6b7280"
              tickFormatter={(hour) => `${hour}h`}
            />
            <YAxis stroke="#6b7280" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.8)', 
                border: 'none',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#fff' }}
              labelFormatter={(hour) => `${hour}:00`}
            />
            <Bar 
              dataKey="count" 
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
              name="Conversas"
            />
          </BarChart>
        </ResponsiveContainer>
      </PageSection>

      {/* Agent Performance Table */}
      <PageSection
        title="Performance dos Agentes"
        description="Métricas individuais de atendimento"
        className="bg-card rounded-xl border border-border/50 p-6"
      >
        <DataTable
          columns={[
            { 
              header: 'Agente', 
              accessor: 'agent',
              sortable: true
            },
            { 
              header: 'Conversas', 
              accessor: 'conversations',
              sortable: true
            },
            { 
              header: 'Resolvidas', 
              accessor: (item) => (
                <div className="flex items-center gap-2">
                  <span>{item.resolved}</span>
                  <span className="text-xs text-muted-foreground">
                    ({((item.resolved / item.conversations) * 100).toFixed(0)}%)
                  </span>
                </div>
              )
            },
            { 
              header: 'Tempo de Resposta', 
              accessor: 'avgResponseTime',
              sortable: true
            },
            { 
              header: 'Satisfação', 
              accessor: (item) => (
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  <span>{item.satisfaction.toFixed(1)}</span>
                </div>
              )
            }
          ]}
          data={chartData.agentPerformance.map((agent, index) => ({
            ...agent,
            id: `agent-${index}`
          }))}
        />
      </PageSection>

      {/* Tags Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PageSection
          title="Distribuição de Tags"
          description="Categorias mais frequentes"
          className="bg-card rounded-xl border border-border/50 p-6"
        >
          <div className="space-y-3">
            {chartData.tagDistribution.map((tag, index) => {
              const maxCount = Math.max(...chartData.tagDistribution.map(t => t.count), 1)
              const percentage = (tag.count / maxCount) * 100
              
              return (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground font-medium">{tag.tag}</span>
                    <span className="text-muted-foreground">{tag.count}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="bg-primary h-2 rounded-full"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </PageSection>

        {/* Monthly Comparison */}
        <PageSection
          title="Comparação Mensal"
          description="Evolução mês a mês"
          className="bg-card rounded-xl border border-border/50 p-6"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Agosto 2024</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? '...' : (metrics?.messaging.active_conversations.toLocaleString('pt-BR') || '0')}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="default" className="bg-green-500">
                  <ChevronUp className="h-3 w-3 mr-1" />
                  +12.1%
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    89.2%
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    +2.3%
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Tempo de Resposta</p>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">
                    2m 15s
                  </span>
                  <Badge variant="outline" className="text-xs">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    -19s
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </PageSection>
      </div>
    </div>
  )
}