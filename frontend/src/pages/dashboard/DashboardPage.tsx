import React, { useState } from 'react';
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  Calendar,
  Filter
} from 'lucide-react';
import { MetricsCard } from '@/components/dashboard/MetricsCard';
import { ConversationChart } from '@/components/dashboard/ConversationChart';
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart';
import { RecentActivity } from '@/components/dashboard/RecentActivity';

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(false);

  // Mock metrics data
  const metricsData = {
    activeConversations: {
      value: 127,
      change: { value: '+12%', type: 'increase' as const }
    },
    totalMessages: {
      value: 2847,
      change: { value: '+8%', type: 'increase' as const }
    },
    avgResponseTime: {
      value: '2.3min',
      change: { value: '-15%', type: 'decrease' as const }
    },
    customerSatisfaction: {
      value: '94%',
      change: { value: '+2%', type: 'increase' as const }
    }
  };

  const handlePeriodChange = (period: '7d' | '30d' | '90d') => {
    setSelectedPeriod(period);
    // Here you would typically refetch data for the new period
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Visão geral do sistema PyTake - Gestão WhatsApp Business
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center space-x-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value as '7d' | '30d' | '90d')}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Conversas Ativas"
          value={metricsData.activeConversations.value}
          change={metricsData.activeConversations.change}
          icon={MessageSquare}
          iconColor="text-blue-600"
          loading={loading}
        />
        
        <MetricsCard
          title="Mensagens Hoje"
          value={metricsData.totalMessages.value}
          change={metricsData.totalMessages.change}
          icon={TrendingUp}
          iconColor="text-green-600"
          loading={loading}
        />
        
        <MetricsCard
          title="Tempo Médio de Resposta"
          value={metricsData.avgResponseTime.value}
          change={metricsData.avgResponseTime.change}
          icon={Clock}
          iconColor="text-orange-600"
          loading={loading}
        />
        
        <MetricsCard
          title="Satisfação do Cliente"
          value={metricsData.customerSatisfaction.value}
          change={metricsData.customerSatisfaction.change}
          icon={Users}
          iconColor="text-purple-600"
          loading={loading}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ConversationChart 
          period={selectedPeriod}
          loading={loading}
        />
        
        <ResponseTimeChart
          loading={loading}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentActivity 
            loading={loading}
            limit={8}
          />
        </div>
        
        {/* Quick Stats */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Resumo de Hoje
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Conversas Iniciadas</span>
              <span className="text-lg font-semibold text-gray-900">23</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Conversas Resolvidas</span>
              <span className="text-lg font-semibold text-green-600">18</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Taxa de Resolução</span>
              <span className="text-lg font-semibold text-blue-600">78%</span>
            </div>
            
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-600">Novos Contatos</span>
              <span className="text-lg font-semibold text-purple-600">12</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-gray-600">Pico de Mensagens</span>
              <span className="text-lg font-semibold text-orange-600">14:30</span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              <span>Dados atualizados há 5 minutos</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}