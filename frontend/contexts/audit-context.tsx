'use client'

import { createContext, useContext, useCallback, ReactNode } from 'react'
import { useAuditLog, AuditLogEntry } from '@/lib/hooks/useAuditLog'

interface AuditContextType {
  // Basic logging functions
  logAction: (
    action: string,
    category: AuditLogEntry['category'],
    resource: string,
    details?: Record<string, any>,
    resourceId?: string
  ) => Promise<void>
  
  // Convenient logging functions for common scenarios
  logUserAction: (action: string, details?: Record<string, any>) => Promise<void>
  logConversationAction: (action: string, conversationId: string, details?: Record<string, any>) => Promise<void>
  logFlowAction: (action: string, flowId: string, details?: Record<string, any>) => Promise<void>
  logContactAction: (action: string, contactId: string, details?: Record<string, any>) => Promise<void>
  logCampaignAction: (action: string, campaignId: string, details?: Record<string, any>) => Promise<void>
  logSettingsAction: (action: string, setting: string, details?: Record<string, any>) => Promise<void>
  logSecurityAction: (action: string, details?: Record<string, any>) => Promise<void>
  logDataAction: (action: string, dataType: string, details?: Record<string, any>) => Promise<void>
  logAIAction: (action: string, aiType: string, details?: Record<string, any>) => Promise<void>
  logSystemAction: (action: string, details?: Record<string, any>) => Promise<void>
  
  // Navigation tracking
  logPageView: (pagePath: string, pageTitle?: string) => Promise<void>
  
  // Error tracking
  logError: (error: string | Error, context?: Record<string, any>) => Promise<void>
  
  // Performance tracking
  logPerformance: (action: string, duration: number, details?: Record<string, any>) => Promise<void>
}

const AuditContext = createContext<AuditContextType | undefined>(undefined)

interface AuditProviderProps {
  children: ReactNode
}

export function AuditProvider({ children }: AuditProviderProps) {
  const { logAction: baseLogAction } = useAuditLog()

  // Enhanced logging with additional context
  const logAction = useCallback(async (
    action: string,
    category: AuditLogEntry['category'],
    resource: string,
    details: Record<string, any> = {},
    resourceId?: string
  ) => {
    const enhancedDetails = {
      ...details,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent
    }

    await baseLogAction(action, category, resource, enhancedDetails, resourceId)
  }, [baseLogAction])

  // Convenient logging functions
  const logUserAction = useCallback(async (action: string, details: Record<string, any> = {}) => {
    await logAction(action, 'authentication', 'user', details)
  }, [logAction])

  const logConversationAction = useCallback(async (
    action: string, 
    conversationId: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'conversation', 'conversation', details, conversationId)
  }, [logAction])

  const logFlowAction = useCallback(async (
    action: string, 
    flowId: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'flow', 'flow', details, flowId)
  }, [logAction])

  const logContactAction = useCallback(async (
    action: string, 
    contactId: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'contact', 'contact', details, contactId)
  }, [logAction])

  const logCampaignAction = useCallback(async (
    action: string, 
    campaignId: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'campaign', 'campaign', details, campaignId)
  }, [logAction])

  const logSettingsAction = useCallback(async (
    action: string, 
    setting: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'settings', setting, details)
  }, [logAction])

  const logSecurityAction = useCallback(async (
    action: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'security', 'security_event', details)
  }, [logAction])

  const logDataAction = useCallback(async (
    action: string, 
    dataType: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'data', dataType, details)
  }, [logAction])

  const logAIAction = useCallback(async (
    action: string, 
    aiType: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'ai', aiType, details)
  }, [logAction])

  const logSystemAction = useCallback(async (
    action: string, 
    details: Record<string, any> = {}
  ) => {
    await logAction(action, 'system', 'system_event', details)
  }, [logAction])

  // Navigation tracking
  const logPageView = useCallback(async (pagePath: string, pageTitle?: string) => {
    await logAction('page_view', 'system', 'navigation', {
      path: pagePath,
      title: pageTitle || document.title,
      referrer: document.referrer
    })
  }, [logAction])

  // Error tracking
  const logError = useCallback(async (error: string | Error, context: Record<string, any> = {}) => {
    const errorDetails = {
      message: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      ...context
    }

    await logAction('error', 'system', 'error', errorDetails)
  }, [logAction])

  // Performance tracking
  const logPerformance = useCallback(async (
    action: string, 
    duration: number, 
    details: Record<string, any> = {}
  ) => {
    await logAction('performance', 'system', action, {
      duration,
      ...details
    })
  }, [logAction])

  const contextValue: AuditContextType = {
    logAction,
    logUserAction,
    logConversationAction,
    logFlowAction,
    logContactAction,
    logCampaignAction,
    logSettingsAction,
    logSecurityAction,
    logDataAction,
    logAIAction,
    logSystemAction,
    logPageView,
    logError,
    logPerformance
  }

  return (
    <AuditContext.Provider value={contextValue}>
      {children}
    </AuditContext.Provider>
  )
}

export function useAuditContext() {
  const context = useContext(AuditContext)
  if (!context) {
    throw new Error('useAuditContext must be used within an AuditProvider')
  }
  return context
}

// High-order component for automatic page view tracking
export function withAuditTracking<T extends {}>(
  WrappedComponent: React.ComponentType<T>,
  pageName: string
) {
  return function AuditTrackedComponent(props: T) {
    const { logPageView } = useAuditContext()

    React.useEffect(() => {
      logPageView(window.location.pathname, pageName)
    }, [logPageView])

    return <WrappedComponent {...props} />
  }
}

// Hook for performance tracking
export function usePerformanceTracking() {
  const { logPerformance } = useAuditContext()

  const trackOperation = useCallback(async <T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<T> => {
    const startTime = performance.now()
    
    try {
      const result = await operation()
      const duration = performance.now() - startTime
      
      await logPerformance(operationName, duration, {
        status: 'success',
        ...context
      })
      
      return result
    } catch (error) {
      const duration = performance.now() - startTime
      
      await logPerformance(operationName, duration, {
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
        ...context
      })
      
      throw error
    }
  }, [logPerformance])

  return { trackOperation }
}

// Hook for error boundary integration
export function useErrorTracking() {
  const { logError } = useAuditContext()

  const trackError = useCallback((error: Error, errorInfo?: any) => {
    logError(error, {
      componentStack: errorInfo?.componentStack,
      errorBoundary: true
    })
  }, [logError])

  return { trackError }
}