import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  MessageSquare, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Users,
  Phone,
  ArrowRight,
  Zap,
  Timer,
  Target,
  FileText
} from 'lucide-react'
import { motion } from 'framer-motion'

interface AgentStats {
  activeConversations: number
  todayMessages: number
  avgResponseTime: string
  resolvedToday: number
  pendingConversations: number
  satisfaction: number
}

interface PendingConversation {
  id: string
  customerName: string
  lastMessage: string
  waitingTime: string
  priority: 'high' | 'medium' | 'low'
  platform: 'whatsapp' | 'telegram' | 'instagram'
}

export default function AgentDashboard() {
  const [stats, setStats] = useState<AgentStats>({
    activeConversations: 0,
    todayMessages: 0,
    avgResponseTime: '...',
    resolvedToday: 0,
    pendingConversations: 0,
    satisfaction: 0
  })
  
  const [loading, setLoading] = useState(true)
  const [pendingConversations, setPendingConversations] = useState<PendingConversation[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/v1/dashboard/agent', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setStats({
            activeConversations: data.personal_stats.conversations_assigned,
            todayMessages: data.today_metrics.messages_sent,
            avgResponseTime: `${data.personal_stats.avg_response_time}m`,
            resolvedToday: data.personal_stats.conversations_resolved,
            pendingConversations: data.personal_stats.conversations_assigned - data.personal_stats.conversations_resolved,
            satisfaction: Math.round(data.personal_stats.satisfaction_score * 100)
          })
          
          // Map recent conversations as pending
          const mappedConversations = data.recent_conversations.map((conv: any) => ({
            id: conv.id,
            customerName: conv.contact_name,
            lastMessage: conv.last_message,
            waitingTime: new Date(conv.timestamp).toLocaleTimeString('pt-BR'),
            priority: conv.status === 'active' ? 'high' : 'medium',
            platform: 'whatsapp'
          }))
          setPendingConversations(mappedConversations)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])


  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'whatsapp':
        return '💬'
      case 'telegram':
        return '✈️'
      case 'instagram':
        return '📸'
      default:
        return '💬'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
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
          <h1 className="text-3xl font-bold text-foreground">Meu Atendimento</h1>
          <p className="text-muted-foreground">Acompanhe suas conversas e performance</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Online
          </div>
          <Link to="/app/conversations">
            <Button className="gap-2">
              <MessageSquare size={16} />
              Ir para Chat
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4"
      >
        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversas Ativas</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stats.activeConversations}
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
              <p className="text-sm font-medium text-muted-foreground">Mensagens Hoje</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stats.todayMessages}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Tempo Resposta</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stats.avgResponseTime}
              </p>
            </div>
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Timer className="h-5 w-5 text-yellow-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Resolvidas Hoje</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : stats.resolvedToday}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
              <p className="text-2xl font-bold text-orange-600">
                {loading ? '...' : stats.pendingConversations}
              </p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Satisfação</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : `${stats.satisfaction}%`}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Target className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversas Pendentes */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              Conversas Pendentes
            </h3>
            <Badge variant="outline">{pendingConversations.length} aguardando</Badge>
          </div>
          
          <div className="space-y-3">
            {pendingConversations.map((conversation) => (
              <div key={conversation.id} className="flex items-center justify-between p-3 border border-border/50 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="text-lg">{getPlatformIcon(conversation.platform)}</div>
                  <div>
                    <p className="font-medium text-foreground">{conversation.customerName}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${getPriorityColor(conversation.priority)}`}>
                    {conversation.priority}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{conversation.waitingTime}</span>
                  <Link to={`/app/conversations/${conversation.id}`}>
                    <Button size="sm" className="gap-1">
                      Atender
                      <ArrowRight size={14} />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50">
            <Link to="/app/conversations">
              <Button variant="outline" className="w-full gap-2">
                <MessageSquare size={16} />
                Ver Todas as Conversas
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Metas e Performance */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Metas do Dia
          </h3>
          
          <div className="space-y-4">
            {/* Meta de Mensagens */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Mensagens (Meta: 100)</span>
                <span className="text-sm text-muted-foreground">{stats.todayMessages}/100</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((stats.todayMessages / 100) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Meta de Resolução */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Resoluções (Meta: 15)</span>
                <span className="text-sm text-muted-foreground">{stats.resolvedToday}/15</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${Math.min((stats.resolvedToday / 15) * 100, 100)}%` }}
                />
              </div>
            </div>

            {/* Meta de Tempo de Resposta */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Tempo Resposta (Meta: &lt;3min)</span>
                <span className="text-sm text-green-600">✓ Dentro da meta</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full w-3/4" />
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-border/50">
            <h4 className="text-sm font-medium mb-3">Ações Rápidas</h4>
            <div className="grid grid-cols-2 gap-2">
              <Link to="/app/templates">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <FileText size={14} />
                  Templates
                </Button>
              </Link>
              <Link to="/app/contacts">
                <Button variant="outline" size="sm" className="w-full gap-2">
                  <Users size={14} />
                  Contatos
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tips Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-6 rounded-lg border border-border/50"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Zap className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground mb-2">💡 Dica para Melhorar</h3>
            <p className="text-sm text-muted-foreground">
              Você está {stats.pendingConversations > 3 ? 'com muitas conversas pendentes' : 'mantendo um bom ritmo'}! 
              {stats.pendingConversations > 3 
                ? ' Tente usar mais templates para respostas rápidas.' 
                : ' Continue assim para manter a satisfação alta!'
              }
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}