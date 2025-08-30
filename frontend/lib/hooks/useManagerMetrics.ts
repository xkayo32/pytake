'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuthContext } from '@/contexts/auth-context'

export interface ManagerDashboardMetrics {
  overview: {
    totalAgents: number
    activeAgents: number
    totalConversations: number
    avgSatisfaction: number
    avgResponseTime: number
    slaCompliance: number
    queueWaitTime: number
    resolutionRate: number
  }
  agentPerformance: Array<{
    id: string
    name: string
    avatar?: string
    status: 'online' | 'busy' | 'away' | 'break' | 'offline'
    todayConversations: number
    avgResponseTime: number
    satisfaction: number
    activeConversations: number
    efficiency: number
    slaCompliance: number
  }>
  conversationTrends: Array<{
    date: string
    conversations: number
    resolved: number
    transferred: number
    abandoned: number
  }>
  satisfactionTrends: Array<{
    date: string
    satisfaction: number
    responses: number
  }>
  responseTimes: Array<{
    hour: string
    avgResponseTime: number
    slaTarget: number
  }>
  queueMetrics: Array<{
    id: string
    name: string
    waiting: number
    avgWaitTime: number
    agents: number
    slaBreaches: number
  }>
  topIssues: Array<{
    category: string
    count: number
    avgResolutionTime: number
    trend: 'up' | 'down' | 'stable'
  }>
}

export interface DateRange {
  from: Date
  to: Date
}

interface UseManagerMetricsOptions {
  refreshInterval?: number
  dateRange?: DateRange
}

