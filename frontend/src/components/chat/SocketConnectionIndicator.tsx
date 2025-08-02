import React from 'react'
import { Badge } from '@/components/ui/Badge'
import { Wifi, WifiOff, Loader2, AlertCircle } from 'lucide-react'

interface SocketConnectionIndicatorProps {
  status: 'disconnected' | 'connecting' | 'connected' | 'error'
  onReconnect?: () => void
}

export const SocketConnectionIndicator: React.FC<SocketConnectionIndicatorProps> = ({
  status,
  onReconnect
}) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="w-3 h-3" />,
          text: 'Conectado',
          variant: 'default' as const,
          className: 'bg-green-500 text-white'
        }
      case 'connecting':
        return {
          icon: <Loader2 className="w-3 h-3 animate-spin" />,
          text: 'Conectando...',
          variant: 'secondary' as const,
          className: 'bg-yellow-500 text-white'
        }
      case 'error':
        return {
          icon: <AlertCircle className="w-3 h-3" />,
          text: 'Erro',
          variant: 'destructive' as const,
          className: 'bg-red-500 text-white'
        }
      case 'disconnected':
      default:
        return {
          icon: <WifiOff className="w-3 h-3" />,
          text: 'Desconectado',
          variant: 'outline' as const,
          className: 'bg-gray-500 text-white'
        }
    }
  }

  const config = getStatusConfig()

  return (
    <div className="flex items-center space-x-2">
      <Badge
        variant={config.variant}
        className={`flex items-center space-x-1 text-xs ${config.className}`}
      >
        {config.icon}
        <span>{config.text}</span>
      </Badge>
      
      {(status === 'error' || status === 'disconnected') && onReconnect && (
        <button
          onClick={onReconnect}
          className="text-xs text-blue-600 hover:text-blue-800 underline"
        >
          Reconectar
        </button>
      )}
    </div>
  )
}