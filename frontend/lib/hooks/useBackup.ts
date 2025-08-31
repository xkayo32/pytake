'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface BackupConfig {
  enabled: boolean
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly'
  retention: number // number of backups to keep
  autoCleanup: boolean
  compression: boolean
  encryption: boolean
  storage: {
    local: boolean
    cloud: boolean
    cloudProvider?: 'aws' | 'gcp' | 'azure' | 'dropbox'
    cloudConfig?: Record<string, any>
  }
  include: {
    conversations: boolean
    contacts: boolean
    flows: boolean
    campaigns: boolean
    analytics: boolean
    settings: boolean
    users: boolean
  }
  exclude: string[] // file patterns to exclude
}

export interface BackupItem {
  id: string
  name: string
  timestamp: Date
  size: number
  type: 'manual' | 'automatic'
  status: 'completed' | 'in_progress' | 'failed' | 'corrupted'
  duration: number // in seconds
  location: 'local' | 'cloud'
  checksum: string
  version: string
  includes: string[]
  error?: string
  metadata: {
    conversationsCount?: number
    contactsCount?: number
    flowsCount?: number
    totalSize?: number
    compressedSize?: number
  }
}

export interface RestoreOperation {
  id: string
  backupId: string
  timestamp: Date
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  progress: number
  estimatedTime?: number
  restoreType: 'full' | 'partial'
  selectedItems: string[]
  error?: string
}

const DEFAULT_CONFIG: BackupConfig = {
  enabled: true,
  frequency: 'daily',
  retention: 30,
  autoCleanup: true,
  compression: true,
  encryption: true,
  storage: {
    local: true,
    cloud: false
  },
  include: {
    conversations: true,
    contacts: true,
    flows: true,
    campaigns: true,
    analytics: true,
    settings: true,
    users: false // sensitive data
  },
  exclude: ['*.tmp', '*.log', '*cache*']
}

