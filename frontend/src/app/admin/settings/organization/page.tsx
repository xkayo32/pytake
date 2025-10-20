'use client';

import { useEffect, useState } from 'react';
import {
  Building2,
  ListTodo,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';
import { PageHeader } from '@/components/admin/PageHeader';
import { ActionButton } from '@/components/admin/ActionButton';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { DepartmentModal } from '@/components/admin/DepartmentModal';
import { QueueModal } from '@/components/admin/QueueModal';
import { departmentsAPI, queuesAPI } from '@/lib/api';
import { Department, DepartmentCreate, DepartmentUpdate } from '@/types/department';
import { Queue, QueueCreate, QueueUpdate } from '@/types/queue';

type Tab = 'departments' | 'queues';

export default function OrganizationSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('departments');
  const [departments, setDepartments] = useState<Department[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [isLoadingDepartments, setIsLoadingDepartments] = useState(true);
  const [isLoadingQueues, setIsLoadingQueues] = useState(true);

  // Department Modal
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [departmentToEdit, setDepartmentToEdit] = useState<Department | null>(null);
  const [departmentToDelete, setDepartmentToDelete] = useState<Department | null>(null);

  // Queue Modal
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [queueToEdit, setQueueToEdit] = useState<Queue | null>(null);
  const [queueToDelete, setQueueToDelete] = useState<Queue | null>(null);

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

  useEffect(() => {
    fetchDepartments();
    fetchQueues();
  }, []);

  // Department handlers
  const handleCreateDepartment = async (data: DepartmentCreate) => {
    try {
      await departmentsAPI.create(data);
      await fetchDepartments();
      setIsDepartmentModalOpen(false);
    } catch (error) {
      console.error('Erro ao criar departamento:', error);
      throw error;
    }
  };

  const handleUpdateDepartment = async (data: DepartmentUpdate) => {
    if (!departmentToEdit) return;
    try {
      await departmentsAPI.update(departmentToEdit.id, data);
      await fetchDepartments();
      setDepartmentToEdit(null);
      setIsDepartmentModalOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar departamento:', error);
      throw error;
    }
  };

  const handleDeleteDepartment = async () => {
    if (!departmentToDelete) return;
    try {
      await departmentsAPI.delete(departmentToDelete.id);
      await fetchDepartments();
      setDepartmentToDelete(null);
    } catch (error) {
      console.error('Erro ao deletar departamento:', error);
    }
  };

  // Queue handlers
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

  const getIconEmoji = (icon?: string) => {
    const departmentIcons: Record<string, string> = {
      users: '👥',
      headset: '🎧',
      shopping: '🛍️',
      tools: '🔧',
      money: '💰',
      chart: '📊',
      shield: '🛡️',
      star: '⭐',
    };
    const queueIcons: Record<string, string> = {
      star: '⭐',
      zap: '⚡',
      clock: '⏰',
      tools: '🔧',
      shield: '🛡️',
      fire: '🔥',
      trophy: '🏆',
      rocket: '🚀',
    };
    return departmentIcons[icon || ''] || queueIcons[icon || ''] || '👥';
  };

  const getDepartmentName = (departmentId: string) => {
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || 'N/A';
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações da Organização"
        description="Gerencie departamentos e filas de atendimento"
      />

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('departments')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'departments'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Departamentos
              </div>
            </button>
            <button
              onClick={() => setActiveTab('queues')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'queues'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4" />
                Filas
              </div>
            </button>
          </nav>
        </div>

        {/* Departments Tab */}
        {activeTab === 'departments' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Departamentos
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Equipes e times da organização
                </p>
              </div>
              <ActionButton
                variant="primary"
                onClick={() => {
                  setDepartmentToEdit(null);
                  setIsDepartmentModalOpen(true);
                }}
                icon={Plus}
              >
                Criar Departamento
              </ActionButton>
            </div>

            {isLoadingDepartments ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhum departamento
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Crie seu primeiro departamento para organizar equipes
                </p>
                <ActionButton
                  variant="primary"
                  onClick={() => {
                    setDepartmentToEdit(null);
                    setIsDepartmentModalOpen(true);
                  }}
                  icon={Plus}
                >
                  Criar Primeiro Departamento
                </ActionButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="px-3 py-1.5 rounded-lg flex items-center gap-2"
                        style={{
                          backgroundColor: dept.color + '20',
                          color: dept.color,
                        }}
                      >
                        <span className="text-lg">{getIconEmoji(dept.icon)}</span>
                        <span className="font-semibold">{dept.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setDepartmentToEdit(dept);
                            setIsDepartmentModalOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => setDepartmentToDelete(dept)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    {dept.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {dept.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Agentes: </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {dept.total_agents}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Status: </span>
                        <span className={`font-medium ${
                          dept.is_active
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {dept.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Queues Tab */}
        {activeTab === 'queues' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Filas
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Filas especializadas dentro de departamentos
                </p>
              </div>
              <ActionButton
                variant="primary"
                onClick={() => {
                  setQueueToEdit(null);
                  setIsQueueModalOpen(true);
                }}
                icon={Plus}
                disabled={departments.length === 0}
              >
                Criar Fila
              </ActionButton>
            </div>

            {isLoadingQueues ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
              </div>
            ) : departments.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhum departamento
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Crie primeiro um departamento antes de criar filas
                </p>
                <ActionButton
                  variant="primary"
                  onClick={() => setActiveTab('departments')}
                  icon={Plus}
                >
                  Ir para Departamentos
                </ActionButton>
              </div>
            ) : queues.length === 0 ? (
              <div className="text-center py-12">
                <ListTodo className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Nenhuma fila
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Crie sua primeira fila para especializar atendimento
                </p>
                <ActionButton
                  variant="primary"
                  onClick={() => {
                    setQueueToEdit(null);
                    setIsQueueModalOpen(true);
                  }}
                  icon={Plus}
                >
                  Criar Primeira Fila
                </ActionButton>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {queues.map((queue) => (
                  <div
                    key={queue.id}
                    className="border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div
                          className="px-3 py-1.5 rounded-lg flex items-center gap-2 inline-flex mb-2"
                          style={{
                            backgroundColor: queue.color + '20',
                            color: queue.color,
                          }}
                        >
                          <span className="text-lg">{getIconEmoji(queue.icon)}</span>
                          <span className="font-semibold">{queue.name}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {getDepartmentName(queue.department_id)}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setQueueToEdit(queue);
                            setIsQueueModalOpen(true);
                          }}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => setQueueToDelete(queue)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    </div>
                    {queue.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {queue.description}
                      </p>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Prioridade: </span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          {queue.priority}
                        </span>
                      </div>
                      {queue.sla_minutes && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">SLA: </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {queue.sla_minutes}min
                          </span>
                        </div>
                      )}
                      <div>
                        <span className={`font-medium ${
                          queue.is_active
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {queue.is_active ? 'Ativa' : 'Inativa'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={() => {
          setIsDepartmentModalOpen(false);
          setDepartmentToEdit(null);
        }}
        onSubmit={departmentToEdit ? handleUpdateDepartment : handleCreateDepartment}
        initialData={departmentToEdit || undefined}
        mode={departmentToEdit ? 'edit' : 'create'}
      />

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
        isOpen={!!departmentToDelete}
        onClose={() => setDepartmentToDelete(null)}
        onConfirm={handleDeleteDepartment}
        title="Excluir Departamento"
        description={`Tem certeza que deseja excluir o departamento "${departmentToDelete?.name}"?`}
        confirmText="Excluir"
        confirmVariant="danger"
      />

      <ConfirmDialog
        isOpen={!!queueToDelete}
        onClose={() => setQueueToDelete(null)}
        onConfirm={handleDeleteQueue}
        title="Excluir Fila"
        description={`Tem certeza que deseja excluir a fila "${queueToDelete?.name}"?`}
        confirmText="Excluir"
        confirmVariant="danger"
      />
    </div>
  );
}
