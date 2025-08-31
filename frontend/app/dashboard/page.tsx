'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Activity,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  UserPlus
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthContext } from '@/contexts/auth-context'
import { useDashboard } from '@/lib/hooks/useDashboard'
import { useSentimentAnalysis } from '@/lib/hooks/useSentimentAnalysis'
import { useSuggestions } from '@/lib/hooks/useSuggestions'
import { useIntentClassification } from '@/lib/hooks/useIntentClassification'
import { AIInsightsDashboard } from '@/components/ai/ai-insights-dashboard'
import { BackupStatusWidget } from '@/components/dashboard/backup-status-widget'
import { AuditWidget } from '@/components/dashboard/audit-widget'
import { SystemStatusWidget } from '@/components/dashboard/system-status-widget'
import { OnboardingWidget } from '@/components/dashboard/onboarding-widget'
import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts'

// Fallback data for when API is loading or fails
const fallbackConversationData = [
  { date: 'Dom', total: 245, resolvidas: 210, pendentes: 35 },
  { date: 'Seg', total: 312, resolvidas: 285, pendentes: 27 },
  { date: 'Ter', total: 428, resolvidas: 390, pendentes: 38 },
  { date: 'Qua', total: 385, resolvidas: 350, pendentes: 35 },
  { date: 'Qui', total: 510, resolvidas: 470, pendentes: 40 },
  { date: 'Sex', total: 468, resolvidas: 425, pendentes: 43 },
  { date: 'Sáb', total: 289, resolvidas: 260, pendentes: 29 },
]

const fallbackMessageVolumeData = [
  { hora: '00h', enviadas: 45, recebidas: 38 },
  { hora: '04h', enviadas: 22, recebidas: 18 },
  { hora: '08h', enviadas: 178, recebidas: 165 },
  { hora: '12h', enviadas: 285, recebidas: 270 },
  { hora: '16h', enviadas: 320, recebidas: 298 },
  { hora: '20h', enviadas: 195, recebidas: 180 },
]

const fallbackFlowPerformanceData = [
  { name: 'Boas-vindas', value: 1250, color: '#25D366' },
  { name: 'Suporte', value: 890, color: '#128C7E' },
  { name: 'Vendas', value: 670, color: '#075E54' },
  { name: 'Pós-venda', value: 430, color: '#34B7F1' },
  { name: 'Outros', value: 180, color: '#00A884' },
]

const fallbackResponseTimeData = [
  { range: '< 1min', count: 450 },
  { range: '1-5min', count: 280 },
  { range: '5-15min', count: 150 },
  { range: '15-30min', count: 80 },
  { range: '> 30min', count: 40 },
]

// Helper function to format wait time
function formatWaitTime(seconds: number | null | undefined): string {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0s'
  
  if (seconds < 60) return `${Math.round(seconds)}s`
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
}

// Mock conversation data for AI analysis
const mockMessages = [
  { id: '1', content: 'Olá, preciso de ajuda urgente com meu pedido!', sender: 'customer' as const, timestamp: new Date() },
  { id: '2', content: 'Claro! Posso ajudar. Qual é o número do seu pedido?', sender: 'agent' as const, timestamp: new Date() },
  { id: '3', content: 'É o pedido #12345. Já faz uma semana que está em processamento.', sender: 'customer' as const, timestamp: new Date() },
]

