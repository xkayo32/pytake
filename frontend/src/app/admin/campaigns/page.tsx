'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Megaphone,
  Plus,
  Search,
  Filter,
  Play,
  Pause,
  RotateCw,
  XCircle,
  Trash2,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
} from 'lucide-react';
import { formatNumberLocale } from '@/lib/formatNumber';
import { DataTable } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { ActionButton } from '@/components/admin/ActionButton';
import { campaignsAPI } from '@/lib/api';
import { Campaign, CampaignStatus } from '@/types/campaign';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<CampaignStatus | 'all'>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchCampaigns = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };

      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const response = await campaignsAPI.list(params);
      let filteredCampaigns = response.data.items;

      // Filtro de busca no frontend
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredCampaigns = filteredCampaigns.filter((campaign: Campaign) =>
          campaign.name.toLowerCase().includes(query)
        );
      }

      setCampaigns(filteredCampaigns);
    } catch (error) {
      console.error('Erro ao carregar campanhas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, [selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCampaigns();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStart = async (campaignId: string) => {
    if (!confirm('Iniciar esta campanha agora?')) return;
    try {
      await campaignsAPI.start(campaignId);
      fetchCampaigns();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
    }
  };

  const handlePause = async (campaignId: string) => {
    try {
      await campaignsAPI.pause(campaignId);
      fetchCampaigns();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
    }
  };

  const handleResume = async (campaignId: string) => {
    try {
      await campaignsAPI.resume(campaignId);
      fetchCampaigns();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
    }
  };

  const handleCancel = async (campaignId: string) => {
    if (!confirm('Cancelar esta campanha? Esta ação não pode ser desfeita.')) return;
    try {
      await campaignsAPI.cancel(campaignId);
      fetchCampaigns();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao cancelar campanha:', error);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Deletar esta campanha permanentemente?')) return;
    try {
      await campaignsAPI.delete(campaignId);
      fetchCampaigns();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const configs: Record<CampaignStatus, { icon: any; color: string; label: string }> = {
      draft: { icon: Clock, color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400', label: 'Rascunho' },
      scheduled: { icon: Clock, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', label: 'Agendada' },
      running: { icon: Send, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', label: 'Enviando' },
      paused: { icon: Pause, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', label: 'Pausada' },
      completed: { icon: CheckCircle, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', label: 'Concluída' },
      cancelled: { icon: XCircle, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', label: 'Cancelada' },
      failed: { icon: AlertCircle, color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400', label: 'Falhou' },
    };

    const config = configs[status] || configs.draft;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const columns = [
    {
      key: 'name',
      header: 'Campanha',
      render: (campaign: Campaign) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {campaign.name}
          </div>
          {campaign.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {campaign.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (campaign: Campaign) => getStatusBadge(campaign.status),
    },
    {
      key: 'recipients',
      header: 'Destinatários',
      render: (campaign: Campaign) => (
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900 dark:text-white">
            {(campaign.total_recipients ?? 0).toLocaleString('pt-BR')}
          </div>
        </div>
      ),
    },
    {
      key: 'progress',
      header: 'Progresso',
      render: (campaign: Campaign) => (
        <div className="min-w-[120px]">
            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>{campaign.messages_sent} enviadas</span>
            <span>{formatNumberLocale(((campaign.messages_sent ?? 0) / Math.max(campaign.total_recipients ?? 1, 1)) * 100, 0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gray-900 dark:bg-white h-2 rounded-full transition-all duration-300"
              style={{
                width: `${Math.min((campaign.messages_sent / Math.max(campaign.total_recipients, 1)) * 100, 100)}%`
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'metrics',
      header: 'Métricas',
      render: (campaign: Campaign) => (
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <div className="font-semibold text-green-600 dark:text-green-400">
              {campaign.messages_delivered}
            </div>
            <div className="text-gray-500">Entregues</div>
          </div>
          <div>
            <div className="font-semibold text-blue-600 dark:text-blue-400">
              {campaign.messages_read}
            </div>
            <div className="text-gray-500">Lidas</div>
          </div>
          <div>
            <div className="font-semibold text-red-600 dark:text-red-400">
              {campaign.messages_failed}
            </div>
            <div className="text-gray-500">Falhas</div>
          </div>
        </div>
      ),
    },
    {
      key: 'created',
      header: 'Criada',
      render: (campaign: Campaign) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {formatDistanceToNow(new Date(campaign.created_at), {
            addSuffix: true,
            locale: ptBR
          })}
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (campaign: Campaign) => (
        <div className="relative">
          <button
            onClick={() => setOpenDropdown(openDropdown === campaign.id ? null : campaign.id)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-500" />
          </button>

          {openDropdown === campaign.id && (
            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-10">
              {campaign.status === 'draft' && (
                <button
                  onClick={() => handleStart(campaign.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600"
                >
                  <Play className="w-4 h-4" />
                  Iniciar Agora
                </button>
              )}

              {campaign.status === 'running' && (
                <button
                  onClick={() => handlePause(campaign.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-yellow-600"
                >
                  <Pause className="w-4 h-4" />
                  Pausar
                </button>
              )}

              {campaign.status === 'paused' && (
                <button
                  onClick={() => handleResume(campaign.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-green-600"
                >
                  <RotateCw className="w-4 h-4" />
                  Retomar
                </button>
              )}

              {(campaign.status === 'running' || campaign.status === 'paused') && (
                <>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => handleCancel(campaign.id)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                  >
                    <XCircle className="w-4 h-4" />
                    Cancelar
                  </button>
                </>
              )}

              {(campaign.status === 'draft' || campaign.status === 'cancelled' || campaign.status === 'completed' || campaign.status === 'failed') && (
                <>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                    Deletar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar campanhas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white"
          />
        </div>

        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as CampaignStatus | 'all')}
          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-white dark:text-white font-medium"
        >
          <option value="all">Todos</option>
          <option value="draft">Rascunho</option>
          <option value="scheduled">Agendada</option>
          <option value="running">Enviando</option>
          <option value="paused">Pausada</option>
          <option value="completed">Concluída</option>
          <option value="cancelled">Cancelada</option>
          <option value="failed">Falhou</option>
        </select>

        <ActionButton
          onClick={() => {/* TODO: Abrir modal de criar campanha */}}
          variant="primary"
          icon={Plus}
        >
          Nova Campanha
        </ActionButton>
      </div>

      {/* Conteúdo */}
      {campaigns.length === 0 && !isLoading ? (
        <EmptyState
          icon={Megaphone}
          title="Nenhuma campanha encontrada"
          description={
            searchQuery
              ? `Não encontramos campanhas com "${searchQuery}"`
              : 'Crie sua primeira campanha para enviar mensagens em massa para seus contatos'
          }
          variant="gradient"
          action={
            searchQuery ? {
              label: 'Limpar Busca',
              onClick: () => setSearchQuery(''),
              icon: Search,
            } : {
              label: 'Criar Primeira Campanha',
              onClick: () => {/* TODO */},
              icon: Plus,
            }
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={campaigns}
          loading={isLoading}
          emptyMessage="Nenhuma campanha encontrada"
        />
      )}
    </div>
  );
}
