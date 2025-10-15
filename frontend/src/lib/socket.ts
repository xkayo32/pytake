/**
 * Socket.IO Client for Real-time Communication
 */

import { io, Socket } from 'socket.io-client';

class SocketClient {
  private socket: Socket | null = null;
  private token: string | null = null;

  /**
   * Connect to WebSocket server
   */
  connect(accessToken: string) {
    if (this.socket?.connected) {
      return; // Already connected
    }

    this.token = accessToken;

    // Get API URL - use window.location.origin for browser, fallback for SSR
    let baseUrl: string;
    if (typeof window !== 'undefined') {
      // Browser: use current origin (works with Docker proxy)
      baseUrl = window.location.origin;
    } else {
      // Server-side: use localhost
      baseUrl = 'http://localhost:8000';
    }

    console.log('[WebSocket] Connecting to:', baseUrl);

    this.socket = io(baseUrl, {
      path: '/socket.io',
      auth: {
        token: accessToken,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Connection events
    this.socket.on('connect', () => {
      console.log('[WebSocket] Connected:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });

    this.socket.on('connected', (data) => {
      console.log('[WebSocket] Server confirmed connection:', data);
    });

    this.socket.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect() {
    if (this.socket) {
      console.log('[WebSocket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
      this.token = null;
    }
  }

  /**
   * Join a conversation room to receive real-time updates
   */
  joinConversation(conversationId: string) {
    if (!this.socket?.connected) {
      console.warn('[WebSocket] Not connected. Cannot join conversation.');
      return;
    }

    console.log('[WebSocket] Joining conversation:', conversationId);
    this.socket.emit('join_conversation', { conversation_id: conversationId });
  }

  /**
   * Leave a conversation room
   */
  leaveConversation(conversationId: string) {
    if (!this.socket?.connected) {
      return;
    }

    console.log('[WebSocket] Leaving conversation:', conversationId);
    this.socket.emit('leave_conversation', { conversation_id: conversationId });
  }

  /**
   * Listen for new messages
   */
  onNewMessage(callback: (message: any) => void) {
    if (!this.socket) return;

    this.socket.on('message:new', callback);
  }

  /**
   * Listen for message status updates
   */
  onMessageStatus(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.on('message:status', callback);
  }

  /**
   * Listen for typing indicators
   */
  onTyping(callback: (data: any) => void) {
    if (!this.socket) return;

    this.socket.on('user_typing', callback);
  }

  /**
   * Emit typing start event
   */
  startTyping(conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('typing_start', { conversation_id: conversationId });
  }

  /**
   * Emit typing stop event
   */
  stopTyping(conversationId: string) {
    if (!this.socket?.connected) return;

    this.socket.emit('typing_stop', { conversation_id: conversationId });
  }

  /**
   * Remove event listener
   */
  off(event: string, callback?: any) {
    if (!this.socket) return;

    this.socket.off(event, callback);
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
}

// Export singleton instance
export const socketClient = new SocketClient();

export default socketClient;
