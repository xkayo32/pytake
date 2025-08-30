'use client'

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChartContainer } from './chart-container'

interface ConversationTrendData {
  date: string
  conversations: number
  resolved: number
  transferred: number
  abandoned: number
}

interface ConversationTrendsChartProps {
  data: ConversationTrendData[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onExport?: () => void
  className?: string
}

export function ConversationTrendsChart({
  data,
  isLoading = false,
  error = null,
  onRefresh,
  onExport,
  className
}: ConversationTrendsChartProps) {
  const totalConversations = data.reduce((sum, d) => sum + d.conversations, 0)
  const totalResolved = data.reduce((sum, d) => sum + d.resolved, 0)
  const resolutionRate = totalConversations > 0 ? (totalResolved / totalConversations * 100) : 0

  // Format data for chart
  const chartData = data.map(item => ({
    ...item,
    date: format(parseISO(item.date), 'dd/MM', { locale: ptBR })
  }))

  return (
    <ChartContainer
      title="Tendência de Conversas"
      description="Evolução das conversas ao longo dos últimos 7 dias"
      badge={`${resolutionRate.toFixed(1)}% resolvidas`}
      badgeVariant={resolutionRate >= 90 ? 'default' : 'secondary'}
      isLoading={isLoading}
      error={error}
      onRefresh={onRefresh}
      onExport={onExport}
      className={className}
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <defs>
            <linearGradient id="conversationsGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="resolvedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="transferredGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="abandonedGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3} />
              <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
            </linearGradient>
          </defs>
          
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          
          <XAxis 
            dataKey="date" 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            label={{ value: 'Quantidade', angle: -90, position: 'insideLeft' }}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
            formatter={(value: number, name: string) => {
              const labels = {
                conversations: 'Total',
                resolved: 'Resolvidas',
                transferred: 'Transferidas',
                abandoned: 'Abandonadas'
              }
              return [value, labels[name as keyof typeof labels] || name]
            }}
            labelFormatter={(label) => `Data: ${label}`}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              const labels = {
                conversations: 'Total',
                resolved: 'Resolvidas',
                transferred: 'Transferidas',
                abandoned: 'Abandonadas'
              }
              return labels[value as keyof typeof labels] || value
            }}
          />

          <Area
            type="monotone"
            dataKey="conversations"
            stackId="1"
            stroke="hsl(var(--primary))"
            fill="url(#conversationsGradient)"
            strokeWidth={2}
          />
          
          <Area
            type="monotone"
            dataKey="resolved"
            stackId="2"
            stroke="hsl(var(--chart-2))"
            fill="url(#resolvedGradient)"
            strokeWidth={2}
          />
          
          <Area
            type="monotone"
            dataKey="transferred"
            stackId="3"
            stroke="hsl(var(--chart-3))"
            fill="url(#transferredGradient)"
            strokeWidth={2}
          />
          
          <Area
            type="monotone"
            dataKey="abandoned"
            stackId="4"
            stroke="hsl(var(--destructive))"
            fill="url(#abandonedGradient)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}