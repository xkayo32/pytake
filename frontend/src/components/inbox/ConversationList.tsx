'use client';

import { useState, useEffect } from 'react';
import ConversationItem from './ConversationItem';
import ConversationFilters from './ConversationFilters';
import { conversationsAPI } from '@/lib/api';

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
  is_bot_active: boolean;
  last_message?: any;
}

interface ConversationListProps {
  basePath?: string; // '/admin/conversations' or '/agent/conversations'
  selectedId?: string;
  onConversationSelect?: (id: string) => void;
  showFilters?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export default function ConversationList({
  basePath = '/admin/conversations',
  selectedId,
  onConversationSelect,
  showFilters = true,
  autoRefresh = true,
  refreshInterval = 5000,
}: ConversationListProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assignedToMe, setAssignedToMe] = useState<boolean>(false);

  // Load conversations
  const loadConversations = async () => {
    try {
      const params: any = {
        limit: 100,
      };

      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      if (assignedToMe) {
        params.assigned_to_me = true;
      }

      const response = await conversationsAPI.list(params);
      setConversations(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading conversations:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar conversas');
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [statusFilter, assignedToMe]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadConversations();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, statusFilter, assignedToMe]);

  // Apply search filter
  useEffect(() => {
    if (!searchQuery) {
      setFilteredConversations(conversations);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = conversations.filter((conv) => {
      const name = conv.contact?.name?.toLowerCase() || '';
      const whatsappId = conv.contact?.whatsapp_id?.toLowerCase() || '';
      return name.includes(query) || whatsappId.includes(query);
    });

    setFilteredConversations(filtered);
  }, [conversations, searchQuery]);

  const handleFilterChange = (filters: {
    status: string;
    search: string;
    assignedToMe: boolean;
  }) => {
    setStatusFilter(filters.status);
    setSearchQuery(filters.search);
    setAssignedToMe(filters.assignedToMe);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">❌ {error}</div>
          <button
            onClick={loadConversations}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversas
          </h2>
          <button
            onClick={loadConversations}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
            title="Atualizar"
          >
            <svg
              className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        <div className="text-sm text-gray-600">
          {filteredConversations.length} conversa{filteredConversations.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex-shrink-0 border-b border-gray-200">
          <ConversationFilters
            onFilterChange={handleFilterChange}
            initialStatus={statusFilter}
            initialSearch={searchQuery}
            initialAssignedToMe={assignedToMe}
          />
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando conversas...</p>
            </div>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <svg
                className="w-16 h-16 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <p className="text-gray-600 font-medium mb-2">
                {searchQuery
                  ? 'Nenhuma conversa encontrada'
                  : 'Nenhuma conversa ainda'}
              </p>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? 'Tente outro termo de busca'
                  : 'As conversas aparecerão aqui quando os clientes iniciarem contato'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {filteredConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedId === conversation.id}
                basePath={basePath}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with stats */}
      {filteredConversations.length > 0 && (
        <div className="flex-shrink-0 px-4 py-2 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>
              {conversations.filter((c) => c.status === 'open').length} abertas
            </span>
            <span>
              {conversations.filter((c) => c.status === 'active').length} ativas
            </span>
            <span>
              {conversations.filter((c) => c.status === 'queued').length} na fila
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
