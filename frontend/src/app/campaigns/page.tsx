'use client';

import { useEffect, useState } from 'react';
import { formatNumber } from '@/lib/formatNumber';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { campaignsAPI } from '@/lib/api';
import { ThemeToggle } from '@/components/ThemeToggle';

interface Campaign {
  id: string;
  name: string;
  status: string;
  total_recipients: number;
  messages_sent: number;
  messages_delivered: number;
  delivery_rate: number;
  created_at: string;
}

export default function CampaignsPage() {
  const router = useRouter();
  const { isAuthenticated, logout } = useAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    loadCampaigns();
  }, [isAuthenticated, router, filter]);

  const loadCampaigns = async () => {
    setIsLoading(true);
    try {
      const response = await campaignsAPI.list({
        status: filter === 'all' ? undefined : filter,
      });
      setCampaigns(response.data.items);
    } catch (error) {
      console.error('Failed to load campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: any = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      running: 'bg-green-100 text-green-800',
      paused: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-indigo-100 text-indigo-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return badges[status] || 'bg-gray-100 text-gray-800';
  };

  const handleAction = async (campaignId: string, action: string) => {
    try {
      switch (action) {
        case 'start':
          await campaignsAPI.start(campaignId);
          break;
        case 'pause':
          await campaignsAPI.pause(campaignId);
          break;
        case 'resume':
          await campaignsAPI.resume(campaignId);
          break;
        case 'cancel':
          if (confirm('Tem certeza que deseja cancelar esta campanha?')) {
            await campaignsAPI.cancel(campaignId);
          }
          break;
      }
      loadCampaigns();
    } catch (error) {
      console.error(`Failed to ${action} campaign:`, error);
      alert(`Erro ao ${action} campanha`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow dark:border-b dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Campanhas</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Mensagens em massa para seus contatos</p>
          </div>
          <div className="flex gap-4">
            <ThemeToggle />
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                logout();
                router.push('/login');
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters and Actions */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex gap-2">
            {['all', 'draft', 'scheduled', 'running', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'Todas' : status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => alert('Wizard de criação em desenvolvimento')}
            className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 font-medium"
          >
            + Nova Campanha
          </button>
        </div>

        {/* Campaigns Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-gray-600 dark:text-gray-400">Carregando...</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 mb-4">Nenhuma campanha encontrada</p>
            <button
              onClick={() => alert('Wizard de criação em desenvolvimento')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Criar primeira campanha
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white dark:bg-gray-800 rounded-lg shadow dark:border dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{campaign.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusBadge(campaign.status)}`}>
                    {campaign.status}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Destinatários:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{campaign.total_recipients}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Enviadas:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{campaign.messages_sent}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Entregues:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{campaign.messages_delivered}</span>
                  </div>
                  {campaign.delivery_rate !== null && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Taxa de entrega:</span>
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {formatNumber(campaign.delivery_rate, 1)}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleAction(campaign.id, 'start')}
                      className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Iniciar
                    </button>
                  )}
                  {campaign.status === 'running' && (
                    <button
                      onClick={() => handleAction(campaign.id, 'pause')}
                      className="flex-1 px-3 py-2 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700"
                    >
                      Pausar
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <button
                      onClick={() => handleAction(campaign.id, 'resume')}
                      className="flex-1 px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Retomar
                    </button>
                  )}
                  {['draft', 'scheduled', 'running', 'paused'].includes(campaign.status) && (
                    <button
                      onClick={() => handleAction(campaign.id, 'cancel')}
                      className="flex-1 px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    onClick={() => router.push(`/campaigns/${campaign.id}`)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Detalhes
                  </button>
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Criada em {new Date(campaign.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
