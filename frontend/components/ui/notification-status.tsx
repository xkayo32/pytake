'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { 
  Bell, 
  BellOff, 
  BellRing,
  Volume2, 
  VolumeX,
  Wifi,
  WifiOff,
  Settings
} from 'lucide-react'
import { useNotifications } from '@/lib/hooks/useNotifications'
import { cn } from '@/lib/utils'

interface NotificationStatusProps {
  className?: string
  showUnreadCount?: boolean
}

export function NotificationStatus({ className, showUnreadCount = true }: NotificationStatusProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { 
    permission, 
    config, 
    isSupported,
    unreadCount,
    requestPermission,
    saveConfig
  } = useNotifications()

  const getStatusInfo = () => {
    if (!isSupported) {
      return {
        icon: <BellOff className="h-4 w-4" />,
        color: 'text-gray-500',
        label: 'Não suportado',
        description: 'Seu navegador não suporta notificações'
      }
    }

    if (permission === 'denied') {
      return {
        icon: <BellOff className="h-4 w-4" />,
        color: 'text-red-500',
        label: 'Bloqueado',
        description: 'Notificações foram bloqueadas pelo usuário'
      }
    }

    if (permission === 'granted' && config.enabled) {
      return {
        icon: config.sound ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />,
        color: 'text-green-500',
        label: 'Ativo',
        description: `Notificações ativadas${config.sound ? ' com som' : ''}`
      }
    }

    if (permission === 'granted' && !config.enabled) {
      return {
        icon: <BellOff className="h-4 w-4" />,
        color: 'text-yellow-500',
        label: 'Desativado',
        description: 'Notificações desativadas pelo usuário'
      }
    }

    return {
      icon: <Bell className="h-4 w-4" />,
      color: 'text-gray-500',
      label: 'Não configurado',
      description: 'Clique para ativar as notificações'
    }
  }

  const statusInfo = getStatusInfo()

  const handleQuickToggle = async () => {
    if (permission !== 'granted') {
      const granted = await requestPermission()
      if (granted) {
        saveConfig({ enabled: true })
      }
    } else {
      saveConfig({ enabled: !config.enabled })
    }
    setIsOpen(false)
  }

  const toggleSound = () => {
    saveConfig({ sound: !config.sound })
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("relative h-9 w-9 p-0", className)}
        >
          <div className={statusInfo.color}>
            {statusInfo.icon}
          </div>
          {showUnreadCount && unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 min-w-[20px] text-xs px-1 flex items-center justify-center"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Status Header */}
          <div className="flex items-center gap-3">
            <div className={statusInfo.color}>
              {statusInfo.icon}
            </div>
            <div className="flex-1">
              <p className="font-medium">{statusInfo.label}</p>
              <p className="text-sm text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>
          </div>

          {/* Unread Count */}
          {unreadCount > 0 && (
            <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                {unreadCount} mensagens não lidas
              </span>
              <Badge variant="secondary">{unreadCount}</Badge>
            </div>
          )}

          {/* Do Not Disturb Status */}
          {config.doNotDisturb.enabled && (
            <div className="flex items-center gap-2 text-sm text-orange-600">
              <span>🌙</span>
              <span>
                Modo silencioso ativo ({config.doNotDisturb.startTime} - {config.doNotDisturb.endTime})
              </span>
            </div>
          )}

          {/* Quick Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleQuickToggle}
              variant={config.enabled ? "destructive" : "default"}
              className="w-full justify-start"
            >
              {config.enabled ? <BellOff className="h-4 w-4 mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
              {config.enabled ? 'Desativar' : 'Ativar'} Notificações
            </Button>

            {config.enabled && (
              <Button
                onClick={toggleSound}
                variant="outline"
                className="w-full justify-start"
              >
                {config.sound ? <VolumeX className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                {config.sound ? 'Desativar' : 'Ativar'} Som
              </Button>
            )}
          </div>

          {/* Settings Link */}
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start"
              onClick={() => {
                // Navigate to settings page
                window.location.href = '/settings?tab=notifications'
                setIsOpen(false)
              }}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurações Avançadas
            </Button>
          </div>

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
              <div>Permission: {permission}</div>
              <div>Supported: {isSupported ? 'Yes' : 'No'}</div>
              <div>Enabled: {config.enabled ? 'Yes' : 'No'}</div>
              <div>Sound: {config.sound ? 'Yes' : 'No'}</div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

// Simplified version for mobile/compact views
export function NotificationStatusCompact({ className }: { className?: string }) {
  const { permission, config, unreadCount } = useNotifications()

  const getIcon = () => {
    if (permission !== 'granted' || !config.enabled) {
      return <BellOff className="h-4 w-4 text-gray-400" />
    }
    return <Bell className="h-4 w-4 text-green-500" />
  }

  return (
    <div className={cn("relative", className)}>
      {getIcon()}
      {unreadCount > 0 && (
        <Badge 
          variant="destructive" 
          className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center"
        >
          {unreadCount > 9 ? '9+' : unreadCount}
        </Badge>
      )}
    </div>
  )
}