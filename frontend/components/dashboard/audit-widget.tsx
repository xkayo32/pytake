'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { 
  Shield, 
  Eye,
  AlertTriangle,
  Activity,
  Users,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  AlertCircle
} from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { useAuditLog, AuditLogEntry } from '@/lib/hooks/useAuditLog'

interface AuditWidgetProps {
  className?: string
  showDetails?: boolean
}

export function AuditWidget({ className, showDetails = true }: AuditWidgetProps) {
  const {
    recentEntries,
    criticalAlerts,
    openAlerts,
    stats,
    failureRate,
    topActions,
    isLoading
  } = useAuditLog()

  const [detailsOpen, setDetailsOpen] = useState(false)

  const getCategoryIcon = (category: AuditLogEntry['category']) => {
    switch (category) {
      case 'authentication': return '🔐'
      case 'conversation': return '💬'
      case 'flow': return '🔄'
      case 'contact': return '👥'
      case 'campaign': return '📢'
      case 'settings': return '⚙️'
      case 'system': return '🖥️'
      case 'security': return '🛡️'
      case 'data': return '📄'
      case 'ai': return '🤖'
      default: return '📝'
    }
  }

  const getStatusIcon = (status: AuditLogEntry['status']) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-3 w-3 text-green-600" />
      case 'failure': return <XCircle className="h-3 w-3 text-red-600" />
      case 'pending': return <Clock className="h-3 w-3 text-yellow-600" />
    }
  }

  const getSeverityColor = (severity: AuditLogEntry['severity']) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800'
      case 'error': return 'bg-red-50 text-red-700'
      case 'warning': return 'bg-yellow-50 text-yellow-700'
      case 'info': return 'bg-blue-50 text-blue-700'
    }
  }

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
            <Shield className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Auditoria do Sistema</CardTitle>
          </div>
          
          <div className="flex items-center gap-2">
            {criticalAlerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {criticalAlerts.length} crítico{criticalAlerts.length > 1 ? 's' : ''}
              </Badge>
            )}
            
            {showDetails && (
              <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[80vh]">
                  <DialogHeader>
                    <DialogTitle>Sistema de Auditoria - Visão Detalhada</DialogTitle>
                    <DialogDescription>
                      Análise completa das atividades e segurança do sistema
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="space-y-6 overflow-auto">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-2xl font-bold">{stats?.totalEntries.toLocaleString() || 0}</p>
                        <p className="text-xs text-muted-foreground">Total de Eventos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{openAlerts.length}</p>
                        <p className="text-xs text-muted-foreground">Alertas Ativos</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{failureRate.toFixed(1)}%</p>
                        <p className="text-xs text-muted-foreground">Taxa de Falhas</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold">{stats?.uniqueUsers || 0}</p>
                        <p className="text-xs text-muted-foreground">Usuários Únicos</p>
                      </div>
                    </div>

                    {/* Security Alerts */}
                    {openAlerts.length > 0 && (
                      <div>
                        <h4 className="font-semibold mb-3">Alertas de Segurança</h4>
                        <div className="space-y-2">
                          {openAlerts.slice(0, 5).map((alert) => (
                            <div key={alert.id} className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle className={`h-4 w-4 mt-0.5 ${
                                    alert.severity === 'critical' ? 'text-red-600' :
                                    alert.severity === 'high' ? 'text-orange-600' :
                                    alert.severity === 'medium' ? 'text-yellow-600' : 'text-blue-600'
                                  }`} />
                                  <div>
                                    <p className="font-medium text-sm">{alert.title}</p>
                                    <p className="text-xs text-muted-foreground">{alert.description}</p>
                                  </div>
                                </div>
                                <Badge variant="destructive" className="text-xs">
                                  {alert.severity.toUpperCase()}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Activity */}
                    <div>
                      <h4 className="font-semibold mb-3">Atividade Recente</h4>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {recentEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-3">
                                <span className="text-sm">{getCategoryIcon(entry.category)}</span>
                                <div>
                                  <p className="text-sm font-medium">
                                    {entry.action.replace('_', ' ')}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {entry.userName} • {format(entry.timestamp, 'HH:mm', { locale: ptBR })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusIcon(entry.status)}
                                <Badge className={`text-xs ${getSeverityColor(entry.severity)}`}>
                                  {entry.severity}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>

                    {/* Top Actions */}
                    <div>
                      <h4 className="font-semibold mb-3">Ações Mais Frequentes</h4>
                      <div className="space-y-2">
                        {topActions.slice(0, 6).map((action, index) => (
                          <div key={action.action} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                {index + 1}
                              </span>
                              <span className="text-sm capitalize">
                                {action.action.replace('_', ' ')}
                              </span>
                            </div>
                            <span className="text-sm font-medium">{action.count}</span>
                          </div>
                        ))}
                      </div>
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
                          window.location.href = '/audit'
                        }}
                      >
                        Ver Dashboard Completo
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
        {/* Critical Alerts */}
        {criticalAlerts.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <div>
                <p className="text-sm font-medium text-red-800">
                  {criticalAlerts.length} alerta{criticalAlerts.length > 1 ? 's' : ''} crítico{criticalAlerts.length > 1 ? 's' : ''}
                </p>
                <p className="text-xs text-red-600">Ação imediata necessária</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Activity className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {stats?.totalEntries.toLocaleString() || 0}
            </p>
            <p className="text-xs text-muted-foreground">Eventos</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {stats?.uniqueUsers || 0}
            </p>
            <p className="text-xs text-muted-foreground">Usuários</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">
              {failureRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground">Falhas</p>
          </div>
        </div>

        {/* Recent Activity Preview */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Atividade Recente</h4>
          <div className="space-y-1">
            {recentEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-xs">{getCategoryIcon(entry.category)}</span>
                  <span className="truncate flex-1">
                    {entry.action.replace('_', ' ')} • {entry.userName}
                  </span>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {getStatusIcon(entry.status)}
                  <span className="text-xs text-muted-foreground">
                    {format(entry.timestamp, 'HH:mm', { locale: ptBR })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Health Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Saúde do Sistema</span>
            <span className="text-muted-foreground">
              {failureRate < 5 ? 'Excelente' : 
               failureRate < 15 ? 'Boa' : 
               failureRate < 30 ? 'Atenção' : 'Crítica'}
            </span>
          </div>
          <Progress 
            value={Math.max(0, 100 - failureRate)} 
            className="h-2"
          />
        </div>

        {/* Quick Access */}
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => window.location.href = '/audit'}
        >
          <Eye className="h-4 w-4 mr-2" />
          Ver Dashboard Completo
        </Button>
      </CardContent>
    </Card>
  )
}