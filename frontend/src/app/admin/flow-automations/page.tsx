'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Zap,
  Plus,
  Search,
  Play,
  Pause,
  Edit,
  Copy,
  Trash2,
  MoreVertical,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { DataTable } from '@/components/admin/DataTable';
import { EmptyState } from '@/components/admin/EmptyState';
import { ActionButton } from '@/components/admin/ActionButton';

// Types
type AutomationStatus = 'draft' | 'active' | 'paused' | 'completed' | 'archived';

interface FlowAutomation {
  id: string;
  name: string;
  description?: string;
  status: AutomationStatus;
  is_active: boolean;
  trigger_type: string;
  total_executions: number;
  total_sent: number;
  total_delivered: number;
  total_completed: number;
  total_failed: number;
  last_executed_at?: string;
  next_scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export default function FlowAutomationsPage() {
  const router = useRouter();
  const [automations, setAutomations] = useState<FlowAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AutomationStatus | 'all'>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const fetchAutomations = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };

      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const response = await fetch(`/api/v1/flow-automations?${new URLSearchParams(params)}`, {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch');

      const data = await response.json();
      let filteredAutomations = data.items;

      // Filtro de busca no frontend
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredAutomations = filteredAutomations.filter((automation: FlowAutomation) =>
          automation.name.toLowerCase().includes(query)
        );
      }

      setAutomations(filteredAutomations);
    } catch (error) {
      console.error('Erro ao carregar automações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAutomations();
  }, [selectedStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAutomations();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStart = async (automationId: string) => {
    if (!confirm('Executar esta automação agora?')) return;
    try {
      const response = await fetch(`/api/v1/flow-automations/${automationId}/start`, {
        method: 'POST',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to start');
      
      fetchAutomations();
      setOpenDropdown(null);
      
      // TODO: Redirecionar para página de monitoramento da execução
      const execution = await response.json();
      router.push(`/admin/flow-automations/${automationId}/execution/${execution.id}`);
    } catch (error) {
      console.error('Erro ao iniciar automação:', error);
      alert('Erro ao iniciar automação. Verifique o console.');
    }
  };

  const handleEdit = (automationId: string) => {
    router.push(`/admin/flow-automations/${automationId}/edit`);
  };

  const handleDuplicate = async (automationId: string) => {
    // TODO: Implementar duplicação
    alert('Funcionalidade de duplicar será implementada em breve');
  };

  const handleDelete = async (automationId: string) => {
    if (!confirm('Deletar esta automação permanentemente?')) return;
    try {
      const response = await fetch(`/api/v1/flow-automations/${automationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to delete');
      
      fetchAutomations();
      setOpenDropdown(null);
    } catch (error) {
      console.error('Erro ao deletar automação:', error);
    }
  };

  const getStatusBadge = (status: AutomationStatus, isActive: boolean) => {
    if (!isActive && status !== 'archived') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400">
          <Pause className="w-3 h-3" />
          Inativa
        </span>
      );
    }

    const configs: Record<AutomationStatus, { icon: any; color: string; label: string }> = {
      draft: { icon: Clock, color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400', label: 'Rascunho' },
      active: { icon: Zap, color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400', label: 'Ativa' },
      paused: { icon: Pause, color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400', label: 'Pausada' },
      completed: { icon: CheckCircle, color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', label: 'Concluída' },
      archived: { icon: XCircle, color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-500', label: 'Arquivada' },
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

  const getTriggerTypeLabel = (triggerType: string) => {
    const labels: Record<string, string> = {
      manual: 'Manual',
      scheduled: 'Agendado',
      cron: 'Recorrente',
      webhook: 'Webhook',
      event: 'Evento',
    };
    return labels[triggerType] || triggerType;
  };

  const columns = [
    {
      key: 'name',
      label: 'Automação',
      header: 'Automação',
      render: (automation: FlowAutomation) => (
        <div>
          <div className="font-semibold text-gray-900 dark:text-white">
            {automation.name}
          </div>
          {automation.description && (
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
              {automation.description}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      header: 'Status',
      render: (automation: FlowAutomation) => getStatusBadge(automation.status, automation.is_active),
    },
    {
      key: 'trigger',
      label: 'Trigger',
      header: 'Trigger',
      render: (automation: FlowAutomation) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getTriggerTypeLabel(automation.trigger_type)}
        </span>
      ),
    },
    {
      key: 'stats',
      label: 'Estatísticas',
      header: 'Estatísticas',
      render: (automation: FlowAutomation) => (
        <div className="text-sm">
          <div className="text-gray-900 dark:text-white font-medium">
            {automation.total_executions} execuções
          </div>
          <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
            {automation.total_sent} enviados • {automation.total_completed} concluídos
          </div>
        </div>
      ),
    },
    {
      key: 'last_execution',
      label: 'Última Execução',
      header: 'Última Execução',
      render: (automation: FlowAutomation) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {automation.last_executed_at ? (
            <div>
              {formatDistanceToNow(new Date(automation.last_executed_at), {
                addSuffix: true,
                locale: ptBR,
              })}
            </div>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Nunca executada</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      header: '',
      render: (automation: FlowAutomation) => (
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === automation.id ? null : automation.id);
            }}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-500" />
          </button>

          {openDropdown === automation.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenDropdown(null)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                <button
                  onClick={() => handleStart(automation.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Executar Agora
                </button>
                <button
                  onClick={() => handleEdit(automation.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
                <button
                  onClick={() => handleDuplicate(automation.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Duplicar
                </button>
                <hr className="my-1 border-gray-200 dark:border-gray-700" />
                <button
                  onClick={() => handleDelete(automation.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Deletar
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!isLoading && automations.length === 0 && searchQuery === '' && selectedStatus === 'all') {
    return (
      <div className="p-8">
        <EmptyState
          icon={Zap}
          title="Nenhuma automação criada"
          description="Crie sua primeira automação de fluxo para enviar mensagens proativas"
          action={{
            label: 'Criar Automação',
            onClick: () => router.push('/admin/flow-automations/new'),
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Zap className="w-8 h-8 text-yellow-500" />
            Automações de Fluxo
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Dispare fluxos proativamente para múltiplos contatos
          </p>
        </div>

        <ActionButton
          variant="primary"
          icon={Plus}
          onClick={() => router.push('/admin/flow-automations/new')}
        >
          Nova Automação
        </ActionButton>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar automações..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as AutomationStatus | 'all')}
          className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="all">Todos os status</option>
          <option value="draft">Rascunho</option>
          <option value="active">Ativa</option>
          <option value="paused">Pausada</option>
          <option value="completed">Concluída</option>
          <option value="archived">Arquivada</option>
        </select>
      </div>

      {/* Table */}
      {automations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-12 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Nenhuma automação encontrada
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Tente ajustar os filtros de busca
          </p>
        </div>
      ) : (
        <DataTable
          data={automations}
          columns={columns}
          onRowClick={(automation) => router.push(`/admin/flow-automations/${automation.id}`)}
        />
      )}
    </div>
  );
}
