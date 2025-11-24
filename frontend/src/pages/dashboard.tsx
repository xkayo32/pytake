import { useEffect, useState } from 'react'
import { Activity, Users, MessageSquare, TrendingUp, ArrowRight, AlertCircle } from 'lucide-react'
import { Button } from '@components/ui/button'
import { Badge } from '@components/ui/badge'
import { getApiUrl, getAuthHeaders } from '@lib/api'

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${getApiUrl()}/api/v1/dashboard/summary`, {
          headers: getAuthHeaders(),
        })
        if (!response.ok) throw new Error('Falha ao carregar dashboard')
        const data = await response.json()
        setSummary(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    }

    fetchSummary()
  }, [])

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-800 dark:text-red-400">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-4 md:p-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Dashboard
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Bem-vindo ao seu painel de controle. Acompanhe o desempenho em tempo real.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-32 bg-white dark:bg-slate-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : summary ? (
        <>
          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Mensagens Hoje</h3>
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {summary.messages_today || 0}
              </p>
              <p className="text-sm text-green-600 flex items-center gap-1">
                ↑ {summary.messages_today_growth || 0}% vs ontem
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Conversas Ativas</h3>
                <Users className="w-5 h-5 text-purple-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {summary.active_conversations || 0}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {summary.pending_responses || 0} aguardando resposta
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Campanhas</h3>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {summary.active_campaigns || 0}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {summary.scheduled_campaigns || 0} agendadas
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700 hover:shadow-md transition">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-700 dark:text-slate-300">Taxa Sucesso</h3>
                <Activity className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                {summary.success_rate || 0}%
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {summary.successful_messages || 0} bem-sucedidas
              </p>
            </div>
          </div>

          {/* Recent Activity & Quick Links */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Recent Activity */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Atividade Recente
              </h2>
              <div className="space-y-3">
                {summary.recent_activities?.map((activity: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {activity.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {activity.timestamp}
                      </p>
                    </div>
                    <Badge className={
                      activity.type === 'success'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : activity.type === 'warning'
                        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                    }>
                      {activity.type}
                    </Badge>
                  </div>
                )) || (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma atividade recente</p>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
                Atalhos Rápidos
              </h2>
              <div className="space-y-2">
                {[
                  { label: 'Nova Campanha', href: '/campaigns/create' },
                  { label: 'Novo Template', href: '/templates/create' },
                  { label: 'Ver Conversas', href: '/conversations' },
                  { label: 'Relatórios', href: '/reports' },
                  { label: 'Usuários', href: '/users' },
                  { label: 'Configurações', href: '/settings' },
                ].map((link, idx) => (
                  <a
                    key={idx}
                    href={link.href}
                    className="flex items-center justify-between p-2 text-slate-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition group"
                  >
                    <span className="text-sm">{link.label}</span>
                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition transform group-hover:translate-x-1" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Message Performance */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Status de Mensagens
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600 dark:text-slate-400">Entregues</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {summary.delivered_count || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500"
                    style={{ width: `${summary.delivered_pct || 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm mb-1 mt-3">
                  <span className="text-slate-600 dark:text-slate-400">Lidas</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {summary.read_count || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500"
                    style={{ width: `${summary.read_pct || 0}%` }}
                  />
                </div>

                <div className="flex justify-between text-sm mb-1 mt-3">
                  <span className="text-slate-600 dark:text-slate-400">Falhas</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {summary.failed_count || 0}
                  </span>
                </div>
                <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500"
                    style={{ width: `${summary.failed_pct || 0}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Top Campaigns */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Campanhas em Destaque
              </h3>
              <div className="space-y-2">
                {summary.top_campaigns?.map((campaign: any, idx: number) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
                  >
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {campaign.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {campaign.success_rate}% sucesso
                    </p>
                  </div>
                )) || (
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Nenhuma campanha</p>
                )}
              </div>
            </div>

            {/* System Health */}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
                Saúde do Sistema
              </h3>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">API</span>
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      Online
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Database</span>
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      Online
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">WebSocket</span>
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      Online
                    </Badge>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600 dark:text-slate-400">Cache</span>
                    <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300">
                      Online
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
