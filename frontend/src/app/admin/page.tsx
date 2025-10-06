'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import {
  Users,
  MessageSquare,
  Send,
  Bot,
  TrendingUp,
  TrendingDown,
  Activity,
  Phone
} from 'lucide-react';

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

interface MetricCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendValue?: string;
  color: string;
}

function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
            {value.toLocaleString()}
          </p>
          <div className="flex items-center gap-2 mt-2">
            {trend && trendValue && (
              <div className={`flex items-center gap-1 text-xs ${trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {trendValue}
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color as keyof typeof colorClasses]}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadMetrics();
  }, []);

  const loadMetrics = async () => {
    try {
      const response = await analyticsAPI.getOverview();
      setMetrics(response.data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Administrativo</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Visão geral das métricas da sua organização
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total de Contatos"
          value={metrics?.total_contacts || 0}
          subtitle={`+${metrics?.new_contacts_today || 0} hoje`}
          icon={Users}
          trend="up"
          trendValue="+12%"
          color="blue"
        />
        <MetricCard
          title="Conversas Ativas"
          value={metrics?.active_conversations || 0}
          subtitle={`${metrics?.total_conversations || 0} no total`}
          icon={MessageSquare}
          trend="up"
          trendValue="+8%"
          color="green"
        />
        <MetricCard
          title="Mensagens Hoje"
          value={(metrics?.messages_sent_today || 0) + (metrics?.messages_received_today || 0)}
          subtitle={`${metrics?.messages_sent_today || 0} enviadas`}
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Campanhas Ativas"
          value={metrics?.active_campaigns || 0}
          subtitle={`${metrics?.total_campaigns || 0} no total`}
          icon={Send}
          color="orange"
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chatbots Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Status dos Chatbots</h2>
            <Bot className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total de Chatbots</span>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {metrics?.total_chatbots || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Chatbots Ativos</span>
              <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                {metrics?.active_chatbots || 0}
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                style={{
                  width: `${metrics?.total_chatbots ? (metrics.active_chatbots / metrics.total_chatbots) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Estatísticas Rápidas</h2>
            <Phone className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Taxa de Resposta</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">94.2%</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700">
              <span className="text-sm text-gray-600 dark:text-gray-400">Tempo Médio de Resposta</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">2.3 min</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Satisfação do Cliente</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">4.8/5.0</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
            <Bot className="h-8 w-8 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Criar Chatbot</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
            <Send className="h-8 w-8 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nova Campanha</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
            <Users className="h-8 w-8 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Adicionar Usuário</span>
          </button>
          <button className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-indigo-500 dark:hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group">
            <Phone className="h-8 w-8 text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 mb-2" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Config WhatsApp</span>
          </button>
        </div>
      </div>
    </div>
  );
}
