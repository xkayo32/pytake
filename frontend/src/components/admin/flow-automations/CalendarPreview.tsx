/**
 * CalendarPreview Component
 * Exibe visualização das próximas execuções agendadas
 */

import React, { useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, CheckCircle, Clock, SkipForward } from 'lucide-react';
import type { SchedulePreview } from '@/types/flow_automation';

interface CalendarPreviewProps {
  preview: SchedulePreview | null;
  isLoading?: boolean;
}

export default function CalendarPreview({
  preview,
  isLoading = false,
}: CalendarPreviewProps) {
  const executions = useMemo(() => {
    if (!preview?.next_executions) return [];
    return preview.next_executions;
  }, [preview]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  if (!preview || executions.length === 0) {
    return (
      <div className="py-8 text-center text-gray-500 dark:text-gray-400">
        <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
        <p>Nenhuma execução agendada</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-96 overflow-y-auto">
      <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 px-3 py-2">
        Próximas {executions.length} execuções
        {preview.timezone && (
          <span className="text-gray-500 ml-2">• Timezone: {preview.timezone}</span>
        )}
      </div>

      {executions.map((exec, idx) => {
        const execDate = parseISO(exec.scheduled_at);
        const isSkipped = exec.is_skipped;

        return (
          <div
            key={idx}
            className={`flex items-center gap-3 px-3 py-3 rounded-lg border transition-colors ${
              isSkipped
                ? 'bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-700'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900'
            }`}
          >
            {/* Icon */}
            <div className="flex-shrink-0">
              {isSkipped ? (
                <SkipForward className="w-5 h-5 text-gray-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-blue-500" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className={`font-medium text-sm ${
                isSkipped
                  ? 'text-gray-600 dark:text-gray-400 line-through'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {format(execDate, 'EEEE, d MMMM', { locale: ptBR })}
              </div>
              <div className={`text-xs ${
                isSkipped ? 'text-gray-500' : 'text-blue-600 dark:text-blue-400'
              }`}>
                {format(execDate, 'HH:mm')}
                {exec.execution_window && (
                  <span className="ml-1 text-gray-500">
                    • Janela: {exec.execution_window.start} - {exec.execution_window.end}
                  </span>
                )}
              </div>
              {isSkipped && exec.skip_reason && (
                <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {exec.skip_reason}
                </div>
              )}
            </div>

            {/* Badge */}
            <div className={`flex-shrink-0 px-2 py-1 rounded text-xs font-semibold ${
              isSkipped
                ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
            }`}>
              {isSkipped ? 'Pulado' : 'Agendado'}
            </div>
          </div>
        );
      })}

      {/* Info Footer */}
      <div className="text-xs text-gray-500 dark:text-gray-400 px-3 py-2 border-t border-gray-200 dark:border-gray-700 mt-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-blue-500" />
            <span>Agendado</span>
          </div>
          <div className="flex items-center gap-1">
            <SkipForward className="w-3 h-3 text-gray-400" />
            <span>Pulado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
