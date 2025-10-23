'use client';

import React from 'react';
import { Calendar } from 'lucide-react';

interface PeriodSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

const periods = [
  { label: 'Hoje', days: 1 },
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '90 dias', days: 90 },
];

export default function PeriodSelector({ value, onChange }: PeriodSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-500" />
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {periods.map((period) => (
          <button
            key={period.days}
            onClick={() => onChange(period.days)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              value === period.days
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {period.label}
          </button>
        ))}
      </div>
    </div>
  );
}
