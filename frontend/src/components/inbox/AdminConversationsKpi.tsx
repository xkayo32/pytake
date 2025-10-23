'use client';

import React from 'react';

interface Props {
  total: number;
  open: number;
  active: number;
  queued: number;
  avgWaitSeconds?: number | null;
  overflowCount?: number;
}

export default function AdminConversationsKpi({
  total,
  open,
  active,
  queued,
  avgWaitSeconds = null,
  overflowCount = 0,
}: Props) {
  const formatTime = (s?: number | null) => {
    if (!s) return '--';
    if (s < 60) return `${Math.round(s)}s`;
    if (s < 3600) return `${Math.round(s / 60)}m`;
    return `${Math.round(s / 3600)}h`;
  };

  return (
    <div className="flex items-center gap-3">
      <div className="grid grid-cols-4 gap-2 w-full">
        <div className="p-3 bg-white rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Total</div>
          <div className="text-lg font-semibold text-gray-900">{total}</div>
        </div>

        <div className="p-3 bg-white rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Abertas</div>
          <div className="text-lg font-semibold text-green-700">{open}</div>
        </div>

        <div className="p-3 bg-white rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Ativas</div>
          <div className="text-lg font-semibold text-blue-700">{active}</div>
        </div>

        <div className="p-3 bg-white rounded-lg shadow-sm border">
          <div className="text-xs text-gray-500">Na fila</div>
          <div className="text-lg font-semibold text-yellow-700">{queued}</div>
        </div>
      </div>

      <div className="ml-3 flex items-center gap-2">
        <div className="text-xs text-gray-500">Média espera</div>
        <div className="text-sm font-medium text-gray-900">{formatTime(avgWaitSeconds)}</div>
        <div className="text-xs text-gray-500">Overflow</div>
        <div className="text-sm font-medium text-red-600">{overflowCount}</div>
      </div>
    </div>
  );
}
