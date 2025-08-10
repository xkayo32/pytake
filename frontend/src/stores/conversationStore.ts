import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { api, isApiSuccess } from '../services/api';
import { getWebSocketService, WebSocketMessage } from '../services/websocket';
import type { 
  Conversation, 
  WhatsAppMessage, 
  ConversationState, 
  SendMessageRequest,
  ConversationFilters 
} from '../types';

interface ConversationStore extends ConversationState {
  // Actions
  fetchConversations: (filters?: ConversationFilters) => Promise<void>;
  fetchMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, messageData: SendMessageRequest) => Promise<void>;
  setActiveConversation: (conversation: Conversation | null) => void;
  markAsRead: (conversationId: string) => Promise<void>;
  updateConversationStatus: (conversationId: string, status: 'active' | 'closed' | 'pending') => Promise<void>;
  assignAgent: (conversationId: string, agentId: string) => Promise<void>;
  addMessage: (message: WhatsAppMessage) => void;
  updateMessage: (messageId: string, updates: Partial<WhatsAppMessage>) => void;
  clearError: () => void;
  setLoading: (loading: boolean) => void;
  initializeWebSocket: () => void;
  cleanupWebSocket: () => void;
  refreshConversations: () => Promise<void>;
}

export const useConversationStore = create<ConversationStore>()(
  devtools(
    (set, get) => ({
      // Initial state
      conversations: [],
      activeConversation: null,
      messages: [],
      isLoading: false,
      error: null,
      unreadCount: 0,

      // Actions
      fetchConversations: async (filters?: ConversationFilters) => {
        try {
          set({ isLoading: true, error: null });

          const queryParams = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== null && value !== undefined && value !== '') {
                queryParams.append(key, String(value));
              }
            });
          }

          const url = `/api/v1/whatsapp/conversations${queryParams.toString() ? `?${queryParams}` : ''}`;
          const response = await api.get<Conversation[]>(url);

          if (isApiSuccess(response)) {
            const conversations = response.data;
            const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);
            
            set({
              conversations,
              unreadCount: totalUnread,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Failed to fetch conversations');
          }
        } catch (error: any) {
          console.error('Failed to fetch conversations:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch conversations',
          });
        }
      },

      fetchMessages: async (conversationId: string) => {
        try {
          set({ isLoading: true, error: null });

          const response = await api.get<WhatsAppMessage[]>(`/api/v1/whatsapp/conversations/${conversationId}/messages`);

          if (isApiSuccess(response)) {
            set({
              messages: response.data,
              isLoading: false,
              error: null,
            });
          } else {
            throw new Error(response.message || 'Failed to fetch messages');
          }
        } catch (error: any) {
          console.error('Failed to fetch messages:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to fetch messages',
          });
        }
      },

      sendMessage: async (conversationId: string, messageData: SendMessageRequest) => {
        try {
          const response = await api.post(`/api/v1/whatsapp/send`, messageData);

          if (isApiSuccess(response)) {
            // Optimistically add the message to the store
            const optimisticMessage: WhatsAppMessage = {
              id: `temp-${Date.now()}`,
              conversation_id: conversationId,
              phone_number: messageData.phone_number,
              direction: 'outbound',
              message_type: messageData.message_type,
              content: messageData.content,
              media_url: messageData.media_url,
              status: 'sent',
              timestamp: new Date().toISOString(),
              whatsapp_message_id: response.data.whatsapp_message_id || 'pending',
            };

            get().addMessage(optimisticMessage);

            // Update conversation last message
            const { conversations, activeConversation } = get();
            if (activeConversation?.id === conversationId) {
              const updatedConversations = conversations.map(conv =>
                conv.id === conversationId
                  ? {
                      ...conv,
                      last_message: messageData.content,
                      last_message_time: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }
                  : conv
              );

              set({
                conversations: updatedConversations,
                activeConversation: {
                  ...activeConversation,
                  last_message: messageData.content,
                  last_message_time: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              });
            }
          } else {
            throw new Error(response.message || 'Failed to send message');
          }
        } catch (error: any) {
          console.error('Failed to send message:', error);
          throw error; // Re-throw to handle in component
        }
      },

      setActiveConversation: (conversation: Conversation | null) => {
        const currentActive = get().activeConversation;
        
        // Leave current conversation room
        if (currentActive) {
          const ws = getWebSocketService();
          ws.leaveConversation(currentActive.id);
        }

        // Join new conversation room
        if (conversation) {
          const ws = getWebSocketService();
          ws.joinConversation(conversation.id);
          
          // Mark as read when opening conversation
          if (conversation.unread_count > 0) {
            get().markAsRead(conversation.id);
          }
        }

        set({ 
          activeConversation: conversation,
          messages: conversation ? get().messages : []
        });
      },

      markAsRead: async (conversationId: string) => {
        try {
          const response = await api.post(`/api/v1/whatsapp/conversations/${conversationId}/read`);

          if (isApiSuccess(response)) {
            const { conversations } = get();
            const updatedConversations = conversations.map(conv =>
              conv.id === conversationId
                ? { ...conv, unread_count: 0 }
                : conv
            );

            const newUnreadCount = updatedConversations.reduce((sum, conv) => sum + conv.unread_count, 0);

            set({
              conversations: updatedConversations,
              unreadCount: newUnreadCount,
            });
          }
        } catch (error: any) {
          console.error('Failed to mark conversation as read:', error);
        }
      },

      updateConversationStatus: async (conversationId: string, status: 'active' | 'closed' | 'pending') => {
        try {
          const response = await api.patch(`/api/v1/whatsapp/conversations/${conversationId}`, { status });

          if (isApiSuccess(response)) {
            const { conversations, activeConversation } = get();
            const updatedConversations = conversations.map(conv =>
              conv.id === conversationId
                ? { ...conv, status, updated_at: new Date().toISOString() }
                : conv
            );

            set({
              conversations: updatedConversations,
              activeConversation: activeConversation?.id === conversationId
                ? { ...activeConversation, status, updated_at: new Date().toISOString() }
                : activeConversation,
            });
          } else {
            throw new Error(response.message || 'Failed to update conversation status');
          }
        } catch (error: any) {
          console.error('Failed to update conversation status:', error);
          throw error;
        }
      },

      assignAgent: async (conversationId: string, agentId: string) => {
        try {
          const response = await api.post(`/api/v1/whatsapp/conversations/${conversationId}/assign`, {
            agent_id: agentId,
          });

          if (isApiSuccess(response)) {
            const { conversations, activeConversation } = get();
            const updatedConversation = response.data;
            
            const updatedConversations = conversations.map(conv =>
              conv.id === conversationId ? updatedConversation : conv
            );

            set({
              conversations: updatedConversations,
              activeConversation: activeConversation?.id === conversationId
                ? updatedConversation
                : activeConversation,
            });
          } else {
            throw new Error(response.message || 'Failed to assign agent');
          }
        } catch (error: any) {
          console.error('Failed to assign agent:', error);
          throw error;
        }
      },

      addMessage: (message: WhatsAppMessage) => {
        const { messages, conversations, activeConversation } = get();
        
        // Add to messages if it belongs to active conversation
        if (activeConversation && message.conversation_id === activeConversation.id) {
          // Check if message already exists (avoid duplicates)
          const exists = messages.some(msg => 
            msg.id === message.id || msg.whatsapp_message_id === message.whatsapp_message_id
          );

          if (!exists) {
            const updatedMessages = [...messages, message].sort(
              (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            
            set({ messages: updatedMessages });
          }
        }

        // Update conversation last message and unread count
        const updatedConversations = conversations.map(conv => {
          if (conv.id === message.conversation_id) {
            const isInbound = message.direction === 'inbound';
            const isCurrentlyActive = activeConversation?.id === conv.id;
            
            return {
              ...conv,
              last_message: message.content,
              last_message_time: message.timestamp,
              updated_at: message.timestamp,
              unread_count: isInbound && !isCurrentlyActive 
                ? conv.unread_count + 1 
                : conv.unread_count,
            };
          }
          return conv;
        });

        const newUnreadCount = updatedConversations.reduce((sum, conv) => sum + conv.unread_count, 0);

        set({
          conversations: updatedConversations,
          unreadCount: newUnreadCount,
        });
      },

      updateMessage: (messageId: string, updates: Partial<WhatsAppMessage>) => {
        const { messages } = get();
        const updatedMessages = messages.map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        );
        
        set({ messages: updatedMessages });
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      initializeWebSocket: () => {
        const ws = getWebSocketService({
          onMessage: (wsMessage: WebSocketMessage) => {
            const { addMessage, fetchConversations } = get();
            
            switch (wsMessage.type) {
              case 'new_message':
                if (wsMessage.payload && wsMessage.payload.message) {
                  addMessage(wsMessage.payload.message);
                }
                break;
              
              case 'conversation_update':
                // Refresh conversations when there's an update
                fetchConversations();
                break;
              
              default:
                // Handle other message types as needed
                break;
            }
          },
        });
      },

      cleanupWebSocket: () => {
        const ws = getWebSocketService();
        const { activeConversation } = get();
        
        if (activeConversation) {
          ws.leaveConversation(activeConversation.id);
        }
        
        ws.disconnect();
      },

      refreshConversations: async () => {
        const { fetchConversations } = get();
        await fetchConversations();
      },
    }),
    {
      name: 'conversation-store',
      enabled: process.env.NODE_ENV === 'development',
    }
  )
);

