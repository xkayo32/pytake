'use client';

import { useState, useEffect } from 'react';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { conversationsAPI } from '@/lib/api';

/**
 * Hook to manage unread messages count in real-time
 * Listens to WebSocket events and updates count dynamically
 */
export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      setLoading(false);
      return;
    }

    // Initial count fetch from API
    const fetchUnreadCount = async () => {
      try {
        // Get conversations with unread messages
        const response = await conversationsAPI.list({
          limit: 100, // Fetch enough to count accurately
        });

        // Count conversations with unread messages
        const count = response.data.filter(
          (conv: any) => conv.unread_count && conv.unread_count > 0
        ).length;

        setUnreadCount(count);
      } catch (error) {
        console.error('[useUnreadCount] Failed to fetch initial count:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Connect to WebSocket if not already connected
    if (!socketClient.isConnected()) {
      socketClient.connect(accessToken);
    }

    // Listen for new messages to increment count
    const handleNewMessage = (message: any) => {
      // Only count inbound messages (from contacts)
      if (message.direction === 'inbound') {
        setUnreadCount((prev) => prev + 1);
      }
    };

    // TODO: Listen for mark_as_read events to decrement count
    // This would require a backend event when conversation is marked as read

    socketClient.onNewMessage(handleNewMessage);

    // Cleanup
    return () => {
      socketClient.off('message:new', handleNewMessage);
    };
  }, []);

  return {
    unreadCount,
    loading,
  };
}
