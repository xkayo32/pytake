'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { conversationsAPI } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Conversation {
  id: string;
  contact: {
    id: string;
    name: string;
    whatsapp_id: string;
  };
  status: string;
  priority: string;
  last_message_at: string;
  unread_count: number;
}

interface Message {
  id: string;
  content: string;
  direction: 'incoming' | 'outgoing';
  created_at: string;
  status?: string;
}

export default function ConversationsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadConversations();
  }, [isAuthenticated, router]);

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const response = await conversationsAPI.list({ limit: 50 });
      setConversations(response.data.items);
      if (response.data.items.length > 0 && !selectedConversation) {
        selectConversation(response.data.items[0]);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setSelectedConversation(conversation);
    try {
      const response = await conversationsAPI.get(conversation.id);
      // Assumindo que a API retorna mensagens na conversa
      setMessages(response.data.messages || []);
    } catch (error) {
      console.error('Failed to load messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || isSending) return;

    setIsSending(true);
    try {
      await conversationsAPI.sendMessage(selectedConversation.id, {
        content: newMessage,
        message_type: 'text',
      });

      // Adiciona mensagem localmente
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage,
        direction: 'outgoing',
        created_at: new Date().toISOString(),
        status: 'sent',
      };
      setMessages([...messages, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Erro ao enviar mensagem');
    } finally {
      setIsSending(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: any = {
      open: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      closed: 'bg-gray-100 text-gray-800',
      archived: 'bg-blue-100 text-blue-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors: any = {
      urgent: 'text-red-600',
      high: 'text-orange-600',
      medium: 'text-yellow-600',
      low: 'text-gray-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Conversas</h1>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← Dashboard
          </button>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversations List */}
        <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <input
              type="text"
              placeholder="Buscar conversas..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">Carregando...</div>
            ) : conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">Nenhuma conversa</div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => selectConversation(conv)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedConversation?.id === conv.id ? 'bg-indigo-50 dark:bg-indigo-900' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">{conv.contact.name}</h3>
                    {conv.unread_count > 0 && (
                      <span className="bg-indigo-600 text-white text-xs px-2 py-1 rounded-full">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{conv.contact.whatsapp_id}</p>
                  <div className="flex gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${getStatusColor(conv.status)}`}>
                      {conv.status}
                    </span>
                    <span className={`text-xs ${getPriorityColor(conv.priority)}`}>
                      {conv.priority}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedConversation.contact.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedConversation.contact.whatsapp_id}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                      Info
                    </button>
                    <button className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300">
                      Encerrar
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 mt-8">
                    Nenhuma mensagem nesta conversa
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-md px-4 py-2 rounded-lg ${
                          msg.direction === 'outgoing'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <p
                          className={`text-xs mt-1 ${
                            msg.direction === 'outgoing' ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {msg.status && msg.direction === 'outgoing' && ` • ${msg.status}`}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Message Input */}
              <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Digite sua mensagem..."
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
                    disabled={isSending}
                  />
                  <button
                    onClick={sendMessage}
                    disabled={isSending || !newMessage.trim()}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSending ? 'Enviando...' : 'Enviar'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
              Selecione uma conversa para começar
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
