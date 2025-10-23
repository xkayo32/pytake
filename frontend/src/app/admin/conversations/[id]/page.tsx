'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { conversationsAPI, usersAPI, departmentsAPI } from '@/lib/api';
import { Conversation, Message } from '@/types/conversation';
import MessageList from '@/components/chat/MessageList';
import MessageInput from '@/components/chat/MessageInput';
import TemplateModal from '@/components/chat/TemplateModal';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { socketClient } from '@/lib/socket';
import { useAuthStore } from '@/store/authStore';
import { ArrowLeft, User, Clock, MessageSquare, Calendar, Phone, Mail, Building, UserPlus, Send, XCircle, ChevronRight } from 'lucide-react';

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
  const [isContactTyping, setIsContactTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(true);

  // Actions state
  const [agents, setAgents] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [closeReason, setCloseReason] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  // Load agents and departments
  useEffect(() => {
    const loadData = async () => {
      try {
        const [agentsRes, deptsRes] = await Promise.all([
          usersAPI.list({ role: 'agent', is_active: true, limit: 50 }),
          departmentsAPI.listActive(),
        ]);
        setAgents(agentsRes.data || []);
        setDepartments(deptsRes.data || []);
      } catch (err) {
        console.error('Error loading agents/departments:', err);
      }
    };
    loadData();
  }, []);

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
      throw err;
    }
  };

  // Actions handlers
  const handleAssign = async () => {
    if (!selectedAgent) return;
    setIsActionLoading(true);
    try {
      await conversationsAPI.assign(conversationId, selectedAgent);
      setSelectedAgent('');
      loadConversation();
    } catch (err) {
      console.error('Erro ao atribuir:', err);
      alert('Erro ao atribuir conversa');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!selectedDepartment) return;
    setIsActionLoading(true);
    try {
      await conversationsAPI.transfer(conversationId, selectedDepartment, transferNote || undefined);
      setSelectedDepartment('');
      setTransferNote('');
      loadConversation();
    } catch (err) {
      console.error('Erro ao transferir:', err);
      alert('Erro ao transferir conversa');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleClose = async () => {
    setIsActionLoading(true);
    try {
      await conversationsAPI.close(conversationId, closeReason || 'Encerrada', true);
      setCloseReason('');
      loadConversation();
    } catch (err) {
      console.error('Erro ao encerrar:', err);
      alert('Erro ao encerrar conversa');
    } finally {
      setIsActionLoading(false);
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

    // Listen for typing indicators
    const handleTyping = (data: any) => {
      console.log('[WebSocket] Typing indicator:', data);
      // Only show typing if it's from contact (not from agent)
      if (data.user_id !== useAuthStore.getState().user?.id) {
        setIsContactTyping(data.typing);
      }
    };

    socketClient.onNewMessage(handleNewMessage);
    socketClient.onMessageStatus(handleMessageStatus);
    socketClient.onTyping(handleTyping);

    // Cleanup: leave room and remove listeners on unmount
    return () => {
      console.log('[WebSocket] Leaving conversation:', conversationId);
      socketClient.leaveConversation(conversationId);
      socketClient.off('message:new', handleNewMessage);
      socketClient.off('message:status', handleMessageStatus);
      socketClient.off('user_typing', handleTyping);
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="text-red-500 dark:text-red-400 text-xl mb-4">❌ {error}</div>
          <button
            onClick={() => router.push('/admin/conversations')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Voltar para conversas
          </button>
        </div>
      </div>
    );
  }

  if (isLoadingConversation) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-500 dark:text-gray-400">Carregando conversa...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.push('/admin/conversations')}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-11 h-11 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">
                  {conversation?.contact?.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {conversation?.contact?.name || 'Sem nome'}
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {conversation?.contact?.whatsapp_id}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              conversation?.status === 'open' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
              conversation?.status === 'queued' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
              conversation?.status === 'pending' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
            }`}>
              {conversation?.status}
            </span>

            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <ChevronRight className={`w-5 h-5 transition-transform ${showSidebar ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>

        {/* Window expiry banner */}
        {isWindowExpired && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800 px-6 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Janela de 24h expirada. Use mensagens template para reengajar.
              </span>
              <button
                onClick={() => setShowTemplateModal(true)}
                className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
              >
                Enviar Template
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            isLoading={isLoadingMessages}
            isTyping={isContactTyping}
          />
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
          onTypingStart={() => socketClient.startTyping(conversationId)}
          onTypingStop={() => socketClient.stopTyping(conversationId)}
        />
      </div>

      {/* Right Sidebar */}
      {showSidebar && (
        <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
          {/* Contact Info */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Informações do Contato
            </h2>
            
            <div className="flex flex-col items-center mb-6">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg mb-3">
                <span className="text-white font-bold text-2xl">
                  {conversation?.contact?.name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center">
                {conversation?.contact?.name || 'Sem nome'}
              </h3>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-900 dark:text-white">{conversation?.contact?.whatsapp_id}</span>
              </div>
              {conversation?.contact?.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                  <span className="text-gray-900 dark:text-white">{conversation.contact.email}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  Desde {conversation?.created_at ? format(new Date(conversation.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) : '--'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <MessageSquare className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                <span className="text-gray-600 dark:text-gray-400">
                  {conversation?.total_messages || 0} mensagens
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Ações Rápidas
            </h2>

            {/* Assign Agent */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Atribuir Agente
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAgent}
                  onChange={(e) => setSelectedAgent(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Selecione um agente...</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name || agent.email}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAssign}
                  disabled={!selectedAgent || isActionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="w-4 h-4" />
                </button>
              </div>
              {conversation?.assigned_agent_id && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Atualmente atribuída
                </p>
              )}
            </div>

            {/* Transfer Department */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Encaminhar Departamento
              </label>
              <div className="space-y-2">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Selecione um departamento...</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
                <textarea
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Motivo (opcional)..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={handleTransfer}
                  disabled={!selectedDepartment || isActionLoading}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Encaminhar
                </button>
              </div>
            </div>

            {/* Close Conversation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Encerrar Conversa
              </label>
              <div className="space-y-2">
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Motivo do encerramento..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
                <button
                  onClick={handleClose}
                  disabled={isActionLoading}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <XCircle className="w-4 h-4" />
                  Encerrar
                </button>
              </div>
            </div>
          </div>

          {/* Conversation Stats */}
          {conversation && (
            <div className="p-6">
              <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                Estatísticas
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total de mensagens</span>
                  <span className="font-medium text-gray-900 dark:text-white">{conversation.total_messages || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Não lidas</span>
                  <span className="font-medium text-gray-900 dark:text-white">{conversation.unread_count || 0}</span>
                </div>
                {conversation.last_message_at && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Última mensagem</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                )}
                {conversation.window_expires_at && !isWindowExpired && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Janela expira em</span>
                    <span className="font-medium text-green-600 dark:text-green-400">
                      {formatDistanceToNow(new Date(conversation.window_expires_at), { locale: ptBR })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Template Modal */}
      {conversation && (
        <TemplateModal
          isOpen={showTemplateModal}
          onClose={() => setShowTemplateModal(false)}
          conversationId={conversationId}
          whatsappNumberId={conversation.whatsapp_number_id}
          onTemplateSent={() => {
            setShowTemplateModal(false);
            loadMessages();
          }}
        />
      )}
    </div>
  );
}
