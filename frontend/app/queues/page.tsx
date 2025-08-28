'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Settings,
  UserCheck,
  Timer,
  TrendingUp
} from 'lucide-react'

interface Queue {
  id: string
  name: string
  description: string
  department: string
  priority: number
  is_active: boolean
  max_wait_time: number
  max_queue_size: number
  current_size: number
  avg_wait_time: number
  agents_online: number
  created_at: string
  updated_at: string
}

interface DashboardStats {
  active_queues: number
  total_waiting: number
  agents_online: number
  today_total: number
  today_completed: number
  avg_wait_time_today: number
  abandonment_rate: number
  avg_rating: number
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<Queue[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    priority: 0,
    max_wait_time: 30,
    max_queue_size: 100,
    welcome_message: '',
    waiting_message: '',
    offline_message: ''
  })

  useEffect(() => {
    fetchQueues()
    fetchStats()
  }, [])

  const fetchQueues = async () => {
    try {
      const response = await fetch('/api/v1/queues')
      if (response.ok) {
        const data = await response.json()
        setQueues(data)
      }
    } catch (error) {
      console.error('Error fetching queues:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/v1/queues/dashboard')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const createQueue = async () => {
    try {
      const response = await fetch('/api/v1/queues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowCreateDialog(false)
        setFormData({
          name: '',
          description: '',
          department: '',
          priority: 0,
          max_wait_time: 30,
          max_queue_size: 100,
          welcome_message: '',
          waiting_message: '',
          offline_message: ''
        })
        fetchQueues()
      }
    } catch (error) {
      console.error('Error creating queue:', error)
    }
  }

  const getQueueStatusColor = (queue: Queue) => {
    if (!queue.is_active) return 'bg-gray-500'
    if (queue.current_size > queue.max_queue_size * 0.8) return 'bg-red-500'
    if (queue.current_size > queue.max_queue_size * 0.5) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatWaitTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  if (isLoading) {
    return (
      <div className=\"flex items-center justify-center h-64\">
        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600\"></div>
      </div>
    )
  }

  return (
    <div className=\"p-6 space-y-6\">
      {/* Header */}
      <div className=\"flex justify-between items-start\">
        <div>
          <h1 className=\"text-3xl font-bold\">Central de Filas</h1>
          <p className=\"text-muted-foreground\">
            Gerencie filas de atendimento e monitore performance
          </p>
        </div>
        <div className=\"flex space-x-2\">
          <Button variant=\"outline\" asChild>
            <Link href=\"/queues/agents\">
              <Users className=\"h-4 w-4 mr-2\" />
              Agentes
            </Link>
          </Button>
          <Button variant=\"outline\" asChild>
            <Link href=\"/queues/reports\">
              <BarChart3 className=\"h-4 w-4 mr-2\" />
              Relatórios
            </Link>
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className=\"h-4 w-4 mr-2\" />
              Nova Fila
            </Button>
          </DialogTrigger>
          <DialogContent className=\"max-w-md\">
            <DialogHeader>
              <DialogTitle>Criar Nova Fila</DialogTitle>
              <DialogDescription>
                Configure uma nova fila de atendimento
              </DialogDescription>
            </DialogHeader>
            <div className=\"space-y-4\">
              <div>
                <Label htmlFor=\"name\">Nome da Fila</Label>
                <Input
                  id=\"name\"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder=\"Ex: Suporte Técnico\"
                />
              </div>
              <div>
                <Label htmlFor=\"description\">Descrição</Label>
                <Textarea
                  id=\"description\"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder=\"Descrição da fila...\"
                />
              </div>
              <div>
                <Label htmlFor=\"department\">Departamento</Label>
                <Select 
                  value={formData.department} 
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder=\"Selecione o departamento\" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value=\"suporte\">Suporte</SelectItem>
                    <SelectItem value=\"vendas\">Vendas</SelectItem>
                    <SelectItem value=\"financeiro\">Financeiro</SelectItem>
                    <SelectItem value=\"comercial\">Comercial</SelectItem>
                    <SelectItem value=\"tecnico\">Técnico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className=\"grid grid-cols-2 gap-4\">
                <div>
                  <Label htmlFor=\"max_wait_time\">Tempo Máximo (min)</Label>
                  <Input
                    id=\"max_wait_time\"
                    type=\"number\"
                    value={formData.max_wait_time}
                    onChange={(e) => setFormData({ ...formData, max_wait_time: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <Label htmlFor=\"max_queue_size\">Tamanho Máximo</Label>
                  <Input
                    id=\"max_queue_size\"
                    type=\"number\"
                    value={formData.max_queue_size}
                    onChange={(e) => setFormData({ ...formData, max_queue_size: parseInt(e.target.value) })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant=\"outline\" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={createQueue}>
                Criar Fila
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Dashboard Stats */}
      {stats && (
        <div className=\"grid grid-cols-1 md:grid-cols-4 gap-4\">
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <Users className=\"h-4 w-4 text-blue-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Na Fila</p>
                  <p className=\"text-2xl font-bold\">{stats.total_waiting}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <UserCheck className=\"h-4 w-4 text-green-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Agentes Online</p>
                  <p className=\"text-2xl font-bold\">{stats.agents_online}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <Timer className=\"h-4 w-4 text-yellow-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Tempo Médio</p>
                  <p className=\"text-2xl font-bold\">{formatWaitTime(stats.avg_wait_time_today)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className=\"p-6\">
              <div className=\"flex items-center space-x-2\">
                <TrendingUp className=\"h-4 w-4 text-purple-600\" />
                <div>
                  <p className=\"text-sm font-medium text-muted-foreground\">Hoje</p>
                  <p className=\"text-2xl font-bold\">{stats.today_completed}/{stats.today_total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queues Grid */}
      <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">
        {queues.map((queue) => (
          <Card key={queue.id} className=\"relative overflow-hidden\">
            <div className={`absolute top-0 left-0 w-1 h-full ${getQueueStatusColor(queue)}`} />
            <CardHeader className=\"pb-2\">
              <div className=\"flex items-center justify-between\">
                <CardTitle className=\"text-lg\">{queue.name}</CardTitle>
                <Badge variant={queue.is_active ? \"default\" : \"secondary\"}>
                  {queue.is_active ? \"Ativa\" : \"Inativa\"}
                </Badge>
              </div>
              <p className=\"text-sm text-muted-foreground\">{queue.description}</p>
            </CardHeader>
            <CardContent className=\"space-y-4\">
              <div className=\"grid grid-cols-2 gap-4 text-sm\">
                <div className=\"flex items-center space-x-2\">
                  <Users className=\"h-4 w-4 text-muted-foreground\" />
                  <span>{queue.current_size} na fila</span>
                </div>
                <div className=\"flex items-center space-x-2\">
                  <UserCheck className=\"h-4 w-4 text-muted-foreground\" />
                  <span>{queue.agents_online} agentes</span>
                </div>
                <div className=\"flex items-center space-x-2\">
                  <Clock className=\"h-4 w-4 text-muted-foreground\" />
                  <span>{formatWaitTime(queue.avg_wait_time)}</span>
                </div>
                <div className=\"flex items-center space-x-2\">
                  <AlertCircle className=\"h-4 w-4 text-muted-foreground\" />
                  <span>{queue.department}</span>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className=\"space-y-2\">
                <div className=\"flex justify-between text-sm\">
                  <span>Capacidade</span>
                  <span>{queue.current_size}/{queue.max_queue_size}</span>
                </div>
                <div className=\"w-full bg-gray-200 rounded-full h-2\">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${getQueueStatusColor(queue)}`}
                    style={{ width: `${Math.min((queue.current_size / queue.max_queue_size) * 100, 100)}%` }}
                  />
                </div>
              </div>

              <div className=\"flex space-x-2 pt-2\">
                <Button size=\"sm\" variant=\"outline\" className=\"flex-1\" asChild>
                  <Link href={`/queues/${queue.id}/monitor`}>
                    <CheckCircle className=\"h-4 w-4 mr-1\" />
                    Monitor
                  </Link>
                </Button>
                <Button size=\"sm\" variant=\"outline\" className=\"flex-1\">
                  <Settings className=\"h-4 w-4 mr-1\" />
                  Config
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {queues.length === 0 && (
        <Card className=\"p-12 text-center\">
          <Users className=\"h-12 w-12 text-muted-foreground mx-auto mb-4\" />
          <h3 className=\"text-lg font-semibold mb-2\">Nenhuma fila encontrada</h3>
          <p className=\"text-muted-foreground mb-4\">
            Crie sua primeira fila de atendimento para começar
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className=\"h-4 w-4 mr-2\" />
            Criar Primeira Fila
          </Button>
        </Card>
      )}
    </div>
  )
}