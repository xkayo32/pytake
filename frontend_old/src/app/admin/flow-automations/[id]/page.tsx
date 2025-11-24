'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Edit,
  Play,
  Save,
  Trash2,
  AlertCircle,
  Loader,
  Calendar,
  History,
  Settings,
} from 'lucide-react';
import { flowAutomationsAPI } from '@/lib/api/flowAutomationsAPI';
import ScheduleEditor from '@/components/admin/flow-automations/ScheduleEditor';
import ExceptionsManager from '@/components/admin/flow-automations/ExceptionsManager';
import ExecutionHistory from '@/components/admin/flow-automations/ExecutionHistory';
import type {
  FlowAutomation,
  FlowAutomationSchedule,
  FlowAutomationScheduleCreate,
  FlowAutomationExecution,
} from '@/types/flow_automation';

type TabType = 'info' | 'schedule' | 'exceptions' | 'history';

export default function AutomationDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const automationId = params?.id as string;
  const initialTab = (searchParams.get('tab') as TabType) || 'info';

  // ============================================
  // State
  // ============================================

  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [automation, setAutomation] = useState<FlowAutomation | null>(null);
  const [schedule, setSchedule] = useState<FlowAutomationSchedule | null>(null);
  const [executions, setExecutions] = useState<FlowAutomationExecution[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScheduleEditing, setIsScheduleEditing] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  // ============================================
  // Fetch Data
  // ============================================

  const fetchAutomation = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await flowAutomationsAPI.get(automationId);
      setAutomation(data);

      // Fetch schedule if exists
      if (data.schedule) {
        setSchedule(data.schedule);
      }
    } catch (err) {
      console.error('Erro ao carregar automação:', err);
      setError('Erro ao carregar automação');
    } finally {
      setIsLoading(false);
    }
  }, [automationId]);

  const fetchExecutions = useCallback(async () => {
    try {
      // TODO: Implement executions fetch from API
      setExecutions([]);
    } catch (err) {
      console.error('Erro ao carregar execuções:', err);
    }
  }, [automationId]);

  useEffect(() => {
    fetchAutomation();
    fetchExecutions();
  }, [automationId, fetchAutomation, fetchExecutions]);

  // ============================================
  // Handlers
  // ============================================

  const handleSaveSchedule = async (scheduleData: FlowAutomationScheduleCreate) => {
    try {
      setError('');
      setIsSavingSchedule(true);

      if (schedule) {
        // Update existing
        const updated = await flowAutomationsAPI.updateSchedule(automationId, scheduleData);
        setSchedule(updated);
      } else {
        // Create new
        const created = await flowAutomationsAPI.createSchedule(automationId, scheduleData);
        setSchedule(created);
      }

      setSuccess('Agendamento salvo com sucesso');
      setIsScheduleEditing(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao salvar agendamento');
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleDeleteSchedule = async () => {
    if (!confirm('Tem certeza que deseja remover o agendamento?')) return;

    try {
      setError('');
      await flowAutomationsAPI.deleteSchedule(automationId);
      setSchedule(null);
      setSuccess('Agendamento removido');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao remover agendamento');
    }
  };

  const handleStart = async () => {
    try {
      setError('');
      await flowAutomationsAPI.start(automationId);
      setSuccess('Automação iniciada');
      setTimeout(() => {
        fetchAutomation();
        setSuccess('');
      }, 1000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao iniciar automação');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja deletar esta automação?')) return;

    try {
      setError('');
      await flowAutomationsAPI.delete(automationId);
      router.push('/admin/flow-automations');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao deletar automação');
    }
  };

  // ============================================
  // Tabs Configuration
  // ============================================

  const tabs: Array<{ id: TabType; label: string; icon: React.ComponentType<any> }> = [
    { id: 'info', label: 'Informações', icon: Edit },
    { id: 'schedule', label: 'Agendamento', icon: Calendar },
    { id: 'exceptions', label: 'Exceções', icon: Settings },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  // ============================================
  // Loading State
  // ============================================

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader className="w-8 h-8 animate-spin mx-auto" />
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!automation) {
    return (
      <div className="p-8">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-semibold">Automação não encontrada</h2>
          <button
            onClick={() => router.push('/admin/flow-automations')}
            className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // Main Render
  // ============================================

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/admin/flow-automations')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {automation.name}
            </h1>
            {automation.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-1">{automation.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleStart}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700"
          >
            <Play className="w-4 h-4" />
            Executar Agora
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <Trash2 className="w-4 h-4" />
            Deletar
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg flex gap-2">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Status
                  </label>
                  <div className="mt-1 inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-gray-100 dark:bg-gray-700">
                    {automation.status}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Ativo
                  </label>
                  <div className="mt-1 text-sm">
                    {automation.is_active ? (
                      <span className="text-green-600 dark:text-green-400">Sim</span>
                    ) : (
                      <span className="text-gray-600 dark:text-gray-400">Não</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tipo de Trigger
                  </label>
                  <div className="mt-1 text-sm">{automation.trigger_type}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tipo de Audiência
                  </label>
                  <div className="mt-1 text-sm">{automation.audience_type}</div>
                </div>
              </div>

              <div className="grid md:grid-cols-4 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {automation.total_executions}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Execuções</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {automation.total_sent}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Enviados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {automation.total_delivered}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Entregues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {automation.total_failed}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Falhados</div>
                </div>
              </div>
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {isScheduleEditing ? (
                <ScheduleEditor
                  automationId={automationId}
                  schedule={schedule}
                  onSave={handleSaveSchedule}
                  onCancel={() => setIsScheduleEditing(false)}
                  isLoading={isSavingSchedule}
                />
              ) : (
                <>
                  {schedule ? (
                    <div className="space-y-6">
                      <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400">
                              Tipo
                            </label>
                            <div className="mt-1 font-semibold capitalize">
                              {schedule.recurrence_type}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400">
                              Timezone
                            </label>
                            <div className="mt-1 font-semibold">{schedule.timezone}</div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400">
                              Horário Comercial
                            </label>
                            <div className="mt-1 font-semibold">
                              {schedule.execution_window_start} - {schedule.execution_window_end}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm text-gray-600 dark:text-gray-400">
                              Próxima Execução
                            </label>
                            <div className="mt-1 font-semibold">
                              {schedule.next_scheduled_at
                                ? new Date(schedule.next_scheduled_at).toLocaleString('pt-BR')
                                : 'Não agendada'}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                          {schedule.skip_weekends && (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                              Pula finais de semana
                            </span>
                          )}
                          {schedule.skip_holidays && (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
                              Pula feriados
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 pt-4 justify-end border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setIsScheduleEditing(true)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                        <button
                          onClick={handleDeleteSchedule}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remover
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 space-y-4">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Nenhum agendamento configurado
                      </p>
                      <button
                        onClick={() => setIsScheduleEditing(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                      >
                        <Calendar className="w-4 h-4" />
                        Criar Agendamento
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Exceptions Tab */}
          {activeTab === 'exceptions' && (
            <ExceptionsManager
              automationId={automationId}
              exceptions={schedule?.exceptions || []}
            />
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <ExecutionHistory executions={executions} isLoading={isLoading} />
          )}
        </div>
      </div>
    </div>
  );
}
