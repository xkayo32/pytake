'use client';

import { Clock } from 'lucide-react';
import { useState } from 'react';

type DaySchedule = {
  enabled: boolean;
  start: string;
  end: string;
};

type BusinessHoursSchedule = {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
};

export type BusinessHoursConfig = {
  timezone?: string;
  schedule?: BusinessHoursSchedule;
};

type Props = {
  value: BusinessHoursConfig;
  onChange: (config: BusinessHoursConfig) => void;
};

const DAYS = [
  { key: 'monday', label: 'Segunda-feira' },
  { key: 'tuesday', label: 'Terça-feira' },
  { key: 'wednesday', label: 'Quarta-feira' },
  { key: 'thursday', label: 'Quinta-feira' },
  { key: 'friday', label: 'Sexta-feira' },
  { key: 'saturday', label: 'Sábado' },
  { key: 'sunday', label: 'Domingo' },
];

const COMMON_TIMEZONES = [
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'UTC', label: 'UTC' },
];

export function BusinessHoursEditor({ value, onChange }: Props) {
  const schedule = value.schedule || {};
  const timezone = value.timezone || 'America/Sao_Paulo';

  const handleTimezoneChange = (tz: string) => {
    onChange({ ...value, timezone: tz });
  };

  const handleDayToggle = (day: string, enabled: boolean) => {
    const daySchedule = schedule[day as keyof BusinessHoursSchedule] || {
      enabled: false,
      start: '09:00',
      end: '18:00',
    };

    onChange({
      ...value,
      schedule: {
        ...schedule,
        [day]: { ...daySchedule, enabled },
      },
    });
  };

  const handleTimeChange = (day: string, field: 'start' | 'end', time: string) => {
    const daySchedule = schedule[day as keyof BusinessHoursSchedule] || {
      enabled: true,
      start: '09:00',
      end: '18:00',
    };

    onChange({
      ...value,
      schedule: {
        ...schedule,
        [day]: { ...daySchedule, [field]: time },
      },
    });
  };

  const applyToAll = () => {
    const templateDay = schedule.monday || { enabled: true, start: '09:00', end: '18:00' };
    const newSchedule: BusinessHoursSchedule = {};

    DAYS.forEach((day) => {
      newSchedule[day.key as keyof BusinessHoursSchedule] = { ...templateDay };
    });

    onChange({ ...value, schedule: newSchedule });
  };

  return (
    <div className="space-y-4">
      {/* Timezone Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Fuso Horário
        </label>
        <select
          value={timezone}
          onChange={(e) => handleTimezoneChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        >
          {COMMON_TIMEZONES.map((tz) => (
            <option key={tz.value} value={tz.value}>
              {tz.label}
            </option>
          ))}
        </select>
      </div>

      {/* Apply to All Button */}
      <button
        type="button"
        onClick={applyToAll}
        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium"
      >
        Aplicar horário da segunda-feira para todos os dias
      </button>

      {/* Days Schedule */}
      <div className="space-y-3">
        {DAYS.map((day) => {
          const daySchedule = schedule[day.key as keyof BusinessHoursSchedule] || {
            enabled: false,
            start: '09:00',
            end: '18:00',
          };

          return (
            <div
              key={day.key}
              className="flex items-center gap-4 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
            >
              {/* Day Toggle */}
              <div className="flex items-center gap-2 w-40">
                <input
                  type="checkbox"
                  checked={daySchedule.enabled}
                  onChange={(e) => handleDayToggle(day.key, e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {day.label}
                </span>
              </div>

              {/* Time Pickers */}
              {daySchedule.enabled && (
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <input
                    type="time"
                    value={daySchedule.start}
                    onChange={(e) => handleTimeChange(day.key, 'start', e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                  <span className="text-gray-500 dark:text-gray-400">até</span>
                  <input
                    type="time"
                    value={daySchedule.end}
                    onChange={(e) => handleTimeChange(day.key, 'end', e.target.value)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}

              {!daySchedule.enabled && (
                <span className="text-sm text-gray-400 dark:text-gray-500 italic">
                  Fora de serviço
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        Conversas em fila fora do horário de funcionamento não serão distribuídas automaticamente.
      </p>
    </div>
  );
}
