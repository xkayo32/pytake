'use client'

import { useState, useEffect, useCallback } from 'react'

export interface SystemSettings {
  general: {
    companyName: string
    timezone: string
    language: string
    dateFormat: string
    currency: string
    maxFileSize: number // in MB
    sessionTimeout: number // in minutes
    enableMaintenance: boolean
    maintenanceMessage: string
  }
  notifications: {
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
    webhookNotifications: boolean
    notificationRetries: number
    emailFrom: string
    emailReplyTo: string
  }
  whatsapp: {
    instanceName: string
    qrCodeTimeout: number
    messageDelay: number // in milliseconds
    maxRetries: number
    webhookUrl: string
    autoReconnect: boolean
    enableMediaDownload: boolean
    mediaPath: string
    maxMediaSize: number // in MB
  }
  ai: {
    openaiApiKey: string
    openaiModel: string
    maxTokens: number
    temperature: number
    enableFallback: boolean
    fallbackModel: string
    responseTimeout: number // in seconds
    maxConversationHistory: number
    enableSentimentAnalysis: boolean
    autoLearn: boolean
  }
  integrations: {
    erpApiUrl: string
    erpApiKey: string
    erpTimeout: number // in seconds
    erpRetries: number
    webhookSecret: string
    enableCRM: boolean
    crmApiUrl: string
    crmApiKey: string
    enableAnalytics: boolean
    analyticsId: string
  }
  security: {
    enableTwoFactor: boolean
    passwordMinLength: number
    passwordRequireSpecialChars: boolean
    passwordRequireNumbers: boolean
    passwordRequireUppercase: boolean
    maxLoginAttempts: number
    lockoutDuration: number // in minutes
    sessionSecureCookies: boolean
    enableAuditLog: boolean
    auditLogRetention: number // in days
    enableRateLimiting: boolean
    rateLimitRequests: number
    rateLimitWindow: number // in minutes
    enableIPWhitelist: boolean
    ipWhitelist: string[]
    enableCSRF: boolean
  }
  performance: {
    enableCaching: boolean
    cacheTimeout: number // in minutes
    enableCompression: boolean
    compressionLevel: number
    maxConcurrentConnections: number
    enableCDN: boolean
    cdnUrl: string
    enableImageOptimization: boolean
    imageQuality: number
    enableLazyLoading: boolean
  }
  backup: {
    enableAutoBackup: boolean
    backupFrequency: 'daily' | 'weekly' | 'monthly'
    backupTime: string // HH:MM format
    maxBackupFiles: number
    backupLocation: 'local' | 's3' | 'gcp' | 'azure'
    s3Bucket?: string
    s3Region?: string
    s3AccessKey?: string
    s3SecretKey?: string
    enableEncryption: boolean
    compressionEnabled: boolean
    excludeFiles: string[]
  }
  monitoring: {
    enableHealthCheck: boolean
    healthCheckInterval: number // in minutes
    enableMetrics: boolean
    metricsRetention: number // in days
    enableAlerts: boolean
    alertEmail: string
    alertThresholds: {
      cpuUsage: number
      memoryUsage: number
      diskUsage: number
      responseTime: number
      errorRate: number
    }
    enableUptime: boolean
    uptimeUrl: string
  }
  advanced: {
    debugMode: boolean
    logLevel: 'debug' | 'info' | 'warn' | 'error'
    maxLogSize: number // in MB
    enableProfiler: boolean
    customCSS: string
    customJS: string
    apiRateLimit: number
    webhookTimeout: number // in seconds
    enableExperimentalFeatures: boolean
    featureFlags: Record<string, boolean>
  }
}

export interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  uptime: number
  cpu: number
  memory: number
  disk: number
  connections: number
  responseTime: number
  errors: number
  lastCheck: Date
  services: {
    name: string
    status: 'up' | 'down' | 'degraded'
    responseTime: number
    lastCheck: Date
  }[]
}

export interface SettingsValidation {
  isValid: boolean
  errors: Record<string, string>
  warnings: Record<string, string>
}