// Selectors for better performance
export const useConversations = () => useConversationStore((state) => state.conversations);
export const useActiveConversation = () => useConversationStore((state) => state.activeConversation);
export const useMessages = () => useConversationStore((state) => state.messages);
export const useConversationLoading = () => useConversationStore((state) => state.isLoading);
export const useConversationError = () => useConversationStore((state) => state.error);
export const useUnreadCount = () => useConversationStore((state) => state.unreadCount);

// Action selectors
export const useConversationActions = () => {
  const {
    fetchConversations,
    fetchMessages,
    sendMessage,
    setActiveConversation,
    markAsRead,
    updateConversationStatus,
    assignAgent,
    clearError,
    setLoading,
    initializeWebSocket,
    cleanupWebSocket,
    refreshConversations,
  } = useConversationStore();

  return {
    fetchConversations,
    fetchMessages,
    sendMessage,
    setActiveConversation,
    markAsRead,
    updateConversationStatus,
    assignAgent,
    clearError,
    setLoading,
    initializeWebSocket,
    cleanupWebSocket,
    refreshConversations,
  };
};

// Combined hook for conversation data and actions
export const useConversation = () => {
  const {
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    unreadCount,
    fetchConversations,
    fetchMessages,
    sendMessage,
    setActiveConversation,
    markAsRead,
    updateConversationStatus,
    assignAgent,
    clearError,
    setLoading,
    initializeWebSocket,
    cleanupWebSocket,
    refreshConversations,
  } = useConversationStore();

  return {
    // State
    conversations,
    activeConversation,
    messages,
    isLoading,
    error,
    unreadCount,
    
    // Actions
    fetchConversations,
    fetchMessages,
    sendMessage,
    setActiveConversation,
    markAsRead,
    updateConversationStatus,
    assignAgent,
    clearError,
    setLoading,
    initializeWebSocket,
    cleanupWebSocket,
    refreshConversations,
  };
};

export default useConversation;