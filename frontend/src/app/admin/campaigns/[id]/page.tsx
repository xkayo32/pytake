'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Megaphone,
  Calendar,
  Users,
  Send,
  CheckCircle2,
  Eye,
  XCircle,
  Clock,
  Play,
  Pause,
  RotateCw,
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { ActionButton } from '@/components/admin/ActionButton';
import { campaignsAPI } from '@/lib/api';
import { Campaign, CampaignStats, CampaignStatus } from '@/types/campaign';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaignDetails = async () => {
    try {
      setIsLoading(true);
      const [campaignResponse, statsResponse] = await Promise.all([
        campaignsAPI.get(campaignId),
        campaignsAPI.getStats(campaignId),
      ]);
      setCampaign(campaignResponse.data);
      setStats(statsResponse.data);
    } catch (error) {
      console.error('Erro ao carregar detalhes da campanha:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignDetails();
    const interval = setInterval(fetchCampaignDetails, 10000); // Auto-refresh a cada 10s
    return () => clearInterval(interval);
  }, [campaignId]);

  const handleStart = async () => {
    if (!confirm('Iniciar esta campanha agora?')) return;
    try {
      await campaignsAPI.start(campaignId);
      fetchCampaignDetails();
    } catch (error) {
      console.error('Erro ao iniciar campanha:', error);
    }
  };

  const handlePause = async () => {
    try {
      await campaignsAPI.pause(campaignId);
      fetchCampaignDetails();
    } catch (error) {
      console.error('Erro ao pausar campanha:', error);
    }
  };

  const handleResume = async () => {
    try {
      await campaignsAPI.resume(campaignId);
      fetchCampaignDetails();
    } catch (error) {
      console.error('Erro ao retomar campanha:', error);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancelar esta campanha? Esta ação não pode ser desfeita.')) return;
    try {
      await campaignsAPI.cancel(campaignId);
      fetchCampaignDetails();
    } catch (error) {
      console.error('Erro ao cancelar campanha:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Deletar esta campanha permanentemente?')) return;
    try {
      await campaignsAPI.delete(campaignId);
      router.push('/admin/campaigns');
    } catch (error) {
      console.error('Erro ao deletar campanha:', error);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const configs: Record<CampaignStatus, { label: string; variant: any }> = {
      draft: { label: 'Rascunho', variant: 'gray' },
      scheduled: { label: 'Agendada', variant: 'blue' },
      running: { label: 'Enviando', variant: 'green' },
      paused: { label: 'Pausada', variant: 'yellow' },
      completed: { label: 'Concluída', variant: 'blue' },
      cancelled: { label: 'Cancelada', variant: 'red' },
      failed: { label: 'Falhou', variant: 'red' },
    };
    return configs[status] || configs.draft;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Carregando...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">Campanha não encontrada</div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(campaign.status);
  const progressPercentage = (campaign.messages_sent / Math.max(campaign.total_recipients, 1)) * 100;

  return (
    <div className="space-y-6">
      {/* Header com Voltar */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-6 h-6 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-3">
            <Megaphone className="w-7 h-7" />
            {campaign.name}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              statusBadge.variant === 'green' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
              statusBadge.variant === 'blue' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
              statusBadge.variant === 'yellow' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
              statusBadge.variant === 'red' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
              'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400'
            }`}>
              {statusBadge.label}
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">{campaign.description || 'Campanha de mensagens em massa'}</p>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
                <ActionButton
                  onClick={handleStart}
                  variant="success"
                  icon={Play}
                >
                  Iniciar
                </ActionButton>
              )}
              {campaign.status === 'running' && (
                <ActionButton
                  onClick={handlePause}
                  variant="secondary"
                  icon={Pause}
                >
                  Pausar
                </ActionButton>
              )}
              {campaign.status === 'paused' && (
                <ActionButton
                  onClick={handleResume}
                  variant="success"
                  icon={RotateCw}
                >
                  Retomar
                </ActionButton>
              )}
              {(campaign.status === 'running' || campaign.status === 'paused') && (
                <ActionButton
                  onClick={handleCancel}
                  variant="danger"
                  icon={XCircle}
                >
                  Cancelar
                </ActionButton>
              )}
              {(campaign.status === 'draft' || campaign.status === 'cancelled' || campaign.status === 'completed') && (
                <ActionButton
                  onClick={handleDelete}
                  variant="danger"
                  icon={Trash2}
                >
                  Deletar
                </ActionButton>
              )}
        </div>
      </div>

      {/* Progress Bar */}
      {campaign.status === 'running' && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Enviando Mensagens...</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {campaign.messages_sent.toLocaleString('pt-BR')} de {campaign.total_recipients.toLocaleString('pt-BR')} enviadas
              </p>
            </div>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {progressPercentage.toFixed(0)}%
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
            <div
              className="bg-gray-900 dark:bg-white h-4 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progressPercentage, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Destinatários"
          value={campaign.total_recipients.toLocaleString('pt-BR')}
          subtitle="Total de contatos"
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Enviadas"
          value={campaign.messages_sent.toLocaleString('pt-BR')}
          subtitle={`${campaign.messages_pending} pendentes`}
          icon={Send}
          color="orange"
        />
        <StatsCard
          title="Entregues"
          value={campaign.messages_delivered.toLocaleString('pt-BR')}
          subtitle={stats ? `${stats.delivery_rate.toFixed(1)}% taxa` : '-'}
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          title="Lidas"
          value={campaign.messages_read.toLocaleString('pt-BR')}
          subtitle={stats ? `${stats.read_rate.toFixed(1)}% taxa` : '-'}
          icon={Eye}
          color="blue"
        />
      </div>

      {/* Métricas Detalhadas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Performance
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">Taxa de Entrega</div>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {stats?.delivery_rate.toFixed(1)}%
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">Taxa de Leitura</div>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {stats?.read_rate.toFixed(1)}%
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">Taxa de Resposta</div>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {stats?.reply_rate.toFixed(1)}%
                </div>
                {(stats?.reply_rate || 0) > 10 ? (
                  <TrendingUp className="w-4 h-4 text-green-500" />
                ) : (
                  <TrendingDown className="w-4 h-4 text-yellow-500" />
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-500 dark:text-gray-400">Taxa de Sucesso</div>
              <div className="flex items-center gap-2">
                <div className="font-semibold text-gray-900 dark:text-white">
                  {stats?.success_rate.toFixed(1)}%
                </div>
                <TrendingUp className="w-4 h-4 text-green-500" />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-red-600 dark:text-red-400">
                <div className="text-sm">Falhas</div>
                <div className="font-semibold">{campaign.messages_failed}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Informações da Campanha */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Informações
          </h2>

          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Tipo</div>
              <div className="font-semibold text-gray-900 dark:text-white capitalize">
                {campaign.campaign_type}
              </div>
            </div>

            {campaign.scheduled_at && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Agendamento</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {format(new Date(campaign.scheduled_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
            )}

            {campaign.started_at && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Iniciada em</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {format(new Date(campaign.started_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {formatDistanceToNow(new Date(campaign.started_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </div>
              </div>
            )}

            {campaign.completed_at && (
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Concluída em</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {format(new Date(campaign.completed_at), "dd/MM/yyyy 'às' HH:mm", {
                    locale: ptBR,
                  })}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Taxa de Envio</div>
              <div className="font-semibold text-gray-900 dark:text-white">
                {campaign.messages_per_hour} mensagens/hora
              </div>
            </div>

            {campaign.estimated_cost && (
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Custo Estimado</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  R$ {campaign.estimated_cost.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engajamento */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
          Engajamento
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {campaign.replies_count}
            </div>
            <div className="text-sm text-gray-500">Total de Respostas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              {campaign.unique_replies_count}
            </div>
            <div className="text-sm text-gray-500">Respostas Únicas</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {stats ? `${stats.reply_rate.toFixed(1)}%` : '-'}
            </div>
            <div className="text-sm text-gray-500">Taxa de Resposta</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
              {campaign.opt_outs_count}
            </div>
            <div className="text-sm text-gray-500">Opt-outs</div>
          </div>
        </div>
      </div>
    </div>
  );
}
