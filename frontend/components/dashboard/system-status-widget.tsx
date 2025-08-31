'use client'

import { useState } from 'react'
import { 
  Settings,
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Shield,
  Database,
  Bot,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  ChevronRight
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { useSystemSettings } from '@/lib/hooks/useSystemSettings'

interface SystemStatusWidgetProps {
  className?: string
  showDetails?: boolean
}

export function SystemStatusWidget({ className, showDetails = true }: SystemStatusWidgetProps) {
  const { settings, health, isLoading } = useSystemSettings()
  const [detailsOpen, setDetailsOpen] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'critical': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 border-green-200'
      case 'warning': return 'bg-yellow-100 border-yellow-200'  
      case 'critical': return 'bg-red-100 border-red-200'
      default: return 'bg-gray-100 border-gray-200'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getServiceIcon = (serviceName: string) => {
    switch (serviceName.toLowerCase()) {
      case 'database': return <Database className="h-4 w-4" />
      case 'whatsapp api': return <Wifi className="h-4 w-4" />
      case 'ai service': return <Bot className="h-4 w-4" />
      case 'file storage': return <HardDrive className="h-4 w-4" />
      case 'email service': return <Zap className="h-4 w-4" />
      default: return <Activity className="h-4 w-4" />
    }
  }

  const getConfigurationStatus = () => {
    if (!settings) return { status: 'unknown', message: 'Carregando...' }
    
    const issues = []
    
    // Check critical configurations
    if (!settings.ai.openaiApiKey) issues.push('API Key da IA não configurada')
    if (!settings.whatsapp.instanceName) issues.push('Instância WhatsApp não configurada')
    if (settings.general.enableMaintenance) issues.push('Modo manutenção ativo')
    if (!settings.security.enableAuditLog) issues.push('Log de auditoria desabilitado')
    
    if (issues.length === 0) {
      return { status: 'healthy', message: 'Todas as configurações estão corretas' }
    } else if (issues.length <= 2) {
      return { status: 'warning', message: `${issues.length} configuração${issues.length > 1 ? 'ões' : ''} precisa${issues.length > 1 ? 'm' : ''} de atenção` }
    } else {
      return { status: 'critical', message: `${issues.length} configurações críticas precisam de atenção` }
    }
  }

  const configStatus = getConfigurationStatus()

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-32">
            <Activity className="h-6 w-6 animate-pulse text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Status do Sistema</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {health && getStatusIcon(health.status)}
            <Badge 
              variant="outline" 
              className={`text-xs ${health ? getStatusColor(health.status) : ''}`}
            >
              {health?.status === 'healthy' ? 'Saudável' :
               health?.status === 'warning' ? 'Atenção' : 
               health?.status === 'critical' ? 'Crítico' : 'Desconhecido'}
            </Badge>
            
            {showDetails && (
              <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Status Detalhado do Sistema</DialogTitle>
                    <DialogDescription>
                      Monitoramento completo da saúde e configurações do sistema
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 overflow-auto">
                    {/* System Health */}
                    {health && (
                      <div>
                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Recursos do Sistema
                        </h4>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                <Cpu className="h-3 w-3" />
                                CPU
                              </span>
                              <span>{health.cpu.toFixed(1)}%</span>
                            </div>
                            <Progress value={health.cpu} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                <MemoryStick className="h-3 w-3" />
                                Memória
                              </span>
                              <span>{health.memory.toFixed(1)}%</span>
                            </div>
                            <Progress value={health.memory} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                <HardDrive className="h-3 w-3" />
                                Disco
                              </span>
                              <span>{health.disk.toFixed(1)}%</span>
                            </div>
                            <Progress value={health.disk} className="h-2" />
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="flex items-center gap-1">
                                <Wifi className="h-3 w-3" />
                                Conexões
                              </span>
                              <span>{health.connections}</span>
                            </div>
                            <div className="h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 bg-blue-600 rounded-full" 
                                style={{ width: `${Math.min(100, (health.connections / 100) * 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Serviços</h5>
                          <div className="space-y-2">
                            {health.services.map((service) => (
                              <div key={service.name} className="flex items-center justify-between p-2 border rounded">
                                <div className="flex items-center gap-2">
                                  {getServiceIcon(service.name)}
                                  <span className="text-sm font-medium">{service.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">
                                    {service.responseTime.toFixed(0)}ms
                                  </span>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs ${
                                      service.status === 'up' ? 'text-green-600' :
                                      service.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'
                                    }`}
                                  >
                                    {service.status === 'up' ? 'Online' :
                                     service.status === 'degraded' ? 'Degradado' : 'Offline'}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Configuration Status */}
                    <div>
                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Status das Configurações
                      </h4>
                      
                      <div className={`p-3 border rounded-lg ${getStatusBg(configStatus.status)}`}>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(configStatus.status)}
                          <span className="text-sm font-medium">{configStatus.message}</span>
                        </div>
                      </div>

                      {settings && (
                        <div className="mt-4 space-y-2">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="flex justify-between">
                              <span>IA Configurada:</span>
                              <Badge variant={settings.ai.openaiApiKey ? 'default' : 'secondary'}>
                                {settings.ai.openaiApiKey ? 'Sim' : 'Não'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Auditoria Ativa:</span>
                              <Badge variant={settings.security.enableAuditLog ? 'default' : 'secondary'}>
                                {settings.security.enableAuditLog ? 'Sim' : 'Não'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Backup Automático:</span>
                              <Badge variant={settings.backup.enableAutoBackup ? 'default' : 'secondary'}>
                                {settings.backup.enableAutoBackup ? 'Sim' : 'Não'}
                              </Badge>
                            </div>
                            <div className="flex justify-between">
                              <span>Cache Ativo:</span>
                              <Badge variant={settings.performance.enableCaching ? 'default' : 'secondary'}>
                                {settings.performance.enableCaching ? 'Sim' : 'Não'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-between pt-4 border-t">
                      <Button variant="outline" size="sm" onClick={() => setDetailsOpen(false)}>
                        Fechar
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => {
                          setDetailsOpen(false)
                          window.location.href = '/settings/system'
                        }}
                      >
                        Abrir Configurações
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
        {/* Configuration Overview */}
        <div className={`p-3 border rounded-lg ${getStatusBg(configStatus.status)}`}>
          <div className="flex items-center gap-2">
            {getStatusIcon(configStatus.status)}
            <div>
              <p className="text-sm font-medium">{configStatus.message}</p>
              <p className="text-xs text-muted-foreground">
                Clique para ver configurações detalhadas
              </p>
            </div>
          </div>
        </div>

        {/* Quick System Metrics */}
        {health && (
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Cpu className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{health.cpu.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">CPU</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MemoryStick className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{health.memory.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">Memória</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Activity className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{health.responseTime.toFixed(0)}ms</p>
              <p className="text-xs text-muted-foreground">Resposta</p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Wifi className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">{health.connections}</p>
              <p className="text-xs text-muted-foreground">Conexões</p>
            </div>
          </div>
        )}

        {/* Services Status */}
        {health && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Serviços</h4>
            <div className="space-y-1">
              {health.services.slice(0, 3).map((service) => (
                <div key={service.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getServiceIcon(service.name)}
                    <span className="truncate">{service.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'up' ? 'bg-green-500' :
                      service.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                    }`} />
                    <span className="text-xs text-muted-foreground">
                      {service.responseTime.toFixed(0)}ms
                    </span>
                  </div>
                </div>
              ))}
              {health.services.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  +{health.services.length - 3} outros serviços
                </p>
              )}
            </div>
          </div>
        )}

        {/* Quick Access */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.location.href = '/settings/system'}
        >
          <Settings className="h-4 w-4 mr-2" />
          Abrir Configurações
        </Button>
      </CardContent>
    </Card>
  )
}