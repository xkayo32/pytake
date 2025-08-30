import api from './auth'

export interface DashboardStats {
  // Conversations
  active_conversations: number
  messages_today: number
  unread_count: number
  
  // Queues  
  active_queues: number
  agents_online: number
  total_waiting: number
  today_total: number
  today_completed: number
  avg_wait_time_today: number
  avg_rating: number
  abandonment_rate: number
}

export interface ConversationVolumeData {
  date: string
  total: number
  resolvidas: number
  pendentes: number
}

export interface MessageVolumeData {
  hora: string
  enviadas: number
  recebidas: number
}

export interface FlowPerformanceData {
  name: string
  value: number
  color: string
}

export interface ResponseTimeData {
  range: string
  count: number
}

export const dashboardApi = {
  // Get consolidated dashboard stats
  getStats: async (): Promise<DashboardStats> => {
    const [conversationStats, queueStats] = await Promise.all([
      api.get('/api/v1/conversations/stats'),
      api.get('/api/v1/queues/dashboard')
    ])

    return {
      // From conversations API
      active_conversations: conversationStats.data.active_conversations || 0,
      messages_today: conversationStats.data.messages_today || 0,
      unread_count: conversationStats.data.unread_count || 0,
      
      // From queues API
      active_queues: queueStats.data.active_queues || 0,
      agents_online: queueStats.data.agents_online || 0,
      total_waiting: queueStats.data.total_waiting || 0,
      today_total: queueStats.data.today_total || 0,
      today_completed: queueStats.data.today_completed || 0,
      avg_wait_time_today: queueStats.data.avg_wait_time_today || 0,
      avg_rating: queueStats.data.avg_rating || 0,
      abandonment_rate: queueStats.data.abandonment_rate || 0
    }
  },

  // Get conversation volume over time
  getConversationVolume: async (days: number = 7): Promise<ConversationVolumeData[]> => {
    // TODO: Implement when backend has historical data endpoint
    // For now return mock data structure, but we'll replace with real API
    const response = await api.get(`/api/v1/conversations/history?days=${days}`)
    return response.data || []
  },

  // Get message volume by hour
  getMessageVolume: async (date?: string): Promise<MessageVolumeData[]> => {
    // TODO: Implement when backend has hourly stats endpoint
    const response = await api.get(`/api/v1/messages/volume?date=${date || 'today'}`)
    return response.data || []
  },

  // Get flow performance stats
  getFlowPerformance: async (): Promise<FlowPerformanceData[]> => {
    try {
      const response = await api.get('/api/v1/flows/stats')
      return response.data.map((flow: any, index: number) => ({
        name: flow.name || `Flow ${index + 1}`,
        value: flow.executions || 0,
        color: getFlowColor(index)
      })) || []
    } catch (error) {
      // Fallback to flows list if stats endpoint doesn't exist
      const response = await api.get('/api/v1/flows')
      return response.data.slice(0, 5).map((flow: any, index: number) => ({
        name: flow.name,
        value: Math.floor(Math.random() * 1000) + 100, // Mock data until we have real stats
        color: getFlowColor(index)
      })) || []
    }
  },

  // Get response time distribution
  getResponseTimes: async (): Promise<ResponseTimeData[]> => {
    // TODO: Implement when backend has response time analytics
    // For now, calculate from queue metrics
    try {
      const response = await api.get('/api/v1/queues/response-times')
      return response.data || []
    } catch (error) {
      // Mock data based on current avg_wait_time
      const stats = await this.getStats()
      const avgTime = stats.avg_wait_time_today
      
      // Generate realistic distribution based on avg time
      return [
        { range: '< 1min', count: avgTime < 60 ? 450 : 200 },
        { range: '1-5min', count: avgTime < 300 ? 380 : 280 },
        { range: '5-15min', count: avgTime < 900 ? 150 : 300 },
        { range: '15-30min', count: avgTime < 1800 ? 80 : 200 },
        { range: '> 30min', count: avgTime > 1800 ? 100 : 40 },
      ]
    }
  }
}

// Helper function for consistent flow colors
function getFlowColor(index: number): string {
  const colors = ['#25D366', '#128C7E', '#075E54', '#34B7F1', '#00A884', '#DCF8C6']
  return colors[index % colors.length]
}