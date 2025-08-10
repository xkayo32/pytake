import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL, API_ENDPOINTS } from '../utils/constants';
import { tokenManager } from './api';
import { WebSocketMessage } from '../types';

export interface WebSocketOptions {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Error) => void;
  onReconnect?: (attempt: number) => void;
}

export class WebSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private isConnecting = false;
  private isManuallyDisconnected = false;
  private options: WebSocketOptions = {};

  constructor(options?: WebSocketOptions) {
    this.options = options || {};
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.socket?.connected || this.isConnecting) {
        resolve();
        return;
      }

      this.isConnecting = true;
      this.isManuallyDisconnected = false;

      const token = tokenManager.getToken();
      if (!token) {
        this.isConnecting = false;
        reject(new Error('No authentication token available'));
        return;
      }

      try {
        // Create socket connection
        this.socket = io(WS_BASE_URL, {
          auth: {
            token: token,
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectInterval,
        });

        // Connection successful
        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.options.onConnect?.();
          resolve();
        });

        // Connection error
        this.socket.on('connect_error', (error: Error) => {
          console.error('WebSocket connection error:', error);
          this.isConnecting = false;
          
          if (this.reconnectAttempts === 0) {
            // Only reject on the first attempt
            reject(error);
          }
          
          this.options.onError?.(error);
        });

        // Disconnection
        this.socket.on('disconnect', (reason: string) => {
          console.log('WebSocket disconnected:', reason);
          this.isConnecting = false;
          this.options.onDisconnect?.();

          // Handle reconnection for unexpected disconnections
          if (!this.isManuallyDisconnected && reason !== 'io client disconnect') {
            this.handleReconnection();
          }
        });

        // Reconnection attempts
        this.socket.on('reconnect_attempt', (attempt: number) => {
          console.log(`WebSocket reconnection attempt ${attempt}`);
          this.reconnectAttempts = attempt;
          this.options.onReconnect?.(attempt);
        });

        // Successful reconnection
        this.socket.on('reconnect', (attempt: number) => {
          console.log(`WebSocket reconnected after ${attempt} attempts`);
          this.reconnectAttempts = 0;
        });

        // Failed to reconnect
        this.socket.on('reconnect_failed', () => {
          console.error('WebSocket failed to reconnect');
          this.isConnecting = false;
        });

        // Listen for application-specific messages
        this.setupMessageHandlers();

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  private setupMessageHandlers(): void {
    if (!this.socket) return;

    // New message received
    this.socket.on('new_message', (data: any) => {
      const message: WebSocketMessage = {
        type: 'new_message',
        payload: data,
        timestamp: new Date().toISOString(),
      };
      this.options.onMessage?.(message);
    });

    // Conversation update
    this.socket.on('conversation_update', (data: any) => {
      const message: WebSocketMessage = {
        type: 'conversation_update',
        payload: data,
        timestamp: new Date().toISOString(),
      };
      this.options.onMessage?.(message);
    });

    // Agent status change
    this.socket.on('agent_status', (data: any) => {
      const message: WebSocketMessage = {
        type: 'agent_status',
        payload: data,
        timestamp: new Date().toISOString(),
      };
      this.options.onMessage?.(message);
    });

    // Metrics update
    this.socket.on('metrics_update', (data: any) => {
      const message: WebSocketMessage = {
        type: 'metrics_update',
        payload: data,
        timestamp: new Date().toISOString(),
      };
      this.options.onMessage?.(message);
    });
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts || this.isManuallyDisconnected) {
      return;
    }

    setTimeout(() => {
      if (!this.socket?.connected && !this.isManuallyDisconnected) {
        console.log('Attempting to reconnect WebSocket...');
        this.connect().catch((error) => {
          console.error('Reconnection failed:', error);
        });
      }
    }, this.reconnectInterval);
  }

  disconnect(): void {
    this.isManuallyDisconnected = true;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    console.log('WebSocket manually disconnected');
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  // Send a message through WebSocket (if supported by backend)
  send(event: string, data: any): void {
    if (this.socket?.connected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }

  // Join a conversation room for real-time updates
  joinConversation(conversationId: string): void {
    this.send('join_conversation', { conversation_id: conversationId });
  }

  // Leave a conversation room
  leaveConversation(conversationId: string): void {
    this.send('leave_conversation', { conversation_id: conversationId });
  }

  // Update agent status
  updateAgentStatus(status: 'online' | 'offline' | 'busy'): void {
    this.send('agent_status_update', { status });
  }

  // Send typing indicator
  sendTyping(conversationId: string, isTyping: boolean): void {
    this.send('typing', { 
      conversation_id: conversationId, 
      typing: isTyping 
    });
  }

  // Get connection statistics
  getStats(): {
    connected: boolean;
    reconnectAttempts: number;
    socketId: string | null;
  } {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id || null,
    };
  }
}

// Create a singleton instance
let wsService: WebSocketService | null = null;

export const getWebSocketService = (options?: WebSocketOptions): WebSocketService => {
  if (!wsService) {
    wsService = new WebSocketService(options);
  }
  return wsService;
};

// Auto-connect hook
export const useWebSocket = (options?: WebSocketOptions) => {
  const [isConnected, setIsConnected] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = React.useState(0);

  React.useEffect(() => {
    const ws = getWebSocketService({
      ...options,
      onConnect: () => {
        setIsConnected(true);
        setError(null);
        options?.onConnect?.();
      },
      onDisconnect: () => {
        setIsConnected(false);
        options?.onDisconnect?.();
      },
      onError: (err) => {
        setError(err);
        options?.onError?.(err);
      },
      onReconnect: (attempt) => {
        setReconnectAttempts(attempt);
        options?.onReconnect?.(attempt);
      },
    });

    // Auto-connect
    ws.connect().catch((err) => {
      console.error('Failed to connect WebSocket:', err);
      setError(err);
    });

    // Cleanup on unmount
    return () => {
      ws.disconnect();
    };
  }, []);

  return {
    isConnected,
    error,
    reconnectAttempts,
    service: wsService,
  };
};

// Import React for the hook
import React from 'react';

export default WebSocketService;