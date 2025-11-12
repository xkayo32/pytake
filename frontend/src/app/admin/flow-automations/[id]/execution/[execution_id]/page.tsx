'use client';

import { useRouter, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import api from '@/lib/api';

export default function AutomationExecutionMonitorPage() {
  const router = useRouter();
  const params = useParams();
  const automationId = params?.id as string;
  const executionId = params?.execution_id as string;

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    (async () => {
      try {
  const res = await api.get(`/flow-automations/${automationId}/stats`);
  setStats(res.data);
      } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
      } finally {
        setLoading(false);
      }
    })();
  }, [automationId]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/admin/flow-automations')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          Monitor da Execução
        </h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          <div><strong>Automation:</strong> {automationId}</div>
          <div><strong>Execution:</strong> {executionId}</div>
        </div>

        {loading ? (
          <div className="mt-6 animate-pulse h-24 bg-gray-200 dark:bg-gray-700 rounded" />
        ) : stats ? (
          <div className="mt-6">
            <div className="text-gray-900 dark:text-white font-medium mb-2">Progresso (agregado)</div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-gray-900 dark:bg-white h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(stats.delivery_rate || 0, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Enviadas: {stats.total_sent} • Entregues: {stats.total_delivered} • Concluídas: {stats.total_completed}
            </div>
            <div className="text-xs text-gray-500 mt-2">Tela de monitoramento detalhado será expandida nas próximas fases.</div>
          </div>
        ) : (
          <div className="mt-6 text-gray-500">Sem estatísticas disponíveis ainda.</div>
        )}
      </div>
    </div>
  );
}
