import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  MessageSquare, 
  Users, 
  Clock, 
  TrendingUp,
  Calendar,
  Filter,
  Smartphone,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Globe,
  Zap,
  Phone
} from 'lucide-react'
import { MetricsCard } from '@/components/dashboard/MetricsCard'
import { ConversationChart } from '@/components/dashboard/ConversationChart'
import { ResponseTimeChart } from '@/components/dashboard/ResponseTimeChart'
import { RecentActivity } from '@/components/dashboard/RecentActivity'

export default function DashboardPage() {
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d')
  const [loading, setLoading] = useState(false)
  const [realTimeData, setRealTimeData] = useState({
    onlineAgents: 4,
    activeChats: 12,
    pendingMessages: 3
  })

  // Mock metrics data with more professional business context
  const metricsData = {
    activeConversations: {
      value: 127,
      change: { value: '+12%', type: 'increase' as const }
    },
    totalMessages: {
      value: 2847,
      change: { value: '+8%', type: 'increase' as const }
    },
    avgResponseTime: {
      value: '2.3min',
      change: { value: '-15%', type: 'decrease' as const }
    },
    customerSatisfaction: {
      value: '94%',
      change: { value: '+2%', type: 'increase' as const }
    }
  }

  const whatsappInstances = [
    { id: 1, name: 'Vendas Principal', status: 'connected', phone: '+55 11 99999-9999', messages: 1234 },
    { id: 2, name: 'Suporte Técnico', status: 'connected', phone: '+55 11 88888-8888', messages: 856 },
    { id: 3, name: 'Marketing', status: 'disconnected', phone: '+55 11 77777-7777', messages: 0 },
  ]

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setRealTimeData(prev => ({
        onlineAgents: Math.floor(Math.random() * 6) + 2,
        activeChats: Math.floor(Math.random() * 20) + 8,
        pendingMessages: Math.floor(Math.random() * 8)
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const handlePeriodChange = (period: '7d' | '30d' | '90d') => {
    setSelectedPeriod(period)
    // Here you would typically refetch data for the new period
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'disconnected':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <div className="p-6 space-y-8 min-h-full">
      {/* Clean Header */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-medium text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do sistema PyTake
          </p>
        </div>
        
        {/* Clean Period Selector */}
        <div className="flex items-center space-x-3">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <select
            value={selectedPeriod}
            onChange={(e) => handlePeriodChange(e.target.value as '7d' | '30d' | '90d')}
            className="border border-border bg-background rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors duration-150"
          >
            <option value="7d">Últimos 7 dias</option>
            <option value="30d">Últimos 30 dias</option>
            <option value="90d">Últimos 90 dias</option>
          </select>
        </div>
      </motion.div>

      {/* Clean Status Bar */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="bg-card rounded-lg border border-border/50 p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-sm text-foreground">Sistema Online</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>{realTimeData.onlineAgents} agentes</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              <span>{realTimeData.activeChats} conversas</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>{realTimeData.pendingMessages} pendentes</span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
            <span className="text-xs text-muted-foreground">Ao vivo</span>
          </div>
        </div>
      </motion.div>

      {/* Clean Metrics Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <MetricsCard
          title="Conversas Ativas"
          value={metricsData.activeConversations.value}
          change={metricsData.activeConversations.change}
          icon={MessageSquare}
          iconColor="text-primary"
          loading={loading}
        />
        
        <MetricsCard
          title="Mensagens Hoje"
          value={metricsData.totalMessages.value}
          change={metricsData.totalMessages.change}
          icon={TrendingUp}
          iconColor="text-secondary"
          loading={loading}
        />
        
        <MetricsCard
          title="Tempo Médio"
          value={metricsData.avgResponseTime.value}
          change={metricsData.avgResponseTime.change}
          icon={Clock}
          iconColor="text-muted-foreground"
          loading={loading}
        />
        
        <MetricsCard
          title="Satisfação"
          value={metricsData.customerSatisfaction.value}
          change={metricsData.customerSatisfaction.change}
          icon={Users}
          iconColor="text-green-600"
          loading={loading}
        />
      </motion.div>

      {/* Clean WhatsApp Instances */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.2 }}
        className="bg-card rounded-lg border border-border/50 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Smartphone className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">Instâncias WhatsApp</h3>
          </div>
          <button className="text-sm text-primary hover:text-primary/80 transition-colors duration-150">
            Gerenciar
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {whatsappInstances.map((instance) => (
            <motion.div
              key={instance.id}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.15 }}
              className="bg-background border border-border/50 rounded-lg p-4 hover:border-border transition-colors duration-150"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(instance.status)}
                  <span className="font-medium text-foreground text-sm">{instance.name}</span>
                </div>
                <div className={`text-xs px-2 py-1 rounded-md ${
                  instance.status === 'connected' 
                    ? 'bg-green-500/10 text-green-700 dark:text-green-400 border border-green-500/20'
                    : 'bg-red-500/10 text-red-700 dark:text-red-400 border border-red-500/20'
                }`}>
                  {instance.status === 'connected' ? 'Online' : 'Offline'}
                </div>
              </div>
              
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <Phone className="h-3 w-3" />
                  <span>{instance.phone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-3 w-3" />
                  <span>{instance.messages} mensagens</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Clean Charts Section */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <ConversationChart 
          period={selectedPeriod}
          loading={loading}
        />
        
        <ResponseTimeChart
          loading={loading}
        />
      </motion.div>

      {/* Clean Activity Section */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2">
          <RecentActivity 
            loading={loading}
            limit={8}
          />
        </div>
        
        {/* Clean Quick Stats */}
        <div className="bg-card rounded-lg border border-border/50 p-6">
          <h3 className="text-lg font-medium text-foreground mb-5">
            Resumo Hoje
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Conversas Iniciadas</span>
              <span className="text-sm font-medium text-foreground">23</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Conversas Resolvidas</span>
              <span className="text-sm font-medium text-green-600">18</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Taxa de Resolução</span>
              <span className="text-sm font-medium text-secondary">78%</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Novos Contatos</span>
              <span className="text-sm font-medium text-primary">12</span>
            </div>
            
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-muted-foreground">Pico de Mensagens</span>
              <span className="text-sm font-medium text-muted-foreground">14:30</span>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-border/50">
            <div className="flex items-center text-xs text-muted-foreground">
              <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2" />
              <span>Dados em tempo real</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}