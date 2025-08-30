'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { ChartContainer } from './chart-container'

interface ResponseTimeData {
  hour: string
  avgResponseTime: number
  slaTarget: number
}

interface ResponseTimeChartProps {
  data: ResponseTimeData[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onExport?: () => void
  className?: string
}

export function ResponseTimeChart({
  data,
  isLoading = false,
  error = null,
  onRefresh,
  onExport,
  className
}: ResponseTimeChartProps) {
  const slaBreaches = data.filter(d => d.avgResponseTime > d.slaTarget).length
  const slaCompliance = data.length > 0 ? ((data.length - slaBreaches) / data.length * 100) : 0

  return (
    <ChartContainer
      title="Tempo de Resposta por Hora"
      description="Tempo médio de resposta ao longo do dia"
      badge={`SLA: ${slaCompliance.toFixed(1)}%`}
      badgeVariant={slaCompliance >= 90 ? 'default' : slaCompliance >= 80 ? 'secondary' : 'destructive'}
      isLoading={isLoading}
      error={error}
      onRefresh={onRefresh}
      onExport={onExport}
      className={className}
      height={320}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis 
            dataKey="hour" 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            label={{ value: 'Segundos', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}s`,
              name === 'avgResponseTime' ? 'Tempo Médio' : 'Meta SLA'
            ]}
            labelFormatter={(label) => `Hora: ${label}`}
          />
          
          {/* SLA Target Line */}
          <ReferenceLine 
            y={data[0]?.slaTarget || 90} 
            stroke="hsl(var(--destructive))" 
            strokeDasharray="5 5"
            strokeWidth={2}
          />
          
          {/* Average Response Time */}
          <Line
            type="monotone"
            dataKey="avgResponseTime"
            stroke="hsl(var(--primary))"
            strokeWidth={3}
            dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: 'hsl(var(--primary))', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}