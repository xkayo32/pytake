'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/formatNumber';
import {
  MessageSquare,
  Clock,
  CheckCircle,
  TrendingUp,
  Award,
  Target,
  Timer,
  Users
} from 'lucide-react';

interface AgentMetrics {
  conversations_today: number;
  conversations_active: number;
  conversations_completed: number;
  average_response_time: string;
  satisfaction_rating: number;
  messages_sent_today: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

function StatCard({ title, value, subtitle, icon: Icon, color }: StatCardProps) {
  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {value}
          </p>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function AgentDashboard() {
  const [metrics, setMetrics] = useState<AgentMetrics>({
    conversations_today: 0,
    conversations_active: 0,
    conversations_completed: 0,
    average_response_time: '0s',
    satisfaction_rating: 0,
    messages_sent_today: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // TODO: Carregar métricas reais da API
    // Simulando dados para demonstração
    setTimeout(() => {
      setMetrics({
        conversations_today: 23,
        conversations_active: 3,
        conversations_completed: 20,
        average_response_time: '2.3 min',
        satisfaction_rating: 4.8,
        messages_sent_today: 156,
      });
      setIsLoading(false);
    }, 1000);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600 dark:text-gray-400">Carregando métricas...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meu Dashboard</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Acompanhe seu desempenho e produtividade
        </p>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Atendimentos Hoje"
          value={metrics.conversations_today}
          subtitle={`${metrics.conversations_completed} concluídos`}
          icon={MessageSquare}
          color="green"
        />
        <StatCard
          title="Conversas Ativas"
          value={metrics.conversations_active}
          subtitle="Aguardando resposta"
          icon={Clock}
          color="blue"
        />
        <StatCard
          title="Tempo Médio de Resposta"
          value={metrics.average_response_time}
          subtitle="Últimas 24 horas"
          icon={Timer}
          color="purple"
        />
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Satisfaction Rating */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Avaliação de Satisfação</h2>
            <Award className="h-5 w-5 text-yellow-500" />
          </div>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-5xl font-bold text-yellow-500 mb-2">
                {formatNumber(metrics.satisfaction_rating, 1)}
              </div>
              <div className="flex items-center justify-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <svg
                    key={star}
                    className={`h-6 w-6 ${
                      star <= Math.round(metrics.satisfaction_rating ?? 0)
                        ? 'text-yellow-500'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Baseado em {metrics.conversations_completed} avaliações</p>
            </div>
          </div>
        </div>

        {/* Daily Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Atividade Hoje</h2>
            <TrendingUp className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Atendimentos Concluídos</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.conversations_completed}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <MessageSquare className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Mensagens Enviadas</span>
              </div>
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.messages_sent_today}
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Meta Diária</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {Math.round((metrics.conversations_completed / 25) * 100)}%
                </span>
                <p className="text-xs text-gray-500 dark:text-gray-400">20/25 atendimentos</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg group-hover:bg-green-100 dark:group-hover:bg-green-900/40 transition-colors">
              <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-gray-900 dark:text-white">Pegar da Fila</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">0 aguardando</p>
            </div>
          </button>
          <button className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 transition-colors">
              <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-gray-900 dark:text-white">Conversas Ativas</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">{metrics.conversations_active} abertas</p>
            </div>
          </button>
          <button className="flex items-center gap-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 dark:hover:border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group">
            <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg group-hover:bg-purple-100 dark:group-hover:bg-purple-900/40 transition-colors">
              <Clock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="text-left">
              <h3 className="font-medium text-gray-900 dark:text-white">Ver Histórico</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Últimos atendimentos</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
