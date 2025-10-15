'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  MessageSquare,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { analyticsAPI } from '@/lib/api';

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    try {
      setIsLoading(true);
      const response = await analyticsAPI.getOverview();
      setAnalytics(response.data);
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return (
    <div className="space-y-6">
      {/* Métricas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Conversas"
          value={analytics?.total_conversations || 0}
          subtitle="Todas as conversas"
          icon={MessageSquare}
          color="blue"
          loading={isLoading}
        />

        <StatsCard
          title="Taxa de Resposta"
          value={`${analytics?.response_rate || 0}%`}
          subtitle="Últimos 7 dias"
          icon={TrendingUp}
          color="green"
          loading={isLoading}
        />

        <StatsCard
          title="Tempo Médio Resposta"
          value={`${analytics?.avg_response_time || 0}min`}
          subtitle="Últimos 7 dias"
          icon={Clock}
          color="orange"
          loading={isLoading}
        />

        <StatsCard
          title="Satisfação"
          value={`${analytics?.satisfaction_score || 0}/5`}
          subtitle="CSAT Score"
          icon={CheckCircle2}
          color="blue"
          loading={isLoading}
        />
      </div>

      {/* Em construção */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-12 text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-gray-100 dark:bg-gray-700 rounded-3xl flex items-center justify-center">
          <BarChart3 className="w-10 h-10 text-gray-600 dark:text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
          Gráficos e Relatórios Detalhados
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
          Visualização de dados históricos, comparativos e relatórios customizados serão adicionados em breve.
        </p>
      </div>
    </div>
  );
}
