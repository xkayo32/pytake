'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { conversationsAPI } from '@/lib/api';
import { Conversation, Message } from '@/types/conversation';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import TemplateModal from '@/components/chat/TemplateModal';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params.id as string;

  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // Load conversation details
  const loadConversation = useCallback(async () => {
    try {
      const response = await conversationsAPI.get(conversationId);
      setConversation(response.data);
    } catch (err: any) {
      console.error('Error loading conversation:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar conversa');
    } finally {
      setIsLoadingConversation(false);
    }
  }, [conversationId]);

  // Load messages
  const loadMessages = useCallback(async () => {
    try {
      const response = await conversationsAPI.getMessages(conversationId, {
        limit: 100,
      });
      setMessages(response.data);
    } catch (err: any) {
      console.error('Error loading messages:', err);
    } finally {
      setIsLoadingMessages(false);
    }
  }, [conversationId]);

  // Send message
  const handleSendMessage = async (text: string) => {
    try {
      const response = await conversationsAPI.sendMessage(conversationId, {
        message_type: 'text',
        content: {
          text,
          preview_url: false,
        },
      });

      // Add new message to list
      setMessages((prev) => [...prev, response.data]);

      // Mark conversation as read
      try {
        await conversationsAPI.markAsRead(conversationId);
      } catch (err) {
        console.error('Error marking as read:', err);
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMessage = err.response?.data?.detail || 'Erro ao enviar mensagem';
      alert(errorMessage);
      throw err; // Re-throw so MessageInput knows it failed
    }
  };

  // Initial load
  useEffect(() => {
    loadConversation();
    loadMessages();
  }, [loadConversation, loadMessages]);

  // WebSocket connection and real-time updates
  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken;

    if (!accessToken) {
      console.warn('[WebSocket] No access token available');
      return;
    }

    // Connect to WebSocket if not already connected
    if (!socketClient.isConnected()) {
      console.log('[WebSocket] Connecting...');
      socketClient.connect(accessToken);
    }

    // Join this conversation room
    console.log('[WebSocket] Joining conversation:', conversationId);
    socketClient.joinConversation(conversationId);

    // Listen for new messages
    const handleNewMessage = (message: Message) => {
      console.log('[WebSocket] New message received:', message);
      setMessages((prev) => {
        // Check if message already exists to avoid duplicates
        const exists = prev.some((m) => m.id === message.id);
        if (exists) return prev;
        return [...prev, message];
      });
    };

    // Listen for message status updates
    const handleMessageStatus = (data: any) => {
      console.log('[WebSocket] Message status update:', data);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.message_id ? { ...msg, status: data.status } : msg
        )
      );
    };

    socketClient.onNewMessage(handleNewMessage);
    socketClient.onMessageStatus(handleMessageStatus);

    // Cleanup: leave room and remove listeners on unmount
    return () => {
      console.log('[WebSocket] Leaving conversation:', conversationId);
      socketClient.leaveConversation(conversationId);
      socketClient.off('message:new', handleNewMessage);
      socketClient.off('message:status', handleMessageStatus);
    };
  }, [conversationId]);

  // Auto-refresh messages every 30 seconds (reduced from 5s, WebSocket handles real-time)
  useEffect(() => {
    const interval = setInterval(() => {
      loadMessages();
    }, 30000);

    return () => clearInterval(interval);
  }, [loadMessages]);

  // Check if window is expired
  const isWindowExpired = conversation?.window_expires_at
    ? new Date(conversation.window_expires_at) < new Date()
    : false;

  const getWindowExpiryText = () => {
    if (!conversation?.window_expires_at) return null;

    const expiryDate = new Date(conversation.window_expires_at);
    const now = new Date();

    if (expiryDate < now) {
      return (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-yellow-800">
                ⚠️ Janela de 24h expirada. Use mensagens template para reengajar.
              </span>
            </div>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Enviar Template</span>
            </button>
          </div>
        </div>
      );
    }

    try {
      const timeLeft = formatDistanceToNow(expiryDate, {
        addSuffix: false,
        locale: ptBR,
      });
      return (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
          ✓ Janela ativa. Expira em {timeLeft}
        </div>
      );
    } catch {
      return null;
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {error}</div>
          <button
            onClick={() => router.push('/admin/conversations')}
            className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100"
          >
            Voltar para conversas
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingConversation) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-gray-500">Carregando conversa...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/conversations')}
              className="text-gray-600 hover:text-gray-900"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gray-900 dark:bg-white rounded-full flex items-center justify-center">
                <span className="text-white dark:text-gray-900 font-semibold">
                  {conversation?.contact?.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  {conversation?.contact?.name || conversation?.contact?.whatsapp_id || 'Contato'}
                </h1>
                <p className="text-sm text-gray-500">
                  {conversation?.contact?.whatsapp_id}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              conversation?.status === 'open' ? 'bg-green-100 text-green-800' :
              conversation?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
              conversation?.status === 'resolved' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {conversation?.status}
            </span>
          </div>
        </div>

        {/* Window expiry info */}
        <div className="mt-3">
          {getWindowExpiryText()}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <MessageList messages={messages} isLoading={isLoadingMessages} />
      </div>

      {/* Input */}
      <MessageInput
        onSendMessage={handleSendMessage}
        disabled={isWindowExpired}
        placeholder={
          isWindowExpired
            ? 'Janela de 24h expirada. Use mensagens template.'
            : 'Digite sua mensagem...'
        }
      />

      {/* Template Modal */}
      {conversation && (
        <TemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          conversationId={conversationId}
          whatsappNumberId={conversation.whatsapp_number_id}
          onTemplateSent={() => {
            setShowTemplateModal(false);
            loadMessages(); // Refresh messages to show sent template
          }}
        />
      )}
    </div>
  );
}
