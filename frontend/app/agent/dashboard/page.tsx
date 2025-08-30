'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuthContext } from '@/contexts/auth-context'
import { useConversations } from '@/lib/hooks/useConversations'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { useAgentMetrics } from '@/lib/hooks/useAgentMetrics'
import { 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  Target, 
  Star,
  Award,
  Users,
  CheckCircle,
  Timer,
  Activity,
  BarChart3,
  Calendar,
  Phone,
  Coffee,
  UserCheck,
  UserX,
  AlertCircle,
  Zap,
  ThumbsUp,
  Send,
  Eye,
  MessageCircle,
  Headphones
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface AgentStats {
  todayStats: {
    conversationsHandled: number
    messagesResponded: number
    avgResponseTime: number
    satisfaction: number
    hoursWorked: number
    currentStreak: number
  }
  weekStats: {
    totalConversations: number
    totalMessages: number
    avgSatisfaction: number
    totalHours: number
    goalsAchieved: number
  }
  monthStats: {
    totalConversations: number
    avgResponseTime: number
    satisfaction: number
    bestDay: string
    improvementAreas: string[]
  }
}

interface Goal {
  id: string
  title: string
  description: string
  target: number
  current: number
  unit: string
  deadline: string
  priority: 'low' | 'medium' | 'high'
  category: 'conversations' | 'satisfaction' | 'response_time' | 'efficiency'
}

interface RecentActivity {
  id: string
  type: 'conversation_started' | 'conversation_ended' | 'goal_achieved' | 'feedback_received'
  title: string
  description: string
  timestamp: string
  metadata?: any
}

export default function AgentDashboardPage() {
  const { user } = useAuthContext()
  const { conversations, unreadCount, isConnected } = useConversations()
  const { config: notificationConfig } = useNotifications()
  
  // Use agent metrics hook
  const {
    metrics: agentStats,
    goals,
    activities: recentActivity,
    status,
    isLoading: metricsLoading,
    error: metricsError,
    updateStatus,
    activeGoals,
    completedGoals
  } = useAgentMetrics()

  const activeConversations = conversations.filter(c => 
    c.status === 'active' && c.assigned_to === user?.id
  )

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min ${seconds % 60}s`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}min`
  }

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date()
    const date = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'Agora'
    if (diffInMinutes < 60) return `${diffInMinutes}min atrás`
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h atrás`
    return format(date, 'dd/MM HH:mm', { locale: ptBR })
  }

  const getGoalProgress = (goal: Goal) => {
    if (goal.category === 'response_time') {
      // Para tempo de resposta, menor é melhor
      return goal.current <= goal.target ? 100 : Math.max(0, 100 - ((goal.current - goal.target) / goal.target) * 100)
    }
    return Math.min(100, (goal.current / goal.target) * 100)
  }

  const getGoalStatus = (goal: Goal) => {
    const progress = getGoalProgress(goal)
    if (progress >= 100) return { color: 'text-green-600 bg-green-50', icon: CheckCircle }
    if (progress >= 75) return { color: 'text-blue-600 bg-blue-50', icon: TrendingUp }
    if (progress >= 50) return { color: 'text-yellow-600 bg-yellow-50', icon: Timer }
    return { color: 'text-red-600 bg-red-50', icon: AlertCircle }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200'
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'low': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-600 border-gray-200'
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'conversation_started': return MessageCircle
      case 'conversation_ended': return CheckCircle
      case 'goal_achieved': return Award
      case 'feedback_received': return Star
      default: return Activity
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'busy': return 'bg-red-500'
      case 'away': return 'bg-yellow-500'
      case 'break': return 'bg-blue-500'
      case 'offline': return 'bg-gray-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'online': return 'Online'
      case 'busy': return 'Ocupado'
      case 'away': return 'Ausente'
      case 'break': return 'Pausa'
      case 'offline': return 'Offline'
      default: return 'Desconhecido'
    }
  }

  // Show loading state
  if (metricsLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        {/* Header com Status do Agente */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.avatar} />
                <AvatarFallback className="text-lg">
                  {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${getStatusColor(status.current)}`} />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Olá, {user?.name?.split(' ')[0]}!</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${getStatusColor(status.current)}`} />
                {getStatusLabel(status.current)} • {activeConversations.length} conversas ativas
                {!isConnected && (
                  <Badge variant="destructive" className="ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Sem conexão
                  </Badge>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus(status.current === 'online' ? 'break' : 'online')}
            >
              {status.current === 'online' ? (
                <>
                  <Coffee className="h-4 w-4 mr-2" />
                  Fazer Pausa
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Voltar Online
                </>
              )}
            </Button>
            
            <Button size="sm">
              <MessageSquare className="h-4 w-4 mr-2" />
              Nova Conversa
            </Button>
          </div>
        </div>

        {/* Cards de Métricas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoje</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{agentStats.todayStats.conversationsHandled}</div>
              <p className="text-xs text-muted-foreground">
                +{agentStats.todayStats.messagesResponded} mensagens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tempo Resposta</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatTime(agentStats.todayStats.avgResponseTime)}</div>
              <p className="text-xs text-green-600">
                -12% desde ontem
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                {agentStats.todayStats.satisfaction}
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              </div>
              <p className="text-xs text-green-600">
                +0.3 desde a semana passada
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sequência</CardTitle>
              <Zap className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {agentStats.todayStats.currentStreak}
              </div>
              <p className="text-xs text-muted-foreground">
                dias consecutivos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs Principais */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="conversations">Conversas</TabsTrigger>
            <TabsTrigger value="goals">Metas</TabsTrigger>
            <TabsTrigger value="activity">Atividade</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Performance Chart */}
              <Card className="col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Performance Semanal
                  </CardTitle>
                  <CardDescription>
                    Suas métricas dos últimos 7 dias
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {agentStats.weekStats.totalConversations}
                        </div>
                        <p className="text-sm text-muted-foreground">Conversas</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600 flex items-center justify-center gap-1">
                          {agentStats.weekStats.avgSatisfaction}
                          <Star className="h-4 w-4 fill-current" />
                        </div>
                        <p className="text-sm text-muted-foreground">Satisfação</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">
                          {agentStats.weekStats.totalMessages}
                        </div>
                        <p className="text-sm text-muted-foreground">Mensagens</p>
                      </div>
                      <div className="text-center p-4 bg-orange-50 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          {agentStats.weekStats.totalHours}h
                        </div>
                        <p className="text-sm text-muted-foreground">Horas</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ver Conversas Ativas ({activeConversations.length})
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Target className="h-4 w-4 mr-2" />
                    Acompanhar Metas ({activeGoals.length})
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <Award className="h-4 w-4 mr-2" />
                    Ver Conquistas
                  </Button>
                  <Button className="w-full justify-start" variant="outline">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Relatório Detalhado
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Conversas Ativas */}
          <TabsContent value="conversations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">
                Conversas Ativas ({activeConversations.length})
              </h3>
              <Badge variant={unreadCount > 0 ? "destructive" : "secondary"}>
                {unreadCount} não lidas
              </Badge>
            </div>

            {activeConversations.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageSquare className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma conversa ativa</h3>
                <p className="text-muted-foreground mb-4">
                  Quando você receber novas conversas, elas aparecerão aqui
                </p>
                <Button>
                  <Headphones className="h-4 w-4 mr-2" />
                  Ficar Disponível
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4">
                {activeConversations.slice(0, 10).map((conversation) => (
                  <Card key={conversation.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {conversation.contact?.name?.charAt(0) || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">
                              {conversation.contact?.name || 'Cliente'}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {conversation.contact?.phone}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          {conversation.unread_count > 0 && (
                            <Badge variant="destructive">
                              {conversation.unread_count}
                            </Badge>
                          )}
                          <Button size="sm">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Responder
                          </Button>
                        </div>
                      </div>
                      
                      {conversation.last_message && (
                        <p className="text-sm text-muted-foreground mt-2 truncate">
                          {conversation.last_message}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Metas */}
          <TabsContent value="goals" className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Suas Metas</h3>
              <Button size="sm">
                <Target className="h-4 w-4 mr-2" />
                Nova Meta
              </Button>
            </div>

            <div className="grid gap-4">
              {goals.map((goal) => {
                const progress = getGoalProgress(goal)
                const status = getGoalStatus(goal)
                const StatusIcon = status.icon

                return (
                  <Card key={goal.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">{goal.title}</h4>
                            <Badge variant="outline" className={getPriorityColor(goal.priority)}>
                              {goal.priority}
                            </Badge>
                            <div className={`p-1 rounded-full ${status.color}`}>
                              <StatusIcon className="h-4 w-4" />
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {goal.description}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progresso</span>
                          <span>
                            {goal.current} / {goal.target} {goal.unit}
                          </span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          Meta até {format(new Date(goal.deadline), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Atividade Recente */}
          <TabsContent value="activity" className="space-y-6">
            <h3 className="text-lg font-semibold">Atividade Recente</h3>
            
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const ActivityIcon = getActivityIcon(activity.type)
                
                return (
                  <Card key={activity.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-full">
                          <ActivityIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{activity.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatRelativeTime(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  )
}