'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import { useRouter } from 'next/navigation';
import {
  Users,
  MessageSquare,
  Send,
  Bot,
  Activity,
  Phone,
  UserPlus,
  BarChart3,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { PageTransition, StaggerContainer, StaggerItem, FadeIn } from '@/components/ui';

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

export default function AdminDashboard() {
  const router = useRouter();
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

  return (
    <PageTransition>
      <div className="space-y-6">
        {/* Metrics Grid */}
        <StaggerContainer staggerDelay={0.08}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StaggerItem>
              <StatsCard
                title="Total de Contatos"
                value={metrics?.total_contacts || 0}
                subtitle={`+${metrics?.new_contacts_today || 0} hoje`}
                icon={UserPlus}
                trend={{
                  value: '+12%',
                  direction: 'up',
                }}
                color="blue"
                loading={isLoading}
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
                title="Conversas Ativas"
                value={metrics?.active_conversations || 0}
                subtitle={`${metrics?.total_conversations || 0} no total`}
                icon={MessageSquare}
                trend={{
                  value: '+8%',
                  direction: 'up',
                }}
                color="green"
                loading={isLoading}
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
                title="Mensagens Hoje"
                value={(metrics?.messages_sent_today || 0) + (metrics?.messages_received_today || 0)}
                subtitle={`${metrics?.messages_sent_today || 0} enviadas`}
                icon={Activity}
                color="blue"
                loading={isLoading}
              />
            </StaggerItem>
            <StaggerItem>
              <StatsCard
                title="Campanhas Ativas"
                value={metrics?.active_campaigns || 0}
                subtitle={`${metrics?.total_campaigns || 0} no total`}
                icon={Send}
                color="orange"
                loading={isLoading}
              />
            </StaggerItem>
          </div>
        </StaggerContainer>

        {/* Secondary Metrics */}
        <FadeIn delay={0.3}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Chatbots Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Chatbots</h2>
                <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Bot className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metrics?.total_chatbots || 0}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ativos</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {metrics?.active_chatbots || 0}
                  </span>
                </div>
                <div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-600 rounded-full transition-all duration-500"
                      style={{
                        width: `${metrics?.total_chatbots ? (metrics.active_chatbots / metrics.total_chatbots) * 100 : 0}%`
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                    {metrics?.total_chatbots ? Math.round((metrics.active_chatbots / metrics.total_chatbots) * 100) : 0}% ativo
                  </p>
                </div>
              </div>
            </div>

            {/* Performance */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Performance</h2>
                <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Taxa de Resposta</span>
                  <span className="text-base font-bold text-green-600 dark:text-green-400">94.2%</span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Tempo de Resposta</span>
                  <span className="text-base font-bold text-blue-600 dark:text-blue-400">2.3 min</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Satisfação</span>
                  <div className="flex items-center gap-1">
                    <span className="text-base font-bold text-yellow-500">★</span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">4.8/5.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Atividade Recente */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Atividade</h2>
                <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <Activity className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Mensagens/dia</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">
                    {(metrics?.messages_sent_today || 0) + (metrics?.messages_received_today || 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversas/dia</span>
                  <span className="text-base font-bold text-gray-900 dark:text-white">{metrics?.total_conversations || 0}</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Usuários online</span>
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    <span className="text-base font-bold text-gray-900 dark:text-white">3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Quick Actions */}
        <FadeIn delay={0.4}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm dark:border dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Ações Rápidas</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/admin/chatbots')}
                className="group flex flex-col items-center justify-center p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all duration-200"
              >
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                  <Bot className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3 group-hover:text-primary-600 dark:group-hover:text-primary-400">Criar Chatbot</span>
              </button>
              <button
                onClick={() => router.push('/admin/campaigns')}
                className="group flex flex-col items-center justify-center p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all duration-200"
              >
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                  <Send className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3 group-hover:text-primary-600 dark:group-hover:text-primary-400">Nova Campanha</span>
              </button>
              <button
                onClick={() => router.push('/admin/users')}
                className="group flex flex-col items-center justify-center p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all duration-200"
              >
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                  <Users className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3 group-hover:text-primary-600 dark:group-hover:text-primary-400">Adicionar Usuário</span>
              </button>
              <button
                onClick={() => router.push('/admin/whatsapp')}
                className="group flex flex-col items-center justify-center p-5 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-500 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-950/20 transition-all duration-200"
              >
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                  <Phone className="h-6 w-6 text-gray-600 dark:text-gray-400 group-hover:text-primary-600 dark:group-hover:text-primary-400" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-3 group-hover:text-primary-600 dark:group-hover:text-primary-400">Config WhatsApp</span>
              </button>
            </div>
          </div>
        </FadeIn>
      </div>
    </PageTransition>
  );
}
