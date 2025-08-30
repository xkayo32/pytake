'use client'

import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChartContainer } from './chart-container'

interface SatisfactionTrendData {
  date: string
  satisfaction: number
  responses: number
}

interface SatisfactionTrendsChartProps {
  data: SatisfactionTrendData[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onExport?: () => void
  className?: string
}

export function SatisfactionTrendsChart({
  data,
  isLoading = false,
  error = null,
  onRefresh,
  onExport,
  className
}: SatisfactionTrendsChartProps) {
  const avgSatisfaction = data.reduce((sum, d) => sum + d.satisfaction, 0) / (data.length || 1)
  const totalResponses = data.reduce((sum, d) => sum + d.responses, 0)

  // Format data for chart
  const chartData = data.map(item => ({
    ...item,
    date: format(parseISO(item.date), 'dd/MM', { locale: ptBR }),
    satisfaction: Number(item.satisfaction.toFixed(1))
  }))

  return (
    <ChartContainer
      title="Evolução da Satisfação"
      description="Satisfação média e volume de avaliações"
      badge={`${avgSatisfaction.toFixed(1)} ⭐`}
      badgeVariant={avgSatisfaction >= 4.5 ? 'default' : avgSatisfaction >= 4.0 ? 'secondary' : 'destructive'}
      isLoading={isLoading}
      error={error}
      onRefresh={onRefresh}
      onExport={onExport}
      className={className}
      height={340}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          
          <XAxis 
            dataKey="date" 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          
          <YAxis 
            yAxisId="satisfaction"
            domain={[0, 5]}
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            label={{ value: 'Satisfação (★)', angle: -90, position: 'insideLeft' }}
          />
          
          <YAxis 
            yAxisId="responses"
            orientation="right"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            label={{ value: 'Avaliações', angle: 90, position: 'insideRight' }}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
            formatter={(value: number, name: string) => {
              if (name === 'satisfaction') {
                return [`${value} ⭐`, 'Satisfação Média']
              }
              return [`${value}`, 'Avaliações']
            }}
            labelFormatter={(label) => `Data: ${label}`}
          />
          
          <Legend 
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => {
              return value === 'satisfaction' ? 'Satisfação Média' : 'Avaliações'
            }}
          />

          {/* Bars for response count */}
          <Bar
            yAxisId="responses"
            dataKey="responses"
            fill="hsl(var(--muted))"
            radius={[2, 2, 0, 0]}
            opacity={0.6}
          />
          
          {/* Line for satisfaction */}
          <Line
            yAxisId="satisfaction"
            type="monotone"
            dataKey="satisfaction"
            stroke="hsl(var(--chart-2))"
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--chart-2))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--chart-2))', strokeWidth: 2 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}