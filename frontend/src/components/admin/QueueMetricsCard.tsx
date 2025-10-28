'use client';

import React, { useEffect, useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  Users, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  BarChart3,
  Target
} from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';
import { QueueMetrics, Queue } from '@/types/queue';
import { queuesAPI } from '@/lib/api';
import { exportQueueMetricsToCSV, exportQueueMetricsToPDF } from '@/lib/exportReports';
import ExportButton from './ExportButton';

interface QueueMetricsCardProps {
  queueId: string;
  queueName: string;
  queue?: Queue;
  days?: number;
}

export default function QueueMetricsCard({ queueId, queueName, queue, days = 30 }: QueueMetricsCardProps) {
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [queueData, setQueueData] = useState<Queue | null>(queue || null);

  useEffect(() => {
    loadMetrics();
    if (!queue) {
      loadQueue();
    }
  }, [queueId, days]);

  const loadQueue = async () => {
    try {
      const response = await queuesAPI.get(queueId);
      setQueueData(response.data);
    } catch (err) {
      console.error('Error loading queue:', err);
    }
  };

  const loadMetrics = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await queuesAPI.getMetrics(queueId, { days });
      setMetrics(response.data);
    } catch (err) {
      console.error('Error loading queue metrics:', err);
      setError('Erro ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  // Format time in seconds to human readable
  const formatTime = (seconds: number | null): string => {
    if (seconds === null || seconds === 0) return '--';
    
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}min`;
    
    const hours = Math.floor(seconds / 3600);
    const mins = Math.round((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Format percentage
  const formatPercent = (value: number | null): string => {
    if (value === null) return '--';
    return `${Math.round(value * 100)}%`;
  };

  // Get SLA compliance color
  const getSLAColor = (rate: number | null): string => {
    if (rate === null) return 'text-gray-400';
    if (rate >= 0.9) return 'text-green-600';
    if (rate >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <p className="text-red-600">{error || 'Erro ao carregar métricas'}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="px-6 py-4 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{queueName}</h3>
            <p className="text-sm text-gray-500">Métricas dos últimos {days} dias</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Capacity pill */}
            {queueData && typeof queueData.max_queue_size === 'number' && queueData.max_queue_size > 0 && (
              (() => {
                const used = queueData.queued_conversations ?? 0;
                const cap = queueData.max_queue_size!;
                const pct = Math.min(100, Math.round((used / cap) * 100));
                const isOverflow = used >= cap;
                const isNear = !isOverflow && pct >= 80;
                const title = isOverflow
                  ? `Overflow ativo`
                  : isNear
                    ? `Capacidade em ${pct}%`
                    : `Ocupação ${pct}%`;
                return (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${
                      isOverflow
                        ? 'bg-red-100 text-red-700'
                        : isNear
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                    title={title}
                  >
                    {isOverflow ? 'Overflow ativo' : isNear ? `Capacidade ${pct}%` : `Ocupação ${pct}%`}
                  </span>
                );
              })()
            )}
            {queueData && (
              <ExportButton
                onExportCSV={() => exportQueueMetricsToCSV(queueData, metrics, days)}
                onExportPDF={() => exportQueueMetricsToPDF(queueData, metrics, days)}
                disabled={loading}
              />
            )}
            <button
              onClick={loadMetrics}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Atualizar
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Volume Metrics */}
          <MetricCard
            icon={<Activity className="w-5 h-5" />}
            label="Total"
            value={metrics.total_conversations}
            color="blue"
          />
          <MetricCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Hoje"
            value={metrics.conversations_today}
            color="green"
          />
          <MetricCard
            icon={<Users className="w-5 h-5" />}
            label="Na Fila"
            value={metrics.queued_now}
            color="yellow"
          />
          <MetricCard
            icon={<CheckCircle className="w-5 h-5" />}
            label="Fechadas Hoje"
            value={metrics.closed_today}
            color="purple"
          />
        </div>

        {/* Time Metrics */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Tempos Médios
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TimeMetricCard
              label="Tempo de Espera"
              value={formatTime(metrics.avg_wait_time)}
              rawValue={metrics.avg_wait_time}
            />
            <TimeMetricCard
              label="Tempo de Resposta"
              value={formatTime(metrics.avg_response_time)}
              rawValue={metrics.avg_response_time}
            />
            <TimeMetricCard
              label="Tempo de Resolução"
              value={formatTime(metrics.avg_resolution_time)}
              rawValue={metrics.avg_resolution_time}
            />
          </div>
        </div>

        {/* SLA & Quality Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* SLA Compliance */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">SLA Compliance</span>
              </div>
              <span className={`text-2xl font-bold ${getSLAColor(metrics.sla_compliance_rate)}`}>
                {formatPercent(metrics.sla_compliance_rate)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Violações Hoje: {metrics.sla_violations_today}</span>
              <span>7 dias: {metrics.sla_violations_7d}</span>
            </div>
            {/* Progress bar */}
            {metrics.sla_compliance_rate !== null && (
              <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    metrics.sla_compliance_rate >= 0.9
                      ? 'bg-green-500'
                      : metrics.sla_compliance_rate >= 0.7
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${metrics.sla_compliance_rate * 100}%` }}
                />
              </div>
            )}
          </div>

          {/* Quality Metrics */}
          <div className="border rounded-lg p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Taxa de Resolução</span>
                </div>
                <span className="text-2xl font-bold text-blue-600">
                  {formatPercent(metrics.resolution_rate)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">CSAT Score</span>
                </div>
                <span className="text-2xl font-bold text-purple-600">
                  {metrics.csat_score !== null 
                    ? `${formatNumber(metrics.csat_score, 1)}★` 
                    : '--'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Overflow Metrics */}
        {(metrics.overflow_events > 0 || (queueData && queueData.max_queue_size)) && (
          <div className="border rounded-lg p-4 mb-6 bg-orange-50 dark:bg-orange-900/10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <span className="text-sm font-semibold text-gray-700">Overflow</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-600 mb-1">Eventos de Overflow</p>
                <p className="text-xl font-bold text-orange-600">{metrics.overflow_events}</p>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Taxa de Overflow</p>
                <p className="text-xl font-bold text-orange-600">
                  {metrics.overflow_rate !== null ? `${formatNumber(metrics.overflow_rate, 1)}%` : '--'}
                </p>
              </div>
            </div>
            {metrics.overflow_events > 0 && (
              <p className="text-xs text-gray-600 mt-2">
                {metrics.overflow_events} conversas foram redirecionadas para outras filas no período
              </p>
            )}
          </div>
        )}

        {/* Capacity Section */}
        {queueData && typeof queueData.max_queue_size === 'number' && queueData.max_queue_size > 0 && (
          (() => {
            const used = queueData.queued_conversations ?? 0;
            const cap = queueData.max_queue_size!;
            const pct = Math.min(100, Math.round((used / cap) * 100));
            const barColor = used >= cap
              ? 'bg-red-500'
              : pct >= 80
              ? 'bg-yellow-500'
              : 'bg-green-500';
            return (
              <div className="mt-6 border rounded-lg p-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  Capacidade
                </h4>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600">Ocupação atual</span>
                  <span className="text-gray-900 font-medium">{used} / {cap} ({pct}%)</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })()
        )}

        {/* Volume Chart Placeholder */}
        {metrics.volume_by_hour && metrics.volume_by_hour.length > 0 && (
          <div className="mt-6 border rounded-lg p-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">
              Volume nas Últimas 24 Horas
            </h4>
            <SimpleVolumeChart data={metrics.volume_by_hour} />
          </div>
        )}
      </div>
    </div>
  );
}

