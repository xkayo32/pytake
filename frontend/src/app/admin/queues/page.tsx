'use client';

import { useEffect, useState } from 'react';
import {
  ListTodo,
  Users,
  Layers,
  AlertCircle,
  Settings,
  Plus,
  Edit,
  Trash2,
  Zap,
} from 'lucide-react';
import { StatsCard } from '@/components/admin/StatsCard';
import { PageHeader } from '@/components/admin/PageHeader';
import { ActionButton } from '@/components/admin/ActionButton';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { QueueModal } from '@/components/admin/QueueModal';
import { queuesAPI, departmentsAPI } from '@/lib/api';
import { Queue, QueueCreate, QueueUpdate } from '@/types/queue';
import { Department } from '@/types/department';

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [isLoadingQueues, setIsLoadingQueues] = useState(true);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);

  // Modal states
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueToEdit, setQueueToEdit] = useState<Queue | null>(null);
  const [queueToDelete, setQueueToDelete] = useState<Queue | null>(null);

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

  const handleCreateQueue = async (data: QueueCreate) => {
    try {
      await queuesAPI.create(data);
      await fetchQueues();
      setIsQueueModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar fila:', error);
      throw error;
    }
  };

  const handleUpdateQueue = async (data: QueueUpdate) => {
    if (!queueToEdit) return;

    try {
      await queuesAPI.update(queueToEdit.id, data);
      await fetchQueues();
      setQueueToEdit(null);
      setIsQueueModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar fila:', error);
      throw error;
    }
  };

  const handleDeleteQueue = async () => {
    if (!queueToDelete) return;

    try {
      await queuesAPI.delete(queueToDelete.id);
      await fetchQueues();
      setQueueToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar fila:', error);
    }
  };

  const openCreateModal = () => {
    setQueueToEdit(null);
    setIsQueueModalOpen(true);
  };

  const openEditModal = (queue: Queue) => {
    setQueueToEdit(queue);
    setIsQueueModalOpen(true);
  };

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
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Filas Configuradas
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Organize filas especializadas dentro de cada departamento
            </p>
          </div>
          <ActionButton
            variant="primary"
            onClick={openCreateModal}
            icon={Plus}
            disabled={departments.length === 0}
          >
            Criar Fila
          </ActionButton>
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
                Crie primeiro um departamento antes de criar filas
              </p>
              <ActionButton
                variant="primary"
                onClick={() => window.location.href = '/admin/departments'}
                icon={Plus}
              >
                Ir para Departamentos
              </ActionButton>
            </div>
          ) : queues.length === 0 ? (
            <div className="text-center py-12">
              <Settings className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhuma fila criada
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                Crie sua primeira fila para especializar o atendimento
              </p>
              <ActionButton
                variant="primary"
                onClick={openCreateModal}
                icon={Plus}
              >
                Criar Primeira Fila
              </ActionButton>
            </div>
          ) : (
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

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEditModal(queue)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => setQueueToDelete(queue)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>
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
          )}
        </div>
      </div>

      {/* Modais */}
      <QueueModal
        isOpen={isQueueModalOpen}
        onClose={() => {
          setIsQueueModalOpen(false);
          setQueueToEdit(null);
        }}
        onSubmit={queueToEdit ? handleUpdateQueue : handleCreateQueue}
        departments={departments}
        initialData={queueToEdit || undefined}
        mode={queueToEdit ? 'edit' : 'create'}
      />

      <ConfirmDialog
        isOpen={!!queueToDelete}
        onClose={() => setQueueToDelete(null)}
        onConfirm={handleDeleteQueue}
        title="Excluir Fila"
        description={`Tem certeza que deseja excluir a fila "${queueToDelete?.name}"? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        confirmVariant="danger"
      />
    </div>
  );
}
