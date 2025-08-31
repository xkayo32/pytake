'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthContext } from '@/contexts/auth-context'

export interface AuditLogEntry {
  id: string
  timestamp: Date
  userId: string
  userEmail: string
  userName: string
  action: string
  category: 'authentication' | 'conversation' | 'flow' | 'contact' | 'campaign' | 'settings' | 'system' | 'security' | 'data' | 'ai'
  resource: string
  resourceId?: string
  details: Record<string, any>
  metadata: {
    ipAddress: string
    userAgent: string
    sessionId: string
    location?: {
      country: string
      region: string
      city: string
    }
    device: {
      type: 'desktop' | 'mobile' | 'tablet'
      os: string
      browser: string
    }
  }
  severity: 'info' | 'warning' | 'error' | 'critical'
  status: 'success' | 'failure' | 'pending'
  duration?: number // in milliseconds
  changes?: {
    before?: any
    after?: any
    fields?: string[]
  }
}

export interface AuditFilters {
  dateRange: {
    start: Date | null
    end: Date | null
  }
  users: string[]
  categories: AuditLogEntry['category'][]
  actions: string[]
  severity: AuditLogEntry['severity'][]
  status: AuditLogEntry['status'][]
  search: string
  resourceId?: string
}

export interface AuditStats {
  totalEntries: number
  entriesByCategory: Record<AuditLogEntry['category'], number>
  entriesBySeverity: Record<AuditLogEntry['severity'], number>
  topUsers: { userId: string; userName: string; count: number }[]
  topActions: { action: string; count: number }[]
  securityAlerts: number
  failureRate: number
  averageSessionDuration: number
  uniqueUsers: number
  peakActivity: {
    hour: number
    count: number
  }
}

export interface SecurityAlert {
  id: string
  timestamp: Date
  type: 'suspicious_activity' | 'multiple_failures' | 'unusual_access' | 'data_breach' | 'privilege_escalation'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  description: string
  userId?: string
  relatedEntries: string[]
  status: 'open' | 'investigating' | 'resolved' | 'false_positive'
  assignedTo?: string
}

const DEFAULT_FILTERS: AuditFilters = {
  dateRange: {
    start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
    end: new Date()
  },
  users: [],
  categories: [],
  actions: [],
  severity: [],
  status: [],
  search: '',
}