// Metric Card Component
interface MetricCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
}

function MetricCard({ icon, label, value, color }: MetricCardProps) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="border rounded-lg p-4">
      <div className={`inline-flex p-2 rounded-lg ${colors[color]} mb-2`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

// Time Metric Card Component
interface TimeMetricCardProps {
  label: string;
  value: string;
  rawValue: number | null;
}

function TimeMetricCard({ label, value, rawValue }: TimeMetricCardProps) {
  const getColor = () => {
    if (rawValue === null) return 'text-gray-400';
    if (rawValue < 300) return 'text-green-600'; // < 5min
    if (rawValue < 900) return 'text-yellow-600'; // < 15min
    return 'text-red-600';
  };

  return (
    <div className="border rounded-lg p-3">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-xl font-bold ${getColor()}`}>{value}</p>
    </div>
  );
}

// Simple Volume Chart Component (without external library)
interface SimpleVolumeChartProps {
  data: Array<{ hour: number; count: number }>;
}

function SimpleVolumeChart({ data }: SimpleVolumeChartProps) {
  const maxCount = Math.max(...data.map(d => d.count), 1);
  
  return (
    <div className="flex items-end justify-between gap-1 h-32">
      {data.map((item) => {
        const height = (item.count / maxCount) * 100;
        return (
          <div key={item.hour} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full relative group">
              <div
                className="w-full bg-blue-500 rounded-t hover:bg-blue-600 transition-colors"
                style={{ height: `${Math.max(height, 2)}px` }}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {item.count} conversas
                  <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
                </div>
              </div>
            </div>
            <span className="text-[10px] text-gray-500">
              {item.hour}h
            </span>
          </div>
        );
      })}
    </div>
  );
}
