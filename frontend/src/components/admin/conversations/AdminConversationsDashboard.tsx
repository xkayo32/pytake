'use client';

import { useState, useEffect } from 'react';
import { conversationsAPI } from '@/lib/api';
import { Clock, AlertCircle, Users, TrendingUp } from 'lucide-react';
import QuickActions from './QuickActions';

interface Conversation {
  id: string;
  contact: {
    id: string;
    name?: string;
    whatsapp_id: string;
  };
  status: string;
  last_message_at?: string;
  total_messages: number;
  unread_count?: number;
  current_agent_id?: string;
  assigned_department_id?: string;
  queue_id?: string;
  is_bot_active: boolean;
  queued_at?: string;
  priority?: string;
}

interface Metrics {
  total: number;
  open: number;
  active: number;
  queued: number;
  avg_wait_seconds: number | null;
  overflow_count: number;
  sla_violations: number;
}

export default function AdminConversationsDashboard() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      const [convRes, metricsRes] = await Promise.allSettled([
        conversationsAPI.list({ limit: 100, status: statusFilter !== 'all' ? statusFilter : undefined }),
        conversationsAPI.getMetrics(),
      ]);

      if (convRes.status === 'fulfilled') {
        setConversations(convRes.value.data || []);
      }

      if (metricsRes.status === 'fulfilled') {
        setMetrics(metricsRes.value.data || null);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [statusFilter]);

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.contact?.name?.toLowerCase().includes(q) ||
      conv.contact?.whatsapp_id?.toLowerCase().includes(q)
    );
  });

  const getWaitTime = (lastMessageAt?: string, queuedAt?: string) => {
    const ref = queuedAt || lastMessageAt;
    if (!ref) return '--';
    const seconds = Math.floor((Date.now() - new Date(ref).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const formatTime = (seconds: number | null) => {
    if (!seconds) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Metrics Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Painel de Conversas</h1>
        
        <div className="grid grid-cols-4 gap-4">
          {/* Total Conversations */}
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg p-4 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-purple-700 dark:text-purple-300">Total</span>
              <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">{metrics?.total || 0}</div>
          </div>

          {/* Queued */}
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/30 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">Na Fila</span>
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">{metrics?.queued || 0}</div>
            <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
              Tempo médio: {formatTime(metrics?.avg_wait_seconds || null)}
            </div>
          </div>

          {/* Active */}
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Ativas</span>
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">{metrics?.active || 0}</div>
          </div>

          {/* Critical */}
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/30 rounded-lg p-4 border border-red-200 dark:border-red-700">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">Críticas</span>
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="text-3xl font-bold text-red-900 dark:text-red-100">
              {(metrics?.overflow_count || 0) + (metrics?.sla_violations || 0)}
            </div>
            <div className="text-xs text-red-700 dark:text-red-300 mt-1">
              SLA: {metrics?.sla_violations || 0} | Overflow: {metrics?.overflow_count || 0}
            </div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center gap-4">
          <input
            type="text"
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
          
          <div className="flex gap-2">
            {['all', 'queued', 'active', 'open'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'Todas' : status === 'queued' ? 'Fila' : status === 'active' ? 'Ativas' : 'Abertas'}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-gray-400 dark:text-gray-600 text-5xl mb-4">💬</div>
              <p className="text-gray-600 dark:text-gray-400">Nenhuma conversa encontrada</p>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Contato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tempo Espera
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Msgs
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Atribuição
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredConversations.map((conv) => {
                  const waitTime = getWaitTime(conv.last_message_at, conv.queued_at);
                  const isOverflow = conv.last_message_at && 
                    (Date.now() - new Date(conv.last_message_at).getTime()) > 600000;

                  return (
                    <tr key={conv.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            conv.status === 'queued'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                              : conv.status === 'active'
                              ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                              : conv.status === 'open'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}
                        >
                          {conv.status === 'queued' ? 'Fila' : conv.status === 'active' ? 'Ativa' : conv.status === 'open' ? 'Aberta' : 'Fechada'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-purple-500 dark:bg-purple-600 flex items-center justify-center text-white font-medium">
                              {(conv.contact?.name || conv.contact?.whatsapp_id || '?')[0].toUpperCase()}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {conv.contact?.name || 'Sem nome'}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{conv.contact?.whatsapp_id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className={`w-4 h-4 ${isOverflow ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-gray-500'}`} />
                          <span className={`text-sm ${isOverflow ? 'text-red-700 dark:text-red-400 font-semibold' : 'text-gray-900 dark:text-gray-100'}`}>
                            {waitTime}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-900 dark:text-gray-100">{conv.total_messages}</span>
                          {conv.unread_count && conv.unread_count > 0 && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {conv.current_agent_id ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                            👤 Atribuída
                          </span>
                        ) : conv.is_bot_active ? (
                          <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs">
                            🤖 Bot
                          </span>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500">Sem atribuição</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => window.location.href = `/admin/conversations/${conv.id}`}
                            className="text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 font-medium text-xs"
                          >
                            Ver
                          </button>
                          <span className="text-gray-300 dark:text-gray-600">|</span>
                          <QuickActions conversationId={conv.id} onSuccess={loadData} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