export function useAuditLog() {
  const { user } = useAuthContext()
  const [entries, setEntries] = useState<AuditLogEntry[]>([])
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS)
  const [stats, setStats] = useState<AuditStats | null>(null)
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [realTimeEnabled, setRealTimeEnabled] = useState(true)

  const wsRef = useRef<WebSocket | null>(null)

  // Generate mock data for demonstration
  const generateMockData = useCallback(() => {
    const categories: AuditLogEntry['category'][] = [
      'authentication', 'conversation', 'flow', 'contact', 'campaign', 'settings', 'system', 'security', 'data', 'ai'
    ]
    
    const actions = {
      authentication: ['login', 'logout', 'password_change', 'password_reset', 'two_factor_enable'],
      conversation: ['view', 'create', 'update', 'delete', 'assign', 'transfer', 'archive'],
      flow: ['create', 'edit', 'delete', 'test', 'deploy', 'pause'],
      contact: ['create', 'update', 'delete', 'import', 'export', 'merge'],
      campaign: ['create', 'edit', 'delete', 'send', 'schedule', 'pause'],
      settings: ['update', 'backup', 'restore', 'integration_add', 'integration_remove'],
      system: ['backup', 'restore', 'update', 'maintenance', 'cleanup'],
      security: ['permission_change', 'role_update', 'api_key_create', 'api_key_revoke'],
      data: ['export', 'import', 'delete', 'backup', 'restore'],
      ai: ['analysis', 'suggestion', 'alert', 'training', 'configuration']
    }

    const mockEntries: AuditLogEntry[] = []
    
    for (let i = 0; i < 150; i++) {
      const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
      const category = categories[Math.floor(Math.random() * categories.length)]
      const categoryActions = actions[category]
      const action = categoryActions[Math.floor(Math.random() * categoryActions.length)]
      const userId = `user-${Math.floor(Math.random() * 10) + 1}`
      const severity: AuditLogEntry['severity'] = 
        Math.random() > 0.9 ? 'critical' :
        Math.random() > 0.8 ? 'error' :
        Math.random() > 0.6 ? 'warning' : 'info'
      
      const status: AuditLogEntry['status'] = 
        severity === 'critical' || severity === 'error' ? 
          (Math.random() > 0.3 ? 'failure' : 'success') : 
          (Math.random() > 0.05 ? 'success' : 'failure')

      mockEntries.push({
        id: `audit-${i + 1}`,
        timestamp,
        userId,
        userEmail: `user${userId.split('-')[1]}@empresa.com`,
        userName: `Usuário ${userId.split('-')[1]}`,
        action,
        category,
        resource: `${category}_resource`,
        resourceId: `res-${Math.random().toString(36).substring(2, 7)}`,
        details: {
          description: `${action.charAt(0).toUpperCase() + action.slice(1).replace('_', ' ')} executado em ${category}`,
          parameters: {
            target: `${category}-item-${Math.random().toString(36).substring(2, 5)}`,
            method: ['GET', 'POST', 'PUT', 'DELETE'][Math.floor(Math.random() * 4)]
          }
        },
        metadata: {
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          sessionId: `session-${Math.random().toString(36).substring(2, 10)}`,
          location: {
            country: ['Brasil', 'Estados Unidos', 'Reino Unido'][Math.floor(Math.random() * 3)],
            region: ['SP', 'RJ', 'MG'][Math.floor(Math.random() * 3)],
            city: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte'][Math.floor(Math.random() * 3)]
          },
          device: {
            type: ['desktop', 'mobile', 'tablet'][Math.floor(Math.random() * 3)] as any,
            os: ['Windows 10', 'macOS', 'iOS', 'Android'][Math.floor(Math.random() * 4)],
            browser: ['Chrome', 'Firefox', 'Safari', 'Edge'][Math.floor(Math.random() * 4)]
          }
        },
        severity,
        status,
        duration: Math.floor(Math.random() * 5000) + 100, // 100ms to 5s
        changes: status === 'success' && action.includes('update') ? {
          before: { status: 'inactive', value: 'old_value' },
          after: { status: 'active', value: 'new_value' },
          fields: ['status', 'value']
        } : undefined
      })
    }

    return mockEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [])

  // Generate mock security alerts
  const generateMockAlerts = useCallback(() => {
    const alertTypes: SecurityAlert['type'][] = [
      'suspicious_activity', 'multiple_failures', 'unusual_access', 'data_breach', 'privilege_escalation'
    ]

    const alerts: SecurityAlert[] = []

    for (let i = 0; i < 8; i++) {
      const type = alertTypes[Math.floor(Math.random() * alertTypes.length)]
      const severity: SecurityAlert['severity'] = 
        Math.random() > 0.8 ? 'critical' :
        Math.random() > 0.6 ? 'high' :
        Math.random() > 0.4 ? 'medium' : 'low'

      alerts.push({
        id: `alert-${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        type,
        severity,
        title: `${type.replace('_', ' ').toUpperCase()} detectado`,
        description: `Atividade suspeita detectada no sistema relacionada a ${type.replace('_', ' ')}`,
        userId: Math.random() > 0.5 ? `user-${Math.floor(Math.random() * 10) + 1}` : undefined,
        relatedEntries: [`audit-${Math.floor(Math.random() * 150) + 1}`],
        status: ['open', 'investigating', 'resolved', 'false_positive'][Math.floor(Math.random() * 4)] as any
      })
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [])

  // Calculate statistics
  const calculateStats = useCallback((entries: AuditLogEntry[]): AuditStats => {
    const entriesByCategory = entries.reduce((acc, entry) => {
      acc[entry.category] = (acc[entry.category] || 0) + 1
      return acc
    }, {} as Record<AuditLogEntry['category'], number>)

    const entriesBySeverity = entries.reduce((acc, entry) => {
      acc[entry.severity] = (acc[entry.severity] || 0) + 1
      return acc
    }, {} as Record<AuditLogEntry['severity'], number>)

    const userCounts = entries.reduce((acc, entry) => {
      const key = entry.userId
      if (!acc[key]) {
        acc[key] = { userId: entry.userId, userName: entry.userName, count: 0 }
      }
      acc[key].count++
      return acc
    }, {} as Record<string, { userId: string; userName: string; count: number }>)

    const actionCounts = entries.reduce((acc, entry) => {
      acc[entry.action] = (acc[entry.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const failures = entries.filter(e => e.status === 'failure').length
    const totalDuration = entries.reduce((sum, e) => sum + (e.duration || 0), 0)
    const uniqueUserIds = new Set(entries.map(e => e.userId)).size

    // Peak activity by hour
    const hourlyCounts = entries.reduce((acc, entry) => {
      const hour = entry.timestamp.getHours()
      acc[hour] = (acc[hour] || 0) + 1
      return acc
    }, {} as Record<number, number>)

    const peakActivity = Object.entries(hourlyCounts)
      .reduce((max, [hour, count]) => 
        count > max.count ? { hour: parseInt(hour), count } : max
      , { hour: 0, count: 0 })

    return {
      totalEntries: entries.length,
      entriesByCategory,
      entriesBySeverity,
      topUsers: Object.values(userCounts).sort((a, b) => b.count - a.count).slice(0, 10),
      topActions: Object.entries(actionCounts)
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      securityAlerts: entriesBySeverity.critical + entriesBySeverity.error,
      failureRate: entries.length > 0 ? (failures / entries.length) * 100 : 0,
      averageSessionDuration: entries.length > 0 ? totalDuration / entries.length : 0,
      uniqueUsers: uniqueUserIds,
      peakActivity
    }
  }, [])

  // Load audit data
  const loadAuditData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // In a real app, this would be an API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockEntries = generateMockData()
      const mockAlerts = generateMockAlerts()
      
      setEntries(mockEntries)
      setSecurityAlerts(mockAlerts)
      setStats(calculateStats(mockEntries))

    } catch (error: any) {
      setError(error.message)
      console.error('Error loading audit data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [generateMockData, generateMockAlerts, calculateStats])

  // Filter entries based on current filters
  const filteredEntries = useCallback(() => {
    return entries.filter(entry => {
      // Date range filter
      if (filters.dateRange.start && entry.timestamp < filters.dateRange.start) return false
      if (filters.dateRange.end && entry.timestamp > filters.dateRange.end) return false

      // User filter
      if (filters.users.length > 0 && !filters.users.includes(entry.userId)) return false

      // Category filter
      if (filters.categories.length > 0 && !filters.categories.includes(entry.category)) return false

      // Action filter
      if (filters.actions.length > 0 && !filters.actions.includes(entry.action)) return false

      // Severity filter
      if (filters.severity.length > 0 && !filters.severity.includes(entry.severity)) return false

      // Status filter
      if (filters.status.length > 0 && !filters.status.includes(entry.status)) return false

      // Resource ID filter
      if (filters.resourceId && entry.resourceId !== filters.resourceId) return false

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        return (
          entry.action.toLowerCase().includes(searchLower) ||
          entry.resource.toLowerCase().includes(searchLower) ||
          entry.userName.toLowerCase().includes(searchLower) ||
          entry.userEmail.toLowerCase().includes(searchLower) ||
          JSON.stringify(entry.details).toLowerCase().includes(searchLower)
        )
      }

      return true
    })
  }, [entries, filters])

  // Real-time WebSocket connection
  const connectWebSocket = useCallback(() => {
    if (!realTimeEnabled) return

    try {
      // In a real app, this would connect to your WebSocket server
      // For demo, we'll simulate new entries
      const interval = setInterval(() => {
        if (Math.random() > 0.7) { // 30% chance every 10 seconds
          const mockEntries = generateMockData()
          const newEntry = mockEntries[0] // Get a fresh entry
          newEntry.id = `audit-real-${Date.now()}`
          newEntry.timestamp = new Date()
          
          setEntries(prev => [newEntry, ...prev.slice(0, 199)]) // Keep last 200
        }
      }, 10000)

      wsRef.current = { close: () => clearInterval(interval) } as any

    } catch (error) {
      console.error('WebSocket connection failed:', error)
    }
  }, [realTimeEnabled, generateMockData])

  // Log action (for other components to use)
  const logAction = useCallback(async (
    action: string,
    category: AuditLogEntry['category'],
    resource: string,
    details: Record<string, any> = {},
    resourceId?: string
  ) => {
    if (!user) return

    const entry: Omit<AuditLogEntry, 'id' | 'timestamp'> = {
      userId: user.id,
      userEmail: user.email,
      userName: user.name || user.email,
      action,
      category,
      resource,
      resourceId,
      details,
      metadata: {
        ipAddress: 'Unknown', // Would be detected server-side
        userAgent: navigator.userAgent,
        sessionId: sessionStorage.getItem('session-id') || 'unknown',
        device: {
          type: /Mobile/.test(navigator.userAgent) ? 'mobile' : 'desktop',
          os: navigator.platform,
          browser: navigator.userAgent.split(' ')[0]
        }
      },
      severity: 'info',
      status: 'success'
    }

    // In a real app, this would send to the API
    console.log('Audit log entry:', entry)

    // Add to local state for immediate feedback
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-local-${Date.now()}`,
      timestamp: new Date()
    }
    
    setEntries(prev => [newEntry, ...prev])
  }, [user])

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<AuditFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [])

  // Export audit data
  const exportAuditData = useCallback(async (format: 'json' | 'csv' = 'json') => {
    const filtered = filteredEntries()
    
    if (format === 'json') {
      const dataStr = JSON.stringify(filtered, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.json`
      link.click()
      URL.revokeObjectURL(url)
    } else {
      // CSV format
      const headers = ['Timestamp', 'User', 'Action', 'Category', 'Resource', 'Status', 'Severity']
      const rows = filtered.map(entry => [
        entry.timestamp.toISOString(),
        entry.userName,
        entry.action,
        entry.category,
        entry.resource,
        entry.status,
        entry.severity
      ])
      
      const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n')
      const dataBlob = new Blob([csvContent], { type: 'text/csv' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(url)
    }
  }, [filteredEntries])

  // Initialize
  useEffect(() => {
    loadAuditData()
  }, [loadAuditData])

  // Setup WebSocket
  useEffect(() => {
    connectWebSocket()
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [connectWebSocket])

  return {
    // Data
    entries: filteredEntries(),
    allEntries: entries,
    securityAlerts,
    stats,
    filters,

    // State
    isLoading,
    error,
    realTimeEnabled,

    // Actions
    loadAuditData,
    logAction,
    updateFilters,
    clearFilters,
    exportAuditData,
    setRealTimeEnabled,

    // Computed values
    hasEntries: entries.length > 0,
    totalEntries: entries.length,
    filteredCount: filteredEntries().length,
    
    // Security
    criticalAlerts: securityAlerts.filter(a => a.severity === 'critical' && a.status === 'open'),
    openAlerts: securityAlerts.filter(a => a.status === 'open'),
    recentEntries: entries.slice(0, 10),
    
    // Analytics
    failureRate: stats?.failureRate || 0,
    topUsers: stats?.topUsers || [],
    topActions: stats?.topActions || [],
    categoriesCount: Object.keys(stats?.entriesByCategory || {}).length
  }
}