'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MessageSquare, 
  Send,
  Calendar,
  Clock,
  Target,
  DollarSign,
  Activity,
  Eye,
  Download,
  Filter,
  ChevronDown
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AppLayout } from '@/components/layout/app-layout'
import { useAuth } from '@/lib/hooks/useAuth'

// Mock data for charts
const conversationData = [
  { date: '01/01', total: 120, newConversations: 45, replied: 98 },
  { date: '02/01', total: 135, newConversations: 52, replied: 110 },
  { date: '03/01', total: 98, newConversations: 38, replied: 85 },
  { date: '04/01', total: 145, newConversations: 61, replied: 120 },
  { date: '05/01', total: 178, newConversations: 73, replied: 145 },
  { date: '06/01', total: 156, newConversations: 67, replied: 132 },
  { date: '07/01', total: 189, newConversations: 82, replied: 156 },
  { date: '08/01', total: 210, newConversations: 95, replied: 178 },
  { date: '09/01', total: 198, newConversations: 89, replied: 165 },
  { date: '10/01', total: 225, newConversations: 102, replied: 189 },
  { date: '11/01', total: 242, newConversations: 112, replied: 201 },
  { date: '12/01', total: 256, newConversations: 118, replied: 212 },
  { date: '13/01', total: 234, newConversations: 105, replied: 198 },
  { date: '14/01', total: 267, newConversations: 123, replied: 223 },
  { date: '15/01', total: 289, newConversations: 134, replied: 245 }
]

const messageData = [
  { hour: '00h', sent: 12, received: 8 },
  { hour: '06h', sent: 45, received: 38 },
  { hour: '08h', sent: 89, received: 76 },
  { hour: '10h', sent: 156, received: 142 },
  { hour: '12h', sent: 189, received: 167 },
  { hour: '14h', sent: 234, received: 212 },
  { hour: '16h', sent: 267, received: 245 },
  { hour: '18h', sent: 198, received: 178 },
  { hour: '20h', sent: 145, received: 123 },
  { hour: '22h', sent: 67, received: 56 }
]

const campaignPerformance = [
  { name: 'Black Friday', sent: 1250, delivered: 1230, read: 1180, replied: 450 },
  { name: 'Boas-vindas', sent: 823, delivered: 810, read: 780, replied: 234 },
  { name: 'Lembrete Pagamento', sent: 2450, delivered: 2400, read: 2100, replied: 450 },
  { name: 'Pesquisa NPS', sent: 89, delivered: 87, read: 82, replied: 45 },
  { name: 'Reativação', sent: 67, delivered: 65, read: 58, replied: 12 }
]

const responseTimeData = [
  { range: '< 1min', count: 234 },
  { range: '1-5min', count: 456 },
  { range: '5-15min', count: 312 },
  { range: '15-30min', count: 189 },
  { range: '30-60min', count: 123 },
  { range: '> 60min', count: 89 }
]

const tagDistribution = [
  { name: 'Cliente', value: 45, color: '#10B981' },
  { name: 'Lead', value: 30, color: '#3B82F6' },
  { name: 'Parceiro', value: 15, color: '#8B5CF6' },
  { name: 'Fornecedor', value: 8, color: '#EC4899' },
  { name: 'Outros', value: 2, color: '#6B7280' }
]

const flowSuccess = [
  { name: 'Boas-vindas', successRate: 92, executions: 145 },
  { name: 'Suporte Técnico', successRate: 87, executions: 89 },
  { name: 'Agendamento', successRate: 78, executions: 56 },
  { name: 'Cobrança', successRate: 65, executions: 234 },
  { name: 'Feedback', successRate: 95, executions: 67 }
]

