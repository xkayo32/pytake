'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Shield, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Download,
  Settings,
  Calendar,
  HardDrive,
  ChevronRight,
  RefreshCw,
  XCircle
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'

import { useBackup } from '@/lib/hooks/useBackup'

interface BackupStatusWidgetProps {
  className?: string
  showDetails?: boolean
}

export function BackupStatusWidget({ className, showDetails = true }: BackupStatusWidgetProps) {
  const {
    config,
    backups,
    currentBackup,
    lastBackupTime,
    nextBackupTime,
    stats,
    createBackup,
    storageUsage,
    canCreateBackup,
    systemHealth
  } = useBackup()

  const [detailsOpen, setDetailsOpen] = useState(false)

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getHealthStatus = () => {
    if (!config.enabled) {
      return {
        status: 'disabled',
        color: 'text-gray-500',
        bgColor: 'bg-gray-50',
        icon: <XCircle className="h-4 w-4" />,
        message: 'Backup desabilitado'
      }
    }

    if (systemHealth.needsAttention) {
      return {
        status: 'warning',
        color: 'text-orange-600',
        bgColor: 'bg-orange-50',
        icon: <AlertTriangle className="h-4 w-4" />,
        message: 'Requer atenção'
      }
    }

    if (currentBackup) {
      return {
        status: 'running',
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        icon: <RefreshCw className="h-4 w-4 animate-spin" />,
        message: 'Backup em andamento'
      }
    }

    if (systemHealth.isHealthy) {
      return {
        status: 'healthy',
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        icon: <CheckCircle className="h-4 w-4" />,
        message: 'Sistema saudável'
      }
    }

    return {
      status: 'unknown',
      color: 'text-gray-500',
      bgColor: 'bg-gray-50',
      icon: <Clock className="h-4 w-4" />,
      message: 'Verificando status'
    }
  }

  const healthStatus = getHealthStatus()
  const recentBackups = backups.slice(0, 3)

  const handleCreateBackup = async () => {
    try {
      await createBackup(true)
    } catch (error) {
      console.error('Error creating backup:', error)
    }
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Status de Backup</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-2 py-1 rounded-md ${healthStatus.bgColor}`}>
              <div className={healthStatus.color}>
                {healthStatus.icon}
              </div>
              <span className={`text-xs font-medium ${healthStatus.color}`}>
                {healthStatus.message}
              </span>
            </div>
            
            {showDetails && (
              <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Detalhes do Sistema de Backup</DialogTitle>
                    <DialogDescription>
                      Informações completas sobre o status dos backups
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6">
                    {/* Status Cards */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Último Backup</p>
                        <p className="text-2xl font-bold">
                          {lastBackupTime 
                            ? format(lastBackupTime, 'dd/MM HH:mm', { locale: ptBR })
                            : 'Nunca'
                          }
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Taxa de Sucesso</p>
                        <p className="text-2xl font-bold">
                          {stats ? `${Math.round(stats.successRate)}%` : '0%'}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Armazenamento</p>
                        <p className="text-2xl font-bold">
                          {stats ? formatBytes(stats.storageUsed) : '0 B'}
                        </p>
                        <Progress value={storageUsage} className="h-2" />
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Próximo Backup</p>
                        <p className="text-2xl font-bold">
                          {nextBackupTime && config.enabled
                            ? format(nextBackupTime, 'dd/MM HH:mm', { locale: ptBR })
                            : 'Desabilitado'
                          }
                        </p>
                      </div>
                    </div>

                    <Separator />

                    {/* Recent Backups */}
                    <div>
                      <h4 className="font-semibold mb-3">Backups Recentes</h4>
                      <ScrollArea className="h-32">
                        <div className="space-y-2">
                          {recentBackups.map((backup) => (
                            <div key={backup.id} className="flex items-center justify-between p-2 rounded border">
                              <div className="flex items-center gap-2">
                                <div className={
                                  backup.status === 'completed' ? 'text-green-600' :
                                  backup.status === 'failed' ? 'text-red-600' :
                                  backup.status === 'in_progress' ? 'text-blue-600' : 'text-gray-500'
                                }>
                                  {backup.status === 'completed' ? <CheckCircle className="h-4 w-4" /> :
                                   backup.status === 'failed' ? <XCircle className="h-4 w-4" /> :
                                   backup.status === 'in_progress' ? <RefreshCw className="h-4 w-4 animate-spin" /> :
                                   <Clock className="h-4 w-4" />}
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{backup.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {format(backup.timestamp, 'dd/MM HH:mm', { locale: ptBR })} • {formatBytes(backup.size)}
                                  </p>
                                </div>
                              </div>
                              <Badge variant={backup.status === 'completed' ? 'default' : 'secondary'}>
                                {backup.status === 'completed' ? 'Concluído' :
                                 backup.status === 'failed' ? 'Falhou' :
                                 backup.status === 'in_progress' ? 'Em andamento' : 'Pendente'}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Configuration Summary */}
                    <div>
                      <h4 className="font-semibold mb-3">Configuração</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <span className="ml-2 font-medium">
                            {config.enabled ? 'Habilitado' : 'Desabilitado'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Frequência:</span>
                          <span className="ml-2 font-medium">
                            {config.frequency === 'hourly' ? 'A cada hora' :
                             config.frequency === 'daily' ? 'Diariamente' :
                             config.frequency === 'weekly' ? 'Semanalmente' : 'Mensalmente'}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Retenção:</span>
                          <span className="ml-2 font-medium">{config.retention} backups</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Compressão:</span>
                          <span className="ml-2 font-medium">
                            {config.compression ? 'Habilitada' : 'Desabilitada'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between">
                      <Button
                        onClick={handleCreateBackup}
                        disabled={!canCreateBackup}
                        className="gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Backup Manual
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setDetailsOpen(false)
                          // Navigate to settings page
                          window.location.href = '/settings?tab=data'
                        }}
                        className="gap-2"
                      >
                        <Settings className="h-4 w-4" />
                        Configurações
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Backup Progress */}
        {currentBackup && (
          <Alert>
            <RefreshCw className="h-4 w-4 animate-spin" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Backup em andamento: {currentBackup.name}</p>
                <p className="text-sm text-muted-foreground">
                  Iniciado há {Math.floor(currentBackup.duration / 60)}m {currentBackup.duration % 60}s
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* System Health Warning */}
        {systemHealth.needsAttention && !currentBackup && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Sistema requer atenção</p>
                  <p className="text-sm">
                    {stats?.successRate && stats.successRate < 80 && 'Taxa de sucesso baixa. '}
                    {stats && (stats.storageUsed / stats.storageLimit) > 0.9 && 'Armazenamento quase lotado.'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.location.href = '/settings?tab=data'}
                >
                  Corrigir
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mt-1">
              {lastBackupTime 
                ? format(lastBackupTime, 'dd/MM', { locale: ptBR })
                : 'Nunca'
              }
            </p>
            <p className="text-xs text-muted-foreground">Último backup</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mt-1">
              {stats ? formatBytes(stats.storageUsed) : '0 B'}
            </p>
            <p className="text-xs text-muted-foreground">Armazenado</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mt-1">
              {nextBackupTime && config.enabled
                ? format(nextBackupTime, 'HH:mm', { locale: ptBR })
                : 'Off'
              }
            </p>
            <p className="text-xs text-muted-foreground">Próximo</p>
          </div>
        </div>

        {/* Quick Actions */}
        {!currentBackup && (
          <div className="flex gap-2">
            <Button
              onClick={handleCreateBackup}
              disabled={!canCreateBackup}
              size="sm"
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Backup Agora
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.href = '/settings?tab=data'}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}