'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConversationList from '@/components/inbox/ConversationList';
import { MessageSquare } from 'lucide-react';

export default function AdminInboxPage() {
  const router = useRouter();
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  const handleConversationSelect = (id: string) => {
    setSelectedConversationId(id);
    router.push(`/admin/conversations/${id}`);
  };

  return (
    <div className="h-full flex flex-col -mt-8 -mx-6">
      {/* Main Content - 2 Column Layout */}
      <div className="flex-1 flex overflow-hidden gap-6 p-6">
        {/* Left Sidebar - Conversation List */}
        <div className="w-96 flex-shrink-0 bg-white dark:bg-gray-800 rounded-2xl shadow-sm dark:border dark:border-gray-700 overflow-hidden">
          <ConversationList
            basePath="/admin/conversations"
            selectedId={selectedConversationId || undefined}
            onConversationSelect={handleConversationSelect}
            showFilters={true}
            autoRefresh={true}
            refreshInterval={5000}
          />
        </div>

        {/* Right Area - Empty State / Instructions */}
        <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-2xl">
          <div className="text-center max-w-md px-8">
            <div className="w-28 h-28 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-3xl flex items-center justify-center">
              <MessageSquare className="w-14 h-14 text-gray-600 dark:text-gray-400" />
            </div>

            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
              Selecione uma conversa
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
              Escolha uma conversa da lista ao lado para iniciar o atendimento ou visualizar o histórico de mensagens.
            </p>

            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-left shadow-lg">
              <h3 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-lg">
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Dicas rápidas
              </h3>
              <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-gray-600 dark:text-gray-400 text-xs font-bold">1</span>
                  </div>
                  <span>Use os filtros para encontrar conversas específicas</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-green-600 dark:text-green-400 text-xs font-bold">2</span>
                  </div>
                  <span>Conversas abertas aparecem com indicador verde</span>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 dark:text-blue-400 text-xs font-bold">3</span>
                  </div>
                  <span>A lista atualiza automaticamente a cada 5 segundos</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl">
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                <strong>💡 Novo:</strong> Use templates WhatsApp para reengajar clientes fora da janela de 24h!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