export default function AnalyticsPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const [period, setPeriod] = useState('7days')
  const [metric, setMetric] = useState('conversations')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  const stats = {
    totalConversations: 2456,
    conversationsChange: 12.5,
    totalMessages: 18943,
    messagesChange: 8.3,
    avgResponseTime: '2min 34s',
    responseTimeChange: -15.2,
    conversionRate: 34.7,
    conversionChange: 5.8
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container flex h-16 items-center justify-between px-4">
            <div>
              <h1 className="text-2xl font-bold">Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe o desempenho do seu WhatsApp Business
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-[180px]">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="yesterday">Ontem</SelectItem>
                  <SelectItem value="7days">Últimos 7 dias</SelectItem>
                  <SelectItem value="30days">Últimos 30 dias</SelectItem>
                  <SelectItem value="90days">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalConversations.toLocaleString()}</div>
                <div className="flex items-center text-xs">
                  {stats.conversationsChange > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-green-600">+{stats.conversationsChange}%</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600 mr-1" />
                      <span className="text-red-600">{stats.conversationsChange}%</span>
                    </>
                  )}
                  <span className="text-muted-foreground ml-1">vs período anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMessages.toLocaleString()}</div>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+{stats.messagesChange}%</span>
                  <span className="text-muted-foreground ml-1">vs período anterior</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.avgResponseTime}</div>
                <div className="flex items-center text-xs">
                  <TrendingDown className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">{Math.abs(stats.responseTimeChange)}%</span>
                  <span className="text-muted-foreground ml-1">mais rápido</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.conversionRate}%</div>
                <div className="flex items-center text-xs">
                  <TrendingUp className="h-3 w-3 text-green-600 mr-1" />
                  <span className="text-green-600">+{stats.conversionChange}%</span>
                  <span className="text-muted-foreground ml-1">vs período anterior</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Conversations Over Time */}
            <Card>
              <CardHeader>
                <CardTitle>Evolução de Conversas</CardTitle>
                <CardDescription>
                  Total de conversas, novas e respondidas por dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={conversationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      stroke="#25D366" 
                      strokeWidth={2}
                      name="Total"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="newConversations" 
                      stroke="#3B82F6" 
                      strokeWidth={2}
                      name="Novas"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="replied" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      name="Respondidas"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Messages by Hour */}
            <Card>
              <CardHeader>
                <CardTitle>Mensagens por Horário</CardTitle>
                <CardDescription>
                  Distribuição de mensagens enviadas e recebidas ao longo do dia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={messageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="sent" 
                      stackId="1"
                      stroke="#10B981" 
                      fill="#10B981"
                      fillOpacity={0.6}
                      name="Enviadas"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="received" 
                      stackId="1"
                      stroke="#F59E0B" 
                      fill="#F59E0B"
                      fillOpacity={0.6}
                      name="Recebidas"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Campaign Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Performance de Campanhas</CardTitle>
                <CardDescription>
                  Métricas de entrega e engajamento por campanha
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={campaignPerformance} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={100} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill="#6B7280" name="Enviadas" />
                    <Bar dataKey="delivered" fill="#10B981" name="Entregues" />
                    <Bar dataKey="read" fill="#3B82F6" name="Lidas" />
                    <Bar dataKey="replied" fill="#8B5CF6" name="Respondidas" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Response Time Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Tempo de Resposta</CardTitle>
                <CardDescription>
                  Distribuição do tempo de resposta às mensagens
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#25D366" radius={[8, 8, 0, 0]}>
                      {responseTimeData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? '#10B981' : index === 1 ? '#3B82F6' : '#F59E0B'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Contact Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Contatos</CardTitle>
                <CardDescription>
                  Segmentação da base de contatos por categoria
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={tagDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {tagDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Flow Success Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Taxa de Sucesso dos Flows</CardTitle>
                <CardDescription>
                  Performance dos flows de automação
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={flowSuccess}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8884d8" />
                    <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" />
                    <Tooltip />
                    <Legend />
                    <Bar 
                      yAxisId="left" 
                      dataKey="successRate" 
                      fill="#10B981" 
                      name="Taxa de Sucesso (%)"
                    />
                    <Bar 
                      yAxisId="right" 
                      dataKey="executions" 
                      fill="#3B82F6" 
                      name="Execuções"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Templates */}
            <Card>
              <CardHeader>
                <CardTitle>Templates Mais Eficazes</CardTitle>
                <CardDescription>
                  Templates com melhor taxa de resposta
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'Boas-vindas', sent: 823, responseRate: 28.4 },
                    { name: 'Confirmação Pedido', sent: 567, responseRate: 45.2 },
                    { name: 'Lembrete Pagamento', sent: 2450, responseRate: 18.4 },
                    { name: 'Pesquisa Satisfação', sent: 89, responseRate: 50.6 },
                    { name: 'Oferta Promocional', sent: 234, responseRate: 35.8 }
                  ].map((template, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{template.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {template.sent} enviadas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{template.responseRate}%</p>
                        <p className="text-sm text-muted-foreground">resposta</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Active Users */}
            <Card>
              <CardHeader>
                <CardTitle>Usuários Mais Ativos</CardTitle>
                <CardDescription>
                  Contatos com maior volume de interações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { name: 'João Silva', messages: 342, lastSeen: '2 min atrás' },
                    { name: 'Maria Santos', messages: 256, lastSeen: '15 min atrás' },
                    { name: 'Carlos Lima', messages: 198, lastSeen: '1h atrás' },
                    { name: 'Ana Costa', messages: 167, lastSeen: '2h atrás' },
                    { name: 'Roberto Alves', messages: 145, lastSeen: '3h atrás' }
                  ].map((user, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.lastSeen}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">
                        {user.messages} msgs
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </AppLayout>
  )
}