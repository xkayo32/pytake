'use client';

import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';
import { QueueMetrics, Queue } from '@/types/queue';
import { queuesAPI } from '@/lib/api';
import { exportQueueComparisonToCSV } from '@/lib/exportReports';
import ExportButton from './ExportButton';

interface QueueComparisonProps {
  queues: Queue[];
  days?: number;
}

export default function QueueComparison({ queues, days = 30 }: QueueComparisonProps) {
  const [metricsMap, setMetricsMap] = useState<Record<string, QueueMetrics>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAllMetrics();
  }, [queues, days]);

  const loadAllMetrics = async () => {
    setLoading(true);
    const map: Record<string, QueueMetrics> = {};

    await Promise.all(
      queues.map(async (queue) => {
        try {
          const response = await queuesAPI.getMetrics(queue.id, { days });
          map[queue.id] = response.data;
        } catch (err) {
          console.error(`Error loading metrics for queue ${queue.id}:`, err);
        }
      })
    );

    setMetricsMap(map);
    setLoading(false);
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return '--';
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return `${hours}h${mins}m`;
  };

  const formatPercent = (value: number | null): string => {
    if (value === null) return '--';
    return `${Math.round(value * 100)}%`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (queues.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6 text-center text-gray-500">
        Nenhuma fila disponível para comparação
      </div>
    );
  }

  // Calculate averages and rankings
  const avgSLA = queues.reduce((sum, q) => {
    const rate = metricsMap[q.id]?.sla_compliance_rate;
    return sum + (rate !== null && rate !== undefined ? rate : 0);
  }, 0) / queues.length;

  const avgWaitTime = queues.reduce((sum, q) => {
    const time = metricsMap[q.id]?.avg_wait_time;
    return sum + (time || 0);
  }, 0) / queues.length;

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Comparação de Filas</h3>
            <p className="text-sm text-gray-500">Performance relativa dos últimos {days} dias</p>
          </div>
          <ExportButton
            onExportCSV={() => exportQueueComparisonToCSV(queues, metricsMap, days)}
            onExportPDF={() => {
              // PDF export for comparison - reuse CSV logic
              exportQueueComparisonToCSV(queues, metricsMap, days);
            }}
            disabled={loading || queues.length === 0}
          />
        </div>
      </div>

      <div className="divide-y">
        {queues.map((queue) => {
          const metrics = metricsMap[queue.id];
          if (!metrics) return null;

          const slaRate = metrics.sla_compliance_rate;
          const waitTime = metrics.avg_wait_time;

          return (
            <div key={queue.id} className="p-4 hover:bg-gray-50 transition-colors">
              {/* Queue Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: queue.color }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-gray-900">{queue.name}</h4>
                      {/* Capacity pill */}
                      {typeof queue.max_queue_size === 'number' && queue.max_queue_size > 0 && (() => {
                        const used = queue.queued_conversations ?? 0;
                        const cap = queue.max_queue_size!;
                        const pct = Math.min(100, Math.round((used / cap) * 100));
                        const isOverflow = used >= cap;
                        const isNear = !isOverflow && pct >= 80;
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold whitespace-nowrap ${
                            isOverflow
                              ? 'bg-red-100 text-red-700'
                              : isNear
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {isOverflow ? 'Overflow ativo' : `${pct}%`}
                          </span>
                        );
                      })()}
                    </div>
                    <p className="text-xs text-gray-500">
                      {metrics.conversations_today} conversas hoje · {metrics.queued_now} na fila
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {metrics.total_conversations} total
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-4 gap-4">
                {/* SLA Compliance */}
                <ComparisonMetric
                  label="SLA"
                  value={formatPercent(slaRate)}
                  comparison={
                    slaRate !== null && slaRate !== undefined
                      ? slaRate - avgSLA
                      : null
                  }
                  higherIsBetter
                />

                {/* Wait Time */}
                <ComparisonMetric
                  label="Espera"
                  value={formatTime(waitTime)}
                  comparison={
                    waitTime !== null && waitTime !== undefined
                      ? avgWaitTime - waitTime
                      : null
                  }
                  higherIsBetter={false}
                />

                {/* Resolution Rate */}
                <ComparisonMetric
                  label="Resolução"
                  value={formatPercent(metrics.resolution_rate)}
                  comparison={null}
                  higherIsBetter
                />

                {/* CSAT */}
                <ComparisonMetric
                  label="CSAT"
                  value={
                    metrics.csat_score !== null
                      ? `${formatNumber(metrics.csat_score, 1)}★`
                      : '--'
                  }
                  comparison={null}
                  higherIsBetter
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Comparison Metric Component
interface ComparisonMetricProps {
  label: string;
  value: string;
  comparison: number | null;
  higherIsBetter: boolean;
}

function ComparisonMetric({
  label,
  value,
  comparison,
  higherIsBetter,
}: ComparisonMetricProps) {
  const getTrendIcon = () => {
    if (comparison === null) return null;
    
    const isPositive = comparison > 0;
    const isBetter = higherIsBetter ? isPositive : !isPositive;

    if (Math.abs(comparison) < 0.01) {
      return <Minus className="w-3 h-3 text-gray-400" />;
    }

    if (isPositive) {
      return (
        <ArrowUpRight
          className={`w-3 h-3 ${isBetter ? 'text-green-600' : 'text-red-600'}`}
        />
      );
    }

    return (
      <ArrowDownRight
        className={`w-3 h-3 ${isBetter ? 'text-green-600' : 'text-red-600'}`}
      />
    );
  };

  const getTrendText = () => {
    if (comparison === null) return null;
    
    const isPositive = comparison > 0;
    const isBetter = higherIsBetter ? isPositive : !isPositive;

    if (Math.abs(comparison) < 0.01) {
      return <span className="text-gray-400">Na média</span>;
    }

    return (
      <span className={isBetter ? 'text-green-600' : 'text-red-600'}>
        {isBetter ? 'Acima' : 'Abaixo'}
      </span>
    );
  };

  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-sm font-semibold text-gray-900">{value}</p>
      {comparison !== null && (
        <div className="flex items-center gap-1 mt-1">
          {getTrendIcon()}
          <span className="text-xs">{getTrendText()}</span>
        </div>
      )}
    </div>
  );
}
