import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Users, 
  MessageSquare,
  Clock,
  Target,
  Calendar,
  Filter,
  Download,
  Eye,
  Activity,
  PieChart,
  LineChart
} from 'lucide-react'
import { motion } from 'framer-motion'

interface AnalyticsData {
  totalConversations: number
  totalMessages: number
  activeUsers: number
  avgResponseTime: string
  satisfactionScore: number
  conversationGrowth: number
  messageGrowth: number
  peakHours: string
  topPlatform: string
}

interface MetricCard {
  title: string
  value: string | number
  change: number
  changeType: 'increase' | 'decrease' | 'neutral'
  icon: React.ComponentType<{ className?: string }>
  color: string
}

interface ChartData {
  period: string
  conversations: number
  messages: number
  satisfaction: number
}

export default function ViewerDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({
    totalConversations: 2847,
    totalMessages: 18952,
    activeUsers: 156,
    avgResponseTime: '1m 45s',
    satisfactionScore: 94,
    conversationGrowth: 12.5,
    messageGrowth: 18.3,
    peakHours: '14:00 - 16:00',
    topPlatform: 'WhatsApp'
  })

  const [timeFilter, setTimeFilter] = useState('7d')
  
  const [chartData] = useState<ChartData[]>([
    { period: 'Segunda', conversations: 145, messages: 890, satisfaction: 92 },
    { period: 'Terça', conversations: 162, messages: 1200, satisfaction: 94 },
    { period: 'Quarta', conversations: 178, messages: 1450, satisfaction: 96 },
    { period: 'Quinta', conversations: 189, messages: 1380, satisfaction: 93 },
    { period: 'Sexta', conversations: 201, messages: 1600, satisfaction: 95 },
    { period: 'Sábado', conversations: 123, messages: 720, satisfaction: 91 },
    { period: 'Domingo', conversations: 98, messages: 580, satisfaction: 89 }
  ])

  const metricCards: MetricCard[] = [
    {
      title: 'Total de Conversas',
      value: analyticsData.totalConversations.toLocaleString(),
      change: analyticsData.conversationGrowth,
      changeType: 'increase',
      icon: MessageSquare,
      color: 'bg-blue-100 text-blue-600'
    },
    {
      title: 'Total de Mensagens',
      value: analyticsData.totalMessages.toLocaleString(),
      change: analyticsData.messageGrowth,
      changeType: 'increase',
      icon: BarChart3,
      color: 'bg-green-100 text-green-600'
    },
    {
      title: 'Usuários Ativos',
      value: analyticsData.activeUsers,
      change: 8.2,
      changeType: 'increase',
      icon: Users,
      color: 'bg-purple-100 text-purple-600'
    },
    {
      title: 'Tempo Médio',
      value: analyticsData.avgResponseTime,
      change: -5.3,
      changeType: 'decrease',
      icon: Clock,
      color: 'bg-yellow-100 text-yellow-600'
    },
    {
      title: 'Satisfação',
      value: `${analyticsData.satisfactionScore}%`,
      change: 2.1,
      changeType: 'increase',
      icon: Target,
      color: 'bg-green-100 text-green-600'
    }
  ]

  const getChangeIcon = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return <TrendingUp className="h-3 w-3 text-green-500" />
      case 'decrease':
        return <TrendingDown className="h-3 w-3 text-green-500" />
      default:
        return <Activity className="h-3 w-3 text-gray-500" />
    }
  }

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase':
        return 'text-green-600'
      case 'decrease':
        return 'text-green-600' // Decrease in response time is good
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics e Relatórios</h1>
          <p className="text-muted-foreground">Visualize insights e métricas do sistema</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select 
              value={timeFilter} 
              onChange={(e) => setTimeFilter(e.target.value)}
              className="px-3 py-1.5 border border-border rounded-md text-sm bg-background"
            >
              <option value="24h">Últimas 24h</option>
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
            </select>
          </div>
          
          <Button variant="outline" className="gap-2">
            <Download size={16} />
            Exportar
          </Button>
        </div>
      </motion.div>

      {/* Metrics Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        {metricCards.map((metric, index) => (
          <div key={index} className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{metric.title}</p>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                <div className="flex items-center gap-1 mt-1">
                  {getChangeIcon(metric.changeType)}
                  <span className={`text-xs font-medium ${getChangeColor(metric.changeType)}`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
              </div>
              <div className={`p-2 rounded-lg ${metric.color}`}>
                <metric.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations Chart */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <LineChart className="h-5 w-5 text-blue-500" />
              Conversas por Dia
            </h3>
            <Badge variant="outline">Últimos 7 dias</Badge>
          </div>
          
          {/* Simplified chart representation */}
          <div className="space-y-4">
            {chartData.map((data, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">{data.period}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 w-32">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(data.conversations / 220) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{data.conversations}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total: {chartData.reduce((acc, curr) => acc + curr.conversations, 0)} conversas
            </div>
            <Link to="/app/analytics/conversations">
              <Button variant="outline" size="sm">Ver Detalhes</Button>
            </Link>
          </div>
        </motion.div>

        {/* Messages Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-green-500" />
              Mensagens por Dia
            </h3>
            <Badge variant="outline">Últimos 7 dias</Badge>
          </div>
          
          {/* Simplified chart representation */}
          <div className="space-y-4">
            {chartData.map((data, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium w-16">{data.period}</span>
                  <div className="flex-1 bg-muted rounded-full h-2 w-32">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(data.messages / 1600) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm font-medium text-muted-foreground">{data.messages}</span>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Total: {chartData.reduce((acc, curr) => acc + curr.messages, 0).toLocaleString()} mensagens
            </div>
            <Link to="/app/analytics/messages">
              <Button variant="outline" size="sm">Ver Detalhes</Button>
            </Link>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Satisfaction Trends */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-purple-500" />
            Satisfação do Cliente
          </h3>
          
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">{analyticsData.satisfactionScore}%</div>
              <div className="text-sm text-muted-foreground">Média geral</div>
            </div>
            
            <div className="space-y-3">
              {chartData.slice(0, 5).map((data, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm">{data.period}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 bg-muted rounded-full h-1.5">
                      <div 
                        className="bg-purple-500 h-1.5 rounded-full"
                        style={{ width: `${data.satisfaction}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-8">{data.satisfaction}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Platform Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-orange-500" />
            Distribuição por Plataforma
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm">WhatsApp</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-4/5" />
                  </div>
                  <span className="text-sm font-medium w-8">78%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Telegram</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-1/5" />
                  </div>
                  <span className="text-sm font-medium w-8">15%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Instagram</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full w-1/12" />
                  </div>
                  <span className="text-sm font-medium w-8">7%</span>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-border/50">
              <div className="text-sm text-muted-foreground">
                Plataforma principal: <strong>{analyticsData.topPlatform}</strong>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Key Insights */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-indigo-500" />
            Insights Principais
          </h3>
          
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Horário de Pico</span>
              </div>
              <p className="text-sm text-muted-foreground">{analyticsData.peakHours}</p>
            </div>
            
            <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Crescimento</span>
              </div>
              <p className="text-sm text-muted-foreground">
                +{analyticsData.conversationGrowth}% conversas este mês
              </p>
            </div>
            
            <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-purple-600" />
                <span className="text-sm font-medium">Performance</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Satisfação acima da meta (90%)
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Available Reports */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 p-6 rounded-lg border border-border/50"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">📊 Relatórios Disponíveis</h3>
          <Badge variant="outline">Somente leitura</Badge>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <h4 className="font-medium mb-2">Relatório de Conversas</h4>
            <p className="text-sm text-muted-foreground mb-3">Análise detalhada de todas as conversas</p>
            <Button variant="outline" size="sm" className="w-full">
              Visualizar
            </Button>
          </div>
          
          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <h4 className="font-medium mb-2">Performance de Agentes</h4>
            <p className="text-sm text-muted-foreground mb-3">Métricas individuais da equipe</p>
            <Button variant="outline" size="sm" className="w-full">
              Visualizar
            </Button>
          </div>
          
          <div className="p-4 bg-white/50 dark:bg-gray-800/50 rounded-lg">
            <h4 className="font-medium mb-2">Análise de Satisfação</h4>
            <p className="text-sm text-muted-foreground mb-3">Feedback e avaliações dos clientes</p>
            <Button variant="outline" size="sm" className="w-full">
              Visualizar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}