export function useManagerMetrics(options: UseManagerMetricsOptions = {}) {
  const { user, isAuthenticated } = useAuthContext()
  const { refreshInterval = 60000, dateRange } = options

  const [metrics, setMetrics] = useState<ManagerDashboardMetrics>({
    overview: {
      totalAgents: 0,
      activeAgents: 0,
      totalConversations: 0,
      avgSatisfaction: 0,
      avgResponseTime: 0,
      slaCompliance: 0,
      queueWaitTime: 0,
      resolutionRate: 0
    },
    agentPerformance: [],
    conversationTrends: [],
    satisfactionTrends: [],
    responseTimes: [],
    queueMetrics: [],
    topIssues: []
  })

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Generate mock data for demonstration
  const generateMockData = useCallback((): ManagerDashboardMetrics => {
    const agents = [
      { id: '1', name: 'Maria Silva', avatar: '', status: 'online' as const },
      { id: '2', name: 'João Santos', avatar: '', status: 'busy' as const },
      { id: '3', name: 'Ana Costa', avatar: '', status: 'online' as const },
      { id: '4', name: 'Pedro Oliveira', avatar: '', status: 'away' as const },
      { id: '5', name: 'Carlos Lima', avatar: '', status: 'break' as const },
      { id: '6', name: 'Fernanda Souza', avatar: '', status: 'offline' as const }
    ]

    const activeAgentsCount = agents.filter(a => ['online', 'busy'].includes(a.status)).length

    return {
      overview: {
        totalAgents: agents.length,
        activeAgents: activeAgentsCount,
        totalConversations: 234,
        avgSatisfaction: 4.3,
        avgResponseTime: 45,
        slaCompliance: 87.5,
        queueWaitTime: 2.3,
        resolutionRate: 92.1
      },
      agentPerformance: agents.map(agent => ({
        ...agent,
        todayConversations: Math.floor(Math.random() * 25) + 5,
        avgResponseTime: Math.floor(Math.random() * 60) + 30,
        satisfaction: 3.5 + Math.random() * 1.5,
        activeConversations: ['online', 'busy'].includes(agent.status) ? Math.floor(Math.random() * 5) : 0,
        efficiency: 75 + Math.random() * 25,
        slaCompliance: 80 + Math.random() * 20
      })),
      conversationTrends: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        const conversations = Math.floor(Math.random() * 50) + 20
        return {
          date: date.toISOString().split('T')[0],
          conversations,
          resolved: Math.floor(conversations * (0.85 + Math.random() * 0.1)),
          transferred: Math.floor(conversations * (0.05 + Math.random() * 0.05)),
          abandoned: Math.floor(conversations * (0.02 + Math.random() * 0.03))
        }
      }),
      satisfactionTrends: Array.from({ length: 7 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (6 - i))
        return {
          date: date.toISOString().split('T')[0],
          satisfaction: 3.8 + Math.random() * 1.2,
          responses: Math.floor(Math.random() * 40) + 10
        }
      }),
      responseTimes: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i.toString().padStart(2, '0')}:00`,
        avgResponseTime: 30 + Math.random() * 60 + (i > 8 && i < 18 ? 20 : 0), // Higher during business hours
        slaTarget: 90 // 90 second SLA
      })),
      queueMetrics: [
        { id: '1', name: 'Suporte Técnico', waiting: 5, avgWaitTime: 3.2, agents: 3, slaBreaches: 1 },
        { id: '2', name: 'Vendas', waiting: 2, avgWaitTime: 1.8, agents: 2, slaBreaches: 0 },
        { id: '3', name: 'Atendimento Geral', waiting: 8, avgWaitTime: 4.1, agents: 4, slaBreaches: 2 },
        { id: '4', name: 'Reclamações', waiting: 1, avgWaitTime: 2.5, agents: 1, slaBreaches: 0 }
      ],
      topIssues: [
        { category: 'Problemas Técnicos', count: 45, avgResolutionTime: 12.5, trend: 'up' },
        { category: 'Dúvidas Comerciais', count: 38, avgResolutionTime: 8.2, trend: 'stable' },
        { category: 'Solicitações de Suporte', count: 32, avgResolutionTime: 15.3, trend: 'down' },
        { category: 'Reclamações', count: 18, avgResolutionTime: 22.1, trend: 'up' },
        { category: 'Cancelamentos', count: 12, avgResolutionTime: 18.7, trend: 'stable' }
      ]
    }
  }, [])

  // Fetch manager metrics from API
  const fetchMetrics = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return

    try {
      setError(null)
      
      // Build query parameters
      const params = new URLSearchParams()
      if (dateRange) {
        params.append('from', dateRange.from.toISOString())
        params.append('to', dateRange.to.toISOString())
      }

      const response = await fetch(`/api/v1/reports/dashboard-metrics?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json()
      setMetrics(data)
    } catch (error: any) {
      console.error('Error fetching manager metrics:', error)
      // Use mock data as fallback
      setMetrics(generateMockData())
      setError(`Usando dados simulados: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated, user?.id, dateRange, generateMockData])

  // Fetch agent comparison data
  const fetchAgentComparison = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return []

    try {
      const params = new URLSearchParams()
      if (dateRange) {
        params.append('from', dateRange.from.toISOString())
        params.append('to', dateRange.to.toISOString())
      }

      const response = await fetch(`/api/v1/reports/agent-comparison?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (response.ok) {
        return await response.json()
      }
      
      return metrics.agentPerformance
    } catch (error) {
      console.error('Error fetching agent comparison:', error)
      return metrics.agentPerformance
    }
  }, [isAuthenticated, user?.id, dateRange, metrics.agentPerformance])

  // Export data functionality
  const exportData = useCallback(async (format: 'csv' | 'excel' | 'pdf', reportType: 'summary' | 'detailed') => {
    if (!isAuthenticated || !user?.id) return null

    try {
      const params = new URLSearchParams({
        format,
        type: reportType
      })
      
      if (dateRange) {
        params.append('from', dateRange.from.toISOString())
        params.append('to', dateRange.to.toISOString())
      }

      const response = await fetch(`/api/v1/reports/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `relatorio_${reportType}_${format}_${new Date().toISOString().split('T')[0]}.${format}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        return true
      }
      
      throw new Error('Export failed')
    } catch (error) {
      console.error('Error exporting data:', error)
      return false
    }
  }, [isAuthenticated, user?.id, dateRange])

  // Initial load
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchMetrics()
    }
  }, [isAuthenticated, user?.id, fetchMetrics])

  // Periodic refresh
  useEffect(() => {
    if (!isAuthenticated || refreshInterval <= 0) return

    const interval = setInterval(fetchMetrics, refreshInterval)
    return () => clearInterval(interval)
  }, [isAuthenticated, refreshInterval, fetchMetrics])

  return {
    // Data
    metrics,
    
    // State
    isLoading,
    error,
    
    // Actions
    refreshMetrics: fetchMetrics,
    fetchAgentComparison,
    exportData,
    
    // Computed values
    activeAgentsPercentage: metrics.overview.totalAgents > 0 
      ? (metrics.overview.activeAgents / metrics.overview.totalAgents) * 100 
      : 0,
    
    totalQueueWaiting: metrics.queueMetrics.reduce((total, queue) => total + queue.waiting, 0),
    
    topPerformingAgent: metrics.agentPerformance.length > 0
      ? metrics.agentPerformance.reduce((top, agent) => 
          agent.satisfaction > (top?.satisfaction || 0) ? agent : top, metrics.agentPerformance[0])
      : null,
      
    slaBreaches: metrics.queueMetrics.reduce((total, queue) => total + queue.slaBreaches, 0),
    
    conversationGrowth: metrics.conversationTrends.length >= 2
      ? ((metrics.conversationTrends[metrics.conversationTrends.length - 1].conversations - 
          metrics.conversationTrends[metrics.conversationTrends.length - 2].conversations) /
          metrics.conversationTrends[metrics.conversationTrends.length - 2].conversations) * 100
      : 0
  }
}