import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Target,
  Award,
  ArrowUp,
  ArrowDown,
  Activity,
  UserCheck,
  UserX
} from 'lucide-react'
import { motion } from 'framer-motion'

interface TeamStats {
  totalAgents: number
  activeAgents: number
  offlineAgents: number
  totalConversations: number
  pendingConversations: number
  avgResponseTime: string
  teamSatisfaction: number
  todayMessages: number
  resolvedToday: number
}

interface AgentPerformance {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'busy' | 'away' | 'offline'
  activeConversations: number
  todayMessages: number
  avgResponseTime: string
  satisfaction: number
  lastActivity: string
}

export default function SupervisorDashboard() {
  const [teamStats, setTeamStats] = useState<TeamStats>({
    totalAgents: 0,
    activeAgents: 0,
    offlineAgents: 0,
    totalConversations: 0,
    pendingConversations: 0,
    avgResponseTime: '...',
    teamSatisfaction: 0,
    todayMessages: 0,
    resolvedToday: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [teamPerformance, setTeamPerformance] = useState<AgentPerformance[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/v1/dashboard/supervisor', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setTeamStats({
            totalAgents: data.team_stats.total_agents,
            activeAgents: data.team_stats.active_agents,
            offlineAgents: data.team_stats.total_agents - data.team_stats.active_agents,
            totalConversations: data.team_stats.total_team_conversations,
            pendingConversations: data.conversation_metrics.pending,
            avgResponseTime: `${data.team_stats.team_response_time}m`,
            teamSatisfaction: Math.round(data.team_stats.team_satisfaction * 100),
            todayMessages: data.conversation_metrics.total_today,
            resolvedToday: data.conversation_metrics.resolved_today
          })
          
          // Map agent performance data
          const mappedAgents = data.agent_performance.map((agent: any) => ({
            id: agent.agent_id,
            name: agent.agent_name,
            status: agent.status,
            activeConversations: agent.conversations_handled,
            todayMessages: agent.conversations_handled,
            avgResponseTime: `${agent.avg_response_time}m`,
            satisfaction: Math.round(agent.satisfaction_score * 100),
            lastActivity: new Date(agent.last_activity).toLocaleString('pt-BR')
          }))
          setTeamPerformance(mappedAgents)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'busy':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'away':
        return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'offline':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <UserCheck className="h-3 w-3" />
      case 'busy':
        return <Activity className="h-3 w-3" />
      case 'away':
        return <Clock className="h-3 w-3" />
      case 'offline':
        return <UserX className="h-3 w-3" />
      default:
        return <UserX className="h-3 w-3" />
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
          <h1 className="text-3xl font-bold text-foreground">Dashboard da Equipe</h1>
          <p className="text-muted-foreground">Monitore a performance e atividade da sua equipe</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link to="/app/team">
            <Button variant="outline" className="gap-2">
              <Users size={16} />
              Gerenciar Equipe
            </Button>
          </Link>
          <Link to="/app/analytics">
            <Button className="gap-2">
              <TrendingUp size={16} />
              Ver Relatórios
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Team Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4"
      >
        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Agentes Online</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : `${teamStats.activeAgents}/${teamStats.totalAgents}`}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Conversas</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : teamStats.totalConversations}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tempo Médio</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : teamStats.avgResponseTime}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? '...' : teamStats.pendingConversations}
              </p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Satisfação</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : `${teamStats.teamSatisfaction}%`}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Performance */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 bg-card p-6 rounded-lg border border-border/50"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Award className="h-5 w-5 text-blue-500" />
              Performance da Equipe
            </h3>
            <Badge variant="outline">{teamPerformance.length} agentes</Badge>
          </div>
          
          <div className="space-y-3">
            {teamPerformance.map((agent) => (
              <div key={agent.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-primary">
                      {agent.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{agent.name}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getStatusColor(agent.status)} flex items-center gap-1`}>
                        {getStatusIcon(agent.status)}
                        {agent.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">Último: {agent.lastActivity}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Conversas</p>
                    <p className="font-medium">{agent.activeConversations}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Mensagens</p>
                    <p className="font-medium">{agent.todayMessages}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Tempo</p>
                    <p className="font-medium">{agent.avgResponseTime}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Satisfação</p>
                    <p className={`font-medium ${agent.satisfaction >= 95 ? 'text-green-600' : agent.satisfaction >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                      {agent.satisfaction}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-6 pt-4 border-t border-border/50">
            <Link to="/app/team">
              <Button variant="outline" className="w-full gap-2">
                <Users size={16} />
                Ver Todos os Agentes
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quick Actions & Metrics */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Daily Goals */}
          <div className="bg-card p-6 rounded-lg border border-border/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Metas da Equipe
            </h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Mensagens (Meta: 400)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{teamStats.todayMessages}/400</span>
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((teamStats.todayMessages / 400) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Resoluções (Meta: 120)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{teamStats.resolvedToday}/120</span>
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((teamStats.resolvedToday / 120) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Satisfação (Meta: 90%)</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-green-600">{teamStats.teamSatisfaction}%</span>
                    <ArrowUp className="h-3 w-3 text-green-500" />
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full w-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-card p-6 rounded-lg border border-border/50">
            <h3 className="text-lg font-semibold mb-4">Ações Rápidas</h3>
            
            <div className="space-y-2">
              <Link to="/app/conversations">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <MessageSquare size={16} />
                  Ver Todas as Conversas
                </Button>
              </Link>
              
              <Link to="/app/team">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <Users size={16} />
                  Gerenciar Agentes
                </Button>
              </Link>
              
              <Link to="/app/analytics">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <TrendingUp size={16} />
                  Relatórios Detalhados
                </Button>
              </Link>
            </div>
          </div>

          {/* Team Alerts */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 p-6 rounded-lg border border-border/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">⚠️ Atenção da Supervisão</h3>
                <p className="text-sm text-muted-foreground">
                  {teamStats.pendingConversations > 20 
                    ? `${teamStats.pendingConversations} conversas pendentes! Considere redistribuir a carga de trabalho.`
                    : `Equipe operando dentro dos parâmetros normais. Continue monitorando!`
                  }
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}