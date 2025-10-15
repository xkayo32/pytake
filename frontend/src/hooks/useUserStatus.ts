'use client';

import { useState, useEffect } from 'react';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook to manage user online/offline status in real-time
 */
export function useUserStatus() {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      return;
    }

    // Connect to WebSocket if not already connected
    if (!socketClient.isConnected()) {
      socketClient.connect(accessToken);
    }

    // Listen for user status updates
    const handleUserStatus = (data: { user_id: string; status: 'online' | 'offline' }) => {
      console.log('[useUserStatus] User status update:', data);

      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (data.status === 'online') {
          next.add(data.user_id);
        } else {
          next.delete(data.user_id);
        }
        return next;
      });
    };

    socketClient.onUserStatus(handleUserStatus);

    // Cleanup
    return () => {
      socketClient.off('user:status', handleUserStatus);
    };
  }, []);

  const isUserOnline = (userId: string | undefined | null): boolean => {
    if (!userId) return false;
    return onlineUsers.has(userId);
  };

  return {
    onlineUsers,
    isUserOnline,
  };
}
