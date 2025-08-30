'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useAuthContext } from '@/contexts/auth-context'

export type WebSocketEvent = 
  | 'message_received'
  | 'message_sent'
  | 'message_status_updated'
  | 'conversation_updated'
  | 'typing_start'
  | 'typing_stop'
  | 'agent_assigned'
  | 'conversation_closed'

export interface WebSocketMessage {
  event: WebSocketEvent
  data: any
  timestamp: string
  conversation_id?: string
  sender_id?: string
}

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: Event) => void
  autoReconnect?: boolean
  reconnectInterval?: number
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { isAuthenticated, user } = useAuthContext()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected')
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>()
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5
  
  const {
    onMessage,
    onConnect,
    onDisconnect,
    onError,
    autoReconnect = true,
    reconnectInterval = 3000
  } = options

  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname === 'localhost' ? 'localhost:8080' : 'api.pytake.net'
    return `${protocol}//${host}/api/v1/conversations/ws`
  }, [])

  const connect = useCallback(() => {
    if (!isAuthenticated || !user) {
      console.log('WebSocket: Not authenticated, skipping connection')
      return
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket: Already connected')
      return
    }

    try {
      setConnectionStatus('connecting')
      const wsUrl = getWebSocketUrl()
      console.log('WebSocket: Connecting to', wsUrl)
      
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onopen = () => {
        console.log('WebSocket: Connected')
        setIsConnected(true)
        setConnectionStatus('connected')
        reconnectAttempts.current = 0
        
        // Send authentication message
        ws.send(JSON.stringify({
          type: 'auth',
          token: document.cookie
            .split('; ')
            .find(row => row.startsWith('auth-token='))
            ?.split('=')[1] || '',
          user_id: user.id
        }))
        
        onConnect?.()
      }

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          console.log('WebSocket: Message received', message)
          setLastMessage(message)
          onMessage?.(message)
        } catch (error) {
          console.error('WebSocket: Error parsing message', error)
        }
      }

      ws.onclose = (event) => {
        console.log('WebSocket: Disconnected', event.code, event.reason)
        setIsConnected(false)
        setConnectionStatus('disconnected')
        wsRef.current = null
        onDisconnect?.()

        // Auto reconnect if enabled and not a normal closure
        if (autoReconnect && event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          console.log(`WebSocket: Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, reconnectInterval * reconnectAttempts.current)
        }
      }

      ws.onerror = (error) => {
        console.error('WebSocket: Error', error)
        setConnectionStatus('error')
        onError?.(error)
      }

    } catch (error) {
      console.error('WebSocket: Connection failed', error)
      setConnectionStatus('error')
    }
  }, [isAuthenticated, user, getWebSocketUrl, onConnect, onMessage, onDisconnect, onError, autoReconnect, reconnectInterval])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected')
      wsRef.current = null
    }
    
    setIsConnected(false)
    setConnectionStatus('disconnected')
  }, [])

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message))
      return true
    }
    console.warn('WebSocket: Cannot send message, not connected')
    return false
  }, [])

  // Connect when authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      connect()
    }
    
    return () => {
      disconnect()
    }
  }, [isAuthenticated, user, connect, disconnect])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    connect,
    disconnect,
    sendMessage,
    reconnectAttempts: reconnectAttempts.current
  }
}