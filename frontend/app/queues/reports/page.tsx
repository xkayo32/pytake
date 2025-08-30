'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts'
import {
  Calendar,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Star,
  Phone,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Filter
} from 'lucide-react'

interface Queue {
  id: string
  name: string
  department: string
}

interface HistoryItem {
  id: string
  queue_name: string
  agent_name: string
  phone_number: string
  action: string
  wait_time_seconds: number
  handling_time_seconds: number
  rating: number
  feedback: string
  created_at: string
}

interface MetricsSummary {
  total_interactions: number
  avg_wait_time: number
  avg_handling_time: number
  completion_rate: number
  abandonment_rate: number
  avg_rating: number
  service_level: number
}

export default function QueueReportsPage() {
  const [queues, setQueues] = useState<Queue[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null)
  const [selectedQueue, setSelectedQueue] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchQueues()
    
    // Set default dates (last 7 days)
    const today = new Date()
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    
    setDateTo(today.toISOString().split('T')[0])
    setDateFrom(weekAgo.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (dateFrom && dateTo) {
      fetchHistory()
      calculateMetrics()
    }
  }, [selectedQueue, dateFrom, dateTo])

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/v1/queues')
      if (response.ok) {
        const data = await response.json()
        setQueues(data)
      }
    } catch (error) {
      console.error('Error fetching queues:', error)
    }
  }

  const fetchHistory = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedQueue) params.append('queue_id', selectedQueue)
      if (dateFrom) params.append('date_from', dateFrom)
      if (dateTo) params.append('date_to', dateTo)
      params.append('limit', '500')

      const response = await fetch(`/api/v1/queues/history?${params}`)
      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateMetrics = () => {
    if (history.length === 0) {
      setMetrics(null)
      return
    }

    const completedItems = history.filter(item => item.action === 'completed')
    const abandonedItems = history.filter(item => item.action === 'abandoned')
    const allItems = [...completedItems, ...abandonedItems]

    const totalWaitTime = allItems.reduce((sum, item) => sum + (item.wait_time_seconds || 0), 0)
    const totalHandlingTime = completedItems.reduce((sum, item) => sum + (item.handling_time_seconds || 0), 0)
    const ratingsWithValues = completedItems.filter(item => item.rating > 0)
    const totalRating = ratingsWithValues.reduce((sum, item) => sum + item.rating, 0)

    const summary: MetricsSummary = {
      total_interactions: allItems.length,
      avg_wait_time: allItems.length > 0 ? Math.round(totalWaitTime / allItems.length) : 0,
      avg_handling_time: completedItems.length > 0 ? Math.round(totalHandlingTime / completedItems.length) : 0,
      completion_rate: allItems.length > 0 ? (completedItems.length / allItems.length) * 100 : 0,
      abandonment_rate: allItems.length > 0 ? (abandonedItems.length / allItems.length) * 100 : 0,
      avg_rating: ratingsWithValues.length > 0 ? totalRating / ratingsWithValues.length : 0,
      service_level: allItems.length > 0 ? (allItems.filter(item => (item.wait_time_seconds || 0) <= 300).length / allItems.length) * 100 : 0
    }

    setMetrics(summary)
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    if (minutes === 0) return `${remainingSeconds}s`
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m`
  }

  const generateChartData = () => {
    if (!history.length) return []

    // Group by date
    const dailyData = history.reduce((acc, item) => {
      const date = new Date(item.created_at).toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = {
          date,
          completed: 0,
          abandoned: 0,
          total_wait_time: 0,
          total_handling_time: 0,
          count: 0
        }
      }
      
      if (item.action === 'completed') {
        acc[date].completed++
      } else if (item.action === 'abandoned') {
        acc[date].abandoned++
      }
      
      acc[date].total_wait_time += item.wait_time_seconds || 0
      acc[date].total_handling_time += item.handling_time_seconds || 0
      acc[date].count++
      
      return acc
    }, {} as any)

    return Object.values(dailyData).map((day: any) => ({
      ...day,
      avg_wait_time: day.count > 0 ? Math.round(day.total_wait_time / day.count) : 0,
      avg_handling_time: day.count > 0 ? Math.round(day.total_handling_time / day.count) : 0,
      completion_rate: (day.completed + day.abandoned) > 0 ? (day.completed / (day.completed + day.abandoned)) * 100 : 0
    }))
  }

  const getRatingDistribution = () => {
    if (!history.length) return []

    const ratings = history.filter(item => item.rating > 0)
    const distribution = Array.from({length: 5}, (_, i) => ({
      rating: i + 1,
      count: ratings.filter(item => item.rating === i + 1).length
    }))

    return distribution
  }

  const getQueueDistribution = () => {
    if (!history.length) return []

    const queueCounts = history.reduce((acc, item) => {
      const queueName = item.queue_name || 'Unknown'
      acc[queueName] = (acc[queueName] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(queueCounts).map(([name, value]) => ({
      name,
      value,
      percentage: (value / history.length) * 100
    }))
  }

  const chartData = generateChartData()
  const ratingData = getRatingDistribution()
  const queueData = getQueueDistribution()

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Relatórios de Filas</h1>
          <p className="text-muted-foreground">
            Análise detalhada de performance e métricas
          </p>
        </div>
        <Button className="flex items-center space-x-2">
          <Download className="h-4 w-4" />
          <span>Exportar PDF</span>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Fila</label>
              <Select value={selectedQueue} onValueChange={setSelectedQueue}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as filas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as filas</SelectItem>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={queue.id}>
                      {queue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data Inicial</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Data Final</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total de Interações</p>
                  <p className="text-2xl font-bold">{metrics.total_interactions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tempo Médio de Espera</p>
                  <p className="text-2xl font-bold">{formatTime(metrics.avg_wait_time)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold">{metrics.completion_rate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-2">
                <Star className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avaliação Média</p>
                  <p className="text-2xl font-bold">{metrics.avg_rating.toFixed(1)}/5</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Volume Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Volume Diário de Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="completed" stackId="1" stroke="#10b981" fill="#10b981" />
                <Area type="monotone" dataKey="abandoned" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Average Wait Time Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendência do Tempo de Espera</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [formatTime(Number(value)), 'Tempo Médio']} />
                <Line type="monotone" dataKey="avg_wait_time" stroke="#3b82f6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Avaliações</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ratingData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="rating" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Queue Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Fila</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={queueData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {queueData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Métricas de Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Nível de Serviço (≤5min)</span>
                <span className="text-sm font-bold">{metrics.service_level.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.service_level} className="w-full" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Taxa de Conclusão</span>
                <span className="text-sm font-bold">{metrics.completion_rate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.completion_rate} className="w-full" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Taxa de Abandono</span>
                <span className="text-sm font-bold text-red-600">{metrics.abandonment_rate.toFixed(1)}%</span>
              </div>
              <Progress value={metrics.abandonment_rate} className="w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumo de Tempos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-600">{formatTime(metrics.avg_wait_time)}</p>
                  <p className="text-sm text-muted-foreground">Tempo Médio de Espera</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-600">{formatTime(metrics.avg_handling_time)}</p>
                  <p className="text-sm text-muted-foreground">Tempo Médio de Atendimento</p>
                </div>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <Star className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-600">{metrics.avg_rating.toFixed(1)}/5.0</p>
                <p className="text-sm text-muted-foreground">Satisfação do Cliente</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {history.length === 0 && (
        <Card className="p-12 text-center">
          <BarChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dado encontrado</h3>
          <p className="text-muted-foreground">
            Não há dados disponíveis para o período e filtros selecionados
          </p>
        </Card>
      )}
    </div>
  )
}