export function useSystemSettings() {
  const [settings, setSettings] = useState<SystemSettings | null>(null)
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [validation, setValidation] = useState<SettingsValidation>({ 
    isValid: true, 
    errors: {}, 
    warnings: {} 
  })

  // Default settings
  const defaultSettings: SystemSettings = {
    general: {
      companyName: 'PyTake WhatsApp',
      timezone: 'America/Sao_Paulo',
      language: 'pt-BR',
      dateFormat: 'dd/MM/yyyy',
      currency: 'BRL',
      maxFileSize: 10,
      sessionTimeout: 120,
      enableMaintenance: false,
      maintenanceMessage: 'Sistema em manutenção. Volte em breve.'
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      webhookNotifications: true,
      notificationRetries: 3,
      emailFrom: 'noreply@pytake.com',
      emailReplyTo: 'support@pytake.com'
    },
    whatsapp: {
      instanceName: 'PyTake Instance',
      qrCodeTimeout: 60,
      messageDelay: 1000,
      maxRetries: 3,
      webhookUrl: '',
      autoReconnect: true,
      enableMediaDownload: true,
      mediaPath: '/uploads/media',
      maxMediaSize: 16
    },
    ai: {
      openaiApiKey: '',
      openaiModel: 'gpt-4',
      maxTokens: 2048,
      temperature: 0.7,
      enableFallback: true,
      fallbackModel: 'gpt-3.5-turbo',
      responseTimeout: 30,
      maxConversationHistory: 10,
      enableSentimentAnalysis: true,
      autoLearn: false
    },
    integrations: {
      erpApiUrl: '',
      erpApiKey: '',
      erpTimeout: 30,
      erpRetries: 3,
      webhookSecret: '',
      enableCRM: false,
      crmApiUrl: '',
      crmApiKey: '',
      enableAnalytics: false,
      analyticsId: ''
    },
    security: {
      enableTwoFactor: false,
      passwordMinLength: 8,
      passwordRequireSpecialChars: true,
      passwordRequireNumbers: true,
      passwordRequireUppercase: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      sessionSecureCookies: true,
      enableAuditLog: true,
      auditLogRetention: 90,
      enableRateLimiting: true,
      rateLimitRequests: 100,
      rateLimitWindow: 15,
      enableIPWhitelist: false,
      ipWhitelist: [],
      enableCSRF: true
    },
    performance: {
      enableCaching: true,
      cacheTimeout: 30,
      enableCompression: true,
      compressionLevel: 6,
      maxConcurrentConnections: 100,
      enableCDN: false,
      cdnUrl: '',
      enableImageOptimization: true,
      imageQuality: 85,
      enableLazyLoading: true
    },
    backup: {
      enableAutoBackup: true,
      backupFrequency: 'daily',
      backupTime: '02:00',
      maxBackupFiles: 7,
      backupLocation: 'local',
      enableEncryption: true,
      compressionEnabled: true,
      excludeFiles: ['*.log', 'temp/*', 'cache/*']
    },
    monitoring: {
      enableHealthCheck: true,
      healthCheckInterval: 5,
      enableMetrics: true,
      metricsRetention: 30,
      enableAlerts: true,
      alertEmail: 'admin@pytake.com',
      alertThresholds: {
        cpuUsage: 80,
        memoryUsage: 85,
        diskUsage: 90,
        responseTime: 2000,
        errorRate: 5
      },
      enableUptime: false,
      uptimeUrl: ''
    },
    advanced: {
      debugMode: false,
      logLevel: 'info',
      maxLogSize: 100,
      enableProfiler: false,
      customCSS: '',
      customJS: '',
      apiRateLimit: 1000,
      webhookTimeout: 30,
      enableExperimentalFeatures: false,
      featureFlags: {
        newDashboard: false,
        betaFeatures: false,
        experimentalAI: false
      }
    }
  }

  // Mock system health data
  const mockHealth: SystemHealth = {
    status: 'healthy',
    uptime: 86400 * 7, // 7 days
    cpu: Math.random() * 20 + 10,
    memory: Math.random() * 30 + 40,
    disk: Math.random() * 20 + 30,
    connections: Math.floor(Math.random() * 50 + 10),
    responseTime: Math.random() * 200 + 100,
    errors: Math.floor(Math.random() * 5),
    lastCheck: new Date(),
    services: [
      {
        name: 'Database',
        status: 'up',
        responseTime: Math.random() * 50 + 20,
        lastCheck: new Date()
      },
      {
        name: 'WhatsApp API',
        status: 'up',
        responseTime: Math.random() * 100 + 50,
        lastCheck: new Date()
      },
      {
        name: 'AI Service',
        status: Math.random() > 0.1 ? 'up' : 'degraded',
        responseTime: Math.random() * 200 + 100,
        lastCheck: new Date()
      },
      {
        name: 'File Storage',
        status: 'up',
        responseTime: Math.random() * 30 + 10,
        lastCheck: new Date()
      },
      {
        name: 'Email Service',
        status: Math.random() > 0.05 ? 'up' : 'down',
        responseTime: Math.random() * 500 + 200,
        lastCheck: new Date()
      }
    ]
  }

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Simular carregamento das configurações
        await new Promise(resolve => setTimeout(resolve, 1000))
        setSettings(defaultSettings)
        setHealth(mockHealth)
      } catch (error) {
        console.error('Error loading system settings:', error)
        setSettings(defaultSettings)
      } finally {
        setIsLoading(false)
      }
    }

    loadSettings()
  }, [])

  // Update health data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (health) {
        const updatedHealth = {
          ...health,
          cpu: Math.max(0, Math.min(100, health.cpu + (Math.random() - 0.5) * 10)),
          memory: Math.max(0, Math.min(100, health.memory + (Math.random() - 0.5) * 5)),
          connections: Math.max(0, health.connections + Math.floor((Math.random() - 0.5) * 10)),
          responseTime: Math.max(50, health.responseTime + (Math.random() - 0.5) * 100),
          errors: Math.max(0, health.errors + (Math.random() > 0.8 ? 1 : 0)),
          lastCheck: new Date(),
          services: health.services.map(service => ({
            ...service,
            responseTime: Math.max(10, service.responseTime + (Math.random() - 0.5) * 50),
            status: Math.random() > 0.05 ? service.status : 
                   service.status === 'up' ? 'degraded' : 
                   service.status === 'degraded' ? 'up' : service.status,
            lastCheck: new Date()
          }))
        }
        
        // Update overall status based on metrics
        if (updatedHealth.cpu > 90 || updatedHealth.memory > 95 || 
            updatedHealth.services.some(s => s.status === 'down')) {
          updatedHealth.status = 'critical'
        } else if (updatedHealth.cpu > 80 || updatedHealth.memory > 85 || 
                   updatedHealth.services.some(s => s.status === 'degraded')) {
          updatedHealth.status = 'warning'
        } else {
          updatedHealth.status = 'healthy'
        }
        
        setHealth(updatedHealth)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [health])

  // Validate settings
  const validateSettings = useCallback((settings: SystemSettings): SettingsValidation => {
    const errors: Record<string, string> = {}
    const warnings: Record<string, string> = {}

    // General validations
    if (!settings.general.companyName.trim()) {
      errors['general.companyName'] = 'Nome da empresa é obrigatório'
    }
    if (settings.general.maxFileSize < 1 || settings.general.maxFileSize > 100) {
      errors['general.maxFileSize'] = 'Tamanho máximo deve estar entre 1MB e 100MB'
    }
    if (settings.general.sessionTimeout < 15) {
      warnings['general.sessionTimeout'] = 'Timeout muito baixo pode causar desconexões frequentes'
    }

    // AI validations
    if (settings.ai.openaiApiKey && !settings.ai.openaiApiKey.startsWith('sk-')) {
      errors['ai.openaiApiKey'] = 'Chave da API OpenAI inválida'
    }
    if (settings.ai.maxTokens < 100 || settings.ai.maxTokens > 4000) {
      errors['ai.maxTokens'] = 'Tokens deve estar entre 100 e 4000'
    }
    if (settings.ai.temperature < 0 || settings.ai.temperature > 2) {
      errors['ai.temperature'] = 'Temperatura deve estar entre 0 e 2'
    }

    // Security validations
    if (settings.security.passwordMinLength < 6) {
      warnings['security.passwordMinLength'] = 'Senhas muito curtas podem ser inseguras'
    }
    if (settings.security.maxLoginAttempts < 3) {
      warnings['security.maxLoginAttempts'] = 'Poucos tentativas podem bloquear usuários legítimos'
    }

    // WhatsApp validations
    if (settings.whatsapp.messageDelay < 500) {
      warnings['whatsapp.messageDelay'] = 'Delay muito baixo pode causar bloqueio do WhatsApp'
    }
    if (settings.whatsapp.maxMediaSize > 64) {
      warnings['whatsapp.maxMediaSize'] = 'WhatsApp tem limite de 64MB para mídias'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    }
  }, [])

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<SystemSettings>) => {
    if (!settings) return

    const updatedSettings = { ...settings, ...newSettings }
    const validation = validateSettings(updatedSettings)
    
    setSettings(updatedSettings)
    setValidation(validation)
    setHasUnsavedChanges(true)
  }, [settings, validateSettings])

  // Save settings
  const saveSettings = useCallback(async () => {
    if (!settings || !validation.isValid) return false

    setIsSaving(true)
    try {
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 1500))
      setLastSaved(new Date())
      setHasUnsavedChanges(false)
      return true
    } catch (error) {
      console.error('Error saving settings:', error)
      return false
    } finally {
      setIsSaving(false)
    }
  }, [settings, validation.isValid])

  // Reset settings to default
  const resetSettings = useCallback(() => {
    setSettings(defaultSettings)
    setValidation({ isValid: true, errors: {}, warnings: {} })
    setHasUnsavedChanges(true)
  }, [])

  // Export settings
  const exportSettings = useCallback(() => {
    if (!settings) return null

    const sanitizedSettings = { ...settings }
    // Remove sensitive data from export
    sanitizedSettings.ai.openaiApiKey = sanitizedSettings.ai.openaiApiKey ? '***' : ''
    sanitizedSettings.integrations.erpApiKey = sanitizedSettings.integrations.erpApiKey ? '***' : ''
    sanitizedSettings.integrations.crmApiKey = sanitizedSettings.integrations.crmApiKey ? '***' : ''
    sanitizedSettings.integrations.webhookSecret = sanitizedSettings.integrations.webhookSecret ? '***' : ''
    
    if (sanitizedSettings.backup.s3AccessKey) sanitizedSettings.backup.s3AccessKey = '***'
    if (sanitizedSettings.backup.s3SecretKey) sanitizedSettings.backup.s3SecretKey = '***'

    return JSON.stringify(sanitizedSettings, null, 2)
  }, [settings])

  // Import settings
  const importSettings = useCallback(async (settingsJson: string) => {
    try {
      const importedSettings = JSON.parse(settingsJson) as SystemSettings
      const validation = validateSettings(importedSettings)
      
      if (validation.isValid) {
        setSettings(importedSettings)
        setValidation(validation)
        setHasUnsavedChanges(true)
        return { success: true, message: 'Configurações importadas com sucesso' }
      } else {
        return { 
          success: false, 
          message: 'Configurações inválidas: ' + Object.values(validation.errors).join(', ') 
        }
      }
    } catch (error) {
      return { success: false, message: 'Formato JSON inválido' }
    }
  }, [validateSettings])

  // Test connection
  const testConnection = useCallback(async (type: 'whatsapp' | 'ai' | 'erp' | 'email') => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    const success = Math.random() > 0.3
    return {
      success,
      message: success ? 'Conexão estabelecida com sucesso' : 'Falha na conexão',
      details: success ? 'Todos os parâmetros estão corretos' : 'Verifique as configurações'
    }
  }, [])

  return {
    settings,
    health,
    isLoading,
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    validation,
    updateSettings,
    saveSettings,
    resetSettings,
    exportSettings,
    importSettings,
    testConnection
  }
}