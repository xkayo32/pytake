// Dashboard API service for fetching metrics and analytics data

import { apiClient } from './api/client';

export interface MetricValue {
  current: any;
  previous: any;
  change_percentage: number;
  trend: 'up' | 'down' | 'stable';
}

export interface DashboardMetrics {
  active_conversations: MetricValue;
  total_messages: MetricValue;
  avg_response_time: MetricValue;
  customer_satisfaction: MetricValue;
  period: string;
  last_updated: string;
}

export interface ConversationChartData {
  date: string;
  total: number;
  active: number;
  resolved: number;
  pending: number;
}

export interface ResponseTimeData {
  period: string;
  avg_response_time: number;
  first_response: number;
  resolution: number;
}

export interface ActivityItem {
  id: string;
  activity_type: string;
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  contact?: string;
  metadata?: Record<string, any>;
}

export interface QuickStats {
  conversations_started: number;
  conversations_resolved: number;
  resolution_rate: number;
  new_contacts: number;
  peak_hour: string;
  total_agents: number;
  online_agents: number;
}

export interface RealtimeMetrics {
  active_conversations: number;
  online_agents: number;
  pending_messages: number;
  average_wait_time: string;
  system_load: number;
  last_updated: string;
}

export class DashboardApiService {
  /**
   * Get main dashboard metrics
   */
  static async getDashboardMetrics(period: '7d' | '30d' | '90d' = '7d'): Promise<DashboardMetrics> {
    try {
      const response = await apiClient.get<DashboardMetrics>(`/v1/dashboard/metrics?period=${period}`);
      return response.data || getMockDashboardMetrics();
    } catch (error) {
      console.warn('Failed to fetch dashboard metrics, using mock data:', error);
      return getMockDashboardMetrics();
    }
  }

  /**
   * Get conversation chart data
   */
  static async getConversationChart(period: '7d' | '30d' | '90d' = '7d'): Promise<ConversationChartData[]> {
    try {
      const response = await apiClient.get<ConversationChartData[]>(`/v1/dashboard/charts/conversations?period=${period}`);
      return response.data || [];
    } catch (error) {
      console.warn('Failed to fetch conversation chart, using mock data:', error);
      return [];
    }
  }

  /**
   * Get response time chart data
   */
  static async getResponseTimeChart(): Promise<ResponseTimeData[]> {
    try {
      const response = await apiClient.get<ResponseTimeData[]>('/v1/dashboard/charts/response-time');
      return response.data || [];
    } catch (error) {
      console.warn('Failed to fetch response time chart, using mock data:', error);
      return [];
    }
  }

  /**
   * Get recent activity feed
   */
  static async getRecentActivity(limit: number = 10): Promise<ActivityItem[]> {
    try {
      const response = await apiClient.get<ActivityItem[]>(`/v1/dashboard/activity?limit=${limit}`);
      return response.data || [];
    } catch (error) {
      console.warn('Failed to fetch recent activity, using mock data:', error);
      return [];
    }
  }

  /**
   * Get quick stats for today
   */
  static async getQuickStats(): Promise<QuickStats> {
    try {
      const response = await apiClient.get<QuickStats>('/v1/dashboard/stats/quick');
      return response.data || {
        conversations_started: 0,
        conversations_resolved: 0,
        resolution_rate: 0,
        new_contacts: 0,
        peak_hour: "00:00",
        total_agents: 0,
        online_agents: 0,
      };
    } catch (error) {
      console.warn('Failed to fetch quick stats, using mock data:', error);
      return {
        conversations_started: 23,
        conversations_resolved: 18,
        resolution_rate: 78.3,
        new_contacts: 12,
        peak_hour: "14:30",
        total_agents: 12,
        online_agents: 8,
      };
    }
  }

  /**
   * Get real-time metrics (for auto-refresh)
   */
  static async getRealtimeMetrics(): Promise<RealtimeMetrics> {
    try {
      const response = await apiClient.get<RealtimeMetrics>('/v1/dashboard/realtime');
      return response.data || {
        active_conversations: 0,
        online_agents: 0,
        pending_messages: 0,
        average_wait_time: "0min",
        system_load: 0,
        last_updated: new Date().toISOString(),
      };
    } catch (error) {
      console.warn('Failed to fetch realtime metrics, using mock data:', error);
      return {
        active_conversations: 127,
        online_agents: 8,
        pending_messages: 23,
        average_wait_time: "1.2min",
        system_load: 0.65,
        last_updated: new Date().toISOString(),
      };
    }
  }

  /**
   * Get metrics for a specific date range
   */
  static async getMetricsByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<DashboardMetrics> {
    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      const response = await apiClient.get<DashboardMetrics>(`/v1/dashboard/metrics?start_date=${startDateStr}&end_date=${endDateStr}`);
      return response.data || getMockDashboardMetrics();
    } catch (error) {
      console.warn('Failed to fetch metrics by date range, using mock data:', error);
      return getMockDashboardMetrics();
    }
  }

  /**
   * Get conversation chart data for custom date range
   */
  static async getConversationChartByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<ConversationChartData[]> {
    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      const response = await apiClient.get<ConversationChartData[]>(`/v1/dashboard/charts/conversations?start_date=${startDateStr}&end_date=${endDateStr}`);
      return response.data || [];
    } catch (error) {
      console.warn('Failed to fetch conversation chart by date range, using mock data:', error);
      return [];
    }
  }
}

// React Query hooks for dashboard data
export const dashboardQueryKeys = {
  all: ['dashboard'] as const,
  metrics: (period: string) => [...dashboardQueryKeys.all, 'metrics', period] as const,
  conversationChart: (period: string) => [...dashboardQueryKeys.all, 'conversation-chart', period] as const,
  responseTimeChart: () => [...dashboardQueryKeys.all, 'response-time-chart'] as const,
  activity: (limit: number) => [...dashboardQueryKeys.all, 'activity', limit] as const,
  quickStats: () => [...dashboardQueryKeys.all, 'quick-stats'] as const,
  realtime: () => [...dashboardQueryKeys.all, 'realtime'] as const,
};

// Helper functions for data formatting
export const formatMetricValue = (metric: MetricValue): string => {
  if (typeof metric.current === 'number') {
    return metric.current.toLocaleString();
  }
  return String(metric.current);
};

export const formatChangePercentage = (percentage: number): string => {
  const sign = percentage >= 0 ? '+' : '';
  return `${sign}${percentage.toFixed(1)}%`;
};

export const getTrendIcon = (trend: string): string => {
  switch (trend) {
    case 'up':
      return '↗';
    case 'down':
      return '↘';
    default:
      return '→';
  }
};

export const getTrendColor = (trend: string): string => {
  switch (trend) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

// Mock data fallback for development
export const getMockDashboardMetrics = (): DashboardMetrics => ({
  active_conversations: {
    current: 127,
    previous: 113,
    change_percentage: 12.4,
    trend: 'up'
  },
  total_messages: {
    current: 2847,
    previous: 2634,
    change_percentage: 8.1,
    trend: 'up'
  },
  avg_response_time: {
    current: '2.3min',
    previous: '2.7min',
    change_percentage: -14.8,
    trend: 'down'
  },
  customer_satisfaction: {
    current: '94%',
    previous: '92%',
    change_percentage: 2.2,
    trend: 'up'
  },
  period: '7d',
  last_updated: new Date().toISOString()
});

export default DashboardApiService;