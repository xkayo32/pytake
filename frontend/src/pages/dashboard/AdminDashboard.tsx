import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Settings, 
  Users, 
  MessageSquare, 
  Database,
  Shield,
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Server,
  Globe,
  UserPlus,
  FileText,
  BarChart3,
  Zap,
  Clock,
  HardDrive,
  Cpu,
  Wifi
} from 'lucide-react'
import { motion } from 'framer-motion'

interface SystemStats {
  totalUsers: number
  activeUsers: number
  totalConversations: number
  totalMessages: number
  systemUptime: string
  cpuUsage: number
  memoryUsage: number
  diskUsage: number
  apiRequests: number
  webhookEvents: number
}

interface SystemAlert {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  description: string
  timestamp: string
  resolved: boolean
}

interface UserGrowth {
  period: string
  users: number
  growth: number
}

export default function AdminDashboard() {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalConversations: 0,
    totalMessages: 0,
    systemUptime: '...',
    cpuUsage: 0,
    memoryUsage: 0,
    diskUsage: 0,
    apiRequests: 0,
    webhookEvents: 0
  })
  
  const [loading, setLoading] = useState(true)


  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([])

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token')
        const response = await fetch('/api/v1/dashboard/admin', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          const data = await response.json()
          setSystemStats({
            totalUsers: data.stats.total_users,
            activeUsers: data.stats.active_users,
            totalConversations: data.stats.total_conversations,
            totalMessages: data.stats.total_messages,
            systemUptime: data.stats.system_uptime,
            cpuUsage: data.system_metrics.cpu_usage,
            memoryUsage: data.system_metrics.memory_usage,
            diskUsage: data.system_metrics.disk_usage,
            apiRequests: data.stats.api_requests_today,
            webhookEvents: data.stats.webhook_events_today
          })
          
          // Map alerts from API response
          const mappedAlerts = data.alerts.map((alert: any) => ({
            id: alert.id,
            type: alert.severity === 'warning' ? 'warning' : alert.severity === 'error' ? 'error' : 'info',
            title: alert.title,
            description: alert.description,
            timestamp: new Date(alert.timestamp).toLocaleString('pt-BR'),
            resolved: alert.resolved
          }))
          setSystemAlerts(mappedAlerts)
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  const [userGrowth] = useState<UserGrowth[]>([
    { period: 'Jan', users: 120, growth: 12 },
    { period: 'Fev', users: 135, growth: 12.5 },
    { period: 'Mar', users: 156, growth: 15.6 }
  ])

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-600" />
      default:
        return <CheckCircle className="h-4 w-4 text-gray-600" />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'error':
        return 'bg-red-50 border-red-200 dark:bg-red-950/20'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20'
      case 'info':
        return 'bg-blue-50 border-blue-200 dark:bg-blue-950/20'
      default:
        return 'bg-gray-50 border-gray-200 dark:bg-gray-950/20'
    }
  }

  const getUsageColor = (usage: number) => {
    if (usage >= 80) return 'bg-red-500'
    if (usage >= 60) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground">Painel Administrativo</h1>
          <p className="text-muted-foreground">Monitore e gerencie todo o sistema PyTake</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-800 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            Sistema Online
          </div>
          <Link to="/app/admin/settings">
            <Button className="gap-2">
              <Settings size={16} />
              Configurações
            </Button>
          </Link>
        </div>
      </motion.div>

      {/* System Overview Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4"
      >
        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Usuários</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : systemStats.totalUsers}
              </p>
            </div>
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Usuários Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : systemStats.activeUsers}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Conversas</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : systemStats.totalConversations.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Mensagens</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : systemStats.totalMessages.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-indigo-100 rounded-lg">
              <FileText className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">API Requests</p>
              <p className="text-2xl font-bold text-foreground">
                {loading ? '...' : systemStats.apiRequests.toLocaleString()}
              </p>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg">
              <Globe className="h-5 w-5 text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border/50 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Uptime</p>
              <p className="text-xl font-bold text-green-600">
                {loading ? '...' : systemStats.systemUptime}
              </p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg">
              <Server className="h-5 w-5 text-green-600" />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Resources */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Server className="h-5 w-5 text-blue-500" />
            Recursos do Sistema
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">CPU</span>
                </div>
                <span className="text-sm text-muted-foreground">{systemStats.cpuUsage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(systemStats.cpuUsage)}`}
                  style={{ width: `${systemStats.cpuUsage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Memória</span>
                </div>
                <span className="text-sm text-muted-foreground">{systemStats.memoryUsage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(systemStats.memoryUsage)}`}
                  style={{ width: `${systemStats.memoryUsage}%` }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Disco</span>
                </div>
                <span className="text-sm text-muted-foreground">{systemStats.diskUsage}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getUsageColor(systemStats.diskUsage)}`}
                  style={{ width: `${systemStats.diskUsage}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-border/50">
            <Link to="/app/admin/system">
              <Button variant="outline" className="w-full gap-2">
                <Settings size={16} />
                Configurações do Sistema
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* System Alerts */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card p-6 rounded-lg border border-border/50"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Shield className="h-5 w-5 text-red-500" />
              Alertas do Sistema
            </h3>
            <Badge variant="outline">{systemAlerts.filter(a => !a.resolved).length} ativos</Badge>
          </div>
          
          <div className="space-y-3">
            {systemAlerts.map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border ${getAlertColor(alert.type)} ${alert.resolved ? 'opacity-60' : ''}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{alert.title}</p>
                      {alert.resolved && (
                        <Badge variant="outline" className="text-xs bg-green-100 text-green-800">
                          Resolvido
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{alert.timestamp}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 pt-4 border-t border-border/50">
            <Link to="/app/admin/logs">
              <Button variant="outline" className="w-full gap-2">
                <FileText size={16} />
                Ver Todos os Logs
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Quick Admin Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="space-y-6"
        >
          {/* User Management */}
          <div className="bg-card p-6 rounded-lg border border-border/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Gestão de Usuários
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Crescimento mensal</span>
                <div className="flex items-center gap-1">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <span className="text-sm text-green-600">+15.6%</span>
                </div>
              </div>
              
              <div className="space-y-2">
                {userGrowth.map((data, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{data.period}</span>
                    <span className="font-medium">{data.users} usuários</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <Link to="/app/admin/users">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <Users size={16} />
                  Gerenciar Usuários
                </Button>
              </Link>
              
              <Link to="/app/admin/users/new">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <UserPlus size={16} />
                  Adicionar Usuário
                </Button>
              </Link>
            </div>
          </div>

          {/* Quick Settings */}
          <div className="bg-card p-6 rounded-lg border border-border/50">
            <h3 className="text-lg font-semibold mb-4">Configurações Rápidas</h3>
            
            <div className="space-y-2">
              <Link to="/app/admin/integrations">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <Wifi size={16} />
                  Integrações
                </Button>
              </Link>
              
              <Link to="/app/admin/backup">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <Database size={16} />
                  Backup & Restore
                </Button>
              </Link>
              
              <Link to="/app/analytics">
                <Button variant="outline" className="w-full gap-2 justify-start">
                  <BarChart3 size={16} />
                  Analytics Avançado
                </Button>
              </Link>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 p-6 rounded-lg border border-border/50">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">✅ Sistema Saudável</h3>
                <p className="text-sm text-muted-foreground">
                  Todos os serviços operando normalmente. Última verificação: agora.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}