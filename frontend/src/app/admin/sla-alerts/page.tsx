'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, BellRing, Clock, RefreshCcw } from 'lucide-react';
import { formatNumber } from '@/lib/formatNumber';
import { conversationsAPI } from '@/lib/api';

type SlaAlert = {
  conversation_id: string;
  contact_id: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  queue_id: string;
  queue_name: string;
  sla_minutes?: number | null;
  queued_at?: string | null;
  waited_minutes: number;
  progress: number;
  severity: 'warning' | 'critical' | string;
  priority: number;
};

export default function SlaAlertsPage() {
  const [items, setItems] = useState<SlaAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [threshold, setThreshold] = useState(0.8);

  const criticalCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchAlerts = async () => {
    try {
      setIsLoading(true);
      const res = await conversationsAPI.getSlaAlerts({ limit: 200, nearing_threshold: threshold });
      const data = res.data as SlaAlert[];
      setItems(data);

      const criticalNow = data.filter((i) => i.severity === 'critical').length;
      if (criticalNow > criticalCountRef.current) {
        // New criticals detected: notify
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            new Notification('Conversas críticas de SLA', {
              body: `${criticalNow} conversas acima do SLA`,
            });
          }
        }
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      }
      criticalCountRef.current = criticalNow;
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar alertas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Request notification permission once
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [threshold]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchAlerts, 15000);
    return () => clearInterval(id);
  }, [autoRefresh, threshold]);

  const { critical, warning } = useMemo(() => {
    return {
      critical: items.filter((i) => i.severity === 'critical'),
      warning: items.filter((i) => i.severity !== 'critical'),
    };
  }, [items]);

  return (
    <div className="space-y-6">
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Alertas de SLA</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">Conversas em fila próximas ou acima do SLA</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Atualização automática
          </label>

          <button
            onClick={fetchAlerts}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCcw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl p-4 border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300 font-medium">
            <BellRing className="w-5 h-5" /> Críticas
          </div>
          <div className="mt-1 text-2xl font-bold text-red-800 dark:text-red-200">{critical.length}</div>
          <div className="text-xs text-red-700/80 dark:text-red-300/80">Acima do SLA</div>
        </div>
        <div className="rounded-xl p-4 border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-medium">
            <Clock className="w-5 h-5" /> Próximas do SLA
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-800 dark:text-amber-200">{warning.length}</div>
          <div className="text-xs text-amber-700/80 dark:text-amber-300/80">Acima de {formatNumber(threshold * 100, 0)}%</div>
        </div>
        <div className="rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Limiar de alerta</label>
          <input
            type="range"
            min={0.5}
            max={0.95}
            step={0.05}
            value={threshold}
            onChange={(e) => setThreshold(parseFloat(e.target.value))}
            className="w-full"
          />
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{Math.round(threshold * 100)}% do SLA</div>
        </div>
      </div>

      {/* Listas */}
      <Section title="Críticas" icon={<AlertTriangle className="w-4 h-4" />} emptyLabel="Sem conversas críticas" loading={isLoading}>
        <AlertsTable items={critical} />
      </Section>
      <Section title="Aproximando do SLA" icon={<Clock className="w-4 h-4" />} emptyLabel="Sem conversas próximas do SLA" loading={isLoading}>
        <AlertsTable items={warning} />
      </Section>
      {error && <div className="text-sm text-red-600">{error}</div>}
    </div>
  );
}

function Section({ title, icon, children, emptyLabel, loading }: { title: string; icon: React.ReactNode; children: React.ReactNode; emptyLabel: string; loading?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2 text-gray-900 dark:text-white font-semibold">
        {icon}
        {title}
      </div>
      <div className="p-4">
        {loading ? (
          <div className="text-sm text-gray-600 dark:text-gray-400">Carregando…</div>
        ) : (
          children
        )}
      </div>
      {!loading && (Array.isArray(children) ? (children as any[]).length === 0 : false) && (
        <div className="p-4 text-sm text-gray-600 dark:text-gray-400">{emptyLabel}</div>
      )}
    </div>
  );
}

function AlertsTable({ items }: { items: SlaAlert[] }) {
  if (!items?.length) return <div className="text-sm text-gray-600 dark:text-gray-400">Nada por aqui.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600 dark:text-gray-300">
            <th className="py-2 pr-4">Contato</th>
            <th className="py-2 pr-4">Fila</th>
            <th className="py-2 pr-4">SLA</th>
            <th className="py-2 pr-4">Espera</th>
            <th className="py-2 pr-4">Progresso</th>
            <th className="py-2 pr-4">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.conversation_id} className="border-t border-gray-100 dark:border-gray-700/60">
              <td className="py-2 pr-4">
                <div className="font-medium text-gray-900 dark:text-white">{it.contact_name || 'Sem nome'}</div>
                <div className="text-xs text-gray-500">{it.contact_phone || it.contact_id}</div>
              </td>
              <td className="py-2 pr-4">{it.queue_name}</td>
              <td className="py-2 pr-4">{it.sla_minutes ?? '—'} min</td>
              <td className="py-2 pr-4">{Math.round(it.waited_minutes)} min</td>
              <td className="py-2 pr-4">
                <div className="w-40 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`${it.severity === 'critical' ? 'bg-red-500' : 'bg-amber-500'} h-2`}
                    style={{ width: `${Math.min(100, Math.round((it.progress || 0) * 100))}%` }}
                  />
                </div>
              </td>
              <td className="py-2 pr-4">{it.priority}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
