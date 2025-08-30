'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { ChartContainer } from './chart-container'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface AgentPerformanceData {
  id: string
  name: string
  avatar?: string
  status: 'online' | 'busy' | 'away' | 'break' | 'offline'
  todayConversations: number
  avgResponseTime: number
  satisfaction: number
  activeConversations: number
  efficiency: number
  slaCompliance: number
}

interface AgentPerformanceChartProps {
  data: AgentPerformanceData[]
  isLoading?: boolean
  error?: string | null
  onRefresh?: () => void
  onExport?: () => void
  className?: string
  metric?: 'conversations' | 'satisfaction' | 'responseTime' | 'efficiency'
}

export function AgentPerformanceChart({
  data,
  isLoading = false,
  error = null,
  onRefresh,
  onExport,
  className,
  metric = 'conversations'
}: AgentPerformanceChartProps) {
  const getMetricConfig = () => {
    switch (metric) {
      case 'conversations':
        return {
          title: 'Conversas por Agente',
          dataKey: 'todayConversations',
          color: 'hsl(var(--chart-1))',
          unit: '',
          formatter: (value: number) => `${value} conversas`
        }
      case 'satisfaction':
        return {
          title: 'Satisfação por Agente',
          dataKey: 'satisfaction',
          color: 'hsl(var(--chart-2))',
          unit: '⭐',
          formatter: (value: number) => `${value.toFixed(1)} ⭐`
        }
      case 'responseTime':
        return {
          title: 'Tempo de Resposta por Agente',
          dataKey: 'avgResponseTime',
          color: 'hsl(var(--chart-3))',
          unit: 's',
          formatter: (value: number) => `${value}s`
        }
      case 'efficiency':
        return {
          title: 'Eficiência por Agente',
          dataKey: 'efficiency',
          color: 'hsl(var(--chart-4))',
          unit: '%',
          formatter: (value: number) => `${value.toFixed(1)}%`
        }
      default:
        return {
          title: 'Performance dos Agentes',
          dataKey: 'todayConversations',
          color: 'hsl(var(--primary))',
          unit: '',
          formatter: (value: number) => `${value}`
        }
    }
  }

  const metricConfig = getMetricConfig()
  
  // Format data for chart
  const chartData = data.map(agent => ({
    ...agent,
    name: agent.name.split(' ')[0] // Show only first name for space
  }))

  const getStatusColor = (status: string) => {
    const colors = {
      online: 'hsl(var(--chart-2))',
      busy: 'hsl(var(--chart-3))',
      away: 'hsl(var(--chart-4))',
      break: 'hsl(var(--chart-5))',
      offline: 'hsl(var(--muted-foreground))'
    }
    return colors[status as keyof typeof colors] || colors.offline
  }

  return (
    <ChartContainer
      title={metricConfig.title}
      description="Performance individual dos agentes hoje"
      isLoading={isLoading}
      error={error}
      onRefresh={onRefresh}
      onExport={onExport}
      className={className}
      height={380}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart 
          data={chartData} 
          margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          
          <XAxis 
            dataKey="name"
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            angle={-45}
            textAnchor="end"
            height={80}
          />
          
          <YAxis 
            className="text-xs fill-muted-foreground"
            tick={{ fontSize: 12 }}
            label={{ 
              value: metricConfig.unit || 'Quantidade', 
              angle: -90, 
              position: 'insideLeft' 
            }}
          />
          
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '6px'
            }}
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const agent = data.find(a => a.name.split(' ')[0] === label)
                return (
                  <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={agent?.avatar} />
                        <AvatarFallback className="text-xs">
                          {agent?.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{agent?.name}</span>
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ 
                          backgroundColor: agent ? getStatusColor(agent.status) + '20' : undefined,
                          color: agent ? getStatusColor(agent.status) : undefined 
                        }}
                      >
                        {agent?.status}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <p>{metricConfig.formatter(payload[0].value as number)}</p>
                      <div className="text-xs text-muted-foreground space-y-0.5">
                        <p>Conversas ativas: {agent?.activeConversations}</p>
                        <p>SLA: {agent?.slaCompliance.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                )
              }
              return null
            }}
          />

          <Bar
            dataKey={metricConfig.dataKey}
            fill={metricConfig.color}
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}