export function useBackup() {
  const [config, setConfig] = useState<BackupConfig>(DEFAULT_CONFIG)
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [restoreOperations, setRestoreOperations] = useState<RestoreOperation[]>([])
  const [currentBackup, setCurrentBackup] = useState<BackupItem | null>(null)
  const [currentRestore, setCurrentRestore] = useState<RestoreOperation | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastBackupTime, setLastBackupTime] = useState<Date | null>(null)
  const [nextBackupTime, setNextBackupTime] = useState<Date | null>(null)
  const [stats, setStats] = useState<{
    totalBackups: number
    totalSize: number
    successRate: number
    averageDuration: number
    storageUsed: number
    storageLimit: number
  } | null>(null)

  const backupIntervalRef = useRef<NodeJS.Timeout>()
  const checkIntervalRef = useRef<NodeJS.Timeout>()

  // Load configuration and backups
  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Load config from localStorage or API
      const savedConfig = localStorage.getItem('backup-config')
      if (savedConfig) {
        setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(savedConfig) })
      }

      // Generate mock backup history for demonstration
      const mockBackups: BackupItem[] = []
      const now = new Date()
      
      for (let i = 0; i < 15; i++) {
        const backupTime = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000)) // Last 15 days
        const isSuccess = Math.random() > 0.1 // 90% success rate
        const size = Math.floor(Math.random() * 500000000) + 10000000 // 10MB - 500MB
        
        mockBackups.push({
          id: `backup-${i + 1}`,
          name: `Backup ${backupTime.toLocaleDateString('pt-BR')} ${backupTime.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
          timestamp: backupTime,
          size,
          type: i === 0 ? 'manual' : 'automatic',
          status: isSuccess ? 'completed' : (Math.random() > 0.5 ? 'failed' : 'corrupted'),
          duration: Math.floor(Math.random() * 300) + 30, // 30s - 5min
          location: Math.random() > 0.3 ? 'local' : 'cloud',
          checksum: Math.random().toString(36).substring(2, 15),
          version: '2.1.0',
          includes: ['conversations', 'contacts', 'flows'],
          metadata: {
            conversationsCount: Math.floor(Math.random() * 1000) + 100,
            contactsCount: Math.floor(Math.random() * 5000) + 500,
            flowsCount: Math.floor(Math.random() * 50) + 10,
            totalSize: size,
            compressedSize: Math.floor(size * 0.6) // 60% compression
          }
        })
      }

      setBackups(mockBackups)

      // Set last and next backup times
      const lastSuccessfulBackup = mockBackups.find(b => b.status === 'completed')
      if (lastSuccessfulBackup) {
        setLastBackupTime(lastSuccessfulBackup.timestamp)
      }

      // Calculate next backup time based on frequency
      if (lastSuccessfulBackup) {
        const next = new Date(lastSuccessfulBackup.timestamp)
        switch (config.frequency) {
          case 'hourly':
            next.setHours(next.getHours() + 1)
            break
          case 'daily':
            next.setDate(next.getDate() + 1)
            break
          case 'weekly':
            next.setDate(next.getDate() + 7)
            break
          case 'monthly':
            next.setMonth(next.getMonth() + 1)
            break
        }
        setNextBackupTime(next)
      }

      // Calculate stats
      const completedBackups = mockBackups.filter(b => b.status === 'completed')
      const totalSize = completedBackups.reduce((sum, b) => sum + b.size, 0)
      const totalDuration = completedBackups.reduce((sum, b) => sum + b.duration, 0)
      
      setStats({
        totalBackups: mockBackups.length,
        totalSize,
        successRate: (completedBackups.length / mockBackups.length) * 100,
        averageDuration: completedBackups.length > 0 ? totalDuration / completedBackups.length : 0,
        storageUsed: totalSize,
        storageLimit: 10000000000 // 10GB limit
      })

    } catch (error: any) {
      setError(error.message)
      console.error('Error loading backup data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [config.frequency])

  // Save configuration
  const saveConfig = useCallback(async (newConfig: Partial<BackupConfig>) => {
    try {
      const updatedConfig = { ...config, ...newConfig }
      setConfig(updatedConfig)
      localStorage.setItem('backup-config', JSON.stringify(updatedConfig))
      
      // Restart scheduler if frequency changed
      if (newConfig.frequency) {
        scheduleNextBackup()
      }
      
      return true
    } catch (error: any) {
      setError(error.message)
      return false
    }
  }, [config])

  // Create backup
  const createBackup = useCallback(async (manual = false, options?: Partial<BackupConfig['include']>) => {
    const backupId = `backup-${Date.now()}`
    const backup: BackupItem = {
      id: backupId,
      name: `${manual ? 'Manual' : 'Automatic'} Backup ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`,
      timestamp: new Date(),
      size: 0,
      type: manual ? 'manual' : 'automatic',
      status: 'in_progress',
      duration: 0,
      location: config.storage.cloud ? 'cloud' : 'local',
      checksum: '',
      version: '2.1.0',
      includes: Object.keys(options || config.include).filter(key => 
        (options || config.include)[key as keyof BackupConfig['include']]
      ),
      metadata: {}
    }

    setCurrentBackup(backup)
    setBackups(prev => [backup, ...prev])

    try {
      // Simulate backup process
      const startTime = Date.now()
      
      // Mock progress updates
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min((elapsed / 60000) * 100, 95) // Complete in ~1 minute
        
        setCurrentBackup(prev => prev ? { ...prev, duration: Math.floor(elapsed / 1000) } : null)
      }, 1000)

      // Simulate backup completion
      await new Promise(resolve => setTimeout(resolve, Math.random() * 30000 + 15000)) // 15-45 seconds

      clearInterval(progressInterval)

      const finalDuration = Math.floor((Date.now() - startTime) / 1000)
      const size = Math.floor(Math.random() * 200000000) + 50000000 // 50-250MB
      const compressedSize = config.compression ? Math.floor(size * 0.6) : size

      const completedBackup: BackupItem = {
        ...backup,
        status: Math.random() > 0.05 ? 'completed' : 'failed', // 95% success rate
        duration: finalDuration,
        size: compressedSize,
        checksum: Math.random().toString(36).substring(2, 15),
        metadata: {
          conversationsCount: Math.floor(Math.random() * 1000) + 100,
          contactsCount: Math.floor(Math.random() * 5000) + 500,
          flowsCount: Math.floor(Math.random() * 50) + 10,
          totalSize: size,
          compressedSize
        }
      }

      setBackups(prev => prev.map(b => b.id === backupId ? completedBackup : b))
      setCurrentBackup(null)
      setLastBackupTime(new Date())
      
      if (completedBackup.status === 'completed') {
        // Schedule next backup
        scheduleNextBackup()
        
        // Auto cleanup old backups if enabled
        if (config.autoCleanup) {
          await cleanupOldBackups()
        }
      }

      return completedBackup

    } catch (error: any) {
      const failedBackup: BackupItem = {
        ...backup,
        status: 'failed',
        duration: Math.floor((Date.now() - Date.now()) / 1000),
        error: error.message
      }

      setBackups(prev => prev.map(b => b.id === backupId ? failedBackup : b))
      setCurrentBackup(null)
      setError(error.message)
      throw error
    }
  }, [config])

  // Restore from backup
  const restoreFromBackup = useCallback(async (
    backupId: string, 
    restoreType: 'full' | 'partial' = 'full',
    selectedItems?: string[]
  ) => {
    const backup = backups.find(b => b.id === backupId)
    if (!backup || backup.status !== 'completed') {
      throw new Error('Backup não encontrado ou corrompido')
    }

    const restoreId = `restore-${Date.now()}`
    const restore: RestoreOperation = {
      id: restoreId,
      backupId,
      timestamp: new Date(),
      status: 'in_progress',
      progress: 0,
      restoreType,
      selectedItems: selectedItems || backup.includes
    }

    setCurrentRestore(restore)
    setRestoreOperations(prev => [restore, ...prev])

    try {
      const startTime = Date.now()
      
      // Mock restore progress
      const progressInterval = setInterval(() => {
        const elapsed = Date.now() - startTime
        const progress = Math.min((elapsed / 120000) * 100, 95) // Complete in ~2 minutes
        
        setCurrentRestore(prev => prev ? { 
          ...prev, 
          progress,
          estimatedTime: Math.max(0, 120 - Math.floor(elapsed / 1000))
        } : null)
      }, 1000)

      // Simulate restore process
      await new Promise(resolve => setTimeout(resolve, Math.random() * 60000 + 60000)) // 1-2 minutes

      clearInterval(progressInterval)

      const completedRestore: RestoreOperation = {
        ...restore,
        status: Math.random() > 0.02 ? 'completed' : 'failed', // 98% success rate
        progress: 100
      }

      setRestoreOperations(prev => prev.map(r => r.id === restoreId ? completedRestore : r))
      setCurrentRestore(null)

      return completedRestore

    } catch (error: any) {
      const failedRestore: RestoreOperation = {
        ...restore,
        status: 'failed',
        error: error.message
      }

      setRestoreOperations(prev => prev.map(r => r.id === restoreId ? failedRestore : r))
      setCurrentRestore(null)
      throw error
    }
  }, [backups])

  // Delete backup
  const deleteBackup = useCallback(async (backupId: string) => {
    try {
      // In a real app, this would make an API call to delete the backup file
      setBackups(prev => prev.filter(b => b.id !== backupId))
      return true
    } catch (error: any) {
      setError(error.message)
      return false
    }
  }, [])

  // Cleanup old backups based on retention policy
  const cleanupOldBackups = useCallback(async () => {
    const sortedBackups = [...backups]
      .filter(b => b.status === 'completed')
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    const backupsToDelete = sortedBackups.slice(config.retention)
    
    for (const backup of backupsToDelete) {
      await deleteBackup(backup.id)
    }

    return backupsToDelete.length
  }, [backups, config.retention, deleteBackup])

  // Verify backup integrity
  const verifyBackup = useCallback(async (backupId: string) => {
    const backup = backups.find(b => b.id === backupId)
    if (!backup) return false

    try {
      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock verification result (95% pass rate)
      const isValid = Math.random() > 0.05
      
      if (!isValid) {
        setBackups(prev => prev.map(b => 
          b.id === backupId ? { ...b, status: 'corrupted' as const } : b
        ))
      }

      return isValid
    } catch (error: any) {
      setError(error.message)
      return false
    }
  }, [backups])

  // Schedule next automatic backup
  const scheduleNextBackup = useCallback(() => {
    if (backupIntervalRef.current) {
      clearTimeout(backupIntervalRef.current)
    }

    if (!config.enabled) return

    const getNextBackupDelay = () => {
      const now = new Date()
      const next = new Date()

      switch (config.frequency) {
        case 'hourly':
          next.setHours(now.getHours() + 1, 0, 0, 0)
          break
        case 'daily':
          next.setDate(now.getDate() + 1)
          next.setHours(2, 0, 0, 0) // 2 AM
          break
        case 'weekly':
          next.setDate(now.getDate() + (7 - now.getDay())) // Next Sunday
          next.setHours(2, 0, 0, 0)
          break
        case 'monthly':
          next.setMonth(now.getMonth() + 1, 1)
          next.setHours(2, 0, 0, 0)
          break
      }

      return next.getTime() - now.getTime()
    }

    const delay = getNextBackupDelay()
    setNextBackupTime(new Date(Date.now() + delay))

    backupIntervalRef.current = setTimeout(() => {
      createBackup(false)
    }, delay)
  }, [config.enabled, config.frequency, createBackup])

  // Initialize
  useEffect(() => {
    loadData()
  }, [loadData])

  // Schedule backups
  useEffect(() => {
    scheduleNextBackup()
    return () => {
      if (backupIntervalRef.current) {
        clearTimeout(backupIntervalRef.current)
      }
    }
  }, [scheduleNextBackup])

  // Periodic status check
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      // Check for stuck operations and update stats
      if (currentBackup && currentBackup.status === 'in_progress') {
        const elapsed = Date.now() - currentBackup.timestamp.getTime()
        if (elapsed > 300000) { // 5 minutes timeout
          setCurrentBackup(prev => prev ? { ...prev, status: 'failed', error: 'Timeout' } : null)
        }
      }
    }, 30000)

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [currentBackup])

  return {
    // Configuration
    config,
    saveConfig,

    // Backups
    backups,
    currentBackup,
    lastBackupTime,
    nextBackupTime,
    stats,

    // Restore operations
    restoreOperations,
    currentRestore,

    // Actions
    createBackup,
    restoreFromBackup,
    deleteBackup,
    verifyBackup,
    cleanupOldBackups,

    // State
    isLoading,
    error,

    // Computed values
    hasBackups: backups.length > 0,
    recentBackups: backups.slice(0, 5),
    failedBackups: backups.filter(b => b.status === 'failed' || b.status === 'corrupted'),
    isBackupInProgress: currentBackup !== null,
    isRestoreInProgress: currentRestore !== null,
    
    // Storage info
    storageUsage: stats ? (stats.storageUsed / stats.storageLimit) * 100 : 0,
    canCreateBackup: !currentBackup && !currentRestore,
    
    // Health status
    systemHealth: {
      lastBackupAge: lastBackupTime ? Date.now() - lastBackupTime.getTime() : null,
      isHealthy: stats ? stats.successRate > 80 : true,
      needsAttention: stats ? stats.successRate < 80 || (stats.storageUsed / stats.storageLimit) > 0.9 : false
    }
  }
}