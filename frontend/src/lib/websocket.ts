import { useEffect, useRef, useState, useCallback } from 'react'
import { getApiUrl } from './api'

export type WebSocketMessage = {
  type: string
  data: unknown
  timestamp: number
}

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

export interface UseWebSocketOptions {
  url: string
  onMessage?: (message: WebSocketMessage) => void
  onStatusChange?: (status: WebSocketStatus) => void
  autoConnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export function useWebSocket(options: UseWebSocketOptions) {
  const {
    url,
    onMessage,
    onStatusChange,
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectAttemptsRef = useRef(0)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [status, setStatus] = useState<WebSocketStatus>('disconnected')

  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus)
    onStatusChange?.(newStatus)
  }, [onStatusChange])

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    try {
      updateStatus('connecting')
      const ws = new WebSocket(url)

      ws.onopen = () => {
        console.log('[WebSocket] Conectado')
        updateStatus('connected')
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          onMessage?.(message)
        } catch (err) {
          console.error('[WebSocket] Erro ao parsear mensagem:', err)
        }
      }

      ws.onerror = (error) => {
        console.error('[WebSocket] Erro:', error)
        updateStatus('error')
      }

      ws.onclose = () => {
        console.log('[WebSocket] Desconectado')
        updateStatus('disconnected')

        // Tentar reconectar automaticamente
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log(
              `[WebSocket] Reconectando... Tentativa ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`
            )
            connect()
          }, reconnectInterval)
        } else {
          console.error('[WebSocket] Máximo de tentativas de reconexão atingido')
          updateStatus('error')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[WebSocket] Erro ao conectar:', err)
      updateStatus('error')
    }
  }, [url, onMessage, updateStatus, reconnectInterval, maxReconnectAttempts])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    updateStatus('disconnected')
  }, [updateStatus])

  const send = useCallback((message: WebSocketMessage | object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message))
      } catch (err) {
        console.error('[WebSocket] Erro ao enviar mensagem:', err)
      }
    } else {
      console.warn('[WebSocket] Não conectado. Mensagem não enviada.')
    }
  }, [])

  useEffect(() => {
    if (autoConnect) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [autoConnect, connect, disconnect])

  return {
    status,
    send,
    connect,
    disconnect,
    isConnected: status === 'connected',
  }
}

export function getWebSocketUrl(path: string): string {
  const apiUrl = getApiUrl()
  const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws'
  const host = apiUrl.replace(/^https?:\/\//, '').replace(/\/$/, '')
  return `${wsProtocol}://${host}${path}`
}
