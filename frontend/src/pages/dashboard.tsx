import { useEffect, useState } from 'react'
import { Activity, MessageSquare, Users, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle, Zap } from 'lucide-react'
import { Button } from '@components/ui/button'
import { getApiUrl, getAuthHeaders } from '@lib/api'

interface KPICard {
  title: string
  value: string | number
  change: number
  icon: React.ReactNode
  gradient: string
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
      icon: <MessageSquare className="w-6 h-6" />,
      gradient: 'from-primary-500 to-primary-600',
    },
    {
      title: 'Total de Mensagens',
      value: summary?.total_messages || 0,
      change: 8.2,
      icon: <Activity className="w-6 h-6" />,
      gradient: 'from-secondary-500 to-secondary-600',
    },
    {
      title: 'Agentes Ativos',
      value: summary?.active_agents || 0,
      change: 5.1,
      icon: <Users className="w-6 h-6" />,
      gradient: 'from-blue-500 to-blue-600',
    },
    {
      title: 'Taxa de Crescimento',
      value: '23.5%',
      change: 3.2,
      icon: <TrendingUp className="w-6 h-6" />,
      gradient: 'from-amber-500 to-orange-500',
    },
  ]

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-300">Erro ao carregar</h3>
              <p className="text-red-700 dark:text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Bem-vindo! Aqui está um resumo da sua atividade</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          {kpis.map((kpi, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-fade-in group"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Icon */}
              <div className={`inline-flex p-2.5 bg-gradient-to-br ${kpi.gradient} rounded-xl text-white shadow-sm mb-4`}>
                {kpi.icon}
              </div>

              {/* Content */}
              <p className="text-sm text-muted-foreground mb-1">{kpi.title}</p>
              <div className="flex items-end justify-between">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{kpi.value}</p>
                <div
                  className={`flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full ${
                    kpi.change > 0
                      ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                  }`}
                >
                  {kpi.change > 0 ? (
                    <ArrowUpRight className="w-3 h-3" />
                  ) : (
                    <ArrowDownRight className="w-3 h-3" />
                  )}
                  {Math.abs(kpi.change)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 h-64 skeleton"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Conversations */}
            <div className="lg:col-span-2 bg-card border border-border rounded-xl p-6 animate-fade-in">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary-500" />
                Conversas Recentes
              </h3>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-3 hover:bg-muted/50 rounded-xl transition-colors cursor-pointer group"
                  >
                    <div className="w-10 h-10 bg-gradient-whatsapp rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                      C{i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate group-hover:text-primary-600 transition-colors">
                        Cliente #{i}
                      </p>
                      <p className="text-sm text-muted-foreground truncate">Última mensagem há {i} minutos</p>
                    </div>
                    <div className="text-right">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-primary-500 text-white text-xs font-bold rounded-full">
                        {5 - i}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="secondary" className="w-full mt-6">
                Ver Todas as Conversas
              </Button>
            </div>

            {/* Quick Stats */}
            <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
              <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-secondary-500" />
                Estatísticas
              </h3>
              <div className="space-y-6">
                {/* Response Rate */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Taxa Resposta</span>
                    <span className="text-sm font-semibold text-foreground">98.5%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                      style={{ width: '98.5%' }}
                    />
                  </div>
                </div>

                {/* Average Time */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Tempo Médio</span>
                    <span className="text-sm font-semibold text-foreground">2.3min</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-secondary-500 to-secondary-400 rounded-full transition-all duration-500"
                      style={{ width: '65%' }}
                    />
                  </div>
                </div>

                {/* Satisfaction */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Satisfação</span>
                    <span className="text-sm font-semibold text-foreground">4.8/5</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full transition-all duration-500"
                      style={{ width: '96%' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CTA Section */}
        <div className="mt-8 p-6 md:p-8 bg-gradient-to-br from-primary-500/10 via-secondary-500/10 to-primary-500/5 rounded-2xl border border-primary/20 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md flex-shrink-0">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground mb-1">Comece a otimizar suas conversas</h3>
                <p className="text-muted-foreground text-sm">
                  Configure automações, templates e muito mais para aumentar a eficiência.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button>Criar Automação</Button>
              <Button variant="secondary">Explorar Templates</Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
