/**
 * ExecutionHistory Component
 * Exibe histórico de execuções
 */

import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Send,
  BarChart3,
} from 'lucide-react';
import type { FlowAutomationExecution } from '@/types/flow_automation';

interface ExecutionHistoryProps {
  executions: FlowAutomationExecution[];
  isLoading?: boolean;
}

export default function ExecutionHistory({
  executions,
  isLoading = false,
}: ExecutionHistoryProps) {
  const stats = useMemo(() => {
    if (!executions || executions.length === 0) return null;

    const total = executions.length;
    const completed = executions.filter((e) => e.status === 'completed').length;
    const failed = executions.filter((e) => e.status === 'failed').length;
    const totalSent = executions.reduce((sum, e) => sum + (e.sent_count || 0), 0);
    const totalDelivered = executions.reduce((sum, e) => sum + (e.delivered_count || 0), 0);

    return { total, completed, failed, totalSent, totalDelivered };
  }, [executions]);

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { color: string; label: string; icon: React.ComponentType<any> }> = {
      completed: {
        color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
        label: 'Concluída',
        icon: CheckCircle,
      },
      processing: {
        color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
        label: 'Processando',
        icon: Clock,
      },
      failed: {
        color: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300',
        label: 'Erro',
        icon: AlertCircle,
      },
      partial: {
        color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
        label: 'Parcial',
        icon: AlertCircle,
      },
    };

    const config = configs[status] || configs.completed;
    const Icon = config.icon;

    return (
      <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${config.color}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </div>
    );
  };

  const getSuccessRate = (execution: FlowAutomationExecution) => {
    if (!execution.total_recipients || execution.total_recipients === 0) return 0;
    return Math.round(((execution.completed_count || 0) / execution.total_recipients) * 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!executions || executions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma execução encontrada</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-2xl font-bold">{stats.total}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <div className="text-xs text-green-600 dark:text-green-400">Concluídas</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">{stats.completed}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            <div className="text-xs text-red-600 dark:text-red-400">Erros</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.failed}</div>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="text-xs text-blue-600 dark:text-blue-400">Enviados</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{stats.totalSent}</div>
          </div>
        </div>
      )}

      {/* Executions List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {executions.map((execution) => {
          const successRate = getSuccessRate(execution);
          const startDate = parseISO(execution.started_at);

          return (
            <div
              key={execution.id}
              className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 space-y-3"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(execution.status)}
                    <span className="text-xs text-gray-500">
                      {format(startDate, 'd MMM yyyy HH:mm', { locale: ptBR })}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {execution.triggered_by === 'manual' && (
                      <span>Disparada manualmente</span>
                    )}
                    {execution.triggered_by === 'scheduled' && (
                      <span>Disparada por agendamento</span>
                    )}
                    {execution.triggered_by === 'webhook' && (
                      <span>Disparada por webhook</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total</div>
                  <div className="font-semibold">{execution.total_recipients}</div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Enviados</div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400">
                    {execution.sent_count}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Entregues</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">
                    {execution.delivered_count}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Completados</div>
                  <div className="font-semibold text-green-700 dark:text-green-300">
                    {execution.completed_count}
                  </div>
                </div>
              </div>

              {/* Success Rate Bar */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Taxa de Sucesso</span>
                  <span className="text-xs font-semibold text-gray-900 dark:text-white">
                    {successRate}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      successRate >= 80
                        ? 'bg-green-500'
                        : successRate >= 50
                        ? 'bg-yellow-500'
                        : 'bg-red-500'
                    }`}
                    style={{ width: `${successRate}%` }}
                  />
                </div>
              </div>

              {/* Errors */}
              {execution.failed_count > 0 && (
                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs text-red-600 dark:text-red-400 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {execution.failed_count} falhas
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
