'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/contexts/auth-context'

export interface AgentMetrics {
  todayStats: {
    conversationsHandled: number
    messagesResponded: number
    avgResponseTime: number
    satisfaction: number
    hoursWorked: number
    currentStreak: number
    goalsAchieved: number
    activeConversations: number
  }
  weekStats: {
    totalConversations: number
    totalMessages: number
    avgSatisfaction: number
    totalHours: number
    avgResponseTime: number
    resolutionRate: number
    customerRetention: number
  }
  monthStats: {
    totalConversations: number
    avgResponseTime: number
    satisfaction: number
    bestDay: string
    improvementAreas: string[]
    achievements: string[]
    totalHours: number
  }
  realTimeStats: {
    status: 'online' | 'busy' | 'away' | 'break' | 'offline'
    currentLoad: number
    maxCapacity: number
    queuePosition: number
    lastActivity: string
  }
}

export interface AgentGoal {
  id: string
  title: string
  description: string
  target: number
  current: number
  unit: string
  deadline: string
  priority: 'low' | 'medium' | 'high'
  category: 'conversations' | 'satisfaction' | 'response_time' | 'efficiency' | 'quality'
  isAchieved: boolean
  progress: number
}

export interface AgentActivity {
  id: string
  type: 'conversation_started' | 'conversation_ended' | 'goal_achieved' | 'feedback_received' | 'status_changed' | 'break_taken'
  title: string
  description: string
  timestamp: string
  metadata?: {
    conversationId?: string
    goalId?: string
    rating?: number
    customerId?: string
    previousStatus?: string
    newStatus?: string
  }
}

export interface AgentStatus {
  current: 'online' | 'busy' | 'away' | 'break' | 'offline'
  since: string
  autoStatusEnabled: boolean
  workingHours: {
    start: string
    end: string
    timezone: string
  }
}

interface UseAgentMetricsOptions {
  refreshInterval?: number
  enableRealTime?: boolean
}

