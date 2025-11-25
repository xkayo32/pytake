import { useState } from 'react'
import { BarChart3, TrendingUp, Download, ArrowUpRight, ArrowDownRight } from 'lucide-react'
import { Button } from '@components/ui/button'

interface ReportMetric {
  label: string
  value: string
  change: number
  isPositive: boolean
}

export default function Reports() {
  const [selectedPeriod, setSelectedPeriod] = useState('30')

  const metrics: ReportMetric[] = [
    { label: 'Total de Conversas', value: '2,456', change: 12.5, isPositive: true },
    { label: 'Mensagens Enviadas', value: '18,934', change: 8.2, isPositive: true },
    { label: 'Taxa de Resposta', value: '73.2%', change: -2.1, isPositive: false },
    { label: 'Tempo Médio Resposta', value: '4m 32s', change: -15.3, isPositive: true },
  ]

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-whatsapp rounded-xl flex items-center justify-center shadow-md">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Relatórios</h1>
          </div>
          <p className="text-muted-foreground ml-[52px]">Analise dados detalhados de suas campanhas</p>
        </div>

        {/* Controls */}
        <div className="bg-card border border-border rounded-xl p-4 mb-8 animate-fade-in">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {['Visão Geral', 'Conversas', 'Agentes'].map((tab, i) => (
                <button
                  key={tab}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    i === 0 ? 'bg-primary-500 text-white' : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="h-10 px-3 border border-border rounded-xl bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition-all"
              >
                <option value="7">Últimos 7 dias</option>
                <option value="30">Últimos 30 dias</option>
                <option value="90">Últimos 90 dias</option>
                <option value="365">Último ano</option>
              </select>
              <Button variant="secondary" className="gap-2">
                <Download className="w-4 h-4" />
                Exportar
              </Button>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {metrics.map((metric, idx) => (
            <div 
              key={idx} 
              className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-primary/20 transition-all duration-200 animate-fade-in"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <p className="text-sm text-muted-foreground uppercase font-medium">{metric.label}</p>
              <div className="flex items-end gap-3 mt-3">
                <p className="text-2xl md:text-3xl font-bold text-foreground">{metric.value}</p>
                <div className={`flex items-center gap-0.5 text-xs font-medium px-2 py-1 rounded-full ${
                  metric.isPositive 
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' 
                    : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {metric.change > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {Math.abs(metric.change)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Chart 1 */}
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
            <h3 className="font-semibold mb-6 text-foreground">Conversas por Dia</h3>
            <div className="space-y-4">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map((day, idx) => (
                <div key={day} className="flex items-center gap-3">
                  <p className="w-8 text-sm text-muted-foreground">{day}</p>
                  <div className="flex-1 h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500"
                      style={{ width: `${20 + idx * 10 + Math.random() * 20}%` }}
                    />
                  </div>
                  <p className="w-12 text-right text-sm font-medium text-foreground">{Math.floor(100 + idx * 50 + Math.random() * 100)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Chart 2 */}
          <div className="bg-card border border-border rounded-xl p-6 animate-fade-in">
            <h3 className="font-semibold mb-6 text-foreground">Status de Mensagens</h3>
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-whatsapp flex items-center justify-center shadow-lg">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">78%</p>
                    <p className="text-xs text-white/80">Entregues</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { color: 'bg-primary-500', label: 'Entregues', value: '15.2k' },
                  { color: 'bg-amber-500', label: 'Pendentes', value: '2.8k' },
                  { color: 'bg-red-500', label: 'Falhas', value: '1.2k' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded ${item.color}`}></div>
                    <span className="text-sm text-foreground">{item.label}: {item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card border border-border rounded-xl overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-border">
            <h3 className="font-semibold text-foreground">Campanhas Recentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="text-left py-4 px-6 font-medium text-muted-foreground">Campanha</th>
                  <th className="text-left py-4 px-6 font-medium text-muted-foreground hidden sm:table-cell">Data</th>
                  <th className="text-left py-4 px-6 font-medium text-muted-foreground hidden md:table-cell">Destinatários</th>
                  <th className="text-left py-4 px-6 font-medium text-muted-foreground">Enviadas</th>
                  <th className="text-left py-4 px-6 font-medium text-muted-foreground">Taxa</th>
                  <th className="text-left py-4 px-6 font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Promoção Verão', date: '12/12/2024', recipients: 1234, sent: 1156, rate: '93.7%', status: 'Concluída' },
                  { name: 'Newsletter Jan', date: '08/12/2024', recipients: 2456, sent: 2134, rate: '86.9%', status: 'Concluída' },
                  { name: 'Black Friday', date: '02/12/2024', recipients: 3456, sent: 3234, rate: '93.6%', status: 'Concluída' },
                ].map((campaign, idx) => (
                  <tr key={idx} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-6 font-medium text-foreground">{campaign.name}</td>
                    <td className="py-4 px-6 text-muted-foreground hidden sm:table-cell">{campaign.date}</td>
                    <td className="py-4 px-6 text-foreground hidden md:table-cell">{campaign.recipients.toLocaleString()}</td>
                    <td className="py-4 px-6 text-foreground">{campaign.sent.toLocaleString()}</td>
                    <td className="py-4 px-6 font-medium text-primary-600 dark:text-primary-400">{campaign.rate}</td>
                    <td className="py-4 px-6">
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
