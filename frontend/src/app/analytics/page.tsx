'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { analyticsAPI } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

interface OverviewMetrics {
  total_contacts: number;
  new_contacts_today: number;
  total_conversations: number;
  active_conversations: number;
  messages_sent_today: number;
  messages_received_today: number;
  total_campaigns: number;
  active_campaigns: number;
  total_chatbots: number;
  active_chatbots: number;
}

interface ConversationMetrics {
  total_conversations: number;
  open_conversations: number;
  closed_conversations: number;
  avg_response_time_seconds: number;
  avg_conversation_duration_minutes: number;
  conversations_by_status: Record<string, number>;
}

interface MessageMetrics {
  total_messages: number;
  incoming_messages: number;
  outgoing_messages: number;
  messages_today: number;
  avg_messages_per_conversation: number;
  messages_by_type: Record<string, number>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [conversations, setConversations] = useState<ConversationMetrics | null>(null);
  const [messages, setMessages] = useState<MessageMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<string>('7d');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadAnalytics();
  }, [isAuthenticated, router, period]);

  const loadAnalytics = async () => {
    setIsLoading(true);
    try {
      const [overviewRes, conversationsRes, messagesRes] = await Promise.all([
        analyticsAPI.getOverview(),
        analyticsAPI.getConversations({ period }),
        analyticsAPI.getMessages({ period }),
      ]);
      setOverview(overviewRes.data);
      setConversations(conversationsRes.data);
      setMessages(messagesRes.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow dark:border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics & Relatórios</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Visualize e analise seus dados</p>
          </div>
          <div className="flex gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Dashboard
            </button>
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
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Period Selector */}
        <div className="mb-6 flex gap-2">
          {[
            { value: '24h', label: 'Últimas 24h' },
            { value: '7d', label: 'Últimos 7 dias' },
            { value: '30d', label: 'Últimos 30 dias' },
            { value: '90d', label: 'Últimos 90 dias' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                period === option.value
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Carregando analytics...</div>
        ) : (
          <div className="space-y-6">
            {/* Overview Cards */}
            {overview && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total de Contatos</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{overview.total_contacts}</p>
                      <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                        +{overview.new_contacts_today} hoje
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                      <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversas</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{overview.total_conversations}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                        {overview.active_conversations} ativas
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                      <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Mensagens Hoje</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                        {overview.messages_sent_today + overview.messages_received_today}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {overview.messages_sent_today} enviadas / {overview.messages_received_today} recebidas
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                      <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Campanhas</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{overview.total_campaigns}</p>
                      <p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
                        {overview.active_campaigns} ativas
                      </p>
                    </div>
                    <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-full">
                      <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Conversation Metrics */}
            {conversations && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Métricas de Conversas</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Tempo Médio de Resposta</p>
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        {formatDuration(conversations.avg_response_time_seconds)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Duração Média</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {conversations.avg_conversation_duration_minutes.toFixed(0)} min
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Taxa de Fechamento</p>
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {conversations.total_conversations > 0
                          ? ((conversations.closed_conversations / conversations.total_conversations) * 100).toFixed(1)
                          : 0}%
                      </p>
                    </div>
                  </div>

                  {/* Status Distribution */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Conversas por Status</h3>
                    <div className="space-y-3">
                      {Object.entries(conversations.conversations_by_status).map(([status, count]) => (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600 dark:text-gray-400 capitalize">{status}</span>
                            <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full"
                              style={{
                                width: `${conversations.total_conversations > 0 ? (count / conversations.total_conversations) * 100 : 0}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Message Metrics */}
            {messages && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Métricas de Mensagens</h2>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total de Mensagens</p>
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{messages.total_messages}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Recebidas</p>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{messages.incoming_messages}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Enviadas</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{messages.outgoing_messages}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Média por Conversa</p>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {messages.avg_messages_per_conversation.toFixed(1)}
                      </p>
                    </div>
                  </div>

                  {/* Type Distribution */}
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Mensagens por Tipo</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(messages.messages_by_type).map(([type, count]) => (
                        <div key={type} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">{count}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 capitalize mt-1">{type}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Export Actions */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Exportar Relatórios</h2>
              <div className="flex gap-4">
                <button
                  onClick={() => alert('Exportação CSV em desenvolvimento')}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => alert('Exportação PDF em desenvolvimento')}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
                >
                  Exportar PDF
                </button>
                <button
                  onClick={() => alert('Exportação Excel em desenvolvimento')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Exportar Excel
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
