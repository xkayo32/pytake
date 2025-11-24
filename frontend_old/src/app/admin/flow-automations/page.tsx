'use client';

import React, { useEffect, useState, useMemo } from 'react';
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
  Loader,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { flowAutomationsAPI } from '@/lib/api/flowAutomationsAPI';
import type { FlowAutomation, AutomationStatus } from '@/types/flow_automation';

export default function FlowAutomationsPage() {
  const router = useRouter();
  const [automations, setAutomations] = useState<FlowAutomation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<AutomationStatus | 'all'>('all');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // ============================================
  // Fetch automations
  // ============================================

  const fetchAutomations = async () => {
    try {
      setIsLoading(true);
      const params: any = { limit: 100 };

      if (selectedStatus !== 'all') {
        params.status = selectedStatus;
      }

      const data = await flowAutomationsAPI.list(params);
      let filteredAutomations = data.items;

      // Search filter
      if (searchQuery) {
        filteredAutomations = filteredAutomations.filter((a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchQuery.toLowerCase())
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
  }, [selectedStatus, searchQuery]);

  // ============================================
  // Actions
  // ============================================

  const handleStart = async (automationId: string) => {
    try {
      await flowAutomationsAPI.start(automationId);
      fetchAutomations();
    } catch (error) {
      console.error('Erro ao iniciar automação:', error);
    }
    setOpenDropdown(null);
  };

  const handlePause = async (automationId: string) => {
    try {
      await flowAutomationsAPI.pause(automationId);
      fetchAutomations();
    } catch (error) {
      console.error('Erro ao pausar automação:', error);
    }
    setOpenDropdown(null);
  };

  const handleEdit = (automationId: string) => {
    router.push(`/admin/flow-automations/${automationId}`);
    setOpenDropdown(null);
  };

  const handleDuplicate = async (automationId: string) => {
    try {
      const automation = automations.find((a) => a.id === automationId);
      if (!automation) return;

      const { id, created_at, updated_at, ...data } = automation;
      const newAutomation = await flowAutomationsAPI.create({
        ...data,
        name: `${data.name} (Cópia)`,
      });

      fetchAutomations();
    } catch (error) {
      console.error('Erro ao duplicar automação:', error);
    }
    setOpenDropdown(null);
  };

  const handleDelete = async (automationId: string) => {
    if (!confirm('Tem certeza que deseja deletar esta automação?')) return;

    try {
      await flowAutomationsAPI.delete(automationId);
      fetchAutomations();
    } catch (error) {
      console.error('Erro ao deletar automação:', error);
    }
    setOpenDropdown(null);
  };

  // ============================================
  // Status helpers
  // ============================================

  const getStatusBadge = (status: AutomationStatus, isActive: boolean) => {
    const configs: Record<AutomationStatus, { color: string; label: string; icon: React.ComponentType<any> }> = {
      draft: {
        color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-400',
        label: 'Rascunho',
        icon: AlertCircle,
      },
      active: {
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
        label: 'Ativa',
        icon: CheckCircle,
      },
      paused: {
        color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
        label: 'Pausada',
        icon: Clock,
      },
      completed: {
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
        label: 'Concluída',
        icon: CheckCircle,
      },
      archived: {
        color: 'bg-gray-100 dark:bg-gray-900/30 text-gray-500 dark:text-gray-500',
        label: 'Arquivada',
        icon: XCircle,
      },
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

  // ============================================
  // Table Columns
  // ============================================

  const columns = [
    {
      key: 'name',
      label: 'Automação',
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
      render: (automation: FlowAutomation) => getStatusBadge(automation.status, automation.is_active),
    },
    {
      key: 'trigger',
      label: 'Tipo',
      render: (automation: FlowAutomation) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {getTriggerTypeLabel(automation.trigger_type)}
        </span>
      ),
    },
    {
      key: 'stats',
      label: 'Execuções',
      render: (automation: FlowAutomation) => (
        <div className="text-sm">
          <span className="text-gray-900 dark:text-white font-semibold">
            {automation.total_executions}
          </span>
          <span className="text-gray-500 dark:text-gray-400 ml-1">
            • {automation.total_completed}/{automation.total_sent}
          </span>
        </div>
      ),
    },
    {
      key: 'next_execution',
      label: 'Próxima Execução',
      render: (automation: FlowAutomation) => (
        <div className="text-sm">
          {automation.next_scheduled_at ? (
            <span className="text-gray-900 dark:text-white">
              {format(parseISO(automation.next_scheduled_at), 'd MMM, HH:mm', {
                locale: ptBR,
              })}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Nunca</span>
          )}
        </div>
      ),
    },
    {
      key: 'last_execution',
      label: 'Última Execução',
      render: (automation: FlowAutomation) => (
        <div className="text-sm">
          {automation.last_executed_at ? (
            <span className="text-gray-600 dark:text-gray-400">
              {format(parseISO(automation.last_executed_at), 'd MMM, HH:mm', {
                locale: ptBR,
              })}
            </span>
          ) : (
            <span className="text-gray-400 dark:text-gray-500">Nunca executada</span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
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
                <button
                  onClick={() => handleDelete(automation.id)}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
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

  // ============================================
  // Loading State
  // ============================================

  if (isLoading && automations.length === 0) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  // ============================================
  // Empty State
  // ============================================

  if (!isLoading && automations.length === 0 && searchQuery === '' && selectedStatus === 'all') {
    return (
      <div className="p-8">
        <div className="text-center space-y-4">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-900/30">
            <Zap className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Nenhuma automação criada
          </h3>
          <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
            Crie sua primeira automação de fluxo para enviar mensagens proativas
          </p>
          <button
            onClick={() => router.push('/admin/flow-automations/new')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            <Plus className="w-4 h-4" />
            Criar Automação
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

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

        <button
          onClick={() => router.push('/admin/flow-automations/new')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
        >
          <Plus className="w-4 h-4" />
          Nova Automação
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
          />
        </div>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value as AutomationStatus | 'all')}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800"
        >
          <option value="all">Todos os Status</option>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white"
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {automations.map((automation) => (
                  <tr
                    key={automation.id}
                    onClick={() => router.push(`/admin/flow-automations/${automation.id}`)}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                  >
                    {columns.map((col) => (
                      <td key={`${automation.id}-${col.key}`} className="px-6 py-4">
                        {col.render(automation)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
