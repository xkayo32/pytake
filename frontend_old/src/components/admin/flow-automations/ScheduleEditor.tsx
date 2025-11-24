/**
 * ScheduleEditor Component
 * Interface para configurar agendamentos com suporte a múltiplos tipos de recorrência
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { Calendar, Clock, Info, X, Plus, Trash2, Loader } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import CalendarPreview from './CalendarPreview';
import { flowAutomationsAPI } from '@/lib/api/flowAutomationsAPI';
import type {
  FlowAutomationSchedule,
  FlowAutomationScheduleCreate,
  RecurrenceType,
  SchedulePreview,
} from '@/types/flow_automation';

interface ScheduleEditorProps {
  automationId?: string;
  schedule?: FlowAutomationSchedule | null;
  onSave: (schedule: FlowAutomationScheduleCreate) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const TIMEZONE_OPTIONS = [
  'America/Sao_Paulo',
  'America/Fortaleza',
  'America/Manaus',
  'America/Anchorage',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
];

const DAYS_OF_WEEK = [
  { value: 'MON', label: 'Segunda' },
  { value: 'TUE', label: 'Terça' },
  { value: 'WED', label: 'Quarta' },
  { value: 'THU', label: 'Quinta' },
  { value: 'FRI', label: 'Sexta' },
  { value: 'SAT', label: 'Sábado' },
  { value: 'SUN', label: 'Domingo' },
];

export default function ScheduleEditor({
  automationId,
  schedule,
  onSave,
  onCancel,
  isLoading = false,
}: ScheduleEditorProps) {
  // ============================================
  // State
  // ============================================

  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>(
    schedule?.recurrence_type || 'once'
  );
  const [startDate, setStartDate] = useState<string>(
    schedule?.start_date
      ? format(parseISO(schedule.start_date), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd')
  );
  const [startTime, setStartTime] = useState<string>(
    schedule?.start_time || '09:00'
  );

  // Daily config
  const [dailyInterval, setDailyInterval] = useState<number>(
    schedule?.recurrence_config?.interval || 1
  );

  // Weekly config
  const [weeklyDays, setWeeklyDays] = useState<string[]>(
    schedule?.recurrence_config?.days || ['MON', 'WED', 'FRI']
  );

  // Monthly config
  const [monthlyDay, setMonthlyDay] = useState<number>(
    schedule?.recurrence_config?.day_of_month || 15
  );

  // Cron config
  const [cronExpression, setCronExpression] = useState<string>(
    schedule?.recurrence_config?.expression || '0 9 * * MON-FRI'
  );

  // Custom dates config
  const [customDates, setCustomDates] = useState<string[]>(
    schedule?.recurrence_config?.dates || []
  );
  const [customDateInput, setCustomDateInput] = useState<string>('');

  // Execution window
  const [executionWindowStart, setExecutionWindowStart] = useState<string>(
    schedule?.execution_window_start || '09:00'
  );
  const [executionWindowEnd, setExecutionWindowEnd] = useState<string>(
    schedule?.execution_window_end || '18:00'
  );

  // Business rules
  const [skipWeekends, setSkipWeekends] = useState<boolean>(
    schedule?.skip_weekends || false
  );
  const [skipHolidays, setSkipHolidays] = useState<boolean>(
    schedule?.skip_holidays || false
  );
  const [blackoutDates, setBlackoutDates] = useState<string[]>(
    schedule?.blackout_dates || []
  );
  const [blackoutInput, setBlackoutInput] = useState<string>('');

  // Timezone
  const [timezone, setTimezone] = useState<string>(
    schedule?.timezone || 'America/Sao_Paulo'
  );

  // Preview
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  // ============================================
  // Effects
  // ============================================

  // Fetch preview quando automationId muda ou campos mudam
  useEffect(() => {
    if (!automationId) return;

    const fetchPreview = async () => {
      try {
        setPreviewLoading(true);
        const data = await flowAutomationsAPI.getSchedulePreview(automationId, 10, 30);
        setPreview(data);
      } catch (error) {
        console.error('Erro ao buscar preview:', error);
      } finally {
        setPreviewLoading(false);
      }
    };

    // Debounce: aguardar 1s depois que o usuário parar de digitar
    const timer = setTimeout(fetchPreview, 1000);
    return () => clearTimeout(timer);
  }, [automationId, recurrenceType, startDate, startTime]);

  // ============================================
  // Handlers
  // ============================================

  const toggleWeeklyDay = (day: string) => {
    setWeeklyDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addCustomDate = () => {
    if (customDateInput && !customDates.includes(customDateInput)) {
      setCustomDates([...customDates, customDateInput].sort());
      setCustomDateInput('');
    }
  };

  const removeCustomDate = (date: string) => {
    setCustomDates(customDates.filter((d) => d !== date));
  };

  const addBlackoutDate = () => {
    if (blackoutInput && !blackoutDates.includes(blackoutInput)) {
      setBlackoutDates([...blackoutDates, blackoutInput].sort());
      setBlackoutInput('');
    }
  };

  const removeBlackoutDate = (date: string) => {
    setBlackoutDates(blackoutDates.filter((d) => d !== date));
  };

  // ============================================
  // Build recurrence config based on type
  // ============================================

  const recurrenceConfig = useMemo(() => {
    switch (recurrenceType) {
      case 'daily':
        return { type: 'daily', interval: dailyInterval };
      case 'weekly':
        return { type: 'weekly', days: weeklyDays };
      case 'monthly':
        return { type: 'monthly', day_of_month: monthlyDay };
      case 'cron':
        return { type: 'cron', expression: cronExpression };
      case 'custom':
        return { type: 'custom', dates: customDates };
      case 'once':
      default:
        return { type: 'once' };
    }
  }, [recurrenceType, dailyInterval, weeklyDays, monthlyDay, cronExpression, customDates]);

  // ============================================
  // Form submission
  // ============================================

  const handleSave = async () => {
    const scheduleData: FlowAutomationScheduleCreate = {
      recurrence_type: recurrenceType,
      start_date: new Date(startDate).toISOString(),
      start_time: startTime,
      recurrence_config: recurrenceConfig,
      execution_window_start: executionWindowStart,
      execution_window_end: executionWindowEnd,
      skip_weekends: skipWeekends,
      skip_holidays: skipHolidays,
      blackout_dates: blackoutDates,
      timezone,
    };

    await onSave(scheduleData);
  };

  // ============================================
  // Render
  // ============================================

  return (
    <div className="space-y-6">
      {/* Recurrence Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Tipo de Recorrência
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(['once', 'daily', 'weekly', 'monthly', 'cron', 'custom'] as RecurrenceType[]).map(
            (type) => (
              <button
                key={type}
                onClick={() => setRecurrenceType(type)}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  recurrenceType === type
                    ? 'border-gray-900 dark:border-white bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                    : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            )
          )}
        </div>
      </div>

      {/* Recurrence Config */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Configuração
        </h3>

        {/* Start Date & Time */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Horário</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>

        {/* Daily Config */}
        {recurrenceType === 'daily' && (
          <div>
            <label className="block text-sm font-medium mb-1">Intervalo (dias)</label>
            <input
              type="number"
              min="1"
              max="365"
              value={dailyInterval}
              onChange={(e) => setDailyInterval(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
          </div>
        )}

        {/* Weekly Config */}
        {recurrenceType === 'weekly' && (
          <div>
            <label className="block text-sm font-medium mb-2">Dias da Semana</label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map((day) => (
                <button
                  key={day.value}
                  onClick={() => toggleWeeklyDay(day.value)}
                  className={`px-2 py-2 rounded text-xs font-medium transition-colors ${
                    weeklyDays.includes(day.value)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                  title={day.label}
                >
                  {day.label.substring(0, 3)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Monthly Config */}
        {recurrenceType === 'monthly' && (
          <div>
            <label className="block text-sm font-medium mb-1">Dia do Mês</label>
            <input
              type="number"
              min="1"
              max="31"
              value={monthlyDay}
              onChange={(e) => setMonthlyDay(parseInt(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
          </div>
        )}

        {/* Cron Config */}
        {recurrenceType === 'cron' && (
          <div>
            <label className="block text-sm font-medium mb-1">Expressão Cron</label>
            <input
              type="text"
              value={cronExpression}
              onChange={(e) => setCronExpression(e.target.value)}
              placeholder="0 9 * * MON-FRI"
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 font-mono"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-1 items-start">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Formato: minuto hora dia mês dia_semana</span>
            </div>
          </div>
        )}

        {/* Custom Dates Config */}
        {recurrenceType === 'custom' && (
          <div>
            <label className="block text-sm font-medium mb-2">Datas Específicas</label>
            <div className="flex gap-2 mb-2">
              <input
                type="date"
                value={customDateInput}
                onChange={(e) => setCustomDateInput(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
              />
              <button
                onClick={addCustomDate}
                className="px-3 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {customDates.length > 0 && (
              <div className="space-y-1">
                {customDates.map((date) => (
                  <div
                    key={date}
                    className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-700"
                  >
                    <span className="text-sm">
                      {format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: ptBR })}
                    </span>
                    <button
                      onClick={() => removeCustomDate(date)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Execution Window */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Janela de Execução
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Início (Horário Comercial)</label>
            <input
              type="time"
              value={executionWindowStart}
              onChange={(e) => setExecutionWindowStart(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Fim</label>
            <input
              type="time"
              value={executionWindowEnd}
              onChange={(e) => setExecutionWindowEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
          </div>
        </div>

        <div className="text-xs text-gray-600 dark:text-gray-400 flex gap-1 items-start">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>Execuções fora da janela serão movidas para o próximo horário disponível</span>
        </div>
      </div>

      {/* Business Rules */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4">
        <h3 className="font-semibold">Regras de Negócio</h3>

        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipWeekends}
              onChange={(e) => setSkipWeekends(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Pular finais de semana</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={skipHolidays}
              onChange={(e) => setSkipHolidays(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm">Pular feriados</span>
          </label>
        </div>

        {/* Blackout Dates */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium mb-2">Datas de Bloqueio</label>
          <div className="flex gap-2 mb-2">
            <input
              type="date"
              value={blackoutInput}
              onChange={(e) => setBlackoutInput(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
            />
            <button
              onClick={addBlackoutDate}
              className="px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {blackoutDates.length > 0 && (
            <div className="space-y-1">
              {blackoutDates.map((date) => (
                <div
                  key={date}
                  className="flex items-center justify-between px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20"
                >
                  <span className="text-sm">
                    {format(parseISO(date), 'EEEE, d MMMM yyyy', { locale: ptBR })}
                  </span>
                  <button
                    onClick={() => removeBlackoutDate(date)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Timezone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold mb-3">Timezone</h3>
        <select
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
        >
          {TIMEZONE_OPTIONS.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {/* Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="font-semibold mb-3">Preview - Próximas Execuções</h3>
        <CalendarPreview preview={preview} isLoading={previewLoading} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={isLoading}
          className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
        >
          {isLoading && <Loader className="w-4 h-4 animate-spin" />}
          Salvar Agendamento
        </button>
      </div>
    </div>
  );
}
