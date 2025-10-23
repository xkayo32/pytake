'use client';

import { useEffect, useState } from 'react';
import {
  ListTodo,
  Users,
  Layers,
  AlertCircle,
  Settings as SettingsIcon,
  Zap,
  ArrowRight,
  BarChart3,
  List,
} from 'lucide-react';
import Link from 'next/link';
import { StatsCard } from '@/components/admin/StatsCard';
import { PageHeader } from '@/components/admin/PageHeader';
import QueueMetricsCard from '@/components/admin/QueueMetricsCard';
import QueueComparison from '@/components/admin/QueueComparison';
import PeriodSelector from '@/components/admin/PeriodSelector';
import AnalyticsFilters from '@/components/admin/AnalyticsFilters';
import { queuesAPI, departmentsAPI } from '@/lib/api';
import { Queue } from '@/types/queue';
import { Department } from '@/types/department';
import { getBusinessHoursStatus } from '@/lib/businessHours';

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingQueues, setIsLoadingQueues] = useState(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [activeTab, setActiveTab] = useState<'list' | 'analytics'>('list');
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState<string | null>(null);
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  const fetchQueues = async () => {
    try {
      setIsLoadingQueues(true);
      const response = await queuesAPI.list({ limit: 100 });
      setQueues(response.data);
    } catch (error) {
      console.error('Erro ao carregar filas:', error);
    } finally {
      setIsLoadingQueues(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      setIsLoadingDepartments(true);
      const response = await departmentsAPI.list();
      setDepartments(response.data);
    } catch (error) {
      console.error('Erro ao carregar departamentos:', error);
    } finally {
      setIsLoadingDepartments(false);
    }
  };

  useEffect(() => {
    fetchQueues();
    fetchDepartments();

    const queuesInterval = setInterval(fetchQueues, 30000); // Auto-refresh a cada 30s
    const departmentsInterval = setInterval(fetchDepartments, 60000); // Auto-refresh a cada 60s

    return () => {
      clearInterval(queuesInterval);
      clearInterval(departmentsInterval);
    };
  }, []);

  const getIconEmoji = (icon?: string) => {
    const iconMap: Record<string, string> = {
      star: '⭐',
      zap: '⚡',
      clock: '⏰',
      tools: '🔧',
      shield: '🛡️',
      fire: '🔥',
      trophy: '🏆',
      rocket: '🚀',
    };
    return iconMap[icon || 'star'] || '⭐';
  };

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'Departamento não encontrado';
  };

  const getQueueNameById = (queueId?: string | null) => {
    if (!queueId) return null;
    const q = queues.find(qq => qq.id === queueId);
    return q?.name || null;
  };

  // Filter queues for analytics
  const filteredQueues = queues.filter(queue => {
    if (selectedDepartmentId && queue.department_id !== selectedDepartmentId) {
      return false;
    }
    if (showOnlyActive && !queue.is_active) {
      return false;
    }
    return true;
  });

  const activeQueues = queues.filter(q => q.is_active);
  const highPriorityQueues = queues.filter(q => q.priority >= 75);
  const totalInQueues = queues.reduce((sum, q) => sum + q.queued_conversations, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Filas"
        description="Gerencie múltiplas filas dentro de cada departamento com priorização e SLA"
      />

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatsCard
          title="Total de Filas"
          value={queues.length}
          subtitle={`${activeQueues.length} ativas`}
          icon={ListTodo}
          color="blue"
          loading={isLoadingQueues}
        />

        <StatsCard
          title="Filas Prioritárias"
          value={highPriorityQueues.length}
          subtitle="Prioridade ≥ 75"
          icon={Zap}
          color="orange"
          loading={isLoadingQueues}
        />

        <StatsCard
          title="Conversas em Fila"
          value={totalInQueues}
          subtitle="Aguardando atendimento"
          icon={Users}
          color="purple"
          loading={isLoadingQueues}
        />

        <StatsCard
          title="Departamentos"
          value={departments.length}
          subtitle="Com filas configuradas"
          icon={Layers}
          color="green"
          loading={isLoadingDepartments}
        />
      </div>

      {/* Filas */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Filas Configuradas
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {activeTab === 'list' 
                  ? 'Visualização de filas • Para criar ou editar, acesse Configurações → Organização'
                  : 'Análise de performance e métricas detalhadas por fila'}
              </p>
            </div>
            <Link
              href="/admin/settings/organization?tab=queues"
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <SettingsIcon className="w-4 h-4" />
              <span>Gerenciar</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex gap-2 bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'list'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
                <span className="font-medium">Lista</span>
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'analytics'
                    ? 'bg-white dark:bg-gray-800 text-purple-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">Analytics</span>
              </button>
            </div>

            {/* Period selector - only show in analytics tab */}
            {activeTab === 'analytics' && queues.length > 0 && (
              <PeriodSelector value={selectedPeriod} onChange={setSelectedPeriod} />
            )}
          </div>
        </div>

        <div className="p-6">
          {isLoadingQueues ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum departamento criado
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Acesse Configurações → Organização para criar primeiro um departamento antes de criar filas
              </p>
              <Link
                href="/admin/settings/organization"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Ir para Configurações da Organização</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : queues.length === 0 ? (
            <div className="text-center py-12">
              <SettingsIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma fila criada
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Acesse Configurações → Organização para criar sua primeira fila
              </p>
              <Link
                href="/admin/settings/organization?tab=queues"
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <SettingsIcon className="w-4 h-4" />
                <span>Ir para Configurações da Organização</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : activeTab === 'list' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {queues.map((queue) => (
                <div
                  key={queue.id}
                  className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                      style={{
                        backgroundColor: queue.color + '20',
                        color: queue.color,
                      }}
                    >
                      <span className="text-lg">{getIconEmoji(queue.icon)}</span>
                      <span className="font-semibold">{queue.name}</span>
                    </div>
                    {/* Overflow Badges */}
                    {typeof queue.max_queue_size === 'number' && queue.max_queue_size > 0 && (
                      (() => {
                        const used = queue.queued_conversations ?? 0;
                        const cap = queue.max_queue_size!;
                        const pct = Math.min(100, Math.round((used / cap) * 100));
                        const isOverflow = used >= cap;
                        const isNear = !isOverflow && pct >= 80;
                        const overflowTarget = getQueueNameById(queue.overflow_queue_id);
                        const title = isOverflow
                          ? `Overflow ativo${overflowTarget ? ` → ${overflowTarget}` : ''}`
                          : isNear
                            ? `Capacidade em ${pct}% ${overflowTarget ? `(destino: ${overflowTarget})` : ''}`
                            : `Ocupação ${pct}%`;
                        return (
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                                isOverflow
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  : isNear
                                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                              }`}
                              title={title}
                            >
                              {isOverflow ? 'Overflow ativo' : isNear ? 'Quase no limite' : 'Capacidade ok'}
                            </span>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Department */}
                  <div className="mb-3 px-2 py-1 bg-gray-100 dark:bg-gray-900 rounded text-xs text-gray-600 dark:text-gray-400">
                    Departamento: {getDepartmentName(queue.department_id)}
                  </div>

                  {/* Description */}
                  {queue.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {queue.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {queue.queued_conversations}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Na Fila
                      </div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3">
                      <div className="text-2xl font-bold text-gray-900 dark:text-white">
                        {queue.priority}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Prioridade
                      </div>
                    </div>
                  </div>

                  {/* Capacity Indicator */}
                  {typeof queue.max_queue_size === 'number' && queue.max_queue_size > 0 && (
                    (() => {
                      const used = queue.queued_conversations ?? 0;
                      const cap = queue.max_queue_size!;
                      const pct = Math.min(100, Math.round((used / cap) * 100));
                      const barColor = used >= cap
                        ? 'bg-red-500'
                        : pct >= 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500';
                      const overflowTarget = getQueueNameById(queue.overflow_queue_id);
                      return (
                        <div className="mb-4">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600 dark:text-gray-400">Capacidade</span>
                            <span className="text-gray-900 dark:text-white font-medium">
                              {used} / {cap} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 w-full bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden" title={overflowTarget ? `Overflow → ${overflowTarget}` : undefined}>
                            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })()
                  )}

                  {/* Config Info */}
                  <div className="space-y-2 border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Status</span>
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        queue.is_active
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      }`}>
                        {queue.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    {queue.settings?.business_hours && (() => {
                      const bhStatus = getBusinessHoursStatus(queue.settings.business_hours);
                      return (
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-600 dark:text-gray-400">Horário</span>
                          <span className={`px-2 py-0.5 rounded-full font-semibold ${
                            bhStatus.status === 'open'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : bhStatus.status === 'closed'
                              ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          }`}>
                            {bhStatus.label}
                          </span>
                        </div>
                      );
                    })()}
                    {queue.sla_minutes && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600 dark:text-gray-400">SLA</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {queue.sla_minutes} min
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Roteamento</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {queue.routing_mode === 'round_robin' && '🔄 Round Robin'}
                        {queue.routing_mode === 'load_balance' && '⚖️ Balanceamento'}
                        {queue.routing_mode === 'manual' && '👆 Manual'}
                        {queue.routing_mode === 'skills_based' && '🎯 Skills'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">Máx. por agente</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        {queue.max_conversations_per_agent}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Analytics Tab */
            <div className="space-y-6">
              {/* Filters */}
              <AnalyticsFilters
                departments={departments}
                selectedDepartmentId={selectedDepartmentId}
                onDepartmentChange={setSelectedDepartmentId}
                showOnlyActive={showOnlyActive}
                onShowOnlyActiveChange={setShowOnlyActive}
              />

              {/* Queue Comparison */}
              <QueueComparison queues={filteredQueues} days={selectedPeriod} />

              {/* Individual Queue Metrics */}
              <div className="space-y-6">
                {filteredQueues.map((queue) => (
                  <QueueMetricsCard
                    key={queue.id}
                    queueId={queue.id}
                    queueName={queue.name}
                    queue={queue}
                    days={selectedPeriod}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
