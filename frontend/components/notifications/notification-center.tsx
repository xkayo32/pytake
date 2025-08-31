'use client'

import { useState, useEffect } from 'react'
import { 
  Bell, 
  BellRing, 
  Settings, 
  X, 
  Check, 
  AlertTriangle, 
  Info, 
  CheckCircle,
  AlertCircle,
  Bot,
  MessageSquare,
  Users,
  Activity,
  User,
  ExternalLink
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

import { useNotifications, NotificationConfig } from '@/lib/hooks/useNotifications'

// Mock enhanced notification interface
interface EnhancedNotification {
  id: string
  type: 'info' | 'success' | 'warning' | 'error' | 'ai_alert'
  title: string
  message: string
  timestamp: Date
  read: boolean
  actionUrl?: string
  actionLabel?: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  category: 'system' | 'conversation' | 'ai' | 'queue' | 'user'
  metadata?: Record<string, any>
}

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className }: NotificationCenterProps) {
  const { 
    permission, 
    config, 
    isSupported, 
    unreadCount, 
    requestPermission, 
    saveConfig,
    clearNotifications
  } = useNotifications()

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('all')
  const [notifications, setNotifications] = useState<EnhancedNotification[]>([])

  // Mock notifications for demonstration
  useEffect(() => {
    const mockNotifications: EnhancedNotification[] = [
      {
        id: '1',
        type: 'ai_alert',
        title: 'IA Alert: Cliente Insatisfeito',
        message: 'João Silva expressa frustração. Sentimento negativo detectado com 87% de confiança.',
        timestamp: new Date(Date.now() - 5 * 60 * 1000),
        read: false,
        priority: 'high',
        category: 'ai',
        actionUrl: '/conversations/123',
        actionLabel: 'Ver Conversa',
        metadata: { conversationId: '123', sentiment: 'negative', confidence: 0.87 }
      },
      {
        id: '2',
        type: 'warning',
        title: 'Fila de Atendimento',
        message: '3 clientes aguardando há mais de 15 minutos',
        timestamp: new Date(Date.now() - 10 * 60 * 1000),
        read: false,
        priority: 'medium',
        category: 'queue',
        actionUrl: '/queues/1/monitor',
        actionLabel: 'Ver Fila'
      },
      {
        id: '3',
        type: 'success',
        title: 'Nova Conversa Atribuída',
        message: 'Conversa com Maria Santos foi atribuída a você',
        timestamp: new Date(Date.now() - 20 * 60 * 1000),
        read: true,
        priority: 'medium',
        category: 'conversation',
        actionUrl: '/conversations/456',
        actionLabel: 'Responder'
      },
      {
        id: '4',
        type: 'info',
        title: 'Sugestão de IA Disponível',
        message: 'Nova sugestão de resposta gerada com base no contexto da conversa',
        timestamp: new Date(Date.now() - 30 * 60 * 1000),
        read: true,
        priority: 'low',
        category: 'ai',
        metadata: { suggestionType: 'response', confidence: 0.92 }
      },
      {
        id: '5',
        type: 'error',
        title: 'Falha na Conexão',
        message: 'Conexão com WhatsApp API foi perdida. Tentando reconectar...',
        timestamp: new Date(Date.now() - 45 * 60 * 1000),
        read: false,
        priority: 'critical',
        category: 'system'
      }
    ]

    setNotifications(mockNotifications)
  }, [])

  const getNotificationIcon = (type: EnhancedNotification['type'], category: EnhancedNotification['category']) => {
    if (category === 'ai') return <Bot className="h-4 w-4" />
    if (category === 'conversation') return <MessageSquare className="h-4 w-4" />
    if (category === 'queue') return <Users className="h-4 w-4" />
    if (category === 'user') return <User className="h-4 w-4" />
    if (category === 'system') return <Activity className="h-4 w-4" />

    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4" />
      case 'warning': return <AlertTriangle className="h-4 w-4" />
      case 'error': return <AlertCircle className="h-4 w-4" />
      case 'ai_alert': return <Bot className="h-4 w-4" />
      default: return <Info className="h-4 w-4" />
    }
  }

  const getNotificationColor = (type: EnhancedNotification['type'], priority: EnhancedNotification['priority']) => {
    if (priority === 'critical') return 'text-red-600'
    if (priority === 'high') return 'text-orange-600'
    
    switch (type) {
      case 'success': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      case 'ai_alert': return 'text-blue-600'
      default: return 'text-gray-600'
    }
  }

  const filterNotifications = (filter: string) => {
    if (filter === 'all') return notifications
    if (filter === 'unread') return notifications.filter(n => !n.read)
    return notifications.filter(n => n.category === filter)
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    )
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const removeNotification = (notificationId: string) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId))
  }

  const unreadCountLocal = notifications.filter(n => !n.read).length

  return (
    <div className={className}>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            {unreadCountLocal > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {unreadCountLocal > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                variant="destructive"
              >
                {unreadCountLocal > 99 ? '99+' : unreadCountLocal}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        
        <SheetContent className="w-[400px] sm:w-[500px] p-0">
          <SheetHeader className="p-6 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle>Notificações</SheetTitle>
                <SheetDescription>
                  {unreadCountLocal > 0 
                    ? `${unreadCountLocal} não lidas de ${notifications.length} total`
                    : `${notifications.length} notificações`
                  }
                </SheetDescription>
              </div>
              
              <div className="flex items-center gap-2">
                {unreadCountLocal > 0 && (
                  <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                    <Check className="h-4 w-4 mr-1" />
                    Marcar todas como lidas
                  </Button>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-80">
                    <div className="p-4">
                      <h4 className="font-semibold mb-3">Configurações de Notificação</h4>
                      
                      {!isSupported && (
                        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            Notificações não são suportadas neste navegador
                          </p>
                        </div>
                      )}
                      
                      {permission === 'denied' && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-sm text-red-800">
                            Permissão negada. Habilite nas configurações do navegador.
                          </p>
                        </div>
                      )}
                      
                      {permission === 'default' && (
                        <div className="mb-4">
                          <Button onClick={requestPermission} size="sm" className="w-full">
                            Permitir Notificações
                          </Button>
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="notifications-enabled">Ativar notificações</Label>
                          <Switch
                            id="notifications-enabled"
                            checked={config.enabled}
                            onCheckedChange={(enabled) => saveConfig({ enabled })}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="desktop-notifications">Desktop</Label>
                          <Switch
                            id="desktop-notifications"
                            checked={config.desktop}
                            onCheckedChange={(desktop) => saveConfig({ desktop })}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="sound-notifications">Som</Label>
                          <Switch
                            id="sound-notifications"
                            checked={config.sound}
                            onCheckedChange={(sound) => saveConfig({ sound })}
                          />
                        </div>
                        
                        {config.sound && (
                          <div className="space-y-2">
                            <Label>Volume: {Math.round(config.volume * 100)}%</Label>
                            <Slider
                              value={[config.volume]}
                              onValueChange={([volume]) => saveConfig({ volume })}
                              max={1}
                              step={0.1}
                            />
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <Label htmlFor="dnd-enabled">Não Perturbe</Label>
                          <Switch
                            id="dnd-enabled"
                            checked={config.doNotDisturb.enabled}
                            onCheckedChange={(enabled) => 
                              saveConfig({ 
                                doNotDisturb: { ...config.doNotDisturb, enabled } 
                              })
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </SheetHeader>
          
          <Separator />
          
          <div className="px-6 py-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="unread">Não lidas</TabsTrigger>
                <TabsTrigger value="ai">IA</TabsTrigger>
                <TabsTrigger value="conversation">Chat</TabsTrigger>
                <TabsTrigger value="queue">Fila</TabsTrigger>
                <TabsTrigger value="system">Sistema</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <ScrollArea className="flex-1 px-6">
            <div className="space-y-3 pb-6">
              {filterNotifications(activeTab).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma notificação encontrada</p>
                </div>
              ) : (
                filterNotifications(activeTab).map((notification) => (
                  <Card key={notification.id} className={`cursor-pointer hover:shadow-md transition-shadow ${
                    !notification.read ? 'bg-blue-50 border-blue-200' : ''
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${
                            !notification.read ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                            <div className={getNotificationColor(notification.type, notification.priority)}>
                              {getNotificationIcon(notification.type, notification.category)}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className={`text-sm font-medium ${
                                !notification.read ? 'text-gray-900' : 'text-gray-600'
                              }`}>
                                {notification.title}
                              </h4>
                              {notification.priority === 'critical' && (
                                <Badge variant="destructive" className="text-xs">
                                  Crítico
                                </Badge>
                              )}
                              {notification.priority === 'high' && (
                                <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                  Alta
                                </Badge>
                              )}
                            </div>
                            
                            <p className={`text-sm ${
                              !notification.read ? 'text-gray-700' : 'text-gray-500'
                            }`}>
                              {notification.message}
                            </p>
                            
                            <div className="flex items-center justify-between mt-2">
                              <span className="text-xs text-muted-foreground">
                                {format(notification.timestamp, 'HH:mm - dd/MM', { locale: ptBR })}
                              </span>
                              
                              <div className="flex items-center gap-1">
                                {notification.actionUrl && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      markAsRead(notification.id)
                                      window.open(notification.actionUrl, '_blank')
                                    }}
                                  >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    {notification.actionLabel || 'Ver'}
                                  </Button>
                                )}
                                
                                {!notification.read && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                  >
                                    <Check className="h-3 w-3" />
                                  </Button>
                                )}
                                
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => removeNotification(notification.id)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  )
}