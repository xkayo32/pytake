'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QueueItem from './QueueItem';
import { queueAPI } from '@/lib/api';
import { QueueSelector } from '@/components/admin/QueueSelector';

interface Conversation {
  id: string;
  contact: {
    id: string;
    name?: string;
    whatsapp_id: string;
  };
  status: string;
  queued_at?: string;
  queue_priority: number;
  total_messages: number;
  messages_from_contact: number;
  is_bot_active: boolean;
}

interface QueueListProps {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export default function QueueList({
  autoRefresh = true,
  refreshInterval = 5000,
}: QueueListProps) {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  
  // Filtros
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  // Load queue
  const loadQueue = async () => {
    try {
      const params: any = { limit: 100 };
      
      if (selectedDepartmentId) {
        params.department_id = selectedDepartmentId;
      }
      
      if (selectedQueueId) {
        params.queue_id = selectedQueueId;
      }
      
      const response = await queueAPI.list(params);
      setConversations(response.data);
      setError(null);
    } catch (err: any) {
      console.error('Error loading queue:', err);
      setError(err.response?.data?.detail || 'Erro ao carregar fila');
    } finally {
      setIsLoading(false);
    }
  };

  // Pull from queue
  const handlePull = async (conversationId?: string) => {
    if (isPulling) return;

    setIsPulling(true);
    try {
      const params: any = {};
      
      if (selectedDepartmentId) {
        params.department_id = selectedDepartmentId;
      }
      
      if (selectedQueueId) {
        params.queue_id = selectedQueueId;
      }
      
      const response = await queueAPI.pull(params);
      const pulledConversation = response.data;

      // Redirect to conversation
      router.push(`/agent/conversations/${pulledConversation.id}`);
    } catch (err: any) {
      console.error('Error pulling from queue:', err);
      if (err.response?.status === 404) {
        setError('Nenhuma conversa na fila');
      } else {
        setError(err.response?.data?.detail || 'Erro ao pegar da fila');
      }
    } finally {
      setIsPulling(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadQueue();
  }, [selectedDepartmentId, selectedQueueId]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      loadQueue();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, selectedDepartmentId, selectedQueueId]);

  if (error && isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-4">❌ {error}</div>
          <button
            onClick={loadQueue}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
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
      <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-green-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Fila de Atendimento
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {conversations.length} {conversations.length === 1 ? 'conversa aguardando' : 'conversas aguardando'}
            </p>
          </div>
          <button
            onClick={loadQueue}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
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

        {/* Queue Selector */}
        <div className="mb-4">
          <QueueSelector
            selectedDepartmentId={selectedDepartmentId}
            selectedQueueId={selectedQueueId}
            onDepartmentChange={setSelectedDepartmentId}
            onQueueChange={setSelectedQueueId}
            showAllOption={true}
          />
        </div>

        {/* Pull Next Button */}
        {conversations.length > 0 && (
          <button
            onClick={() => handlePull()}
            disabled={isPulling}
            className="w-full mt-4 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            {isPulling ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Pegando...
              </span>
            ) : (
              <>
                ⚡ Pegar Próxima 
                {selectedQueueId ? ' da Fila Selecionada' : selectedDepartmentId ? ' do Departamento' : ' da Fila'}
              </>
            )}
          </button>
        )}
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Carregando fila...</p>
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <div className="text-center">
              <svg
                className="w-20 h-20 text-gray-300 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-xl font-medium text-gray-700 mb-2">
                Fila vazia!
              </p>
              <p className="text-sm text-gray-500">
                Não há conversas aguardando atendimento no momento
              </p>
            </div>
          </div>
        ) : (
          <div>
            {conversations.map((conversation) => (
              <QueueItem
                key={conversation.id}
                conversation={conversation}
                onPull={handlePull}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer with priority legend */}
      {conversations.length > 0 && (
        <div className="flex-shrink-0 px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 font-medium">Prioridade:</span>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-gray-600">Urgente</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-gray-600">Alta</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-gray-600">Média/Baixa</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
