import { useState } from 'react'
import { BarChart3, TrendingUp, Calendar, Download, Filter } from 'lucide-react'
import { Button } from '@components/ui/button'

interface ReportMetric {
  label: string
  value: string
  change: number
  isPositive: boolean
}

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('30')
  const [selectedReport, setSelectedReport] = useState('overview')

  const metrics: ReportMetric[] = [
    { label: 'Total de Conversas', value: '2,456', change: 12.5, isPositive: true },
    { label: 'Mensagens Enviadas', value: '18,934', change: 8.2, isPositive: true },
    { label: 'Taxa de Resposta', value: '73.2%', change: -2.1, isPositive: false },
    { label: 'Tempo Médio Resposta', value: '4m 32s', change: -15.3, isPositive: true },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="section-title flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-primary" />
            Relatórios
          </h1>
          <p className="section-subtitle">Analise dados detalhados de suas campanhas</p>
        </div>

        {/* Controls */}
        <div className="card-interactive mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium">
                Visão Geral
              </button>
              <button className="px-4 py-2 bg-secondary/20 text-foreground rounded-lg text-sm font-medium hover:bg-secondary/30">
                Conversas
              </button>
              <button className="px-4 py-2 bg-secondary/20 text-foreground rounded-lg text-sm font-medium hover:bg-secondary/30">
                Agentes
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary text-sm"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
              </select>
              <Button className="btn-secondary gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, idx) => (
            <div key={idx} className="card-interactive">
              <p className="text-sm text-muted-foreground uppercase font-medium">{metric.label}</p>
              <div className="flex items-end gap-3 mt-4">
                <p className="text-3xl font-bold">{metric.value}</p>
                <div className={`flex items-center gap-1 text-sm font-medium ${metric.isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <TrendingUp className={`w-4 h-4 ${!metric.isPositive ? 'rotate-180' : ''}`} />
                  {Math.abs(metric.change)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Chart 1 */}
          <div className="card-interactive">
            <h3 className="font-semibold mb-6">Conversas por Dia</h3>
            <div className="space-y-4">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => (
                <div key={day} className="flex items-center gap-3">
                  <p className="w-8 text-sm text-muted-foreground">{day}</p>
                  <div className="flex-1 bg-secondary/20 rounded-full overflow-hidden">
                    <div
                      className="h-8 bg-gradient-to-r from-primary to-secondary rounded-full"
                      style={{ width: `${Math.random() * 100}%` }}
                    />
                  </div>
                  <p className="w-12 text-right text-sm font-medium">{Math.floor(Math.random() * 500)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2 */}
          <div className="card-interactive">
            <h3 className="font-semibold mb-6">Status de Mensagens</h3>
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-r from-green-400 to-green-600 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">78%</p>
                    <p className="text-xs text-green-100">Entregues</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-green-500"></div>
                  <span className="text-sm">Entregues: 15.2k</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-yellow-500"></div>
                  <span className="text-sm">Pendentes: 2.8k</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded bg-red-500"></div>
                  <span className="text-sm">Falhas: 1.2k</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card-interactive">
          <h3 className="font-semibold mb-6">Campanhas Recentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium">Campanha</th>
                  <th className="text-left py-3 px-4 font-medium">Data</th>
                  <th className="text-left py-3 px-4 font-medium">Destinatários</th>
                  <th className="text-left py-3 px-4 font-medium">Enviadas</th>
                  <th className="text-left py-3 px-4 font-medium">Taxa</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Promoção Verão', date: '12/12/2024', recipients: 1234, sent: 1156, rate: '93.7%', status: 'Concluída' },
                  { name: 'Newsletter Jan', date: '08/12/2024', recipients: 2456, sent: 2134, rate: '86.9%', status: 'Concluída' },
                  { name: 'Black Friday', date: '02/12/2024', recipients: 3456, sent: 3234, rate: '93.6%', status: 'Concluída' },
                ].map((campaign, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="py-3 px-4">{campaign.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{campaign.date}</td>
                    <td className="py-3 px-4">{campaign.recipients.toLocaleString()}</td>
                    <td className="py-3 px-4">{campaign.sent.toLocaleString()}</td>
                    <td className="py-3 px-4 font-medium text-green-600 dark:text-green-400">{campaign.rate}</td>
                    <td className="py-3 px-4">
                      <span className="badge-success">{campaign.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
