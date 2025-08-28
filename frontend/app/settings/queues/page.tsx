'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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
  Settings,
  BarChart3,
  ExternalLink,
  Edit,
  UserCheck,
  AlertCircle,
  CheckCircle,
  Timer,
  Activity
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

interface QueueStats {
  total_queues: number
  active_queues: number
  total_agents: number
  online_agents: number
  total_waiting: number
  avg_wait_time: number
}

export default function QueuesSettingsPage() {
  const [queues, setQueues] = useState<Queue[]>([])
  const [stats, setStats] = useState<QueueStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    department: '',
    priority: 0,
    max_wait_time: 30,
    max_queue_size: 100,
    welcome_message: 'Olá! Você foi adicionado à nossa fila de atendimento.',
    waiting_message: 'Aguarde, você será atendido em breve.',
    offline_message: 'No momento estamos fora do horário de atendimento.'
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
        setStats({
          total_queues: data.active_queues || 0,
          active_queues: data.active_queues || 0,
          total_agents: data.agents_online || 0,
          online_agents: data.agents_online || 0,
          total_waiting: data.total_waiting || 0,
          avg_wait_time: data.avg_wait_time_today || 0
        })
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
          welcome_message: 'Olá! Você foi adicionado à nossa fila de atendimento.',
          waiting_message: 'Aguarde, você será atendido em breve.',
          offline_message: 'No momento estamos fora do horário de atendimento.'
        })
        fetchQueues()
        fetchStats()
      }
    } catch (error) {
      console.error('Error creating queue:', error)
    }
  }

  const toggleQueueStatus = async (queueId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/v1/queues/${queueId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ is_active: isActive })
      })

      if (response.ok) {
        fetchQueues()
        fetchStats()
      }
    } catch (error) {
      console.error('Error updating queue:', error)
    }
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

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
          <h1 className="text-2xl font-bold">Configuração de Filas</h1>
          <p className="text-muted-foreground">
            Configure e gerencie filas de atendimento do sistema
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" asChild>
            <Link href="/queues">
              <ExternalLink className="h-4 w-4 mr-2" />
              Ver Filas
            </Link>
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Fila
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Fila</DialogTitle>
                <DialogDescription>
                  Configure uma nova fila de atendimento
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nome da Fila *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ex: Suporte Técnico"
                    />
                  </div>
                  <div>
                    <Label htmlFor="department">Departamento</Label>
                    <Select 
                      value={formData.department} 
                      onValueChange={(value) => setFormData({ ...formData, department: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="suporte">Suporte</SelectItem>
                        <SelectItem value="vendas">Vendas</SelectItem>
                        <SelectItem value="financeiro">Financeiro</SelectItem>
                        <SelectItem value="comercial">Comercial</SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="description">Descrição</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição da fila..."
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="priority">Prioridade</Label>
                    <Select 
                      value={formData.priority.toString()} 
                      onValueChange={(value) => setFormData({ ...formData, priority: parseInt(value) })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Normal</SelectItem>
                        <SelectItem value="1">Alta</SelectItem>
                        <SelectItem value="2">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="max_wait_time">Tempo Máx (min)</Label>
                    <Input
                      id="max_wait_time"
                      type="number"
                      value={formData.max_wait_time}
                      onChange={(e) => setFormData({ ...formData, max_wait_time: parseInt(e.target.value) || 30 })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_queue_size">Tam. Máximo</Label>
                    <Input
                      id="max_queue_size"
                      type="number"
                      value={formData.max_queue_size}
                      onChange={(e) => setFormData({ ...formData, max_queue_size: parseInt(e.target.value) || 100 })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="welcome_message">Mensagem de Boas-vindas</Label>
                  <Textarea
                    id="welcome_message"
                    value={formData.welcome_message}
                    onChange={(e) => setFormData({ ...formData, welcome_message: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="waiting_message">Mensagem de Espera</Label>
                  <Textarea
                    id="waiting_message"
                    value={formData.waiting_message}
                    onChange={(e) => setFormData({ ...formData, waiting_message: e.target.value })}
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="offline_message">Mensagem Fora de Horário</Label>
                  <Textarea
                    id="offline_message"
                    value={formData.offline_message}
                    onChange={(e) => setFormData({ ...formData, offline_message: e.target.value })}
                    rows={2}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={createQueue}>
                  Criar Fila
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Filas Ativas</p>
                  <p className="text-lg font-bold">{stats.active_queues}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Agentes Online</p>
                  <p className="text-lg font-bold">{stats.online_agents}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-600" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Aguardando</p>
                  <p className="text-lg font-bold">{stats.total_waiting}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Timer className="h-4 w-4 text-purple-600" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Tempo Médio</p>
                  <p className="text-lg font-bold">{formatTime(stats.avg_wait_time)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Activity className="h-4 w-4 text-indigo-600" />
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Distribuição</p>
                  <p className="text-lg font-bold">Auto</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-center">
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/queues/agents">
                    <Users className="h-4 w-4 mr-1" />
                    Agentes
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Queues List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Filas Configuradas</span>
            <Badge variant="secondary">{queues.length} filas</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {queues.length > 0 ? (
            <div className="space-y-4">
              {queues.map((queue) => (
                <div key={queue.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-semibold">{queue.name}</h3>
                        <Badge variant={queue.is_active ? "default" : "secondary"}>
                          {queue.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                        <Badge variant="outline">
                          {queue.department}
                        </Badge>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {queue.description || "Sem descrição"}
                      </p>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span>{queue.current_size} na fila</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <UserCheck className="h-4 w-4 text-muted-foreground" />
                          <span>{queue.agents_online} agentes</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Timer className="h-4 w-4 text-muted-foreground" />
                          <span>Máx: {queue.max_wait_time}min</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Cap: {queue.max_queue_size}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2 ml-6">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={queue.is_active}
                          onCheckedChange={(checked) => toggleQueueStatus(queue.id, checked)}
                        />
                        <span className="text-sm">Ativa</span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/queues/${queue.id}/monitor`}>
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Monitor
                          </Link>
                        </Button>
                        <Button size="sm" variant="outline">
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhuma fila configurada</h3>
              <p className="text-muted-foreground mb-4">
                Crie sua primeira fila para começar a gerenciar atendimentos
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Fila
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Monitoramento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/queues">
                <BarChart3 className="h-4 w-4 mr-2" />
                Dashboard de Filas
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/queues/reports">
                <Activity className="h-4 w-4 mr-2" />
                Relatórios Detalhados
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Gerenciamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/queues/agents">
                <UserCheck className="h-4 w-4 mr-2" />
                Gerenciar Agentes
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/settings/team">
                <Users className="h-4 w-4 mr-2" />
                Configurar Equipe
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Distribuição Automática</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Ativa
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Monitor em Tempo Real</span>
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Online
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}