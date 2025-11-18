/**
 * ExceptionsManager Component
 * Gerencia exceções de agendamento (skip, reschedule, modify)
 */

import React, { useState } from 'react';
import {
  Plus,
  X,
  Trash2,
  SkipForward,
  Clock,
  Settings,
  Loader,
  AlertCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { flowAutomationsAPI } from '@/lib/api/flowAutomationsAPI';
import type {
  FlowAutomationScheduleException,
  ScheduleExceptionType,
} from '@/types/flow_automation';

interface ExceptionsManagerProps {
  automationId: string;
  exceptions: FlowAutomationScheduleException[];
  onExceptionAdded?: (exception: FlowAutomationScheduleException) => void;
  onExceptionRemoved?: (exceptionId: string) => void;
}

const EXCEPTION_TYPES = [
  {
    value: 'skip' as ScheduleExceptionType,
    label: 'Pular',
    icon: SkipForward,
    color: 'text-orange-600 dark:text-orange-400',
  },
  {
    value: 'reschedule' as ScheduleExceptionType,
    label: 'Reagendar',
    icon: Clock,
    color: 'text-blue-600 dark:text-blue-400',
  },
  {
    value: 'modify' as ScheduleExceptionType,
    label: 'Modificar',
    icon: Settings,
    color: 'text-purple-600 dark:text-purple-400',
  },
];

export default function ExceptionsManager({
  automationId,
  exceptions,
  onExceptionAdded,
  onExceptionRemoved,
}: ExceptionsManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ScheduleExceptionType>('skip');

  // Skip form
  const [skipStartDate, setSkipStartDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [skipEndDate, setSkipEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [skipReason, setSkipReason] = useState<string>('');

  // Reschedule form
  const [rescheduleDate, setRescheduleDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [rescheduleTime, setRescheduleTime] = useState<string>('09:00');
  const [rescheduleReason, setRescheduleReason] = useState<string>('');

  // Modify form
  const [modifyStartDate, setModifyStartDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [modifyEndDate, setModifyEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  const [modifyConfig, setModifyConfig] = useState<string>(
    JSON.stringify({ rate_limit_per_hour: 3000 }, null, 2)
  );
  const [modifyReason, setModifyReason] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>('');

  // ============================================
  // Handlers
  // ============================================

  const handleAddException = async () => {
    try {
      setError('');
      setIsSubmitting(true);

      let exceptionData: Partial<FlowAutomationScheduleException> = {
        exception_type: selectedType,
      };

      if (selectedType === 'skip') {
        exceptionData = {
          ...exceptionData,
          start_date: new Date(skipStartDate).toISOString(),
          end_date: new Date(skipEndDate).toISOString(),
          reason: skipReason,
        };
      } else if (selectedType === 'reschedule') {
        exceptionData = {
          ...exceptionData,
          start_date: new Date(rescheduleDate).toISOString(),
          rescheduled_to: new Date(
            `${rescheduleDate}T${rescheduleTime}`
          ).toISOString(),
          reason: rescheduleReason,
        };
      } else if (selectedType === 'modify') {
        exceptionData = {
          ...exceptionData,
          start_date: new Date(modifyStartDate).toISOString(),
          end_date: new Date(modifyEndDate).toISOString(),
          modified_config: JSON.parse(modifyConfig),
          reason: modifyReason,
        };
      }

      const exception = await flowAutomationsAPI.addException(
        automationId,
        exceptionData
      );

      onExceptionAdded?.(exception);
      setIsOpen(false);
      resetForm();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao adicionar exceção');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveException = async (exceptionId: string) => {
    try {
      await flowAutomationsAPI.removeException(automationId, exceptionId);
      onExceptionRemoved?.(exceptionId);
    } catch (err) {
      console.error('Erro ao remover exceção:', err);
    }
  };

  const resetForm = () => {
    setSelectedType('skip');
    setSkipStartDate(format(new Date(), 'yyyy-MM-dd'));
    setSkipEndDate(format(new Date(), 'yyyy-MM-dd'));
    setSkipReason('');
    setRescheduleDate(format(new Date(), 'yyyy-MM-dd'));
    setRescheduleTime('09:00');
    setRescheduleReason('');
    setModifyStartDate(format(new Date(), 'yyyy-MM-dd'));
    setModifyEndDate(format(new Date(), 'yyyy-MM-dd'));
    setModifyConfig(JSON.stringify({ rate_limit_per_hour: 3000 }, null, 2));
    setModifyReason('');
  };

  const getExceptionTypeConfig = (type: ScheduleExceptionType) => {
    return EXCEPTION_TYPES.find((t) => t.value === type);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Exceções de Agendamento</h3>
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 text-sm"
        >
          <Plus className="w-4 h-4" />
          Adicionar Exceção
        </button>
      </div>

      {/* Exceptions List */}
      {exceptions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Nenhuma exceção configurada</p>
        </div>
      ) : (
        <div className="space-y-2">
          {exceptions.map((exc) => {
            const config = getExceptionTypeConfig(exc.exception_type);
            const Icon = config?.icon || AlertCircle;

            return (
              <div
                key={exc.id}
                className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
              >
                <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${config?.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{config?.label}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    {exc.exception_type === 'skip' && (
                      <>
                        <div>
                          {format(parseISO(exc.start_date), 'd MMM', { locale: ptBR })} até{' '}
                          {format(parseISO(exc.end_date || exc.start_date), 'd MMM yyyy', {
                            locale: ptBR,
                          })}
                        </div>
                        {exc.reason && <div>{exc.reason}</div>}
                      </>
                    )}
                    {exc.exception_type === 'reschedule' && (
                      <>
                        <div>Para: {format(parseISO(exc.rescheduled_to || ''), 'dd/MM/yyyy HH:mm')}</div>
                        {exc.reason && <div>{exc.reason}</div>}
                      </>
                    )}
                    {exc.exception_type === 'modify' && (
                      <>
                        <div>
                          {format(parseISO(exc.start_date), 'd MMM', { locale: ptBR })} até{' '}
                          {format(parseISO(exc.end_date || exc.start_date), 'd MMM yyyy', {
                            locale: ptBR,
                          })}
                        </div>
                        {exc.modified_config && (
                          <div className="text-xs text-gray-500 mt-1 font-mono">
                            {Object.entries(exc.modified_config)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(', ')}
                          </div>
                        )}
                        {exc.reason && <div>{exc.reason}</div>}
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveException(exc.id)}
                  className="text-red-500 hover:text-red-700 p-1 flex-shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Exception Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="font-semibold">Adicionar Exceção</h2>
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Exception Type Selector */}
              <div>
                <label className="block text-sm font-medium mb-2">Tipo de Exceção</label>
                <div className="space-y-2">
                  {EXCEPTION_TYPES.map((type) => (
                    <label key={type.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="exceptionType"
                        value={type.value}
                        checked={selectedType === type.value}
                        onChange={(e) => setSelectedType(e.target.value as ScheduleExceptionType)}
                        className="rounded"
                      />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Skip Form */}
              {selectedType === 'skip' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={skipStartDate}
                      onChange={(e) => setSkipStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Final</label>
                    <input
                      type="date"
                      value={skipEndDate}
                      onChange={(e) => setSkipEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Motivo</label>
                    <input
                      type="text"
                      value={skipReason}
                      onChange={(e) => setSkipReason(e.target.value)}
                      placeholder="Feriado, manutenção, etc"
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </>
              )}

              {/* Reschedule Form */}
              {selectedType === 'reschedule' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Novo Horário</label>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Motivo</label>
                    <input
                      type="text"
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                      placeholder="Manutenção de servidor, etc"
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </>
              )}

              {/* Modify Form */}
              {selectedType === 'modify' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={modifyStartDate}
                      onChange={(e) => setModifyStartDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Data Final</label>
                    <input
                      type="date"
                      value={modifyEndDate}
                      onChange={(e) => setModifyEndDate(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Configuração (JSON)</label>
                    <textarea
                      value={modifyConfig}
                      onChange={(e) => setModifyConfig(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Motivo</label>
                    <input
                      type="text"
                      value={modifyReason}
                      onChange={(e) => setModifyReason(e.target.value)}
                      placeholder="Black Friday, campanha especial, etc"
                      className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setIsOpen(false);
                  resetForm();
                }}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddException}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting && <Loader className="w-4 h-4 animate-spin" />}
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
