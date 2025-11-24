import { useEffect, useState } from 'react'
import { BarChart3, TrendingUp, Users, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export default function Reports() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [period, setPeriod] = useState('7d')

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `${getApiUrl()}/api/v1/reports/overview?period=${period}`,
          { headers: getAuthHeaders() }
        )
        if (!response.ok) throw new Error('Falha ao carregar relatórios')
        const data = await response.json()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar relatórios')
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [period])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2">
          Relatórios & Analytics
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Acompanhe o desempenho das suas campanhas e conversas
        </p>
      </div>

      {/* Period Filter */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {['24h', '7d', '30d', '90d'].map(p => (
          <Button
            key={p}
            variant={period === p ? 'default' : 'outline'}
            onClick={() => setPeriod(p)}
            className={period === p ? 'bg-blue-600 text-white' : ''}
            disabled={loading}
          >
            {p === '24h' ? 'Hoje' : p === '7d' ? 'Semana' : p === '30d' ? 'Mês' : '3 Meses'}
          </Button>
        ))}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : stats ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Mensagens</h3>
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {stats.total_messages || 0}
              </p>
              {stats.message_trend && (
                <p className={`text-sm ${stats.message_trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {stats.message_trend > 0 ? '↑' : '↓'} {Math.abs(stats.message_trend)}% vs período anterior
                </p>
              )}
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Campanhas</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {stats.total_campaigns || 0}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.active_campaigns || 0} ativas
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Contatos</h3>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {stats.total_contacts || 0}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.active_contacts || 0} ativos
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Taxa Sucesso</h3>
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {stats.success_rate || 0}%
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {stats.messages_sent || 0} enviadas
              </p>
            </div>
          </div>

          {/* Campaigns Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Campaigns */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Campanhas Destaque
              </h2>
              <div className="space-y-3">
                {stats.top_campaigns?.map((campaign: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {campaign.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {campaign.recipients} destinatários
                      </p>
                    </div>
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      {campaign.success_rate}%
                    </Badge>
                  </div>
                )) || (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Sem campanhas neste período</p>
                )}
              </div>
            </div>

            {/* Message Status Breakdown */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Status das Mensagens
              </h2>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Entregues</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.delivered_count || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500" style={{ width: `${stats.delivered_pct || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Lidas</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.read_count || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${stats.read_pct || 0}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Falhas</span>
                    <span className="text-sm font-semibold text-slate-900 dark:text-white">
                      {stats.failed_count || 0}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500" style={{ width: `${stats.failed_pct || 0}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Conversations Metrics */}
          <div className="mt-6 bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Métricas de Conversas
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.avg_response_time || '0'}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Tempo Médio Resposta
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.open_conversations || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Conversas Abertas
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.resolved_conversations || 0}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Resolvidas
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-slate-900 dark:text-white">
                  {stats.satisfaction_rate || '0'}%
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Satisfação
                </p>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
