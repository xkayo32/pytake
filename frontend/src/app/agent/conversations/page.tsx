'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConversationList from '@/components/inbox/ConversationList';

export default function AgentInboxPage() {
  const router = useRouter();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleConversationSelect = (id: string) => {
    setSelectedConversationId(id);
    router.push(`/agent/conversations/${id}`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Minhas Conversas</h1>
            <p className="text-sm text-gray-600 mt-1">
              Atendimentos ativos e histórico
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Stats */}
            <div className="flex items-center gap-4 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">--</div>
                <div className="text-xs text-gray-500">Minhas</div>
              </div>
              <div className="w-px h-8 bg-gray-300"></div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-900">--</div>
                <div className="text-xs text-gray-500">Ativas</div>
              </div>
            </div>

            {/* Quick action - Go to queue */}
            <button
              onClick={() => router.push('/agent/queue')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              <span className="font-medium">Pegar da Fila</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Conversation List */}
        <div className="w-96 flex-shrink-0 border-r border-gray-200 bg-white overflow-hidden">
          <ConversationList
            basePath="/agent/conversations"
            selectedId={selectedConversationId || undefined}
            onConversationSelect={handleConversationSelect}
            showFilters={true}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </div>

        {/* Right Area - Empty State / Instructions */}
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md px-8">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-100 to-green-200 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-600"
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
            </div>

            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Selecione um atendimento
            </h2>
            <p className="text-gray-600 mb-6">
              Escolha uma conversa da lista ao lado para continuar o atendimento ou visualizar o histórico.
            </p>

            <div className="bg-white border border-gray-200 rounded-lg p-6 text-left">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Dicas de atendimento
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>Use "Minhas conversas" para ver apenas seus atendimentos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>Responda rápido! Clientes esperam respostas em minutos</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>Verifique a janela de 24h antes de enviar mensagens</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">•</span>
                  <span>Use templates para reengajar após 24h</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 flex items-start gap-2">
                <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>
                  <strong>Não há atendimentos?</strong> Clique em "Pegar da Fila" para começar!
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
