'use client'

import { useState, useEffect, useCallback } from 'react'
import { dashboardApi, type DashboardStats, type ConversationVolumeData, type MessageVolumeData, type FlowPerformanceData, type ResponseTimeData } from '@/lib/api/dashboard'

interface DashboardState {
  stats: DashboardStats | null
  conversationVolume: ConversationVolumeData[]
  messageVolume: MessageVolumeData[]
  flowPerformance: FlowPerformanceData[]
  responseTimes: ResponseTimeData[]
  isLoading: boolean
  error: string | null
  lastUpdated: Date | null
}

export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    stats: null,
    conversationVolume: [],
    messageVolume: [],
    flowPerformance: [],
    responseTimes: [],
    isLoading: true,
    error: null,
    lastUpdated: null
  })

  const fetchDashboardData = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }))

      // Fetch all dashboard data in parallel
      const [
        stats,
        conversationVolume,
        messageVolume,
        flowPerformance,
        responseTimes
      ] = await Promise.allSettled([
        dashboardApi.getStats(),
        dashboardApi.getConversationVolume(),
        dashboardApi.getMessageVolume(),
        dashboardApi.getFlowPerformance(),
        dashboardApi.getResponseTimes()
      ])

      setState({
        stats: stats.status === 'fulfilled' ? stats.value : null,
        conversationVolume: conversationVolume.status === 'fulfilled' ? conversationVolume.value : [],
        messageVolume: messageVolume.status === 'fulfilled' ? messageVolume.value : [],
        flowPerformance: flowPerformance.status === 'fulfilled' ? flowPerformance.value : [],
        responseTimes: responseTimes.status === 'fulfilled' ? responseTimes.value : [],
        isLoading: false,
        error: null,
        lastUpdated: new Date()
      })

    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Erro ao carregar dados do dashboard'
      }))
    }
  }, [])

  const refreshStats = useCallback(async () => {
    try {
      const stats = await dashboardApi.getStats()
      setState(prev => ({
        ...prev,
        stats,
        lastUpdated: new Date()
      }))
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Erro ao atualizar estatísticas'
      }))
    }
  }, [])

  // Initial load
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(refreshStats, 30000)
    return () => clearInterval(interval)
  }, [refreshStats])

  return {
    ...state,
    refresh: fetchDashboardData,
    refreshStats
  }
}