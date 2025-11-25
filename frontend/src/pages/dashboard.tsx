import { useEffect, useState } from 'react'
import { Activity, MessageSquare, Users, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle } from 'lucide-react'
import { Button } from '@components/ui/button'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface KPICard {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  color: string
}

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

  const kpis: KPICard[] = [
    {
      title: 'Total de Conversas',
      value: summary?.total_conversations || 0,
      change: 12.5,
      icon: <MessageSquare className="w-8 h-8" />,
      color: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Total de Mensagens',
      value: summary?.total_messages || 0,
      change: 8.2,
      icon: <Activity className="w-8 h-8" />,
      color: 'from-purple-500 to-purple-600',
    },
    {
      title: 'Agentes Ativos',
      value: summary?.active_agents || 0,
      change: 5.1,
      icon: <Users className="w-8 h-8" />,
      color: 'from-green-500 to-green-600',
    },
    {
      title: 'Taxa de Crescimento',
      value: '23.5%',
      change: 3.2,
      icon: <TrendingUp className="w-8 h-8" />,
      color: 'from-orange-500 to-orange-600',
    },
  ]

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-800 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 animate-fade-in">
          <h1 className="section-title flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Dashboard
          </h1>
          <p className="section-subtitle">Bem-vindo! Aqui está um resumo da sua atividade</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {kpis.map((kpi, index) => (
            <div
              key={index}
              className="card-interactive group relative overflow-hidden"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 bg-gradient-to-br ${kpi.color} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>

              <div className="relative">
                {/* Icon */}
                <div className={`inline-flex p-3 bg-gradient-to-br ${kpi.color} rounded-lg mb-4 text-white`}>
                  {kpi.icon}
                </div>

                {/* Content */}
                <p className="text-sm text-muted-foreground mb-2">{kpi.title}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {kpi.change > 0 ? (
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <ArrowUpRight className="w-3 h-3" />
                          {kpi.change}% vs mês passado
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                          <ArrowDownRight className="w-3 h-3" />
                          {Math.abs(kpi.change)}% vs mês passado
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Activity Section */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-interactive skeleton h-64"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Conversations */}
            <div className="lg:col-span-2 card-interactive">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Conversas Recentes
              </h3>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 p-3 hover:bg-secondary/50 rounded-lg transition-colors">
                    <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      C{i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">Cliente #{i}</p>
                      <p className="text-sm text-muted-foreground truncate">Última mensagem há {i} minutos</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{5 - i} msgs</p>
                    </div>
                  </div>
                ))}
              </div>
              <Button className="btn-secondary w-full mt-6">Ver Todas as Conversas</Button>
            </div>

            {/* Quick Stats */}
            <div className="card-interactive">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-accent" />
                Estatísticas
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Taxa Resposta</span>
                  <span className="font-semibold">98.5%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full w-[98.5%]"></div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <span className="text-muted-foreground">Tempo Médio</span>
                  <span className="font-semibold">2.3min</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-gradient-to-r from-blue-500 to-cyan-600 h-2 rounded-full w-[65%]"></div>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <span className="text-muted-foreground">Satisfação</span>
                  <span className="font-semibold">4.8/5</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-gradient-to-r from-purple-500 to-pink-600 h-2 rounded-full w-[96%]"></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-12 p-8 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 rounded-2xl border border-primary/20">
          <h3 className="text-2xl font-bold mb-4">Comece a otimizar suas conversas</h3>
          <p className="text-muted-foreground mb-6">
            Configure automações, templates e muito mais para aumentar a eficiência da sua equipe.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button className="btn-primary">Criar Automação</Button>
            <Button className="btn-secondary">Explorar Templates</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