export function useAgentMetrics(options: UseAgentMetricsOptions = {}) {
  const { user, isAuthenticated } = useAuthContext()
  const { refreshInterval = 30000, enableRealTime = true } = options

  const [metrics, setMetrics] = useState<AgentMetrics>({
    todayStats: {
      conversationsHandled: 0,
      messagesResponded: 0,
      avgResponseTime: 0,
      satisfaction: 0,
      hoursWorked: 0,
      currentStreak: 0,
      goalsAchieved: 0,
      activeConversations: 0
    },
    weekStats: {
      totalConversations: 0,
      totalMessages: 0,
      avgSatisfaction: 0,
      totalHours: 0,
      avgResponseTime: 0,
      resolutionRate: 0,
      customerRetention: 0
    },
    monthStats: {
      totalConversations: 0,
      avgResponseTime: 0,
      satisfaction: 0,
      bestDay: '',
      improvementAreas: [],
      achievements: [],
      totalHours: 0
    },
    realTimeStats: {
      status: 'offline',
      currentLoad: 0,
      maxCapacity: 5,
      queuePosition: 0,
      lastActivity: new Date().toISOString()
    }
  })

  const [goals, setGoals] = useState<AgentGoal[]>([])
  const [activities, setActivities] = useState<AgentActivity[]>([])
  const [status, setStatus] = useState<AgentStatus>({
    current: 'offline',
    since: new Date().toISOString(),
    autoStatusEnabled: true,
    workingHours: {
      start: '09:00',
      end: '18:00',
      timezone: 'America/Sao_Paulo'
    }
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch agent metrics from API
  const fetchMetrics = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      setError(null)
      const response = await fetch(`/api/v1/agents/${user.id}/metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      }).catch(() => null)

      if (response?.ok) {
        const data = await response.json()
        setMetrics(data)
        return
      }

      // Backend Go não tem APIs específicas de agent metrics ainda
      // Usando dados simulados baseados no usuário logado  
      console.log('Usando métricas simuladas para o agente:', user.name)
      setMetrics({
        todayStats: {
          conversationsHandled: Math.floor(Math.random() * 20) + 5,
          messagesResponded: Math.floor(Math.random() * 100) + 30,
          avgResponseTime: Math.floor(Math.random() * 60) + 30,
          satisfaction: 4.2 + Math.random() * 0.7,
          hoursWorked: Math.random() * 8 + 2,
          currentStreak: Math.floor(Math.random() * 10) + 1,
          goalsAchieved: Math.floor(Math.random() * 3),
          activeConversations: Math.floor(Math.random() * 5)
        },
        weekStats: {
          totalConversations: Math.floor(Math.random() * 100) + 30,
          totalMessages: Math.floor(Math.random() * 500) + 200,
          avgSatisfaction: 4.0 + Math.random() * 0.9,
          totalHours: Math.random() * 40 + 20,
          avgResponseTime: Math.floor(Math.random() * 90) + 30,
          resolutionRate: 0.8 + Math.random() * 0.2,
          customerRetention: 0.7 + Math.random() * 0.3
        },
        monthStats: {
          totalConversations: Math.floor(Math.random() * 400) + 100,
          avgResponseTime: Math.floor(Math.random() * 120) + 45,
          satisfaction: 4.1 + Math.random() * 0.8,
          bestDay: '2024-01-15',
          improvementAreas: ['Tempo de resposta', 'Proatividade'],
          achievements: ['Top 10% em satisfação', '100 conversas resolvidas'],
          totalHours: Math.random() * 160 + 80
        },
        realTimeStats: {
          status: 'online',
          currentLoad: Math.floor(Math.random() * 3),
          maxCapacity: 5,
          queuePosition: Math.floor(Math.random() * 10),
          lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString()
        }
      })
      setError(`Usando dados simulados: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id])

  // Fetch agent goals
  const fetchGoals = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      const response = await fetch(`/api/v1/agents/${user.id}/goals`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        setGoals(data)
      } else {
        // Mock goals as fallback
        setGoals([
          {
            id: '1',
            title: 'Conversas Diárias',
            description: 'Atender pelo menos 15 conversas por dia',
            target: 15,
            current: Math.floor(Math.random() * 20),
            unit: 'conversas',
            deadline: '2024-12-31',
            priority: 'high',
            category: 'conversations',
            isAchieved: false,
            progress: 0
          },
          {
            id: '2',
            title: 'Satisfação do Cliente',
            description: 'Manter satisfação acima de 4.5 estrelas',
            target: 4.5,
            current: 4.2 + Math.random() * 0.7,
            unit: 'estrelas',
            deadline: '2024-12-31',
            priority: 'high',
            category: 'satisfaction',
            isAchieved: false,
            progress: 0
          },
          {
            id: '3',
            title: 'Tempo de Resposta',
            description: 'Responder em menos de 60 segundos',
            target: 60,
            current: Math.floor(Math.random() * 40) + 30,
            unit: 'segundos',
            deadline: '2024-12-31',
            priority: 'medium',
            category: 'response_time',
            isAchieved: false,
            progress: 0
          }
        ].map(goal => ({
          ...goal,
          progress: goal.category === 'response_time' 
            ? goal.current <= goal.target ? 100 : Math.max(0, 100 - ((goal.current - goal.target) / goal.target) * 100)
            : Math.min(100, (goal.current / goal.target) * 100),
          isAchieved: goal.category === 'response_time' ? goal.current <= goal.target : goal.current >= goal.target
        })))
      }
    } catch (error) {
      console.error('Error fetching agent goals:', error)
    }
  }, [isAuthenticated, user?.id])

  // Fetch recent activity
  const fetchActivities = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      const response = await fetch(`/api/v1/agents/${user.id}/activities`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (response.ok) {
        const data = await response.json()
        setActivities(data)
      } else {
        // Mock activities as fallback
        const mockActivities: AgentActivity[] = []
        const activityTypes = [
          { type: 'conversation_started', title: 'Nova conversa iniciada', desc: 'Cliente {name} iniciou atendimento' },
          { type: 'conversation_ended', title: 'Conversa finalizada', desc: 'Cliente {name} - Problema resolvido com sucesso' },
          { type: 'goal_achieved', title: 'Meta alcançada!', desc: 'Meta de {goal} foi atingida' },
          { type: 'feedback_received', title: 'Feedback recebido', desc: 'Cliente {name} deixou uma avaliação {rating} estrelas' }
        ]

        for (let i = 0; i < 10; i++) {
          const activity = activityTypes[Math.floor(Math.random() * activityTypes.length)]
          const names = ['João Silva', 'Maria Santos', 'Pedro Costa', 'Ana Oliveira', 'Carlos Souza']
          
          mockActivities.push({
            id: `activity-${i}`,
            type: activity.type as any,
            title: activity.title,
            description: activity.desc
              .replace('{name}', names[Math.floor(Math.random() * names.length)])
              .replace('{goal}', ['Satisfação', 'Conversas', 'Tempo de Resposta'][Math.floor(Math.random() * 3)])
              .replace('{rating}', String(Math.floor(Math.random() * 2) + 4)),
            timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            metadata: {
              conversationId: `conv-${Math.random().toString(36).substr(2, 9)}`,
              rating: Math.floor(Math.random() * 2) + 4
            }
          })
        }

        setActivities(mockActivities.sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ))
      }
    } catch (error) {
      console.error('Error fetching agent activities:', error)
    }
  }, [isAuthenticated, user?.id])

  // Update agent status
  const updateStatus = useCallback(async (newStatus: AgentStatus['current']) => {
    if (!isAuthenticated || !user?.id) return

    try {
      const response = await fetch(`/api/v1/agents/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        setStatus(prev => ({
          ...prev,
          current: newStatus,
          since: new Date().toISOString()
        }))

        // Add activity
        const newActivity: AgentActivity = {
          id: `status-${Date.now()}`,
          type: 'status_changed',
          title: 'Status alterado',
          description: `Status alterado para ${newStatus}`,
          timestamp: new Date().toISOString(),
          metadata: {
            previousStatus: status.current,
            newStatus
          }
        }
        
        setActivities(prev => [newActivity, ...prev.slice(0, 19)])
        
        // Refresh metrics to reflect status change
        fetchMetrics()
      }
    } catch (error) {
      console.error('Error updating agent status:', error)
    }
  }, [isAuthenticated, user?.id, status.current, fetchMetrics])

  // Create new goal
  const createGoal = useCallback(async (goalData: Omit<AgentGoal, 'id' | 'progress' | 'isAchieved'>) => {
    if (!isAuthenticated || !user?.id) return

    try {
      const response = await fetch(`/api/v1/agents/${user.id}/goals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(goalData)
      })

      if (response.ok) {
        const newGoal = await response.json()
        setGoals(prev => [...prev, newGoal])
      }
    } catch (error) {
      console.error('Error creating goal:', error)
    }
  }, [isAuthenticated, user?.id])

  // Update goal progress
  const updateGoalProgress = useCallback(async (goalId: string, current: number) => {
    setGoals(prev => prev.map(goal => {
      if (goal.id === goalId) {
        const progress = goal.category === 'response_time' 
          ? current <= goal.target ? 100 : Math.max(0, 100 - ((current - goal.target) / goal.target) * 100)
          : Math.min(100, (current / goal.target) * 100)
        
        const isAchieved = goal.category === 'response_time' ? current <= goal.target : current >= goal.target
        
        return { ...goal, current, progress, isAchieved }
      }
      return goal
    }))
  }, [])

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchMetrics()
      fetchGoals()
      fetchActivities()
    }
  }, [isAuthenticated, user?.id, fetchMetrics, fetchGoals, fetchActivities])

  // Periodic refresh
  useEffect(() => {
    if (!enableRealTime || !isAuthenticated) return

    const interval = setInterval(() => {
      fetchMetrics()
      fetchActivities()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [enableRealTime, isAuthenticated, refreshInterval, fetchMetrics, fetchActivities])

  return {
    // Data
    metrics,
    goals,
    activities,
    status,
    
    // State
    isLoading,
    error,
    
    // Actions
    updateStatus,
    createGoal,
    updateGoalProgress,
    refreshMetrics: fetchMetrics,
    refreshGoals: fetchGoals,
    refreshActivities: fetchActivities,
    
    // Computed values
    activeGoals: goals.filter(g => !g.isAchieved),
    completedGoals: goals.filter(g => g.isAchieved),
    todayGoalsProgress: goals.reduce((acc, goal) => acc + goal.progress, 0) / Math.max(goals.length, 1),
    isOnline: status.current === 'online',
    isAvailable: ['online', 'busy'].includes(status.current)
  }
}