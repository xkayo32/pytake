'use client';

import QueueList from '@/components/queue/QueueList';

export default function AgentQueuePage() {
  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Fila de Atendimento</h1>
            <p className="text-sm text-gray-600 mt-1">
              Pegue a próxima conversa e comece o atendimento
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Queue List */}
        <div className="flex-1 overflow-hidden bg-white">
          <QueueList autoRefresh={true} refreshInterval={5000} />
        </div>
      </div>
    </div>
  );
}
