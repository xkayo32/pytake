/**
 * useWebSocket Hook
 * 
 * Custom React hook for WebSocket connection management
 * 
 * Features:
 * - Auto-connection with token
 * - Room subscription management
 * - Auto-reconnection on disconnect
 * - Event-based message handling
 * - Connection state tracking
 */

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketConfig {
  url?: string;
  token: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
}

interface WebSocketHook {
  connected: boolean;
  send: (data: any) => void;
  joinRoom: (room: string) => void;
  leaveRoom: (room: string) => void;
  subscribe: (event: string, handler: (data: any) => void) => () => void;
  connect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (config: WebSocketConfig): WebSocketHook => {
  const {
    url = 'ws://localhost:8000/api/v1/ws',
    token,
    autoConnect = true,
    reconnectInterval = 3000,
    onOpen,
    onClose,
    onError,
  } = config;

  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const eventHandlersRef = useRef<Map<string, Set<(data: any) => void>>>(
    new Map()
  );

  const send = useCallback((data: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    } else {
      console.warn('⚠️ WebSocket not connected, cannot send:', data);
    }
  }, []);

  const joinRoom = useCallback(
    (room: string) => {
      send({ action: 'join_room', room });
    },
    [send]
  );

  const leaveRoom = useCallback(
    (room: string) => {
      send({ action: 'leave_room', room });
    },
    [send]
  );

  const subscribe = useCallback(
    (event: string, handler: (data: any) => void) => {
      if (!eventHandlersRef.current.has(event)) {
        eventHandlersRef.current.set(event, new Set());
      }
      eventHandlersRef.current.get(event)?.add(handler);

      // Return unsubscribe function
      return () => {
        eventHandlersRef.current.get(event)?.delete(handler);
      };
    },
    []
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('✅ WebSocket already connected');
      return;
    }

    const wsUrl = `${url}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('✅ WebSocket connected');
      setConnected(true);
      onOpen?.();
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        const { event: eventType, data } = message;

        console.log('📨 WebSocket message:', eventType);

        // Call all handlers for this event
        const handlers = eventHandlersRef.current.get(eventType);
        if (handlers) {
          handlers.forEach((handler) => handler(data));
        }

        // Also call wildcard handlers
        const wildcardHandlers = eventHandlersRef.current.get('*');
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler({ event: eventType, data }));
        }
      } catch (error) {
        console.error('❌ Error parsing WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setConnected(false);
      onError?.(error);
    };

    ws.onclose = () => {
      console.log('📡 WebSocket disconnected');
      setConnected(false);
      onClose?.();

      // Auto-reconnect
      reconnectTimeoutRef.current = setTimeout(() => {
        console.log('🔄 Reconnecting WebSocket...');
        connect();
      }, reconnectInterval);
    };

    wsRef.current = ws;
  }, [url, token, reconnectInterval, onOpen, onClose, onError]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnected(false);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  return {
    connected,
    send,
    joinRoom,
    leaveRoom,
    subscribe,
    connect,
    disconnect,
  };
};

export default useWebSocket;