const mockConversation = {
  id: 'conv-1',
  customerId: 'customer-1',
  messages: mockMessages,
  customer: { id: 'customer-1', name: 'João Silva', phone: '+5511999999999' },
  agent: { id: 'agent-1', name: 'Maria' },
  status: 'active' as const,
  tags: [],
  createdAt: new Date(),
  updatedAt: new Date()
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuthContext()
  const { 
    stats, 
    conversationVolume, 
    messageVolume, 
    flowPerformance, 
    responseTimes,
    isLoading: dashboardLoading, 
    error,
    lastUpdated,
    refresh 
  } = useDashboard()
  
  // AI hooks for dashboard insights
  const sentimentAnalysis = useSentimentAnalysis(mockMessages)
  const suggestions = useSuggestions(mockConversation)
  const intentClassification = useIntentClassification(mockMessages)
  
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [authLoading, isAuthenticated, router])

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return null
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-foreground-secondary mt-1">
              {dashboardLoading ? 'Carregando dados...' : 
               error ? 'Erro ao carregar dados' :
               lastUpdated ? `Última atualização: ${lastUpdated.toLocaleTimeString('pt-BR')}` :
               'Visão geral do sistema'
              }
            </p>
          </div>
          {error && (
            <button
              onClick={refresh}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              Tentar novamente
            </button>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Conversas Ativas"
            value={dashboardLoading ? "..." : (stats?.active_conversations?.toString() || "0")}
            change={12.5}
            icon={<MessageSquare className="h-5 w-5" />}
            trend="up"
          />
          <MetricCard
            title="Taxa de Resolução"
            value={dashboardLoading ? "..." : 
              stats ? `${Math.round((stats.today_completed / Math.max(stats.today_total, 1)) * 100)}%` : "0%"
            }
            change={2.4}
            icon={<CheckCircle className="h-5 w-5" />}
            trend="up"
          />
          <MetricCard
            title="Tempo Médio"
            value={dashboardLoading ? "..." : 
              stats ? formatWaitTime(stats.avg_wait_time_today) : "0s"
            }
            change={-8.3}
            icon={<Clock className="h-5 w-5" />}
            trend="down"
            positive={true}
          />
          <MetricCard
            title="Total Hoje"
            value={dashboardLoading ? "..." : (stats?.today_total?.toString() || "0")}
            change={18.2}
            icon={<UserPlus className="h-5 w-5" />}
            trend="up"
          />
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Conversation Volume Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Volume de Conversas</CardTitle>
              <CardDescription>
                Conversas totais, resolvidas e pendentes nos últimos 7 dias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={conversationVolume.length > 0 ? conversationVolume : fallbackConversationData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#25D366" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#25D366" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorResolvidas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#128C7E" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#128C7E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#25D366" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="resolvidas" 
                    stroke="#128C7E" 
                    fillOpacity={1} 
                    fill="url(#colorResolvidas)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Message Volume by Hour */}
          <Card>
            <CardHeader>
              <CardTitle>Mensagens por Horário</CardTitle>
              <CardDescription>
                Volume de mensagens enviadas e recebidas por período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={messageVolume.length > 0 ? messageVolume : fallbackMessageVolumeData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hora" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="enviadas" fill="#25D366" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="recebidas" fill="#128C7E" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Flow Performance Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Performance dos Fluxos</CardTitle>
              <CardDescription>
                Distribuição de conversas por fluxo automatizado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={flowPerformance.length > 0 ? flowPerformance : fallbackFlowPerformanceData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {(flowPerformance.length > 0 ? flowPerformance : fallbackFlowPerformanceData).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Response Time Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Tempo de Resposta</CardTitle>
              <CardDescription>
                Distribuição de tempo de primeira resposta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={responseTimes.length > 0 ? responseTimes : fallbackResponseTimeData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="range" type="category" className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#25D366" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* AI Insights Section */}
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Insights de IA</h2>
              <p className="text-foreground-secondary">
                Análise inteligente de conversas e sugestões em tempo real
              </p>
            </div>
          </div>
          
          <AIInsightsDashboard 
            sentiment={{
              current: sentimentAnalysis.currentSentiment,
              trend: sentimentAnalysis.sentimentTrend,
              average: sentimentAnalysis.averageSentiment,
              needsAttention: sentimentAnalysis.needsImmediateAttention
            }}
            suggestions={{
              total: suggestions.suggestions.length,
              top: suggestions.topSuggestion,
              averageConfidence: suggestions.averageConfidence,
              categories: suggestions.suggestionCategories
            }}
            intents={{
              current: intentClassification.currentIntent,
              confidence: intentClassification.recentConfidence,
              recent: intentClassification.intentHistory.slice(0, 5)
            }}
            stats={{
              totalAnalyses: sentimentAnalysis.totalAnalyses,
              activeConversations: stats?.active_conversations || 0,
              avgResponseTime: stats?.avg_wait_time_today || 0,
              satisfactionScore: sentimentAnalysis.averageSentiment
            }}
          />
        </div>

        {/* Additional Stats */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Active Flows */}
          <Card>
            <CardHeader>
              <CardTitle>Fluxos Ativos</CardTitle>
              <CardDescription>Taxa de conclusão hoje</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <FlowStat name="Boas-vindas" value={98} color="bg-green-500" />
                <FlowStat name="Suporte Técnico" value={85} color="bg-blue-500" />
                <FlowStat name="Vendas" value={92} color="bg-purple-500" />
                <FlowStat name="Pós-venda" value={78} color="bg-orange-500" />
                <FlowStat name="Reengajamento" value={65} color="bg-pink-500" />
              </div>
            </CardContent>
          </Card>

          {/* Backup Status Widget */}
          <BackupStatusWidget />

          {/* System Health */}
          <Card>
            <CardHeader>
              <CardTitle>Saúde do Sistema</CardTitle>
              <CardDescription>Status dos serviços</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <SystemStatus service="WhatsApp API" status="online" />
                <SystemStatus service="Database" status="online" />
                <SystemStatus service="Redis Cache" status="online" />
                <SystemStatus service="WebSocket" status="online" />
                <SystemStatus service="Evolution API" status="warning" />
                <SystemStatus service="Webhooks" status="online" />
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Atividade Recente</CardTitle>
              <CardDescription>Últimos eventos do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <ActivityItem 
                  icon={<Send className="h-4 w-4" />}
                  text="Campanha 'Black Friday' enviada"
                  time="2 min"
                />
                <ActivityItem 
                  icon={<UserPlus className="h-4 w-4" />}
                  text="128 novos contatos importados"
                  time="15 min"
                />
                <ActivityItem 
                  icon={<CheckCircle className="h-4 w-4" />}
                  text="Fluxo 'Suporte' atualizado"
                  time="1h"
                />
                <ActivityItem 
                  icon={<AlertCircle className="h-4 w-4" />}
                  text="Limite de API atingindo 80%"
                  time="2h"
                />
                <ActivityItem 
                  icon={<Activity className="h-4 w-4" />}
                  text="Backup automático concluído"
                  time="3h"
                />
              </div>
            </CardContent>
          </Card>

          {/* Audit Widget */}
          <AuditWidget />
          
          {/* System Status Widget */}
          <SystemStatusWidget />
          
          {/* Onboarding Widget */}
          <OnboardingWidget />
        </div>
      </div>
    </AppLayout>
  )
}

// Component helpers
function MetricCard({ 
  title, 
  value, 
  change, 
  icon, 
  trend, 
  positive = trend === 'up' 
}: {
  title: string
  value: string
  change: number
  icon: React.ReactNode
  trend: 'up' | 'down'
  positive?: boolean
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-primary/10 rounded-lg text-primary">
            {icon}
          </div>
          <div className={`flex items-center gap-1 text-sm font-medium ${
            positive ? 'text-green-600' : 'text-red-600'
          }`}>
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {Math.abs(change)}%
          </div>
        </div>
        <h3 className="text-2xl font-bold">{value}</h3>
        <p className="text-sm text-foreground-secondary mt-1">{title}</p>
      </CardContent>
    </Card>
  )
}

function FlowStat({ name, value, color }: { name: string; value: number; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span>{name}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div 
          className={`h-full ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function SystemStatus({ service, status }: { service: string; status: 'online' | 'offline' | 'warning' }) {
  const statusConfig = {
    online: { color: 'bg-green-500', text: 'Online' },
    offline: { color: 'bg-red-500', text: 'Offline' },
    warning: { color: 'bg-yellow-500', text: 'Atenção' },
  }

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{service}</span>
      <div className="flex items-center gap-2">
        <div className={`h-2 w-2 rounded-full ${statusConfig[status].color}`} />
        <span className="text-xs text-foreground-secondary">{statusConfig[status].text}</span>
      </div>
    </div>
  )
}

function ActivityItem({ icon, text, time }: { icon: React.ReactNode; text: string; time: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-1.5 bg-surface rounded text-foreground-secondary">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm">{text}</p>
        <p className="text-xs text-foreground-tertiary">{time} atrás</p>
      </div>
    </div>
  )
}