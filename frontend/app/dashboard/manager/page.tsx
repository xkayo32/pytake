'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthContext } from '@/contexts/auth-context'
import { useManagerMetrics, DateRange, ReportFilters } from '@/lib/hooks/useManagerMetrics'
import { MetricCard } from '@/components/charts/chart-container'
import { ConversationTrendsChart } from '@/components/charts/conversation-trends-chart'
import { SatisfactionTrendsChart } from '@/components/charts/satisfaction-trends-chart'
import { ResponseTimeChart } from '@/components/charts/response-time-chart'
import { AgentPerformanceChart } from '@/components/charts/agent-performance-chart'
import { FilterPanel } from '@/components/reports/filter-panel'
import { 
  Users, 
  MessageSquare, 
  Star, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Timer,
  UserCheck,
  BarChart3,
  Download,
  RefreshCw,
  Zap,
  Target,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function ManagerDashboardPage() {
  const { user } = useAuthContext()
  const [filters, setFilters] = useState<ReportFilters>({
    period: 'day',
    dateRange: {
      from: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000), // Last 7 days
      to: new Date()
    }
  })

  const {
    metrics,
    isLoading,
    error,
    refreshMetrics,
    exportData,
    activeAgentsPercentage,
    totalQueueWaiting,
    topPerformingAgent,
    slaBreaches,
    conversationGrowth
  } = useManagerMetrics({ 
    refreshInterval: 30000,
    dateRange: filters.dateRange 
  })

  const [selectedMetric, setSelectedMetric] = useState<'conversations' | 'satisfaction' | 'responseTime' | 'efficiency'>('conversations')
  const [isExporting, setIsExporting] = useState(false)

  // Mock data for available agents and queues for filters
  const availableAgents = useMemo(() => 
    metrics.agentPerformance.map(agent => ({ 
      id: agent.id, 
      name: agent.name 
    })), [metrics.agentPerformance]
  )

  const availableQueues = useMemo(() => 
    metrics.queueMetrics.map(queue => ({ 
      id: queue.id, 
      name: queue.name 
    })), [metrics.queueMetrics]
  )

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setIsExporting(true)
    try {
      await exportData(format, 'detailed')
    } finally {
      setIsExporting(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      online: 'bg-green-500',
      busy: 'bg-yellow-500',
      away: 'bg-orange-500',
      break: 'bg-blue-500',
      offline: 'bg-gray-400'
    }
    return colors[status as keyof typeof colors] || colors.offline
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      online: 'Online',
      busy: 'Ocupado',
      away: 'Ausente',
      break: 'Pausa',
      offline: 'Offline'
    }
    return labels[status as keyof typeof labels] || status
  }

  return (
    <AppLayout>
      <div className="flex-1 space-y-6 p-6">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Gerencial</h1>
            <p className="text-muted-foreground">
              Visão consolidada da performance da equipe de atendimento
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refreshMetrics} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleExport('excel')}
              disabled={isExporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Exportando...' : 'Exportar'}
            </Button>
          </div>
        </div>

        {/* Filters */}
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          availableAgents={availableAgents}
          availableQueues={availableQueues}
          isLoading={isLoading}
          onRefresh={refreshMetrics}
        />

        {/* Overview Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            title="Agentes Ativos"
            value={`${metrics.overview.activeAgents}/${metrics.overview.totalAgents}`}
            description={`${activeAgentsPercentage.toFixed(1)}% da equipe online`}
            change={activeAgentsPercentage >= 80 ? '+5% vs ontem' : '-2% vs ontem'}
            changeType={activeAgentsPercentage >= 80 ? 'positive' : 'negative'}
            icon={Users}
          />
          
          <MetricCard
            title="Conversas Hoje"
            value={metrics.overview.totalConversations}
            description="Total de atendimentos"
            change={conversationGrowth > 0 ? `+${conversationGrowth.toFixed(1)}%` : `${conversationGrowth.toFixed(1)}%`}
            changeType={conversationGrowth > 0 ? 'positive' : 'negative'}
            icon={MessageSquare}
          />
          
          <MetricCard
            title="Satisfação Média"
            value={`${metrics.overview.avgSatisfaction.toFixed(1)} ⭐`}
            description="Avaliação dos clientes"
            change={metrics.overview.avgSatisfaction >= 4.5 ? '+0.2 vs ontem' : '-0.1 vs ontem'}
            changeType={metrics.overview.avgSatisfaction >= 4.5 ? 'positive' : 'negative'}
            icon={Star}
          />
          
          <MetricCard
            title="SLA Compliance"
            value={`${metrics.overview.slaCompliance.toFixed(1)}%`}
            description="Meta: 90% em 90s"
            change={slaBreaches === 0 ? 'Sem violações' : `${slaBreaches} violações`}
            changeType={slaBreaches === 0 ? 'positive' : 'negative'}
            icon={Target}
          />
        </div>

        {/* Main Dashboard */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="agents">Agentes</TabsTrigger>
            <TabsTrigger value="queues">Filas</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <ConversationTrendsChart
                data={metrics.conversationTrends}
                isLoading={isLoading}
                error={error}
                onRefresh={refreshMetrics}
                onExport={() => handleExport('pdf')}
              />
              
              <SatisfactionTrendsChart
                data={metrics.satisfactionTrends}
                isLoading={isLoading}
                error={error}
                onRefresh={refreshMetrics}
                onExport={() => handleExport('pdf')}
              />
            </div>
            
            <ResponseTimeChart
              data={metrics.responseTimes}
              isLoading={isLoading}
              error={error}
              onRefresh={refreshMetrics}
              onExport={() => handleExport('pdf')}
            />
          </TabsContent>

          {/* Agents Tab */}
          <TabsContent value="agents" className="space-y-6">
            {/* Performance Chart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-medium">Performance Individual</h3>
                <div className="flex gap-2">
                  {(['conversations', 'satisfaction', 'responseTime', 'efficiency'] as const).map((metric) => (
                    <Button
                      key={metric}
                      variant={selectedMetric === metric ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedMetric(metric)}
                    >
                      {metric === 'conversations' && 'Conversas'}
                      {metric === 'satisfaction' && 'Satisfação'}
                      {metric === 'responseTime' && 'Tempo Resposta'}
                      {metric === 'efficiency' && 'Eficiência'}
                    </Button>
                  ))}
                </div>
              </div>
              
              <AgentPerformanceChart
                data={metrics.agentPerformance}
                metric={selectedMetric}
                isLoading={isLoading}
                error={error}
                onRefresh={refreshMetrics}
                onExport={() => handleExport('pdf')}
              />
            </div>

            {/* Agents List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  Lista de Agentes
                  {topPerformingAgent && (
                    <Badge variant="secondary" className="ml-auto">
                      Top: {topPerformingAgent.name}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Status atual e métricas de performance da equipe
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.agentPerformance.map((agent) => (
                    <div
                      key={agent.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={agent.avatar} />
                            <AvatarFallback>
                              {agent.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div
                            className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${getStatusColor(agent.status)}`}
                          />
                        </div>
                        <div>
                          <p className="font-medium">{agent.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getStatusLabel(agent.status)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-center">
                          <p className="font-medium">{agent.todayConversations}</p>
                          <p className="text-muted-foreground">Conversas</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{agent.avgResponseTime}s</p>
                          <p className="text-muted-foreground">Resp. Média</p>
                        </div>
                        <div className="text-center">
                          <p className="font-medium">{agent.satisfaction.toFixed(1)} ⭐</p>
                          <p className="text-muted-foreground">Satisfação</p>
                        </div>
                        <div className="text-center min-w-[80px]">
                          <Progress 
                            value={agent.slaCompliance} 
                            className="w-16 h-2" 
                          />
                          <p className="text-muted-foreground">SLA</p>
                        </div>
                        {agent.activeConversations > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {agent.activeConversations} ativa{agent.activeConversations !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Queues Tab */}
          <TabsContent value="queues" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {metrics.queueMetrics.map((queue) => (
                <Card key={queue.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center justify-between">
                      {queue.name}
                      {queue.slaBreaches > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {queue.slaBreaches} SLA
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Na fila:</span>
                      <span className="font-medium">{queue.waiting}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Tempo médio:</span>
                      <span className="font-medium">{queue.avgWaitTime.toFixed(1)}min</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Agentes:</span>
                      <span className="font-medium">{queue.agents}</span>
                    </div>
                    {queue.waiting > 5 && (
                      <div className="flex items-center gap-1 text-amber-600 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Fila alta
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {totalQueueWaiting > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Timer className="h-5 w-5" />
                    Resumo das Filas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-2xl font-bold text-amber-600">
                      {totalQueueWaiting}
                    </p>
                    <p className="text-muted-foreground">
                      clientes aguardando atendimento
                    </p>
                    {slaBreaches > 0 && (
                      <Badge variant="destructive" className="mt-2">
                        {slaBreaches} violações de SLA
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Principais Categorias de Problemas
                </CardTitle>
                <CardDescription>
                  Análise dos tipos mais comuns de solicitações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {metrics.topIssues.map((issue, index) => (
                    <div
                      key={issue.category}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-medium">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{issue.category}</p>
                          <p className="text-sm text-muted-foreground">
                            Tempo médio: {issue.avgResolutionTime.toFixed(1)} min
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{issue.count} casos</span>
                        <div className="flex items-center">
                          {issue.trend === 'up' ? (
                            <TrendingUp className="h-4 w-4 text-red-500" />
                          ) : issue.trend === 'down' ? (
                            <TrendingDown className="h-4 w-4 text-green-500" />
                          ) : (
                            <Activity className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}